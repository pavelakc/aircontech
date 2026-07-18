// ─── Inhaus Helper Functions ────────────────────────────
function ihGetMonthVal(id) {
  const mo = document.getElementById(`${id}-mo`)?.value || '';
  const yr = document.getElementById(`${id}-yr`)?.value || '';
  if (yr && mo) return `${yr}-${mo}`;
  if (yr) return `${yr}`;
  return '';
}

function ihSetMonthVal(id, val) {
  if (!val) return;
  const [yr, mo] = val.split('-');
  const moEl = document.getElementById(`${id}-mo`);
  const yrEl = document.getElementById(`${id}-yr`);
  if (moEl) moEl.value = mo || '';
  if (yrEl) yrEl.value = yr || '';
}

function ihGetRows(type) {
  const rows = [];
  const pat  = new RegExp(`^ihr-${type}-\\d+$`);
  document.querySelectorAll(`[id^="ihr-${type}-"]`).forEach(tr => {
    if (!pat.test(tr.id)) return;
    const n = parseInt(tr.id.split('-').pop());
    const sdId = `ihr-${type}-${n}-stampdate`;
    const starChecked = document.getElementById(`${sdId}-star`)?.checked || false;
    const stampDate   = ihGetMonthVal(sdId);
    const seal = document.getElementById(`ihr-${type}-${n}-seal`)?.checked ? '✓' : '';
    const tc   = document.getElementById(`ihr-${type}-${n}-tcstamp`)?.checked ? '✓' : '';

    if (type === 'n2') rows.push({
      'Ansul Seal': seal,
      'Stamp Date': ihFmtDate(stampDate) + (starChecked ? ' ★' : ''),
      'TC Stamp': tc,
      'Gauge PSI': document.getElementById(`ihr-n2-${n}-psi`)?.value || '',
      'Hydro When': ihGetMonthVal(`ihr-n2-${n}-hydro`),
      'Size': document.getElementById(`ihr-n2-${n}-size`)?.value || '',
    });
    else if (type === 'lt30') rows.push({
      'Ansul Seal': seal,
      'Stamp Date': ihFmtDate(stampDate) + (starChecked ? ' ★' : ''),
      'TC Stamp': tc,
      'Stamp Weight': ihGetOzVal(`ihr-lt30-${n}-swt`),
      'Actual Weight': ihGetDecimalVal(`ihr-lt30-${n}-awt`),
      'Hydro When': ihGetMonthVal(`ihr-lt30-${n}-hydro`),
    });
    else if (type === 'inergen') rows.push({
      'Ansul Seal': seal,
      'Stamp Date': ihFmtDate(stampDate),
      'TC Stamp': tc,
      'Gauge PSI': document.getElementById(`ihr-inergen-${n}-psi`)?.value || '',
      'Hydro When': ihGetMonthVal(`ihr-inergen-${n}-hydro`),
      'Size': document.getElementById(`ihr-inergen-${n}-size`)?.value || '',
    });
    else if (type === 'co2') rows.push({
      'Ansul Seal': seal,
      'Stamp Date': ihFmtDate(stampDate),
      'TC Stamp': tc,
      'Stamp Weight': ihGetOzVal(`ihr-co2-${n}-swt`),
      'Tare Weight': document.getElementById(`ihr-co2-${n}-tare`)?.value || '',
      'Hydro When': ihFmtDate(ihGetMonthVal(`ihr-co2-${n}-hydro`)),
      'Actual Weight': ihGetDecimalVal(`ihr-co2-${n}-awt`),
    });
    else if (type === 'hose') rows.push({
      'Current Hose Date': document.getElementById(`ihr-hose-${n}-current`)?.value || '',
      'Hose Expiry Date':  ihGetMonthVal(`ihr-hose-${n}-expiry`),
    });
  });
  return rows;
}

