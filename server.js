require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { GoogleGenAI, Type } = require('@google/genai');
const { detectPII } = require('./public/pii.js');

const COMMENTS = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'comments.json'), 'utf8')
);
const COMMENTS_BY_CODE = new Map(COMMENTS.map((c) => [c.code, c]));
const REGENTS_CODE = 502;

// Filter out non-English (Spanish) catalog entries from the pool we send to
// Gemini. Teachers want English suggestions only — the original NYC catalog
// includes Spanish translations (codes 601–616 etc.) which the model would
// otherwise pick. We keep them in COMMENTS_BY_CODE so #502 etc. still resolve,
// but never offer them as candidates.
const SPANISH_RE = /\b(que|una|del|para|por|tiene|hacer|este|esta|aprovechamiento|esfuerzo|falta|preparacion|escolar|escolares|asistir|llame|cita|baja|deficientes|excesivas|excesivos|tareas|incompletas|interrumpe|distrae|comportamiento|habilidad|habitos|gran|exceso|insuficiente|ausencias|tardanzas|calificacion|adelanto|progresar|debe|interes|excelente|participacion|demuestra|sin|razon|examenes|excelente|insuficiente)\b/i;
const ENGLISH_COMMENTS = COMMENTS.filter((c) => {
  const text = `${c.comment || ''} ${c.indicator || ''}`;
  return !SPANISH_RE.test(text);
});

const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];
const MAX_DESCRIPTION_CHARS = 4000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function transientStatus(err) {
  const status = err?.status;
  if (status === 503 || status === 429 || status === 500) return status;
  const msg = String(err?.message || '');
  if (/\b503\b|UNAVAILABLE|overload/i.test(msg)) return 503;
  if (/\b429\b|RESOURCE_EXHAUSTED|quota/i.test(msg)) return 429;
  if (/\b500\b|INTERNAL/i.test(msg)) return 500;
  return 0;
}

async function generateWithFallback(ai, requestConfig) {
  let lastErr;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await ai.models.generateContent({ model, ...requestConfig });
      } catch (err) {
        lastErr = err;
        const code = transientStatus(err);
        if (!code) throw err;
        console.warn(`[${model}] attempt ${attempt + 1} failed (${code}), backing off…`);
        await sleep(800 * (attempt + 1));
      }
    }
  }
  throw lastErr;
}

const app = express();

// Render (and most PaaS) put a load balancer in front; trust the first proxy
// so req.ip reflects the real client IP for rate limiting.
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json({ limit: '64kb' }));
app.use(
  express.static(path.join(__dirname, 'public'), {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    },
  })
);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password attempts. Please wait a minute.' },
});

const suggestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many suggestion requests. Please wait a minute.' },
});

app.use('/api/', apiLimiter);

app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

function passwordsMatch(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function requireAuth(req, res, next) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return next();
  const provided = req.get('X-Site-Password');
  if (!passwordsMatch(provided, expected)) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  next();
}

app.get('/api/auth/status', (_req, res) => {
  res.json({ required: Boolean(process.env.SITE_PASSWORD) });
});

app.post('/api/auth/check', authLimiter, (req, res) => {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return res.json({ ok: true });
  const provided = (req.body && req.body.password) || req.get('X-Site-Password');
  if (!passwordsMatch(provided, expected)) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  res.json({ ok: true });
});

