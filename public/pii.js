// Shared PII detector. Works both in the browser (attaches to window.KalimaPII)
// and in Node (require('./public/pii.js')).
//
// Strategy: catch first names by matching against a curated case-insensitive
// list (covers most names you'd see in a US/NYC classroom). Names that aren't
// in the list still get caught by the structural patterns below — possessive,
// title + last name, two-word "first last", and capitalized + name verb.
//
// detectPII(text) -> { found: boolean, sample?: string, kind?: string }

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KalimaPII = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Common first names — lowercased. Matched case-insensitively, so it catches
  // "marcus", "Marcus", and "MARCUS". Curated from US SSA top-1000 plus names
  // common in NYC schools (Spanish, South Asian, East Asian, Arabic, African).
  const NAMES_RAW = (
    // Boys — Anglo
    'aaron abel abraham adam adrian aiden alan albert alex alexander alfred ' +
    'allen alvin amos andre andres andrew andy angel angelo anthony antoine ' +
    'antonio archer ari arlo arnold arthur asher ashton atlas august austin ' +
    'avery axel ayden bailey barrett barry beau ben benjamin bennett benson ' +
    'bentley billy blake bobby brad braden bradley brady brandon braxton ' +
    'brayden braydon brendan brendon brent brett brian briar brock broderick ' +
    'brody bronson brooks bruce bruno bryan bryant bryce bryson cade caden ' +
    'caiden cain cale caleb callum calvin camden cameron camilo carl carlos ' +
    'carmelo carmine carson carter casey cash cason cayden cesar chad chance ' +
    'chandler charles charlie chase chester chris christian christopher ' +
    'clarence clark clay clayton clinton clyde cody cohen colby cole colin ' +
    'collin colt colton conner connor conrad cooper corey cormac cornelius ' +
    'cory courtney craig cristian cristiano cruz curtis cyrus dakota dale ' +
    'dallas dalton damian damien damon dan dane daniel danny dante darian ' +
    'darius darnell darrell darren darrin darryl darwin david davion davis ' +
    'dawson dax dayton dean declan demetrius dennis derek derrick desmond ' +
    'devin devon dexter diego dillon dimitri domenic dominic dominick don ' +
    'donald donnie donovan dorian douglas drake drew duane duncan dustin ' +
    'dwayne dwight dylan earl easton edgar edmund eduardo edward edwin ' +
    'efrain eladio eli elian elias elijah elliot elliott ellis elmer ' +
    'emanuel emerson emery emiliano emilio emmanuel emmett emory enrique ' +
    'enzo eric erick erik ernest ernesto esteban ethan eugene evan everett ' +
    'ezekiel ezra fabian felipe felix fernando finn finnegan fisher floyd ' +
    'forrest francis francisco frank franklin fred freddie frederick gabriel ' +
    'gael gage galen garrett garrison gary gavin gene geoffrey george gerald ' +
    'gerardo german gianni gibson gilbert giovanni glenn gordon grady graham ' +
    'grant grayson gregory griffin guillermo gunnar gunner gus gustavo guy ' +
    'hakeem hamza hank hans harold harrison harry harvey hassan hayden ' +
    'hayes heath hector hendrix henry herbert herman holden hudson hugh ' +
    'hugo humberto hunter ian ibrahim idris ignacio iker isaac isaiah ' +
    'ishmael israel ivan jace jack jackson jacob jaden jaime jair jake ' +
    'jakob jalen jamal jamar james jameson jamir jamison jared jase jason ' +
    'jasper javier javon jax jaxon jaxson jay jayce jayden jaylen jayson ' +
    'jeff jefferson jeffery jeffrey jensen jeremiah jeremy jermaine jerome ' +
    'jerry jesse jesus jett jim jimmy joaquin joe joel johan john johnathan ' +
    'johnny jon jonah jonas jonathan jordan jorge jose joseph joshua josiah ' +
    'josue juan judah jude julian julio julius justice justin justus kaden ' +
    'kai kaiden kaleb kameron kane kareem karl karson karter kase kasen ' +
    'kayden kayson keagan keanu keaton keegan keenan keith kellen kelly ' +
    'kelvin ken kendall kendrick kennedy kenneth kenny kent kevin khalid ' +
    'khalil killian king kingsley kingston kirk knox kobe koda kody kolby ' +
    'kole kolton korbin kristian kristopher kurt kyle kyler kymani kyrie ' +
    'lamar lance landen landon landyn lane langston larry lawrence layton ' +
    'lazaro leandro lee leland lemuel leo leon leonard leonardo leonel leroy ' +
    'leslie lester levi lewis liam lincoln lionel logan loren lorenzo louis ' +
    'lucas luca luciano lucio luis luka lukas luke luther lyle mack maddox ' +
    'madison major malachi malakai malcolm malik manuel marc marcelino ' +
    'marcello marcelo marco marcos marcus mariano mario mark markus marlon ' +
    'marquis marshall martin marvin mason mateo mathew mathias matias matt ' +
    'matteo matthew matthias maurice maverick max maximilian maximo maximus ' +
    'maxwell mekhi melvin memphis micah michael miguel mike milan miles ' +
    'miller milo milton misael mitchell mohamed mohammad mohammed monte ' +
    'morgan moses moshe muhammad murphy musa myles nash nasir nathan ' +
    'nathanael nathaniel neal nehemiah nelson nestor nicholas nick nico ' +
    'nicolas niko nikolai nikolas nils nixon noah noe noel nolan norman ' +
    'octavio odin oliver omar omari onyx orion orlando oscar otis otto ' +
    'owen pablo paolo parker patrick paul paxton payton pedro percy peter ' +
    'peyton philip phillip phoenix pierce porter prescott preston prince ' +
    'quentin quincy quinn quintin quinton ramiro ramon ramses randall randy ' +
    'raphael rashad raul ray raymond reece reed reese reggie reginald reid ' +
    'remington remy rene reuben rex rey reynaldo rhett rhys ricardo richard ' +
    'rick rickey ricky rico ridge rigoberto riley river robert roberto robin ' +
    'rocco rocky roderick rodney rodolfo rodrigo roger rogelio roland rolando ' +
    'roman romeo ron ronald ronan ronin ronnie roosevelt rory ross rowan roy ' +
    'royal royce ruben rudy rufus russell ryan ryder ryker ryland sage said ' +
    'salvador sam samir sammy samson samuel santiago santino santos saul ' +
    'sawyer scott seamus sean sebastian sergio seth shane shaun shawn ' +
    'sheldon sherman sidney silas simon sincere sky skyler solomon sonny ' +
    'soren spencer stanley stefan stephen sterling steve steven stetson ' +
    'stewart stuart sullivan sven sylvester talon tanner tariq tate taylor ' +
    'terrance terrell terrence terry thaddeus theo theodore thiago thomas ' +
    'tim timothy titus tobias toby todd tomas tommy tony torrence trace ' +
    'travis trent trenton trevon trevor trey tripp tristan troy truman ' +
    'tucker turner ty tyler tyrell tyrese tyrone tyson uriah uriel valentin ' +
    'vance vaughn vernon vicente victor vincent vincenzo virgil vladimir ' +
    'wade walker walter ward warren watson waylon wayne wendell wesley west ' +
    'westin weston whitman wilbur wilfredo will william willie wilson winston ' +
    'wyatt xander xavier yael yahir yair yandel yariel yusuf zachariah ' +
    'zachary zackary zaiden zaire zander zane zavier zayd zayden zaylen ' +
    'zayn zechariah ' +
    // Girls — Anglo
    'aaliyah abby abigail ada adalyn adaline addison adelaide adele adelina ' +
    'adeline adelyn adriana adrianna adrienne agatha agnes ahmya aileen ' +
    'aimee ainsley aisha aitana alaina alana alani alanna alara alaya alayah ' +
    'alayna alba alejandra alessandra alessia alex alexa alexandra ' +
    'alexandria alexia alexis aleyda ali alia aliana alice alicia alina ' +
    'alisa alisha alison alivia aliya aliyah allie allison ally alma alondra ' +
    'alyssa amalia amanda amara amari amaya amber amelia amelie amina amira ' +
    'amirah amy ana anabella anaya andrea angel angela angelica angelina ' +
    'angie anika aniya aniyah anna annabel annabella annabelle anne annette ' +
    'annie ansley antonia anya april arabella arely aria ariadne ariana ' +
    'arianna ariel ariella arielle arlette arya ashanti ashley ashlyn ' +
    'ashlynn asia aspen astrid athena aubree aubrey aubrie audrey augusta ' +
    'aurelia aurora autumn ava avah avalyn averie avery aviana avianna avril ' +
    'aya ayla aylin azalea bailey barbara beatrice belen belinda bella ' +
    'belle berenice bernadette beth bethany betty beverly bianca blair ' +
    'blanca blanche bonnie braelyn braelynn brandi brandy breanna bree brenda ' +
    'briana brianna bridget brielle brittany brittney brooke brooklyn ' +
    'brooklynn bryanna brynlee brynn cadence caitlin caitlyn callie calliope ' +
    'cameron camila camilla camille campbell candace candice candy cara ' +
    'carla carly carmela carmen carol carolina caroline carolyn carrie ' +
    'casey cassandra cassidy cassie catalina catherine cecelia cecilia ' +
    'celeste celia celine chana charity charlee charleigh charlie charlize ' +
    'charlotte chaya chelsea cheryl cheyenne chloe christina christine ' +
    'ciara cindy claire clara clarissa claudia colette colleen connie ' +
    'constance cora coral coraline corinne courtney crystal cynthia daisy ' +
    'dakota dalia daleyza dana danica daniela daniella danielle danna daphne ' +
    'darcy darlene dawn dayana deanna debbie deborah delaney delia delilah ' +
    'denise destiny diamond diana diane dianna dolores dominique dora doris ' +
    'dorothy drew dulce dylan ebony eden edith eileen elaina elaine eleanor ' +
    'elena eliana elianna elisa elise eliza elizabeth ella ellen elle ' +
    'elliana ellie elliot elodie eloise elsa elsie ember emerson emersyn ' +
    'emery emilia emily emma emmalyn emmaline emmy erica erika erin esme ' +
    'esmeralda esperanza estefania estela estelle esther estrella eva eve ' +
    'evangeline evelyn evelynn everleigh everly fabiola faith fallon farrah ' +
    'fatima faye felicia felicity fernanda finley fiona flora florence ' +
    'frances francesca freya frida gabriela gabriella gabrielle galilea ' +
    'gemma genesis genevieve georgia georgina geraldine gia gianna gigi ' +
    'giovanna giselle gloria grace gracelyn gracelynn gracie greta gretchen ' +
    'guadalupe gwen gwendolyn hadley hailee hailey haley halle hallie hana ' +
    'hannah harlow harmony harper harriet hattie haven hayden hayley hazel ' +
    'heather heaven heidi helen helena henley henrietta hilary holly hope ' +
    'hunter ileana ilene iliana imani india ingrid ireland irene iris isabel ' +
    'isabela isabella isabelle isadora isla itzel ivanna ivory ivy iyana ' +
    'jacqueline jada jade jaelyn jaida jaime jamie jana janae jane janelle ' +
    'janet janice jasmin jasmine jayda jayden jayla jaylene jayleen jazlyn ' +
    'jean jeanette jeanne jenna jennifer jenny jess jessa jessica jessie ' +
    'jewel jill jillian jimena jo joan joana joann joanna joanne jocelyn ' +
    'jolene jolie jordan jordyn josephine josie journey joy joyce judith ' +
    'judy julia juliana julianna julie juliet juliette julissa june justice ' +
    'justine kacey kadence kaia kailani kailey kaitlyn kaitlynn kalani kali ' +
    'kallie kamila kara karen karina karla karlie kassandra kassidy kate ' +
    'katelyn katherine kathleen kathryn kathy katie katrina kayla kaylee ' +
    'kayleigh kaylie keira kelly kelsey kendall kendra kennedy kenya kenzie ' +
    'kerry khloe kiara kiera kim kimberly kinley kinsley kira kora kori ' +
    'krista kristen kristin kristina kristy kya kyla kylee kylie laila ' +
    'lainey lana laney lara larissa laura laurel lauren laurie layla leah ' +
    'leanna legacy leia leila leilani lena lennon leona lesley leslie ' +
    'leticia lexi lia liana lila lilah liliana lillian lilliana lillie ' +
    'lilly lily lina linda lindsay lindsey lisa litzy liv livia liz lizbeth ' +
    'lola london lorelei loretta lori lorraine louisa louise lucia luciana ' +
    'lucinda lucy luna lydia lyla lynn mabel macey mackenzie macy madalyn ' +
    'maddie madeleine madeline madelyn madilyn madison mae maeve maggie ' +
    'magnolia maia makayla makenna makenzie malaya malia mallory mara ' +
    'marcella margaret margarita margie margot maria mariah mariam mariana ' +
    'marianna marianne maribel marie marilyn marina marisa marisol marissa ' +
    'maritza marjorie marlee marlene marley marlowe marsha martha martina ' +
    'mary maryann matilda mattie maureen maxine maya mckenna mckenzie ' +
    'mckinley meadow meg megan meghan melanie melinda melissa melody mercedes ' +
    'mercy meredith mia michaela michelle mikaela mikayla mila milan milana ' +
    'miley millie mina mira miranda miriam molly mona monica monique morgan ' +
    'mya myla myra nadia naima nala nancy naomi natalia natalie natasha ' +
    'nathalie navy nayeli nellie nevaeh nia nicole nikki nina noa noelle ' +
    'nora norah noreen norma nova nyla nyomi octavia odette olga olive ' +
    'olivia opal ophelia oriana paige paisley paloma pamela paola paris ' +
    'parker patience patricia paula paulina pearl peggy penelope penny perla ' +
    'phoebe phyllis piper polly poppy presley priscilla priya quinn rachael ' +
    'rachel raegan raelyn raelynn rafaela rain raina ramona raquel raven ' +
    'rayne reagan rebecca regina remi remington remy renata renee reyna ' +
    'rhea rita riya river robin rochelle ronda rory rosa rosalia rosalie ' +
    'rosalind rosalyn rosanna rose rosemarie rosemary rowan roxanne ruby ' +
    'ruth ruthie ryan rylan rylee ryleigh sabrina sade sadie sage sahara ' +
    'salma samantha samara samira sandra sandy sara sarah sarai saraya ' +
    'sariah sasha savanna savannah scarlett scarlet selah selena selina ' +
    'serena serenity shana shannon sharon shawna shea sheila shelby ' +
    'sheryl shiloh shirley sidney sienna sierra simone sky skye skyla skylar ' +
    'sloane sofia sonia sonja sonya sophia sophie stacey stacy stella ' +
    'stephanie stevie summer sunny susan susanna suzanne sydney sylvia tabitha ' +
    'talia tamara tammy tania tanya tara tatiana tatum taylor teagan tegan ' +
    'teresa terra terri tess tessa thalia thea theresa thomasina tia tiana ' +
    'tianna tiffany tina toni tracey tracy trinity valentina valeria valerie ' +
    'vanessa vera veronica victoria vienna violet violeta virginia vivian ' +
    'viviana vivienne wanda whitney willa willow wilma winnie winter wren ' +
    'wynter ximena yamileth yara yareli yasmin yasmine yesenia yolanda yvette ' +
    'yvonne zaina zaria zaylee zelda zoe zoey zoie ' +
    // Common South / East / Southeast Asian names
    'aanya aarav aarush abdul abdullah adi aditya aiko ajay akira akshay ' +
    'amir amol anand ananya anh anika anjali anushka aravind arjun arman ' +
    'arnav arvind asha ashwin atul ayaan ayman bao binh chandra chao chen ' +
    'chia chiao chih chin chloe choi chun cong cuong dai dao deepak deepika ' +
    'dev dhruv dilip dinh divya duc duy ekta esha fang fei feng gao geeta ' +
    'gopal gulshan ha hai han hang hanh hao haru haruka haruki haruto hasan ' +
    'hasina hideo hideki hina hira hiro hiroki hiroshi ho hoa hoang hong ' +
    'hsuan hua huan huang hui hung huong indira ishaan ishan jagat jai janvi ' +
    'jeong ji jiang jiao jin jing joon jose joon ju jun junji kai kaito ' +
    'kana kang karan kavya kaori kazu kazuko kazuki kei keiko ken kenji ' +
    'khang khanh khoa khuong kim kiran kishore kohei krishna kunal kyu lan ' +
    'lay le lei lewei li lien lin ling linh liu liwei loc long lu luong ly ' +
    'mai manjit manoj masaki masato meera mei meng mia mihir min ming minh ' +
    'mira mira misaki mohan mukesh nadia naoki naomi natsuki nguyet nhung ' +
    'niam ning niraj nirmal nisha noriko oishi olga osamu padma pankaj pari ' +
    'parul phong ping pooja pradeep pranav pranavi pratik prem priti priya ' +
    'qi qian qiang qiao qing qiu rachna radha rajesh ram rama ramesh ranbir ' +
    'ranjit ranveer ravi reena reita rena rhea rina rishab rishi riya riyan ' +
    'rohan rohit ronit ronnie ruchi ruchika rui ryo ryoko ryosuke sai sami ' +
    'samiksha sana sanjay sanjeev sanya saori sara saravan sarita satoshi ' +
    'satya satyam savita seema sejal seo shaila shanti shao sharad sharif ' +
    'shen sheng shi shih shilpa shin shinji shiv shiva shivani shou shree ' +
    'shreya shu shuang shyam siddhartha simran sita sneha sofia sokha song ' +
    'soo sophia su suk sumi sumit sun sunaina sung sunil suresh syed tahira ' +
    'taeko takashi takeshi tamiko tan tang tanvi tao taro thanh thao thi ' +
    'thien tho thomas thuy thy ti tian tien tin ting tomoko tomoya tomohiro ' +
    'trang trinh tu tuan tung umar uma usha varun vasu vidya vihaan vijay ' +
    'vikas vikram vimal vinay vincent vinod viren vivek wai wang wei wen ' +
    'wendy wing won wong wu xi xia xiang xiao xin xiu xu xue ya yan yang ' +
    'yao yasmine ye yi yin ying yiqing yong yu yuan yue yuki yuko yusuke ' +
    'yuuki yuuto yvette zhang zhao zheng zhi zhou zhu zi ' +
    // Common Arabic / Muslim names (often heard in NYC schools)
    'abdulaziz abdulrahman abu adel adnan ahmad ahmed ahsan aisha akbar ' +
    'akram al ala aladdin amal amin amina amir amira anwar arif asma assad ' +
    'ata aya ayan ayesha ayman ayyub aziz badr bahar baraa barakah basem ' +
    'basim bassam bilal burhan dalia dawud diala dina diya ehsan emad emin ' +
    'esra fadi fahad fahmi faiq fairuz faisal faiz fakhri farhan farhana ' +
    'farid farida farouq farouk faruq farzana fatih fawzi feras firas ghada ' +
    'ghassan habib hadi hadya hafsa haitham hakim halima hamdan hamid hamza ' +
    'hanan hani hanin hannan haroon harun hasan hashem hashim hassan hatim ' +
    'haya haytham hisham hosam hoshyar hossam hussein huzaifa ibraheem ' +
    'ibrahim idris ihsan ikhlas ikram ilias iman imran inas iqbal isa ishaan ' +
    'islam ismail jabbar jaber jabir jad jaffar jalil jamal jamil jamila ' +
    'jasmin jawad jihad jinan junaid kadar kaiser kamal kamel karam karim ' +
    'kassim kazi khadija khairi khaled khalid khalifa khalil khamis khan ' +
    'khoury khulood lateef leila lina lubna luqman lutfi maan mahdi maher ' +
    'mahmoud mahmud maisam majd majdi majeed makram malek malik malika ' +
    'mansour marwan masoud mehmet menahem mike mikael mira moaz mohamed ' +
    'mohammad mohammed muhammad mohsen mohsin mostafa motasem mouna ' +
    'moustafa mubarak mufeed muhsin muhsen muhsin mujahid mukhtar muna ' +
    'munir muntasir mustafa nabil nada naderah nadia nadim nael nahla nahed ' +
    'nahla nail naim najib najwa naser nasir nasr nasser nawal nayef nazar ' +
    'nazia nida nidal niloofar nimer nizar noor nora nour nuha nura nusrat ' +
    'omar omari omran osama osman othman qais qamar qasim rabia rabih radi ' +
    'rafat rafeeq rafi raheem raheel rahel rahim rahma raja rajab raja ramy ' +
    'rana rania rasha rashad rasheed rashida rashid rasul reda rida riham ' +
    'rim rima rizwan rosa rumi sadia sadiq saeed safa safiya safwan saifi ' +
    'sajid salah saleh salem salim salma salwa samar sami samia samir samira ' +
    'samra sana sara sarah sayed sayid shadi shadia shadya shafiq shahid ' +
    'shahir shahzad shakira sharif sharifa shazia shifa shukri sidi siham ' +
    'siraj soha soraya subhi sufyan suhail suhel suhaila sulaiman suleiman ' +
    'tahani taha tahir taif taj tala talal taleb talia tamer tarek tariq ' +
    'tasneem tawfiq taymur thabit thurayya tisam toufik usama wael wahid ' +
    'wajdi waleed walid walida wasim widad widad wisam yaser yasin yasmin ' +
    'yasser yazan yazid yousef yousif yusra yusuf zahid zahir zahra zaid ' +
    'zain zainab zaki zara zayd zayn zeena zeid zeina zeyad ziad ziya zubair ' +
    // African / African-diaspora names common in US schools
    'amaru ammon amari ayanna chinwe chioma deshawn ebele emeka folake ' +
    'ifeoma imani izzy jabari jaheim jamal jamar jamiya javon jaylen ' +
    'jermaine jihad keisha kendrick keon kofi kwame lakeisha lashonda ' +
    'latasha latonya latoya laquan lashawn malia malik marcus markus marquis ' +
    'monique nia obi oluwaseun rashida shanice shaniqua sheniqua taj tamir ' +
    'tariq tasha terrell tomi tunde tyrese tyrone uche uzoma yara'
  ).split(/\s+/);

  const NAMES = new Set(NAMES_RAW.filter(Boolean));

  // School / context vocabulary that should never be flagged.
  const ALLOW = new Set([
    'the','a','an','this','that','these','those','it','its','my','our',
    'your','their','his','her','he','she','they','we','i','one','two',
    'three','first','second','third','both','all','some','many','most',
    'few','several','each','every','either','neither','such','other',
    'today','yesterday','tomorrow','now','then','here','there','when',
    'while','during','before','after','until','since','once','lately',
    'recently','currently','initially','originally','eventually','finally',
    'soon','often','usually','always','sometimes','generally','overall',
    'mostly','however','although','though','despite','but','and','yet',
    'so','because','whenever','whereas','whether','if','in','on','at',
    'for','with','without','from','to','of','by','about','through',
    'throughout','across','beyond','among','between','within','math',
    'mathematics','science','english','history','algebra','geometry',
    'trigonometry','calculus','statistics','biology','chemistry','physics',
    'earth','living','environment','health','gym','pe','art','music',
    'theater','drama','choir','band','orchestra','dance','photography',
    'writing','reading','listening','speaking','vocabulary','grammar',
    'spanish','french','latin','mandarin','chinese','japanese','korean',
    'german','italian','russian','hebrew','arabic','portuguese','esl',
    'world','american','european','asian','african','global','national',
    'civics','government','economics','sociology','psychology','philosophy',
    'computing','engineering','robotics','coding','programming','tech',
    'library','lab','class','course','grade','quarter','semester','year',
    'test','exam','quiz','project','essay','paper','presentation',
    'homework','assignment','worksheet','notebook','discussion','group',
    'team','club','sport','game','practice','tournament','match','race',
    'honors','ap','regents','ib','sat','act','psat',
    'january','february','march','april','may','june','july','august',
    'september','october','november','december',
    'monday','tuesday','wednesday','thursday','friday','saturday','sunday',
    'student','students','teacher','teachers','classroom','school',
    'parent','parents','family','home','office','counselor','principal',
    'behavior','performance','effort','attitude','engagement','attendance',
    'participation','conduct','work','quality','skill','skills','progress',
    'growth','improvement','strength','strengths','weakness','weaknesses',
    'areas','goals','strategy','strategies','method','methods','approach',
    'tone','voice','focus','concentration','motivation','confidence',
    'comprehension','reasoning','logic','analysis','argument','evidence',
    'expression','pronunciation','fluency','accuracy',
  ]);

  // Words that are also names but appear far more often as common English.
  // We only flag them when context strongly suggests they're being used as a
  // name (capitalized AND in the middle of a sentence, or possessive,
  // or two-cap pattern) — never on bare lowercase appearance.
  const AMBIGUOUS_NAMES = new Set([
    // Common nouns that double as names
    'hope','faith','grace','rose','daisy','iris','lily','holly','jade',
    'pearl','ruby','crystal','summer','autumn','winter','dawn','sunny',
    'angel','joy','destiny','serenity','harmony','melody','cadence',
    'liberty','trinity','journey','heaven','star','sky','sage','river',
    'meadow','willow','wren','poppy','blossom','reed','lane','major',
    'prince','king','queen','duke','earl','cole','cash','colt','ace',
    'noel','rene','rain','skye','tiger','sun','moon','apple','blue',
    'noor','justice',
    // Common English verbs / words that collide with real names
    'said','will','may','can','have','grant','mark','drew','rich','frank',
    'pat','peter','wade','ward','bob','bill','art','dean','victor','ray',
    'jay','jet','rod','rocky','sonny','ted','van','wing','wood','stone',
    'forest','forrest','hunter','mason','spencer','hudson','holden',
    'porter','parker','tucker','sawyer','walker','carter','cooper','baker',
    'fisher','miller','gardner','tanner','ranger',
    // Months / days that some lists include as names
    'april','june','may',
  ]);

  function tokenize(text) {
    // Returns array of {word, lower, isCap} for each alphabetic token.
    const tokens = [];
    const re = /[A-Za-z][A-Za-z'’]*/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const word = m[0].replace(/['’]s$/, ''); // strip trailing 's
      tokens.push({
        word,
        lower: word.toLowerCase(),
        isCap: /^[A-Z]/.test(word),
        index: m.index,
      });
    }
    return tokens;
  }

  function isFirstWordOfSentence(text, index) {
    // True if `index` is at start of text, or preceded only by whitespace
    // following a sentence terminator.
    if (index === 0) return true;
    let i = index - 1;
    while (i >= 0 && /\s/.test(text[i])) i--;
    if (i < 0) return true;
    return /[.!?]/.test(text[i]);
  }

  function detectPII(text) {
    if (typeof text !== 'string' || text.length < 2) {
      return { found: false };
    }

    const tokens = tokenize(text);

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];

      // Skip allow-listed school/context words entirely
      if (ALLOW.has(t.lower)) continue;

      // Ambiguous (collide with English) — only flag with a strong name
      // signal: capitalized mid-sentence, possessive form, or capitalized at
      // sentence start followed by a verb a teacher uses for a student.
      if (AMBIGUOUS_NAMES.has(t.lower)) {
        if (t.isCap && !isFirstWordOfSentence(text, t.index)) {
          return { found: true, sample: t.word, kind: 'name' };
        }
        const after = text.slice(t.index + t.word.length);
        if (/^['’]s\b/.test(after)) {
          return { found: true, sample: t.word, kind: 'name' };
        }
        if (t.isCap && isFirstWordOfSentence(text, t.index)) {
          if (
            /^\s+(?:is|was|has|had|seems|seemed|tries|tried|works|worked|reads|read|writes|wrote|likes|loves|enjoys|enjoyed|struggles|struggled|excels|excelled|completed|completes|finishes|finished|earned|earns|received|asked|asks|answered|answers|understands|understood|comprehends|comprehended|improved|improves|started|began|gets|got|appears|shows|showed|demonstrates|demonstrated|participates|participated|contributes|contributed|engages|engaged|tends|tended|consistently|always|often|never|sometimes)\b/i.test(
              after
            )
          ) {
            return { found: true, sample: t.word, kind: 'name' };
          }
        }
        continue;
      }

      // Curated names list — case-insensitive. Catches "marcus", "Marcus",
      // and "MARCUS".
      if (NAMES.has(t.lower)) {
        return { found: true, sample: t.word, kind: 'name' };
      }
    }

    // Fallback: structural patterns for names not in the list.
    // Possessive — "Smithson's notebook"
    const possessive = /\b([A-Z][a-z]{2,15})['’]s\b/g;
    let m;
    while ((m = possessive.exec(text)) !== null) {
      if (!ALLOW.has(m[1].toLowerCase())) {
        return { found: true, sample: m[1], kind: 'name' };
      }
    }

    // Title + capitalized — "Mr. Smith", "Ms. Johnson"
    const title = /\b(?:Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+([A-Z][a-z]{1,20})\b/g;
    while ((m = title.exec(text)) !== null) {
      if (!ALLOW.has(m[1].toLowerCase())) {
        return { found: true, sample: m[1], kind: 'name-with-title' };
      }
    }

    // Two consecutive capitalized words (likely first + last) — neither in
    // allow-list
    const twoCap = /\b([A-Z][a-z]{1,14})\s+([A-Z][a-z]{1,14})\b/g;
    while ((m = twoCap.exec(text)) !== null) {
      if (!ALLOW.has(m[1].toLowerCase()) && !ALLOW.has(m[2].toLowerCase())) {
        return { found: true, sample: `${m[1]} ${m[2]}`, kind: 'full-name' };
      }
    }

    return { found: false };
  }

  return { detectPII };
});
