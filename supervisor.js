// ═══════════════════════════════════
// SUPERVISOR.JS
// ═══════════════════════════════════

function initSuperFilterTechs() {
  const allR = typeof loadSavedReports === 'function' ? loadSavedReports() : [];

  // Populate technician dropdown
  const techSel = document.getElementById('sup-tech-filter');
  if (techSel) {
    while (techSel.options.length > 1) techSel.remove(1);
    const names = new Set();
    allR.forEach(r => (r.techs||[]).forEach(t => {
      const n = (t.name||'').split(/  +/)[0];
      if (n) names.add(n);
    }));
    if (typeof getTechniciansDB === 'function') {
      getTechniciansDB().forEach(t => {
        const n = (typeof t === 'string' ? t : '').split(/  +/)[0];
        if (n) names.add(n);
      });
    }
    [...names].sort().forEach(n => {
      const opt = document.createElement('option');
      opt.value = n; opt.textContent = n;
      techSel.appendChild(opt);
    });
  }

  // Populate unit dropdown
  const unitSel = document.getElementById('sup-unit-filter');
  if (unitSel) {
    while (unitSel.options.length > 1) unitSel.remove(1);
    const units = new Set();
    allR.forEach(r => { if (r.unit) units.add(r.unit); });
    if (typeof getEquipmentDB === 'function') {
      getEquipmentDB().forEach(e => { if (e.unit) units.add(e.unit); });
    }
    [...units].sort((a,b) => a.localeCompare(b, undefined, {numeric:true})).forEach(u => {
      const opt = document.createElement('option');
      opt.value = u; opt.textContent = u;
      unitSel.appendChild(opt);
    });
  }

  // Populate parts dropdown (from all saved reports)
  const partSel = document.getElementById('sup-part-filter');
  if (partSel) {
    while (partSel.options.length > 1) partSel.remove(1);
    const partsMap = {};
    allR.forEach(r => (r.parts||[]).forEach(p => {
      if (p.partNo && !partsMap[p.partNo]) partsMap[p.partNo] = p.desc || '';
    }));
    // Also from parts DB
    if (typeof getPartsDB === 'function') {
      getPartsDB().forEach(p => {
        const pn = typeof p === 'string' ? p : p.partNo;
        if (pn && !partsMap[pn]) partsMap[pn] = typeof p === 'string' ? '' : (p.desc||'');
      });
    }
    Object.entries(partsMap).sort((a,b) => a[0].localeCompare(b[0])).forEach(([pn, desc]) => {
      const opt = document.createElement('option');
      opt.value = pn;
      opt.textContent = pn + (desc ? '  —  ' + desc.substring(0,35) : '');
      partSel.appendChild(opt);
    });
  }

  // Set default date range (last 30 days)
  const today = new Date();
  const from  = new Date(today);
  from.setDate(from.getDate() - 30);
  const toEl   = document.getElementById('sup-date-to');
  const fromEl = document.getElementById('sup-date-from');
  if (fromEl && !fromEl.value) fromEl.value = from.toISOString().split('T')[0];
  if (toEl   && !toEl.value)   toEl.value   = today.toISOString().split('T')[0];
  supBuildDropData();
  superRender();
}

