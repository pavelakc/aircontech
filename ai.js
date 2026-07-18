// ═══════════════════════════════════
// AI.JS
// ═══════════════════════════════════

function getGroqKey() {
  return localStorage.getItem('groq_api_key') ||
         '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';
}

async function callClaudeAPI(prompt, maxTokens) {
  const GROQ_KEY = getGroqKey();
  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: maxTokens || 1000,
        messages: [{ role: 'user', content: prompt }], temperature: 0.3 })
    });
    if (!resp.ok) { const e = await resp.json().catch(()=>({})); throw new Error(e.error?.message||'Groq error '+resp.status); }
    const data = await resp.json();
    return { content: [{ type: 'text', text: data.choices?.[0]?.message?.content || '' }] };
  } catch(e) { throw new Error('AI: ' + e.message); }
}

async function aiGenerateC3() {
  const btn = document.getElementById('ai-c3-btn');
  const c1  = document.getElementById('f-c1')?.value?.trim() || '';
  const c2  = document.getElementById('f-c2')?.value?.trim() || '';
  const c3El = document.getElementById('f-c3');
  const unitDD = dropdownRegistry['unit'];
  const unit   = unitDD?.input?.value || '';
  const make   = document.getElementById('f-make')?.value || '';
  const model  = document.getElementById('f-model')?.value || '';
  const category = document.getElementById('f-category')?.value || '';
  const jobType  = window.jobType || '';

  if (!c1) { snack('⚠ Fill in C1 first'); return; }

  btn.textContent = '⏳...';
  btn.style.opacity = '0.7';
  btn.disabled = true;

  // Build history context from ALL saved reports
  const allReports = typeof loadSavedReports === 'function' ? loadSavedReports() : [];

  // Find similar past repairs (same unit or same category/make/model)
  const similar = allReports.filter(r => {
    if (unit && r.unit === unit) return true;
    if (make && r.make?.toLowerCase() === make.toLowerCase()) return true;
    if (category && r.category === category) return true;
    return false;
  }).slice(0, 20);

  // Build C1→C3 examples from history
  const historyExamples = similar
    .filter(r => r.c1 && r.c3)
    .slice(0, 8)
    .map(r => 'C1: ' + (r.c1||'') + '\nC3: ' + (r.c3||''))
    .join('\n---\n');

  // Parts used in similar repairs
  const partsFreq = {};
  similar.forEach(r => {
    (r.parts||[]).forEach(p => {
      if (!p.partNo) return;
      const k = p.partNo;
      if (!partsFreq[k]) partsFreq[k] = { desc: p.desc||'', count: 0, qty: 0 };
      partsFreq[k].count++;
      partsFreq[k].qty += parseInt(p.qty||1);
    });
  });
  const topParts = Object.entries(partsFreq)
    .sort((a,b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([pn, d]) => `${pn} — ${d.desc} (used ${d.count}x, total qty: ${d.qty})`)
    .join('\\n');

  const prompt = `You are an expert fire suppression system technician at Syncrude Mildred Lake oil sands operation. 
You specialize in Ansul/AYİKON fire suppression systems on heavy mining equipment.

CURRENT REPAIR:
- Unit: ${unit} (${make} ${model}, ${category})
- Job Type: ${jobType}
- C1 Complaint: ${c1}
- C2 Cause: ${c2 || 'not specified'}

HISTORICAL C1→C3 EXAMPLES from similar repairs on same equipment:
${historyExamples || 'No history available for this unit'}

PARTS USED IN SIMILAR REPAIRS:
${topParts || 'No parts history available'}

TASK: Generate two things in JSON format only (no markdown):
{
  "c3": "Professional field technician description of correction/work performed. 2-4 sentences. Use industry standard terminology. Match the style and detail level of the historical examples. Include: what was performed, components touched, test results (e.g. Manual Shutdown - PASS, Auto Actuation - PASS), system status.",
  "parts": [
    {"partNo": "XXXXX", "desc": "description", "qty": 1, "confidence": "high/medium/low", "reason": "why needed (max 8 words)"},
    ...5-8 most relevant parts
  ]
}

Base C3 on C1/C2 and historical patterns. Suggest parts from the history list prioritizing high-frequency items.`;

  try {
    const data = await callClaudeAPI(prompt, 1200);
    const raw = data.content?.[0]?.text || '{}';

    let result;
    try {
      result = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      result = { c3: raw.substring(0, 500), parts: [] };
    }

    // Apply C3
    if (result.c3 && c3El) {
      c3El.value = result.c3;
      c3El.style.borderColor = '#6366f1';
      setTimeout(() => c3El.style.borderColor = '', 2000);
    }

    // Show parts suggestions
    if (result.parts?.length) {
      showAiC3Parts(result.parts);
    }

    snack('✨ AI generated C3 description' + (result.parts?.length ? ' + ' + result.parts.length + ' part suggestions' : ''));

  } catch(err) {
    snack('⚠ AI error: ' + (err.message || 'Check connection'));
    console.error('AI C3 error:', err);
  } finally {
    btn.textContent = '✨ AI Generate';
    btn.style.opacity = '1';
    btn.disabled = false;
  }
}

async function aiSuggestParts() {
  const btn = document.getElementById('ai-suggest-btn');
  const panel = document.getElementById('ai-panel');
  const loading = document.getElementById('ai-loading');
  const suggestionsEl = document.getElementById('ai-suggestions');

  // Gather context
  const unitDD = dropdownRegistry['unit'];
  const unit = unitDD?.input?.value || '';
  const c1 = document.getElementById('f-c1')?.value || '';
  const c2 = document.getElementById('f-c2')?.value || '';
  const make = document.getElementById('f-make')?.value || '';
  const model = document.getElementById('f-model')?.value || '';

  if (!unit && !c1) {
    snack('⚠ Fill in Unit # or C1 complaint first');
    return;
  }

  // Get past reports for context
  const allReports = loadSavedReports ? loadSavedReports() : [];
  const relevantReports = allReports
    .filter(r => {
      if (unit && r.unit && r.unit.toLowerCase().includes(unit.toLowerCase())) return true;
      if (make && r.make && r.make.toLowerCase() === make.toLowerCase()) return true;
      return false;
    })
    .slice(0, 15); // last 15 relevant reports

  // Build parts history
  const partsHistory = {};
  relevantReports.forEach(r => {
    (r.parts || []).forEach(p => {
      if (!p.partNo) return;
      const key = p.partNo;
      if (!partsHistory[key]) partsHistory[key] = { desc: p.desc, qty: 0, count: 0 };
      partsHistory[key].qty  += parseInt(p.qty || 1);
      partsHistory[key].count++;
    });
  });

  const partsHistoryStr = Object.entries(partsHistory)
    .sort((a,b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([pn, d]) => `${pn} (${d.desc}) — used ${d.count}x in similar repairs`)
    .join('\\n');

  const availableParts = getPartsDB ? getPartsDB().slice(0,30).map(p =>
    typeof p === 'string' ? p : `${p.partNo || ''} ${p.desc || ''}`
  ).join(', ') : '';

  // Show panel
  panel.style.display = 'block';
  loading.style.display = 'block';
  suggestionsEl.innerHTML = '';
  btn.style.opacity = '0.6';
  btn.textContent = '⏳ Thinking…';

  const prompt = `You are a fire suppression system technician assistant for Syncrude Mildred Lake.

Current work order:
- Unit: ${unit || 'unknown'}
- Make/Model: ${make} ${model}
- Complaint (C1): ${c1 || 'not specified'}
- Cause (C2): ${c2 || 'not specified'}

Parts used in similar past repairs on this unit/equipment:
${partsHistoryStr || 'No history available'}

Available parts in inventory (partial list):
${availableParts}

Based on the complaint and repair history, suggest the TOP 5-8 most likely parts needed for this repair. 
Respond ONLY with a JSON array (no markdown, no explanation):
[
  {"partNo": "XXXXX", "desc": "Part description", "qty": 1, "reason": "Brief reason (max 8 words)"},
  ...
]
Only suggest parts relevant to the complaint. If part number unknown, use "".`;

  try {
    // Use Groq via callClaudeAPI - no separate key needed
    const data = await callClaudeAPI(prompt, 800);
    const text = data.content?.[0]?.text || '[]';

    // Parse JSON
    let suggestions = [];
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      suggestions = JSON.parse(clean);
    } catch {
      suggestions = [];
    }

    loading.style.display = 'none';

    if (!suggestions.length) {
      suggestionsEl.innerHTML = '<p style="color:#888;font-size:13px">No suggestions available for this complaint.</p>';
    } else {
      suggestionsEl.innerHTML = suggestions.map((s, i) => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #e0d8ff">
          <button onclick="aiAddPart('${escapeHtml(s.partNo||'')}','${escapeHtml(s.desc||'')}',${parseInt(s.qty)||1})"
            style="background:#6366f1;color:#fff;border:none;border-radius:6px;padding:5px 12px;
            font-size:12px;cursor:pointer;white-space:nowrap;flex-shrink:0">
            ＋ Add
          </button>
          <div>
            <span style="font-weight:600;font-size:12px;font-family:monospace">${escapeHtml(s.partNo||'?')}</span>
            <span style="font-size:12px"> — ${escapeHtml(s.desc||'')}</span>
            <span style="display:block;font-size:11px;color:#888">💡 ${escapeHtml(s.reason||'')}</span>
          </div>
          <span style="margin-left:auto;font-size:11px;color:#6366f1;font-weight:600">×${s.qty||1}</span>
        </div>
      `).join('');
    }
  } catch(err) {
    loading.style.display = 'none';
    suggestionsEl.innerHTML = `<p style="color:#e74c3c;font-size:13px">⚠ Error: ${escapeHtml(err.message)}</p>`;
  }

  btn.style.opacity = '1';
  btn.textContent = '✨ AI Suggest';
}

function showApiKeyDialog() {
  const existing = document.getElementById('api-key-modal');
  if (existing) { existing.remove(); return; }
  const modal = document.createElement('div');
  modal.id = 'api-key-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px';
  const box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:14px;padding:24px;width:100%;max-width:440px';
  // Show currently set Groq key (hardcoded default)
  const HARDCODED_GROQ = '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';
  const curr = getApiKey() || HARDCODED_GROQ;
  box.innerHTML = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">' +
    '<span style="font-size:24px">⚡</span>' +
    '<div><h3 style="color:#1a3560;margin:0">Groq API Key</h3><div style="font-size:11px;color:#27ae60;font-weight:600">Free · 14,400 requests/day</div></div>' +
    '</div>' +
    '<p style="font-size:12px;color:#666;margin-bottom:8px">Get your free key at <a href="https://console.groq.com" target="_blank" style="color:#1a3560;font-weight:600">console.groq.com</a> → API Keys → Create</p>' +
    '<p style="font-size:11px;color:#888;margin-bottom:12px">Key starts with <code>gsk_...</code> · Stored locally on this device</p>' +
    '<input type="password" id="api-key-input" value="' + escapeHtml(curr) + '" placeholder="gsk_..." style="width:100%;padding:10px;border:1.5px solid #ddd;border-radius:7px;font-size:13px;margin-bottom:12px;font-family:monospace">' +
    '<div style="display:flex;gap:8px">' +
    '<button id="api-save-btn" style="flex:1;padding:10px;background:#1a3560;color:#fff;border:none;border-radius:7px;cursor:pointer;font-weight:600">💾 Save Key</button>' +
    '<button id="api-cancel-btn" style="padding:10px 16px;background:#f0f0f0;border:none;border-radius:7px;cursor:pointer">Cancel</button>' +
    '</div>';
  modal.appendChild(box);
  document.body.appendChild(modal);
  modal.onclick = e => { if(e.target===modal) modal.remove(); };
  box.querySelector('#api-save-btn').onclick = () => {
    const v = box.querySelector('#api-key-input').value.trim();
    if (!v) { snack('⚠ Enter a key'); return; }
    setApiKey(v);
    modal.remove();
  };
  box.querySelector('#api-cancel-btn').onclick = () => modal.remove();
  box.querySelector('#api-key-input').focus();
}
