/**
 * Common English words set (~1500 most frequent words).
 * Words NOT in this set (and length >= 5) are considered "difficult"
 * for non-native speakers / language learners.
 */
export const COMMON_WORDS_LIST = [
  // Pronouns & determiners
  'i','me','my','mine','we','us','our','ours','you','your','yours',
  'he','him','his','she','her','hers','it','its','they','them','their','theirs',
  'this','that','these','those','the','a','an','some','any','each','every',
  'all','both','few','more','most','other','such','no','not','only','same',

  // Prepositions & conjunctions
  'in','on','at','to','for','with','from','by','about','into','through',
  'during','before','after','above','below','between','under','over','out',
  'up','down','off','of','and','but','or','nor','so','yet','if','then',
  'than','when','while','where','how','what','which','who','whom','whose',

  // Common verbs
  'be','am','is','are','was','were','been','being','have','has','had',
  'having','do','does','did','done','doing','will','would','shall','should',
  'may','might','can','could','must','need','dare','ought','used',
  'go','goes','went','gone','going','come','came','coming','make','made',
  'making','take','took','taken','taking','get','got','getting','give','gave',
  'given','giving','say','said','saying','tell','told','telling','know','knew',
  'known','knowing','think','thought','thinking','see','saw','seen','seeing',
  'want','wanted','wanting','look','looked','looking','use','using',
  'find','found','finding','put','putting','mean','meant','keep','kept',
  'let','begin','began','begun','seem','seemed','help','helped','show',
  'showed','shown','hear','heard','play','played','run','ran','running',
  'move','moved','live','lived','believe','bring','brought','happen',
  'write','wrote','written','sit','sat','stand','stood','lose','lost',
  'pay','paid','meet','met','include','continue','set','learn','change',
  'lead','led','understand','understood','watch','follow','stop','create',
  'speak','spoke','spoken','read','allow','add','spend','spent','grow',
  'grew','grown','open','opened','walk','walked','win','won','teach',
  'taught','offer','remember','love','loved','consider','appear','buy',
  'bought','wait','serve','die','died','send','sent','expect','build',
  'built','stay','fall','fell','cut','reach','kill','remain','suggest',
  'raise','pass','sell','sold','require','report','decide','pull','ask',
  'asked','like','liked','hold','held','turn','turned','call','called',
  'try','tried','leave','left','start','started','feel','felt','became',
  'become','carry','carried','talk','talked','eat','ate','eaten','draw',
  'drew','drawn','close','closed','break','broke','broken','drive','drove',
  'driven','pick','picked','wear','wore','worn','agree','agreed','cost',

  // Common nouns
  'time','year','people','way','day','man','woman','child','children',
  'world','life','hand','part','place','case','week','company','system',
  'program','question','work','government','number','night','point','home',
  'water','room','mother','area','money','story','fact','month','lot',
  'right','study','book','eye','job','word','business','issue','side',
  'kind','head','house','service','friend','father','power','hour','game',
  'line','end','member','law','car','city','community','name','president',
  'team','minute','idea','body','information','back','parent','face',
  'others','level','office','door','health','person','art','war','history',
  'party','result','morning','reason','research','girl','guy','moment',
  'air','teacher','force','education','food','boy','age','paper','source',
  'market','country','order','class','nothing','plan','table','family',
  'group','problem','school','state','thing','student','report','form',
  'turn','love','news','road','town','voice','land','view','note',
  'king','court','church','army','picture','color','sound','death','song',
  'size','dog','cat','bird','fish','tree','door','window','floor',
  'wall','ground','fire','sea','sun','moon','star','rain','snow',
  'wind','field','river','stone','earth','light','dark','heat','cold',
  'heart','mind','face','blood','bed','horse','foot','feet','price',
  'hair','bank','street','music','film','movie','space','rest',

  // Common adjectives
  'good','bad','new','old','great','big','small','long','little','large',
  'young','right','left','important','high','low','early','late','strong',
  'true','real','full','free','clear','hard','simple','sure','dark',
  'hot','cold','fast','slow','white','black','red','blue','green','open',
  'close','short','nice','whole','happy','easy','ready','wrong','able',
  'best','better','first','last','next','last','human','local','social',
  'fine','possible','public','poor','rich',

  // Common adverbs
  'very','also','often','just','now','here','there','never','always',
  'still','already','again','once','much','well','back','even','away',
  'too','far','really','almost','enough','quite','later','ever','soon',
  'maybe','else','together','often','today','usually','however','sometimes',

  // Numbers & time
  'one','two','three','four','five','six','seven','eight','nine','ten',
  'hundred','thousand','million','first','second','third','half','double',
  'today','yesterday','tomorrow','ago','since','until',

  // Other common
  'yes','no','okay','well','thank','please','sorry','hello','again',
  'thing','something','anything','nothing','everything','someone','anyone',
  'everyone','nobody','many','much','more','less','several','own',
  'whether','upon','because','though','although','across','along','among',
  'against','around','without','within','toward','towards','behind','beyond',
  'except','inside','outside','above','below','near','beside','despite',

  // Very common content words learners know
  'people','because','different','between','still','might','found','since',
  'against','along','away','before','began','being','better','between',
  'both','came','comes','could','does','doing','during','early','enough',
  'every','going','group','heard','house','important','large','later','leave',
  'makes','making','money','never','often','order','other','place',
  'really','right','second','since','small','state','still','story',
  'taken','thing','those','three','times','today','under','water',
  'where','while','world','would','years','young','place','point',
  'began','dinner','evening','information','morning',
]

const COMMON_WORDS = new Set(COMMON_WORDS_LIST)

/**
 * Check if a word is "difficult" (not in common words set).
 * Only applies to words >= 5 characters (short words are usually simple).
 */
export function isDifficultWord(word) {
  if (!word || word.length < 5) return false
  const clean = word.toLowerCase().replace(/[^a-z]/g, '')
  if (clean.length < 5) return false
  return !COMMON_WORDS.has(clean)
}

/**
 * Tokenize text into word and non-word segments.
 * Returns array of { text, isWord, isDifficult }
 */
export function tokenizeWithDifficulty(text) {
  const tokens = []
  const regex = /([a-zA-Z'-]+)|([^a-zA-Z'-]+)/g
  let match
  while ((match = regex.exec(text)) !== null) {
    const isWord = !!match[1]
    tokens.push({
      text: match[0],
      isWord,
      isDifficult: isWord && isDifficultWord(match[1]),
    })
  }
  return tokens
}
