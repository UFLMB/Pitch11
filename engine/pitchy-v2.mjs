const PATTERNS = [
  // Specific Hungarian direction words must win before the generic "csíkos" fallback.
  ['diagonal-stripes', /\b(diagonal stripes?|slanted stripes?)\b|átlós csík|ferde csík/],
  ['horizontal-stripes', /\b(horizontal stripes?)\b|vízszintes csík/],
  ['vertical-stripes', /\b(vertical stripes?|striped|stripes?)\b|függőleges csík|csíkos|csíkok/],
  ['chevron', /\b(chevron|zig.?zag|v shape)\b|cikkcakk|cikcakk|v alak/],
  ['checkerboard', /\b(checkerboard|checkered|checks?)\b|sakktábla|kockás/],
  ['dots', /\b(dots?|polka dots?)\b|pötty|pöttyös/],
  ['side-panels', /\b(side panels?|side stripes?)\b|oldalpanel|oldalsó panel|oldalcsík/],
  ['split', /\b(split|half.?and.?half|two.?tone)\b|felezett|két tónus|kettéosztott/],
  ['geometric', /\b(geometric|abstract geometry)\b|geometrikus|geometriai/],
  ['rings', /\b(rings?|circular bands?)\b|gyűrű|karika|körkörös/],
  ['panel-graphics', /\b(panel graphics?|graphic panels?)\b|panelgrafika|panel minta|grafikus panelek/]
];
const COLOURS = [
  ['black','#101318',/\b(black|jet black|charcoal)\b|fekete|szénfekete/],
  ['white','#f4f3ed',/\b(white|ivory)\b|fehér|elefántcsont/],
  ['red','#d62935',/\b(red|crimson|scarlet)\b|piros|vörös|bordó/],
  ['blue','#1769aa',/\b(blue|royal blue)\b|kék|királykék/],
  ['navy','#142743',/\b(navy|midnight blue)\b|sötétkék|tengerészkék/],
  ['sky blue','#55b9e9',/\b(sky blue|light blue)\b|világoskék|égkék/],
  ['green','#168653',/\b(green|forest green)\b|zöld|sötétzöld/],
  ['lime','#a3e635',/\b(lime|neon green)\b|neonzöld|élénkzöld/],
  ['yellow','#f2d22e',/\b(yellow|golden yellow)\b|sárga|citromsárga/],
  ['gold','#c5a46d',/\b(gold|golden)\b|arany|aranyszínű/],
  ['orange','#ef7627',/\b(orange)\b|narancs|narancssárga/],
  ['purple','#7545a6',/\b(purple|violet)\b|lila|ibolya/],
  ['pink','#ed78a8',/\b(pink|magenta)\b|rózsaszín/],
  ['grey','#858b94',/\b(gray|grey|silver)\b|szürke|ezüst/],
  ['brown','#79513a',/\b(brown)\b|barna/]
];
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const HU_WORDS = /[őűáéíóöüŐŰÁÉÍÓÖÜ]/;
const isHU = s => HU_WORDS.test(s) || /\b(készíts|csinálj|legyen|kérek|fekete|fehér|piros|kék|zöld|arany|mez|labda|csíkos|mintás)\b/i.test(s);
function luminance(hex){
  const c=hex.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.03928?x/12.92:((x+.055)/1.055)**2.4);
  return .2126*c[0]+.7152*c[1]+.0722*c[2];
}
function coloursIn(s){
  const a=[];
  for(const [name,hex,re] of COLOURS){const m=re.exec(s);if(m)a.push({name,hex,index:m.index});}
  for(const m of s.matchAll(/#[0-9a-f]{6}/gi))a.push({name:'custom',hex:m[0],index:m.index});
  return a.sort((x,y)=>x.index-y.index).filter((x,i,all)=>all.findIndex(y=>y.hex.toLowerCase()===x.hex.toLowerCase())===i);
}
function garmentColoursIn(s){
  const targets={
    shirt:/\b(jersey|shirt|top)\b|mez|felső/i,
    shorts:/\b(shorts?|trunks?)\b|nadrág|sort/i,
    socks:/\b(socks?|stockings?)\b|sportszár|zokni/i,
    shoes:/\b(boots?|cleats?|shoes?)\b|cipő|stoplis/i
  };
  const colours=coloursIn(s),result={};
  for(const [key,re] of Object.entries(targets)){
    const matches=[...s.matchAll(new RegExp(re.source,'gi'))].map(m=>({index:m.index,length:m[0].length}));
    let best=null;
    for(const garment of matches)for(const colour of colours){
      const distance=colour.index<garment.index?garment.index-(colour.index+colour.name.length):colour.index-(garment.index+garment.length);
      if(distance<=42&&(!best||distance<best.distance))best={colour,distance};
    }
    if(best)result[key]=best.colour.hex;
  }
  return result;
}
function pick(re,s,fallback){const m=s.match(re);return m?m[1]||m[0]:fallback;}
function patternOf(s){
  const noStripes=/\b(no|without|avoid|exclude)\s+(?:any\s+)?(?:stripes?|striping)\b|csíkok? nélkül|ne legyen csíkos/i.test(s);
  const otherExplicit=PATTERNS.some(([id,re])=>!['vertical-stripes','horizontal-stripes','diagonal-stripes'].includes(id)&&re.test(s));
  if(noStripes&&!otherExplicit)return 'solid';
  for(const [id,re] of PATTERNS)if(re.test(s))return id;
  if(/\b(clean|minimal|plain|solid|simple)\b|egyszerű|letisztult|egyszínű|minta nélkül/i.test(s))return 'solid';
  if(/\b(aggressive|dynamic|fast|speed)\b|agresszív|dinamikus|sebesség/i.test(s))return 'diagonal-stripes';
  return 'panel-graphics';
}
function styleOf(s){
  if(/\b(retro|classic|vintage)\b|retró|retro|klasszikus|régi iskola/i.test(s))return 'retro';
  if(/\b(stealth|minimal|clean|elegant)\b|letisztult|elegáns|visszafogott/i.test(s))return 'minimal';
  if(/\b(aggressive|bold|dynamic|speed)\b|agresszív|dinamikus|gyors|erőteljes/i.test(s))return 'performance';
  if(/\b(futuristic|cyber|neon)\b|futurisztikus|neon|jövő/i.test(s))return 'futuristic';
  if(/\b(luxury|premium|elite)\b|luxus|prémium|elit/i.test(s))return 'premium';
  return 'pro';
}
function materialOf(s,type){
  const glossy=/\b(glossy|shiny|polished)\b|fényes|csillogó/i.test(s);
  const matte=/\b(matte|matte finish)\b|matt/i.test(s);
  if(glossy&&!/\b(not|no|without)\s+(?:very\s+)?(?:glossy|shiny)\b|ne legyen fényes|ne legyen csillogó/i.test(s))return 'glossy';
  if(matte)return 'matte';
  if(/\b(metallic|chrome)\b|fémes|króm/i.test(s))return 'metallic';
  if(/\b(soft.?touch|rubberized)\b|gumírozott|puha tapintás/i.test(s))return 'soft-touch';
  return type==='ball'?'match-ball':'performance-fabric';
}
function findConflicts(s){
  const conflicts=[];
  const patternHits=PATTERNS.filter(([id,re])=>re.test(s)&&['vertical-stripes','horizontal-stripes','diagonal-stripes','chevron','checkerboard','dots','split','rings'].includes(id)).map(([id])=>id);
  if(new Set(patternHits).size>1)conflicts.push({field:'pattern',values:[...new Set(patternHits)]});
  const materials=[['glossy',/\b(glossy|shiny|polished)\b|fényes|csillogó/i],['matte',/\b(matte)\b|matt/i],['metallic',/\b(metallic|chrome)\b|fémes|króm/i],['soft-touch',/\b(soft.?touch|rubberized)\b|gumírozott|puha tapintás/i]].filter(([,re])=>re.test(s)).map(([id])=>id);
  if(new Set(materials).size>1)conflicts.push({field:'material',values:[...new Set(materials)]});
  return conflicts;
}
const HU_PATTERN={'vertical-stripes':'függőleges csíkos','horizontal-stripes':'vízszintes csíkos','diagonal-stripes':'átlós csíkos',chevron:'cikkcakk',checkerboard:'kockás',dots:'pöttyös','side-panels':'oldalpaneles',split:'két tónusú',geometric:'geometrikus',rings:'gyűrűs','panel-graphics':'panelgrafikás',solid:'letisztult'};
const HU_COLOUR={black:'fekete',white:'fehér',red:'piros',blue:'kék',navy:'sötétkék','sky blue':'világoskék',green:'zöld',lime:'lime',yellow:'sárga',gold:'arany',orange:'narancssárga',purple:'lila',pink:'rózsaszín',grey:'szürke',brown:'barna',custom:'egyedi'};
const STYLE_ACCENTS={retro:['#c5a46d','#8c3b32'],minimal:['#a3aab4','#d8dce2'],performance:['#a3e635','#f2d22e'],futuristic:['#36d7ff','#a855f7'],premium:['#c5a46d','#f0dfb5'],pro:['#a3e635','#c5a46d']};
function creativeDirections(plan){
  const accents=STYLE_ACCENTS[plan.style]||STYLE_ACCENTS.pro;
  const contrast=luminance(plan.baseColor)<.22?'dark-base':'light-base';
  return [
    {name:'Signature',pattern:plan.pattern,accent:plan.accentColor,trim:plan.trimColor,finish:plan.material,base:plan.baseColor,contrast,description:'Keeps your requested direction intact.'},
    {name:'Studio contrast',pattern:plan.pattern==='solid'?'side-panels':'solid',accent:accents[0],trim:accents[1],finish:'matte',base:plan.baseColor,contrast,description:'A restrained alternate with clearer panel separation.'},
    {name:'Matchday energy',pattern:plan.pattern==='diagonal-stripes'?'chevron':'diagonal-stripes',accent:accents[1],trim:accents[0],finish:plan.type==='ball'?'glossy':'performance-fabric',base:plan.baseColor,contrast,description:'A bolder matchday alternate with stronger visual movement.'}
  ];
}
function buildPlan(brief,type='kit'){
  const s=String(brief||'').trim();if(!s)throw new Error('Describe the design first.');
  const hu=isHU(s),cs=coloursIn(s),style=styleOf(s),pattern=patternOf(s);
  const dark=/\b(dark|stealth|aggressive|blackout)\b|sötét|agresszív/i.test(s);
  const baseColor=cs[0]?.hex||(dark?'#101318':'#f4f3ed');
  const accentColor=cs[1]?.hex||(luminance(baseColor)<.22?'#a3e635':'#172230');
  const trim=/\b(trim|piping|edge|outline|cuff)\b|szegély|passzé|gallér|ujjszegély/i.test(s);
  const width=/\b(thin|fine|subtle)\b|vékony|finom|visszafogott/i.test(s)?12:/\b(bold|wide|thick|strong)\b|vastag|széles|erőteljes/i.test(s)?48:28;
  const spacing=/\b(dense|many|tight)\b|sűrű|sok csík/i.test(s)?92:/\b(spaced|wide apart)\b|ritka|távoli/i.test(s)?250:165;
  const garment=type==='ball'?'jersey':/\b(shorts?|trunks?)\b|nadrág|sort/i.test(s)?'shorts':/\b(socks?|stockings?)\b|sportszár|zokni/i.test(s)?'socks':/\b(boots?|cleats?)\b|cipő|stoplis/i.test(s)?'boots':'jersey';
  const textMatch=s.match(/(?:text|write|number|felirat|szöveg|szám)\s*[:=]?\s*[“\"']([^”\"']{1,28})[”\"']/i);
  const material=materialOf(s,type),metallic=material==='metallic';
  const patternName=hu?(HU_PATTERN[pattern]||pattern):pattern.replaceAll('-',' ');
  const name=[cs.slice(0,2).map(c=>hu?(HU_COLOUR[c.name]||c.name):c.name).join(' / ')|| (hu?'Egyedi':'Custom'),patternName,type==='ball'?(hu?'labda':'ball'):(hu?'mez':'kit')].join(' · ');
  const conflicts=findConflicts(s);
  const questions=[];
  const explicitPattern=PATTERNS.some(([,re])=>re.test(s))||/\b(clean|minimal|plain|solid|simple)\b|egyszerű|letisztult|egyszínű|minta nélkül|aggressive|dynamic|fast|speed|agresszív|dinamikus|sebesség/i.test(s);
  const explicitStyle=/\b(retro|classic|vintage|stealth|minimal|clean|elegant|aggressive|bold|dynamic|speed|futuristic|cyber|neon|luxury|premium|elite)\b|retró|retro|klasszikus|régi iskola|letisztult|elegáns|visszafogott|agresszív|dinamikus|gyors|erőteljes|futurisztikus|neon|jövő|luxus|prémium|elit/i.test(s);
  const explicitMaterial=/\b(glossy|shiny|polished|matte|metallic|chrome|soft.?touch|rubberized)\b|fényes|csillogó|matt|fémes|króm|gumírozott|puha tapintás/i.test(s);
  const explicitGarment=/\b(shorts?|trunks?|socks?|stockings?|boots?|cleats?|jersey|shirt)\b|nadrág|sort|sportszár|zokni|cipő|stoplis|mez/i.test(s);
  const singleGarmentIntent=/\b(only|just|change only|edit only|this garment only)\b|\b(csak|kizárólag)\s+(?:a\s+)?(?:mezt|felsőt|nadrágot|sortot|sportszárat|zoknit|cipőt|stoplist)\b|(?:csak|kizárólag)\s+(?:ezt\s+)?(?:a\s+)?ruhadarabot/i.test(s);
  const garmentColors=garmentColoursIn(s);
  if(!cs.length)questions.push(hu?'Nem adtál meg konkrét színt; kontrasztos alappalettát választottam.':'No exact colours specified; I selected a high-contrast palette.');
  if(!explicitPattern)questions.push(hu?'A mintát még nem határoztad meg; alapértelmezett mintát választottam.':'The pattern is unspecified; I selected a default pattern.');
  for(const conflict of conflicts)questions.push(hu?conflict.field==='pattern'?'Több, egymást kizáró mintát adtál meg. Melyiket részesíted előnyben?':'Több, egymásnak ellentmondó anyaghatást adtál meg. Melyiket válasszam?':conflict.field==='pattern'?'You specified multiple primary patterns. Which one should take priority?':'You specified conflicting material finishes. Which one should take priority?');
  const signalCount=[cs.length>0,explicitPattern,explicitStyle,explicitMaterial,explicitGarment,/\b(thin|fine|subtle|bold|wide|thick|strong|dense|many|tight|spaced)\b|vékony|finom|vastag|széles|sűrű|ritka/i.test(s)].filter(Boolean).length;
  const confidence=clamp(.34+Math.min(signalCount,5)*.12-conflicts.length*.14,.34,.94);
  const draft={style,pattern,baseColor,accentColor,trimColor:cs[2]?.hex||accentColor,material,type};
  return {
    creativeDirections:creativeDirections(draft),
    designName:name.slice(0,64),summary:hu?'A kérésből szín-, minta-, stílus- és anyagprofilt állítottam össze.':'Built an editable colour, pattern, style and material profile from your brief.',
    garment,garmentColors,baseColor,accentColor,pattern,stripeWidth:width,stripeSpacing:spacing,trim,trimColor:cs[2]?.hex||accentColor,
    seamColor:/\b(black seams?|dark seams?)\b|fekete varrás|sötét varrás/i.test(s)?'#17191d':accentColor,
    roughness:material==='glossy'?.26:material==='matte'?.9:material==='soft-touch'?.82:.58,
    metalness:metallic?.22:.02,decalText:textMatch?.[1]||'',style,material,confidence,questions,conflicts,needsClarification:conflicts.length>0||confidence<.55,
    detected:{language:hu?'hu':'en',colours:cs.map(c=>c.hex),pattern,style,material,garment,garmentExplicit:singleGarmentIntent,garmentColors,signals:signalCount}
  };
}
export function prependPitchyHistory(items,entry,limit=8){
  const safeLimit=clamp(Math.floor(Number(limit)||8),1,50);
  return [entry,...(Array.isArray(items)?items:[])].filter(Boolean).slice(0,safeLimit);
}
export function analysePitchyBrief(brief,type='kit'){return buildPlan(brief,type);}
export function mountPitchy({type='kit',onApply,host:hostOverride}={}){
  const host=hostOverride||document.querySelector('#panelContent')||document.querySelector('#panel');
  if(!host||typeof onApply!=='function')return null;
  if(host.querySelector('.p11-pitchy-card'))return null;
  const style=document.createElement('style');
  style.textContent='.p11-pitchy-card{margin-top:14px;padding:12px;border:1px solid #8b744d66;border-radius:12px;background:linear-gradient(145deg,#1b2025,#111820);display:grid;gap:8px}.p11-pitchy-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.p11-pitchy-title{font-size:10px;font-weight:850;letter-spacing:.15em;color:#e0c18a}.p11-pitchy-tag{font-size:8px;color:#a3e635}.p11-pitchy-prompt{width:100%;min-height:82px;resize:vertical;padding:10px;border:1px solid #354457;border-radius:9px;background:#0b1119;color:#edf3f8;font:inherit;font-size:11px;line-height:1.5}.p11-pitchy-button{min-height:39px;padding:8px 11px;border:1px solid #b9975c;border-radius:9px;background:linear-gradient(135deg,#c5a46d,#8c6c3c);color:#111;font-size:10px;font-weight:850;cursor:pointer}.p11-pitchy-button:disabled{opacity:.6}.p11-pitchy-status,.p11-pitchy-note{font-size:9px;line-height:1.5;color:#aebbc9}.p11-pitchy-status[data-state=error]{color:#fca5a5}.p11-pitchy-status[data-state=success]{color:#a3e635}.p11-pitchy-chips{display:flex;flex-wrap:wrap;gap:6px}.p11-pitchy-chip{border:1px solid #354457;border-radius:20px;padding:6px 9px;background:#111b26;color:#cbd5e1;font-size:9px}';
  document.head.appendChild(style);
  const card=document.createElement('section');card.className='p11-pitchy-card';
  card.innerHTML='<div class="p11-pitchy-head"><span class="p11-pitchy-title">🤖 PITCHY DESIGN ROBOT</span><span class="p11-pitchy-tag">LOCAL · OFFLINE</span></div><textarea class="p11-pitchy-prompt" maxlength="700" placeholder="'+(type==='ball'?'Describe your match ball design…':'Describe your kit design…')+'"></textarea><div class="p11-pitchy-chips"><button class="p11-pitchy-chip" type="button">Premium</button><button class="p11-pitchy-chip" type="button">Retro</button><button class="p11-pitchy-chip" type="button">Futuristic</button><button class="p11-pitchy-chip" type="button">Performance</button></div><button class="p11-pitchy-button" type="button">Ask PITCHY</button><div class="p11-pitchy-status" aria-live="polite">Ready · English interface</div><div class="p11-pitchy-note">No API · No network · No subscription. Hungarian understanding stays hidden.</div>';
  host.appendChild(card);
  const prompt=card.querySelector('.p11-pitchy-prompt'),button=card.querySelector('.p11-pitchy-button'),status=card.querySelector('.p11-pitchy-status');
  const controls=document.createElement('div');controls.className='p11-pitchy-history-controls';
  controls.innerHTML='<button class="p11-pitchy-chip" type="button" data-action="history">Design history</button><button class="p11-pitchy-chip" type="button" data-action="undo" disabled>Undo last</button>';
  const historyPanel=document.createElement('div');historyPanel.className='p11-pitchy-history';historyPanel.hidden=true;
  card.insertBefore(controls,card.querySelector('.p11-pitchy-note'));card.insertBefore(historyPanel,card.querySelector('.p11-pitchy-note'));
  style.textContent += '.p11-pitchy-history-controls{display:flex;gap:7px;flex-wrap:wrap}.p11-pitchy-history{display:grid;gap:6px;padding:8px;border:1px solid #354457;border-radius:9px;background:#0b1119}.p11-pitchy-history[hidden]{display:none}.p11-pitchy-history-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:9px;color:#cbd5e1}.p11-pitchy-history-row button{flex-shrink:0}.p11-pitchy-empty{font-size:9px;color:#94a3b8}';
  const HISTORY_KEY='p11-pitchy-history',ACTIVE_KEY='p11-pitchy-active',UNDO_KEY='p11-pitchy-undo';
  const read=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key));return value??fallback;}catch{return fallback;}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
  const getHistory=()=>{const value=read(HISTORY_KEY,[]);return Array.isArray(value)?value:[];};
  const refreshHistory=()=>{
    const items=getHistory();historyPanel.replaceChildren();
    if(!items.length){const empty=document.createElement('div');empty.className='p11-pitchy-empty';empty.textContent='No saved designs yet.';historyPanel.appendChild(empty);}
    for(const item of items){
      if(!item?.plan)continue;
      const row=document.createElement('div');row.className='p11-pitchy-history-row';
      const label=document.createElement('span');label.textContent=(item.name||'Untitled design')+' · '+new Date(item.at||0).toLocaleString();
      const restore=document.createElement('button');restore.type='button';restore.className='p11-pitchy-chip';restore.textContent='Restore';
      restore.addEventListener('click',async()=>{
        restore.disabled=true;
        try{
          const current=read(ACTIVE_KEY,null),stack=read(UNDO_KEY,[]);
          await onApply(item.plan);
          if(current)write(UNDO_KEY,prependPitchyHistory(stack,current,8));write(ACTIVE_KEY,{plan:item.plan,name:item.name,at:Date.now(),type:item.type});
          status.textContent='Restored · '+(item.name||'Saved design');status.dataset.state='success';refreshHistory();
        }catch(error){status.textContent=error?.message||'Could not restore this design.';status.dataset.state='error';}
        finally{restore.disabled=false;}
      });
      row.append(label,restore);historyPanel.appendChild(row);
    }
    const undo=controls.querySelector('[data-action="undo"]');undo.disabled=!read(UNDO_KEY,[]).length;
  };
  const appendText=value=>{prompt.value=(prompt.value.trim()?prompt.value.trim()+', ':'')+value;prompt.focus();};
  card.querySelectorAll('.p11-pitchy-chip').forEach(chip=>{if(!chip.dataset.action)chip.addEventListener('click',()=>appendText(chip.textContent.toLowerCase()+' style'));});
  controls.querySelector('[data-action="history"]').addEventListener('click',()=>{historyPanel.hidden=!historyPanel.hidden;if(!historyPanel.hidden)refreshHistory();});
  controls.querySelector('[data-action="undo"]').addEventListener('click',async()=>{
    const stack=read(UNDO_KEY,[]);if(!Array.isArray(stack)||!stack.length)return;
    const previous=stack[0];controls.querySelector('[data-action="undo"]').disabled=true;
    try{
      await onApply(previous.plan);write(ACTIVE_KEY,previous);write(UNDO_KEY,stack.slice(1));
      status.textContent='Undo complete · '+(previous.name||'Previous design');status.dataset.state='success';refreshHistory();
    }catch(error){status.textContent=error?.message||'Undo failed; current design was not changed.';status.dataset.state='error';controls.querySelector('[data-action="undo"]').disabled=false;}
  });
  button.addEventListener('click',async()=>{
    button.disabled=true;button.textContent='Designing…';status.dataset.state='';status.textContent='Analysing colours, visual style, pattern and finish locally…';
    try{
      const plan=buildPlan(prompt.value,type),current=read(ACTIVE_KEY,null),undo=read(UNDO_KEY,[]);
      await onApply(plan);
      if(current)write(UNDO_KEY,[current,...(Array.isArray(undo)?undo:[])].slice(0,8));
      const entry={at:Date.now(),type,name:plan.designName,brief:prompt.value.slice(0,240),plan};
      write(ACTIVE_KEY,{plan,name:plan.designName,at:entry.at,type});
      write(HISTORY_KEY,prependPitchyHistory(getHistory(),entry,8));
      const pct=Math.round(plan.confidence*100);
      status.textContent=plan.designName+' · '+pct+'% confidence'+(plan.questions.length?' · '+plan.questions[0]:'');
      status.dataset.state='success';refreshHistory();
    }catch(error){status.textContent=error?.message||'Could not create the design.';status.dataset.state='error';}
    finally{button.disabled=false;button.textContent='Ask PITCHY';}
  });
  refreshHistory();
  return {element:card,setStatus(message){status.textContent=message;}};
}