function ihGetOzVal(id) {
  const whole = document.getElementById(`${id}-whole`)?.value || '';
  const frac  = document.getElementById(`${id}-frac`)?.value  || '';
  if (!whole && !frac) return '';
  return frac ? `${whole} ${frac} oz`.trim() : `${whole} oz`;
}

function ihGetDecimalVal(id) { return document.getElementById(id)?.value || ''; }

function ihMonthInput(id, placeholder) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const cy = new Date().getFullYear();
  const years = Array.from({length:30}, (_,i) => cy - 15 + i);
  const mo = months.map((m,i)=>`<option value="${String(i+1).padStart(2,'0')}">${m}</option>`).join('');
  const yr = years.map(y=>`<option value="${y}">${y}</option>`).join('');
  return `<div style="display:flex;gap:2px">
    <select id="${id}-mo" title="${placeholder} Month"
      style="flex:1;font-size:11px;border:1px solid var(--border);border-radius:3px;padding:2px 1px">
      <option value="">MM</option>${mo}
    </select>
    <select id="${id}-yr" title="${placeholder} Year"
      style="flex:1;font-size:11px;border:1px solid var(--border);border-radius:3px;padding:2px 1px">
      <option value="">YYYY</option>${yr}
    </select>
  </div>`;
}

function ihOzInput(id) {
  const fracs = OZ_FRACTIONS.map(f=>`<option value="${f}">${f||'—'}</option>`).join('');
  return `<div style="display:flex;gap:2px;align-items:center">
    <input type="number" id="${id}-whole" min="0" max="999" step="1" placeholder="oz"
      style="width:42px;font-size:11px;border:1px solid var(--border);border-radius:3px;padding:2px 4px">
    <select id="${id}-frac" style="font-size:11px;border:1px solid var(--border);border-radius:3px;padding:2px 1px">${fracs}</select>
    <span style="font-size:10px;color:var(--muted)">oz</span>
  </div>`;
}

function ihDecimalInput(id, placeholder) {
  return `<div style="display:flex;gap:2px;align-items:center">
    <input type="text" id="${id}" placeholder="${placeholder||'0.0'}" inputmode="decimal"
      style="width:58px;font-size:11px;border:1px solid var(--border);border-radius:3px;padding:2px 4px"
      oninput="this.value=this.value.replace(/[^0-9.,]/g,'')">
    <span style="font-size:10px;color:var(--muted)">oz</span>
  </div>`;
}

function ihStampDateTD(id, type, rowId) {
  const TD = 'padding:4px;border-bottom:1px solid var(--border)';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const cy = new Date().getFullYear();
  const years = Array.from({length:30}, (_,i) => cy - 15 + i);
  const mo = months.map((m,i)=>`<option value="${String(i+1).padStart(2,'0')}">${m}</option>`).join('');
  const yr = years.map(y=>`<option value="${y}">${y}</option>`).join('');
  return `<td style="${TD}">
    <div style="display:flex;align-items:center;gap:2px">
      <select id="${id}-mo" style="font-size:11px;border:1px solid var(--border);border-radius:3px;padding:2px 1px;width:44px"
        onchange="ihCalcHydro('${type}',${rowId})"><option value="">MM</option>${mo}</select>
      <button type="button" id="${id}-star-btn"
        onclick="ihToggleStar('${id}','${type}',${rowId})"
        title="★ Pentagon Star = TC/DOT +10y hydro; ☆ = +5y"
        style="background:none;border:none;cursor:pointer;font-size:18px;padding:0 1px;color:#ccc">☆</button>
      <input type="checkbox" id="${id}-star" style="display:none" onchange="ihCalcHydro('${type}',${rowId})">
      <select id="${id}-yr" style="font-size:11px;border:1px solid var(--border);border-radius:3px;padding:2px 1px;width:50px"
        onchange="ihCalcHydro('${type}',${rowId})"><option value="">YYYY</option>${yr}</select>
    </div>
  </td>`;
}