app.post('/api/suggest', suggestLimiter, requireAuth, async (req, res) => {
  // NOTE: do not log req.body or the description text. Descriptions may
  // contain student information; we only log timing/outcome.
  const t0 = Date.now();
  const { description, regents } = req.body || {};
  if (typeof description !== 'string' || description.trim().length < 5) {
    return res
      .status(400)
      .json({ error: 'Please provide a longer description of the student.' });
  }
  if (description.length > MAX_DESCRIPTION_CHARS) {
    return res.status(400).json({
      error: `Description is too long (max ${MAX_DESCRIPTION_CHARS} characters).`,
    });
  }
  const pii = detectPII(description);
  if (pii.found) {
    const labels = {
      'id-number': 'an ID number',
      'email': 'an email address',
      'embedded-name': 'a name (embedded in a word)',
      'name-with-title': 'a name',
      'full-name': 'a name',
      'name': 'a name',
    };
    const what = labels[pii.kind] || 'identifying information';
    return res.status(400).json({
      error: `Your description appears to contain ${what} (“${pii.sample}”). Remove it before submitting.`,
      pii: true,
      sample: pii.sample,
      kind: pii.kind,
    });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res
      .status(500)
      .json({ error: 'Server is missing GEMINI_API_KEY.' });
  }

  const wantRegents = regents === true;
  const modelPickCount = wantRegents ? 5 : 6;

  const pool = wantRegents
    ? ENGLISH_COMMENTS.filter((c) => c.code !== REGENTS_CODE)
    : ENGLISH_COMMENTS;

  const catalog = pool
    .map(
      (c) =>
        `${c.code}\t[${c.category || 'General'}${
          c.level && c.level !== 'NA' ? ' / ' + c.level : ''
        }]\t${c.comment}`
    )
    .join('\n');

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const countWords = { 2: 'TWO', 3: 'THREE', 4: 'FOUR', 5: 'FIVE', 6: 'SIX' };
  const countWord = countWords[modelPickCount] || String(modelPickCount);
  const systemInstruction =
    'You help teachers pick report-card comment codes. You are given a catalog of pre-approved comments (each line: CODE<TAB>[CATEGORY / LEVEL]<TAB>TEXT) and a teacher description of one student. ' +
    `Pick exactly ${countWord} codes that best capture the student, RANKED FROM BEST FIT TO WORST FIT. The first item in the array must be the strongest match, and each following item should be a weaker (but still relevant) match. ` +
    'Aim for a balanced mix when the description is balanced (e.g. include both strengths and growth areas), but always order by overall fit, not by category. ' +
    'Only return codes that exist in the catalog.';

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      suggestions: {
        type: Type.ARRAY,
        minItems: modelPickCount,
        maxItems: modelPickCount,
        items: {
          type: Type.OBJECT,
          properties: {
            code: {
              type: Type.INTEGER,
              description: 'The numeric code from the catalog.',
            },
            reason: {
              type: Type.STRING,
              description:
                'One short sentence explaining why this comment fits the student.',
            },
          },
          required: ['code', 'reason'],
        },
      },
    },
    required: ['suggestions'],
  };

  const userPrompt =
    `COMMENT CATALOG (${pool.length} comments):\n${catalog}\n\n` +
    `TEACHER'S DESCRIPTION OF THE STUDENT:\n${description.trim()}\n\n` +
    `Pick exactly ${modelPickCount} comment codes from the catalog above, ranked best fit first.`;

  try {
    const resp = await generateWithFallback(ai, {
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.4,
      },
    });

    const text = resp.text;
    if (!text) {
      return res
        .status(502)
        .json({ error: 'Model returned an empty response.' });
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res
        .status(502)
        .json({ error: 'Model did not return valid JSON.' });
    }

    const raw = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    const suggestions = raw
      .map((s) => {
        const code = typeof s.code === 'number' ? s.code : Number(s.code);
        const match = COMMENTS_BY_CODE.get(code);
        if (!match) return null;
        return {
          code: match.code,
          comment: match.comment,
          category: match.category,
          level: match.level,
          reason: typeof s.reason === 'string' ? s.reason : '',
        };
      })
      .filter(Boolean)
      .slice(0, modelPickCount);

    if (wantRegents) {
      const regentsComment = COMMENTS_BY_CODE.get(REGENTS_CODE);
      if (regentsComment) {
        suggestions.splice(2, 0, {
          code: regentsComment.code,
          comment: regentsComment.comment,
          category: regentsComment.category,
          level: regentsComment.level,
          reason: 'Required: course ends in a Regents exam.',
          required: true,
        });
      }
    }

    if (suggestions.length === 0) {
      return res
        .status(502)
        .json({ error: 'Model returned codes that do not exist in the catalog.' });
    }

    console.log(
      `[suggest] ip=${req.ip} ms=${Date.now() - t0} picks=${suggestions.length} regents=${wantRegents}`
    );
    res.json({ suggestions });
  } catch (err) {
    console.error(`[suggest] ip=${req.ip} ms=${Date.now() - t0} error:`, err?.message || err);
    const transient = transientStatus(err);
    const status = transient || err?.status || 500;
    const friendly = transient
      ? 'Gemini is overloaded right now (free tier). Please wait a moment and try again.'
      : err?.message || 'Failed to get suggestions from Gemini.';
    res.status(status).json({ error: friendly });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Kalima running on port ${PORT}`);
  console.log(
    `Loaded ${COMMENTS.length} comments (${ENGLISH_COMMENTS.length} English, ${COMMENTS.length - ENGLISH_COMMENTS.length} non-English filtered out of the pool).`
  );
  if (process.env.SITE_PASSWORD) {
    console.log('Password protection: ON');
  } else {
    console.warn('Password protection: OFF (set SITE_PASSWORD to enable).');
  }
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY is not set — /api/suggest will return 500.');
  }
});
