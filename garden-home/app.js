(function(){
  "use strict";

  /* ---------- rules ---------- */
  var WATER = {
    houseplant: {
      indoor:  { summer:4, transition:6, winter:10 },
      full:    { summer:2, transition:4, winter:7 },
      partial: { summer:3, transition:5, winter:9 },
      covered: { summer:5, transition:7, winter:12 }
    },
    succulent: {
      indoor:  { summer:10, transition:14, winter:25 },
      full:    { summer:7,  transition:12, winter:20 },
      partial: { summer:9,  transition:14, winter:25 },
      covered: { summer:12, transition:18, winter:30 }
    }
  };
  // Trees: a deep watering / drip check, independent of an area's light.
  var TREE_WATER = { summer:7, transition:14, winter:30 };
  // null = no fertilizing in that season.
  var FERT = {
    houseplant: { summer:14, transition:21, autumn:30, winter:null },
    succulent:  { summer:30, transition:45, autumn:null, winter:null },
    tree:       { summer:30, transition:45, winter:null }
  };
  // Iron chelate (Fe-EDDHA) for fruit trees on calcareous soil: about once per
  // growth flush, never in winter when cold roots can't take it up.
  var IRON_EVERY = 90;
  // Pruning by tree kind (southern Israel). Matched by name/species, first hit wins,
  // so specific keys come before general ones (e.g. "תותית" before "תות").
  var PRUNE_RULES = [
    { label:'פינק ליידי', keys:['פינק'], months:[1,2], tip:'בתרדמת החורף. פינק ליידי נושא חלק מהפרי בקצות ענפי השנה, אז לא לקצר את כולם; לקצר רק ענפים זקופים וחזקים. להסיר ענפי מים, מצטלבים ופונים פנימה ולשמור על מרכז פתוח לאור. גיזום חזק מדי מעודד צימוח על חשבון פריחה ופרי.' },
    { label:'תפוח', keys:['תפוח'], months:[1,2], tip:'בתרדמת החורף, בצורת גביע או מרכז מוביל. לדלל ענפים צפופים, מצטלבים וזקופים (ענפי מים), ולשמור על הדורבנים הקצרים שעליהם הפרי. ביוני אפשר להסיר ענפי מים חדשים.' },
    { label:'נקטרינה', keys:['נקטרינ','אפרסק'], months:[1,2,6], tip:'הפרי גדל על ענפי השנה הקודמת, ולכן צריך גיזום חזק כל שנה. בחורף: צורת גביע, להסיר כמחצית מענפי השנה ולקצר את הנותרים בכשליש. אחרי הקטיף (יוני): גיזום ירוק, פתיחת המרכז והסרת ענפים זקופים.' },
    { label:'משמש', keys:['משמש'], months:[6,7], tip:'העיקר אחרי הקטיף, ביוני–יולי: הפצעים נסגרים מהר בקיץ ויש פחות סכנת מחלות. גיזום מתון: דילול ענפים צפופים וקיצור ענפים ארוכים. הפרי על דורבנים קצרים, לא להסיר אותם.' },
    { label:'שזיף', keys:['שזיף'], months:[6,7], tip:'אחרי הקטיף בקיץ, גיזום מתון: דילול מרכז העץ וקיצור ענפים ארוכים שנוטים להישבר תחת פרי. הפרי על דורבנים, לשמור עליהם.' },
    { label:'גפן איזבלה', keys:['איזבלה'], months:[1,2], tip:'בסוף החורף, לפני התעוררות העיניים. איזבלה פוריה יותר על שבטים ארוכים: להשאיר 2–4 שבטים של 6–8 עיניים ולידם דורבני החלפה של 2 עיניים, ולחתוך את השאר.' },
    { label:'גפן', keys:['גפן','ענב'], months:[1,2], tip:'בסוף החורף, לפני התעוררות העיניים. לחתוך את זמורות השנה ולהשאיר דורבנים של 2–3 עיניים על הזרועות הקבועות. באביב: להסיר שריגים עודפים ולפתוח עלווה סביב האשכולות.' },
    { label:'תאנה', keys:['תאנ'], months:[1,2], tip:'בתרדמת החורף, אחרי נשירת העלים. לשמור על גובה נוח לקטיף: לקצר ענפים גבוהים ולדלל צפופים. קיצור של כל הענפים יוריד את הביכורים, שגדלים על עץ השנה הקודמת.' },
    { label:'אפרסמון', keys:['אפרסמון'], months:[1,2], tip:'בתרדמת החורף. הפרי גדל על צימוח חדש שיוצא מענפי השנה הקודמת, אז לא לקצר את כולם. לדלל ענפים צפופים וחלשים ולשמור על עץ נמוך ופתוח; האפרסמון נוטה לשאת יותר מדי ולשבור ענפים.' },
    { label:'רימון', keys:['רימון'], months:[1,2], tip:'בסוף החורף, לפני הלבלוב. לבחור 3–5 גזעים ראשיים ולהסיר יונקים וסורים מהבסיס (גם במשך השנה). לדלל את המרכז לאוויר ואור. הפרי על דורבנים של עץ בן 2–3 שנים, אז לא לגזום חזק.' },
    { label:'הדרים', keys:['ליים','לימון','תפוז','אשכולית','קלמנטינ','מנדרינ','פומלה','הדר'], months:[3,4], tip:'גיזום מינימלי, בסוף החורף ותחילת האביב. החשוב ביותר: להסיר יונקים שצומחים מתחת לנקודת ההרכבה. לחתוך ענפים יבשים ומצטלבים ולפתוח מעט את המרכז. לא לחשוף את הגזע לשמש, ואם נחשף לסייד בלבן.' },
    { label:'אבוקדו', keys:['אבוקדו'], months:[3,4], tip:'באביב, אחרי סכנת הקרה. ריד צומח זקוף: לקצר את הצמרת כדי לשמור על גובה ולעודד הסתעפות. גיזום מתון בלבד; להשאיר ענפים שמצלים על הגזע, וגזע חשוף לסייד.' },
    { label:'מנגו', keys:['מנגו'], months:[8,9], tip:'מייד אחרי הקטיף, ולא אחרי סוף ספטמבר: הצימוח החדש צריך להבשיל כדי לפרוח בחורף. לקצר ענפים שנשאו פרי, לשמור על גובה של כ-3 מטר ולפתוח את המרכז.' },
    { label:'שסק', keys:['שסק'], months:[5,6], tip:'אחרי הקטיף, במאי–יוני. השסק פורח בסתיו בקצות הענפים, לכן לא לגזום מספטמבר ואילך. לדלל ענפים פנימיים ולקצר ענפים שנשאו פרי כדי לשמור על גובה.' },
    { label:'גויאבה תותית', keys:['תותית'], months:[2,3], tip:'גיזום קל בסוף החורף: הסרת יונקים מהבסיס וענפים צפופים. השיח פורח על צימוח חדש, אז אפשר לעצב בלי חשש.' },
    { label:'גויאבה', keys:['גויאב'], months:[2,3], tip:'בסוף החורף. הפרי על צימוח חדש, כך שקיצור קצוות הענפים מעודד הסתעפות ופריחה. לדלל את המרכז ולשמור על עץ נמוך.' },
    { label:'פיג׳ויה', keys:['פגוי','פיג׳וי','פיגוי'], months:[2,3], tip:'גיזום קל בסוף החורף, לפני הפריחה. הפריחה על צימוח השנה: להסיר ענפים פנימיים צפופים ויונקים, בלי קיצור כללי.' },
    { label:'תות', keys:['תות'], months:[1,2,6], tip:'סובל גיזום חזק. בחורף: קיצור לשמירת גובה ופתיחת המרכז. אחרי הקטיף (יוני) אפשר לקצר שוב, כי הפרי הבא גדל על צימוח חדש.' },
    { label:'פסיפלורה', keys:['פסיפלור','שעונית'], months:[2,3], tip:'בסוף החורף. הפריחה על צימוח חדש: לדלל זרועות ישנות וסבוכות ולקצר שלוחות צד ל-2–3 עיניים. לא לחתוך את הגבעול הראשי.' },
    { label:'פפאיה', keys:['פפאי','פפיה'], months:[], tip:'לא גוזמים פפאיה. רק להסיר עלים תחתונים יבשים ופירות פגומים. לא לחתוך את הצמרת, זו נקודת הצימוח היחידה.' }
  ];
  var PRUNE_DEFAULT = { label:'עץ פרי', keys:[], months:[1,2], tip:'להסיר ענפים יבשים, חולים ומצטלבים. עצים נשירים גוזמים בחורף, ירוקי-עד באביב.' };
  var PRUNE_RECENT_DAYS = 90;
  // Trees get water-soluble 20-20-20 from a watering can: small doses, repeated
  // every `every` days through the kind's growing window (`months`).
  var TREE_FERT_RULES = [
    { label:'הדרים', keys:['ליים','לימון','תפוז','אשכולית','קלמנטינ','מנדרינ','פומלה','הדר'], months:[2,3,4,5,6,7,8,9], every:21, tip:'מפברואר עד ספטמבר, כל 3 שבועות, בריכוז מלא. 20-20-20 מתאים להדרים. אם יש לך דשן מסיס עם יסודות קורט (ברזל, אבץ, מנגן), להחליף בו מנה אחת בחודש. מאוקטובר לעצור, כדי שהצימוח יבשיל לפני החורף.' },
    { label:'אבוקדו', keys:['אבוקדו'], months:[2,3,4,5,6,7,8,9], every:21, half:true, tip:'מפברואר עד ספטמבר, כל 3 שבועות, ב**חצי ריכוז**. אבוקדו רגיש למלחים ולשורשים שרופים: להשקות קודם במים רגילים, ורק אז את הדשן. חיפוי עבה של קומפוסט או שבבים מתחת לנוף תורם לו יותר מכל דשן.' },
    { label:'מנגו', keys:['מנגו'], months:[3,4,5,6,7], every:21, tip:'ממרץ עד יולי, כל 3 שבועות. מאוגוסט לא נותנים 20-20-20: החנקן מעודד צימוח לפני הפריחה של החורף. אם יש לך דשן מסיס עשיר באשלגן ("דשן לפריחה ופרי"), מנה אחת ממנו אחרי הקטיף.' },
    { label:'פינק ליידי', keys:['פינק'], months:[3,4,5], every:21, half:true, tip:'ממרץ עד מאי, כל 3 שבועות, ב**חצי ריכוז**. לעץ שפורח ולא חונט לא מגבירים דישון: עודף חנקן דוחף צימוח ירוק על חשבון פרי. מיוני לעצור.' },
    { label:'תפוח', keys:['תפוח'], months:[3,4,5,6], every:21, tip:'ממרץ עד יוני, כל 3 שבועות. מיולי לעצור, כדי שהפרי יקבל צבע והעץ ייכנס לתרדמה כראוי.' },
    { label:'נשירים גלעיניים', keys:['נקטרינ','אפרסק','משמש','שזיף'], months:[2,3,4,5,6], every:21, tip:'מסוף פברואר עד יוני, כל 3 שבועות, כולל מנה אחרי הקטיף לבניית הניצנים של השנה הבאה. ביולי–אוגוסט לעצור. עודף חנקן מגדיל צימוח ומחלות ומקטין את איכות הפרי.' },
    { label:'רימון', keys:['רימון'], months:[3,4,5,6], every:30, tip:'ממרץ עד יוני, פעם בחודש. רימון צנוע בדרישות; עודף חנקן מעודד יונקים ופיצוח פרי.' },
    { label:'תאנה', keys:['תאנ'], months:[3,4,5,6,7], every:30, tip:'ממרץ עד יולי, פעם בחודש. עודף חנקן מוריד את המתיקות ומעודד צימוח רך.' },
    { label:'גפן', keys:['גפן','ענב','איזבלה'], months:[3,4,5,6], every:30, tip:'ממרץ עד יוני, פעם בחודש. לעצור כשהענבים מתחילים להתרכך ולשנות צבע; עודף חנקן מגדל עלווה צפופה ואשכולות חלשים.' },
    { label:'אפרסמון', keys:['אפרסמון'], months:[3,4,5,6], every:30, half:true, tip:'ממרץ עד יוני, פעם בחודש, ב**חצי ריכוז**. האפרסמון רגיש לעודף חנקן, שגורם לנשירת פרי צעיר.' },
    { label:'שסק', keys:['שסק'], months:[6,7,8,9], every:30, tip:'מיוני (אחרי הקטיף) עד ספטמבר, פעם בחודש, לקראת הפריחה של הסתיו. בזמן הפריחה והפרי לעצור.' },
    { label:'גויאבה תותית', keys:['תותית'], months:[3,4,5,6,7,8,9], every:30, tip:'ממרץ עד ספטמבר, פעם בחודש. שיח צנוע בדרישות.' },
    { label:'טרופיים', keys:['גויאב','פסיפלור','שעונית','פפאי','פפיה'], months:[3,4,5,6,7,8,9,10], every:14, tip:'צומחים ומניבים לאורך כל העונה: ממרץ עד אוקטובר, כל שבועיים. בחורף לעצור.' },
    { label:'פיג׳ויה', keys:['פגוי','פיג׳וי','פיגוי'], months:[3,4,5,6,7], every:30, half:true, tip:'ממרץ עד יולי, פעם בחודש, ב**חצי ריכוז**. עודף דשן פוגע בפריחה.' },
    { label:'תות', keys:['תות'], months:[3,4,5,6,7], every:30, tip:'ממרץ עד יולי, פעם בחודש. התות חזק ולא צריך הרבה.' }
  ];
  var TREE_FERT_DEFAULT = { label:'עץ פרי', keys:[], months:[3,4,5,6,7,8], every:30, tip:'ממרץ עד אוגוסט, פעם בחודש.' };
  function matchRule(p, rules, fallback){
    var hay = (p.name || '') + ' ' + (p.species || '');
    for (var i=0;i<rules.length;i++){
      if (rules[i].keys.some(function(k){ return hay.indexOf(k) !== -1; })) return rules[i];
    }
    return fallback;
  }
  function treeFertRule(p){ return matchRule(p, TREE_FERT_RULES, TREE_FERT_DEFAULT); }
  function treeFertDates(p, from, to){
    var r = treeFertRule(p), f = fertDue(p), t = today(), out = [];
    function inWin(d){ return r.months.indexOf(d.getMonth()+1) !== -1; }
    function nextWindowStart(d){
      for (var k=1;k<=12;k++){ var m = new Date(d.getFullYear(), d.getMonth()+k, 1); if (inWin(m)) return m; }
      return null;
    }
    var cur = f.off ? nextWindowStart(t) : addDays(t, Math.max(0, f.daysUntil));
    var guard = 0;
    while (cur && cur <= to && guard++ < 200){
      if (!inWin(cur)){ cur = nextWindowStart(cur); continue; }
      if (cur >= from) out.push(cur);
      cur = addDays(cur, r.every);
    }
    return out;
  }
  function monthRangeText(months){
    if (!months.length) return '';
    return months.length === 1 ? MONTH_NAMES[months[0]-1] : MONTH_NAMES[months[0]-1] + '–' + MONTH_NAMES[months[months.length-1]-1];
  }
  // A reminder on the 1st of each month listed (and on the first of each season
  // when onlySeasonStart), plus today when it is due now.
  function monthReminderDates(months, from, to, dueNow, onlySeasonStart){
    var out = [], t = today();
    if (dueNow && from <= t && t <= to) out.push(t);
    for (var m = new Date(from.getFullYear(), from.getMonth(), 1); m <= to; m = new Date(m.getFullYear(), m.getMonth()+1, 1)){
      var mm = m.getMonth()+1, prev = (mm + 10) % 12 + 1;
      if (months.indexOf(mm) === -1 || m <= t || m < from) continue;
      if (onlySeasonStart && months.indexOf(prev) !== -1) continue;
      out.push(m);
    }
    return out;
  }
  var TYPE_LABEL = { houseplant:'עלים / פורח', succulent:'סוקולנט / קקטוס', tree:'עץ פרי' };
  var TREE_ICONS = [
    [['פינק','תפוח'], '🍎'], [['ליים','לימון'], '🍋'], [['תפוז','אשכולית','קלמנטינ','מנדרינ','פומלה'], '🍊'],
    [['מנגו'], '🥭'], [['אבוקדו'], '🥑'], [['נקטרינ','אפרסק','משמש','שזיף'], '🍑'], [['גפן','ענב','איזבלה'], '🍇'],
    [['תותית'], '🍒'], [['גויאב'], '🍐'], [['פגוי','פיג׳וי','פיגוי'], '🥝'], [['תות'], '🫐'], [['פפאי','פפיה'], '🍈'],
    [['פסיפלור','שעונית'], '🌺'], [['אפרסמון'], '🍅']
  ];
  function plantIcon(p){
    if (p.type !== 'tree') return TYPE_ICON[p.type] || '🪴';
    var hay = (p.name || '') + ' ' + (p.species || '');
    for (var i=0;i<TREE_ICONS.length;i++){
      if (TREE_ICONS[i][0].some(function(k){ return hay.indexOf(k) !== -1; })) return TREE_ICONS[i][1];
    }
    return TYPE_ICON.tree;
  }
  var TYPE_ICON  = { houseplant:'🌿', succulent:'🌵', tree:'🌳' };
  var LIGHT_LABEL = { indoor:'בבית (אור עקיף)', full:'שמש מלאה', partial:'חצי צל', covered:'מקורה / צל' };
  var LIGHT_ICON  = { indoor:'🏠', full:'☀️', partial:'⛅', covered:'🌥️' };
  var DAY_LETTERS = ['א','ב','ג','ד','ה','ו','ש'];
  var MONTH_NAMES = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  var LAST_WATER_CHOICES = [
    {label:'לא זוכר/ת', offset:null},
    {label:'היום', offset:0},
    {label:'אתמול', offset:1},
    {label:'לפני 3 ימים', offset:3},
    {label:'לפני שבוע', offset:7}
  ];
  var TREES_LOC = 'loc-trees';
  var LOG_CAP = 3000;
  var PUBLISH_DELAY = 4000;

  /* ---------- date helpers ---------- */
  function pad(n){ return n<10 ? '0'+n : ''+n; }
  function fmt(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function parse(s){ var p=s.split('-').map(Number); return new Date(p[0],p[1]-1,p[2]); }
  function startOfDay(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
  function addDays(d,n){ var r=new Date(d); r.setDate(r.getDate()+n); return r; }
  function diffDays(a,b){ return Math.round((startOfDay(a)-startOfDay(b))/86400000); }
  function today(){ return startOfDay(new Date()); }
  function season(d){
    var m = d.getMonth()+1;
    if (m===6||m===7||m===8||m===9) return 'summer';
    if (m===12||m===1||m===2) return 'winter';
    return 'transition';
  }
  function startOfWeek(d){ var r=startOfDay(d); r.setDate(r.getDate()-r.getDay()); return r; }
  // Pot feeding tapers in autumn (Oct–Nov): leafy plants monthly, succulents not at all.
  function fertSeason(d){ var m = d.getMonth()+1; return (m===10||m===11) ? 'autumn' : season(d); }

  /* ---------- watering by species (base = days between waterings indoors in spring/autumn) ---------- */
  // Matched against name + species, first hit wins, so specific keys come first.
  // winterDry: goes (semi-)dormant in winter and needs much less water then.
  var SPECIES_WATER = [
    { label:'קקטוס חג המולד', keys:['חג המולד'], base:7, tip:'קקטוס יערות, לא מדברי: אוהב לחות קלה. להשקות כשהשכבה העליונה יבשה.' },
    { label:'קקטוס זנב עכבר', keys:['זנב עכבר','Aporocactus'], base:10, tip:'להתייבש כמעט לגמרי בין השקיות; בחורף מעט מאוד.' },
    { label:'אכינופסיס', keys:['אכינופסיס'], base:14, winterDry:true, tip:'בחורף כמעט בלי מים — המנוחה הקרירה והיבשה מביאה פריחה באביב.' },
    { label:'קקטוס', keys:['קקטוס'], base:14, tip:'להשקות רק כשהאדמה יבשה לגמרי. בחורף מעט מאוד.' },
    { label:'אלוורה', keys:['אלוורה'], base:12, tip:'עמידה מאוד ליובש. עודף מים מרקיב את הבסיס.' },
    { label:'זמיוקולקס', keys:['זמיוקולקס','ZZ'], base:12, tip:'אוגר מים בפקעות. להשקות רק כשהאדמה יבשה לגמרי — עודף מים הוא הסכנה העיקרית.' },
    { label:'שרשרת לבבות', keys:['שרשרת לבבות','Ceropegia'], base:10, tip:'כמו סוקולנט: לתת לאדמה להתייבש בין השקיות.' },
    { label:'זנב חמור', keys:['זנב חמור','Sedum'], base:10, tip:'סוקולנט עדין: להשקות כשהאדמה יבשה, בלי להרטיב את העלים.' },
    { label:'מחרוזת פנינים', keys:['סנסיו','מחרוזת','פנינים'], base:9, tip:'להשקות כשהשכבה העליונה יבשה; הפנינים מתקמטות כשצריך מים.' },
    { label:'אדניום', keys:['אדניום'], base:10, winterDry:true, tip:'בחורף משיר עלים ונח: כמעט בלי מים עד האביב.' },
    { label:'יאדה', keys:['יאדה','קרסולה','Crassula'], base:10, tip:'להתייבש כמעט לגמרי בין השקיות. עלים מקומטים = צמא, עלים רכים ושקופים = עודף מים.' },
    { label:'קלנכואה', keys:['קלנכואה'], base:9, tip:'כמו סוקולנט: להשקות כשהאדמה יבשה.' },
    { label:'הויה', keys:['הויה','Hoya'], base:9, tip:'לתת לשכבה העליונה להתייבש. לא להזיז בזמן פריחה.' },
    { label:'סוקולנט', keys:['סוקולנט'], base:10, tip:'להשקות רק כשהאדמה יבשה לגמרי.' },
    { label:'קלתאה', keys:['קלתאה','Calathea'], base:4, tip:'אוהבת אדמה לחה קלות ולחות אוויר. קצוות חומים = מים קשים או אוויר יבש.' },
    { label:'שלמת בית', keys:['שלמת בית','ספטיפילום','Peace'], base:4, tip:'מראה מתי היא צמאה: העלים צונחים, ומתאוששים שעה אחרי השקיה.' },
    { label:'קרוטון', keys:['קרוטון'], base:4, tip:'אוהב לחות אחידה; ייבוש מלא גורם לנשירת עלים.' },
    { label:'כורכום', keys:['כורכום'], base:5, winterDry:true, tip:'בחורף העלים נובלים והפקעת נחה: כמעט בלי מים עד האביב.' },
    { label:'סינגוניום', keys:['סינגוניום'], base:5, tip:'לשמור על לחות קלה; לא לתת להתייבש לגמרי.' },
    { label:'פלקטרנטוס', keys:['פלקטרנטוס'], base:5, tip:'צמא יחסית; עלים רכים וצונחים = צריך מים.' },
    { label:'יסמין', keys:['יסמין'], base:5, tip:'לא לתת להתייבש לגמרי, במיוחד בזמן פריחה.' },
    { label:'פוטוס', keys:['פוטוס','אפוקמה'], base:6, tip:'להשקות כשה-2–3 ס״מ העליונים יבשים למגע.' },
    { label:'מונסטרה', keys:['מונסטרה'], base:6, tip:'להשקות כשהשכבה העליונה יבשה; עלים צהובים = לרוב עודף מים.' },
    { label:'סחלב', keys:['סחלב','פלאנופסיס'], base:7, tip:'השריה של 10 דקות פעם בשבוע ולתת להתנקז היטב. שורשים כסופים = צמא, ירוקים = רווי.' },
    { label:'זית', keys:['זית'], base:6, tip:'בעציץ מתייבש מהר; להשקות כשהשכבה העליונה יבשה.' }
  ];
  function speciesWaterRule(p){
    if (p.type === 'tree') return null;
    var hay = (p.species || '') + ' ' + (p.name || '');
    for (var i=0;i<SPECIES_WATER.length;i++){
      if (SPECIES_WATER[i].keys.some(function(k){ return hay.indexOf(k) !== -1; })) return SPECIES_WATER[i];
    }
    return null;
  }

  function waterInterval(plant, atDate){
    if (plant.waterEvery > 0) return plant.waterEvery;
    if (plant.type === 'tree') return TREE_WATER[season(atDate)];
    var loc = getLocation(plant.locationId);
    var table = WATER[plant.type] || WATER.houseplant;
    var lvl = table[loc.lightLevel] ? loc.lightLevel : 'indoor';
    var sz = season(atDate);
    var sr = speciesWaterRule(plant);
    if (sr){
      // same light/season ratios as the type's table, scaled to this species
      var ratio = table[lvl][sz] / table.indoor.transition;
      if (sr.winterDry && sz === 'winter') ratio *= 1.5;
      return Math.max(2, Math.round(sr.base * ratio));
    }
    return table[lvl][sz];
  }
  function fertInterval(plant, atDate){
    var t = FERT[plant.type] || FERT.houseplant;
    var n = t[fertSeason(atDate)] || t.transition;
    // pots in low light grow slowly and need feeding less often
    if (plant.type !== 'tree' && isLowLight(getLocation(plant.locationId))) n = lowLightInterval(n);
    return n;
  }
  function lowLightInterval(n){ return Math.round(n * 1.5 / 7) * 7; } // whole weeks
  function isLowLight(loc){ return loc && (loc.lightLevel === 'indoor' || loc.lightLevel === 'covered'); }
  // Liquid pot fertilizer from a watering can, advised per area by what grows there.
  function areaFertAdviceHtml(loc){
    var list = plantsInArea(loc.id);
    var leafy = list.filter(function(p){ return p.type !== 'succulent'; }).length;
    var succ = list.filter(function(p){ return p.type === 'succulent'; }).length;
    if (!list.length) return '';
    var low = isLowLight(loc);
    var every = function(n){ return low ? lowLightInterval(n) : n; };
    var lines = [];
    if (leafy) lines.push('<p><b>🌿 עלים ופורחים (' + leafy + '):</b> חצי מהמינון שעל אריזת הדשן לעציצים. ביוני–ספטמבר כל ' + every(14) + ' ימים, במרץ–מאי כל ' + every(21) + ' ימים, ובאוקטובר–נובמבר כל ' + every(30) + ' ימים.</p>');
    if (succ) lines.push('<p><b>🌵 סוקולנטים וקקטוסים (' + succ + '):</b> רבע מהמינון שעל האריזה. ביוני–ספטמבר כל ' + every(30) + ' ימים, במרץ–מאי כל ' + every(45) + ' ימים. מאוקטובר עד פברואר לא מדשנים.</p>');
    lines.push('<p>בדצמבר–פברואר לא מדשנים.' + (low ? ' באזור עם אור חלש הצמחים גדלים לאט, ולכן הרווחים כאן ארוכים פי 1.5.' : (loc.lightLevel === 'full' ? ' בשמש מלאה משקים הרבה והדשן נשטף, ולכן לא לדלג על מנות בקיץ.' : '')) + '</p>');
    if (leafy && succ) lines.push('<p>באזור מעורב, "דשנו ממתינים" מסמן רק את העציצים שהגיע תורם, כך שהסוקולנטים לא יקבלו דשן כל שבועיים.</p>');
    return '<details class="pp-prune pp-fertadv area-fert"><summary>🌱 המלצת דישון לאזור</summary>' + lines.join('') +
      '<p class="pp-prune-always">לדשן תמיד על אדמה לחה, אף פעם לא עציץ יבש. פעם בחודש להשקות במים בלבד עד שיוצאים מהניקוז, כדי לשטוף מלחים שמצטברים מהמים הקשים ומהדשן.</p></details>';
  }
  function fertOffNow(plant){
    var t = FERT[plant.type] || FERT.houseplant;
    return t[fertSeason(today())] === null;
  }
  // { unknown } when never recorded; { off } for fertilizing out of season

  /* ---------- weather (Nir Yitzhak) — rain counts as watering outdoors, heat and frost warnings ---------- */
  var GARDEN_LAT = 31.24, GARDEN_LON = 34.36;
  var RAIN_WATERS_MM = 5, RAIN_SOON_MM = 10, HEAT_C = 35, FROST_C = 3;
  var WEATHER_KEY = 'gh-weather', WEATHER_TTL = 3 * 60 * 60 * 1000;
  var weather = null; // { at, days: { 'YYYY-MM-DD': { rain, tmax, tmin } } }
  try { weather = JSON.parse(lsGet(WEATHER_KEY) || 'null'); } catch(e){ weather = null; }
  function weatherDay(ds){ return weather && weather.days ? weather.days[ds] : null; }
  function fetchWeather(force){
    if (!force && weather && Date.now() - weather.at < WEATHER_TTL) return;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + GARDEN_LAT + '&longitude=' + GARDEN_LON +
      '&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&past_days=7&forecast_days=4&timezone=Asia%2FJerusalem';
    fetch(url).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){
      if (!j || !j.daily || !j.daily.time) return;
      var days = {};
      j.daily.time.forEach(function(ds, i){
        days[ds] = { rain: j.daily.precipitation_sum[i] || 0, tmax: j.daily.temperature_2m_max[i], tmin: j.daily.temperature_2m_min[i] };
      });
      weather = { at: Date.now(), days: days };
      lsSet(WEATHER_KEY, JSON.stringify(weather));
      renderAll();
    }).catch(function(){});
  }
  // An area gets rain unless it is indoors or covered (the user can override in the area editor).
  function rainExposed(loc){
    if (!loc || loc.kind === 'trees') return false;
    if (typeof loc.rainExposed === 'boolean') return loc.rainExposed;
    return loc.lightLevel === 'full' || loc.lightLevel === 'partial';
  }
  // The latest past day (up to today) with enough rain to count as a watering.
  function lastRainDate(){
    if (!weather || !weather.days) return null;
    var ts = fmt(today()), best = null;
    Object.keys(weather.days).forEach(function(ds){
      if (ds <= ts && weather.days[ds].rain >= RAIN_WATERS_MM && (!best || ds > best)) best = ds;
    });
    return best;
  }
  function effectiveLastWatered(p){
    var lw = p.lastWatered;
    if (!lw) return null;
    if (rainExposed(getLocation(p.locationId))){
      var r = lastRainDate();
      if (r && r > lw) return r;
    }
    return lw;
  }
  function heatToday(){ var d = weatherDay(fmt(today())); return d && d.tmax >= HEAT_C ? d.tmax : null; }
  var FROST_KEYS = ['מנגו','פפאי','פפיה','אבוקדו','פסיפלור'];
  function weatherNotes(){
    if (!weather || !weather.days) return [];
    var notes = [], t = today(), ts = fmt(t), tm = fmt(addDays(t, 1)), y = fmt(addDays(t, -1));
    var WD = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
    var dayName = function(ds){ return ds === ts ? 'היום' : ds === tm ? 'מחר' : ds === y ? 'אתמול' : 'ביום ' + WD[parse(ds).getDay()]; };
    var outdoorAreas = potLocations().filter(function(l){ return rainExposed(l) && plantsInArea(l.id).length; });
    var r = lastRainDate();
    if (r && diffDays(t, parse(r)) <= 2 && outdoorAreas.length){
      notes.push({ cls:'rain', text:'🌧 ירדו ' + Math.round(weather.days[r].rain) + ' מ״מ ' + dayName(r) + ': ' + outdoorAreas.length + ' אזורים בחוץ נחשבים מושקים' });
    }
    var soon = [ts, tm, fmt(addDays(t, 2))].filter(function(ds){ var d = weatherDay(ds); return d && d.rain >= RAIN_SOON_MM; });
    if (soon.length){
      notes.push({ cls:'rain', text:'☔ צפוי גשם ' + dayName(soon[0]) + ' (' + Math.round(weatherDay(soon[0]).rain) + ' מ״מ): לא להשקות בחוץ, ולדחות דישון עד אחרי הגשם' });
    }
    var hot = [ts, tm].filter(function(ds){ var d = weatherDay(ds); return d && d.tmax >= HEAT_C; });
    if (hot.length){
      var fullSun = potLocations().filter(function(l){ return l.lightLevel === 'full' && plantsInArea(l.id).length; }).length;
      notes.push({ cls:'heat', text:'🔥 שרב ' + dayName(hot[0]) + ' (' + Math.round(weatherDay(hot[0]).tmax) + '°): ' + (fullSun ? 'עציצים בשמש מלאה מושקים יום מוקדם; ' : '') + 'לבדוק שהטפטפות של העצים עובדות' });
    }
    var cold = [ts, tm].filter(function(ds){ var d = weatherDay(ds); return d && d.tmin <= FROST_C; });
    if (cold.length){
      var sensitive = plantsInArea(TREES_LOC).filter(function(p){ return FROST_KEYS.some(function(k){ return (p.name + ' ' + (p.species||'')).indexOf(k) !== -1; }); });
      notes.push({ cls:'frost', text:'❄️ קרה ' + (cold[0] === ts ? 'הלילה' : 'מחר בלילה') + ' (' + Math.round(weatherDay(cold[0]).tmin) + '°): ' +
        (sensitive.length ? 'לכסות ' + sensitive.map(function(p){ return p.name; }).join(', ') + ', ' : '') + 'להשקות היום ולהכניס עציצים רגישים' });
    }
    return notes;
  }


  /* ---------- tree journal: bloom, fruit set, harvest, problems and photos over the years ---------- */
  var J_KINDS = [
    { k:'bloom',   ic:'🌸', label:'פריחה' },
    { k:'set',     ic:'🍏', label:'חנטה' },
    { k:'harvest', ic:'🧺', label:'קציר' },
    { k:'problem', ic:'🐛', label:'בעיה' },
    { k:'photo',   ic:'📷', label:'תמונה / הערה' }
  ];
  function jKind(k){ for (var i=0;i<J_KINDS.length;i++) if (J_KINDS[i].k === k) return J_KINDS[i]; return J_KINDS[4]; }
  function journalOf(p){ return Array.isArray(p.journal) ? p.journal : []; }
  function sortedJournal(p){ return journalOf(p).slice().sort(function(a, b){ return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id > a.id ? 1 : -1); }); }
  function shortDate(ds){ var d = parse(ds); return d.getDate() + '/' + (d.getMonth()+1); }
  // A year's season: first bloom, first set, and the harvest total per unit.
  function yearSummary(p, year){
    var ys = String(year), out = { bloom:null, set:null, harvest:{}, count:0 };
    journalOf(p).forEach(function(e){
      if (e.date.slice(0, 4) !== ys) return;
      out.count++;
      if (e.kind === 'bloom' && (!out.bloom || e.date < out.bloom)) out.bloom = e.date;
      if (e.kind === 'set' && (!out.set || e.date < out.set)) out.set = e.date;
      if (e.kind === 'harvest'){
        var u = e.unit || 'פירות';
        if (e.qty > 0) out.harvest[u] = (out.harvest[u] || 0) + Number(e.qty);
        else out.harvest['פעמים'] = (out.harvest['פעמים'] || 0) + 1;
      }
    });
    return out;
  }
  function harvestText(h){
    var keys = Object.keys(h);
    if (!keys.length) return '';
    return keys.map(function(u){ return u === 'פעמים' ? h[u] + ' קטיפים' : (Math.round(h[u] * 10) / 10) + ' ' + u; }).join(' + ');
  }
  function yearLineHtml(p, year){
    var y = yearSummary(p, year);
    if (!y.count) return '';
    var bits = [];
    if (y.bloom) bits.push('🌸 ' + shortDate(y.bloom));
    if (y.set) bits.push('🍏 ' + shortDate(y.set));
    var h = harvestText(y.harvest);
    if (h) bits.push('🧺 ' + h);
    return '<div class="j-year"><b>' + year + '</b>' + (bits.length ? ' · ' + bits.join(' · ') : ' · ' + y.count + ' רשומות') + '</div>';
  }
  function journalHtml(p, showAll){
    var list = sortedJournal(p);
    var thisYear = today().getFullYear();
    var years = [];
    list.forEach(function(e){ var y = Number(e.date.slice(0, 4)); if (years.indexOf(y) === -1) years.push(y); });
    var summary = years.slice(0, 3).map(function(y){ return yearLineHtml(p, y); }).join('');
    var shown = showAll ? list : list.slice(0, 4);
    var rows = shown.map(function(e){
      var k = jKind(e.kind);
      return '<button type="button" class="j-entry" data-pp="jedit" data-entry="' + e.id + '">' +
        '<span class="j-ic" aria-hidden="true">' + k.ic + '</span>' +
        '<span class="j-main"><span class="j-top"><b>' + k.label + '</b> · ' + shortDate(e.date) + (e.date.slice(0, 4) !== String(thisYear) ? '/' + e.date.slice(2, 4) : '') +
          (e.kind === 'harvest' && e.qty ? ' · ' + e.qty + ' ' + escapeHtml(e.unit || 'פירות') : '') + '</span>' +
          (e.note ? '<span class="j-note">' + escapeHtml(e.note) + '</span>' : '') + '</span>' +
        (e.photoId && photoSrc(e.photoId) ? '<img class="j-thumb" src="' + photoSrc(e.photoId) + '" alt="">' : '') +
      '</button>';
    }).join('');
    return '<div class="journal">' +
      '<div class="j-head"><span class="j-title">📔 יומן העץ</span>' + (list.length ? '<span class="j-count">' + list.length + ' רשומות</span>' : '') + '</div>' +
      '<div class="j-add">' + J_KINDS.map(function(k){ return '<button type="button" class="j-add-btn" data-pp="jadd" data-kind="' + k.k + '">' + k.ic + ' ' + k.label + '</button>'; }).join('') + '</div>' +
      (summary ? '<div class="j-years">' + summary + '</div>' : '') +
      (rows ? '<div class="j-list">' + rows + '</div>' : '<p class="j-empty">עוד אין רשומות. כשהעץ פורח, חונט או נותן פרי, לחצו על הכפתור המתאים. אחרי עונה תוכלו להשוות בין שנים.</p>') +
      (list.length > shown.length ? '<button type="button" class="link-btn j-more" data-pp="jall">הצגת כל ' + list.length + ' הרשומות</button>' : '') +
    '</div>';
  }
  var journalShowAll = false;
  function openJournalSheet(plantId, kind, entryId){
    var p = findPlant(plantId); if (!p) return;
    var e = entryId ? journalOf(p).filter(function(x){ return x.id === entryId; })[0] : null;
    kind = e ? e.kind : kind;
    var k = jKind(kind), isHarvest = kind === 'harvest';
    var pendingFile = null, confirmDel = false;
    closeSheet();
    var wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.id = 'sheetBackdrop';
    function render(){
      wrap.innerHTML = '<div class="sheet">' +
        '<h2>' + k.ic + ' ' + k.label + ' · ' + escapeHtml(p.name) + '</h2>' +
        '<div class="field"><label for="jDate">תאריך</label><input type="date" id="jDate" value="' + (e ? e.date : fmt(today())) + '" max="' + fmt(today()) + '"></div>' +
        (isHarvest ? '<div class="field"><label for="jQty">כמות (רשות)</label><div class="j-qty-row">' +
          '<input type="number" id="jQty" inputmode="decimal" min="0" step="0.1" value="' + (e && e.qty ? e.qty : '') + '" placeholder="למשל 12">' +
          '<select class="field-select" id="jUnit">' + ['פירות','ק״ג','אשכולות'].map(function(u){ return '<option' + ((e && e.unit === u) ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></div></div>' : '') +
        '<div class="field"><label for="jNote">' + (kind === 'problem' ? 'מה ראית' : 'הערה (רשות)') + '</label><textarea id="jNote" rows="2" class="pp-notes" placeholder="' +
          ({ bloom:'למשל: פריחה מלאה, הרבה פרחים', set:'למשל: כ-20 פירות קטנים', harvest:'למשל: מתוקים, קצת קטנים', problem:'למשל: עלים מסולסלים בצימוח החדש', photo:'מה רואים בתמונה' }[kind] || '') +
          '">' + escapeHtml(e ? e.note || '' : '') + '</textarea></div>' +
        '<div class="field"><label>תמונה (רשות)</label>' +
          '<label class="photo-picker" id="jPhotoPicker"><span class="ic">📷</span><span id="jPhotoLabel">' + (pendingFile ? 'נבחרה תמונה ✓' : (e && e.photoId ? 'החלפת התמונה' : 'צילום או בחירה')) + '</span>' +
            '<input type="file" id="jPhotoInput" accept="image/*" capture="environment" style="position:absolute;inset:0;opacity:0;cursor:pointer;"></label>' +
          (e && e.photoId && photoSrc(e.photoId) && !pendingFile ? '<img class="j-photo-big" src="' + photoSrc(e.photoId) + '" alt="">' : '') +
        '</div>' +
        '<div class="sheet-actions">' +
          (e ? '<button type="button" class="btn btn-danger-ghost" id="jDelete">' + (confirmDel ? 'למחוק? לחצו שוב' : '🗑 מחיקה') + '</button>'
             : '<button type="button" class="btn btn-ghost" id="jCancel">ביטול</button>') +
          '<button type="button" class="btn btn-primary" id="jSave">שמירה</button>' +
        '</div></div>';
    }
    render();
    document.getElementById('app').appendChild(wrap);
    wrap.addEventListener('change', function(ev){
      if (ev.target.id === 'jPhotoInput'){
        pendingFile = ev.target.files && ev.target.files[0];
        var lab = document.getElementById('jPhotoLabel'); if (lab && pendingFile) lab.textContent = 'נבחרה תמונה ✓';
      }
    });
    wrap.addEventListener('click', function(ev){
      if (ev.target === wrap || ev.target.id === 'jCancel'){ closeSheet(); return; }
      if (ev.target.id === 'jDelete'){
        if (!confirmDel){
          confirmDel = true; ev.target.textContent = 'למחוק? לחצו שוב'; return;
        }
        p.journal = journalOf(p).filter(function(x){ return x.id !== e.id; });
        saveState(); closeSheet(); refreshPopup(); toast('הרשומה נמחקה');
        return;
      }
      if (ev.target.id === 'jSave'){
        var date = document.getElementById('jDate').value || fmt(today());
        var note = document.getElementById('jNote').value.trim();
        var qtyEl = document.getElementById('jQty'), unitEl = document.getElementById('jUnit');
        var qty = qtyEl && qtyEl.value ? Math.max(0, parseFloat(qtyEl.value)) : null;
        var btn = ev.target; btn.disabled = true; btn.textContent = pendingFile ? 'שומר תמונה…' : 'שומר…';
        uploadPhoto(pendingFile).then(function(photoId){
          if (pendingFile && !photoId) toast('התמונה לא נשמרה, הרשומה נשמרה בלעדיה', 4000);
          if (!Array.isArray(p.journal)) p.journal = [];
          var entry = e || { id: 'j' + Date.now() + Math.floor(Math.random()*1000), kind: kind };
          entry.date = date; entry.note = note;
          if (isHarvest){ entry.qty = qty || null; entry.unit = unitEl ? unitEl.value : 'פירות'; }
          if (photoId) entry.photoId = photoId;
          if (!e) p.journal.push(entry);
          saveState(); closeSheet(); refreshPopup(); renderAll();
          toast(k.ic + ' נשמר ביומן של ' + p.name);
        });
      }
    });
  }
  function openPhotoViewer(photoId){
    if (!photoSrc(photoId)) return;
    closeSheet();
    var wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop photo-viewer';
    wrap.id = 'sheetBackdrop';
    wrap.innerHTML = '<img src="' + photoSrc(photoId) + '" alt="">';
    wrap.addEventListener('click', closeSheet);
    document.getElementById('app').appendChild(wrap);
  }
  // Season overview: every tree's bloom, set and harvest for one year, side by side.
  var seasonYear = null;
  function openSeasonJournal(){
    var trees = plantsInArea(TREES_LOC);
    if (seasonYear === null) seasonYear = today().getFullYear();
    var years = [];
    trees.forEach(function(p){ journalOf(p).forEach(function(e){ var y = Number(e.date.slice(0, 4)); if (years.indexOf(y) === -1) years.push(y); }); });
    var minY = years.length ? Math.min.apply(null, years) : seasonYear, maxY = today().getFullYear();
    var withData = 0;
    // trees with records this year first, the rest keep their order
    trees = trees.map(function(p, i){ return { p:p, i:i, has: yearSummary(p, seasonYear).count ? 0 : 1 }; })
      .sort(function(a, b){ return a.has - b.has || a.i - b.i; }).map(function(x){ return x.p; });
    var rows = trees.map(function(p){
      var y = yearSummary(p, seasonYear);
      if (y.count) withData++;
      var h = harvestText(y.harvest);
      return '<tr data-tree="' + p.id + '"><td class="sj-name">' + plantIcon(p) + ' ' + escapeHtml(p.name) + '</td>' +
        '<td>' + (y.bloom ? shortDate(y.bloom) : '<span class="sj-none">—</span>') + '</td>' +
        '<td>' + (y.set ? shortDate(y.set) : '<span class="sj-none">—</span>') + '</td>' +
        '<td>' + (h || '<span class="sj-none">—</span>') + '</td></tr>';
    }).join('');
    closeSheet();
    var wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.id = 'sheetBackdrop';
    wrap.innerHTML = '<div class="sheet"><h2>📔 יומן העונה</h2>' +
      '<div class="cal-nav"><button type="button" data-sy="prev" aria-label="שנה קודמת"' + (seasonYear <= minY ? ' disabled' : '') + '>‹</button>' +
        '<div class="cal-range">' + seasonYear + '</div>' +
        '<button type="button" data-sy="next" aria-label="שנה הבאה"' + (seasonYear >= maxY ? ' disabled' : '') + '>›</button></div>' +
      '<p class="am-hint">' + (withData ? withData + ' מתוך ' + trees.length + ' עצים עם רשומות ב-' + seasonYear + '. לחיצה על עץ פותחת אותו.' : 'עוד אין רשומות לשנה הזו. מוסיפים מתוך כל עץ, בחלק "יומן העץ".') + '</p>' +
      '<div class="sj-wrap"><table class="sj"><thead><tr><th>עץ</th><th>🌸 פריחה</th><th>🍏 חנטה</th><th>🧺 קציר</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="sheet-actions" style="margin-top:14px;"><button type="button" class="btn btn-ghost" data-sy="close">סגירה</button></div></div>';
    document.getElementById('app').appendChild(wrap);
    wrap.addEventListener('click', function(ev){
      if (ev.target === wrap){ closeSheet(); return; }
      var b = ev.target.closest('[data-sy]');
      if (b && !b.disabled){
        if (b.dataset.sy === 'close'){ closeSheet(); return; }
        seasonYear += b.dataset.sy === 'next' ? 1 : -1; openSeasonJournal(); return;
      }
      var row = ev.target.closest('tr[data-tree]');
      if (row){ closeSheet(); popupConfirmDelete = false; openPlantPopup(row.dataset.tree); }
    });
  }
  // The old journal kept a harvest log per tree; bring it in once.
  function importOldHarvest(){
    var raw = null;
    try { if (lsGet('gardenHome_harvestImported')) return; raw = localStorage.getItem('gardenJournalApp_v1'); } catch(e){ return; }
    lsSet('gardenHome_harvestImported', '1');
    if (!raw) return;
    var old; try { old = JSON.parse(raw); } catch(e){ return; }
    var count = 0;
    (old.trees || []).forEach(function(t){
      var m = /^t(\d+)$/.exec(t.id || ''); if (!m || !Array.isArray(t.harvestLog) || !t.harvestLog.length) return;
      var p = findPlant('p-t' + m[1]); if (!p) return;
      if (!Array.isArray(p.journal)) p.journal = [];
      t.harvestLog.forEach(function(h, i){
        if (!h || !h.date) return;
        var n = parseFloat(h.quantity);
        p.journal.push({ id:'jold' + m[1] + '_' + i, kind:'harvest', date:h.date, qty: isNaN(n) ? null : n,
          unit: /ק"?ג|קילו/.test(h.quantity || '') ? 'ק״ג' : 'פירות', note: isNaN(n) ? (h.quantity || '') : '' });
        count++;
      });
    });
    if (count){ saveState(); setTimeout(function(){ toast('יובא יומן הקציר מ"יומן הגינה" (' + count + ' רשומות)', 5000); }, 1600); }
  }

  /* ---------- seasonal checks per tree kind (southern Israel) ---------- */
  var MEDFLY_TIP = '4–6 שבועות לפני ההבשלה לתלות מלכודת עם פיתיון חלבוני (אחת לעץ, בצד המוצל). לאסוף ולהשמיד כל פרי נשור או מנוקב, לא להשאיר על הקרקע. נקודה רכה עם חור קטן בקליפה היא סימן לנגיעה.';
  var SEASON_CHECKS = [
    { id:'medfly-stone', icon:'🪰', title:'זבוב הפירות', months:[4,5,6], keys:['נקטרינ','אפרסק','משמש','שזיף'], tip:MEDFLY_TIP },
    { id:'medfly-summer', icon:'🪰', title:'זבוב הפירות', months:[6,7,8,9], keys:['מנגו','תאנ','גויאב','תפוח ענה','תפוח ורד'], tip:MEDFLY_TIP },
    { id:'medfly-autumn', icon:'🪰', title:'זבוב הפירות', months:[9,10,11], keys:['פינק','אפרסמון','תפוז','קלמנטינ','מנדרינ'], tip:MEDFLY_TIP },
    { id:'leafminer', icon:'🍃', title:'מנהרן עלי ההדרים', months:[4,5,9,10], keys:['ליים','לימון','תפוז','אשכולית','קלמנטינ','מנדרינ','פומלה'], tip:'בכל גל צימוח חדש: עלים צעירים מסולסלים עם מנהרות כסופות מתפתלות. בעץ בוגר הנזק קוסמטי ואין צורך לטפל. בעץ צעיר: לרסס שמן קיצי על הצימוח החדש כל 7–10 ימים, עד שהעלים מתקשים.' },
    { id:'mango-mildew', icon:'🌼', title:'קימחון בתפרחות המנגו', months:[2,3], keys:['מנגו'], tip:'בתחילת הפריחה לבדוק אם יש אבקה לבנה על התפרחות. אם כן: לרסס גופרית מוקדם בבוקר ולחזור אחרי שבועיים. בלי טיפול התפרחות מתייבשות ואין חנטה.' },
    { id:'thin-stone', icon:'🫳', title:'דילול פירות', months:[3,4], keys:['נקטרינ','אפרסק','שזיף'], tip:'כשהפירות בגודל אגוז לוז: להשאיר פרי אחד כל 15–20 ס״מ לאורך הענף, ולהסיר את הקטנים והפגומים. פחות פירות נותנים פירות גדולים ומתוקים יותר, ומונעים שבירת ענפים.' },
    { id:'thin-apple', icon:'🫳', title:'דילול תפוחים', months:[4,5], keys:['תפוח'], tip:'בכל אשכול להשאיר פרי אחד, המרכזי והגדול, ואשכול אחד כל 15–20 ס״מ. בעץ צעיר להשאיר מעט פירות, כדי שהאנרגיה תלך לצימוח ולא יהיה עומס.' },
    { id:'pom-butterfly', icon:'🦋', title:'פרפר הרימון', months:[6,7,8,9], keys:['רימון'], tip:'פרי עם חור בכתר ונוזל דביק: יש זחל בפנים. אפשר לעטוף פירות בשקיות נייר או רשת כשהם בגודל אגוז, ולאסוף פירות נגועים. השקיה סדירה מונעת גם פיצוח פרי.' },
    { id:'grape-mildew', icon:'🍇', title:'קימחון בגפן', months:[4,5,6], keys:['גפן','ענב','איזבלה'], tip:'מהלבלוב ועד שהענבים מתרככים: לבדוק אבקה לבנה-אפורה על עלים ואשכולות. גופרית אבקה כל 10–14 ימים, לא בשרב מעל 32°, כדי לא לשרוף.' },
    { id:'trunk-sun', icon:'☀️', title:'כוויות שמש בגזע', months:[5,6], keys:['אבוקדו','ליים','לימון','תפוז','אשכולית','מנגו'], tip:'גזע וענפים שחשופים לשמש: לסייד בלבן (סיד, או צבע לבן מדולל במים 1:1). חשוב במיוחד בעצים צעירים ואחרי גיזום.' },
    { id:'frost-prep', icon:'❄️', title:'הכנה לקרה', months:[12,1,2], keys:FROST_KEYS, tip:'להכין יריעת כיסוי (אגריל) ליד העצים הרגישים. בלילה שצפויים בו 3° ומטה: להשקות ביום שלפני ולכסות עד הקרקע בערב. האפליקציה מתריעה כשצפויה קרה.' }
  ];
  // Harvest months: what the owner marked on the tree's year strip, otherwise the
  // months a harvest was logged in its journal. null = not known yet.
  function harvestMonthsOf(p){
    if (Array.isArray(p.harvestMonths)) return p.harvestMonths.slice().sort(function(a, b){ return a - b; });
    var ms = [];
    journalOf(p).forEach(function(e){ if (e.kind === 'harvest'){ var m = Number(e.date.slice(5, 7)); if (ms.indexOf(m) === -1) ms.push(m); } });
    return ms.length ? ms.sort(function(a, b){ return a - b; }) : null;
  }
  // Fruit-fly checks follow the tree's own harvest when it is known: from a month before until the harvest ends.
  function checkMonthsFor(c, p){
    if (/^medfly/.test(c.id)){
      var hm = harvestMonthsOf(p);
      if (hm && hm.length) return [hm[0] === 1 ? 12 : hm[0] - 1].concat(hm);
    }
    return c.months;
  }
  function treeMatches(p, keys){ var hay = (p.name || '') + ' ' + (p.species || ''); return keys.some(function(k){ return hay.indexOf(k) !== -1; }); }
  function monthKey(){ var t = today(); return t.getFullYear() + '-' + pad(t.getMonth()+1); }
  function seasonChecksNow(){
    var m = today().getMonth()+1, trees = plantsInArea(TREES_LOC), out = [];
    SEASON_CHECKS.forEach(function(c){
      var hit = trees.filter(function(p){ return treeMatches(p, c.keys) && checkMonthsFor(c, p).indexOf(m) !== -1; });
      if (!hit.length) return;
      out.push({ check:c, trees:hit, done: !!(state.seasonDone && state.seasonDone[c.id + '@' + monthKey()]) });
    });
    return out;
  }
  function seasonCardHtml(){
    var list = seasonChecksNow();
    if (!list.length) return '';
    var open = list.filter(function(x){ return !x.done; });
    var titles = [];
    open.forEach(function(x){ if (titles.indexOf(x.check.icon + ' ' + x.check.title) === -1) titles.push(x.check.icon + ' ' + x.check.title); });
    return '<button type="button" class="season-card' + (open.length ? '' : ' done') + '" id="seasonBtn">' +
      '<span class="ts-title">החודש בגינה · ' + MONTH_NAMES[today().getMonth()] + '</span>' +
      '<span class="season-titles">' + (open.length ? titles.join(' · ') : '✓ כל הבדיקות של החודש סומנו') + '</span>' +
      '<span class="ts-go">' + (open.length ? (open.length === 1 ? 'בדיקה פתוחה אחת ‹' : open.length + ' בדיקות פתוחות ‹') : 'לפרטים ‹') + '</span></button>';
  }
  function openSeasonSheet(){
    closeSheet();
    var list = seasonChecksNow();
    var wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.id = 'sheetBackdrop';
    wrap.innerHTML = '<div class="sheet"><h2>החודש בגינה · ' + MONTH_NAMES[today().getMonth()] + '</h2>' +
      '<p class="am-hint">בדיקות עונתיות לעצים שלך. סמנו "בדקתי" כשטיפלתם, והבדיקה תחזור בחודש הבא אם עדיין רלוונטית.</p>' +
      list.map(function(x){
        return '<div class="season-item' + (x.done ? ' done' : '') + '">' +
          '<div class="si-head"><span class="si-title">' + x.check.icon + ' ' + escapeHtml(x.check.title) + '</span>' +
            '<button type="button" class="cal-area-btn' + (x.done ? '' : ' water') + '" data-season="' + x.check.id + '">' + (x.done ? '↩ לא בדקתי' : '✓ בדקתי') + '</button></div>' +
          '<p>' + escapeHtml(x.check.tip).replace(/\d+(?:[-–:]\d+)+/g, function(n){ return '<bdi dir="ltr">' + n + '</bdi>'; }) + '</p>' +
          plantChips(x.trees.map(function(p){ return p.id; })) + '</div>';
      }).join('') +
      '<div class="sheet-actions" style="margin-top:14px;"><button type="button" class="btn btn-ghost" data-cal-close="1">סגירה</button></div></div>';
    document.getElementById('app').appendChild(wrap);
    wrap.addEventListener('click', function(e){
      if (e.target === wrap || e.target.closest('[data-cal-close]')){ closeSheet(); return; }
      var chip = e.target.closest('[data-cal-plant]');
      if (chip){ closeSheet(); popupConfirmDelete = false; openPlantPopup(chip.dataset.calPlant); return; }
      var sb = e.target.closest('[data-season]');
      if (sb){
        if (!state.seasonDone) state.seasonDone = {};
        var k = sb.dataset.season + '@' + monthKey();
        if (state.seasonDone[k]) delete state.seasonDone[k]; else state.seasonDone[k] = true;
        saveState(); renderAll(); openSeasonSheet();
      }
    });
  }
  function treeSeasonHtml(p){
    var m = today().getMonth()+1;
    var mine = SEASON_CHECKS.filter(function(c){ return treeMatches(p, c.keys) && checkMonthsFor(c, p).indexOf(m) !== -1; });
    if (!mine.length) return '';
    return '<details class="pp-prune pp-season" open><summary>👀 החודש לבדוק</summary>' + mine.map(function(c){
      return '<p><b>' + c.icon + ' ' + escapeHtml(c.title) + ':</b> ' + escapeHtml(c.tip).replace(/\d+(?:[-–:]\d+)+/g, function(n){ return '<bdi dir="ltr">' + n + '</bdi>'; }) + '</p>';
    }).join('') + '</details>';
  }

  /* ---------- backup safety ---------- */
  var BACKUP_KEY = 'gh-lastBackup', FIRST_SEEN_KEY = 'gh-firstSeen', BACKUP_EVERY_DAYS = 30;
  if (!lsGet(FIRST_SEEN_KEY)) lsSet(FIRST_SEEN_KEY, fmt(today()));
  function backupAgeDays(){
    var last = lsGet(BACKUP_KEY);
    return last ? diffDays(today(), parse(last)) : null;
  }
  function backupReminderHtml(){
    if (!state.plants.length) return '';
    var age = backupAgeDays();
    var since = diffDays(today(), parse(lsGet(FIRST_SEEN_KEY) || fmt(today())));
    if (age === null ? since < 7 : age < BACKUP_EVERY_DAYS) return '';
    return '<button type="button" class="backup-nudge" id="backupNudge">💾 ' +
      (age === null ? 'עוד לא נשמר גיבוי.' : 'הגיבוי האחרון לפני ' + age + ' ימים.') +
      ' הנתונים שמורים רק בטלפון הזה. <b>לגיבוי עכשיו</b></button>';
  }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch(e){}

  function waterDue(p){
    if (p.type === 'tree') return { na:true }; // trees are on automatic drip irrigation
    if (!p.lastWatered) return { unknown:true };
    var last = parse(effectiveLastWatered(p));
    var until = diffDays(addDays(last, waterInterval(p, last)), today());
    if (until > 0 && heatToday() && getLocation(p.locationId).lightLevel === 'full') until -= 1; // heat wave: a day earlier
    return { daysUntil: until, rained: effectiveLastWatered(p) !== p.lastWatered };
  }
  function fertDue(p){
    if (p.type === 'tree'){
      var r = treeFertRule(p), t = today(), m = t.getMonth()+1;
      if (r.months.indexOf(m) === -1) return { off:true, next: nextPruneMonth(r, m), tree:true };
      if (!p.lastFertilized) return { daysUntil:0, tree:true };
      var nextDose = addDays(parse(p.lastFertilized), r.every);
      if (nextDose <= t) return { daysUntil: diffDays(nextDose, t), tree:true };
      if (r.months.indexOf(nextDose.getMonth()+1) === -1) return { off:true, next: nextPruneMonth(r, nextDose.getMonth()+1), tree:true };
      return { daysUntil: diffDays(nextDose, t), tree:true };
    }
    if (fertOffNow(p)) return { off:true };
    if (!p.lastFertilized) return { unknown:true };
    var last = parse(p.lastFertilized);
    return { daysUntil: diffDays(addDays(last, fertInterval(p, last)), today()) };
  }
  function ironOffAt(d){ return season(d) === 'winter'; }
  function ironDue(p){
    if (p.type !== 'tree' || !p.needsIron) return { na:true };
    if (ironOffAt(today())) return { off:true };
    if (!p.lastIron) return { unknown:true };
    return { daysUntil: diffDays(addDays(parse(p.lastIron), IRON_EVERY), today()) };
  }
  function ironInterval(){ return IRON_EVERY; }
  function isDue(info){ return !info.na && !info.unknown && !info.off && info.daysUntil <= 0; }
  function pruneRule(p){ return matchRule(p, PRUNE_RULES, PRUNE_DEFAULT); }
  function pruneDue(p){
    if (p.type !== 'tree') return { na:true };
    var r = pruneRule(p);
    if (!r.months.length) return { na:true, never:true };
    var m = today().getMonth()+1;
    var recent = p.lastPruned && diffDays(today(), parse(p.lastPruned)) < PRUNE_RECENT_DAYS;
    if (r.months.indexOf(m) === -1) return { off:true, next: nextPruneMonth(r, m) };
    if (recent) return { off:true, recent:true };
    return { daysUntil:0 };
  }
  function nextPruneMonth(r, m){
    for (var k=1;k<=12;k++){ var mm = (m-1+k)%12+1; if (r.months.indexOf(mm) !== -1) return mm; }
    return null;
  }
  function pruneMonthsText(r){ return r.months.map(function(m){ return MONTH_NAMES[m-1]; }).join(', '); }
  function pruneText(d){
    if (d.never) return 'לא גוזמים';
    if (d.recent) return 'גוזם בעונה הזו ✓';
    if (d.off) return 'הגיזום הבא ב' + MONTH_NAMES[d.next-1];
    return 'עונת גיזום עכשיו';
  }
  var CARE_FIELD = { water:'lastWatered', fert:'lastFertilized', iron:'lastIron', prune:'lastPruned' };
  function careDue(p, kind){ return kind==='water' ? waterDue(p) : kind==='iron' ? ironDue(p) : fertDue(p); }

  /* ---------- state ---------- */
  var APP_VERSION = '17';
  var STATE_KEY = 'gardenHome_state_v1';
  var state = null;
  try { state = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); } catch(e){ state = null; }
  var freshInstall = !state;
  if (!state){
    try { state = JSON.parse(document.getElementById('state-data').textContent); } catch(e){ state = {plants:[], locations:[], log:[]}; }
  }
  if (!state.plants) state.plants = [];
  if (!state.log) state.log = [];
  if (typeof state.weekOffset !== 'number') state.weekOffset = 0;
  if (typeof state.calendarOffset !== 'number') state.calendarOffset = 0;
  if (!state.locations || !state.locations.length){
    state.locations = [{ id:'loc-home', name:'בית', lightLevel:'indoor' }];
  }
  if (!state.locations.some(function(l){ return l.id===TREES_LOC; })){
    state.locations.unshift({ id:TREES_LOC, name:'עצי פרי', lightLevel:'full', kind:'trees' });
  }
  state.plants.forEach(function(p){
    if (!p.locationId) p.locationId = potLocations()[0].id;
    if (p.type === 'tree') p.locationId = TREES_LOC;
    // iron is tracked only for trees that need it; trees that already got iron keep tracking
    if (p.type === 'tree' && p.needsIron === undefined) p.needsIron = !!p.lastIron;
  });

  function potLocations(){ return state.locations.filter(function(l){ return l.kind !== 'trees'; }); }
  var DEFAULT_LOCATION = { id:null, name:'ללא אזור', lightLevel:'indoor' };
  function getLocation(id){
    for (var i=0;i<state.locations.length;i++) if (state.locations[i].id===id) return state.locations[i];
    return DEFAULT_LOCATION;
  }
  function findPlant(id){ return state.plants.find(function(x){ return x.id===id; }); }

  /* ---------- per-viewer view state (survives the reload after each save) ---------- */
  function lsGet(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function lsSet(k,v){ try { localStorage.setItem(k,v); } catch(e){} }
  var activeTab = lsGet('gh-tab') || 'today';
  if (['today','calendar','doctor'].indexOf(activeTab) === -1) activeTab = 'today';
  var selectedArea = lsGet('gh-area');
  function validArea(a){ return a && state.locations.some(function(l){ return l.id===a; }); }
  if (!validArea(selectedArea)) selectedArea = (potLocations()[0] || state.locations[0]).id;
  function setArea(a){ selectedArea = a; lsSet('gh-area', a); }
  function plantsInArea(areaId){ return state.plants.filter(function(p){ return p.locationId===areaId; }); }

  var pendingDelete = null;

  function logEvent(plantId, kind, date){
    state.log.push({ plantId: plantId, kind: kind, date: date });
    if (state.log.length > LOG_CAP) state.log = state.log.slice(state.log.length - LOG_CAP);
  }

  /* ---------- device services (this build runs outside claude.ai) ---------- */
  var identifyDisabled = false;
  var API_KEY_KEY = 'gardenHome_apiKey';
  var MODEL = 'claude-opus-5';
  function getApiKey(){ try { return (localStorage.getItem(API_KEY_KEY) || '').trim(); } catch(e){ return ''; } }

  // Photos live in IndexedDB on this phone; object URLs are cached so rendering stays synchronous.
  var photoUrls = {};
  var idbPromise = null;
  function idb(){
    if (idbPromise) return idbPromise;
    idbPromise = new Promise(function(resolve, reject){
      var req = indexedDB.open('gardenHome', 1);
      req.onupgradeneeded = function(){ req.result.createObjectStore('photos'); };
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
    return idbPromise;
  }
  function idbTx(mode, fn){
    return idb().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction('photos', mode);
        var out = fn(tx.objectStore('photos'));
        tx.oncomplete = function(){ resolve(out && out.result !== undefined ? out.result : out); };
        tx.onerror = function(){ reject(tx.error); };
      });
    });
  }
  function putPhoto(id, blob){ return idbTx('readwrite', function(st){ st.put(blob, id); }).then(function(){ photoUrls[id] = URL.createObjectURL(blob); return id; }); }
  function loadAllPhotos(){
    return idb().then(function(db){
      return new Promise(function(resolve){
        var st = db.transaction('photos', 'readonly').objectStore('photos');
        var req = st.openCursor();
        req.onsuccess = function(){
          var c = req.result;
          if (c){ photoUrls[c.key] = URL.createObjectURL(c.value); c.continue(); } else resolve();
        };
        req.onerror = function(){ resolve(); };
      });
    }).catch(function(){});
  }
  function photoSrc(id){ return photoUrls[id] || ''; }
  function blobToDataUrl(blob){
    return new Promise(function(resolve){ var r = new FileReader(); r.onload = function(){ resolve(r.result); }; r.onerror = function(){ resolve(null); }; r.readAsDataURL(blob); });
  }
  function dataUrlToBlob(u){
    var parts = String(u).split(','), mime = (parts[0].match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
    var bin = atob(parts[1] || ''), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  // Claude (identification + health check) with the viewer's own API key, straight from the phone.
  var SCHEMAS = {
    species: { type:'object', additionalProperties:false,
      required:['species','category','wateringDays','waterAmount','note'],
      properties:{ species:{type:'string'}, category:{type:'string', enum:['houseplant','succulent','tree']},
        wateringDays:{type:'integer'}, waterAmount:{type:'string'}, note:{type:'string'} } },
    health: { type:'object', additionalProperties:false,
      required:['name','category','healthCode','healthLabel','findings','advice'],
      properties:{ name:{type:'string'}, category:{type:'string', enum:['houseplant','succulent','tree']},
        healthCode:{type:'string', enum:['ok','watch','treat','urgent']}, healthLabel:{type:'string'},
        findings:{type:'string'}, advice:{type:'string'} } }
  };
  function aiError(code){ var e = new Error(code); e.code = code; return e; }
  function askClaude(prompt, imageBlob, schema){
    var key = getApiKey();
    if (!key) return Promise.reject(aiError('no_key'));
    if (!window.AnthropicSDK) return Promise.reject(aiError('no_sdk'));
    var client = new window.AnthropicSDK({ apiKey: key, dangerouslyAllowBrowser: true });
    return blobToDataUrl(imageBlob).then(function(dataUrl){
      if (!dataUrl) throw aiError('image_rejected');
      return client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { format: { type: 'json_schema', schema: schema } },
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: dataUrl.split(',')[1] } },
          { type: 'text', text: prompt }
        ]}]
      });
    }).then(function(res){
      if (res.stop_reason === 'refusal') throw aiError('refused');
      var text = (res.content || []).filter(function(b){ return b.type === 'text'; }).map(function(b){ return b.text; }).join('');
      try { return JSON.parse(text); } catch(e){ throw aiError('invalid_json'); }
    }).catch(function(e){
      if (e && e.code && !e.status) throw e;
      var SDK = window.AnthropicSDK;
      if (SDK && e instanceof SDK.AuthenticationError) throw aiError('bad_key');
      if (SDK && e instanceof SDK.PermissionDeniedError) throw aiError('bad_key');
      if (SDK && e instanceof SDK.RateLimitError) throw aiError('rate_limited');
      if (SDK && e instanceof SDK.APIConnectionError) throw aiError('offline');
      if (SDK && e instanceof SDK.BadRequestError && /credit/i.test(e.message || '')) throw aiError('no_credit');
      if (SDK && e instanceof SDK.APIError) throw aiError('upstream_error');
      throw aiError('unknown');
    });
  }
  // Same shape the page already calls: limits() + json(prompt, {images}).
  var sampleCap = {
    limits: function(){ return Promise.resolve({ images: true }); },
    json: function(prompt, opts){
      return askClaude(prompt, opts.images, prompt === SPECIES_PROMPT ? SCHEMAS.species : SCHEMAS.health);
    }
  };
  var sampleCapPromise = Promise.resolve(sampleCap);
  function downloadFile(filename, blob){
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
  }
  function initCapability(){}
  // Phone photos are large and often HEIC; shrink to a JPEG the store accepts.
  function prepImage(file){
    return new Promise(function(resolve){
      if (!file || !/^image\//.test(file.type || 'image/')) { resolve(file); return; }
      var url = URL.createObjectURL(file);
      var img = new Image();
      var done = function(out){ URL.revokeObjectURL(url); resolve(out || file); };
      img.onload = function(){
        try{
          var max = 1280, w = img.naturalWidth, h = img.naturalHeight;
          var k = Math.min(1, max / Math.max(w, h));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(w*k)); c.height = Math.max(1, Math.round(h*k));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(function(b){ done(b); }, 'image/jpeg', 0.82);
        }catch(e){ done(null); }
      };
      img.onerror = function(){ done(null); };
      img.src = url;
    });
  }
  var lastUploadError = null;
  function uploadPhoto(file){
    lastUploadError = null;
    if (!file) return Promise.resolve(null);
    return prepImage(file).then(function(blob){
      var id = 'ph' + Date.now() + Math.floor(Math.random()*1000);
      return putPhoto(id, blob).catch(function(e){ lastUploadError = 'storage'; return null; });
    });
  }

  var IDENTIFY_PROMPT =
    'אתה מומחה גינון: זיהוי צמחים, מחלות, מזיקים ומחסורים תזונתיים מתמונה, בהתאמה לאקלים ישראל.\n' +
    'הסתכל בתמונה המצורפת של צמח, זהה אותו, ובדוק אם יש סימני מחלה, מזיק או מחסור תזונתי גלויים.\n' +
    'החזר אך ורק אובייקט JSON אחד, ללא שום טקסט נוסף, בפורמט המדויק:\n' +
    '{"name": "שם הצמח בעברית, קצר וברור", ' +
    '"category": "houseplant" או "succulent" או "tree", ' +
    '"healthCode": "ok" או "watch" או "treat" או "urgent", ' +
    '"healthLabel": "תווית קצרה בעברית (2-4 מילים) למצב הבריאותי, למשל תקין / חשד לקימחון / כלורוזת ברזל", ' +
    '"findings": "משפט קצר אחד המתאר מה נראה בתמונה שמצדיק את הקוד, ריק אם healthCode=ok", ' +
    '"advice": "עצה מעשית קצרה אחת לטיפול, ריק אם healthCode=ok"}\n' +
    'הנחיות ל-"category": "tree" לעץ פרי הנטוע באדמה; "succulent" רק לסוקולנטים וקקטוסים; "houseplant" לכל צמח עלים, פורח, שיח או עץ בעציץ.\n' +
    'הנחיות ל-"healthCode": "ok" כשאין סימן חשוד; "watch" לסימן קל אחד לעקוב אחריו; "treat" לבעיה ברורה (מחלה/מזיק/מחסור מזוהים) הדורשת טיפול; "urgent" רק למצב חמור (התייבשות קיצונית/ריקבון שורשים/קמילה כללית).\n' +
    'אם אינך בטוח בזיהוי המדויק של המין או המצב, בחר את הסביר ביותר לפי מראה הצמח ואל תוסיף הערות מעבר לשדות המבוקשים.';
  var IDENTIFY_STOP_CODES_UNUSED = {
    not_granted:1, sampling_disabled:1, not_declared:1,
    capability_disabled:1, capability_removed:1, images_unavailable:1
  };
  var identifyDisabledReason = null;
  var IDENTIFY_REASON_MSG = {
    'no_key': 'כדי לזהות צמחים צריך להגדיר מפתח Claude: ⚙ הגדרות במסך הראשי.',
    'no-images': 'תצוגה זו לא תומכת בשליחת תמונות לזיהוי (רק טקסט) — נסו לפתוח את האפליקציה בקישור הישיר בדפדפן.',
    'not_granted': 'לא אישרתם שימוש ב-Claude עבור האפליקציה הזו. רעננו את הדף ואשרו כשתופיע הבקשה.',
    'sampling_disabled': 'זיהוי AI לא זמין לחשבון/ארגון הזה.',
    'not_declared': 'הגרסה הפתוחה כרגע לא כוללת את יכולת הזיהוי — רעננו לגרסה העדכנית.',
    'capability_disabled': 'זיהוי AI לא זמין בתצוגה הזו כרגע.',
    'capability_removed': 'זיהוי AI לא נתמך בגרסת האפליקציה שפותחת אותה.',
    'other': 'זיהוי אוטומטי לא זמין כרגע.'
  };
  function identifyUnavailableMsg(){ return IDENTIFY_REASON_MSG[identifyDisabledReason] || IDENTIFY_REASON_MSG.other; }
  var HEALTH_CODES = { ok:1, watch:1, treat:1, urgent:1 };
  var lastIdentifyError = null;
  var IDENTIFY_FAIL_MSG = {
    no_key: 'כדי לזהות צמחים צריך להגדיר מפתח Claude: ⚙ הגדרות במסך הראשי.',
    bad_key: 'המפתח לא התקבל. בדקו אותו ב-⚙ הגדרות.',
    no_credit: 'נגמר הקרדיט בחשבון Claude. אפשר להטעין ב-console.anthropic.com.',
    offline: 'אין חיבור לאינטרנט. זיהוי צריך רשת — נסו שוב כשיש קליטה.',
    rate_limited: 'הגעתם למגבלת השימוש ב-Claude. נסו שוב בעוד כמה דקות.',
    image_rejected: 'התמונה לא התקבלה (סוג או גודל). נסו לצלם שוב.',
    invalid_json: 'לא הצלחתי לקרוא את תשובת הזיהוי. נסו תמונה קרובה וברורה של העלים.',
    empty_completion: 'לא התקבלה תשובה. נסו תמונה קרובה וברורה של הצמח.',
    refused: 'הזיהוי סורב לתמונה הזו. נסו תמונה אחרת.',
    session_expired: 'צריך להתחבר מחדש ל-Claude ואז לנסות שוב.',
    upstream_error: 'תקלה זמנית בשירות הזיהוי. נסו שוב.',
    bad_data: 'התשובה מהזיהוי לא הייתה במבנה הצפוי. נסו שוב.',
    no_capability: 'יכולת הזיהוי לא נטענה. רעננו את הדף ונסו שוב.'
  };
  function identifyFailMsg(){
    var c = lastIdentifyError && lastIdentifyError.code;
    return (IDENTIFY_FAIL_MSG[c] || 'הזיהוי נכשל.') + (c ? ' (' + c + ')' : '');
  }
  function runDiagnosis(file){
    lastIdentifyError = null;
    if (identifyDisabled || !file) return Promise.resolve(null);
    return (sampleCapPromise || Promise.resolve(sampleCap)).then(function(cap){
      if (!cap){ lastIdentifyError = { code: 'no_capability' }; return null; }
      return cap.limits().then(function(limits){
        if (!limits || !limits.images){ identifyDisabled = true; identifyDisabledReason = 'no-images'; return null; }
        return prepImage(file).then(function(img){ return cap.json(IDENTIFY_PROMPT, { images: img, modelTier: 'default', cache: false }); });
      });
    }).then(function(data){
      if (!data || typeof data !== 'object'){ if (!lastIdentifyError) lastIdentifyError = { code: 'bad_data' }; return null; }
      var category = TYPE_LABEL[data.category] ? data.category : null;
      var healthCode = HEALTH_CODES[data.healthCode] ? data.healthCode : null;
      return {
        name: typeof data.name === 'string' ? data.name : null,
        category: category,
        healthCode: healthCode,
        healthLabel: typeof data.healthLabel === 'string' ? data.healthLabel : '',
        findings: typeof data.findings === 'string' ? data.findings : '',
        advice: typeof data.advice === 'string' ? data.advice : ''
      };
    }).catch(function(e){
      var code = e && e.code;
      lastIdentifyError = { code: code || 'unknown' };
      if (false){ identifyDisabled = true; identifyDisabledReason = code; }
      return null;
    });
  }
  var SPECIES_PROMPT =
    'זו תמונה של צמח בעציץ או עץ בגינה בישראל. זהה את סוג/מין הצמח בצורה הכי מדויקת שאפשר (כולל שם לטיני אם ידוע), וקבע קצב וכמות השקיה בהתאם לגודל העציץ שבתמונה. ' +
    'החזר אך ורק JSON בפורמט הבא, בלי שום טקסט נוסף: {"species": "שם הסוג בעברית (ולטינית בסוגריים אם ידוע)", "category": "houseplant" או "succulent" או "tree", ' +
    '"wateringDays": מספר_ימים_בין_השקיות_בממוצע, "waterAmount": "כמות מים להשקיה אחת, קצר, למשל: כוס (250 מ״ל)", "note": "משפט קצר אחד עם הדגש החשוב ביותר לטיפול במין הזה"}';
  function runIdentify(file){
    lastIdentifyError = null;
    if (identifyDisabled || !file) return Promise.resolve(null);
    return (sampleCapPromise || Promise.resolve(sampleCap)).then(function(cap){
      if (!cap){ lastIdentifyError = { code: 'no_capability' }; return null; }
      return cap.limits().then(function(limits){
        if (!limits || !limits.images){ identifyDisabled = true; identifyDisabledReason = 'no-images'; return null; }
        return prepImage(file).then(function(img){ return cap.json(SPECIES_PROMPT, { images: img, modelTier: 'default', cache: false }); });
      });
    }).then(function(d){
      if (!d || typeof d !== 'object') return null;
      var n = parseInt(d.wateringDays, 10);
      return {
        species: typeof d.species === 'string' ? d.species.trim() : '',
        category: TYPE_LABEL[d.category] ? d.category : null,
        wateringDays: n > 0 ? Math.min(n, 60) : null,
        waterAmount: typeof d.waterAmount === 'string' ? d.waterAmount.trim() : '',
        note: typeof d.note === 'string' ? d.note.trim() : ''
      };
    }).catch(function(e){
      var code = e && e.code;
      lastIdentifyError = { code: code || 'unknown' };
      if (false){ identifyDisabled = true; identifyDisabledReason = code; }
      return null;
    });
  }
  function identifyPlant(file){
    var noteEl = document.getElementById('identifyNote');
    if (!file) return;
    if (identifyDisabled){ if (noteEl) noteEl.textContent = identifyUnavailableMsg(); return; }
    if (noteEl){ noteEl.style.color = ''; noteEl.textContent = 'מזהה את הצמח… (יכול לקחת עד דקה, אפשר להמתין)'; }
    runDiagnosis(file).then(function(data){
      if (!data){
        if (noteEl){ noteEl.style.color = 'var(--terracotta)'; noteEl.textContent = identifyDisabled ? identifyUnavailableMsg() : identifyFailMsg(); }
        return;
      }
      draft.diagnosis = data;
      var nameInput = document.getElementById('plantName');
      if (nameInput && !nameInput.value.trim() && data.name) nameInput.value = data.name;
      if (data.category) setDraftType(data.category);
      var bits = [];
      if (data.name) bits.push('זוהה: ' + data.name);
      if (data.healthCode && data.healthCode !== 'ok') bits.push(HEALTH_LABELS[data.healthCode] + (data.healthLabel ? ' — ' + data.healthLabel : ''));
      if (noteEl) noteEl.textContent = bits.length ? (bits.join(' · ') + ' (ניתן לתקן)') : '';
    });
  }
  var HEALTH_LABELS = { ok:'תקין', watch:'🟡 למעקב', treat:'🟠 דורש טיפול', urgent:'🔴 דחוף' };
  var HEALTH_DOT_VAR = { watch:'var(--gold)', treat:'var(--terracotta)', urgent:'var(--danger)' };

  /* ---------- persistence: this phone ---------- */
  function saveState(){
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
    catch(e){ toast('השמירה נכשלה — הזיכרון בדפדפן מלא. ייצאו גיבוי.', 5000); }
  }

  /* ---------- toast + undo ---------- */
  var toastTimer = null;
  function toast(msg, ms){
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ el.classList.remove('show'); }, ms || 1800);
  }
  var lastUndo = null; // { changes:[{id, field, prev}], logAdded, msg }
  function showUndo(msg, undo){
    lastUndo = undo;
    hideUndo(true);
    var el = document.createElement('div');
    el.className = 'undo-bar';
    el.id = 'undoBar';
    el.innerHTML = '<span></span><button type="button" id="undoBtn">בטל</button>';
    el.firstChild.textContent = msg;
    document.getElementById('app').appendChild(el);
    clearTimeout(showUndo.t);
    showUndo.t = setTimeout(function(){ hideUndo(); }, 6000);
  }
  function hideUndo(keepData){
    var el = document.getElementById('undoBar');
    if (el) el.parentNode.removeChild(el);
    if (!keepData) lastUndo = null;
  }
  function applyUndo(){
    if (!lastUndo) return;
    if (lastUndo.snapshot){
      state.locations = lastUndo.snapshot.locations;
      state.plants = lastUndo.snapshot.plants;
      state.log = lastUndo.snapshot.log;
      lastUndo.changes = [];
    }
    lastUndo.changes.forEach(function(c){
      var p = findPlant(c.id);
      if (p) p[c.field] = c.prev;
    });
    if (lastUndo.logAdded) state.log.splice(state.log.length - lastUndo.logAdded, lastUndo.logAdded);
    if (lastUndo.startedTimer) stopWaterTimer(true);
    var refreshAreas = !!lastUndo.snapshot;
    lastUndo = null;
    hideUndo();
    saveState();
    renderAll();
    if (refreshAreas && document.getElementById('sheetBackdrop')){ areaSheet = { mode:'list', id:null, back:'list' }; renderAreaSheet(); }
    toast('בוטל');
  }

  /* ---------- double-watering timer (5 min, then water again) ---------- */
  var WATER_TIMER_MS = 5 * 60 * 1000;
  var activeTimer = null;
  function makeBeeper(){
    try{
      var Ctx = window.AudioContext || window.webkitAudioContext;
      return Ctx ? new Ctx() : null;
    }catch(e){ return null; }
  }
  function beep(ctx){
    if (!ctx) return;
    try{
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      var t = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.start(t); o.stop(t + 0.42);
    }catch(e){}
  }
  function clearTimerBanner(){
    var el = document.getElementById('timerBanner');
    if (el) el.parentNode.removeChild(el);
  }
  function renderTimerBanner(){
    clearTimerBanner();
    if (!activeTimer) return;
    var remaining = activeTimer.endTime - Date.now();
    var el = document.createElement('div');
    el.id = 'timerBanner';
    el.className = 'timer-banner' + (remaining <= 0 ? ' due' : '');
    if (remaining <= 0){
      el.innerHTML = '<span class="tb-text">💧 עכשיו! השקיה שנייה — ' + escapeHtml(activeTimer.label) + '</span>' +
        '<span class="tb-actions"><button type="button" class="tb-confirm" id="timerDone">✓ בוצע</button><button type="button" id="timerCancel" aria-label="ביטול">✕</button></span>';
    } else {
      var m = Math.floor(remaining/60000), s = Math.floor((remaining%60000)/1000);
      el.innerHTML = '<span class="tb-text">⏱ השקיה שנייה בעוד ' + m + ':' + (s<10?'0':'') + s + ' — ' + escapeHtml(activeTimer.label) + '</span>' +
        '<span class="tb-actions"><button type="button" id="timerCancel" aria-label="ביטול">✕</button></span>';
    }
    document.getElementById('app').appendChild(el);
  }
  function activateTimer(label, endTime, withBeep){
    if (activeTimer && activeTimer.interval) clearInterval(activeTimer.interval);
    if (activeTimer && activeTimer.ctx) { try{ activeTimer.ctx.close(); }catch(e){} }
    var ctx = withBeep ? makeBeeper() : null;
    activeTimer = { label: label, endTime: endTime, ctx: ctx, notified: (Date.now() >= endTime), interval: null };
    activeTimer.interval = setInterval(function(){
      if (!activeTimer) return;
      if (Date.now() >= activeTimer.endTime && !activeTimer.notified){
        activeTimer.notified = true;
        if (navigator.vibrate) { try{ navigator.vibrate([300,150,300,150,300]); }catch(e){} }
        beep(activeTimer.ctx);
        setTimeout(function(){ beep(activeTimer && activeTimer.ctx); }, 450);
        setTimeout(function(){ beep(activeTimer && activeTimer.ctx); }, 900);
      }
      renderTimerBanner();
    }, 1000);
    renderTimerBanner();
  }
  function resumeWaterTimerFromState(){
    var pt = state.pendingTimer;
    if (!pt || !pt.endTime) return;
    if (Date.now() - pt.endTime > 2*60*60*1000){ delete state.pendingTimer; return; }
    activateTimer(pt.label, pt.endTime, false);
  }
  function armLocationTimer(locationId){
    var loc = getLocation(locationId);
    var pt = state.pendingTimer;
    if (pt && pt.locationId === locationId && pt.endTime > Date.now()){
      return { label: pt.label, endTime: pt.endTime, fresh:false };
    }
    var endTime = Date.now() + WATER_TIMER_MS;
    state.pendingTimer = { label: loc.name, endTime: endTime, locationId: locationId };
    return { label: loc.name, endTime: endTime, fresh:true };
  }
  function stopWaterTimer(skipSave){
    if (activeTimer && activeTimer.interval) clearInterval(activeTimer.interval);
    if (activeTimer && activeTimer.ctx) { try{ activeTimer.ctx.close(); }catch(e){} }
    activeTimer = null;
    clearTimerBanner();
    if (state.pendingTimer){
      delete state.pendingTimer;
      if (!skipSave) saveState();
    }
  }

  /* ---------- rendering: area windows ---------- */
  function areaDueCount(areaId){
    return plantsInArea(areaId).filter(function(p){ return isDue(waterDue(p)) || isDue(fertDue(p)) || isDue(ironDue(p)) || isDue(pruneDue(p)); }).length;
  }
  function areaChipHtml(loc){
    var count = plantsInArea(loc.id).length;
    var due = areaDueCount(loc.id);
    var isTrees = loc.kind === 'trees';
    return '<button type="button" class="area-chip' + (isTrees?' trees':'') + (loc.id===selectedArea?' active':'') + '" data-area="' + loc.id + '" aria-pressed="' + (loc.id===selectedArea) + '">' +
      (isTrees ? '🌳 ' : '') + escapeHtml(loc.name) + ' <span class="n">' + count + '</span>' +
      (due ? '<span class="due-n" title="ממתינים לטיפול">' + due + '</span>' : '') +
    '</button>';
  }
  function renderAreaBar(){
    var bar = document.getElementById('areaBar');
    var trees = state.locations.filter(function(l){ return l.kind==='trees'; });
    bar.innerHTML = trees.map(areaChipHtml).join('') +
      (trees.length ? '<span class="area-sep" aria-hidden="true"></span>' : '') +
      potLocations().map(areaChipHtml).join('');
    bar.hidden = true; // the week view was removed; the area bar stays hidden
    // Scroll only the chip row sideways (never the page) so the active area is visible.
    var active = bar.querySelector('.area-chip.active');
    if (active && !bar.hidden){
      var br = bar.getBoundingClientRect(), ar = active.getBoundingClientRect();
      if (ar.left < br.left || ar.right > br.right){
        try { bar.scrollBy({ left: (ar.left - br.left) - (br.width - ar.width) / 2 }); } catch(e){}
      }
    }
  }

  /* ---------- rendering: today (sections → plant list → plant popup) ---------- */
  var openArea = lsGet('gh-open');          // null = the sections grid
  if (openArea && !validArea(openArea)) openArea = null;
  var openPlantId = lsGet('gh-plant');      // plant whose popup is open
  var popupConfirmDelete = false;
  function setOpenArea(a){ openArea = a; lsSet('gh-open', a || ''); if (a) setArea(a); }

  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function relDay(ds){
    if (!ds) return 'לא סומן';
    var n = diffDays(today(), parse(ds));
    if (n === 0) return 'היום';
    if (n === 1) return 'אתמול';
    if (n > 1) return 'לפני ' + n + ' ימים';
    var d = parse(ds); return d.getDate() + '/' + (d.getMonth()+1);
  }
  function waterText(w){
    if (w.na) return 'השקיה באוטומציה';
    if (w.unknown) return 'טרם סומנה השקיה';
    if (w.daysUntil < 0) return 'להשקות (באיחור ' + (-w.daysUntil) + ' ימים)';
    if (w.daysUntil === 0) return 'להשקות היום';
    return 'השקיה בעוד ' + w.daysUntil + ' ימים';
  }
  function fertText(f){
    if (f.tree){
      if (f.off) return 'הדישון הבא ב' + MONTH_NAMES[f.next-1];
      if (f.daysUntil <= 0) return 'לדשן עכשיו';
      return 'דישון בעוד ' + f.daysUntil + ' ימים';
    }
    if (f.off) return 'לא מדשנים בחורף';
    if (f.unknown) return 'טרם סומן דישון';
    if (f.daysUntil <= 0) return 'לדשן עכשיו';
    return 'דישון בעוד ' + f.daysUntil + ' ימים';
  }
  function ironText(r){
    if (r.off) return 'לא נותנים ברזל בחורף';
    if (r.unknown) return 'טרם סומן ברזל';
    if (r.daysUntil <= 0) return 'לתת ברזל עכשיו';
    return 'ברזל בעוד ' + r.daysUntil + ' ימים';
  }
  function thumbHtml(p, cls){
    return '<span class="' + cls + '">' + (p.photoId ? '<img src="' + photoSrc(p.photoId) + '" alt="">' : plantIcon(p)) + '</span>';
  }

  // Bulk actions touch only plants that are due or not yet recorded.
  function bulkTargets(areaId, kind){
    return plantsInArea(areaId).filter(function(p){
      var info = careDue(p, kind);
      return !info.na && !info.off && (info.unknown || info.daysUntil <= 0);
    });
  }

  // How many plants in a list are due, per care kind.
  function dueByKind(list){
    var c = { water:0, fert:0, iron:0, prune:0 };
    list.forEach(function(p){
      if (isDue(waterDue(p))) c.water++;
      if (isDue(fertDue(p))) c.fert++;
      if (isDue(ironDue(p))) c.iron++;
      if (isDue(pruneDue(p))) c.prune++;
    });
    return c;
  }
  var KIND_ICON = { water:'💧', fert:'🌱', iron:'🔩', prune:'✂️' };
  function dueChipsHtml(c){
    return ['water','fert','iron','prune'].filter(function(k){ return c[k]; }).map(function(k){
      return '<span class="due-chip ' + k + '">' + KIND_ICON[k] + ' ' + c[k] + '</span>';
    }).join('');
  }
  function todayStripHtml(){
    var pots = potLocations(), trees = plantsInArea(TREES_LOC);
    var waterAreas = pots.filter(function(l){ return plantsInArea(l.id).some(function(p){ return isDue(waterDue(p)); }); }).length;
    var fertAreas = pots.filter(function(l){ return plantsInArea(l.id).some(function(p){ return isDue(fertDue(p)); }); }).length;
    var tc = dueByKind(trees);
    var items = [];
    if (waterAreas) items.push('<span class="ts-item water"><b>💧 ' + waterAreas + '</b> ' + (waterAreas === 1 ? 'אזור' : 'אזורים') + ' להשקות</span>');
    if (fertAreas || tc.fert) items.push('<span class="ts-item fert"><b>🌱 ' + (fertAreas + tc.fert) + '</b> לדשן' + (fertAreas && tc.fert ? ' (' + fertAreas + (fertAreas === 1 ? ' אזור, ' : ' אזורים, ') + tc.fert + (tc.fert === 1 ? ' עץ)' : ' עצים)') : tc.fert ? ' (עצים)' : ' (אזורים)') + '</span>');
    if (tc.iron) items.push('<span class="ts-item iron"><b>🔩 ' + tc.iron + '</b> ' + (tc.iron === 1 ? 'עץ' : 'עצים') + ' לברזל</span>');
    if (tc.prune) items.push('<span class="ts-item prune"><b>✂️ ' + tc.prune + '</b> ' + (tc.prune === 1 ? 'עץ' : 'עצים') + ' לגזום</span>');
    var notes = weatherNotes().map(function(n){ return '<div class="wx-note ' + n.cls + '">' + escapeHtml(n.text) + '</div>'; }).join('');
    var extra = (notes ? '<div class="wx-notes">' + notes + '</div>' : '') + seasonCardHtml() + backupReminderHtml();
    if (!items.length) return '<div class="today-strip calm"><span class="ts-title">היום</span><span class="ts-none">✓ אין משימות. הגינה מטופלת.</span></div>' + extra;
    return '<button type="button" class="today-strip" id="todayStrip"><span class="ts-title">מה עושים היום</span><span class="ts-items">' + items.join('') + '</span><span class="ts-go">לרשימה המלאה ‹</span></button>' + extra;
  }
  function sectionTileHtml(loc){
    var list = plantsInArea(loc.id);
    var due = areaDueCount(loc.id);
    var isTrees = loc.kind === 'trees';
    var unknown = isTrees ? 0 : list.filter(function(p){ return !p.lastWatered; }).length;
    var status = due ? '<span class="sec-status due">' + dueChipsHtml(dueByKind(list)) + '</span>'
      : unknown ? '<span class="sec-status">עוד לא סומנה השקיה</span>'
      : list.length ? '<span class="sec-status ok">✓ הכל מטופל</span>' : '<span class="sec-status">ריק</span>';
    return '<button type="button" class="sec-tile' + (isTrees?' trees':'') + (due?' has-due':'') + '" data-open-area="' + loc.id + '">' +
      '<span class="sec-top"><span class="sec-ic" aria-hidden="true">' + (isTrees ? '🌳' : (LIGHT_ICON[loc.lightLevel]||'🪴')) + '</span>' +
      '<span class="sec-count">' + list.length + ' ' + (isTrees ? 'עצים' : 'עציצים') + '</span></span>' +
      '<span class="sec-name">' + escapeHtml(loc.name) + '</span>' +
      status +
    '</button>';
  }
  // Gardening days: Tuesday and Friday. Everything due before the next gardening day
  // is done on the one before it, split into garden pots, house pots and trees.
  var WORK_DAYS = [2, 5]; // Date.getDay(): 2 = Tuesday, 5 = Friday
  var WORK_DAY_NAMES = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  function nextWorkDays(n){
    var out = [], d = today(), guard = 0;
    while (out.length < n && guard++ < 30){ if (WORK_DAYS.indexOf(d.getDay()) !== -1) out.push(d); d = addDays(d, 1); }
    return out;
  }
  function isHouseArea(loc){ return loc && loc.lightLevel === 'indoor'; }
  function weekSummaryHtml(){
    var days = nextWorkDays(3), t = today();
    var buckets = [0, 1].map(function(){ return { water:[], fert:[], iron:[], prune:[] }; });
    function put(b, kind, id){ if (buckets[b][kind].indexOf(id) === -1) buckets[b][kind].push(id); }
    var plan = calendarPlan(t, addDays(days[2], -1));
    Object.keys(plan).forEach(function(ds){
      var b = parse(ds) < days[1] ? 0 : 1;
      ['water','fert','iron','prune'].forEach(function(k){ plan[ds][k].forEach(function(id){ put(b, k, id); }); });
    });
    state.plants.forEach(function(p){ if (p.type !== 'tree' && !p.lastWatered) put(0, 'water', p.id); });
    function potLine(ic, label, water, fert){
      if (!water.length && !fert.length) return '';
      var chips = (water.length ? '<span class="wk-chip water">💧 ' + water.length + ' להשקות</span>' : '') +
        (fert.length ? '<span class="wk-chip fert">🌱 ' + fert.length + ' לדשן</span>' : '');
      var groups = areasOf(water.concat(fert.filter(function(id){ return water.indexOf(id) === -1; })));
      var list = groups.map(function(g){
        return '<div class="wk-area"><button type="button" class="wk-area-btn" data-open-area="' + g.loc.id + '">' + escapeHtml(g.loc.name) + ' ‹</button>' +
          '<div class="wk-plants">' + g.ids.map(function(id){
            var p = findPlant(id);
            return '<div class="wk-p"><span>' + escapeHtml(p.name) + '</span><span class="wk-p-ic">' + (water.indexOf(id) !== -1 ? '💧' : '') + (fert.indexOf(id) !== -1 ? '🌱' : '') + '</span></div>';
          }).join('') + '</div></div>';
      }).join('');
      return '<details class="wk-group"><summary><span class="wk-glabel">' + ic + ' ' + label + '</span><span class="wk-chips">' + chips + '</span></summary>' + list + '</details>';
    }
    function card(i){
      var d = days[i], ds = fmt(d), set = buckets[i];
      var isPot = function(id){ var p = findPlant(id); return p && p.type !== 'tree'; };
      var house = function(id){ var p = findPlant(id); return p && isHouseArea(getLocation(p.locationId)); };
      var gW = set.water.filter(function(id){ return isPot(id) && !house(id); }), hW = set.water.filter(function(id){ return isPot(id) && house(id); });
      var gF = set.fert.filter(function(id){ return isPot(id) && !house(id); }), hF = set.fert.filter(function(id){ return isPot(id) && house(id); });
      var tF = treeIds(set.fert), tI = set.iron, tP = set.prune;
      var treeChips = (tF.length ? '<span class="wk-chip fert">🌱 ' + tF.length + ' לדשן</span>' : '') +
        (tI.length ? '<span class="wk-chip iron">🔩 ' + tI.length + ' ברזל</span>' : '') +
        (tP.length ? '<span class="wk-chip prune">✂️ ' + tP.length + ' לגזום</span>' : '');
      var treeIdsAll = []; tF.concat(tI, tP).forEach(function(id){ if (treeIdsAll.indexOf(id) === -1) treeIdsAll.push(id); });
      var treeLine = treeChips ? '<details class="wk-group"><summary><span class="wk-glabel">🌳 עצים</span><span class="wk-chips">' + treeChips + '</span></summary>' +
        '<div class="wk-plants">' + treeIdsAll.map(function(id){ var p = findPlant(id); return '<div class="wk-p"><span>' + escapeHtml(p.name) + '</span><span class="wk-p-ic">' + (tF.indexOf(id) !== -1 ? '🌱' : '') + (tI.indexOf(id) !== -1 ? '🔩' : '') + (tP.indexOf(id) !== -1 ? '✂️' : '') + '</span></div>'; }).join('') + '</div></details>' : '';
      var body = potLine('🪴', 'עציצי גינה', gW, gF) + potLine('🏠', 'עציצי בית', hW, hF) + treeLine;
      var wx = weatherDay(ds), wxTxt = '';
      if (wx){
        if (wx.tmin != null && wx.tmin <= FROST_C) wxTxt += ' ❄️ קרה';
        if (wx.tmax != null && wx.tmax >= HEAT_C) wxTxt += ' 🔥 חם';
        if (wx.rain != null && wx.rain >= RAIN_WATERS_MM) wxTxt += ' 🌧 גשם';
      }
      var when = diffDays(d, t) === 0 ? 'היום' : diffDays(d, t) === 1 ? 'מחר' : 'בעוד ' + diffDays(d, t) + ' ימים';
      return '<div class="wd-card' + (i === 0 ? ' next' : '') + '"><div class="wd-head"><span class="wd-day">יום ' + WORK_DAY_NAMES[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth()+1) + '</span>' +
        '<span class="wd-when">' + when + (wxTxt ? ' ·' + wxTxt : '') + '</span></div>' +
        (body || '<div class="wk-free">✓ אין משימות ליום הזה</div>') + '</div>';
    }
    return '<div class="week-box"><div class="wk-title">ימי העבודה בגינה · שלישי ושישי</div>' + card(0) + card(1) +
      '<div class="wk-legend">כל מה שמגיע לפני יום העבודה הבא נכנס ליום העבודה שלפניו. לחיצה על קבוצה פותחת את רשימת הצמחים.</div></div>';
  }
  function renderSections(){
    var trees = state.locations.filter(function(l){ return l.kind==='trees'; });
    return todayStripHtml() + weekSummaryHtml() +
      '<div class="sec-grid">' + trees.map(sectionTileHtml).join('') + potLocations().map(sectionTileHtml).join('') + '</div>' +
      '<p class="app-version">גרסה ' + APP_VERSION + '</p>';
  }
  function potRowHtml(p){
    var w = waterDue(p), f = fertDue(p), r = ironDue(p), g = pruneDue(p);
    var dot = isDue(w) ? 'due' : isDue(f) ? 'fert' : isDue(r) ? 'iron' : isDue(g) ? 'prune' : ((w.unknown && !w.na) ? '' : 'ok');
    var sub;
    if (p.type === 'tree'){
      var todo = [];
      if (isDue(f)) todo.push('לדשן');
      if (isDue(r)) todo.push('ברזל');
      if (isDue(g)) todo.push('עונת גיזום');
      var nextBits = [];
      if (f.next) nextBits.push('דישון ב' + MONTH_NAMES[f.next-1]);
      else if (f.daysUntil > 0) nextBits.push('דישון בעוד ' + f.daysUntil + ' ימים');
      if (g.next) nextBits.push('גיזום ב' + MONTH_NAMES[g.next-1]);
      sub = todo.length ? todo.join(' · ') : (nextBits.length ? nextBits.join(' · ') : '✓ אין משימות כרגע');
    } else {
      var needW = !w.na && (w.unknown || w.daysUntil <= 0);
      var nextTxt = '';
      if (!needW && p.lastWatered){ var nd = addDays(today(), w.daysUntil); nextTxt = 'לא היום · השקיה ביום ' + DAY_SHORT[nd.getDay()] + ' ' + nd.getDate() + '/' + (nd.getMonth()+1); }
      sub = (needW ? waterText(w) : nextTxt || waterText(w)) + (w.rained ? ' · 🌧 ירד גשם' : '') +
        ' · כל ' + waterInterval(p, today()) + ' ימים' + (p.waterAmount ? ' · ' + escapeHtml(p.waterAmount) : '') + (isDue(f) ? ' · 🌱 לדשן' : '');
    }
    var health = (p.healthCode && p.healthCode !== 'ok') ? ' <span class="pot-health" style="color:' + HEALTH_DOT_VAR[p.healthCode] + '">🩺</span>' : '';
    return '<button type="button" class="pot-row" data-plant="' + p.id + '">' +
      thumbHtml(p, 'pot-thumb') +
      '<span class="pot-main"><span class="pot-name">' + escapeHtml(p.name) + health + '</span>' +
      '<span class="pot-sub' + ((isDue(w) || (p.type === 'tree' && dot !== 'ok'))?' due':'') + '">' + sub + '</span></span>' +
      '<span class="pot-dot ' + dot + '" aria-hidden="true"></span>' +
      '<span class="pot-chev" aria-hidden="true">‹</span>' +
    '</button>';
  }
  // Pots in an area: what needs water today first, then the rest by next watering date.
  function potGroupsHtml(list){
    var need = [], later = [];
    list.forEach(function(p){ var w = waterDue(p); (w.unknown || w.daysUntil <= 0 ? need : later).push(p); });
    later.sort(function(a, b){ return waterDue(a).daysUntil - waterDue(b).daysUntil; });
    need.sort(function(a, b){ var wa = waterDue(a), wb = waterDue(b); return (wa.unknown ? 1 : wa.daysUntil) - (wb.unknown ? 1 : wb.daysUntil); });
    var out = '';
    if (need.length) out += '<div class="pot-group-title due">💧 להשקות היום · ' + need.length + '</div><div class="pot-list">' + need.map(potRowHtml).join('') + '</div>';
    if (later.length) out += '<div class="pot-group-title">✓ לא צריכים מים היום · ' + later.length + '</div><div class="pot-list">' + later.map(potRowHtml).join('') + '</div>';
    return out;
  }
  function urgentFirst(list){
    function rank(p){
      var c = dueByKind([p]);
      return (c.water || c.fert || c.iron || c.prune) ? 0 : 1;
    }
    return list.map(function(p, i){ return { p:p, i:i, r:rank(p) }; })
      .sort(function(a, b){ return a.r - b.r || a.i - b.i; })
      .map(function(x){ return x.p; });
  }
  function renderSection(loc){
    var list = plantsInArea(loc.id);
    var isTrees = loc.kind === 'trees';
    var nw = bulkTargets(loc.id, 'water').length, nf = bulkTargets(loc.id, 'fert').length, ni = isTrees ? bulkTargets(loc.id, 'iron').length : 0;
    var unknown = isTrees ? 0 : list.filter(function(p){ return !p.lastWatered; }).length;
    var tag = isTrees ? '💧 השקיה באוטומציה' : (LIGHT_ICON[loc.lightLevel]||'') + ' ' + (LIGHT_LABEL[loc.lightLevel]||'');
    return '<button type="button" class="sec-back" id="backToSections">→ כל האזורים</button>' +
      '<div class="loc-group-head">' +
        '<div class="loc-group-title">' + (isTrees?'🌳 ':'') + escapeHtml(loc.name) + '<span class="loc-light-tag">' + tag + '</span>' +
          '<button type="button" class="area-edit-btn" id="editArea" data-loc="' + loc.id + '">✏️ עריכת האזור</button></div>' +
        '<div class="loc-bulk-actions">' +
          (isTrees ? '' : '<button type="button" class="bulk-btn" ' + (nw?'':'disabled') + ' data-bulk="water" data-loc="' + loc.id + '">💧 ' + (nw ? 'השקיתי את הממתינים (' + nw + ')' : 'אין מה להשקות היום') + '</button>') +
          '<button type="button" class="bulk-btn fert" ' + (nf?'':'disabled') + ' data-bulk="fert" data-loc="' + loc.id + '">🌱 דשנו ממתינים (' + nf + ')</button>' +
          (isTrees ? '<button type="button" class="bulk-btn journal" id="seasonJournalBtn">📔 יומן העונה</button>' : '') +
          (isTrees ? '<button type="button" class="bulk-btn iron" ' + (ni?'':'disabled') + ' data-bulk="iron" data-loc="' + loc.id + '">🔩 ברזל לממתינים (' + ni + ')</button>' : '') +
        '</div>' +
      '</div>' +
      (isTrees ? '' : areaFertAdviceHtml(loc)) +
      (unknown ? '<div class="banner"><span>ל-' + unknown + ' מהצמחים כאן עוד לא סומנה השקיה. בהשקיה הבאה: להשקות רק עציצים שהאדמה שלהם יבשה, ולסמן כל אחד בנפרד או את כולם יחד. מכאן כל צמח יקבל קצב משלו לפי הסוג שלו.</span></div>' : '') +
      (list.length ? (isTrees ? '<div class="pot-list">' + urgentFirst(list).map(potRowHtml).join('') + '</div>' : potGroupsHtml(list))
        : '<div class="empty-note">אין עדיין צמחים באזור הזה. לחצו + כדי להוסיף.</div>');
  }
  function renderToday(){
    var el = document.getElementById('tab-today');
    el.innerHTML = openArea ? renderSection(getLocation(openArea)) : renderSections();
  }

  /* ---------- plant popup ---------- */
  function popupHtml(p){
    var w = waterDue(p), f = fertDue(p), r = ironDue(p), g = pruneDue(p), isTree = p.type === 'tree';
    var rule = isTree ? pruneRule(p) : null;
    var frule = isTree ? treeFertRule(p) : null;
    var loc = getLocation(p.locationId);
    var health = '';
    if (p.healthCode){
      var hc = p.healthCode === 'ok' ? 'var(--green)' : HEALTH_DOT_VAR[p.healthCode];
      health = '<div class="pp-health"><b style="color:' + hc + '">🩺 ' + escapeHtml(HEALTH_LABELS[p.healthCode] || '') +
        (p.healthLabel && p.healthLabel !== HEALTH_LABELS[p.healthCode] ? ' — ' + escapeHtml(p.healthLabel) : '') + '</b>' +
        (p.findings ? '<div>' + escapeHtml(p.findings) + '</div>' : '') +
        (p.advice ? '<div><b>מה לעשות:</b> ' + escapeHtml(p.advice) + '</div>' : '') + '</div>';
    }
    return '<div class="sheet pp" role="dialog" aria-modal="true" aria-labelledby="ppTitle">' +
      '<button type="button" class="pp-photo" data-pp="photo" aria-label="צילום הצמח">' +
        (p.photoId ? '<img src="' + photoSrc(p.photoId) + '" alt="">' : '<span aria-hidden="true">' + plantIcon(p) + '</span>') +
        '<span class="pp-cam">📷 ' + (p.photoId ? 'צילום חדש' : 'צילום') + '</span>' +
      '</button>' +
      '<div class="pp-head">' +
        '<div><h2 id="ppTitle">' + escapeHtml(p.name) + '</h2>' +
          '<div class="card-meta">' + (p.species ? '<span class="species">' + escapeHtml(p.species) + '</span> · ' : '') + TYPE_LABEL[p.type] + ' · ' + escapeHtml(loc.name) + '</div></div>' +
        '<button type="button" class="pp-close" data-pp="close" aria-label="סגירה">✕</button>' +
      '</div>' +
      '<div class="pp-stats">' +
        (isTree ? '' : '<div class="pp-stat' + (isDue(w)?' due':'') + '"><div class="k">💧 השקיה הבאה</div><div class="v">' + waterText(w) + '</div><div class="d">' + nextWaterDateText(p) + 'אחרונה: ' + relDay(p.lastWatered) + '</div></div>') +
        '<div class="pp-stat' + (isDue(f)?' due fert':'') + '"><div class="k">🌱 דישון</div><div class="v">' + fertText(f) + '</div><div class="d">אחרון: ' + relDay(p.lastFertilized) + (isTree ? ' · ' + monthRangeText(frule.months) + ', כל ' + frule.every + ' יום' : '') + '</div></div>' +
        (isTree ? (p.needsIron
            ? '<div class="pp-stat iron-stat' + (isDue(r)?' due iron':'') + '"><div class="k">🔩 ברזל (כלאט)</div><div class="v">' + ironText(r) + '</div><div class="d">אחרון: ' + relDay(p.lastIron) + ' · כל ' + IRON_EVERY + ' יום · <button type="button" class="link-btn" data-pp="ironOff">הפסקת מעקב</button></div></div>'
            : '<div class="pp-stat iron-stat off"><div class="k">🔩 ברזל (כלאט)</div><div class="v">לא במעקב</div><div class="d"><button type="button" class="link-btn" data-pp="ironOn">העץ צריך ברזל</button> · הצהבה בין העורקים בעלים צעירים</div></div>') +
          '<div class="pp-stat wide' + (isDue(g)?' due prune':'') + '"><div class="k">✂️ גיזום · ' + escapeHtml(rule.label) + '</div><div class="v">' + pruneText(g) + '</div><div class="d">אחרון: ' + relDay(p.lastPruned) + (rule.months.length ? ' · עונה: ' + pruneMonthsText(rule) : '') + '</div></div>' : '') +
      '</div>' +
      (isTree ? yearStripHtml(p) : '') +
      (isTree ? journalHtml(p, journalShowAll) : '') +
      '<button type="button" class="btn btn-ghost pp-identify" data-pp="identify">🔍 זהה את הצמח מתמונה</button>' +
      (isTree ? '<details class="pp-prune pp-fertadv"' + (isDue(f) ? ' open' : '') + '><summary>🌱 המלצת דישון ל' + escapeHtml(frule.label) + '</summary>' +
          '<p>' + escapeHtml(frule.tip).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\d+(?:[-–]\d+)+/g, function(x){ return '<bdi dir="ltr">' + x + '</bdi>'; }) + '</p>' +
          '<p class="pp-dose"><b>מינון במשפך 10 ליטר:</b> ' + (frule.half ? 'חצי כף (כ-<bdi dir="ltr">7</bdi> גרם) של <bdi dir="ltr">20-20-20</bdi>' : 'כף גדושה (כ-<bdi dir="ltr">15</bdi> גרם) של <bdi dir="ltr">20-20-20</bdi>') + '. לעץ צעיר (עד 5 שנים) משפך אחד, לעץ בוגר 2–3 משפכים.</p>' +
          '<p class="pp-prune-always">לשפוך על אדמה לחה, בטבעת מתחת לקצה הנוף, לא על העלים ולא צמוד לגזע. לא להגדיל ריכוז: אם צריך יותר, לחזור לעתים קרובות יותר. דשן נוזלי נשטף מהר, ולכן התזכורת חוזרת כל כמה שבועות ולא פעמיים בשנה.</p></details>' : '') +
      (isTree ? '<details class="pp-prune"' + (isDue(g) ? ' open' : '') + '><summary>✂️ המלצת גיזום ל' + escapeHtml(rule.label) + '</summary>' +
          '<p>' + escapeHtml(rule.tip) + '</p>' +
          '<p class="pp-prune-always">תמיד: מזמרה חדה ומחוטאת, חתך נקי מעל עין שפונה החוצה, וענפים יבשים וחולים אפשר להסיר בכל עונה.</p></details>' : '') +
      (isTree ? '' : '<div class="pp-fields">' +
        '<label class="pp-field">כמה מים בכל השקיה<input type="text" id="ppAmount" value="' + escapeHtml(p.waterAmount || '') + '" placeholder="למשל: כוס / חצי ליטר"></label>' +
        '<label class="pp-field">כל כמה ימים להשקות<input type="number" id="ppEvery" inputmode="numeric" min="1" max="60" value="' + (p.waterEvery || '') + '" placeholder="' + autoIntervalText(p) + '"></label>' +
      '</div>') +
      (isTree ? treeSeasonHtml(p) : '') +
      (!isTree && speciesWaterRule(p) ? '<div class="pp-health">💧 <b>' + escapeHtml(speciesWaterRule(p).label) + ':</b> ' + escapeHtml(speciesWaterRule(p).tip) + '</div>' : '') +
      (p.careNote ? '<div class="pp-health">🔍 ' + escapeHtml(p.careNote) + '</div>' : '') +
      '<label class="pp-field" style="margin-bottom:12px;">הערות<textarea id="ppNotes" rows="2" class="pp-notes" placeholder="מזיקים, פריחה, העברת עציץ…">' + escapeHtml(p.notes || '') + '</textarea></label>' +
      health +
      '<div class="pp-actions">' +
        (isTree ? '' : '<button type="button" class="btn btn-primary pp-big" data-pp="water">💧 השקיתי עכשיו</button>') +
        '<button type="button" class="btn btn-fert pp-big" data-pp="fert">🌱 דישנתי עכשיו</button>' +
        (isTree ? '<button type="button" class="btn btn-iron pp-big" data-pp="iron">🔩 נתתי ברזל</button>' +
          (rule.months.length ? '<button type="button" class="btn btn-prune pp-big wide" data-pp="prune">✂️ גזמתי עכשיו</button>' : '') : '') +
      '</div>' +
      '<div class="pp-more">' +
        '<button type="button" class="btn btn-ghost" data-pp="edit">✏️ עריכה</button>' +
        (p.type === 'tree' ? '' : '<button type="button" class="btn btn-ghost" data-pp="move">📍 העברה</button>') +
        '<button type="button" class="btn btn-danger-ghost" data-pp="del">' + (popupConfirmDelete ? 'למחוק? לחצו שוב' : '🗑 מחיקה') + '</button>' +
      '</div>' +
    '</div>';
  }
  var DAY_SHORT = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
  var MONTH_SHORT = ['ינו׳','פבר׳','מרץ','אפר׳','מאי','יוני','יולי','אוג׳','ספט׳','אוק׳','נוב׳','דצמ׳'];
  // The tree's year at a glance: fertilizing window, harvest months (tap to mark) and pruning season.
  function yearStripHtml(p){
    var fr = treeFertRule(p), pr = pruneRule(p), hm = harvestMonthsOf(p) || [], cur = today().getMonth()+1, cells = '';
    for (var m=1; m<=12; m++){
      var ic = (fr.months.indexOf(m) !== -1 ? '<span>🌱</span>' : '') + (hm.indexOf(m) !== -1 ? '<span>🧺</span>' : '') + (pr.months.indexOf(m) !== -1 ? '<span>✂️</span>' : '');
      cells += '<button type="button" class="ys-cell' + (m === cur ? ' now' : '') + '" data-pp="hvm" data-m="' + m + '" aria-label="קטיף ב' + MONTH_NAMES[m-1] + '">' +
        '<span class="ys-m">' + MONTH_SHORT[m-1] + '</span><span class="ys-i">' + ic + '</span></button>';
    }
    return '<div class="year-box"><div class="ys-title">📅 לוח השנה של העץ</div><div class="year-strip">' + cells + '</div>' +
      '<div class="ys-legend">🌱 דישון · 🧺 קטיף · ✂️ גיזום · ' + (hm.length ? 'לחיצה על חודש מוסיפה או מורידה קטיף.' : '<b>לחצו על החודשים שבהם העץ נותן פרי</b> — מזה נגזרות בדיקות זבוב הפירות.') + '</div></div>';
  }
  function nextWaterDateText(p){
    if (!p.lastWatered) return '';
    var last = parse(p.lastWatered);
    var next = addDays(last, waterInterval(p, last));
    return 'יום ' + DAY_SHORT[next.getDay()] + ' ' + next.getDate() + '/' + (next.getMonth()+1) + ' · ';
  }
  // The interval the app would use without a manual override, shown as the field's hint.
  function autoIntervalText(p){
    var saved = p.waterEvery; p.waterEvery = null;
    var n = waterInterval(p, today());
    p.waterEvery = saved;
    return 'אוטומטי: ' + n;
  }
  function onPopupChange(e){
    var p = findPlant(openPlantId); if (!p) return;
    if (e.target.id === 'ppNotes'){
      if (e.target.value !== (p.notes || '')){ p.notes = e.target.value; saveState(); toast('נשמר'); }
    }
    if (e.target.id === 'ppAmount'){
      var v = e.target.value.trim();
      if (v !== (p.waterAmount || '')){ p.waterAmount = v; saveState(); renderToday(); toast('נשמר'); }
    }
    if (e.target.id === 'ppEvery'){
      var n = parseInt(e.target.value, 10);
      n = (isNaN(n) || n < 1) ? null : Math.min(n, 60);
      if (n !== (p.waterEvery || null)){ p.waterEvery = n; saveState(); renderAll(); toast(n ? 'השקיה כל ' + n + ' ימים' : 'חזרה לחישוב אוטומטי לפי עונה ואור'); }
    }
  }
  function openPlantPopup(id){
    var p = findPlant(id);
    if (!p){ closePlantPopup(); return; }
    openPlantId = id; lsSet('gh-plant', id);
    var wrap = document.getElementById('plantPopup');
    if (!wrap){
      wrap = document.createElement('div');
      wrap.className = 'sheet-backdrop';
      wrap.id = 'plantPopup';
      document.getElementById('app').appendChild(wrap);
      wrap.addEventListener('click', onPopupClick);
      wrap.addEventListener('change', onPopupChange);
    }
    // Don't redraw under the viewer's fingers while they type in a field.
    if (wrap.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    var sc = wrap.firstChild ? wrap.firstChild.scrollTop : 0;
    wrap.innerHTML = popupHtml(p);
    if (wrap.firstChild) wrap.firstChild.scrollTop = sc;
  }
  function refreshPopup(){ if (openPlantId && document.getElementById('plantPopup')) openPlantPopup(openPlantId); }
  function closePlantPopup(){
    openPlantId = null; lsSet('gh-plant', '');
    popupConfirmDelete = false;
    var el = document.getElementById('plantPopup');
    if (el) el.parentNode.removeChild(el);
  }
  function onPopupClick(e){
    var wrap = document.getElementById('plantPopup');
    if (e.target === wrap){ closePlantPopup(); return; }
    var btn = e.target.closest('[data-pp]');
    if (!btn) return;
    var id = openPlantId, act = btn.dataset.pp;
    if (act === 'close'){ journalShowAll = false; closePlantPopup(); return; }
    if (act === 'jadd'){ openJournalSheet(id, btn.dataset.kind); return; }
    if (act === 'jedit'){
      var thumb = e.target.closest('.j-thumb');
      var je = journalOf(findPlant(id)).filter(function(x){ return x.id === btn.dataset.entry; })[0];
      if (thumb && je && je.photoId){ openPhotoViewer(je.photoId); return; }
      openJournalSheet(id, null, btn.dataset.entry); return;
    }
    if (act === 'jall'){ journalShowAll = true; refreshPopup(); return; }
    if (act === 'hvm'){
      var tp = findPlant(id), mm = Number(btn.dataset.m);
      var cur = harvestMonthsOf(tp) || [], at = cur.indexOf(mm);
      if (at === -1) cur.push(mm); else cur.splice(at, 1);
      tp.harvestMonths = cur;
      saveState(); renderAll();
      toast(at === -1 ? '🧺 קטיף ב' + MONTH_NAMES[mm-1] : 'הוסר הקטיף ב' + MONTH_NAMES[mm-1]);
      return;
    }
    if (CARE_FIELD[act]){ markDone(id, act); return; }
    if (act === 'ironOn' || act === 'ironOff'){
      var ip = findPlant(id); if (!ip) return;
      ip.needsIron = act === 'ironOn';
      saveState(); renderAll();
      toast(ip.needsIron ? 'תזכורת ברזל הופעלה ל' + ip.name : 'הופסק מעקב ברזל ל' + ip.name);
      return;
    }
    if (act === 'photo'){ pickPhotoFor(id, 'health'); return; }
    if (act === 'identify'){ pickPhotoFor(id, 'identify'); return; }
    if (act === 'edit'){ closePlantPopup(); openPlantSheet(findPlant(id)); return; }
    if (act === 'move'){ closePlantPopup(); openMoveSheet(id); return; }
    if (act === 'del'){
      if (popupConfirmDelete){ closePlantPopup(); deletePlant(id); }
      else { popupConfirmDelete = true; refreshPopup(); }
    }
  }
  function pickPhotoFor(id, mode){
    // Open the camera synchronously, inside the tap, or phones refuse it.
    var input = document.getElementById('cardPhotoInput');
    input.dataset.targetId = id;
    input.dataset.mode = mode || 'health';
    input.value = '';
    input.click();
  }

  /* ---------- rendering: week ---------- */
  function renderWeek(){
    if (!document.getElementById('tab-week')) return;
    var plants = plantsInArea(selectedArea);
    var wStart = addDays(startOfWeek(today()), state.weekOffset*7);
    var days = [];
    for (var i=0;i<7;i++) days.push(addDays(wStart,i));
    var t = today();
    var rangeLabel = MONTH_NAMES[days[0].getMonth()] + ' ' + days[0].getDate() + ' – ' + MONTH_NAMES[days[6].getMonth()] + ' ' + days[6].getDate();
    var head = '<tr><th class="plant-col"></th>' + days.map(function(d){
      return '<th class="' + (fmt(d)===fmt(t)?'today-col':'') + '">' + DAY_LETTERS[d.getDay()] + '<br>' + d.getDate() + '</th>';
    }).join('') + '</tr>';

    function scheduledDates(lastStr, intervalFn, plant, isFert, isIron){
      if (!lastStr) return [];
      var last = parse(lastStr);
      var interval = intervalFn(plant, last);
      var hits = [];
      var k = Math.ceil(diffDays(wStart, last) / interval);
      if (k < 1) k = 1;
      var d = addDays(last, k*interval);
      var guard = 0;
      while (d <= days[6] && guard < 100){
        var off = (isFert && (FERT[plant.type] || FERT.houseplant)[season(d)] === null) || (isIron && ironOffAt(d));
        if (d >= wStart && !off) hits.push(fmt(d));
        d = addDays(d, interval);
        guard++;
      }
      return hits;
    }

    var rows = plants.map(function(p){
      var waterDates = p.type === 'tree' ? [] : scheduledDates(p.lastWatered, waterInterval, p, false);
      var fertDates = p.type === 'tree'
        ? treeFertDates(p, wStart, days[6]).map(fmt)
        : scheduledDates(p.lastFertilized, fertInterval, p, true);
      var ironDates = (p.type === 'tree' && p.needsIron) ? scheduledDates(p.lastIron, ironInterval, p, false, true) : [];
      var cells = days.map(function(d){
        var ds = fmt(d);
        var isPastOrToday = d <= t;
        var icons = '';
        if (waterDates.indexOf(ds) !== -1){
          icons += isPastOrToday ? '<button data-act="water" data-id="'+p.id+'" data-date="'+ds+'" title="סימון השקיה">💧</button>' : '<span class="planned">💧</span>';
        }
        if (fertDates.indexOf(ds) !== -1){
          icons += isPastOrToday ? '<button data-act="fert" data-id="'+p.id+'" data-date="'+ds+'" title="סימון דישון">🌱</button>' : '<span class="planned">🌱</span>';
        }
        if (ironDates.indexOf(ds) !== -1){
          icons += isPastOrToday ? '<button data-act="iron" data-id="'+p.id+'" data-date="'+ds+'" title="סימון ברזל">🔩</button>' : '<span class="planned">🔩</span>';
        }
        return '<td class="' + (ds===fmt(t)?'today-col':'') + '"><div class="cell-icons">' + icons + '</div></td>';
      }).join('');
      return '<tr><td class="plant-col">' + plantIcon(p) + ' ' + escapeHtml(p.name) + '</td>' + cells + '</tr>';
    }).join('');

    var html =
      '<div class="week-nav">' +
        '<button data-nav="prev" aria-label="שבוע קודם">‹</button>' +
        '<div class="week-range">' + escapeHtml(getLocation(selectedArea).name) + ' · ' + rangeLabel + '</div>' +
        '<button data-nav="next" aria-label="שבוע הבא">›</button>' +
      '</div>' +
      (plants.length ? '<div class="week-table-wrap"><table class="week">' + head + rows + '</table></div>' : '<div class="empty-note">אין צמחים באזור הזה.</div>') +
      '<p class="empty-note" style="text-align:right;padding-inline:4px;">אייקונים שקופים = מתוכנן. לחיצה על יום נוכחי/עבר מסמנת ביצוע. צמחים שעוד לא סומנה להם השקיה לא מופיעים בלוח.</p>';
    document.getElementById('tab-week').innerHTML = html;
  }

  /* ---------- rendering: calendar ---------- */
  var lastCalendarDayData = {};
  var CAL_KINDS = [
    { k:'water', ic:'💧', plan:'להשקות', done:'הושקו' },
    { k:'fert',  ic:'🌱', plan:'לדשן', done:'דושנו' },
    { k:'iron',  ic:'🔩', plan:'לתת ברזל', done:'קיבלו ברזל' },
    { k:'prune', ic:'✂️', plan:'לגזום', done:'נגזמו' }
  ];
  // Due dates from the last time a care was given, repeated until the end of the range.
  // Anything already overdue lands on today. off(d) skips dates out of season.
  function projectDates(lastStr, intervalAt, off, from, to){
    var out = [];
    if (!lastStr) return out;
    var t = today();
    var cur = addDays(parse(lastStr), intervalAt(parse(lastStr)));
    if (cur < t){
      if (!off(t)) out.push(t);
      cur = addDays(t, intervalAt(t));
    }
    var guard = 0;
    while (cur <= to && guard++ < 400){
      if (cur >= from && !off(cur)) out.push(cur);
      cur = addDays(cur, intervalAt(cur));
    }
    return out.filter(function(d){ return d >= from && d <= to; });
  }
  function calendarPlan(from, to){
    var plan = {};
    function add(d, kind, id){
      var ds = fmt(d);
      var day = plan[ds] || (plan[ds] = { water:[], fert:[], iron:[], prune:[] });
      if (day[kind].indexOf(id) === -1) day[kind].push(id);
    }
    var t = today();
    if (to < t) return plan;
    if (from < t) from = t;
    state.plants.forEach(function(p){
      if (p.type !== 'tree'){
        projectDates(effectiveLastWatered(p), function(d){ return waterInterval(p, d); }, function(){ return false; }, from, to)
          .forEach(function(d){ add(d, 'water', p.id); });
      }
      if (p.type !== 'tree'){
        var fertTable = FERT[p.type] || FERT.houseplant;
        projectDates(p.lastFertilized, function(d){ return fertInterval(p, d); }, function(d){ return fertTable[fertSeason(d)] === null; }, from, to)
          .forEach(function(d){ add(d, 'fert', p.id); });
        return;
      }
      treeFertDates(p, from, to).forEach(function(d){ add(d, 'fert', p.id); });
      if (p.needsIron) projectDates(p.lastIron, ironInterval, ironOffAt, from, to)
        .forEach(function(d){ add(d, 'iron', p.id); });
      var rule = pruneRule(p);
      if (!rule.months.length) return;
      monthReminderDates(rule.months, from, to, isDue(pruneDue(p)), true)
        .forEach(function(d){ add(d, 'prune', p.id); });
    });
    return plan;
  }
  function renderCalendar(){
    var plants = state.plants;
    var ids = {};
    plants.forEach(function(p){ ids[p.id] = true; });
    var log = state.log.filter(function(ev){ return ids[ev.plantId]; });
    var base = today();
    var monthDate = new Date(base.getFullYear(), base.getMonth() + state.calendarOffset, 1);
    var year = monthDate.getFullYear(), month = monthDate.getMonth();
    var firstDow = new Date(year, month, 1).getDay();
    var numDays = new Date(year, month + 1, 0).getDate();
    var t = today(), ts = fmt(t);

    var dayData = {};
    function ensure(ds){ return dayData[ds] || (dayData[ds] = { done:{ water:[], fert:[], iron:[], prune:[] }, plan:{ water:[], fert:[], iron:[], prune:[] }, alerts:[] }); }
    log.forEach(function(ev){
      var list = ensure(ev.date).done[ev.kind] || ensure(ev.date).done.fert;
      if (list.indexOf(ev.plantId) === -1) list.push(ev.plantId);
    });
    plants.forEach(function(p){
      if (p.type === 'tree') return; // automatic irrigation, no dry alerts
      var waterDates = log.filter(function(ev){ return ev.plantId===p.id && ev.kind==='water'; })
        .map(function(ev){ return ev.date; }).sort();
      if (!waterDates.length && p.lastWatered) waterDates = [p.lastWatered];
      for (var i=0; i<waterDates.length; i++){
        var startDate = parse(waterDates[i]);
        var interval = waterInterval(p, startDate);
        var nextDate = (i+1 < waterDates.length) ? parse(waterDates[i+1]) : null;
        if (nextDate && diffDays(nextDate, startDate) <= interval) continue;
        var expiry = addDays(startDate, interval + 1);
        if (expiry < (nextDate || t)) ensure(fmt(expiry)).alerts.push(p.id);
      }
    });
    var plan = calendarPlan(new Date(year, month, 1), new Date(year, month, numDays));
    Object.keys(plan).forEach(function(ds){ ensure(ds).plan = plan[ds]; });
    lastCalendarDayData = dayData;

    function badges(set, cls){
      return CAL_KINDS.map(function(c){
        var n = c.k === 'water' ? areasOf(set.water).length
          : c.k === 'fert' ? areasOf(potIds(set.fert)).length + treeIds(set.fert).length
          : set[c.k].length;
        return n ? '<span class="cal-badge ' + c.k + (cls ? ' ' + cls : '') + '">' + c.ic + n + '</span>' : '';
      }).join('');
    }
    function count(set){ return CAL_KINDS.reduce(function(n, c){ return n + set[c.k].length; }, 0); }

    var head = '<div class="cal-nav">' +
        '<button type="button" data-cnav="prev" aria-label="חודש קודם">‹</button>' +
        '<div class="cal-range">' + MONTH_NAMES[month] + ' ' + year + '</div>' +
        '<button type="button" data-cnav="next" aria-label="חודש הבא">›</button>' +
      '</div>' +
      '<div class="cal-legend">💧 אזורי עציצים להשקות · 🌱 דישון (אזורי עציצים ועצים) · 🔩 ברזל · ✂️ גיזום. מהיום והלאה: התראות על מה שצריך לעשות. ימים שעברו: מה שבוצע, ו-⚠ לצמחים שהתאחרה להם השקיה. לחיצה על יום מציגה את הצמחים.</div>';
    var grid = '<div class="cal-grid">' + DAY_LETTERS.map(function(l){ return '<div class="cal-dow">'+l+'</div>'; }).join('');
    for (var i=0;i<firstDow;i++) grid += '<div class="cal-cell empty"></div>';
    for (var day=1; day<=numDays; day++){
      var ds = fmt(new Date(year, month, day));
      var dd = dayData[ds];
      var future = ds >= ts;
      var inner = '';
      if (dd){
        inner = future ? badges(dd.plan, 'plan') : badges(dd.done, '');
        if (!future && dd.alerts.length) inner += '<span class="cal-badge alert">⚠' + dd.alerts.length + '</span>';
      }
      var cls = 'cal-cell' + (ds === ts ? ' today' : '') + (future ? ' future' : '') +
        (!future && dd && dd.alerts.length ? ' has-alert' : '') + (ds === ts && dd && count(dd.plan) ? ' has-due' : '');
      grid += '<button type="button" class="' + cls + '" data-date="' + ds + '">' +
        '<div class="cal-daynum">' + day + '</div>' +
        (inner ? '<div class="cal-badges">' + inner + '</div>' : '') +
        '</button>';
    }
    grid += '</div>';
    document.getElementById('tab-calendar').innerHTML = head + grid;
  }
  // Pot ids grouped by area, in the order areas appear in the app.
  function areasOf(ids){
    var groups = [];
    state.locations.forEach(function(l){
      var mine = ids.filter(function(id){ var p = findPlant(id); return p && p.locationId === l.id; });
      if (mine.length) groups.push({ loc:l, ids:mine });
    });
    return groups;
  }
  function potIds(ids){ return ids.filter(function(id){ var p = findPlant(id); return p && p.type !== 'tree'; }); }
  function treeIds(ids){ return ids.filter(function(id){ var p = findPlant(id); return p && p.type === 'tree'; }); }
  function areaCards(ids, mode, kind){
    kind = kind || 'water';
    return '<div class="cal-areas">' + areasOf(ids).map(function(g){
      var total = plantsInArea(g.loc.id).length;
      var names = g.ids.map(function(id){ return escapeHtml(findPlant(id).name); }).join(' · ');
      var action = mode === 'today' ? (kind === 'fert'
          ? '<button type="button" class="cal-area-btn fert" data-cal-fert="' + g.loc.id + '">🌱 דישנתי</button>'
          : '<button type="button" class="cal-area-btn water" data-cal-water="' + g.loc.id + '">💧 השקיתי</button>')
        : mode === 'plan' ? '<button type="button" class="cal-area-btn" data-cal-area="' + g.loc.id + '">פתיחה</button>' : '';
      return '<div class="cal-area">' +
        '<div class="cal-area-main"><div class="cal-area-name">' + (LIGHT_ICON[g.loc.lightLevel] || '📍') + ' ' + escapeHtml(g.loc.name) + '</div>' +
          '<div class="cal-area-sub">' + (g.ids.length === total ? 'כל ' + total + ' העציצים' : g.ids.length + ' מתוך ' + total + ' עציצים') + '</div>' +
          '<details class="cal-area-list"><summary>אילו עציצים</summary>' + names + '</details></div>' +
        action + '</div>';
    }).join('') + '</div>';
  }
  function plantChips(ids){
    return '<div class="cal-chips">' + ids.map(function(id){
      var p = findPlant(id); if (!p) return '';
      return '<button type="button" class="cal-chip" data-cal-plant="' + p.id + '">' + plantIcon(p) + ' ' + escapeHtml(p.name) + '</button>';
    }).join('') + '</div>';
  }
  function openCalendarDay(ds){
    var dd = lastCalendarDayData[ds];
    var d = parse(ds), ts = fmt(today());
    var label = ['יום ראשון','יום שני','יום שלישי','יום רביעי','יום חמישי','יום שישי','יום שבת'][d.getDay()] + ', ' + d.getDate() + ' ב' + MONTH_NAMES[d.getMonth()];
    var body = '';
    if (dd){
      if (ds >= ts){
        CAL_KINDS.forEach(function(c){
          if (!dd.plan[c.k].length) return;
          if (c.k === 'water'){
            body += '<div class="cal-group plan water">💧 להשקות (' + areasOf(dd.plan.water).length + ' אזורים)</div>' + areaCards(dd.plan.water, ds === ts ? 'today' : 'plan');
            return;
          }
          if (c.k === 'fert'){
            var fp = potIds(dd.plan.fert), ft = treeIds(dd.plan.fert);
            if (fp.length) body += '<div class="cal-group plan fert">🌱 לדשן עציצים (' + areasOf(fp).length + ' אזורים)</div>' + areaCards(fp, ds === ts ? 'today' : 'plan', 'fert');
            if (ft.length) body += '<div class="cal-group plan fert">🌱 לדשן עצים (' + ft.length + ')</div>' + plantChips(ft);
            return;
          }
          body += '<div class="cal-group plan ' + c.k + '">' + c.ic + ' ' + c.plan + ' (' + dd.plan[c.k].length + ')</div>' + plantChips(dd.plan[c.k]);
        });
      }
      if (ds <= ts){
        CAL_KINDS.forEach(function(c){
          if (!dd.done[c.k].length) return;
          if (c.k === 'water'){
            body += '<div class="cal-group done">✓ 💧 הושקו (' + areasOf(dd.done.water).length + ' אזורים)</div>' + areaCards(dd.done.water, 'done');
            return;
          }
          if (c.k === 'fert'){
            var dp = potIds(dd.done.fert), dt = treeIds(dd.done.fert);
            if (dp.length) body += '<div class="cal-group done">✓ 🌱 דושנו עציצים (' + areasOf(dp).length + ' אזורים)</div>' + areaCards(dp, 'done', 'fert');
            if (dt.length) body += '<div class="cal-group done">✓ 🌱 דושנו עצים (' + dt.length + ')</div>' + plantChips(dt);
            return;
          }
          body += '<div class="cal-group done">✓ ' + c.ic + ' ' + c.done + ' (' + dd.done[c.k].length + ')</div>' + plantChips(dd.done[c.k]);
        });
        if (dd.alerts.length) body += '<div class="cal-group alert">⚠ התאחרה השקיה (' + areasOf(dd.alerts).length + ' אזורים)</div>' + areaCards(dd.alerts, 'done');
      }
    }
    if (!body) body = '<p class="am-hint">' + (ds >= ts ? 'אין משימות ביום הזה.' : 'לא נרשמה פעילות ביום הזה.') + '</p>';
    closeSheet();
    var wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.id = 'sheetBackdrop';
    wrap.innerHTML = '<div class="sheet"><h2>' + label + '</h2>' +
      (ds === ts && dd && CAL_KINDS.some(function(c){ return dd.plan[c.k].length; }) ? '<p class="am-hint">כולל משימות שהתאחרו. "השקיתי" מסמן את כל האזור, "דישנתי" מסמן את העציצים באזור שהגיע תורם, ולחיצה על עץ פותחת אותו לסימון.</p>' : '') +
      body +
      '<div class="sheet-actions" style="margin-top:14px;"><button type="button" class="btn btn-ghost" data-cal-close="1">סגירה</button></div></div>';
    document.getElementById('app').appendChild(wrap);
    wrap.addEventListener('click', function(e){
      if (e.target === wrap || e.target.closest('[data-cal-close]')){ closeSheet(); return; }
      var chip = e.target.closest('[data-cal-plant]');
      if (chip){ closeSheet(); popupConfirmDelete = false; openPlantPopup(chip.dataset.calPlant); return; }
      var waterBtn = e.target.closest('[data-cal-water]');
      if (waterBtn){
        var loc = getLocation(waterBtn.dataset.calWater), list = plantsInArea(loc.id);
        markPlants(list, 'water', null, 'הושקה: ' + loc.name + ' (' + list.length + ' עציצים)');
        openCalendarDay(ds);
        return;
      }
      var fertBtn = e.target.closest('[data-cal-fert]');
      if (fertBtn){
        var floc = getLocation(fertBtn.dataset.calFert);
        var flist = plantsInArea(floc.id).filter(function(p){ return dd.plan.fert.indexOf(p.id) !== -1; });
        markPlants(flist, 'fert', null, 'דושנו: ' + floc.name + ' (' + flist.length + ' עציצים)');
        openCalendarDay(ds);
        return;
      }
      var areaBtn = e.target.closest('[data-cal-area]');
      if (areaBtn){
        closeSheet();
        setOpenArea(areaBtn.dataset.calArea);
        showTab('today');
        renderAll();
        window.scrollTo(0,0);
      }
    });
  }
  function renderAll(){
    document.getElementById('subdate').textContent = todayLabel();
    renderAreaBar();
    renderToday();
    renderWeek();
    renderCalendar();
    refreshPopup();
  }
  function todayLabel(){
    var d = new Date();
    var days = ['יום ראשון','יום שני','יום שלישי','יום רביעי','יום חמישי','יום שישי','יום שבת'];
    return days[d.getDay()] + ', ' + d.getDate() + ' ב' + MONTH_NAMES[d.getMonth()];
  }
  function showTab(tab){
    activeTab = tab;
    lsSet('gh-tab', tab);
    document.querySelectorAll('.tab').forEach(function(t){ t.classList.toggle('active', t.dataset.tab===tab); });
    ['today','calendar','doctor'].forEach(function(k){ document.getElementById('tab-'+k).hidden = (k!==tab); });
    document.getElementById('areaBar').hidden = true;
  }

  /* ---------- mutations ---------- */
  function markPlants(list, kind, dateStr, msg){
    if (!list.length) return;
    var field = CARE_FIELD[kind] || 'lastFertilized';
    var d = dateStr || fmt(today());
    var changes = [];
    list.forEach(function(p){
      if (kind === 'iron' && !p.needsIron){ changes.push({ id:p.id, field:'needsIron', prev:p.needsIron }); p.needsIron = true; }
      changes.push({ id:p.id, field:field, prev:p[field] });
      if (!p[field] || p[field] < d) p[field] = d;
      logEvent(p.id, kind, d);
    });
    var armed = null;
    var locId = list[0].locationId;
    if (kind==='water' && d === fmt(today()) && locId !== TREES_LOC){
      var hadTimer = state.pendingTimer ? JSON.parse(JSON.stringify(state.pendingTimer)) : null;
      armed = armLocationTimer(locId);
      if (armed.fresh && !hadTimer) changes.startedTimer = true;
    }
    saveState();
    renderAll();
    showUndo(msg, { changes: changes, logAdded: list.length, startedTimer: !!changes.startedTimer });
    if (armed) activateTimer(armed.label, armed.endTime, true);
  }
  function markDone(id, kind, dateStr){
    var p = findPlant(id);
    if (!p) return;
    markPlants([p], kind, dateStr, (kind==='water' ? 'סומן כהושקה: ' : kind==='iron' ? 'סומן ברזל: ' : kind==='prune' ? 'סומן גיזום: ' : 'סומן כדושן: ') + p.name);
  }
  function deletePlant(id){
    state.plants = state.plants.filter(function(x){ return x.id!==id; });
    state.log = state.log.filter(function(ev){ return ev.plantId!==id; });
    pendingDelete = null;
    saveState();
    renderAll();
    toast('הצמח הוסר');
  }

  /* ---------- add / edit sheet ---------- */
  function locationOptionsHtml(selectedId){
    return potLocations().map(function(l){
      return '<option value="'+l.id+'"'+(l.id===selectedId?' selected':'')+'>'+escapeHtml(l.name)+' · '+LIGHT_LABEL[l.lightLevel]+'</option>';
    }).join('') + '<option value="__new__">+ אזור חדש…</option>';
  }
  function typeChoicesHtml(groupId, selected){
    return '<div class="choice-row" id="' + groupId + '">' +
      ['houseplant','succulent','tree'].map(function(k){
        return '<button type="button" class="choice' + (selected===k?' selected':'') + '" data-val="' + k + '">' + TYPE_ICON[k] + ' ' + TYPE_LABEL[k] + '</button>';
      }).join('') + '</div>';
  }
  var LIGHT_CHOICES_HTML =
    '<button type="button" class="choice" data-val="indoor">🏠 בבית</button>' +
    '<button type="button" class="choice" data-val="full">☀️ שמש מלאה</button>' +
    '<button type="button" class="choice" data-val="partial">⛅ חצי צל</button>' +
    '<button type="button" class="choice" data-val="covered">🌥️ מקורה / צל</button>';

  var draft = null;
  function setDraftType(type){
    draft.type = type;
    var group = document.getElementById('choiceType');
    if (group) Array.prototype.forEach.call(group.children, function(b){ b.classList.toggle('selected', b.dataset.val===type); });
    var locField = document.getElementById('locField');
    if (locField) locField.hidden = (type === 'tree');
    var lwField = document.getElementById('lastWaterField');
    if (lwField) lwField.hidden = (type === 'tree');
  }
  // One sheet serves both "add" (plant = null) and "edit".
  function openPlantSheet(plant){
    var isEdit = !!plant;
    var startLoc = isEdit ? plant.locationId : (selectedArea === TREES_LOC ? (potLocations()[0]||{}).id : selectedArea);
    if (isEdit && plant.type === 'tree') startLoc = (potLocations()[0]||{}).id;
    draft = {
      editId: isEdit ? plant.id : null,
      type: isEdit ? plant.type : (selectedArea === TREES_LOC ? 'tree' : null),
      locationId: startLoc || null,
      newLocLight: null, photoFile: null, diagnosis: null
    };
    var wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.id = 'sheetBackdrop';
    wrap.innerHTML =
      '<div class="sheet">' +
        '<h2>' + (isEdit ? 'עריכת צמח' : 'צמח חדש') + '</h2>' +
        (isEdit ? '' :
        '<div class="field"><label>תמונה (רשות)</label>' +
          '<label class="photo-picker" id="sheetPhotoPicker"><span class="ic">📷</span><span>הוספת תמונה</span>' +
            '<input type="file" id="sheetPhotoInput" accept="image/*" capture="environment" style="position:absolute;inset:0;opacity:0;cursor:pointer;">' +
          '</label>' +
          '<div class="identify-note" id="identifyNote"></div>' +
        '</div>') +
        '<div class="field"><label for="plantName">שם</label><input type="text" id="plantName" placeholder="למשל: פוטוס על המזנון" value="' + (isEdit ? escapeHtml(plant.name) : '') + '"></div>' +
        '<div class="field"><label for="plantSpecies">סוג הצמח (רשות)</label><input type="text" id="plantSpecies" placeholder="למשל: פוטוס זהוב" value="' + (isEdit ? escapeHtml(plant.species||'') : '') + '"></div>' +
        '<div class="field"><label>קטגוריה</label>' + typeChoicesHtml('choiceType', draft.type) + '</div>' +
        '<div class="field" id="locField"' + (draft.type==='tree'?' hidden':'') + '><label for="locationSelect">אזור</label>' +
          '<select class="field-select" id="locationSelect">' + locationOptionsHtml(draft.locationId) + '</select>' +
          '<div id="newLocFields" hidden style="margin-top:8px;">' +
            '<input type="text" id="newLocName" placeholder="שם האזור החדש, למשל: מרפסת צפונית" style="margin-bottom:8px;">' +
            '<div class="choice-row" id="choiceLight">' + LIGHT_CHOICES_HTML + '</div>' +
          '</div>' +
        '</div>' +
        (isEdit ? '' :
        '<div class="field" id="lastWaterField"' + (draft.type==='tree'?' hidden':'') + '><label for="lastWaterSel">מתי הושקה לאחרונה</label>' +
          '<select class="field-select" id="lastWaterSel">' +
            LAST_WATER_CHOICES.map(function(c,i){ return '<option value="'+(c.offset===null?'':c.offset)+'"'+(i===1?' selected':'')+'>'+c.label+'</option>'; }).join('') +
          '</select>' +
        '</div>') +
        '<div class="req-note" id="reqNote"></div>' +
        '<div class="sheet-actions">' +
          '<button class="btn btn-ghost" id="sheetCancel">ביטול</button>' +
          '<button class="btn btn-primary" id="sheetSubmit">' + (isEdit ? 'שמירה' : 'הוספה') + '</button>' +
        '</div>' +
      '</div>';
    document.getElementById('app').appendChild(wrap);

    wrap.addEventListener('click', function(e){
      if (e.target === wrap || e.target.id === 'sheetCancel'){ closeSheet(); return; }
      var choice = e.target.closest('.choice');
      if (choice){
        var group = choice.parentElement;
        if (group.id === 'choiceType'){ setDraftType(choice.dataset.val); return; }
        Array.prototype.forEach.call(group.children, function(b){ b.classList.remove('selected'); });
        choice.classList.add('selected');
        if (group.id === 'choiceLight') draft.newLocLight = choice.dataset.val;
      }
      if (e.target.id === 'sheetSubmit') submitPlantSheet();
    });
    wrap.addEventListener('change', function(e){
      if (e.target.id === 'locationSelect'){
        draft.locationId = e.target.value;
        document.getElementById('newLocFields').hidden = (draft.locationId !== '__new__');
      }
      if (e.target.id === 'sheetPhotoInput' && e.target.files && e.target.files[0]){
        draft.photoFile = e.target.files[0];
        var picker = document.getElementById('sheetPhotoPicker');
        picker.innerHTML = '<img src="' + URL.createObjectURL(draft.photoFile) + '" alt="">' +
          '<input type="file" id="sheetPhotoInput" accept="image/*" capture="environment" style="position:absolute;inset:0;opacity:0;cursor:pointer;">';
        identifyPlant(draft.photoFile);
      }
    });
  }
  function closeSheet(){
    var el = document.getElementById('sheetBackdrop');
    if (el) el.parentNode.removeChild(el);
  }
  function submitPlantSheet(){
    var name = document.getElementById('plantName').value.trim();
    var species = document.getElementById('plantSpecies').value.trim();
    var note = document.getElementById('reqNote');
    if (!name){ note.textContent = 'נא להזין שם'; return; }
    if (!draft.type){ note.textContent = 'נא לבחור קטגוריה'; return; }
    var locationId = TREES_LOC;
    if (draft.type !== 'tree'){
      locationId = draft.locationId;
      if (!locationId){ note.textContent = 'נא לבחור אזור'; return; }
      if (locationId === '__new__'){
        var newName = document.getElementById('newLocName').value.trim();
        if (!newName){ note.textContent = 'נא להזין שם לאזור החדש'; return; }
        if (!draft.newLocLight){ note.textContent = 'נא לבחור כמה אור יש באזור החדש'; return; }
        locationId = 'loc-' + Date.now() + Math.floor(Math.random()*1000);
        state.locations.push({ id: locationId, name: newName, lightLevel: draft.newLocLight });
      }
    }
    note.textContent = '';
    if (draft.editId){
      var p = findPlant(draft.editId);
      if (!p){ closeSheet(); return; }
      p.name = name; p.species = species; p.type = draft.type; p.locationId = locationId;
      closeSheet();
      setOpenArea(locationId);
      saveState();
      renderAll();
      openPlantPopup(p.id);
      toast('נשמר');
      return;
    }
    var offRaw = document.getElementById('lastWaterSel').value;
    var lastDate = (offRaw === '' || draft.type === 'tree') ? null : fmt(addDays(today(), -parseInt(offRaw, 10)));
    var submitBtn = document.getElementById('sheetSubmit');
    var photoFile = draft.photoFile, diag = draft.diagnosis, type = draft.type;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = photoFile ? 'מעלה תמונה…' : 'מוסיף…'; }
    uploadPhoto(photoFile).then(function(photoId){
      state.plants.push({
        id: 'p' + Date.now() + Math.floor(Math.random()*1000),
        name: name, species: species, type: type, locationId: locationId,
        lastWatered: lastDate, lastFertilized: null,
        photoId: photoId || null,
        healthCode: diag ? diag.healthCode : null,
        healthLabel: diag ? diag.healthLabel : '',
        findings: diag ? diag.findings : '',
        advice: diag ? diag.advice : ''
      });
      closeSheet();
      setOpenArea(locationId);
      saveState();
      renderAll();
      toast('נוסף');
    });
  }

  /* ---------- move plant to another area ---------- */
  function openMoveSheet(plantId){
    var p = findPlant(plantId);
    if (!p) return;
    var wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.id = 'sheetBackdrop';
    wrap.innerHTML =
      '<div class="sheet">' +
        '<h2>העברה לאזור אחר</h2>' +
        '<div class="choice-row" id="moveChoices" style="flex-direction:column;align-items:stretch;">' +
          potLocations().map(function(l){
            return '<button type="button" class="choice' + (l.id===p.locationId?' selected':'') + '" data-loc="'+l.id+'" style="text-align:right;">📍 '+escapeHtml(l.name)+' · '+LIGHT_LABEL[l.lightLevel]+'</button>';
          }).join('') +
        '</div>' +
        '<div class="sheet-actions" style="margin-top:14px;"><button class="btn btn-ghost" id="moveCancel">ביטול</button></div>' +
      '</div>';
    document.getElementById('app').appendChild(wrap);
    wrap.addEventListener('click', function(e){
      if (e.target === wrap || e.target.id === 'moveCancel'){ closeSheet(); return; }
      var choiceBtn = e.target.closest('#moveChoices .choice');
      if (choiceBtn){
        p.locationId = choiceBtn.dataset.loc;
        saveState(); renderAll();
        toast('הועבר ל' + getLocation(p.locationId).name);
        closeSheet();
      }
    });
  }

  /* ---------- manage areas: list → edit (name, light, plants) → delete with a destination ---------- */
  var areaSheet = { mode:'list', id:null, back:'list' };
  function areaIcon(l){ return l.kind === 'trees' ? '🌳' : (LIGHT_ICON[l.lightLevel] || '📍'); }
  function areaListHtml(){
    var cards = state.locations.map(function(l, i){
      var isTrees = l.kind === 'trees';
      var n = plantsInArea(l.id).length;
      var potIdx = potLocations().indexOf(l);
      return '<div class="am-card">' +
        '<span class="am-ic" aria-hidden="true">' + areaIcon(l) + '</span>' +
        '<span class="am-main"><span class="am-name">' + escapeHtml(l.name) + '</span>' +
          '<span class="am-sub">' + n + (isTrees ? ' עצים' : ' עציצים') + (isTrees ? '' : ' · ' + (LIGHT_LABEL[l.lightLevel] || '')) + '</span></span>' +
        (isTrees ? '' :
          '<button type="button" class="am-mini" data-am="up" data-loc="' + l.id + '" aria-label="הזזה למעלה"' + (potIdx === 0 ? ' disabled' : '') + '>▲</button>' +
          '<button type="button" class="am-mini" data-am="down" data-loc="' + l.id + '" aria-label="הזזה למטה"' + (potIdx === potLocations().length - 1 ? ' disabled' : '') + '>▼</button>') +
        (isTrees ? '<button type="button" class="btn btn-ghost am-edit" data-am="edit" data-loc="' + l.id + '">✏️ עריכה</button>'
          : '<button type="button" class="am-mini am-pen" data-am="edit" data-loc="' + l.id + '" aria-label="עריכת ' + escapeHtml(l.name) + '">✏️</button>') +
        (isTrees ? '' : '<button type="button" class="am-mini am-del" data-am="delete" data-loc="' + l.id + '" aria-label="מחיקת ' + escapeHtml(l.name) + '">🗑</button>') +
      '</div>';
    }).join('');
    return '<div class="sheet">' +
      '<h2>ניהול אזורים</h2>' +
      '<p class="am-hint">✏️ משנה שם, כמות אור ואילו צמחים באזור. החצים משנים את הסדר במסך הראשי. 🗑 מוחק אזור.</p>' +
      '<div class="am-list">' + cards + '</div>' +
      '<div class="sheet-actions" style="margin-top:14px;">' +
        '<button type="button" class="btn btn-ghost" data-am="close">סגירה</button>' +
        '<button type="button" class="btn btn-primary" data-am="new">➕ אזור חדש</button>' +
      '</div>' +
    '</div>';
  }
  function areaEditHtml(id){
    var isNew = !id;
    var l = isNew ? { id:null, name:'', lightLevel:'partial' } : getLocation(id);
    var isTrees = l.kind === 'trees';
    var inArea = isNew ? [] : plantsInArea(l.id);
    var others = potLocations().filter(function(o){ return o.id !== l.id; });
    var moveOpts = function(){ return '<option value="">נשאר כאן</option>' + others.map(function(o){ return '<option value="' + o.id + '">העברה ל' + escapeHtml(o.name) + '</option>'; }).join(''); };
    var rows = inArea.map(function(p){
      return '<div class="am-plant"><span class="am-pname">' + plantIcon(p) + ' ' + escapeHtml(p.name) + '</span>' +
        (isTrees ? '' : '<select class="am-move" data-plant="' + p.id + '" aria-label="העברת ' + escapeHtml(p.name) + '">' + moveOpts() + '</select>') + '</div>';
    }).join('');
    var addable = isTrees ? '' : others.map(function(o){
      var list = plantsInArea(o.id);
      if (!list.length) return '';
      return '<div class="am-group">' + escapeHtml(o.name) + '</div>' + list.map(function(p){
        return '<label class="am-check"><input type="checkbox" class="am-add" value="' + p.id + '"> ' + plantIcon(p) + ' ' + escapeHtml(p.name) + '</label>';
      }).join('');
    }).join('');
    return '<div class="sheet">' +
      '<button type="button" class="sec-back" data-am="back">→ כל האזורים</button>' +
      '<h2>' + (isNew ? 'אזור חדש' : 'עריכת אזור') + '</h2>' +
      '<div class="field"><label for="amName">שם האזור</label><input type="text" id="amName" value="' + escapeHtml(l.name) + '" placeholder="למשל: מרפסת צפונית"></div>' +
      (isTrees ? '' :
        '<div class="field"><label>כמות אור באזור <span class="am-note">(קובעת כל כמה ימים להשקות)</span></label>' +
          '<div class="choice-row" id="amLight">' + Object.keys(LIGHT_LABEL).map(function(k){
            return '<button type="button" class="choice' + (k === l.lightLevel ? ' selected' : '') + '" data-val="' + k + '">' + LIGHT_ICON[k] + ' ' + LIGHT_LABEL[k] + '</button>';
          }).join('') + '</div></div>' +
        '<div class="field"><label>גשם מגיע לאזור? <span class="am-note">(אחרי גשם האזור נחשב מושקה)</span></label>' +
          '<div class="choice-row" id="amRain">' +
            '<button type="button" class="choice' + (rainExposed(l) ? ' selected' : '') + '" data-val="yes">🌧 כן, חשוף</button>' +
            '<button type="button" class="choice' + (rainExposed(l) ? '' : ' selected') + '" data-val="no">☂️ לא, מקורה</button>' +
          '</div></div>') +
      (isNew ? '' : '<div class="field"><label>' + (isTrees ? 'העצים' : 'העציצים באזור') + ' (' + inArea.length + ')</label>' +
        (rows ? '<div class="am-plants">' + rows + '</div>' : '<div class="am-note">אין עדיין צמחים באזור הזה.</div>') + '</div>') +
      (addable ? '<details class="am-details"' + (isNew ? ' open' : '') + '><summary>➕ הוספת עציצים מאזורים אחרים</summary><div class="am-addlist">' + addable + '</div></details>' : '') +
      '<div class="req-note" id="amNote"></div>' +
      '<div class="sheet-actions">' +
        (isNew || isTrees ? '<button type="button" class="btn btn-ghost" data-am="back">ביטול</button>'
          : '<button type="button" class="btn btn-danger-ghost" data-am="delete" data-loc="' + l.id + '">🗑 מחיקה</button>') +
        '<button type="button" class="btn btn-primary" data-am="save">שמירה</button>' +
      '</div>' +
    '</div>';
  }
  var deleteMode = 'move'; // 'move' = keep the plants elsewhere, 'all' = delete them with the area
  function areaDeleteHtml(id){
    var l = getLocation(id), n = plantsInArea(id).length;
    var others = potLocations().filter(function(o){ return o.id !== id; });
    if (!others.length) deleteMode = 'all';
    var all = deleteMode === 'all';
    return '<div class="sheet">' +
      '<h2>מחיקת "' + escapeHtml(l.name) + '"</h2>' +
      (n ? '<div class="field"><label>מה לעשות עם ' + n + ' העציצים שבאזור?</label>' +
          '<div class="choice-row" id="amDelMode">' +
            (others.length ? '<button type="button" class="choice' + (all ? '' : ' selected') + '" data-val="move">📦 להעביר לאזור אחר</button>' : '') +
            '<button type="button" class="choice danger' + (all ? ' selected' : '') + '" data-val="all">🗑 למחוק גם אותם</button>' +
          '</div></div>' +
          (others.length ? '<div class="field" id="amDestWrap"' + (all ? ' hidden' : '') + '><label for="amDest">לאן להעביר?</label>' +
            '<select class="field-select" id="amDest">' + others.map(function(o){ return '<option value="' + o.id + '">' + escapeHtml(o.name) + '</option>'; }).join('') + '</select></div>' : '') +
          '<p class="am-hint" id="amAllNote"' + (all ? '' : ' hidden') + '>האזור, ' + n + ' העציצים שבו וכל היסטוריית ההשקיה שלהם יימחקו. אפשר לבטל מייד אחרי.</p>'
        : '<p class="am-hint">האזור ריק. המחיקה לא משפיעה על אף צמח.</p>') +
      '<div class="sheet-actions">' +
        '<button type="button" class="btn btn-ghost" data-am="edit" data-loc="' + id + '">ביטול</button>' +
        '<button type="button" class="btn btn-primary" id="amConfirmDel" data-am="confirmDelete" data-loc="' + id + '" style="background:var(--terracotta);">' +
          (n && all ? 'מחיקת האזור והעציצים' : 'מחיקת האזור') + '</button>' +
      '</div>' +
    '</div>';
  }
  function renderAreaSheet(){
    var wrap = document.getElementById('sheetBackdrop');
    if (!wrap) return;
    wrap.innerHTML = areaSheet.mode === 'edit' ? areaEditHtml(areaSheet.id)
      : areaSheet.mode === 'delete' ? areaDeleteHtml(areaSheet.id) : areaListHtml();
    if (wrap.firstChild) wrap.firstChild.scrollTop = 0;
  }
  function saveAreaEdit(){
    var note = document.getElementById('amNote');
    var name = document.getElementById('amName').value.trim();
    if (!name){ note.textContent = 'נא לתת שם לאזור'; return; }
    var sel = document.querySelector('#amLight .choice.selected');
    var l;
    if (!areaSheet.id){
      l = { id: 'loc-' + Date.now() + Math.floor(Math.random()*1000), name: name, lightLevel: sel ? sel.dataset.val : 'partial' };
      state.locations.push(l);
    } else {
      l = getLocation(areaSheet.id);
      l.name = name;
      if (sel) l.lightLevel = sel.dataset.val;
    }
    var rainSel = document.querySelector('#amRain .choice.selected');
    if (rainSel && l.kind !== 'trees') l.rainExposed = rainSel.dataset.val === 'yes';
    var moved = 0;
    document.querySelectorAll('#sheetBackdrop .am-move').forEach(function(s){
      if (s.value){ var p = findPlant(s.dataset.plant); if (p){ p.locationId = s.value; moved++; } }
    });
    document.querySelectorAll('#sheetBackdrop .am-add:checked').forEach(function(c){
      var p = findPlant(c.value); if (p){ p.locationId = l.id; moved++; }
    });
    saveState(); renderAll();
    toast('נשמר' + (moved ? ' · הועברו ' + moved + ' צמחים' : ''));
    if (areaSheet.back === 'close') closeSheet();
    else { areaSheet = { mode:'list', id:null, back:'list' }; renderAreaSheet(); }
  }
  function onAreaSheetClick(e){
    var wrap = document.getElementById('sheetBackdrop');
    if (e.target === wrap){ closeSheet(); return; }
    var choice = e.target.closest('#amLight .choice, #amRain .choice');
    if (choice){
      Array.prototype.forEach.call(choice.parentElement.children, function(b){ b.classList.toggle('selected', b === choice); });
      return;
    }
    var modeBtn = e.target.closest('#amDelMode .choice');
    if (modeBtn){
      deleteMode = modeBtn.dataset.val;
      Array.prototype.forEach.call(modeBtn.parentElement.children, function(b){ b.classList.toggle('selected', b === modeBtn); });
      var dw = document.getElementById('amDestWrap'), an = document.getElementById('amAllNote'), cb = document.getElementById('amConfirmDel');
      if (dw) dw.hidden = deleteMode === 'all';
      if (an) an.hidden = deleteMode !== 'all';
      if (cb) cb.textContent = deleteMode === 'all' ? 'מחיקת האזור והעציצים' : 'מחיקת האזור';
      return;
    }
    var btn = e.target.closest('[data-am]'); if (!btn || btn.disabled) return;
    var act = btn.dataset.am, id = btn.dataset.loc;
    if (act === 'close'){ closeSheet(); return; }
    if (act === 'back'){
      if (areaSheet.back === 'close'){ closeSheet(); return; }
      areaSheet = { mode:'list', id:null, back:'list' }; renderAreaSheet(); return;
    }
    if (act === 'new'){ areaSheet = { mode:'edit', id:null, back:'list' }; renderAreaSheet(); return; }
    if (act === 'edit'){ areaSheet = { mode:'edit', id:id, back:areaSheet.back }; renderAreaSheet(); return; }
    if (act === 'delete'){ deleteMode = 'move'; areaSheet = { mode:'delete', id:id, back:areaSheet.back }; renderAreaSheet(); return; }
    if (act === 'save'){ saveAreaEdit(); return; }
    if (act === 'up' || act === 'down'){
      var arr = state.locations, i = arr.findIndex(function(x){ return x.id === id; });
      var j = act === 'up' ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= arr.length || arr[j].kind === 'trees') return;
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      saveState(); renderAll(); renderAreaSheet(); return;
    }
    if (act === 'confirmDelete'){
      var destEl = document.getElementById('amDest');
      var dest = destEl ? destEl.value : null;
      var gone = getLocation(id).name;
      var inArea = plantsInArea(id);
      var removeAll = inArea.length && (deleteMode === 'all' || !dest);
      var snapshot = JSON.parse(JSON.stringify({ locations: state.locations, plants: state.plants, log: state.log }));
      if (removeAll){
        var ids = {}; inArea.forEach(function(p){ ids[p.id] = true; });
        state.plants = state.plants.filter(function(p){ return !ids[p.id]; });
        state.log = state.log.filter(function(ev){ return !ids[ev.plantId]; });
      } else {
        inArea.forEach(function(p){ p.locationId = dest; });
      }
      state.locations = state.locations.filter(function(l){ return l.id !== id; });
      if (!validArea(selectedArea)) setArea((potLocations()[0] || state.locations[0]).id);
      if (openArea && !validArea(openArea)) setOpenArea(null);
      saveState(); renderAll();
      showUndo('האזור "' + gone + '" נמחק' + (removeAll ? ' עם ' + inArea.length + ' עציצים' : ''), { snapshot: snapshot });
      areaSheet = { mode:'list', id:null, back:'list' }; renderAreaSheet();
    }
  }
  // from the main screen: the list; from inside an area: straight to that area's editor
  function openLocationsSheet(editId){
    closeSheet();
    areaSheet = editId ? { mode:'edit', id:editId, back:'close' } : { mode:'list', id:null, back:'list' };
    var wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.id = 'sheetBackdrop';
    document.getElementById('app').appendChild(wrap);
    wrap.addEventListener('click', onAreaSheetClick);
    renderAreaSheet();
  }

  /* ---------- settings: Claude key for identification ---------- */
  function openSettingsSheet(){
    var has = !!getApiKey();
    var wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.id = 'sheetBackdrop';
    wrap.innerHTML =
      '<div class="sheet">' +
        '<h2>הגדרות</h2>' +
        '<div class="field"><label for="apiKeyInput">מפתח Claude לזיהוי צמחים ולרופא</label>' +
          '<input type="password" id="apiKeyInput" autocomplete="off" placeholder="sk-ant-…" value="">' +
          '<div class="hint-line">' + (has ? '✓ מוגדר מפתח. אפשר להדביק מפתח חדש כדי להחליף.' : 'עוד לא מוגדר מפתח — הזיהוי והרופא כבויים.') + '</div>' +
        '</div>' +
        '<div class="restore-summary">המפתח נשמר רק בטלפון הזה ונשלח רק ל-Anthropic בכל זיהוי. כל זיהוי עולה בערך סנט אחד מהקרדיט שלך. ' +
          'את המפתח יוצרים ב-console.anthropic.com תחת API Keys.</div>' +
        '<div class="req-note" id="keyNote"></div>' +
        '<div class="sheet-actions">' +
          (has ? '<button class="btn btn-ghost" id="keyClear">מחיקת המפתח</button>' : '<button class="btn btn-ghost" id="keyCancel">סגירה</button>') +
          '<button class="btn btn-primary" id="keySave">שמירה</button>' +
        '</div>' +
      '</div>';
    document.getElementById('app').appendChild(wrap);
    wrap.addEventListener('click', function(e){
      if (e.target === wrap || e.target.id === 'keyCancel'){ closeSheet(); return; }
      if (e.target.id === 'keyClear'){ try { localStorage.removeItem(API_KEY_KEY); } catch(err){} closeSheet(); renderAll(); toast('המפתח נמחק'); return; }
      if (e.target.id === 'keySave'){
        var v = document.getElementById('apiKeyInput').value.trim();
        var note = document.getElementById('keyNote');
        if (!v){ note.textContent = 'הדביקו את המפתח בשדה'; return; }
        if (v.indexOf('sk-ant-') !== 0){ note.textContent = 'זה לא נראה כמו מפתח Claude (מתחיל ב-sk-ant-)'; return; }
        try { localStorage.setItem(API_KEY_KEY, v); } catch(err){ note.textContent = 'לא הצלחתי לשמור בטלפון'; return; }
        identifyDisabled = false; identifyDisabledReason = null;
        closeSheet(); renderAll(); toast('המפתח נשמר — הזיהוי פעיל');
      }
    });
  }

  /* ---------- menu: areas, settings, backup ---------- */
  function openMenuSheet(){
    closeSheet();
    var has = !!getApiKey();
    var wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.id = 'sheetBackdrop';
    function item(id, ic, title, sub, warn){
      return '<button type="button" class="menu-item" data-menu="' + id + '"><span class="mi-ic" aria-hidden="true">' + ic + '</span>' +
        '<span class="mi-main"><span class="mi-title">' + title + '</span><span class="mi-sub' + (warn ? ' warn' : '') + '">' + sub + '</span></span></button>';
    }
    wrap.innerHTML = '<div class="sheet"><h2>תפריט</h2><div class="menu-list">' +
      item('areas', '📍', 'ניהול אזורים', 'שינוי שם, סדר, אור, מחיקה והעברת עציצים') +
      item('settings', '🔑', 'זיהוי צמחים והרופא', has ? 'פעיל' : 'כבוי: צריך מפתח Claude', !has) +
      item('export', '📤', 'ייצוא גיבוי', 'שמירת כל הנתונים לקובץ') +
      item('import', '📥', 'שחזור מגיבוי', 'טעינת קובץ גיבוי') +
      '</div><p class="app-version">גרסה ' + APP_VERSION + '</p>' +
      '<div class="sheet-actions"><button type="button" class="btn btn-ghost" data-menu="close">סגירה</button></div></div>';
    document.getElementById('app').appendChild(wrap);
    wrap.addEventListener('click', function(e){
      if (e.target === wrap){ closeSheet(); return; }
      var b = e.target.closest('[data-menu]'); if (!b) return;
      var m = b.dataset.menu;
      if (m === 'close'){ closeSheet(); return; }
      if (m === 'areas'){ openLocationsSheet(); return; }
      if (m === 'settings'){ closeSheet(); openSettingsSheet(); return; }
      if (m === 'export'){ closeSheet(); exportBackup(); return; }
      if (m === 'import'){ closeSheet(); document.getElementById('importInput').click(); return; }
    });
  }
  document.getElementById('menuBtn').addEventListener('click', openMenuSheet);

  /* ---------- backup: export / import ---------- */
  function exportBackup(){
    toast('מכין גיבוי…', 4000);
    var ids = state.plants.map(function(p){ return p.photoId; }).filter(Boolean);
    state.plants.forEach(function(p){ journalOf(p).forEach(function(e){ if (e.photoId) ids.push(e.photoId); }); });
    var photos = {};
    idb().then(function(db){
      return Promise.all(ids.map(function(id){
        return new Promise(function(resolve){
          var req = db.transaction('photos','readonly').objectStore('photos').get(id);
          req.onsuccess = function(){ if (req.result) blobToDataUrl(req.result).then(function(u){ if (u) photos[id] = u; resolve(); }); else resolve(); };
          req.onerror = function(){ resolve(); };
        });
      }));
    }).catch(function(){}).then(function(){
      var payload = { app:'גינת הבית', exportedAt:new Date().toISOString(), plants:state.plants, locations:state.locations, log:state.log, photos:photos };
      downloadFile('גינת-הבית-גיבוי-' + fmt(today()) + '.json', new Blob([JSON.stringify(payload)], { type:'application/json' }));
      lsSet(BACKUP_KEY, fmt(today()));
      renderToday();
      toast('קובץ הגיבוי ירד לתיקיית ההורדות');
    });
  }
  function openRestoreConfirm(data){
    var plantsCount = Array.isArray(data.plants) ? data.plants.length : 0;
    var locCount = Array.isArray(data.locations) ? data.locations.length : 0;
    var wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.id = 'sheetBackdrop';
    wrap.innerHTML =
      '<div class="sheet">' +
        '<h2>שחזור מגיבוי</h2>' +
        '<div class="restore-summary">הקובץ מכיל <b>' + plantsCount + '</b> צמחים ו-<b>' + locCount + '</b> אזורים.<br>' +
          '<span style="color:var(--terracotta);font-weight:600;">שחזור יחליף לגמרי את כל הנתונים הנוכחיים באפליקציה.</span></div>' +
        '<div class="sheet-actions">' +
          '<button class="btn btn-ghost" id="restoreCancel">ביטול</button>' +
          '<button class="btn btn-primary" id="restoreConfirm" style="background:var(--terracotta);">שחזור והחלפה</button>' +
        '</div>' +
      '</div>';
    document.getElementById('app').appendChild(wrap);
    wrap.addEventListener('click', function(e){
      if (e.target === wrap || e.target.id === 'restoreCancel'){ closeSheet(); return; }
      if (e.target.id === 'restoreConfirm'){
        state.plants = Array.isArray(data.plants) ? data.plants : [];
        state.locations = (Array.isArray(data.locations) && data.locations.length) ? data.locations : [{ id:'loc-home', name:'בית', lightLevel:'indoor' }];
        if (!state.locations.some(function(l){ return l.id===TREES_LOC; })) state.locations.unshift({ id:TREES_LOC, name:'עצי פרי', lightLevel:'full', kind:'trees' });
        state.plants.forEach(function(p){
          if (p.type === 'tree') p.locationId = TREES_LOC;
          else if (!validArea(p.locationId)) p.locationId = potLocations()[0].id;
        });
        state.log = Array.isArray(data.log) ? data.log : [];
        if (data.photos && typeof data.photos === 'object'){
          Object.keys(data.photos).forEach(function(id){ putPhoto(id, dataUrlToBlob(data.photos[id])).then(function(){ renderAll(); }).catch(function(){}); });
        }
        delete state.pendingTimer;
        if (!validArea(selectedArea)) setArea(state.locations[0].id);
        closeSheet(); saveState(); renderAll();
        toast('הנתונים שוחזרו מהגיבוי');
      }
    });
  }
  function handleImportFile(file){
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      var data;
      try { data = JSON.parse(String(reader.result)); }
      catch(e){ toast('קובץ לא תקין'); return; }
      if (!data || typeof data !== 'object' || !Array.isArray(data.plants)){ toast('קובץ הגיבוי לא בפורמט המצופה'); return; }
      openRestoreConfirm(data);
    };
    reader.onerror = function(){ toast('קריאת הקובץ נכשלה'); };
    reader.readAsText(file);
  }

  /* ---------- doctor tab ---------- */
  var doctorDraft = null;
  function doctorExistingOptionsHtml(){
    return '<option value="">➕ זה צמח חדש</option>' + state.plants.map(function(p){
      return '<option value="'+p.id+'">'+escapeHtml(p.name)+' · '+escapeHtml(getLocation(p.locationId).name)+'</option>';
    }).join('');
  }
  function doctorLocationOptionsHtml(selectedId){
    return potLocations().map(function(l){
      return '<option value="'+l.id+'"'+(l.id===selectedId?' selected':'')+'>'+escapeHtml(l.name)+' · '+LIGHT_LABEL[l.lightLevel]+'</option>';
    }).join('');
  }
  function healthOptionsHtml(selectedCode){
    return Object.keys(HEALTH_LABELS).map(function(k){
      return '<option value="'+k+'"'+(k===selectedCode?' selected':'')+'>'+HEALTH_LABELS[k]+'</option>';
    }).join('');
  }
  function readManualDiag(){
    var code = (document.getElementById('doctorHealthSelect') || {}).value || 'ok';
    var findingsEl = document.getElementById('doctorFindingsInput');
    var adviceEl = document.getElementById('doctorAdviceInput');
    return {
      healthCode: code,
      healthLabel: HEALTH_LABELS[code] || '',
      findings: findingsEl ? findingsEl.value.trim() : '',
      advice: adviceEl ? adviceEl.value.trim() : ''
    };
  }
  function doctorFormHtml(nameValue){
    return '<label class="dr-name-label" for="doctorExistingSelect">האם זה צמח שכבר ברשימה?</label>' +
      '<select id="doctorExistingSelect" class="field-select">' + doctorExistingOptionsHtml() + '</select>' +
      '<div id="doctorNewFields">' +
        '<label class="dr-name-label" style="margin-top:6px;" for="doctorNameInput">שם הצמח</label>' +
        '<input type="text" id="doctorNameInput" class="dr-name-input" value="' + escapeHtml(nameValue || '') + '" placeholder="שם הצמח">' +
        typeChoicesHtml('doctorTypeChoice', doctorDraft.type) +
        '<select id="doctorLocSelect" class="field-select" style="margin-top:8px;"' + (doctorDraft.type==='tree'?' hidden':'') + ' aria-label="אזור">' + doctorLocationOptionsHtml(doctorDraft.locationId) + '</select>' +
      '</div>' +
      '<div id="doctorExistingNote" class="dr-existing-note" hidden></div>';
  }
  function openManualDoctor(){
    document.getElementById('doctorStatus').textContent = '';
    doctorDraft = { data:{ healthCode:'ok', healthLabel:'', findings:'', advice:'', name:'' }, file:null, type:'houseplant',
      locationId:(potLocations()[0]||{}).id || null, mode:'new', existingPlantId:null, manual:true };
    document.getElementById('doctorResult').innerHTML =
      '<div class="doctor-result">' +
        '<div class="dr-row" style="margin-top:0;">הזינו את מה שגיליתם, בלי תמונה.</div>' +
        '<div class="dr-add-form">' + doctorFormHtml('') +
          '<label class="dr-name-label" style="margin-top:10px;" for="doctorHealthSelect">מצב בריאות</label>' +
          '<select id="doctorHealthSelect" class="field-select">' + healthOptionsHtml('ok') + '</select>' +
          '<label class="dr-name-label" style="margin-top:8px;" for="doctorFindingsInput">מה נמצא (רשות)</label>' +
          '<textarea id="doctorFindingsInput" class="dr-textarea" placeholder="למשל: כתמים חומים בקצות העלים"></textarea>' +
          '<label class="dr-name-label" style="margin-top:8px;" for="doctorAdviceInput">המלצת טיפול (רשות)</label>' +
          '<textarea id="doctorAdviceInput" class="dr-textarea" placeholder="למשל: להפחית השקיה ולהעביר לאור עקיף"></textarea>' +
          '<button type="button" class="btn btn-primary" id="doctorAddBtn" style="margin-top:4px;">➕ שמירה</button>' +
        '</div>' +
        '<button type="button" class="btn btn-ghost doctor-again" id="doctorAgain">ביטול</button>' +
      '</div>';
  }
  function renderDoctorResult(data, errMsg, file){
    var status = document.getElementById('doctorStatus');
    var result = document.getElementById('doctorResult');
    status.textContent = '';
    if (errMsg || !data){
      result.innerHTML = '';
      if (errMsg) status.textContent = errMsg;
      doctorDraft = null;
      return;
    }
    var code = HEALTH_CODES[data.healthCode] ? data.healthCode : 'ok';
    var color = code !== 'ok' ? HEALTH_DOT_VAR[code] : 'var(--green-strong)';
    var bg = code !== 'ok' ? 'color-mix(in srgb, ' + color + ' 16%, var(--surface))' : 'var(--green-soft)';
    doctorDraft = { data:data, file:file || null, type: data.category || 'houseplant',
      locationId:(potLocations()[0]||{}).id || null, mode:'new', existingPlantId:null };
    result.innerHTML =
      '<div class="doctor-result">' +
        '<div class="dr-badge" style="color:' + color + ';background:' + bg + ';">🩺 ' + escapeHtml(HEALTH_LABELS[code]) + '</div>' +
        (data.name ? '<div class="dr-row" style="margin-top:8px;"><b>זיהוי ראשוני: </b>' + escapeHtml(data.name) + '</div>' : '') +
        (data.findings ? '<div class="dr-row"><b>מה נראה בתמונה: </b>' + escapeHtml(data.findings) + '</div>' : '') +
        (data.advice ? '<div class="dr-row"><b>המלצה: </b>' + escapeHtml(data.advice) + '</div>' : '') +
        (code === 'ok' ? '<div class="dr-row">לא נמצא סימן לבעיה — הצמח נראה תקין.</div>' : '') +
        '<div class="dr-add-form">' + doctorFormHtml(data.name) +
          '<button type="button" class="btn btn-primary" id="doctorAddBtn">➕ הוספה לרשימה</button>' +
        '</div>' +
        '<button type="button" class="btn btn-ghost doctor-again" id="doctorAgain">בדיקה נוספת</button>' +
      '</div>';
  }
  function saveDoctor(){
    if (!doctorDraft) return;
    var diag = doctorDraft.manual ? readManualDiag() : doctorDraft.data;
    var addBtn = document.getElementById('doctorAddBtn');
    var target = null;
    if (doctorDraft.mode === 'existing'){
      target = findPlant(doctorDraft.existingPlantId);
      if (!target){ toast('הצמח לא נמצא'); return; }
    } else {
      var nameInput = document.getElementById('doctorNameInput');
      var name = nameInput ? nameInput.value.trim() : '';
      if (!name){ if (nameInput) nameInput.focus(); toast('נא להזין שם לצמח'); return; }
    }
    if (addBtn){ addBtn.disabled = true; addBtn.textContent = doctorDraft.file ? 'מעלה תמונה…' : 'שומר…'; }
    var dd = doctorDraft;
    uploadPhoto(dd.file).then(function(photoId){
      if (!target){
        target = { id:'p' + Date.now() + Math.floor(Math.random()*1000), name:name, species:'', type:dd.type,
          locationId: dd.type==='tree' ? TREES_LOC : dd.locationId, lastWatered:null, lastFertilized:null, photoId:null };
        state.plants.push(target);
        setArea(target.locationId);
      }
      if (photoId) target.photoId = photoId;
      target.healthCode = diag.healthCode;
      target.healthLabel = diag.healthLabel;
      target.findings = diag.findings;
      target.advice = diag.advice;
      saveState(); renderAll(); resetDoctor();
      toast(dd.mode === 'existing' ? 'מצב "' + target.name + '" עודכן' : 'הצמח נוסף לרשימה');
    });
  }
  function resetDoctor(){
    doctorDraft = null;
    document.getElementById('doctorResult').innerHTML = '';
    document.getElementById('doctorStatus').textContent = '';
    document.getElementById('doctorPhotoPicker').innerHTML = '<span class="ic">🩺</span><span>צילום / העלאת תמונה לבדיקה</span>' +
      '<input type="file" id="doctorPhotoInput" accept="image/*" capture="environment" style="position:absolute;inset:0;opacity:0;cursor:pointer;">';
  }

  /* ---------- events ---------- */
  document.querySelector('.tabs').addEventListener('click', function(e){
    var btn = e.target.closest('.tab');
    if (btn) showTab(btn.dataset.tab);
  });
  document.getElementById('areaBar').addEventListener('click', function(e){
    var chip = e.target.closest('.area-chip');
    if (!chip) return;
    setArea(chip.dataset.area);
    pendingDelete = null;
    renderAreaBar(); renderToday(); renderWeek();
  });
  document.getElementById('fabAdd').addEventListener('click', function(){ if (openArea) setArea(openArea); openPlantSheet(null); });

  document.getElementById('tab-today').addEventListener('click', function(e){
    if (e.target.id === 'manageLocBtn'){ openLocationsSheet(); return; }
    if (e.target.closest('#seasonBtn')){ openSeasonSheet(); return; }
    if (e.target.closest('#seasonJournalBtn')){ seasonYear = null; openSeasonJournal(); return; }
    if (e.target.closest('#backupNudge')){ exportBackup(); return; }
    if (e.target.closest('#todayStrip')){ state.calendarOffset = 0; renderCalendar(); openCalendarDay(fmt(today())); return; }
    var wkDay = e.target.closest('[data-week-day]');
    if (wkDay){
      var wd = parse(wkDay.dataset.weekDay), t0 = today();
      state.calendarOffset = (wd.getFullYear() - t0.getFullYear()) * 12 + (wd.getMonth() - t0.getMonth());
      renderCalendar(); openCalendarDay(wkDay.dataset.weekDay); return;
    }
    if (e.target.id === 'settingsBtn'){ openSettingsSheet(); return; }
    if (e.target.id === 'exportBtn'){ exportBackup(); return; }
    if (e.target.id === 'importBtn'){ document.getElementById('importInput').click(); return; }
    var editAreaBtn = e.target.closest('#editArea');
    if (editAreaBtn){ openLocationsSheet(editAreaBtn.dataset.loc); return; }
    if (e.target.closest('#backToSections')){ setOpenArea(null); renderToday(); window.scrollTo(0,0); return; }
    var tile = e.target.closest('[data-open-area]');
    if (tile){ setOpenArea(tile.dataset.openArea); renderAreaBar(); renderToday(); renderWeek(); window.scrollTo(0,0); return; }
    var row = e.target.closest('[data-plant]');
    if (row){ popupConfirmDelete = false; openPlantPopup(row.dataset.plant); return; }
    var bulkBtn = e.target.closest('button[data-bulk]');
    if (bulkBtn && !bulkBtn.disabled){
      var kind = bulkBtn.dataset.bulk;
      var list = bulkTargets(bulkBtn.dataset.loc, kind);
      markPlants(list, kind, null, (kind==='water' ? 'סומנו כהושקו: ' : kind==='iron' ? 'סומן ברזל ל-' : 'סומנו כדושנו: ') + list.length + (kind==='iron' ? ' עצים' : ' צמחים'));
    }
  });

  document.getElementById('cardPhotoInput').addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0];
    var p = findPlant(e.target.dataset.targetId);
    if (!file || !p) return;
    toast('מעלה תמונה…', 15000);
    // Save the photo as soon as it is uploaded; the health check runs afterwards on its own.
    uploadPhoto(file).then(function(photoId){
      if (!photoId){ toast('העלאת התמונה נכשלה' + (lastUploadError ? ' (' + lastUploadError + ')' : '') + ' — נסו שוב', 5000); return; }
      p.photoId = photoId;
      saveState(); renderAll();
      if (e.target.dataset.mode === 'identify'){
        toast('התמונה נשמרה · מזהה את הצמח… (עד דקה)', 8000);
        runIdentify(file).then(function(r){
          if (!r){ toast(identifyDisabled ? identifyUnavailableMsg() : identifyFailMsg(), 5000); return; }
          if (r.species) p.species = r.species;
          if (r.category && p.type !== 'tree' && r.category !== 'tree') p.type = r.category;
          if (r.wateringDays) p.waterEvery = r.wateringDays;
          if (r.waterAmount && !p.waterAmount) p.waterAmount = r.waterAmount;
          if (r.note) p.careNote = r.note;
          saveState(); renderAll();
          toast('🔍 זוהה: ' + (r.species || 'לא ברור') + (r.wateringDays ? ' · השקיה כל ' + r.wateringDays + ' ימים' : ''), 6000);
        });
        return;
      }
      toast('התמונה נשמרה · בודק את מצב הצמח…', 4000);
      runDiagnosis(file).then(function(diag){
        if (!diag) return;
        p.healthCode = diag.healthCode; p.healthLabel = diag.healthLabel; p.findings = diag.findings; p.advice = diag.advice;
        saveState(); renderAll();
        toast(diag.healthCode && diag.healthCode !== 'ok' ? '🩺 ' + (HEALTH_LABELS[diag.healthCode]||'') + (diag.healthLabel ? ' — ' + diag.healthLabel : '') : '🩺 הצמח נראה תקין', 4000);
      });
    });
  });

  document.getElementById('importInput').addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    handleImportFile(file);
  });

  document.getElementById('tab-doctor').addEventListener('change', function(e){
    if (e.target.id === 'doctorPhotoInput'){
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      document.getElementById('doctorPhotoPicker').innerHTML = '<img src="' + URL.createObjectURL(file) + '" alt="">' +
        '<input type="file" id="doctorPhotoInput" accept="image/*" capture="environment" style="position:absolute;inset:0;opacity:0;cursor:pointer;">';
      if (identifyDisabled){ renderDoctorResult(null, identifyUnavailableMsg()); return; }
      document.getElementById('doctorResult').innerHTML = '';
      document.getElementById('doctorStatus').textContent = 'בודק את התמונה… (יכול לקחת עד דקה, אפשר להמתין)';
      runDiagnosis(file).then(function(data){
        if (!data){ renderDoctorResult(null, identifyDisabled ? identifyUnavailableMsg() : identifyFailMsg()); return; }
        renderDoctorResult(data, null, file);
      });
      return;
    }
    if (!doctorDraft) return;
    if (e.target.id === 'doctorLocSelect') doctorDraft.locationId = e.target.value;
    if (e.target.id === 'doctorExistingSelect'){
      var val = e.target.value;
      var newFields = document.getElementById('doctorNewFields');
      var note = document.getElementById('doctorExistingNote');
      var addBtn = document.getElementById('doctorAddBtn');
      var p = val ? findPlant(val) : null;
      doctorDraft.mode = p ? 'existing' : 'new';
      doctorDraft.existingPlantId = p ? p.id : null;
      newFields.hidden = !!p;
      note.hidden = !p;
      if (p) note.textContent = doctorDraft.manual ? 'מצב הבריאות של "' + p.name + '" יעודכן לפי מה שתזינו כאן.' : 'מצב הבריאות והתמונה של "' + p.name + '" יעודכנו לפי הבדיקה הזו.';
      addBtn.textContent = p ? '🩺 עדכון מצב הצמח' : (doctorDraft.manual ? '➕ שמירה' : '➕ הוספה לרשימה');
    }
  });
  document.getElementById('tab-doctor').addEventListener('click', function(e){
    if (e.target.id === 'doctorManualBtn'){ openManualDoctor(); return; }
    if (e.target.id === 'doctorAgain'){ resetDoctor(); return; }
    if (e.target.id === 'doctorAddBtn'){ saveDoctor(); return; }
    var typeChoice = e.target.closest('#doctorTypeChoice .choice');
    if (typeChoice && doctorDraft){
      doctorDraft.type = typeChoice.dataset.val;
      document.querySelectorAll('#doctorTypeChoice .choice').forEach(function(c){ c.classList.toggle('selected', c===typeChoice); });
      var locSel = document.getElementById('doctorLocSelect');
      if (locSel) locSel.hidden = (doctorDraft.type === 'tree');
    }
  });

  if (document.getElementById('tab-week')) document.getElementById('tab-week').addEventListener('click', function(e){
    var nav = e.target.closest('button[data-nav]');
    if (nav){ state.weekOffset += (nav.dataset.nav==='next' ? 1 : -1); renderWeek(); return; }
    var btn = e.target.closest('button[data-act]');
    if (btn) markDone(btn.dataset.id, CARE_FIELD[btn.dataset.act] ? btn.dataset.act : 'fert', btn.dataset.date);
  });

  document.getElementById('tab-calendar').addEventListener('click', function(e){
    var nav = e.target.closest('button[data-cnav]');
    if (nav){ state.calendarOffset += (nav.dataset.cnav==='next' ? 1 : -1); renderCalendar(); return; }
    var cell = e.target.closest('button.cal-cell');
    if (cell) openCalendarDay(cell.dataset.date);
  });

  document.getElementById('app').addEventListener('click', function(e){
    if (e.target.id === 'timerCancel' || e.target.id === 'timerDone') stopWaterTimer();
    if (e.target.id === 'undoBtn') applyUndo();
  });

  function maxDate(arr){ return (Array.isArray(arr) && arr.length) ? arr.slice().sort().pop() : null; }
  function importOldJournal(){
    var raw = null;
    try { if (lsGet('gardenHome_oldImported')) return Promise.resolve(); raw = localStorage.getItem('gardenJournalApp_v1'); } catch(e){ return Promise.resolve(); }
    if (!raw) return Promise.resolve();
    var old; try { old = JSON.parse(raw); } catch(e){ return Promise.resolve(); }
    var jobs = [], count = 0;
    function take(o, id, logs){
      var p = findPlant(id); if (!p || !o) return;
      var w = maxDate(logs.water), f = maxDate(logs.fert);
      if (w && (!p.lastWatered || w > p.lastWatered)) p.lastWatered = w;
      if (f && (!p.lastFertilized || f > p.lastFertilized)) p.lastFertilized = f;
      (logs.water || []).forEach(function(d){ state.log.push({ plantId:id, kind:'water', date:d }); });
      (logs.fert || []).forEach(function(d){ state.log.push({ plantId:id, kind:'fert', date:d }); });
      if (o.notes && !p.notes) p.notes = o.notes;
      if (o.waterAmount && !p.waterAmount) p.waterAmount = o.waterAmount;
      if (o.photo && /^data:image/.test(o.photo) && !p.photoId){
        var pid = 'old-' + id;
        jobs.push(putPhoto(pid, dataUrlToBlob(o.photo)).then(function(){ p.photoId = pid; }).catch(function(){}));
      }
      count++;
    }
    (old.trees || []).forEach(function(t){ var m = /^t(\d+)$/.exec(t.id || ''); if (m) take(t, 'p-t' + m[1], { water:t.wateringLog, fert:t.fertGivenLog }); });
    (old.gardenPots || []).forEach(function(p){ var m = /^gp(\d+)$/.exec(p.id || ''); if (m) take(p, 'p-gp' + m[1], { water:p.wateringLog, fert:p.fertLog }); });
    (old.housePots || []).forEach(function(p){ var m = /^hp(\d+)$/.exec(p.id || ''); if (m) take(p, 'p-hp' + m[1], { water:p.wateringLog, fert:p.fertLog }); });
    return Promise.all(jobs).then(function(){
      lsSet('gardenHome_oldImported', '1');
      if (count){ saveState(); setTimeout(function(){ toast('יובאו השקיות, תמונות והערות מ"יומן הגינה" (' + count + ' צמחים)', 5000); }, 800); }
    });
  }
  // The first import skipped iron; bring the old journal's iron dates over once.
  function importOldIron(){
    var raw = null;
    try { if (lsGet('gardenHome_ironImported')) return; raw = localStorage.getItem('gardenJournalApp_v1'); } catch(e){ return; }
    lsSet('gardenHome_ironImported', '1');
    if (!raw) return;
    var old; try { old = JSON.parse(raw); } catch(e){ return; }
    var count = 0;
    (old.trees || []).forEach(function(t){
      var m = /^t(\d+)$/.exec(t.id || ''); if (!m || !Array.isArray(t.ironLog) || !t.ironLog.length) return;
      var id = 'p-t' + m[1], p = findPlant(id); if (!p) return;
      var have = {};
      state.log.forEach(function(ev){ if (ev.plantId===id && ev.kind==='iron') have[ev.date] = true; });
      t.ironLog.forEach(function(d){ if (!have[d]){ state.log.push({ plantId:id, kind:'iron', date:d }); have[d] = true; } });
      var last = maxDate(t.ironLog);
      if (last && (!p.lastIron || last > p.lastIron)) p.lastIron = last;
      p.needsIron = true;
      count++;
    });
    if (count){ saveState(); setTimeout(function(){ toast('יובא יומן הברזל מ"יומן הגינה" (' + count + ' עצים)', 5000); }, 1200); }
  }
  // The old journal kept a free-text pruning note per tree; keep it in the tree's notes.
  function importOldPruneNotes(){
    var raw = null;
    try { if (lsGet('gardenHome_pruneNotesImported')) return; raw = localStorage.getItem('gardenJournalApp_v1'); } catch(e){ return; }
    lsSet('gardenHome_pruneNotesImported', '1');
    if (!raw) return;
    var old; try { old = JSON.parse(raw); } catch(e){ return; }
    var count = 0;
    (old.trees || []).forEach(function(t){
      var m = /^t(\d+)$/.exec(t.id || ''); var note = (t.pruning || '').trim();
      if (!m || !note) return;
      var p = findPlant('p-t' + m[1]); if (!p || (p.notes || '').indexOf(note) !== -1) return;
      p.notes = (p.notes ? p.notes + '\n' : '') + 'גיזום: ' + note;
      count++;
    });
    if (count) saveState();
  }
  initCapability();
  var booted = false;
  function boot(){
    showTab(activeTab);
    renderAll();
    if (!booted){
      booted = true;
      resumeWaterTimerFromState();
      if (openPlantId && findPlant(openPlantId) && activeTab === 'today') openPlantPopup(openPlantId);
      else closePlantPopup();
    }
  }
  fetchWeather();
  setInterval(function(){ fetchWeather(); }, 30 * 60 * 1000);
  document.addEventListener('visibilitychange', function(){ if (!document.hidden){ fetchWeather(); renderAll(); } });
  loadAllPhotos().then(importOldJournal).then(importOldIron).then(importOldPruneNotes).then(importOldHarvest).then(function(){ if (freshInstall) saveState(); boot(); }, boot);
  if ('serviceWorker' in navigator){
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function(reg){ reg.update(); }).catch(function(){});
    });
    // When a new version takes over, reload once so it is used right away.
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function(){
      if (!hadController || window.__ghReloaded) return;
      window.__ghReloaded = true; window.location.reload();
    });
  }
})();