function ihCheckTD(id) {
  return `<td style="padding:4px;border-bottom:1px solid var(--border);text-align:center">
    <input type="checkbox" id="${id}" style="width:16px;height:16px">
  </td>`;
}
function ihFmtDate(raw) {
  if (!raw) return '';
  if (raw.length === 7 && raw[4] === '-') return raw.slice(5) + '/' + raw.slice(0,4);
  return raw;
}


// ═══════════════════════════════════
// INHAUS.JS
// ═══════════════════════════════════

function getInhausReports() {
  try { return JSON.parse(localStorage.getItem(INHAUS_KEY) || '[]'); } catch { return []; }
}

function saveInhausReports(arr) { localStorage.setItem(INHAUS_KEY, JSON.stringify(arr)); }

function getInhausMemory() { try { return JSON.parse(localStorage.getItem(INHAUS_MEMORY_KEY)||'{}'); } catch { return {}; } }

function ihAddRow(tbodyId, type) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const id = ++ihRowCounters[type];
  const TD = 'padding:4px;border-bottom:1px solid var(--border)';
  const tr = document.createElement('tr');
  tr.id = `ihr-${type}-${id}`;

  let cells = '';
  if (type === 'n2') {
    cells = `
      ${ihCheckTD(`ihr-n2-${id}-seal`)}
      ${ihStampDateTD(`ihr-n2-${id}-stampdate`,'n2',id)}
      ${ihCheckTD(`ihr-n2-${id}-tcstamp`)}
      <td style="${TD}"><input type="text" id="ihr-n2-${id}-psi" placeholder="PSI"
        style="width:100%;font-size:11px;border:1px solid var(--border);border-radius:3px;padding:2px 4px"></td>
      <td style="${TD}">${ihMonthInput(`ihr-n2-${id}-hydro`,'Hydro When')}</td>
      <td style="${TD}">${ihSelect(`ihr-n2-${id}-size`,ANSUL_N2_SIZES,'Size')}</td>`;
  } else if (type === 'lt30') {
    cells = `
      ${ihCheckTD(`ihr-lt30-${id}-seal`)}
      ${ihStampDateTD(`ihr-lt30-${id}-stampdate`,'lt30',id)}
      ${ihCheckTD(`ihr-lt30-${id}-tcstamp`)}
      <td style="${TD}">${ihOzInput(`ihr-lt30-${id}-swt`)}</td>
      <td style="${TD}">${ihDecimalInput(`ihr-lt30-${id}-awt`,'Actual Wt')}</td>
      <td style="${TD}">${ihMonthInput(`ihr-lt30-${id}-hydro`,'Hydro When')}</td>`;
  } else if (type === 'inergen') {
    cells = `
      ${ihCheckTD(`ihr-inergen-${id}-seal`)}
      <td style="${TD}">${ihMonthInput(`ihr-inergen-${id}-stampdate`,'Stamp Date')}</td>
      ${ihCheckTD(`ihr-inergen-${id}-tcstamp`)}
      <td style="${TD}"><input type="text" id="ihr-inergen-${id}-psi" placeholder="PSI"
        style="width:100%;font-size:11px;border:1px solid var(--border);border-radius:3px;padding:2px 4px"></td>
      <td style="${TD}">${ihMonthInput(`ihr-inergen-${id}-hydro`,'Hydro When')}</td>
      <td style="${TD}"><input type="text" id="ihr-inergen-${id}-size" placeholder="Size"
        style="width:100%;font-size:11px;border:1px solid var(--border);border-radius:3px;padding:2px 4px"></td>`;
  } else if (type === 'co2') {
    cells = `
      ${ihCheckTD(`ihr-co2-${id}-seal`)}
      <td style="${TD}">${ihMonthInput(`ihr-co2-${id}-stampdate`,'Stamp Date')}</td>
      ${ihCheckTD(`ihr-co2-${id}-tcstamp`)}
      <td style="${TD}">${ihOzInput(`ihr-co2-${id}-swt`)}</td>
      <td style="${TD}"><input type="number" id="ihr-co2-${id}-tare" step="0.1" min="0" placeholder="Tare" title="Empty weight (tare lb)" style="width:100%;padding:3px 4px;border:1px solid var(--border);border-radius:3px;font-size:12px;font-weight:600"></td>
      <td style="${TD}"><input type="number" id="ihr-co2-${id}-tare" step="0.1" min="0" placeholder="Tare" title="Empty weight lb" style="width:100%;padding:3px 4px;border:1px solid var(--border);border-radius:3px;font-size:12px;font-weight:600"></td>
      <td style="${TD}">${ihMonthInput(`ihr-co2-${id}-hydro`,'Hydro When')}</td>
      <td style="${TD}">${ihDecimalInput(`ihr-co2-${id}-awt`,'Actual Wt')}</td>`;
  } else if (type === 'hose') {
    cells = `
      <td style="${TD}"><input type="date" id="ihr-hose-${id}-current"
        style="width:100%;font-size:11px;border:1px solid var(--border);border-radius:3px;padding:2px 4px"></td>
      <td style="${TD}">${ihMonthInput(`ihr-hose-${id}-expiry`,'Expiry')}</td>`;
  }

  tr.innerHTML = cells + `<td style="${TD}"><button class="btn-icon" onclick="ihRemoveRow('${tbodyId}','${type}',${id})">✕</button></td>`;
  tbody.appendChild(tr);
  setTimeout(attachNumpadToInhausInputs, 100);

  // Wire Hydro When changes to expiry check
  ['mo','yr'].forEach(part => {
    const el = document.getElementById(`ihr-${type}-${id}-stampdate-${part}`);
    if (el) el.addEventListener('change', () => ihCalcHydro(type, id));
    const hel = document.getElementById(`ihr-${type}-${id}-hydro-${part}`);
    if (hel) hel.addEventListener('change', () => setTimeout(ihCheckAllExpiry, 100));
  });
}

