const PATTERNS = [
  ['vertical-stripes', /\b(vertical stripes?|striped|stripes?)\b|függőleges csík|csíkos|csíkok/],
  ['horizontal-stripes', /\b(horizontal stripes?)\b|vízszintes csík/],
  ['diagonal-stripes', /\b(diagonal stripes?|slanted stripes?)\b|átlós csík|ferde csík/],
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
function pick(re,s,fallback){const m=s.match(re);return m?m[1]||m[0]:fallback;}
function patternOf(s){
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
  if(/\b(glossy|shiny|polished)\b|fényes|csillogó/i.test(s))return 'glossy';
  if(/\b(matte|matte finish)\b|matt/i.test(s))return 'matte';
  if(/\b(metallic|chrome)\b|fémes|króm/i.test(s))return 'metallic';
  if(/\b(soft.?touch|rubberized)\b|gumírozott|puha tapintás/i.test(s))return 'soft-touch';
  return type==='ball'?'match-ball':'performance-fabric';
}
const HU_PATTERN={'vertical-stripes':'függőleges csíkos','horizontal-stripes':'vízszintes csíkos','diagonal-stripes':'átlós csíkos',chevron:'cikkcakk',checkerboard:'kockás',dots:'pöttyös','side-panels':'oldalpaneles',split:'két tónusú',geometric:'geometrikus',rings:'gyűrűs','panel-graphics':'panelgrafikás',solid:'letisztult'};
const HU_COLOUR={black:'fekete',white:'fehér',red:'piros',blue:'kék',navy:'sötétkék','sky blue':'világoskék',green:'zöld',lime:'lime',yellow:'sárga',gold:'arany',orange:'narancssárga',purple:'lila',pink:'rózsaszín',grey:'szürke',brown:'barna',custom:'egyedi'};
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
  const questions=[];
  if(!cs.length)questions.push(hu?'Nem adtál meg konkrét színt; kontrasztos alappalettát választottam.':'No exact colours specified; I selected a high-contrast palette.');
  if(!PATTERNS.some(([,re])=>re.test(s))&&!/minimal|clean|plain|solid|simple|letisztult|egyszínű/i.test(s))questions.push(hu?'A mintát a stílusleírás alapján választottam.':'Pattern selected from the overall style description.');
  const confidence=clamp(.48+Math.min(cs.length,3)*.09+(PATTERNS.some(([,re])=>re.test(s))?0.15:0)+(style!=='pro'?.08:0),.4,.96);
  return {
    designName:name.slice(0,64),summary:hu?'A kérésből szín-, minta-, stílus- és anyagprofilt állítottam össze.':'Built an editable colour, pattern, style and material profile from your brief.',
    garment,baseColor,accentColor,pattern,stripeWidth:width,stripeSpacing:spacing,trim,trimColor:cs[2]?.hex||accentColor,
    seamColor:/\b(black seams?|dark seams?)\b|fekete varrás|sötét varrás/i.test(s)?'#17191d':accentColor,
    roughness:material==='glossy'?.26:material==='matte'?.9:material==='soft-touch'?.82:.58,
    metalness:metallic?.22:.02,decalText:textMatch?.[1]||'',style,material,confidence,questions,
    detected:{language:hu?'hu':'en',colours:cs.map(c=>c.hex),pattern,style,material,garment}
  };
}
export function analysePitchyBrief(brief,type='kit'){return buildPlan(brief,type);}
export function mountPitchy({type='kit',onApply}={}){
  const host=document.querySelector('#panelContent')||document.querySelector('#panel');
  if(!host||typeof onApply!=='function')return null;
  if(host.querySelector('.p11-pitchy-card'))return null;
  const style=document.createElement('style');
  style.textContent='.p11-pitchy-card{margin-top:14px;padding:12px;border:1px solid #8b744d66;border-radius:12px;background:linear-gradient(145deg,#1b2025,#111820);display:grid;gap:8px}.p11-pitchy-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.p11-pitchy-title{font-size:10px;font-weight:850;letter-spacing:.15em;color:#e0c18a}.p11-pitchy-tag{font-size:8px;color:#a3e635}.p11-pitchy-prompt{width:100%;min-height:82px;resize:vertical;padding:10px;border:1px solid #354457;border-radius:9px;background:#0b1119;color:#edf3f8;font:inherit;font-size:11px;line-height:1.5}.p11-pitchy-button{min-height:39px;padding:8px 11px;border:1px solid #b9975c;border-radius:9px;background:linear-gradient(135deg,#c5a46d,#8c6c3c);color:#111;font-size:10px;font-weight:850;cursor:pointer}.p11-pitchy-button:disabled{opacity:.6}.p11-pitchy-status,.p11-pitchy-note{font-size:9px;line-height:1.5;color:#aebbc9}.p11-pitchy-status[data-state=error]{color:#fca5a5}.p11-pitchy-status[data-state=success]{color:#a3e635}.p11-pitchy-chips{display:flex;flex-wrap:wrap;gap:6px}.p11-pitchy-chip{border:1px solid #354457;border-radius:20px;padding:6px 9px;background:#111b26;color:#cbd5e1;font-size:9px}';
  document.head.appendChild(style);
  const card=document.createElement('section');card.className='p11-pitchy-card';
  card.innerHTML='<div class="p11-pitchy-head"><span class="p11-pitchy-title">🤖 PITCHY DESIGN ROBOT</span><span class="p11-pitchy-tag">LOCAL · OFFLINE</span></div><textarea class="p11-pitchy-prompt" maxlength="700" placeholder="'+(type==='ball'?'Describe your match ball design…':'Describe your kit design…')+'"></textarea><div class="p11-pitchy-chips"><button class="p11-pitchy-chip" type="button">Premium</button><button class="p11-pitchy-chip" type="button">Retro</button><button class="p11-pitchy-chip" type="button">Futuristic</button><button class="p11-pitchy-chip" type="button">Performance</button></div><button class="p11-pitchy-button" type="button">Ask PITCHY</button><div class="p11-pitchy-status" aria-live="polite">Ready · English interface</div><div class="p11-pitchy-note">No API · No network · No subscription. Hungarian understanding stays hidden.</div>';
  host.appendChild(card);
  const prompt=card.querySelector('.p11-pitchy-prompt'),button=card.querySelector('.p11-pitchy-button'),status=card.querySelector('.p11-pitchy-status');
  const appendText=value=>{prompt.value=(prompt.value.trim()?prompt.value.trim()+', ':'')+value;prompt.focus();};
  card.querySelectorAll('.p11-pitchy-chip').forEach(chip=>chip.addEventListener('click',()=>appendText(chip.textContent.toLowerCase()+' style')));
  button.addEventListener('click',async()=>{
    button.disabled=true;button.textContent='Designing…';status.dataset.state='';status.textContent='Analysing colours, visual style, pattern and finish locally…';
    try{
      const plan=buildPlan(prompt.value,type);await onApply(plan);
      const pct=Math.round(plan.confidence*100);
      status.textContent=plan.designName+' · '+pct+'% brief match'+(plan.questions.length?' · '+plan.questions[0]:'');
      status.dataset.state='success';
      try{const history=JSON.parse(localStorage.getItem('p11-pitchy-history')||'[]');history.unshift({at:Date.now(),type,name:plan.designName,brief:prompt.value.slice(0,240),plan});localStorage.setItem('p11-pitchy-history',JSON.stringify(history.slice(0,8)));}catch{}
    }catch(error){status.textContent=error?.message||'Could not create the design.';status.dataset.state='error';}
    finally{button.disabled=false;button.textContent='Ask PITCHY';}
  });
  return {element:card,setStatus(message){status.textContent=message;}};
}
