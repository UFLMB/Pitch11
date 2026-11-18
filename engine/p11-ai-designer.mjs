const API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const API_REVISION = '2026-05-20';
const MODEL = 'gemini-3.8-flash';
const KEY_NAME = 'p11-gemini-api-key-session';

const SCHEMA = {
  type: 'object',
  properties: {
    design_name: { type: 'string' },
    summary: { type: 'string' },
    garment: { type: 'string', enum: ['jersey', 'shorts', 'socks', 'boots'] },
    base_color: { type: 'string', description: 'Hex colour, #RRGGBB' },
    accent_color: { type: 'string', description: 'Hex colour, #RRGGBB' },
    pattern: { type: 'string', enum: ['solid', 'vertical-stripes', 'horizontal-stripes', 'diagonal-stripes', 'chevron', 'checkerboard', 'dots', 'side-panels', 'split', 'geometric', 'rings', 'panel-graphics'] },
    stripe_width: { type: 'integer' },
    stripe_spacing: { type: 'integer' },
    trim: { type: 'boolean' },
    trim_color: { type: 'string', description: 'Hex colour, #RRGGBB' },
    seam_color: { type: 'string', description: 'Hex colour, #RRGGBB' },
    roughness: { type: 'number' },
    metalness: { type: 'number' },
    decal_text: { type: 'string' }
  },
  required: ['design_name', 'summary', 'garment', 'base_color', 'accent_color', 'pattern', 'stripe_width', 'stripe_spacing', 'trim', 'trim_color', 'seam_color', 'roughness', 'metalness', 'decal_text']
};

let stylesAdded = false;
function addStyles() {
  if (stylesAdded) return;
  stylesAdded = true;
  const style = document.createElement('style');
  style.textContent = `
    .p11-ai-card{margin-top:14px;padding:12px;border:1px solid #8b744d66;border-radius:12px;background:linear-gradient(145deg,#1b2025,#111820);display:grid;gap:8px}
    .p11-ai-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .p11-ai-title{font-size:10px;font-weight:850;letter-spacing:.15em;color:#e0c18a;text-transform:uppercase}
    .p11-ai-model{font-size:8px;color:#91a0b2;letter-spacing:.08em}
    .p11-ai-prompt{width:100%;min-height:82px;resize:vertical;padding:10px;border:1px solid #354457;border-radius:9px;background:#0b1119;color:#edf3f8;font:11px/1.5 inherit}
    .p11-ai-actions{display:grid;grid-template-columns:1fr auto;gap:7px}
    .p11-ai-button{min-height:39px;padding:8px 11px;border:1px solid #b9975c;border-radius:9px;background:linear-gradient(135deg,#c5a46d,#8c6c3c);color:#111;font-size:10px;font-weight:850;cursor:pointer}
    .p11-ai-button:disabled{opacity:.55;cursor:wait}
    .p11-ai-gear{min-width:40px;border:1px solid #354457;border-radius:9px;background:#141e29;color:#e0c18a;font-size:15px}
    .p11-ai-status{font-size:9px;line-height:1.5;color:#aebbc9;min-height:14px}
    .p11-ai-status[data-state="error"]{color:#fca5a5}.p11-ai-status[data-state="success"]{color:#a3e635}
    .p11-ai-settings{display:none;padding:9px;border:1px solid #354457;border-radius:9px;background:#0b1119;gap:7px}
    .p11-ai-settings.open{display:grid}
    .p11-ai-settings label{display:grid;gap:5px;color:#cbd5e1;font-size:9px}
    .p11-ai-key{width:100%;padding:9px;border:1px solid #354457;border-radius:8px;background:#111b26;color:#edf3f8;font-size:10px}
    .p11-ai-note{font-size:8px;line-height:1.45;color:#8291a3}
  `;
  document.head.appendChild(style);
}

function outputText(interaction) {
  if (typeof interaction?.output_text === 'string' && interaction.output_text) return interaction.output_text;
  const blocks = [];
  for (const step of interaction?.steps || []) {
    if (step.type !== 'model_output') continue;
    for (const part of step.content || []) if (part.type === 'text' && part.text) blocks.push(part.text);
  }
  return blocks.join('\n').trim();
}

function normalisePlan(value, type) {
  const allowed = new Set(['solid','vertical-stripes','horizontal-stripes','diagonal-stripes','chevron','checkerboard','dots','side-panels','split','geometric','rings','panel-graphics']);
  const hex = v => /^#[0-9a-f]{6}$/i.test(v || '') ? v : '#f4f3ed';
  const number = (v, min, max, fallback) => Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Number(v))) : fallback;
  return {
    designName: String(value.design_name || 'PITCH 11 Custom Design').slice(0, 64),
    summary: String(value.summary || 'AI-generated design plan').slice(0, 360),
    garment: ['jersey','shorts','socks','boots'].includes(value.garment) ? value.garment : 'jersey',
    baseColor: hex(value.base_color),
    accentColor: hex(value.accent_color),
    pattern: allowed.has(value.pattern) ? value.pattern : 'solid',
    stripeWidth: Math.round(number(value.stripe_width, 4, 180, 32)),
    stripeSpacing: Math.round(number(value.stripe_spacing, 24, 420, 180)),
    trim: Boolean(value.trim),
    trimColor: hex(value.trim_color),
    seamColor: hex(value.seam_color),
    roughness: number(value.roughness, 0.1, 1, type === 'ball' ? 0.58 : 0.78),
    metalness: number(value.metalness, 0, 0.35, 0.02),
    decalText: String(value.decal_text || '').slice(0, 28)
  };
}