function ihRemoveRow(tbodyId, type, id) {
  document.getElementById(`ihr-${type}-${id}`)?.remove();
}

function ihAddDryTank() {
  const id = ++ihDryTankCount;
  const c  = document.getElementById('ih-dry-tanks');
  if (!c) return;
  const opts = ANSUL_DRY_SIZES.map(s=>`<option value="${s}">${s}</option>`).join('');
  const div  = document.createElement('div');
  div.id = `ih-dry-${id}`;
  div.style.cssText = 'border:1px solid var(--border);border-radius:6px;padding:10px;margin-bottom:10px;background:#f8fafc';
  div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <strong style="font-size:13px">Dry Chemical Tank #${id}</strong>
    <button class="btn-icon" onclick="document.getElementById('ih-dry-${id}').remove()">✕</button></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div class="form-group"><label>Tank Size</label>
        <select id="ih-dry-${id}-size" style="width:100%;padding:7px 8px;border:1px solid var(--border);border-radius:5px;font-size:13px">
          <option value="">— Select —</option>${opts}</select></div>
      <div class="form-group"><label>Date <span style="font-size:10px;color:#888">(Month optional)</span></label>${ihMonthInput(`ih-dry-${id}-date`,'Date')}</div>
      <div class="form-group"><label>Notes</label>
        <input type="text" id="ih-dry-${id}-notes" placeholder="Notes"
          style="width:100%;border:1px solid var(--border);border-radius:5px;padding:7px 8px;font-size:13px"></div>
    </div>`;
  c.appendChild(div);
}

function ihAddLVSTank() {
  const id = ++ihLVSTankCount;
  const c  = document.getElementById('ih-lvs-tanks');
  if (!c) return;
  const opts = ANSUL_LVS_SIZES.map(s=>`<option value="${s}">${s}</option>`).join('');
  const div  = document.createElement('div');
  div.id = `ih-lvs-${id}`;
  div.style.cssText = 'border:1px solid var(--border);border-radius:6px;padding:10px;margin-bottom:10px;background:#f8fafc';
  div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <strong style="font-size:13px">LVS Tank #${id}</strong>
    <button class="btn-icon" onclick="document.getElementById('ih-lvs-${id}').remove()">✕</button></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div class="form-group"><label>Tank Size</label>
        <select id="ih-lvs-${id}-size" style="width:100%;padding:7px 8px;border:1px solid var(--border);border-radius:5px;font-size:13px">
          <option value="">— Select —</option>${opts}</select></div>
      <div class="form-group"><label>Date <span style="font-size:10px;color:#888">(Month optional)</span></label>${ihMonthInput(`ih-lvs-${id}-date`,'Date')}</div>
      <div class="form-group"><label>Notes</label>
        <input type="text" id="ih-lvs-${id}-notes" placeholder="Notes"
          style="width:100%;border:1px solid var(--border);border-radius:5px;padding:7px 8px;font-size:13px"></div>
    </div>`;
  c.appendChild(div);
}