function superRender() {
  const from  = document.getElementById('sup-date-from')?.value  || '';
  const to    = document.getElementById('sup-date-to')?.value    || '';
  const tech  = document.getElementById('sup-tech-filter')?.value || '';
  const type  = document.getElementById('sup-type-filter')?.value || '';
  const unit  = (_supActiveFilter && _supActiveFilter.unit) || (document.getElementById('sup-unit-filter')?.value || '');

  const allR = typeof loadSavedReports === 'function' ? loadSavedReports() : [];
  const filtered = allR.filter(r => {
    if (from && r.date < from) return false;
    if (to   && r.date > to)   return false;
    if (tech) {
      const names = (r.techs||[]).map(t => (t.name||'').split(/\s{2,}/)[0]);
      if (!names.some(n => n && n.toLowerCase().includes(tech.toLowerCase()))) return false;
    }
    if (type && r.type !== type && r.jobType !== type) return false;
    if (unit && (r.unit||'') !== unit) return false;  // exact match
    const partF = (_supActiveFilter && _supActiveFilter.part) || document.getElementById('sup-part-filter')?.value || '';
    if (partF) {
      const hasPart = (r.parts||[]).some(p => p.partNo === partF);
      if (!hasPart) return false;
    }
    return true;
  });

  // Render active filter chips
  const chipsEl = document.getElementById('sup-active-filters');
  if (chipsEl) {
    chipsEl.innerHTML = '';
    const addChip = (icon, label, clearFn) => {
      const chip = document.createElement('span');
      chip.className = 'sup-filter-chip';
      chip.innerHTML = icon + ' ' + escapeHtml(label) + ' <span class="chip-x">✕</span>';
      chip.onclick = clearFn;
      chipsEl.appendChild(chip);
    };
    if (from) addChip('📅', 'From: '+from, () => { document.getElementById('sup-date-from').value=''; superRender(); });
    if (to)   addChip('📅', 'To: '+to,   () => { document.getElementById('sup-date-to').value=''; superRender(); });
    if (tech) addChip('👷', tech, () => { document.getElementById('sup-tech-filter').value=''; superRender(); });
    if (type) addChip('🔧', type, () => { document.getElementById('sup-type-filter').value=''; superRender(); });
    if (unit) addChip('🚜', 'Unit: '+unit, () => { document.getElementById('sup-unit-filter').value=''; superRender(); });
    const partF = (_supActiveFilter && _supActiveFilter.part) || document.getElementById('sup-part-filter')?.value || '';
    if (partF) addChip('🔩', partF, () => { document.getElementById('sup-part-filter').value=''; superRender(); });
    const countChip = document.createElement('span');
    countChip.style.cssText = 'font-size:12px;color:#888;align-self:center;padding-left:4px';
    countChip.textContent = filtered.length + ' report' + (filtered.length!==1?'s':'');
    chipsEl.appendChild(countChip);
  }

  renderSuperTimeSummary(filtered);
  if (typeof renderSuperWorkTypes  === 'function') renderSuperWorkTypes(filtered);
  renderSuperParts(filtered);
  renderSuperPartsDetail(filtered);
  renderSuperUnits(filtered);
  renderSuperReports(filtered);
}

function renderSuperTimeSummary(reports) {
  const tbody = document.getElementById('sup-time-body');
  if (!tbody) return;
  const byTech = {};
  reports.forEach(r => {
    (r.techs||[]).forEach(t => {
      const name = (t.name||'').split(/\s{2,}/)[0] || 'Unknown';
      if (!byTech[name]) byTech[name] = { reps: new Set(), reg:0, ot:0, night:0 };
      byTech[name].reps.add(r.reportNum);
      // Hours: 12h per shift by default
      // r.hours is the machine hour meter — NOT worked hours
      const h = 12;
      const shift = r.shift || '';
      if (shift.endsWith('N')) byTech[name].night += h;
      else byTech[name].reg += h;
    });
  });
  const rows = Object.entries(byTech).sort((a,b)=>a[0].localeCompare(b[0]));
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="padding:16px;text-align:center;color:#aaa">No data in range</td></tr>';
    return;
  }
  const f = n => n > 0 ? n.toFixed(1) : '0.0';
  tbody.innerHTML = rows.map(([name, d]) => `<tr class="sup-clickable" title="Click to filter by ${escapeHtml(name)}" onclick="supFilterBy('tech','${escapeHtml(name)}')" style="border-bottom:1px solid #eee">
    <td style="padding:7px 10px;font-weight:600">${escapeHtml(name)}</td>
    <td style="padding:7px 10px;text-align:center">${d.reps.size}</td>
    <td style="padding:7px 10px;text-align:center;background:#f0fff4;font-weight:600;color:#27ae60">${f(d.reg)}</td>
    <td style="padding:7px 10px;text-align:center;background:#fff8f0;font-weight:600;color:#e67e22">${f(d.ot)}</td>
    <td style="padding:7px 10px;text-align:center;background:#f0f6ff">${f(d.night)}</td>
    <td style="padding:7px 10px;text-align:center;font-weight:700">${f(d.reg+d.ot)}</td>
    <td style="padding:7px 10px;text-align:center;font-size:11px;color:#aaa">—</td>
  </tr>`).join('');
}

