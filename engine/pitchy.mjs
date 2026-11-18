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
  ['black', '#101318', /\b(black|jet black|charcoal)\b|fekete|szénfekete/],
  ['white', '#f4f3ed', /\b(white|ivory)\b|fehér|elefántcsont/],
  ['red', '#d62935', /\b(red|crimson|scarlet)\b|piros|vörös|bordó/],
  ['blue', '#1769aa', /\b(blue|royal blue)\b|kék|királykék/],
  ['navy', '#142743', /\b(navy|midnight blue)\b|sötétkék|tengerészkék/],
  ['sky blue', '#55b9e9', /\b(sky blue|light blue)\b|világoskék|égkék/],
  ['green', '#168653', /\b(green|forest green)\b|zöld|sötétzöld/],
  ['lime', '#a3e635', /\b(lime|neon green)\b|lime|neonzöld|élénkzöld/],
  ['yellow', '#f2d22e', /\b(yellow|golden yellow)\b|sárga|citromsárga/],
  ['gold', '#c5a46d', /\b(gold|golden)\b|arany|aranyszínű/],
  ['orange', '#ef7627', /\b(orange)\b|narancs|narancssárga/],
  ['purple', '#7545a6', /\b(purple|violet)\b|lila|ibolya/],
  ['pink', '#ed78a8', /\b(pink|magenta)\b|rózsaszín|pink/],
  ['grey', '#858b94', /\b(gray|grey|silver)\b|szürke|ezüst/],
  ['brown', '#79513a', /\b(brown)\b|barna/]
];

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const hexValid = value => /^#[0-9a-f]{6}$/i.test(value || '');
const isHungarian = text => /[őűáéíóöüŐŰÁÉÍÓÖÜ]/.test(text) || /\b(készíts|csinálj|legyen|kérek|fekete|fehér|piros|kék|zöld|arany|mez|labda|csíkos|mintás)\b/i.test(text);