function ihCheckAllExpiry() {
  const types  = ['n2','lt30','inergen','co2'];
  const labels = { n2:'N2 Cartridge', lt30:'LT30', inergen:'Inergen', co2:'CO2 Tank' };
  const warnings = [];

  types.forEach(type => {
    const pat = new RegExp(`^ihr-${type}-\\d+$`);
    document.querySelectorAll(`[id^="ihr-${type}-"]`).forEach(tr => {
      if (!pat.test(tr.id)) return;
      const n = parseInt(tr.id.split('-').pop());
      const hydroVal  = ihGetMonthVal(`ihr-${type}-${n}-hydro`);
      const hasStar   = document.getElementById(`ihr-${type}-${n}-stampdate-star`)?.checked || false;
      if (ihIsExpiringSoon(hydroVal)) {
        tr.style.background = '#fff0f0';
        tr.style.outline    = '2px solid #e74c3c';
        const [yr, mo] = hydroVal.split('-');
        warnings.push(`⚠ ${labels[type]} row ${n}: Hydro due ${mo}/${yr} — less than 6 months!`);
        tr.title = `⚠ Hydro due: ${mo}/${yr}`;
      } else if (hydroVal) {
        tr.style.background = '';
        tr.style.outline    = '';
        tr.title = '';
      }
    });
  });

  const commentsEl = document.getElementById('ih-comments');
  if (commentsEl) {
    const cleaned = commentsEl.value.split('\n').filter(l => !l.startsWith('⚠')).join('\n').trim();
    commentsEl.value = warnings.length ? (cleaned ? cleaned + '\n\n' : '') + warnings.join('\n') : cleaned;
  }
  return warnings.length;
}

function ihCalcHydro(type, rowId) {
  const sdId    = `ihr-${type}-${rowId}-stampdate`;
  const hydroId = `ihr-${type}-${rowId}-hydro`;
  const starEl  = document.getElementById(`${sdId}-star`);
  const moEl    = document.getElementById(`${sdId}-mo`);
  const yrEl    = document.getElementById(`${sdId}-yr`);
  const tcEl    = document.getElementById(`ihr-${type}-${rowId}-tcstamp`);

  if (!moEl?.value || !yrEl?.value) return;
  if (tcEl && !tcEl.checked) tcEl.checked = true;

  const years   = ihGetHydroYears(type, starEl?.checked || false);
  const newYear = parseInt(yrEl.value) + years;
  ihSetMonthVal(hydroId, `${newYear}-${moEl.value}`);

  // Update star btn appearance
  const btn = document.getElementById(`${sdId}-star-btn`);
  if (btn) {
    btn.textContent = starEl?.checked ? '★' : '☆';
    btn.style.color = starEl?.checked ? '#f0a800' : '#ccc';
  }

  setTimeout(ihCheckAllExpiry, 150);
}

