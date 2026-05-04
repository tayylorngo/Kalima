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
    // Additional Central Asian / Arabic / South Asian names
    'madina madinah karima kareema kareem aziza azizah aziz dilshoda ' +
    'gulnoza gulchehra nodira sevara shahnoza munira zilola zamira ' +
    'malika malek malik mansour marwan masoud mehdi mubarak mukhtor ' +
    'nargiza shokhrukh sherzodbek shavkat tursun otabek bekzod ulugbek ' +
    'rakhmat rashida rasmia roya rumana sadia sadiya sadia sara saoud ' +
    'sabira sabriya safiya saida saima sajida saliha samiha samira sania ' +
    'shaheen shahin shaheena shaina shakila shamima shamim sherzoda ' +
    'shukria sumaya tahmina tahira tarana tasneem tehmina yasmeen yasmina ' +
    'yusra zahirah zaina zainab zarina zoya zubaida zubeida ' +
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
    // Common adjective sentence-openers (teachers describing students)
    'strong','weak','excellent','outstanding','exceptional','poor','good',
    'great','bright','sharp','smart','clever','talented','gifted','brilliant',
    'capable','able','ambitious','creative','curious','dedicated','dependable',
    'determined','enthusiastic','friendly','generous','genuine','gracious',
    'hardworking','helpful','honest','humble','intelligent','kind','modest',
    'optimistic','patient','persistent','polite','positive','punctual',
    'reliable','respectful','responsible','sincere','sociable','supportive',
    'sympathetic','thoughtful','trustworthy','careful','careless','dishonest',
    'disrespectful','disruptive','distracted','frustrated','immature',
    'impatient','impulsive','inattentive','inconsistent','lazy','restless',
    'rude','shy','stubborn','struggling','tardy','withdrawn','quiet','loud',
    'active','passive','attentive','focused','organized','disorganized',
    'prepared','unprepared','motivated','unmotivated','confident','outgoing',
    'reserved','mature','quick','slow','methodical','consistent','thorough',
    'energetic','able','unable','willing','unwilling','engaged','disengaged',
    'eager','bored','interested','disinterested','independent','dependent',
    'cooperative','collaborative','competitive','creative','imaginative',
    'analytical','logical','critical','reflective','responsive','flexible',
    'adaptable','resilient','resourceful','efficient','effective',
    // Common sentence-starting verbs in descriptions
    'needs','requires','lacks','demonstrates','exhibits','displays','shows',
    'tries','attempts','strives','works','does','did','keeps','continues',
    'completed','completes','finishes','finished','fails','succeeds','seeks',
    'asks','answers','reads','writes','speaks','listens','participates',
    'contributes','engages','focuses','struggles','excels','improves',
    'improved','progressed','progresses','gets','got','arrives','arrived',
    'started','began','begins','tried','should','must','could',
    'might','would','cannot',
    // Common adverb / transition openers
    'hopefully','clearly','apparently','obviously','frequently','rarely',
    'occasionally','periodically','seldom','barely','hardly','nearly',
    'almost','probably','possibly','likely','unlikely','definitely',
    'absolutely','really','truly','genuinely','simply','merely','just',
    'still','already','yet','also','besides','moreover','furthermore',
    'additionally','instead','rather','otherwise','therefore','thus',
    'consequently','accordingly','meanwhile','meantime','overall',
    'altogether','briefly','specifically','particularly','especially',
    'notably','remarkably','surprisingly','unfortunately','fortunately',
  ]);

  // Common English vocabulary. Used to spot lowercase rare names that appear
  // in name-position contexts (after "named", "to", "with", etc.) — anything
  // not in this list AND not in NAMES is treated as a suspected name.
  // Built from: (a) the actual comment-template catalog (so all teacher
  // vocabulary is covered) and (b) ~2000 most common English words.
  const COMMON_WORDS_RAW = (
    // From the comment-template catalog (every word teachers might naturally
    // use — proven domain vocabulary).
    'ability able about absent abstractly academic accept accepts access ' +
    'accords accounts accuracy accurate accurately achieve achieved acids ' +
    'acknowledging actions activities activity adapting add added ' +
    'addition additional address addressing adelanto adjectives advance ' +
    'advanced adverbs age aiding air algebraic algebraically all aloud ' +
    'alternate american among analysis analyze analyzes analyzing and ' +
    'angle angles answer anticipates any applications applies apply ' +
    'applying appointment approach approaches appropriate appropriately ' +
    'aprovechamiento aptitude arc are area areas argument arguments arise ' +
    'arithmetic art arts asistir ask asking asks aspects assess assessing ' +
    'assessment assessments assigned assignments assistance associated ' +
    'astronomy atomic attempt attempts attend attention attitude ' +
    'attributes audience audiences audio ausencias author authoritative ' +
    'authors available avoiding aware baja band based bases basic ' +
    'behaviors being best better between biases biotechnology body ' +
    'bonding both broaden building builds calculating calificacion call ' +
    'capitalization careers carrying cases categorical causally cause ccr ' +
    'cell central challenges challenging chance chapter character ' +
    'characters charts chat chemical chemistry choice choices chosen ' +
    'circle circles circumstance cita citation citations cite citing ' +
    'claim claims clarification clarifying clase class classifying ' +
    'classroom clear clearly climax closely clues coherent collaborate ' +
    'collaborations collaborative collaboratively command common ' +
    'communicating communication community comparative comparatively ' +
    'compare comparing comparison complete completed completes completing ' +
    'complex complexity components composing composition compositional ' +
    'compound comprehend comprehending comprehension compute con concept ' +
    'concepts concern concerns concisely concluding conclusions concrete ' +
    'conditional conduct conducting cones conferencing confidence ' +
    'congruence conic connect connecting connection connections ' +
    'connotative consequences consistency consistent consistently ' +
    'constructing constructions contact containing content context ' +
    'contexts continued contrasting contribute contributes control ' +
    'conventions conversations convey cooperation cooperative coordinates ' +
    'correspondences corroborating could count counterclaims counting ' +
    'course crafting create creating creation creative creativity ' +
    'credibility critical critiques cross culminates cultural cumulative ' +
    'current cut cylinders dance data deadlines debe decimals decision ' +
    'decisions deepen deficientes defines defining definition definitions ' +
    'delineating demonstrates demonstrating demuestra denominators ' +
    'dependent describe described describing description despite detail ' +
    'details determine determining develop developing development devices ' +
    'dialogue diaria did differences different differing difficulty digit ' +
    'digital digits dimensional directions directly discipline ' +
    'discrepancies discussing discussion discussions display displays ' +
    'disrespectful distinguish distinguishing distracts distributions ' +
    'diverse divide divided dividing division documents does doing domain ' +
    'domains drama draw drawing drawn during each earth ecology editing ' +
    'educational effect effective effectively effects efficiently effort ' +
    'elaboration electricity element elements emphasize encourage ' +
    'encouragement end energy engaged engagement engages english enhance ' +
    'enjoyment ensemble environment equation equations equilibrium ' +
    'equivalence equivalent escolares esfuerzo essays establish ' +
    'established evaluate evaluating evaluation event events everyday ' +
    'evidence evolution exam examenes examine examples exams exceed ' +
    'exceeding exceeds excelente excellent exceso excessive excessively ' +
    'existing expanding expected experience experienced experiences ' +
    'experimentation experimenting experiments explain explaining ' +
    'explanation explanations explanatory explicitly exponential ' +
    'exponents exposition expressed expressing expression expressions ' +
    'extended extending extent faction factors facts failed fairly ' +
    'fairness falta family features federalist feedback feelings few ' +
    'field figurative figure figures find finding findings fitness ' +
    'fitnessgram fits flow fluency fluent focused focusing follow ' +
    'following follows for force form format formats formatting forms ' +
    'formulas foundational four fraction fractions frequently from fully ' +
    'function functions further furthering furthers gain gained games ' +
    'gather gathered gathering general generalizations generalizing ' +
    'generate generated genetics genres geometric geometrical geometry ' +
    'goal goals good grade grades grammar gran graphic graphical ' +
    'graphically graphics graphs greater habilidad habitos hacer harder ' +
    'harmful has have headings health healthy help heredity hesitates ' +
    'high highly historical history home homeostasis homework honor how ' +
    'human hundredths idea ideas identify identifying identities ' +
    'illustrations imagined immunity impact implement important improve ' +
    'improved improvement improvisation improvisational inactivity ' +
    'inattentive include includes including incompletas incomplete ' +
    'inconsistent increase independence independent independently ' +
    'indicates individual individuals inequalities inferences influence ' +
    'influences informal information informational informative ' +
    'infrequently initiative inquiry insights insolation insufficient ' +
    'insuficiente integer integrate integrating interact interaction ' +
    'interactions interactive interes internet interpret interpreting ' +
    'interprets interrumpe into introduce introducing introduction ' +
    'introductions investigating investigation involving irrational issue ' +
    'issues its jeopardy journals justifying key keyboarding kinematics ' +
    'kinetics knowing knowledge knowledgeable known knows lab labs land ' +
    'landscapes language larger late learning least leaves length lengths ' +
    'lesson letter letters level life like limitations limited linear ' +
    'lines link linking listening literary literature live llame locate ' +
    'logical logically looking low made madison magnetism main maintain ' +
    'maintaining major make makes making management many maps masterworks ' +
    'mastery matching materials mathematical mathematics matrices matter ' +
    'matters mean meaning meanings meant measure measurement measurements ' +
    'mechanics media mediums meet meeting meets members message messages ' +
    'meteorology minerals missing model modeling models modern moral more ' +
    'most motion motions motivated movement movements multi multimedia ' +
    'multiple multiples multiplication multiply multiplying music musical ' +
    'must names narration narratives narrator narrow nature navigating ' +
    'need needed needs never new nonverbal not notation notebook notes ' +
    'noting nouns nuclear number numbers numerical nyc objects ' +
    'observation observational obtained obtaining often one ongoing only ' +
    'operations opinion opinions opportunities opposing options oral ' +
    'orally order ordering organic organization organizational organize ' +
    'organized organizes organizing other others out outcomes over ' +
    'overall overreliance own oxidation pairs papers para paragraphs ' +
    'parallel part participacion participate participates participating ' +
    'particular pass patterns pay pays peers perform performance ' +
    'performances performing period periodic periodicity periodization ' +
    'persevering persist persists personal persuasively phenomena phone ' +
    'photographs phrases physical physics pieces place plagiarism plane ' +
    'planning plays playwriting plot point pointing points political ' +
    'polynomial polynomials poor population populations portions positive ' +
    'possesses possible precedes precise predict prefix premises ' +
    'preparacion prepared present presentations presented presenting ' +
    'presents previous primary principles print probabilities probability ' +
    'problem problems procedures process processes produce producing ' +
    'products proficiently program programa progresar progress project ' +
    'projects promote properties property proportional prove provide ' +
    'proving publish punctuation purpose purposes pythagorean qualitative ' +
    'quality quantitative quantitatively quantities question questions ' +
    'quickly quotations quote radicals random range ratio rational ratios ' +
    'razon reach reaches read reader reading readings real really ' +
    'reasonable reasoning reasons recalling recommended recount reduction ' +
    'reference refines refining reflected reflection regarding regents ' +
    'regularly relate related relating relationship relationships ' +
    'relevant remote repertoire repetition rephrasing reported reports ' +
    'represent representations representative representing reproduction ' +
    'required requirements requires research resolution resources respect ' +
    'respectful respecting respects respond responding responds response ' +
    'responsibility responsible results revises revising rewriting ' +
    'rhetoric rhetorical right rigid risks rocks roll routines rules same ' +
    'sample sampling satisfactorily satisfactory says scene sci science ' +
    'sciences scientific scores search searches secondary section ' +
    'sections sectors select selecting selection selectively self ' +
    'semester sense sentence sentences sequence sequences sequentially ' +
    'series services sessions set sets setting settings several shapes ' +
    'share shared short show shows significance significant similar ' +
    'similarities similarity similarly simple simultaneous sin single ' +
    'situation situations skill skills social societies software solo ' +
    'solve solving sound sounds source sources space speaker speakers ' +
    'speaking special specific speech spelled spelling spheres spoken ' +
    'sport sports sportsmanship standard standards stanza stated ' +
    'statement statistical status stay stays step steps stoichiometry ' +
    'story strategically strategies strategy strengthen strengthening ' +
    'strengths stress strives striving strong strongly structure ' +
    'structured structures struggles student studies style styles subject ' +
    'submit substantive subtract subtraction sufficient suffix summarize ' +
    'summarizing summary supervision supplying support supported ' +
    'supporting supports surface surveys sustained syllables synthesize ' +
    'synthesizing system systems tables taking talking tardanzas tareas ' +
    'task tasks technical technique techniques technologies technology ' +
    'tell term terminates terms tests text texts textual that the theater ' +
    'their them theme themes theorem theorems there they this thorough ' +
    'thoroughly thoughts three through throughout tiene time told tone ' +
    'tools topic topics toward towards tradeoffs transformations ' +
    'transitions translating transparencies treat treatment treatments ' +
    'triangles trigonometric trigonometry trying tutorial tutoring two ' +
    'una uncertain under underlying understand understanding ' +
    'understandings understands unfamiliar unified uniform unit units ' +
    'unknown unprepared update usage use used useful uses using utilize ' +
    'utilizing valid value values variability variable variables variety ' +
    'various vector vectors verbs video videos view visual visualizations ' +
    'visualizing visually vocabulary volume water waves way well what ' +
    'when where which while whilst whole wifi with within word words work ' +
    'working works world writing written zeros ' +
    // Top common English words not in the catalog above
    'after again against ago all almost along already also although ' +
    'always among another any anything anywhere around because been ' +
    'before begin behind below beside best better birthday black blue ' +
    'book born bought box boy break bring brought brown business busy ' +
    'buy came car care change check child children city close coffee ' +
    'cold come comes coming computer cool corner cost country couple ' +
    'cover dad daughter day days deal decide deep dinner door door down ' +
    'each early easy eat effect either email end enjoy enough enter ' +
    'every everyone everything everywhere example except eyes face ' +
    'fact fall family far fast father feel felt few find first five ' +
    'food foot for forgot found four free friend friends front full ' +
    'fun get gets getting girl give given go goes going gone got great ' +
    'green ground group grow guess had hand hands happen happy hard ' +
    'head hear heard hello her here hers herself high him himself his ' +
    'hit hold home honestly hope hot hour hours house however idea ' +
    'imagine including important inside instead interesting into job ' +
    'just keep kept kid kids kind knew known land language large last ' +
    'late later law leave left less let letter life light line list ' +
    'little long looked looking lose lost lots love loved low lunch ' +
    'made mail main making man maybe meant meet member middle might ' +
    'mind minute miss money month months morning mother mouth move much ' +
    'music my name need new news next nice night nights no nobody none ' +
    'nor north not nothing now number office okay old once one open ' +
    'opening order our ours ourselves outside over own page paid paper ' +
    'parents part party passed past pay people perhaps person phone ' +
    'piece place plan play played please point poor possible power ' +
    'prefer pretty price probably problem put quite race ran rather ' +
    'reach ready really reason red reform remember rest right room ' +
    'round run safe said same saw say scared school sea second see ' +
    'seem seemed seen send sent series seven several share short ' +
    'should side simple simply since sit six size sleep small smile ' +
    'snow some someone something sometimes son song soon south speak ' +
    'spent stand start station stay stop store story straight street ' +
    'study sun sure surprised system table take taken talk tall taught ' +
    'team teach television tell ten than thank that their themselves ' +
    'then these thing things think third thought today together tomorrow ' +
    'too took top town tree trees tried try turn turned twice type under ' +
    'until upon upon used usually very wait walk walked want wanted ' +
    'warm wash watch water way ways week weekend weeks well went were ' +
    'what whatever whether which white who whole whom whose why wife ' +
    'will wind window winter wish without woman women word would write ' +
    'wrong year years yes yesterday yet you young your yourself ' +
    // Common feelings, behaviors, character traits
    'happy sad angry confused worried excited bored proud calm anxious ' +
    'shy outgoing friendly nervous brave fearful gentle harsh strict ' +
    'lenient fair unfair patient impatient thoughtful careless reckless ' +
    'thoughtful kind unkind generous selfish humble arrogant honest ' +
    'dishonest creative dull bright dim eager reluctant willing helpful ' +
    'unhelpful supportive critical encouraging discouraging cooperative ' +
    'uncooperative respectful disrespectful polite rude attentive distracted ' +
    'curious indifferent enthusiastic apathetic motivated unmotivated ' +
    'persistent quitting hardworking lazy diligent careless industrious ' +
    'idle determined wavering reliable unreliable trustworthy untrustworthy ' +
    'loyal disloyal sincere insincere genuine fake authentic phony ' +
    'modest boastful confident timid bold cautious reckless risky safe ' +
    'dangerous tough soft firm flexible rigid stubborn agreeable ' +
    'disagreeable cooperative competitive collaborative argumentative ' +
    'peaceful aggressive passive active dynamic static lively dull ' +
    'energetic tired sleepy alert quiet noisy loud silent calm ' +
    'fidgety restless still moving stationary mobile fast slow steady ' +
    'irregular even uneven balanced unbalanced focused unfocused ' +
    'organized disorganized systematic random chaotic orderly messy ' +
    'tidy untidy clean dirty neat sloppy careful careless meticulous ' +
    'sloppy thorough superficial deep shallow profound trivial ' +
    'serious silly playful solemn cheerful gloomy bright dim sunny ' +
    'rainy stormy peaceful turbulent rough gentle rough kind harsh ' +
    'tender hard mild severe gentle rough simple complicated easy ' +
    'difficult plain fancy ordinary special common rare unique strange ' +
    'familiar foreign known unknown new old fresh stale modern outdated ' +
    'hopefully possibly likely unlikely probably perhaps maybe certainly ' +
    'definitely absolutely partly fully completely barely hardly almost ' +
    'nearly already still yet anymore much little many few enough ' +
    'plenty several various varied diverse mixed pure simple complex ' +
    'great better best worse worst above below higher lower bigger ' +
    'smaller wider narrower longer shorter taller older younger newer ' +
    'cleaner messier nicer meaner kinder colder warmer hotter softer ' +
    'harder darker lighter brighter dimmer louder quieter heavier ' +
    'lighter ' +
    // Common base-form English nouns/verbs/adjectives without suffixes
    // (these wouldn't be caught by the suffix-pattern check)
    'about above abuse acid across again age agree ahead aim air alike ' +
    'alive allow alone alter amid angle angry apart area arm army arose ' +
    'arrow ask aspect attempt avoid awake aware awe awful baby back bad ' +
    'bag bake bald ball band bank bare bark base bath beam bear beard ' +
    'beat bed beef beer beg begin bell belt bench bend best bet better ' +
    'bias big bike bind bird bit bite black blade blame blank blast bleak ' +
    'bless blew blind block blond blood bloom blue blunt blur boast boat ' +
    'bold bond bone book boom boot bore born borrow boss both bound bow ' +
    'bowl box boy brain brake branch brand brave bread break breath ' +
    'breeze brew brick bride brief bright bring broad broke brought brow ' +
    'brown brush bug bull bunch burn burst bury bus bush busy buy buzz ' +
    'cake calf calm came camp cap cape car card care careful cart case ' +
    'cash cast cat catch cause cave cell cent chain chair chalk champ ' +
    'chance change charge charm chart chase chat cheap cheat check cheer ' +
    'cheese chest chew chick chief chill chin chip chirp choice choose ' +
    'chop chord chose chunk church city civic claim clamp clap class ' +
    'claw clay clean clear clerk clever click cliff climb cling clip ' +
    'clock close cloth cloud clown club clue coach coal coast coat ' +
    'cocoa code coin cold color comb come cone cook cool cope copy core ' +
    'corn cost couch could count court cover cow crack craft crash ' +
    'crawl crazy cream creep crew crisp crop cross crowd crown cruel ' +
    'cruise crumb crush cry cube curl curse curve cushion cut cute dad ' +
    'daily damp dance dare dark date dawn dead deaf deal dear debt deck ' +
    'deep deer dense desk dial diamond diary die diet dig dim dine dip ' +
    'dirt disc dish ditch dive dock dog doll dome done door dot doubt ' +
    'down dozen drag drain drama draw dread dream dress drew drift drill ' +
    'drink drip drive drop drove drown drum dry duck due dull dump dusk ' +
    'dust duty earn ease easy eat eight either elbow elder elect else ' +
    'empty engine ensure entry envy equal era ever evil exact except ' +
    'exit exotic expect extra eye fable face fact fade fail faint fair ' +
    'fairy faith fake fall false fame fan farm fast fat fate fault favor ' +
    'fear feast feel feet fell felt female fence ferry few field fierce ' +
    'fight fill film fin final find fine finger finish fire firm first ' +
    'fish fist fit five fix fizz flag flame flash flat flaw flee flesh ' +
    'flew flick flight flip float flood floor flour flow fly foam focus ' +
    'foe fog fold folk fond food fool foot force fork form fort forth ' +
    'forty foul found four fox frame fraud free fresh friend frog front ' +
    'frost frown fruit full fun furry gain game gang garlic gate gear ' +
    'gem gentle germ ghost giant gift girl give given glad glance glare ' +
    'glass gleam glide globe gloom glory glove glow glue goal goat gold ' +
    'gone good goose got grab grace grade grain grand grant grape graph ' +
    'grasp grass grave gray graze great green greet grew grid grief grill ' +
    'grim grin grind grip groan ground group grow gruff guard guess ' +
    'guest guide guilt gulf gulp gum gun gut guy gym hail hair half hall ' +
    'halt hand hang happy hard harm haste hat hate hatred haul have hawk ' +
    'hay hazard hazy head heal heap hear heart heat heavy hedge heel ' +
    'help here hero hide high hike hill hint hip hire hive hold hole ' +
    'holy home hope horn horse host hotel hour house huge human humid ' +
    'hunt hurry hurt hut idea idle ill image imply inch ink inn inner ' +
    'inside iron isle issue item jail jaw jazz jet jewel job join joint ' +
    'joke joy judge juice jump just keen keep kept keyboard kick kid ' +
    'kill kin kind king kiss knee knew knit knob knock knot know label ' +
    'labor lack lady lake lamb lame lamp land lane large last late laugh ' +
    'launch law lay lazy lead leaf lean leap leash leave led ledge left ' +
    'leg lemon lend less let life lift light line link lion lip list ' +
    'live load loaf loan local lock log long look loose lord lose loss ' +
    'lost loud love loyal luck lump lung mad made mail main make male ' +
    'mall man maze meal mean meat meet melt mend mercy mere merge mess ' +
    'metal mid mild mile milk mill mind mine mint mist mix mob mode mold ' +
    'mole mom money month mood moon more most moth move much mud mug muse ' +
    'mute name near neat neck need needle nerve nest net never new news ' +
    'next nice nine noble noise none noon nor north nose note now noun ' +
    'nudge null nurse nut oak obey ocean odd odor old once one only onto ' +
    'open opera order ought ours own pace pack pad page paid pain pair ' +
    'palace pale palm panic paper park part path patch peace peak pear ' +
    'pearl pen people perch petal phase pick pie piece pile pill pine ' +
    'pink pipe place plain plan plate play plea plot plow plug plum plus ' +
    'pole pond pool poor pop porch port pose post pot pour power pray ' +
    'press pride prime print prior prize problem prompt proof prove ' +
    'pulse punch pure push quick quiet quit race rack radar raft rage ' +
    'rail rain raise ramp rank rapid rare rash rate raw reach react ' +
    'read real rear regal reign rein rent rest rib rice rich ride ridge ' +
    'rim ring rinse riot rip rise risk rival river road roar roast rob ' +
    'rock rode role roof room root rope rose rot rough round route row ' +
    'royal rub rude rug ruin rule run rung sad safe sail salt same sand ' +
    'sang save saw scale scan scar scare scene school scoop scope score ' +
    'scout scrap screen screw sea seam seat seek seem seen self sell ' +
    'send sent serve seven shade shake shall shame shape share sharp ' +
    'shed sheep sheer sheet shelf shell shift shine ship shirt shock ' +
    'shoe shoot shop shore short shot shout show shut shy sick side sigh ' +
    'sign silk silly sing sink sip sit six size skate skill skin skip ' +
    'sky slab slam slap sleep slept slice slide slim slip slot slow ' +
    'small smart smell smile smith smoke snail snap snow soak soap sob ' +
    'soft soil sold solid solo some son soon sore sort soul soup south ' +
    'space spare speak spear speech spell spend spent spice spike spin ' +
    'spite split spoil spoke spoon sport spot spray spread spring sprout ' +
    'square stab stage stair stake stale stall stamp stand star stare ' +
    'start state stay steam steel steep steer stem step stick stiff ' +
    'still sting stir stomp stone stood stop store stork storm story ' +
    'stove strap straw stray strict stride strike string strip strive ' +
    'strode stroke strong struck struggle stub stuck study stuff stump ' +
    'style sub such sudden suit sum sun sure surf swam swap swarm sweep ' +
    'sweet swept swift swim swing switch sword take tale talk tall tame ' +
    'tank tap tape tar task taste team tear tease teen tell tend tense ' +
    'tent term test text than that them then thick thigh thin thing ' +
    'think third those though three threw throat throne throng throw ' +
    'thumb thump thus tide tie tile till tilt time tin tip tire toad ' +
    'toast today toe toil told toll tomb tone took tool tooth top topic ' +
    'torch torn toss tour tow tower town toy trace track trade train ' +
    'trait tramp trap trash treat tree trend trial tribe trick tried ' +
    'trip troop true trunk trust truth try tube tug tune turn twin twist ' +
    'two type ugly under undo unit upset urge use vague valley value ' +
    'van vary vast veer veil vein very vest video view vile vine voice ' +
    'void vote vow wade wage wait wake walk wall wand want war ward ware ' +
    'warm warp wash wasp waste watch water wave way weak wear weep went ' +
    'were west wet whale what wheat wheel when where which while whip ' +
    'who whole whom whose why wick wide wife wig wild will win wind wine ' +
    'wing wink wipe wire wise wish with woe wolf woman won wood wool ' +
    'word wore work world worm worn worse worst worth wound wove wrap ' +
    'wreck wrist write wrong wrote yacht yard yarn yawn year yell yes ' +
    'yet yield yoga yoke you young your youth zone zoo trouble issue tone ' +
    // Common -le ending words (verbs and nouns)
    'settle settles settled settling handle handles handled handling ' +
    'single singled doubles doubled tripled couple couples coupled gentle ' +
    'simple subtle subtler nimble humble ample sample samples sampled ' +
    'sampling middle muddle muddles riddle riddles paddle paddles fiddle ' +
    'fiddles juggle juggles juggled juggling buckle buckles buckled ' +
    'cuddle cuddles cradle cradles cradled candle candles bundle bundles ' +
    'bundled mingle mingles mingled jungle jungles tingle tangle tangles ' +
    'tangled mangle dangle dangles jingle single singles bottle bottles ' +
    'bottled people purple maple staple stable stables stabled cable ' +
    'cables battle battles battled little brittle bottle title titles ' +
    'mettle nettle rattle settle tattle scuttle struggle struggles ' +
    'struggled struggling chuckle chuckles chuckled needle needles ' +
    'eagle eagles giggle giggles wiggle wiggles bubble bubbles tickle ' +
    'tickles wrinkle wrinkles fragile profile profiles temple temples ' +
    'sample samples couple couples turtle turtles ladle ladles bridle ' +
    'gentle simple subtle little marble marbles missile saddle ankle ' +
    'angle angles uncle uncles example examples exemplary apple apples ' +
    'idle puzzle puzzles pebble pebbles ' +
    // -it / -dit / -bit ending base forms
    'credit credits credited debit debits debited edit edits edited ' +
    'profit profits profited audit audits audited habit habits limit ' +
    'limits limited summit summits visit visits visited deposit deposits ' +
    'exhibit exhibits exhibited orbit orbits orbited submit submits ' +
    'admit admits admitted permit permits permitted commit commits ' +
    'committed transit benefit benefits benefited ' +
    // -et / -get / -ket / -let ending
    'budget budgets target targets targeted market markets packet ' +
    'packets ticket tickets basket baskets blanket blankets cricket ' +
    'crickets racket pocket pockets locket lockets bucket buckets ' +
    'gadget gadgets midget closet closets toilet toilets bullet ' +
    'bullets fillet helmet helmets magnet magnets nugget nuggets ' +
    'planet planets racket pellet trumpet violet ' +
    // Common short adjectives / verbs / nouns
    'talent talents talented agent agents fluent fluently fluency ' +
    'urgent recent decent extent intent invent invents inventor patent ' +
    'parent parents content silent moment current decent recent absent ' +
    'present absent talent advent ardent latent silent salient ' +
    'patient patiently impatient lenient potent potently constant ' +
    'instant ' +
    // Common 4-letter base verbs/nouns sometimes missed
    'beam beams calm calmer dare dares dared dust dusty face faces ' +
    'fail fails fade fades fall feet fish flag flat flew flow folk ' +
    'gain gate gem gift glad glow goal grab grew grin gum hand harm ' +
    'haul heap hide hike hint hold hole home hose hour howl hurt ' +
    'icon idea inch iron item joke jump junk just keen kept kids ' +
    'lamp leap left lend life lift lip live load lone loop loss loud ' +
    'love loyal mad mark mass meal melt mend metal mid mighty mild ' +
    'mile milk mind mode mold mood move mute name near neck nest net ' +
    'nice node noon nope norm note now numb oath oats odds oh oil ok ' +
    'old open opt orb our pace pack page pale palm pang pant park pat ' +
    'path paw paid pay pear peer pen peg per pick pie pile pill pine ' +
    'pink pit pity place plain plan plus point pole pond pool pop pose ' +
    'post pour pouch pray prep pry pump punch ' +
    // -age / -ate / -ode / -ave / -ide / -ase / -uce
    'cage cages caged stage stages staged page pages paged image ' +
    'images imaged passage message passages messages average averages ' +
    'manage manages managed manager language languages bandage ' +
    'damage damages damaged courage encourage encourages encouraged ' +
    'storage usage village villages umbrage savage advantage outrage ' +
    'engage engages engaged village villages voyage voyages cottage ' +
    'leverage referee tease release leases ' +
    // Common short words ending in vowels
    'data area idea aria pasta vista delta omega panda polka koala ' +
    'tundra zebra arena trauma lava panda piano radio audio video ' +
    'patio ratio echo ' +
    // -ent / -ant
    'silent decent recent talent absent moment patent parent fluent ' +
    'urgent constant instant pleasant elegant relevant elephant ' +
    'distant brilliant tolerant ignorant abundant arrogant defiant ' +
    'reliant compliant deviant expectant abundant repugnant ' +
    'fragrant resonant militant pageant tenant gallant truant ' +
    'fluent agent decent accent client extent intent invent intent ' +
    'absent ardent latent talent ' +
    // -ist / -ism / -ical / -ile / -ory
    'mobile fertile hostile docile fragile agile profile missile ' +
    'reptile textile sterile servile tactile nubile senile while ' +
    'awhile docile crocodile theory victory factory glory story ' +
    'memory hickory armory armory rhetoric topic logic ' +
    // Misc common words
    'piece pieces piano echo ratio audio video radio patio cargo ' +
    'tempo extra major minor minor angel angels demon demons icon ' +
    'icons extra major minor below above maybe perhaps soon ' +
    'someday somebody somehow someone something somewhere ' +
    'either neither always never seldom rarely barely hardly ' +
    'merely simply truly really very quite fairly nearly almost ' +
    'extra usual unusual normal abnormal regular irregular even odd ' +
    'whole partial entire complete total partial brief lengthy ' +
    'short long ' +
    // More common nouns/verbs ending in -e (frequent false-positive risk)
    'mistake mistakes choice choices voice voices juice juices price ' +
    'prices place places phase phases case cases base bases space ' +
    'spaces grace graces face faces race races pace paces brace ' +
    'braces trace traces scope scopes type types stage stages page ' +
    'pages lake lakes wave waves date dates note notes vote votes ' +
    'mode modes role roles rule rules size sizes line lines fine ' +
    'fines lane lanes mile miles file files time times tile tiles ' +
    'wire wires fire fires hire hires share shares stare stares ' +
    'rare rarely care cares cared spare spares scare scares prepare ' +
    'prepares prepared compare compares declare declares aware ' +
    'beware ware wares store stores score scores bore bores chore ' +
    'chores core cores more before more therefore explore explores ' +
    'restore restores ' +
    // Common emotions/states
    'anger fear pride peace guilt shame love hate joy thrill panic ' +
    'shock awe ' +
    // Common abstract nouns
    'truth trust faith hope luck pride pride power force value ' +
    'worth wealth health depth length width height growth youth ' +
    'birth death faith oath path math myth ' +
    // Common verbs in base form (3-4 chars)
    'dare dared dares ease eases earn earns eats ends fall falls ' +
    'feel feels gain gains halt halts hate hates hold holds idle ' +
    'idles join joins jump jumps know knows lack lacks last lasts ' +
    'lead leads lend lends look looks lose loses make makes meet ' +
    'meets miss moves note notes pull pulls push pushes read reads ' +
    'rest rests rise rises ruin ruins save saves seek seeks send ' +
    'sends show shows skip skips stop stops take takes test tests ' +
    'turn turns uses view views wait waits walk walks want wants ' +
    'wash wear wears wins wish wishes work works ' +
    // Common adverbs not yet covered
    'nearly hardly barely merely truly really likely surely fully ' +
    'totally simply purely solely lately freely loudly quietly ' +
    'softly slowly quickly clearly easily widely briefly briefly ' +
    'partly mostly mainly chiefly also only too soon early ' +
    // Specific common words found in production sweep
    'pencil pencils pen pens crayon crayons marker markers eraser erasers ' +
    'listen listens listened listening listener listeners shown showing ' +
    'learn learns learned learnt learning learner learners away aside ' +
    'arrives arrived arriving arrival arrivals leave leaves leaving ' +
    'departs departed departing depart return returns returned returning ' +
    'enter enters entered entering exit exits exited exiting ' +
    'patience patient patiently impatient impatience grace gracious ' +
    'unsafe unable unclear unfair unhappy unkind unsure unhelpful ' +
    'untrue untidy untimely uneven unlike unsteady unwilling unwise ' +
    'redo redid redone retry retried recheck recall reread rewrite rewrote ' +
    'discount discontent discouraged disrupt disrupts disrupted disorganized ' +
    'mislead misread mistaken misplaced misuse misused ' +
    'overall oversee overcame overcome overcomes overall overreact ' +
    'underline underlines underlined underlining underway undertaken ' +
    'subpar subtopic subway suburban subtle ' +
    'preplan prepared preview presort prerequisite ' +
    'classmates classmate halls hallways halfway halftime headway ' +
    'wholesome wholehearted wholly halt halts halted halting ' +
    'thrives thrived thriving thrive ' +
    'method effort sense detail intent action belief topic theme matter ' +
    'piece angle aim chance choice plan fault flaw idea hope nerve ' +
    'pride shame fault habit habit chore role ground level limit goal ' +
    'thought title image source target answer reply skill craft tool ' +
    'system process result effect cause force range scope thrust spirit ' +
    'tone state stage pace value worth merit guide path step lift ride ' +
    'lend grant pay owe sell buy lend deal trade gift loan owe ' +
    // Pronouns and connectives we may have missed
    'i me mine myself us we our ours ourselves you your yours yourself ' +
    'he him his himself she her hers herself it its itself they them ' +
    'their theirs themselves who whom whose which what whose when where ' +
    'why how whether whenever wherever however ' +
    // Days, months, time
    'monday tuesday wednesday thursday friday saturday sunday weekday ' +
    'weekend january february march april may june july august september ' +
    'october november december morning afternoon evening night midnight ' +
    'noon dawn dusk season spring summer fall autumn winter ' +
    // Common nouns in school descriptions
    'work job task assignment effort focus time class lesson period ' +
    'unit chapter test exam quiz score grade mark point points result ' +
    'results question answer note notes review feedback comment idea ' +
    'topic theme subject paper essay project writing speech presentation ' +
    'group team partner classmate student peer teacher tutor parent ' +
    'guardian principal counselor advisor mentor friend family kid kids '
  ).split(/\s+/);

  const COMMON_WORDS = new Set(COMMON_WORDS_RAW.filter(Boolean));

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

    // Long digit sequences = likely student IDs (NYC OSIS is 9 digits) or
    // phone numbers. 6+ digits avoids false positives on years (4) and
    // grades/scores (1–3).
    const idMatch = /\b\d{6,}\b/.exec(text);
    if (idMatch) {
      return { found: true, sample: idMatch[0], kind: 'id-number' };
    }

    // Email addresses
    const emailMatch = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/.exec(text);
    if (emailMatch) {
      return { found: true, sample: emailMatch[0], kind: 'email' };
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
      // and "MARCUS". For names that are also common English words (patience,
      // harper, hope, halle, etc.), require a strong name signal — same logic
      // as AMBIGUOUS_NAMES — so we don't flag them on innocuous use.
      if (NAMES.has(t.lower)) {
        if (looksLikeEnglishWord(t.lower)) {
          // Treat as ambiguous: only flag with name context.
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
        // Confident name — not an English word.
        return { found: true, sample: t.word, kind: 'name' };
      }
    }

    // Lowercase rare names in name-introducing positions. Catches narrative
    // bypasses like "she said hi to lobar yesterday" without flagging every
    // uncommon word a teacher might use. Only triggers when an unknown word
    // appears *immediately after* a word that typically precedes a person's
    // name. Each introducer gets its own pass so "paired with sherzod" still
    // catches "sherzod" even though "paired with" was matched first.
    const INTRODUCERS = [
      'named', 'called', 'introduced', 'told', 'asked', 'helped', 'saw',
      'met', 'greeted', 'spoke', 'talked', 'partnered', 'paired', 'hi',
      'hello', 'hey', 'with', 'to', 'for', 'from', 'by', 'about',
      'alongside', 'sat', 'next', 'beside', 'against', 'unlike', 'like',
    ];
    for (const intro of INTRODUCERS) {
      const r = new RegExp('\\b' + intro + '\\s+([a-z]{4,15})\\b', 'gi');
      let nm;
      while ((nm = r.exec(text)) !== null) {
        const candidate = nm[1].toLowerCase();
        if (looksLikeEnglishWord(candidate)) continue;
        // Word appears in a name-position and doesn't look like English.
        return { found: true, sample: nm[1], kind: 'name' };
      }
    }

    // Bare lowercase suspect words: also do a sweep for any lowercase 4+ char
    // word that isn't in our safe lists AND doesn't look like English. This
    // catches names that appear without an introducer ("the kid lobar tried").
    for (const t of tokens) {
      if (t.isCap) continue;
      if (t.lower.length < 4) continue;
      if (looksLikeEnglishWord(t.lower)) continue;
      if (NAMES.has(t.lower)) {
        return { found: true, sample: t.word, kind: 'name' };
      }
      // Not in dictionary, not English-looking — likely a rare name.
      return { found: true, sample: t.word, kind: 'name' };
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

    // Capitalized + name-verb at sentence start — catches names not in the
    // dictionary, e.g. "Lobar is bright", "Zumrad tries hard". Excludes
    // allow-listed openers (Today, Recently, Math, etc.) and ambiguous
    // English-collision words (Mark, Will, etc. — those have their own check
    // above with stricter rules).
    const nameVerb = new RegExp(
      '(?:^|[.!?]\\s+)([A-Z][a-z]{1,15})\\s+' +
        '(?:is|was|has|had|seems|seemed|tries|tried|works|worked|reads|read|' +
        'writes|wrote|likes|loves|enjoys|enjoyed|struggles|struggled|excels|' +
        'excelled|completed|completes|finishes|finished|earned|earns|' +
        'received|asked|asks|answered|answers|understands|understood|' +
        'comprehends|improved|improves|started|began|gets|got|appears|shows|' +
        'showed|demonstrates|demonstrated|participates|participated|' +
        'contributes|contributed|engages|engaged|tends|tended|consistently|' +
        'always|often|never|sometimes|completed|attempted|attempts|spoke|' +
        'speaks|talks|talked|asked|asks|sits|sat|stands|stood|finishes|' +
        'reads|wrote|writes|comes|came|goes|went|did|does|will|would|can|' +
        'could|should|might|may)\\b',
      'g'
    );
    while ((m = nameVerb.exec(text)) !== null) {
      const w = m[1];
      const lower = w.toLowerCase();
      if (ALLOW.has(lower)) continue;
      if (AMBIGUOUS_NAMES.has(lower)) continue; // already handled above
      return { found: true, sample: w, kind: 'name' };
    }

    // Capitalized at sentence start followed by name-style punctuation —
    // catches "Lobar.", "Lobar,", "Lobar — kind to peers".
    const startPunct =
      /(?:^|[.!?]\s+)([A-Z][a-z]{1,15})(?=\s*(?:[,.;:!?\-—–]|$))/g;
    while ((m = startPunct.exec(text)) !== null) {
      const w = m[1];
      const lower = w.toLowerCase();
      if (ALLOW.has(lower)) continue;
      if (AMBIGUOUS_NAMES.has(lower)) continue;
      return { found: true, sample: w, kind: 'name' };
    }

    // Embedded names in long compound tokens — catches bypass attempts like
    // "marcusisastudent" or "TheStudentMarcusIsHardworking". Scans tokens of
    // 8+ chars (well above typical English words) for name substrings of
    // 5+ chars. Skips tokens that look like ordinary English words to avoid
    // false positives like "halle" inside "challenges".
    for (const t of tokens) {
      if (t.lower.length < 8) continue;
      if (ALLOW.has(t.lower)) continue;
      if (NAMES.has(t.lower)) continue;
      if (AMBIGUOUS_NAMES.has(t.lower)) continue;
      // For tokens up to 15 chars (typical English word range), skip if it
      // looks English. For tokens 16+ chars, always search — at that length
      // it's almost certainly a deliberate compound, even if it ends in -ing
      // or another suffix (e.g. "thestudentmarcusishardworking").
      if (t.lower.length < 16 && looksLikeEnglishWord(t.lower)) continue;
      const found = findEmbeddedName(t.lower);
      if (found) {
        return {
          found: true,
          sample: found,
          kind: 'embedded-name',
        };
      }
    }

    return { found: false };
  }

  // Returns true if a word "looks like" everyday English. Covers three signals:
  // (1) it's in our curated dictionaries, (2) it ends in a very common English
  // suffix (-ing, -ed, -tion, etc.), or (3) it's clearly a school term.
  // Intentionally lenient — false-flagging real names is acceptable; flagging
  // adjectives/verbs is not.
  function looksLikeEnglishWord(word) {
    if (!word || word.length < 4) return true;
    // Contractions (doesn't, won't, can't, I'm, he'll, that's, etc.) — any
    // word with an internal apostrophe is overwhelmingly an English
    // contraction, not a name.
    if (/['’]/.test(word)) return true;
    if (COMMON_WORDS.has(word)) return true;
    if (ALLOW.has(word)) return true;
    if (AMBIGUOUS_NAMES.has(word)) return true;
    // Common English suffixes — words with these are almost certainly English
    // verbs, adjectives, or nouns rather than names.
    if (
      /(?:ing|ings|ed|er|ers|est|ly|tion|tions|sion|sions|ment|ments|ness|nesses|able|ible|ous|ive|ives|ful|less|ish|ism|ist|ity|ities|ize|ise|ate|ates|ated|ating|ize|ized|izing|ities|ence|ances|ance|ences|ility|ilities|ologies|ology|ography|ic|ics|al|als|ary|aries|ary|ory|ories)$/.test(
        word
      )
    ) {
      return true;
    }
    // Plural / 3rd-person singular -s on a base that's in our dictionary
    if (word.endsWith('s') && word.length >= 4) {
      const base = word.slice(0, -1);
      if (COMMON_WORDS.has(base) || ALLOW.has(base)) return true;
      if (word.endsWith('es') && word.length >= 5) {
        const baseEs = word.slice(0, -2);
        if (COMMON_WORDS.has(baseEs) || ALLOW.has(baseEs)) return true;
      }
      if (word.endsWith('ies') && word.length >= 5) {
        const baseY = word.slice(0, -3) + 'y';
        if (COMMON_WORDS.has(baseY) || ALLOW.has(baseY)) return true;
      }
    }
    return false;
  }

  function findEmbeddedName(word) {
    // Look for a name from the dictionary embedded inside `word`. Only
    // considers names 5+ chars to keep false-positive rate low.
    for (let len = Math.min(15, word.length); len >= 5; len--) {
      for (let start = 0; start <= word.length - len; start++) {
        const sub = word.slice(start, start + len);
        if (
          NAMES.has(sub) &&
          !ALLOW.has(sub) &&
          !AMBIGUOUS_NAMES.has(sub)
        ) {
          return sub;
        }
      }
    }
    return null;
  }

  return { detectPII };
});