function luminance(hex) {
  const rgb = hex.match(/[a-f0-9]{2}/gi).map(v => parseInt(v, 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
}
function contrastAccent(base) {
  return luminance(base) < .22 ? '#a3e635' : '#172230';
}
function extractColours(text) {
  const found = [];
  for (const [name, hex, re] of COLOURS) {
    const match = re.exec(text);
    if (match) found.push({ name, hex, index: match.index });
  }
  for (const match of text.matchAll(/#[0-9a-f]{6}/gi)) found.push({ name: 'custom', hex: match[0], index: match.index });
  return found.sort((a, b) => a.index - b.index).filter((item, index, all) => all.findIndex(other => other.hex.toLowerCase() === item.hex.toLowerCase()) === index);
}
function detectPattern(text) {
  for (const [pattern, re] of PATTERNS) if (re.test(text)) return pattern;
  if (/\b(clean|minimal|plain|solid|simple)\b|egyszerű|letisztult|egyszínű|minta nélkül/i.test(text)) return 'solid';
  if (/\b(aggressive|dynamic|fast|speed)\b|agresszív|dinamikus|sebesség/i.test(text)) return 'diagonal-stripes';
  return 'panel-graphics';
}
function detectGarment(text, type) {
  if (type === 'ball') return 'jersey';
  if (/\b(shorts?|trunks?)\b|nadrág|sort/i.test(text)) return 'shorts';
  if (/\b(socks?|stockings?)\b|sportszár|zokni/i.test(text)) return 'socks';
  if (/\b(boots?|cleats?)\b|cipő|stoplis/i.test(text)) return 'boots';
  return 'jersey';
}
function designLabel(text, pattern, colours, type) {
  const hu = isHungarian(text);
  const huColours = { black: 'fekete', white: 'fehér', red: 'piros', blue: 'kék', navy: 'sötétkék', 'sky blue': 'világoskék', green: 'zöld', lime: 'lime', yellow: 'sárga', gold: 'arany', orange: 'narancssárga', purple: 'lila', pink: 'rózsaszín', grey: 'szürke', brown: 'barna', custom: 'egyedi' };
  const colourNames = colours.slice(0, 2).map(c => hu ? (huColours[c.name] || c.name) : c.name).join(' / ');
  const patternNames = {
    'vertical-stripes': hu ? 'függőleges csíkos' : 'vertical stripe',
    'horizontal-stripes': hu ? 'vízszintes csíkos' : 'horizontal stripe',
    'diagonal-stripes': hu ? 'átlós csíkos' : 'diagonal stripe',
    chevron: hu ? 'cikkcakk' : 'chevron',
    checkerboard: hu ? 'kockás' : 'checkerboard',
    dots: hu ? 'pöttyös' : 'dotted',
    'side-panels': hu ? 'oldalpaneles' : 'side-panel',
    split: hu ? 'két tónusú' : 'two-tone',
    geometric: hu ? 'geometrikus' : 'geometric',
    rings: hu ? 'gyűrűs' : 'ring',
    'panel-graphics': hu ? 'panelgrafikás' : 'panel graphic',
    solid: hu ? 'letisztult' : 'clean'
  };
  return [colourNames || (hu ? 'Egyedi' : 'Custom'), patternNames[pattern], type === 'ball' ? (hu ? 'labda' : 'ball') : (hu ? 'mez' : 'kit')].filter(Boolean).join(' · ');
}

function buildPlan(brief, type) {
  const text = String(brief || '').trim();
  if (!text) throw new Error('Add a design brief first.');
  const hu = isHungarian(text);
  const colours = extractColours(text);
  let baseColor = colours[0]?.hex || (/\b(dark|stealth|aggressive|blackout)\b|sötét|agresszív|fekete/i.test(text) ? '#101318' : '#f4f3ed');
  let accentColor = colours[1]?.hex || contrastAccent(baseColor);
  if (colours.length === 1 && luminance(baseColor) > .7) accentColor = '#172230';
  const pattern = detectPattern(text);
  const width = /\b(thin|fine|subtle)\b|vékony|finom|visszafogott/i.test(text) ? 12 : /\b(bold|wide|thick|strong)\b|vastag|széles|erőteljes/i.test(text) ? 48 : 28;
  const spacing = /\b(dense|many|tight)\b|sűrű|sok csík/i.test(text) ? 92 : /\b(spaced|wide apart)\b|ritka|távoli/i.test(text) ? 250 : 165;
  const trim = /\b(trim|piping|edge|outline|cuff)\b|szegély|passzé|gallér|ujjszegély/i.test(text);
  const garment = detectGarment(text, type);
  const decalMatch = text.match(/(?:text|write|number|felirat|szöveg|szám)\s*[:=]?\s*[“"']([^”"']{1,28})[”"']/i);
  return {
    designName: designLabel(text, pattern, colours, type).slice(0, 64),
    summary: hu
      ? 'A PITCHY helyben értelmezte a kérést, és összeállította a szerkeszthető szín-, minta- és anyagbeállításokat.'
      : 'PITCHY interpreted the brief locally and prepared editable colour, pattern and material settings.',
    garment, baseColor, accentColor, pattern,
    stripeWidth: width, stripeSpacing: spacing, trim,
    trimColor: colours[2]?.hex || accentColor,
    seamColor: /\b(black seams?|dark seams?)\b|fekete varrás|sötét varrás/i.test(text) ? '#17191d' : accentColor,
    roughness: type === 'ball' ? (/\b(glossy|shiny|polished)\b|fényes|csillogó/i.test(text) ? .28 : .58) : .78,
    metalness: /\b(metallic|chrome)\b|fémes|króm/i.test(text) ? .22 : /\b(matte)\b|matt/i.test(text) ? 0 : .02,
    decalText: decalMatch?.[1] || ''
  };
}

let stylesAdded = false;
function addStyles() {
  if (stylesAdded) return;
  stylesAdded = true;
  const style = document.createElement('style');
  style.textContent = `
    .p11-pitchy-card{margin-top:14px;padding:12px;border:1px solid #8b744d66;border-radius:12px;background:linear-gradient(145deg,#1b2025,#111820);display:grid;gap:8px}
    .p11-pitchy-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .p11-pitchy-title{font-size:10px;font-weight:850;letter-spacing:.15em;color:#e0c18a;text-transform:uppercase}
    .p11-pitchy-tag{font-size:8px;color:#a3e635;letter-spacing:.08em}
    .p11-pitchy-prompt{width:100%;min-height:82px;resize:vertical;padding:10px;border:1px solid #354457;border-radius:9px;background:#0b1119;color:#edf3f8;font:inherit;font-size:11px;line-height:1.5}
    .p11-pitchy-button{min-height:39px;padding:8px 11px;border:1px solid #b9975c;border-radius:9px;background:linear-gradient(135deg,#c5a46d,#8c6c3c);color:#111;font-size:10px;font-weight:850;cursor:pointer}
    .p11-pitchy-status{font-size:9px;line-height:1.5;color:#aebbc9;min-height:14px}
    .p11-pitchy-status[data-state="error"]{color:#fca5a5}.p11-pitchy-status[data-state="success"]{color:#a3e635}
    .p11-pitchy-note{font-size:8px;line-height:1.45;color:#8291a3}
  `;
  document.head.appendChild(style);
}

export function mountPitchy({ type = 'kit', onApply } = {}) {
  addStyles();
  const host = document.querySelector('#panelContent') || document.querySelector('#panel');
  if (!host || typeof onApply !== 'function') return null;
  const card = document.createElement('section');
  card.className = 'p11-pitchy-card';
  card.innerHTML = `
    <div class="p11-pitchy-head"><span class="p11-pitchy-title">🤖 PITCHY DESIGN ROBOT</span><span class="p11-pitchy-tag">LOCAL · OFFLINE</span></div>
    <textarea class="p11-pitchy-prompt" maxlength="700" placeholder="${type === 'ball' ? 'Describe your match ball design…' : 'Describe your kit design…'}"></textarea>
    <button class="p11-pitchy-button" type="button">Ask PITCHY</button>
    <div class="p11-pitchy-status" aria-live="polite">Ready</div>
    <div class="p11-pitchy-note">No API key · No network request · No subscription. Your brief is processed locally in this editor.</div>`;
  host.appendChild(card);
  const prompt = card.querySelector('.p11-pitchy-prompt');
  const button = card.querySelector('.p11-pitchy-button');
  const status = card.querySelector('.p11-pitchy-status');
  button.addEventListener('click', async () => {
    try {
      const plan = buildPlan(prompt.value, type);
      button.disabled = true;
      button.textContent = 'Designing…';
      status.textContent = 'Interpreting design brief locally…';
      await onApply(plan);
      status.textContent = plan.designName + ' · ' + plan.summary;
      status.dataset.state = 'success';
    } catch (error) {
      status.textContent = error?.message || 'Could not create the design.';
      status.dataset.state = 'error';
    } finally {
      button.disabled = false;
      button.textContent = 'Ask PITCHY';
    }
  });
  return { element: card, setStatus(message) { status.textContent = message; } };
}