function collectInhausData() {
  const chk = id => document.getElementById(id)?.checked || false;
  const val = id => document.getElementById(id)?.value || '';

  const dryTanks = [];
  document.querySelectorAll('[id^="ih-dry-"]').forEach(div => {
    if (!/^ih-dry-\d+$/.test(div.id)) return;
    const n = div.id.split('-')[2];
    dryTanks.push({ size: val(`ih-dry-${n}-size`), date: ihGetMonthVal(`ih-dry-${n}-date`), notes: val(`ih-dry-${n}-notes`) });
  });
  const lvsTanks = [];
  document.querySelectorAll('[id^="ih-lvs-"]').forEach(div => {
    if (!/^ih-lvs-\d+$/.test(div.id)) return;
    const n = div.id.split('-')[2];
    lvsTanks.push({ size: val(`ih-lvs-${n}-size`), date: ihGetMonthVal(`ih-lvs-${n}-date`), notes: val(`ih-lvs-${n}-notes`) });
  });
  const inspectors = [];
  document.querySelectorAll('[id^="ih-insp-"]').forEach(div => {
    if (!/^ih-insp-\d+$/.test(div.id)) return;
    const n = div.id.split('-')[2];
    inspectors.push({ name: val(`ih-insp-${n}-name`), date: val(`ih-insp-${n}-date`) });
  });

  return {
    frNum: val('ih-frnum'), unit: val('ih-unit'),
    systemType: { scn:chk('ih-scn'), s210:chk('ih-210'), s3ir:chk('ih-3ir'), qir:chk('ih-qir'), manual:chk('ih-manual-sys') },
    actuators: { manual:chk('ih-act-manual'), manualQty:val('ih-act-manual-qty'), auto:chk('ih-act-auto'), autoQty:val('ih-act-auto-qty'), electric:chk('ih-act-elec'), electricQty:val('ih-act-elec-qty') },
    nozzles: { lvs:chk('ih-noz-lvs'), lvsQty:val('ih-noz-lvs-qty'), dry:chk('ih-noz-dry'), dryQty:val('ih-noz-dry-qty') },
    a101Dates: [ihGetMonthVal('ih-a101-1'), ihGetMonthVal('ih-a101-2')],
    pad210Dates: ['ih-210pad-1','ih-210pad-2','ih-210pad-3','ih-210pad-4'].map(id => ihGetMonthVal(id)),
    dryTanks, lvsTanks,
    n2Rows:      ihGetRows('n2'),
    lt30Rows:    ihGetRows('lt30'),
    inergenRows: ihGetRows('inergen'),
    co2Rows:     ihGetRows('co2'),
    hoseRows:    ihGetRows('hose'),
    comments:    val('ih-comments'),
    inspectors,
    savedAt: new Date().toISOString()
  };
}

function saveInhausReport() {
  const data = collectInhausData();
  // Use editing FR# if tracking one
  const searchFr = window._editingIhFrNum || data.frNum;
  const all  = getInhausReports();
  const idx  = all.findIndex(r => r.frNum === searchFr && searchFr);
  if (idx >= 0) { data.frNum = data.frNum || searchFr; all[idx] = data; }
  else all.unshift(data);
  saveInhausReports(all);
  window._editingIhFrNum = data.frNum || null; // track for updates
  if (typeof snack === 'function') snack('✔ Inhaus saved: ' + (data.frNum || 'draft'));
  try { ihCheckAllExpiry(); } catch(e) {}
}