function renderSuperPartsDetail(reports) {
  var tbody = document.getElementById('sup-parts-detail-body');
  var countEl = document.getElementById('sup-parts-count');
  if (!tbody) return;
  var map = {};
  reports.forEach(function(r) {
    (r.parts||[]).forEach(function(p) {
      if (!p.partNo) return;
      if (!map[p.partNo]) map[p.partNo] = {desc:p.desc||'',qty:0,reps:new Set(),units:new Set(),types:new Set()};
      map[p.partNo].qty += parseInt(p.qty||1);
      map[p.partNo].reps.add(r.reportNum);
      if (r.unit) map[p.partNo].units.add(r.unit);
      var t = r.type || r.jobType || '';
      if (t) map[p.partNo].types.add(t);
    });
  });
  var entries = Object.entries(map).sort(function(a,b){ return b[1].qty-a[1].qty; });
  if (countEl) countEl.textContent = entries.length + ' unique parts';
  if (!entries.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="padding:16px;text-align:center;color:#aaa">No parts in range</td></tr>';
    return;
  }
  tbody.innerHTML = entries.map(function(e) {
    var pn = e[0], d = e[1];
    var freqPct = Math.round((d.reps.size / Math.max(reports.length,1)) * 100);
    var unitList = Array.from(d.units).slice(0,4).join(', ') + (d.units.size>4?' +'+(d.units.size-4):'');
    var typeSpans = Array.from(d.types).map(function(t){
      return '<span style="background:'+(t==='F/S'?'#1a5276':'#145a32')+';color:#fff;border-radius:3px;padding:1px 6px;font-size:10px;margin-right:2px">'+t+'</span>';
    }).join('') || '—';
    return '<tr class="sup-clickable" title="Click to filter by this part" onclick="supFilterBy(\'part\',\'' + pn + '\')";+ " style="border-bottom:1px solid #eee">' +
      '<td style="padding:7px 10px;font-weight:700;font-family:monospace;font-size:12px;color:#1a3560">'+escapeHtml(pn)+'</td>' +
      '<td style="padding:7px 10px;font-size:12px">'+escapeHtml(d.desc)+'</td>' +
      '<td style="padding:7px 10px;text-align:center"><strong style="font-size:15px">'+d.qty+'</strong>' +
        '<div style="background:#e8f0fe;border-radius:3px;height:4px;margin-top:3px">' +
        '<div style="background:#1a3560;height:4px;border-radius:3px;width:'+Math.min(freqPct,100)+'%"></div></div>' +
        '<div style="font-size:10px;color:#aaa">'+freqPct+'% of reports</div></td>' +
      '<td style="padding:7px 10px;text-align:center;color:#888;font-size:12px">'+d.reps.size+'</td>' +
      '<td style="padding:7px 10px;font-size:11px;color:#555">'+escapeHtml(unitList||'—')+'</td>' +
      '<td style="padding:7px 10px">'+typeSpans+'</td>' +
    '</tr>';
  }).join('');
}

function renderSuperUnits(reports) {
  var tbody = document.getElementById('sup-units-body');
  var countEl = document.getElementById('sup-units-count');
  if (!tbody) return;
  var map = {};
  reports.forEach(function(r) {
    var u = r.unit;
    if (!u) return;
    if (!map[u]) map[u] = {make:r.make||'',model:r.model||'',visits:0,types:new Set(),techs:new Set(),parts:{},lastDate:''};
    map[u].visits++;
    var t = r.type || r.jobType || '';
    if (t) map[u].types.add(t);
    (r.techs||[]).forEach(function(tech) {
      var n = (tech.name||'').split(/  +/)[0];
      if (n) map[u].techs.add(n);
    });
    (r.parts||[]).forEach(function(p) {
      if (!p.partNo) return;
      map[u].parts[p.partNo] = (map[u].parts[p.partNo]||0) + parseInt(p.qty||1);
    });
    if (!map[u].lastDate || r.date > map[u].lastDate) map[u].lastDate = r.date;
  });
  var entries = Object.entries(map).sort(function(a,b){ return b[1].visits-a[1].visits; });
  if (countEl) countEl.textContent = entries.length + ' units';
  if (!entries.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="padding:16px;text-align:center;color:#aaa">No units in range</td></tr>';
    return;
  }
  tbody.innerHTML = entries.map(function(e) {
    var unit = e[0], d = e[1];
    var topParts = Object.entries(d.parts).sort(function(a,b){return b[1]-a[1];}).slice(0,3).map(function(p){return p[0]+'(x'+p[1]+')';}).join(', ');
    var techList = Array.from(d.techs).slice(0,3).join(', ')+(d.techs.size>3?' +'+(d.techs.size-3):'');
    var typeSpans = Array.from(d.types).map(function(t){
      return '<span style="background:'+(t==='F/S'?'#1a5276':'#145a32')+';color:#fff;border-radius:3px;padding:1px 6px;font-size:10px;margin-right:2px">'+t+'</span>';
    }).join('') || '—';
    return '<tr style="border-bottom:1px solid #eee;cursor:pointer" onclick="unitFilterClick(\''+unit+'\')">'+
      '<td style="padding:7px 10px;font-weight:700;color:#1a3560">'+escapeHtml(unit)+'</td>' +
      '<td style="padding:7px 10px;font-size:12px">'+escapeHtml(d.make)+' '+escapeHtml(d.model)+'</td>' +
      '<td style="padding:7px 10px;text-align:center;font-weight:700;font-size:15px">'+d.visits+'</td>' +
      '<td style="padding:7px 10px">'+typeSpans+'</td>' +
      '<td style="padding:7px 10px;font-size:11px;color:#555">'+escapeHtml(techList||'—')+'</td>' +
      '<td style="padding:7px 10px;font-size:11px;color:#888">'+escapeHtml(topParts||'—')+'</td>' +
      '<td style="padding:7px 10px;font-size:12px;color:#888">'+escapeHtml(d.lastDate||'—')+'</td>' +
    '</tr>';
  }).join('');
}

