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
    houseplant: { summer:14, transition:21, winter:null },
    succulent:  { summer:30, transition:45, winter:null },
    tree:       { summer:30, transition:45, winter:null }
  };
  // Iron chelate (Fe-EDDHA) for fruit trees on calcareous soil: about once per
  // growth flush, never in winter when cold roots can't take it up.
  var IRON_EVERY = 90;
  var TYPE_LABEL = { houseplant:'עלים / פורח', succulent:'סוקולנט / קקטוס', tree:'עץ פרי' };
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

  function waterInterval(plant, atDate){
    if (plant.waterEvery > 0) return plant.waterEvery;
    if (plant.type === 'tree') return TREE_WATER[season(atDate)];
    var loc = getLocation(plant.locationId);
    var table = WATER[plant.type] || WATER.houseplant;
    var lvl = table[loc.lightLevel] ? loc.lightLevel : 'indoor';
    return table[lvl][season(atDate)];
  }
  function fertInterval(plant, atDate){
    var t = FERT[plant.type] || FERT.houseplant;
    return t[season(atDate)] || t.transition;
  }
  function fertOffNow(plant){
    var t = FERT[plant.type] || FERT.houseplant;
    return t[season(today())] === null;
  }
  // { unknown } when never recorded; { off } for fertilizing out of season
  function waterDue(p){
    if (!p.lastWatered) return { unknown:true };
    var last = parse(p.lastWatered);
    return { daysUntil: diffDays(addDays(last, waterInterval(p, last)), today()) };
  }
  function fertDue(p){
    if (fertOffNow(p)) return { off:true };
    if (!p.lastFertilized) return { unknown:true };
    var last = parse(p.lastFertilized);
    return { daysUntil: diffDays(addDays(last, fertInterval(p, last)), today()) };
  }
  function ironOffAt(d){ return season(d) === 'winter'; }
  function ironDue(p){
    if (p.type !== 'tree') return { na:true };
    if (ironOffAt(today())) return { off:true };
    if (!p.lastIron) return { unknown:true };
    return { daysUntil: diffDays(addDays(parse(p.lastIron), IRON_EVERY), today()) };
  }
  function ironInterval(){ return IRON_EVERY; }
  function isDue(info){ return !info.na && !info.unknown && !info.off && info.daysUntil <= 0; }
  var CARE_FIELD = { water:'lastWatered', fert:'lastFertilized', iron:'lastIron' };
  function careDue(p, kind){ return kind==='water' ? waterDue(p) : kind==='iron' ? ironDue(p) : fertDue(p); }

  /* ---------- state ---------- */
  var APP_VERSION = '4';
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
  if (['today','week','calendar','doctor'].indexOf(activeTab) === -1) activeTab = 'today';
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
    lastUndo.changes.forEach(function(c){
      var p = findPlant(c.id);
      if (p) p[c.field] = c.prev;
    });
    if (lastUndo.logAdded) state.log.splice(state.log.length - lastUndo.logAdded, lastUndo.logAdded);
    if (lastUndo.startedTimer) stopWaterTimer(true);
    lastUndo = null;
    hideUndo();
    saveState();
    renderAll();
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
    return plantsInArea(areaId).filter(function(p){ return isDue(waterDue(p)) || isDue(fertDue(p)) || isDue(ironDue(p)); }).length;
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
    bar.hidden = (activeTab !== 'week');
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
    if (w.unknown) return 'טרם סומנה השקיה';
    if (w.daysUntil < 0) return 'להשקות (באיחור ' + (-w.daysUntil) + ' ימים)';
    if (w.daysUntil === 0) return 'להשקות היום';
    return 'השקיה בעוד ' + w.daysUntil + ' ימים';
  }
  function fertText(f){
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
    return '<span class="' + cls + '">' + (p.photoId ? '<img src="' + photoSrc(p.photoId) + '" alt="">' : TYPE_ICON[p.type]) + '</span>';
  }

  // Bulk actions touch only plants that are due or not yet recorded.
  function bulkTargets(areaId, kind){
    return plantsInArea(areaId).filter(function(p){
      var info = careDue(p, kind);
      return !info.na && !info.off && (info.unknown || info.daysUntil <= 0);
    });
  }

  function sectionTileHtml(loc){
    var list = plantsInArea(loc.id);
    var due = areaDueCount(loc.id);
    var unknown = list.filter(function(p){ return !p.lastWatered; }).length;
    var isTrees = loc.kind === 'trees';
    var status = due ? '<span class="sec-status due">⏰ ' + due + ' ממתינים לטיפול</span>'
      : unknown ? '<span class="sec-status">עוד לא סומנה השקיה</span>'
      : list.length ? '<span class="sec-status ok">✓ הכל מטופל</span>' : '<span class="sec-status">ריק</span>';
    return '<button type="button" class="sec-tile' + (isTrees?' trees':'') + (due?' has-due':'') + '" data-open-area="' + loc.id + '">' +
      '<span class="sec-top"><span class="sec-ic" aria-hidden="true">' + (isTrees ? '🌳' : (LIGHT_ICON[loc.lightLevel]||'🪴')) + '</span>' +
      '<span class="sec-count">' + list.length + ' ' + (isTrees ? 'עצים' : 'עציצים') + '</span></span>' +
      '<span class="sec-name">' + escapeHtml(loc.name) + '</span>' +
      status +
    '</button>';
  }
  function renderSections(){
    var trees = state.locations.filter(function(l){ return l.kind==='trees'; });
    var totalDue = state.locations.reduce(function(s,l){ return s + areaDueCount(l.id); }, 0);
    return '<div class="sec-summary">' + (totalDue ? '<b>' + totalDue + '</b> צמחים ממתינים לטיפול היום' : 'אין צמחים שממתינים לטיפול היום') + '</div>' +
      '<div class="sec-grid">' + trees.map(sectionTileHtml).join('') + potLocations().map(sectionTileHtml).join('') + '</div>' +
      '<div class="backup-row" style="margin-top:14px;">' +
        '<button type="button" class="btn btn-ghost" id="manageLocBtn">📍 ניהול אזורים</button>' +
        '<button type="button" class="btn btn-ghost" id="settingsBtn">⚙ הגדרות' + (getApiKey() ? '' : ' ·  זיהוי כבוי') + '</button>' +
      '</div>' +
      '<div class="backup-row">' +
        '<button type="button" class="btn btn-ghost" id="exportBtn">📤 ייצוא גיבוי</button>' +
        '<button type="button" class="btn btn-ghost" id="importBtn">📥 שחזור מגיבוי</button>' +
      '</div>' +
      '<p class="app-version">גרסה ' + APP_VERSION + '</p>';
  }
  function potRowHtml(p){
    var w = waterDue(p), f = fertDue(p), r = ironDue(p);
    var dot = isDue(w) ? 'due' : isDue(f) ? 'fert' : isDue(r) ? 'iron' : (w.unknown ? '' : 'ok');
    var sub = waterText(w) + (p.waterAmount ? ' · ' + escapeHtml(p.waterAmount) : '') + (isDue(f) ? ' · לדשן' : '') + (isDue(r) ? ' · ברזל' : '');
    var health = (p.healthCode && p.healthCode !== 'ok') ? ' <span class="pot-health" style="color:' + HEALTH_DOT_VAR[p.healthCode] + '">🩺</span>' : '';
    return '<button type="button" class="pot-row" data-plant="' + p.id + '">' +
      thumbHtml(p, 'pot-thumb') +
      '<span class="pot-main"><span class="pot-name">' + escapeHtml(p.name) + health + '</span>' +
      '<span class="pot-sub' + (isDue(w)?' due':'') + '">' + sub + '</span></span>' +
      '<span class="pot-dot ' + dot + '" aria-hidden="true"></span>' +
      '<span class="pot-chev" aria-hidden="true">‹</span>' +
    '</button>';
  }
  function renderSection(loc){
    var list = plantsInArea(loc.id);
    var isTrees = loc.kind === 'trees';
    var nw = bulkTargets(loc.id, 'water').length, nf = bulkTargets(loc.id, 'fert').length, ni = isTrees ? bulkTargets(loc.id, 'iron').length : 0;
    var unknown = list.filter(function(p){ return !p.lastWatered; }).length;
    var tag = isTrees ? 'השקיה, דישון וברזל לפי עונה' : (LIGHT_ICON[loc.lightLevel]||'') + ' ' + (LIGHT_LABEL[loc.lightLevel]||'');
    return '<button type="button" class="sec-back" id="backToSections">→ כל האזורים</button>' +
      '<div class="loc-group-head">' +
        '<div class="loc-group-title">' + (isTrees?'🌳 ':'') + escapeHtml(loc.name) + '<span class="loc-light-tag">' + tag + '</span>' +
          '<button type="button" class="area-edit-btn" id="editArea" data-loc="' + loc.id + '">✏️ עריכת האזור</button></div>' +
        '<div class="loc-bulk-actions">' +
          '<button type="button" class="bulk-btn" ' + (list.length?'':'disabled') + ' data-bulk="water" data-loc="' + loc.id + '">💧 השקיתי את כל האזור (' + list.length + ')</button>' +
          '<button type="button" class="bulk-btn fert" ' + (nf?'':'disabled') + ' data-bulk="fert" data-loc="' + loc.id + '">🌱 דשנו ממתינים (' + nf + ')</button>' +
          (isTrees ? '<button type="button" class="bulk-btn iron" ' + (ni?'':'disabled') + ' data-bulk="iron" data-loc="' + loc.id + '">🔩 ברזל לממתינים (' + ni + ')</button>' : '') +
        '</div>' +
      '</div>' +
      (unknown ? '<div class="banner"><span>ל-' + unknown + ' מהצמחים כאן עוד לא סומנה השקיה. אחרי ההשקיה הבאה לחצו על <b>השקיתי את כל האזור</b>, ומשם הלוח יחשב לבד מתי להשקות שוב.</span></div>' : '') +
      (list.length ? '<div class="pot-list">' + list.map(potRowHtml).join('') + '</div>'
        : '<div class="empty-note">אין עדיין צמחים באזור הזה. לחצו + כדי להוסיף.</div>');
  }
  function renderToday(){
    var el = document.getElementById('tab-today');
    el.innerHTML = openArea ? renderSection(getLocation(openArea)) : renderSections();
  }

  /* ---------- plant popup ---------- */
  function popupHtml(p){
    var w = waterDue(p), f = fertDue(p), r = ironDue(p), isTree = p.type === 'tree';
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
        (p.photoId ? '<img src="' + photoSrc(p.photoId) + '" alt="">' : '<span aria-hidden="true">' + TYPE_ICON[p.type] + '</span>') +
        '<span class="pp-cam">📷 ' + (p.photoId ? 'צילום חדש' : 'צילום') + '</span>' +
      '</button>' +
      '<div class="pp-head">' +
        '<div><h2 id="ppTitle">' + escapeHtml(p.name) + '</h2>' +
          '<div class="card-meta">' + (p.species ? '<span class="species">' + escapeHtml(p.species) + '</span> · ' : '') + TYPE_LABEL[p.type] + ' · ' + escapeHtml(loc.name) + '</div></div>' +
        '<button type="button" class="pp-close" data-pp="close" aria-label="סגירה">✕</button>' +
      '</div>' +
      '<div class="pp-stats">' +
        '<div class="pp-stat' + (isDue(w)?' due':'') + '"><div class="k">💧 השקיה הבאה</div><div class="v">' + waterText(w) + '</div><div class="d">' + nextWaterDateText(p) + 'אחרונה: ' + relDay(p.lastWatered) + '</div></div>' +
        '<div class="pp-stat' + (isDue(f)?' due fert':'') + '"><div class="k">🌱 דישון</div><div class="v">' + fertText(f) + '</div><div class="d">אחרון: ' + relDay(p.lastFertilized) + '</div></div>' +
        (isTree ? '<div class="pp-stat wide iron-stat' + (isDue(r)?' due iron':'') + '"><div class="k">🔩 ברזל (כלאט)</div><div class="v">' + ironText(r) + '</div><div class="d">אחרון: ' + relDay(p.lastIron) + ' · כל ' + IRON_EVERY + ' יום, לא בחורף</div></div>' : '') +
      '</div>' +
      '<button type="button" class="btn btn-ghost pp-identify" data-pp="identify">🔍 זהה את הצמח מתמונה</button>' +
      '<div class="pp-fields">' +
        '<label class="pp-field">כמה מים בכל השקיה<input type="text" id="ppAmount" value="' + escapeHtml(p.waterAmount || '') + '" placeholder="למשל: כוס / חצי ליטר"></label>' +
        '<label class="pp-field">כל כמה ימים להשקות<input type="number" id="ppEvery" inputmode="numeric" min="1" max="60" value="' + (p.waterEvery || '') + '" placeholder="' + autoIntervalText(p) + '"></label>' +
      '</div>' +
      (p.careNote ? '<div class="pp-health">🔍 ' + escapeHtml(p.careNote) + '</div>' : '') +
      '<label class="pp-field" style="margin-bottom:12px;">הערות<textarea id="ppNotes" rows="2" class="pp-notes" placeholder="מזיקים, פריחה, העברת עציץ…">' + escapeHtml(p.notes || '') + '</textarea></label>' +
      health +
      '<div class="pp-actions">' +
        '<button type="button" class="btn btn-primary pp-big" data-pp="water">💧 השקיתי עכשיו</button>' +
        '<button type="button" class="btn btn-fert pp-big" data-pp="fert">🌱 דישנתי עכשיו</button>' +
        (isTree ? '<button type="button" class="btn btn-iron pp-big wide" data-pp="iron">🔩 נתתי ברזל עכשיו</button>' : '') +
      '</div>' +
      '<div class="pp-more">' +
        '<button type="button" class="btn btn-ghost" data-pp="edit">✏️ עריכה</button>' +
        (p.type === 'tree' ? '' : '<button type="button" class="btn btn-ghost" data-pp="move">📍 העברה</button>') +
        '<button type="button" class="btn btn-danger-ghost" data-pp="del">' + (popupConfirmDelete ? 'למחוק? לחצו שוב' : '🗑 מחיקה') + '</button>' +
      '</div>' +
    '</div>';
  }
  var DAY_SHORT = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
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
    if (act === 'close'){ closePlantPopup(); return; }
    if (act === 'water' || act === 'fert' || act === 'iron'){ markDone(id, act); return; }
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
      var waterDates = scheduledDates(p.lastWatered, waterInterval, p, false);
      var fertDates = scheduledDates(p.lastFertilized, fertInterval, p, true);
      var ironDates = p.type === 'tree' ? scheduledDates(p.lastIron, ironInterval, p, false, true) : [];
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
      return '<tr><td class="plant-col">' + TYPE_ICON[p.type] + ' ' + escapeHtml(p.name) + '</td>' + cells + '</tr>';
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
    var t = today();

    var dayData = {};
    function ensure(ds){ return dayData[ds] || (dayData[ds] = { water:0, fert:0, iron:0, alerts:[] }); }
    log.forEach(function(ev){
      var d = ensure(ev.date);
      if (ev.kind==='water') d.water++; else if (ev.kind==='iron') d.iron++; else d.fert++;
    });
    plants.forEach(function(p){
      var waterDates = log.filter(function(ev){ return ev.plantId===p.id && ev.kind==='water'; })
        .map(function(ev){ return ev.date; }).sort();
      if (!waterDates.length && p.lastWatered) waterDates = [p.lastWatered];
      for (var i=0; i<waterDates.length; i++){
        var startDate = parse(waterDates[i]);
        var interval = waterInterval(p, startDate);
        var nextDate = (i+1 < waterDates.length) ? parse(waterDates[i+1]) : null;
        if (nextDate && diffDays(nextDate, startDate) <= interval) continue;
        var expiry = addDays(startDate, interval + 1);
        if (expiry <= (nextDate || t)) ensure(fmt(expiry)).alerts.push(p.name);
      }
    });
    lastCalendarDayData = dayData;

    var head = '<div class="cal-nav">' +
        '<button type="button" data-cnav="prev" aria-label="חודש קודם">‹</button>' +
        '<div class="cal-range">' + MONTH_NAMES[month] + ' ' + year + '</div>' +
        '<button type="button" data-cnav="next" aria-label="חודש הבא">›</button>' +
      '</div>' +
      '<div class="cal-legend">כל האזורים והעצים יחד. 💧 = השקיות שבוצעו · 🔩 = ברזל לעצים · ⚠ = צמחים שהתחילו לאחר בהשקיה. לחיצה על יום מציגה פרטים.</div>';
    var grid = '<div class="cal-grid">' + DAY_LETTERS.map(function(l){ return '<div class="cal-dow">'+l+'</div>'; }).join('');
    for (var i=0;i<firstDow;i++) grid += '<div class="cal-cell empty"></div>';
    for (var day=1; day<=numDays; day++){
      var ds = fmt(new Date(year, month, day));
      var dd = dayData[ds];
      var cls = 'cal-cell' + (ds === fmt(t)?' today':'') + (dd && dd.alerts.length ? ' has-alert' : '');
      grid += '<button type="button" class="' + cls + '" data-date="' + ds + '">' +
        '<div class="cal-daynum">' + day + '</div>' +
        (dd && dd.water ? '<div class="cal-badge water">💧'+dd.water+'</div>' : '') +
        (dd && dd.iron ? '<div class="cal-badge iron">🔩'+dd.iron+'</div>' : '') +
        (dd && dd.alerts.length ? '<div class="cal-badge alert">⚠'+dd.alerts.length+'</div>' : '') +
        '</button>';
    }
    grid += '</div>';
    document.getElementById('tab-calendar').innerHTML = head + grid;
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
    ['today','week','calendar','doctor'].forEach(function(k){ document.getElementById('tab-'+k).hidden = (k!==tab); });
    document.getElementById('areaBar').hidden = (tab !== 'week');
  }

  /* ---------- mutations ---------- */
  function markPlants(list, kind, dateStr, msg){
    if (!list.length) return;
    var field = CARE_FIELD[kind] || 'lastFertilized';
    var d = dateStr || fmt(today());
    var changes = [];
    list.forEach(function(p){
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
    markPlants([p], kind, dateStr, (kind==='water' ? 'סומן כהושקה: ' : kind==='iron' ? 'סומן ברזל: ' : 'סומן כדושן: ') + p.name);
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
        '<div class="field"><label for="lastWaterSel">מתי הושקה לאחרונה</label>' +
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
    var lastDate = offRaw === '' ? null : fmt(addDays(today(), -parseInt(offRaw, 10)));
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
        '<button type="button" class="btn btn-ghost am-edit" data-am="edit" data-loc="' + l.id + '">✏️ עריכה</button>' +
      '</div>';
    }).join('');
    return '<div class="sheet">' +
      '<h2>ניהול אזורים</h2>' +
      '<p class="am-hint">לחצו "עריכה" כדי לשנות שם, כמות אור, ולהוסיף או להעביר צמחים בין אזורים. החצים משנים את הסדר במסך הראשי.</p>' +
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
      return '<div class="am-plant"><span class="am-pname">' + TYPE_ICON[p.type] + ' ' + escapeHtml(p.name) + '</span>' +
        (isTrees ? '' : '<select class="am-move" data-plant="' + p.id + '" aria-label="העברת ' + escapeHtml(p.name) + '">' + moveOpts() + '</select>') + '</div>';
    }).join('');
    var addable = isTrees ? '' : others.map(function(o){
      var list = plantsInArea(o.id);
      if (!list.length) return '';
      return '<div class="am-group">' + escapeHtml(o.name) + '</div>' + list.map(function(p){
        return '<label class="am-check"><input type="checkbox" class="am-add" value="' + p.id + '"> ' + TYPE_ICON[p.type] + ' ' + escapeHtml(p.name) + '</label>';
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
          }).join('') + '</div></div>') +
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
  function areaDeleteHtml(id){
    var l = getLocation(id), n = plantsInArea(id).length;
    var others = potLocations().filter(function(o){ return o.id !== id; });
    return '<div class="sheet">' +
      '<h2>מחיקת "' + escapeHtml(l.name) + '"</h2>' +
      (n ? '<div class="field"><label for="amDest">לאן להעביר את ' + n + ' העציצים שבאזור?</label>' +
          '<select class="field-select" id="amDest">' + others.map(function(o){ return '<option value="' + o.id + '">' + escapeHtml(o.name) + '</option>'; }).join('') + '</select></div>'
        : '<p class="am-hint">האזור ריק. המחיקה לא משפיעה על אף צמח.</p>') +
      '<div class="sheet-actions">' +
        '<button type="button" class="btn btn-ghost" data-am="edit" data-loc="' + id + '">ביטול</button>' +
        '<button type="button" class="btn btn-primary" data-am="confirmDelete" data-loc="' + id + '" style="background:var(--terracotta);"' + (n && !others.length ? ' disabled' : '') + '>מחיקת האזור</button>' +
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
    var choice = e.target.closest('#amLight .choice');
    if (choice){
      Array.prototype.forEach.call(choice.parentElement.children, function(b){ b.classList.toggle('selected', b === choice); });
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
    if (act === 'delete'){ areaSheet = { mode:'delete', id:id, back:areaSheet.back }; renderAreaSheet(); return; }
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
      plantsInArea(id).forEach(function(p){ p.locationId = dest; });
      state.locations = state.locations.filter(function(l){ return l.id !== id; });
      if (!validArea(selectedArea)) setArea((potLocations()[0] || state.locations[0]).id);
      if (openArea && !validArea(openArea)) setOpenArea(null);
      saveState(); renderAll();
      toast('האזור "' + gone + '" נמחק');
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

  /* ---------- backup: export / import ---------- */
  function exportBackup(){
    toast('מכין גיבוי…', 4000);
    var ids = state.plants.map(function(p){ return p.photoId; }).filter(Boolean);
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
      var list = kind === 'water' ? plantsInArea(bulkBtn.dataset.loc) : bulkTargets(bulkBtn.dataset.loc, kind);
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

  document.getElementById('tab-week').addEventListener('click', function(e){
    var nav = e.target.closest('button[data-nav]');
    if (nav){ state.weekOffset += (nav.dataset.nav==='next' ? 1 : -1); renderWeek(); return; }
    var btn = e.target.closest('button[data-act]');
    if (btn) markDone(btn.dataset.id, CARE_FIELD[btn.dataset.act] ? btn.dataset.act : 'fert', btn.dataset.date);
  });

  document.getElementById('tab-calendar').addEventListener('click', function(e){
    var nav = e.target.closest('button[data-cnav]');
    if (nav){ state.calendarOffset += (nav.dataset.cnav==='next' ? 1 : -1); renderCalendar(); return; }
    var cell = e.target.closest('button.cal-cell');
    if (!cell) return;
    var ds = cell.dataset.date;
    var dd = lastCalendarDayData[ds];
    var parts = parse(ds);
    var label = parts.getDate() + ' ב' + MONTH_NAMES[parts.getMonth()];
    if (!dd || (!dd.water && !dd.fert && !dd.iron && !dd.alerts.length)){ toast(label + ': אין פעילות רשומה'); return; }
    var bits = [];
    if (dd.water) bits.push('💧 הושקו ' + dd.water);
    if (dd.fert) bits.push('🌱 דושנו ' + dd.fert);
    if (dd.iron) bits.push('🔩 ברזל ל-' + dd.iron + ' עצים');
    if (dd.alerts.length) bits.push('⚠ חסר מים: ' + dd.alerts.join(', '));
    toast(label + ': ' + bits.join(' · '), 3600);
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
      count++;
    });
    if (count){ saveState(); setTimeout(function(){ toast('יובא יומן הברזל מ"יומן הגינה" (' + count + ' עצים)', 5000); }, 1200); }
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
  loadAllPhotos().then(importOldJournal).then(importOldIron).then(function(){ if (freshInstall) saveState(); boot(); }, boot);
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