function ihAutoFill() {
  // Skip auto-fill of frNum if we're editing a specific Inhaus report
  if (window._editingIhFrNum) return;
  const frEl  = document.getElementById('f-reportnum') || document.getElementById('report-number-display');
  const unitDD = typeof dropdownRegistry !== 'undefined' ? dropdownRegistry['unit'] : null;
  const ihFr  = document.getElementById('ih-frnum');
  const ihUnit = document.getElementById('ih-unit');
  if (ihFr && frEl)  ihFr.value  = frEl.value || frEl.textContent || '';
  if (ihUnit && unitDD) ihUnit.value = unitDD.input?.value || '';

  // Render PAD month/year inputs
  ['ih-a101-1','ih-a101-2'].forEach(id => {
    const wrap = document.getElementById(`${id}-wrap`);
    if (wrap && !wrap.hasChildNodes()) wrap.innerHTML = ihMonthInput(id,'A101 PAD');
  });
  ['ih-210pad-1','ih-210pad-2','ih-210pad-3','ih-210pad-4'].forEach(id => {
    const wrap = document.getElementById(`${id}-wrap`);
    if (wrap && !wrap.hasChildNodes()) wrap.innerHTML = ihMonthInput(id,'210 PAD');
  });

  // Auto-add inspectors from FR techs
  const c = document.getElementById('ih-inspectors');
  if (c && c.children.length === 0) ihAddInspector();
}

function ihApplyMemory() {
  const unitId = document.getElementById('ih-unit')?.value || '';
  if (!unitId) return;
  const prev = getInhausMemory()[unitId];
  if (!prev) return;
  if (!confirm('Load previous Inhaus data for Unit ' + unitId + '?\n(saved ' + new Date(prev.savedAt).toLocaleDateString() + ')')) return;
  if (prev.systemType) {
    ['scn','210','3ir','qir','manual-sys'].forEach(k => {
      const el = document.getElementById('ih-' + k);
      if (el) el.checked = !!(prev.systemType[k] || prev.systemType['s'+k]);
    });
  }
  snack('✔ Previous data loaded for ' + unitId);
}

function ihLoadSavedReport(frNum) {
  if (!frNum) return;
  const all = getInhausReports();
  const r = all.find(rep => rep.frNum === frNum);
  if (!r) return;
  window._editingIhFrNum = frNum;
  // Populate Inhaus form from saved data
  const setEl = (id, val) => { const el=document.getElementById(id); if(el && val!==undefined) el.value=val||''; };
  setEl('ih-frnum', r.frNum);
  setEl('ih-unit', r.unit);
  // Load the full data via existing load mechanism
  if (typeof ihLoadFromData === 'function') { ihLoadFromData(r); }
  snack('✔ Loaded Inhaus: ' + frNum);
  // Update select to show loaded
  const sel = document.getElementById('ih-saved-select');
  if (sel) sel.value = frNum;
}

function ihPopulateSavedSelect() {
  const sel = document.getElementById('ih-saved-select');
  if (!sel) return;
  const current = sel.value;
  while (sel.options.length > 1) sel.remove(1);
  const all = getInhausReports ? getInhausReports() : [];
  all.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.frNum || '';
    opt.textContent = (r.frNum||'?') + (r.unit ? ' — Unit '+r.unit : '') + (r.savedAt ? ' ('+new Date(r.savedAt).toLocaleDateString()+')'  : '');
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

function ihClearEditing() {
  window._editingIhFrNum = null;
  const sel = document.getElementById('ih-saved-select');
  if (sel) sel.value = '';
  // Clear form
  document.querySelectorAll('#view-inhaus input[type=text], #view-inhaus input[type=number], #view-inhaus select').forEach(el => {
    if (!['ih-saved-select'].includes(el.id)) el.value = '';
  });
  try { ihAutoFill(); } catch(e) {}
  snack('✚ New Inhaus report');
}

function initInhausHooks() {
  const c1 = document.getElementById('f-c1');
  if (c1 && !c1._ihHooked) {
    c1._ihHooked = true;
    c1.addEventListener('input', checkC1ForSemiannual);
    c1.addEventListener('blur',  checkC1ForSemiannual);
  }
}