async function generate(prompt, type, apiKey) {
  const kind = type === 'ball' ? 'professional football match ball' : 'football player kit texture';
  const instructions = [
    'You are PITCH 11 Design Intelligence, an expert sports-equipment art director and production texture designer.',
    'Interpret the user brief semantically, not by keyword matching. Resolve implied colours, visual hierarchy, contrast, pattern density, professional sports-brand aesthetics and practical manufacturability.',
    'Return a concrete, restrained, coherent design plan that can be rendered procedurally into the existing UV texture editor. Never invent a real club crest or trademark. Use PITCH 11 only if requested.',
    'Choose exact HEX colours. Keep contrast high and avoid excessive decoration. If the user asks for realism, prefer subtle materials and disciplined graphics.',
    'For kit designs choose the correct garment from the brief; for ball designs set garment to jersey because the field is required by the common schema.',
    'Use only supported pattern enum values. Keep stripe width and spacing within practical ranges. Set trim only when it improves the brief.',
    'Return JSON only according to the supplied schema.'
  ].join(' ');
  const body = {
    model: MODEL,
    store: false,
    input: instructions + '\n\nDESIGN TARGET: ' + kind + '\nUSER BRIEF: ' + prompt,
    response_format: { type: 'text', mime_type: 'application/json', schema: SCHEMA }
  };
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey, 'Api-Revision': API_REVISION },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || 'Gemini API request failed (' + response.status + ')');
  const raw = outputText(data);
  if (!raw) throw new Error('The AI returned no design plan.');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('The AI response was not valid structured JSON. Try again.'); }
  return normalisePlan(parsed, type);
}

export function mountP11AIDesigner({ type = 'kit', onApply } = {}) {
  addStyles();
  const host = document.querySelector('#panelContent') || document.querySelector('#panel');
  if (!host || typeof onApply !== 'function') return null;
  const card = document.createElement('section');
  card.className = 'p11-ai-card';
  card.innerHTML = `
    <div class="p11-ai-head"><span class="p11-ai-title">✦ PITCH 11 DESIGN INTELLIGENCE</span><span class="p11-ai-model">GEMINI 3.8 FLASH</span></div>
    <textarea class="p11-ai-prompt" maxlength="700" placeholder="${type === 'ball' ? 'Describe the match ball: colours, panel graphics, seams, finish and PITCH 11 identity…' : 'Describe the kit: colours, pattern, trim, garment and overall design language…'}"></textarea>
    <div class="p11-ai-actions"><button class="p11-ai-button" type="button">Analyse &amp; apply design</button><button class="p11-ai-gear" type="button" aria-label="AI settings">⚙</button></div>
    <div class="p11-ai-status" aria-live="polite">AI is ready to interpret a full design brief.</div>
    <div class="p11-ai-settings">
      <label>Gemini API key (session only)<input class="p11-ai-key" type="password" autocomplete="off" spellcheck="false" placeholder="Paste your Google AI Studio API key"></label>
      <div class="p11-ai-actions"><button class="p11-ai-button p11-ai-save" type="button">Save for this session</button><button class="p11-ai-button p11-ai-clear" type="button" style="background:#172230;color:#dce5ee;border-color:#354457">Clear</button></div>
      <div class="p11-ai-note">Prototype connection: the key stays in this browser tab's session storage and is sent directly to Google. It is not written to GitHub. For a public/shared release, move the key behind a secured server endpoint.</div>
    </div>`;
  host.appendChild(card);
  const prompt = card.querySelector('.p11-ai-prompt');
  const button = card.querySelector('.p11-ai-actions .p11-ai-button');
  const settings = card.querySelector('.p11-ai-settings');
  const keyInput = card.querySelector('.p11-ai-key');
  const status = card.querySelector('.p11-ai-status');
  keyInput.value = sessionStorage.getItem(KEY_NAME) || '';
  card.querySelector('.p11-ai-gear').addEventListener('click', () => settings.classList.toggle('open'));
  card.querySelector('.p11-ai-save').addEventListener('click', () => {
    const key = keyInput.value.trim();
    if (!key) { status.textContent = 'Enter an API key first.'; status.dataset.state = 'error'; return; }
    sessionStorage.setItem(KEY_NAME, key);
    status.textContent = 'Gemini connection key saved for this browser session.';
    status.dataset.state = 'success';
    settings.classList.remove('open');
  });
  card.querySelector('.p11-ai-clear').addEventListener('click', () => {
    sessionStorage.removeItem(KEY_NAME); keyInput.value = '';
    status.textContent = 'Session key cleared.'; status.dataset.state = '';
  });
  button.addEventListener('click', async () => {
    const brief = prompt.value.trim();
    if (!brief) { status.textContent = 'Describe the design first.'; status.dataset.state = 'error'; return; }
    const key = sessionStorage.getItem(KEY_NAME);
    if (!key) { settings.classList.add('open'); status.textContent = 'Add your Gemini API key in AI settings to activate real AI.'; status.dataset.state = 'error'; return; }
    button.disabled = true; button.textContent = 'Thinking…'; status.textContent = 'Interpreting brief and preparing an editable design plan…'; status.dataset.state = '';
    try {
      const plan = await generate(brief, type, key);
      await onApply(plan);
      status.textContent = plan.designName + ' · ' + plan.summary;
      status.dataset.state = 'success';
    } catch (error) {
      status.textContent = error?.message || 'AI design failed. Check the API key and try again.';
      status.dataset.state = 'error';
    } finally {
      button.disabled = false; button.textContent = 'Analyse & apply design';
    }
  });
  return { element: card, setStatus(message) { status.textContent = message; } };
}