function supFilterBy(field, value) {
  const fieldMap = {
    'tech':  'sup-tech-filter',
    'unit':  'sup-unit-filter',
    'type':  'sup-type-filter',
    'part':  'sup-part-filter',
  };
  const elId = fieldMap[field];
  if (!elId) return;

  // For select elements check if option exists, add if not
  const el = document.getElementById(elId);
  if (!el) return;

  if (el.tagName === 'SELECT') {
    let found = false;
    for (let opt of el.options) {
      if (opt.value === value) { found = true; break; }
    }
    if (!found) {
      const opt = document.createElement('option');
      opt.value = opt.textContent = value;
      el.appendChild(opt);
    }
  }

  el.value = value;
  superRender();
  // Scroll to top of supervisor view
  document.getElementById('view-super')?.scrollTo({top:0, behavior:'smooth'});
  snack('🔍 Filtered by: ' + value);
}

function renderSuggestionsPanel() {
  const panel = document.getElementById('suggestions-panel');
  if (!panel) return;
  const all = getDbSuggestions();
  const pending = all.filter(s => s.status === 'pending');
  const recent  = all.filter(s => s.status !== 'pending').slice(0,5);

  const badge = document.getElementById('suggestions-badge');
  if (badge) {
    badge.textContent = pending.length || '';
    badge.style.display = pending.length ? 'inline-flex' : 'none';
  }

  const typeLabels = { parts:'Parts', technicians:'Technicians', trucks:'Trucks', equipment:'Equipment' };
  const actionColors = { add:'#27ae60', remove:'#e74c3c' };

  panel.innerHTML = `
    <div style="font-weight:700;font-size:14px;margin-bottom:12px;color:var(--navy)">
      📨 Pending Changes (${pending.length})
    </div>
    ${pending.length ? pending.map(s => `
      <div style="border:1px solid #ddd;border-radius:8px;padding:10px 12px;margin-bottom:8px;background:#fffef8">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:12px;font-weight:600;color:${actionColors[s.action]||'#333'}">
            ${s.action === 'add' ? '➕ ADD' : '➖ REMOVE'} — ${typeLabels[s.type]||s.type}
          </span>
          <span style="font-size:11px;color:var(--muted)">${s.by} · ${new Date(s.at).toLocaleDateString()}</span>
        </div>
        <div style="font-size:12px;margin-bottom:6px;padding:6px;background:#f8f8f8;border-radius:4px;font-family:monospace">
          ${escapeHtml(typeof s.value === 'string' ? s.value : JSON.stringify(s.value))}
        </div>
        ${s.note ? `<div style="font-size:11px;color:var(--muted);margin-bottom:6px">Note: ${escapeHtml(s.note)}</div>` : ''}
        <div style="display:flex;gap:8px">
          <button onclick="approveSuggestion(${s.id})" class="btn-add" style="background:var(--success);font-size:12px;padding:6px 12px;margin:0">✔ Approve</button>
          <button onclick="rejectSuggestion(${s.id})" class="btn-add" style="background:#e74c3c;font-size:12px;padding:6px 12px;margin:0">✗ Reject</button>
        </div>
      </div>`).join('') : '<p style="color:var(--muted);font-size:13px">No pending suggestions</p>'}
    ${recent.length ? `<div style="font-weight:600;font-size:12px;margin:12px 0 6px;color:var(--muted)">Recent</div>
    ${recent.map(s => `<div style="font-size:11px;padding:4px 8px;border-radius:4px;margin-bottom:4px;
      background:${s.status==='approved'?'#e8f8f0':s.status==='rejected'?'#fef0f0':'#f8f8f8'}">
      ${s.status==='approved'?'✔':'✗'} ${s.action} ${typeLabels[s.type]} · ${escapeHtml(typeof s.value==='string'?s.value:JSON.stringify(s.value)).substring(0,40)}
    </div>`).join('')}` : ''}
  `;
}
