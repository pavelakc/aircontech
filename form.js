// ═══════════════════════════════════
// FORM.JS — Field Report
// ═══════════════════════════════════

function loadSavedReports() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch (e) { return []; }
}

function saveSavedReports(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function initForm() {
  window._editingReportNum = null;
  const rnEl = document.getElementById('f-reportnum');
  if (rnEl) rnEl.dataset.locked = '';  // allow regeneration for new reports
  ['f-date','f-workorder','f-notif','f-po','f-invoice',
   'f-make','f-model','f-serial','f-category','f-hours',
   'f-c1','f-c2','f-c3','f-remaining','f-approved','f-company','f-approvaldate'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  // Default operation
  const opEl = document.getElementById('f-operation'); if (opEl) opEl.value = '0010';
  // Reset lock out
  const loCb = document.getElementById('f-lockout'); if (loCb) loCb.checked = false;
  setLockOut(false);
  // Clear PO# (will re-fill when unit is selected)
  const poEl = document.getElementById('f-po'); if (poEl) poEl.value = '';

  // Build complications grid
  (function() {
    var grid = document.getElementById('complications-grid');
    if (!grid || typeof COMPLICATIONS === 'undefined') return;
    grid.innerHTML = '';
    COMPLICATIONS.forEach(function(label) {
      var div = document.createElement('div');
      div.className = 'comp-item';
      var icon = document.createElement('span');
      icon.style.fontSize = '14px';
      icon.textContent = '\u2610 ';
      div.appendChild(icon);
      div.appendChild(document.createTextNode(label));
      div.onclick = function() {
        var sel = div.classList.toggle('selected');
        icon.textContent = sel ? '\u2611 ' : '\u2610 ';
        if (typeof selectedComplications !== 'undefined') {
          if (sel) selectedComplications.add(label);
          else selectedComplications.delete(label);
        }
      };
      grid.appendChild(div);
    });
  })();

  // Reset dropdowns
  ['unit','shift','contact'].forEach(ddId => {
    const dd = dropdownRegistry[ddId];
    if (dd) { dd.selected = null; dd.input.value = ''; dd.wrap.classList.remove('has-value'); }
  });

  // Clear parts
  document.getElementById('parts-body').innerHTML = '';
  partRows = [];
  Object.keys(partData).forEach(k => delete partData[k]);
  Object.keys(dropdownRegistry).forEach(k => {
    if (k.startsWith('part-')) {
      const s = dropdownRegistry[k];
      if (s?.dropdown?.parentNode === document.body) s.dropdown.remove();
      delete dropdownRegistry[k];
    }
  });
  partIdCounter = 0;

  // Clear techs
  document.getElementById('tech-rows').innerHTML = '';
  techRows = [];
  Object.keys(techData).forEach(k => delete techData[k]);
  Object.keys(dropdownRegistry).forEach(k => {
    if (k.startsWith('tech-') || k.startsWith('truck-')) {
      const s = dropdownRegistry[k];
      if (s?.dropdown?.parentNode === document.body) s.dropdown.remove();
      delete dropdownRegistry[k];
    }
  });
  techIdCounter = 0;

  // Reset complications
  document.querySelectorAll('#complications-grid .comp-item').forEach(el => el.classList.remove('selected'));
  selectedComplications.clear();

  // Reset status/type
  jobStatus = ''; jobType = '';
  ['btn-completed','btn-incomplete','btn-hvac','btn-fs'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('selected-completed','selected-incomplete');
  });

  // Add default rows
  addPartRow(); addPartRow();
  addTechRow(); addTechRow();
  // Auto-fill first tech from logged-in user
  setTimeout(() => {
    if (currentUser && currentUser.name && currentUser.name !== 'Guest') {
      const id = techRows[0];
      if (id !== undefined) {
        const dd = dropdownRegistry['tech-' + id];
        if (dd) {
          const techs = getTechniciansDB();
          const match = techs.find(t => (typeof t === 'string' ? t : '').startsWith(currentUser.name));
          if (match) {
            dd.selected = { _custom: false, value: match };
            dd.input.value = match.split(/  +/)[0];
            dd.wrap.classList.add('has-value');
            techData[id].name = match;
            // Auto-fill truck
            const dt = getDefaultTruckForTech(match);
            if (dt) {
              const tdd = dropdownRegistry['truck-' + id];
              if (tdd) { tdd.input.value = dt; tdd.wrap.classList.add('has-value'); techData[id].truck = dt; }
            }
            updateReportNumber();
          }
        }
      }
    }
  }, 300);

  // Set defaults
  document.getElementById('f-company').value = 'Syncrude Mildred Lake';
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('f-date').value = getEffectiveReportDate();
  document.getElementById('f-approvaldate').value = today;
  applySyncrudeAutoFill();
  updateReportNumber();
  setTimeout(() => { rfRefreshAll(); rfAttachListeners(); }, 200);
  snack('Form cleared');
}

function startNewReport() {
  if (!confirm('Start a new report? Unsaved changes will be lost.')) return;
  window._editingReportNum = null;       // fresh report — no existing record
  try { initForm(); } catch(e) {}
  // Clear report number so it regenerates fresh
  const rnEl = document.getElementById('f-reportnum');
  if (rnEl) rnEl.value = '';
  switchView('fr');
  snack('✔ New report — fill in details');
}

function smartSave() {
  const currentView = window._currentView || 'fr';
  if (currentView === 'fr') {
    saveCurrentReport();
  } else if (currentView === 'inhaus') {
    saveInhausReport();
  } else {
    snack('💾 Save is for Field Report. Go to Field Report tab first.');
  }
}

function saveCurrentReport() {
  try {
  try {
    // 1. Validate
    const result = validateForm();
    if (!result.ok) {
      showValidationErrors(result.errors);
      const errList = result.errors.map(function(e){ return '• ' + e.label; }).join('\n');
      alert('Please fill in required fields:\n\n' + errList);
      return;
    }

    // 2. Collect data
    var data = {};
    try { data = collectData(); } catch(ce) {
      alert('Error collecting data: ' + ce.message); return;
    }
    data.savedAt = new Date().toISOString();

    // 3. Get current report number
    var rnEl = document.getElementById('f-reportnum');
    var currentNum = (rnEl && rnEl.value) ? rnEl.value.trim() : '';
    if (!currentNum) {
      currentNum = 'FR-' + Date.now();
      if (rnEl) rnEl.value = currentNum;
    }
    data.reportNum = currentNum;

    // 4. Load existing reports
    var all = [];
    try { all = loadSavedReports() || []; } catch(le) { all = []; }

    // 5. Find and update or insert
    var existingIdx = all.findIndex(function(r){ return r.reportNum === currentNum; });
    if (existingIdx >= 0) {
      all[existingIdx] = data;
      snack('✔ Updated: ' + currentNum);
    } else {
      all.unshift(data);
      snack('✔ Saved: ' + currentNum);
    }

    // 6. Save to localStorage
    try {
      // Update open form fields if matching report is displayed
  const _formNum = document.getElementById('f-reportnum')?.value?.trim()||'';
  if (_formNum) {
    timeCardRows.forEach(row => {
      if (row.fr !== _formNum) return;
      const ids = window.techRows||[];
      if (!ids.length) return;
      const tinEl  = document.getElementById('tin-'+ids[0]);
      const toutEl = document.getElementById('tout-'+ids[0]);
      if (tinEl  && row.start) tinEl.value  = row.start;
      if (toutEl && row.end)   toutEl.value = row.end;
    });
  }
  saveSavedReports(all);
    } catch(se) {
      alert('Error saving: ' + se.message); return;
    }

    // 7. Update UI
    window._editingReportNum = currentNum;
    try { renderSavedList(); } catch(re) {}
    try { syncPushReport(data).catch(function(){}); } catch(se2) {}
    try { learnFromSavedReports(); } catch(le) {}

    // 8. Confirm to user
    snack('✔ Report saved: ' + currentNum);

  } catch(globalErr) {
    console.error('saveCurrentReport fatal:', globalErr);
    alert('Save failed: ' + globalErr.message + '\n\nPlease press F12 → Console for details.');
  }

  } catch(err) { console.error("Save error:", err); alert("Save error: "+err.message); }
}

function collectData() {
  const v  = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const cb = id => { const el = document.getElementById(id); return el ? el.checked : false; };

  // Parts
  const parts = (partRows || []).map(id => ({
    qty:    document.getElementById('qty-'   + id)?.value || '1',
    partNo: (partData && partData[id]) ? partData[id].partNo || '' : '',
    desc:   document.getElementById('pdesc-' + id)?.value || ''
  })).filter(p => p.partNo || p.desc);

  // Technicians
  const techs = (techRows || []).map(id => ({
    name:    (techData && techData[id]) ? techData[id].name  || '' : '',
    truck:   (techData && techData[id]) ? techData[id].truck || '' : '',
    timeIn:  document.getElementById('tin-'     + id)?.value || '',
    timeOut: document.getElementById('tout-'    + id)?.value || '',
    badge:   document.getElementById('badge-'   + id)?.value || '',
    reg:     cb('reg-'  + id),
    ot:      cb('ot-'   + id),
    stat:    cb('stat-' + id),
    lockout: cb('lo-'   + id)
  })).filter(t => t.name);

  // Unit, Shift, Contact from dropdowns
  const unitSel    = dropdownRegistry['unit']    ? dropdownRegistry['unit'].selected    : null;
  const shiftDD    = dropdownRegistry['shift'];
  const shiftSel   = shiftDD ? shiftDD.selected : null;
  const contactDD  = dropdownRegistry['contact'];
  const contactSel = contactDD ? contactDD.selected : null;
  const contactVal = contactSel
    ? (contactSel._custom ? contactSel.value : (typeof contactSel === 'string' ? contactSel : ''))
    : '';

  // Complications (C4)
  const c4arr = [];
  if (selectedComplications) selectedComplications.forEach(v2 => c4arr.push(v2));

  return {
    reportNum:     document.getElementById('f-reportnum')?.value?.trim() || window._editingReportNum || '',
    date:          v('f-date'),
    approvaldate:  v('f-approvaldate'),
    workorder:     v('f-workorder'),
    notif:         v('f-notif'),
    po:            v('f-po'),
    operation:     v('f-operation'),
    invoice:       v('f-invoice'),
    contact:       contactVal,
    shift:         typeof shiftSel === 'string' ? shiftSel : (shiftSel ? (shiftSel.value || shiftSel) : ''),
    unit:          unitSel ? (unitSel.unit || '') : '',
    make:          v('f-make'),
    model:         v('f-model'),
    serial:        v('f-serial'),
    hours:         v('f-hours'),
    category:      v('f-category'),
    lockout:       cb('f-lockout'),
    c1:            v('f-c1'),
    c2:            v('f-c2'),
    c3:            v('f-c3'),
    c4:            c4arr,
    complications: c4arr,
    remaining:     v('f-remaining'),
    parts:         parts,
    techs:         techs,
    jobStatus:     jobStatus || '',
    jobType:       jobType   || '',
    status:        jobStatus || '',   // alias for print
    type:          jobType   || '',   // alias for print
    truck:         v('f-truck') || (techs[0] ? techs[0].truck : ''),
  };
}

function validateForm() {
  // Returns {ok, errors:[{label, scrollEl, flashEls:[]}]}
  const oldBanner = document.getElementById('validation-banner');
  if (oldBanner) oldBanner.remove();
  const errors = [];

  // Work Order #
  if (!document.getElementById('f-workorder').value.trim()) {
    errors.push({ label: 'Work Order #', scrollEl: 'sec-header', flashEls: ['f-workorder'] });
  }
  // Notification #
  if (!document.getElementById('f-notif').value.trim()) {
    errors.push({ label: 'Notification #', scrollEl: 'sec-header', flashEls: ['f-notif'] });
  }
  // Hour Meter (unit hours)
  if (!document.getElementById('f-hours').value.trim() && !document.getElementById('f-lockout')?.checked) {
    errors.push({ label: 'Hour Meter (unit hours)', scrollEl: 'sec-equipment', flashEls: ['f-hours'] });
  }
  // Technician — at least one with a name
  const hasTech = techRows.some(id => techData[id] && techData[id].name && techData[id].name.trim());
  if (!hasTech) {
    const firstId = techRows[0];
    const techDD = firstId !== undefined ? dropdownRegistry[`tech-${firstId}`] : null;
    errors.push({
      label: 'Technician (at least one)',
      scrollEl: 'sec-techs',
      wrapEls: techDD ? [techDD.wrap] : []
    });
  }
  // Job Status
  if (!jobStatus) {
    errors.push({ label: 'Job Status (Completed/Incomplete)', scrollEl: 'sec-status', flashEls: ['btn-completed','btn-incomplete'] });
  }
  // Job Type
  if (!jobType) {
    errors.push({ label: 'Job Type (HVAC/F/S)', scrollEl: 'sec-status', flashEls: ['btn-hvac','btn-fs'] });
  }
  // At least 2 complications
  if (selectedComplications.size < 2) {
    errors.push({ label: `At least 2 Complications (C4) — currently ${selectedComplications.size}`,
      scrollEl: 'complications-grid', flashEls: ['complications-grid'] });
  }

  const _c1=(document.getElementById('f-c1')?.value||'').trim();
  if(!_c1) errors.push({label:'C1 — Complaint required',scrollEl:'sec-work',flashEls:['f-c1']});
  const _c2=(document.getElementById('f-c2')?.value||'').trim();
  if(!_c2) errors.push({label:'C2 — Cause required',scrollEl:'sec-work',flashEls:['f-c2']});
  const _c3=(document.getElementById('f-c3')?.value||'').trim();
  if(!_c3) errors.push({label:'C3 — Correction required',scrollEl:'sec-work',flashEls:['f-c3']});
  return { ok: errors.length === 0, errors };
}

function showValidationErrors(errors) {
  // Build banner
  const banner = document.createElement('div');
  banner.id = 'validation-banner';
  banner.className = 'validation-banner show';
  banner.innerHTML = `<span style="font-size:18px">⚠</span><div><b>Please complete required fields:</b><ul>${
    errors.map(e => `<li style="cursor:pointer;text-decoration:underline" onclick="jumpToError('${e.scrollEl}')">${escapeHtml(e.label)}</li>`).join('')
  }</ul></div>`;

  const view = document.getElementById('view-fr');
  view.insertBefore(banner, view.firstChild);

  // Flash all error fields persistently
  errors.forEach(e => {
    (e.flashEls || []).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('flash-red');
    });
    (e.wrapEls || []).forEach(el => {
      if (el) el.classList.add('flash-red-block');
    });
  });

  // Auto-scroll to first error
  const firstScrollEl = document.getElementById(errors[0].scrollEl);
  if (firstScrollEl) firstScrollEl.scrollIntoView({behavior:'smooth', block:'start'});

  // Mark all empty required fields RED (persistent until filled)
  rfMarkErrors();
}

function jumpToError(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
}

function loadReportIntoForm(idx) {
  const all = loadSavedReports();
  const r = all[idx];
  if (!r) return;
  window._editingReportNum = r.reportNum || null; // track for save
  switchView('fr');
  setTimeout(() => populateFormFromReport(r), 50);

  // Restore exact report number (prevent regeneration on edit)
  const rnEl = document.getElementById('f-reportnum');
  if (rnEl && r.reportNum) {
    rnEl.value = r.reportNum;
    rnEl.dataset.locked = 'true';  // signal updateReportNumber to skip
  }
}

function populateFormFromReport(r) {
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  setVal('f-date', r.date);
  setVal('f-workorder', r.workorder);
  setVal('f-notif', r.notif);
  setVal('f-po', r.po);
  setVal('f-operation', r.operation);
  setVal('f-invoice', r.invoice);
  setVal('f-make', r.make);
  setVal('f-model', r.model);
  setVal('f-serial', r.serial);
  setVal('f-category', r.category);
  setVal('f-hours', r.hours);
  // Restore lockout
  const loCb2 = document.getElementById('f-lockout');
  if (loCb2) { loCb2.checked = !!r.lockout; setLockOut(!!r.lockout); }
  setVal('f-c1', r.c1);
  setVal('f-c2', r.c2);
  setVal('f-c3', r.c3);
  setVal('f-remaining', r.remaining);
  setVal('f-approved', r.approved);
  setVal('f-company', r.company);
  setVal('f-approvaldate', r.approvalDate);

  // Unit
  const unitDD = dropdownRegistry['unit'];
  const eq = EQUIPMENT.find(e => e.unit === r.unit);
  if (unitDD && eq) {
    unitDD.selected = eq;
    unitDD.input.value = eq.unit;
    unitDD.wrap.classList.add('has-value');
  }
  // Shift
  const shiftDD = dropdownRegistry['shift'];
  if (shiftDD && r.shift) {
    shiftDD.selected = r.shift;
    shiftDD.input.value = r.shift;
    shiftDD.wrap.classList.add('has-value');
  }
  // Contact
  const contactLeaders = SHIFT_LEADERS[r.shift] || [];
  rebuildContactDropdown(contactLeaders, r.contact);

  // Complications
  selectedComplications.clear();
  document.querySelectorAll('#complications-grid .comp-item').forEach(el => {
    el.classList.remove('selected');
    if ((r.complications || []).includes(el.textContent)) {
      el.classList.add('selected');
      selectedComplications.add(el.textContent);
    }
  });

  setStatus(r.status || '');
  setType(r.type || '');

  // Parts
  document.getElementById('parts-body').innerHTML = '';
  partRows = [];
  Object.keys(partData).forEach(k => delete partData[k]);
  Object.keys(dropdownRegistry).forEach(k => {
    if (k.startsWith('part-')) {
      const s = dropdownRegistry[k];
      if (s && s.dropdown && s.dropdown.parentNode === document.body) s.dropdown.remove();
      delete dropdownRegistry[k];
    }
  });
  partIdCounter = 0;
  (r.parts || []).forEach(p => {
    addPartRow();
    const id = partIdCounter;
    document.getElementById(`qty-${id}`).value = p.qty;
    document.getElementById(`pdesc-${id}`).value = p.desc || '';
    partData[id] = {qty: p.qty, partNo: p.partNo, desc: p.desc};
    const dd = dropdownRegistry[`part-${id}`];
    if (dd) {
      const match = PARTS.find(x => x.partNo === p.partNo);
      if (match) {
        dd.selected = match;
        dd.input.value = p.partNo;
        dd.wrap.classList.add('has-value');
      } else if (p.partNo) {
        dd.selected = {_custom: true, value: p.partNo};
        dd.input.value = p.partNo;
        dd.wrap.classList.add('has-value');
      }
    }
  });
  if (!r.parts || !r.parts.length) { addPartRow(); addPartRow(); }

  // Techs
  document.getElementById('tech-rows').innerHTML = '';
  techRows = [];
  Object.keys(techData).forEach(k => delete techData[k]);
  Object.keys(dropdownRegistry).forEach(k => {
    if (k.startsWith('tech-') || k.startsWith('truck-')) {
      const s = dropdownRegistry[k];
      if (s && s.dropdown && s.dropdown.parentNode === document.body) s.dropdown.remove();
      delete dropdownRegistry[k];
    }
  });
  techIdCounter = 0;
  (r.techs || []).forEach(t => {
    addTechRow();
    const id = techIdCounter;
    techData[id] = {...t};
    document.getElementById(`tin-${id}`).value = t.timeIn || '';
    document.getElementById(`tout-${id}`).value = t.timeOut || '';
    document.getElementById(`reg-${id}`).checked = !!t.reg;
    document.getElementById(`ot-${id}`).checked = !!t.ot;
    document.getElementById(`stat-${id}`).checked = !!t.stat;
    const techDD = dropdownRegistry[`tech-${id}`];
    if (techDD && t.name) {
      techDD.selected = TECHNICIANS.includes(t.name) ? t.name : {_custom:true, value:t.name};
      techDD.input.value = t.name;
      techDD.wrap.classList.add('has-value');
    }
    const truckDD = dropdownRegistry[`truck-${id}`];
    if (truckDD && t.truck) {
      truckDD.selected = TRUCKS.includes(t.truck) ? t.truck : {_custom:true, value:t.truck};
      truckDD.input.value = t.truck;
      truckDD.wrap.classList.add('has-value');
    }
  });
  if (!r.techs || !r.techs.length) { addTechRow(); addTechRow(); }

  updateReportNumber();
  // Restore the original report number (overrides regenerated number)
  setTimeout(() => {
    const rnEl = document.getElementById('f-reportnum');
    if (rnEl && r.reportNum) {
      rnEl.value = r.reportNum;
      rnEl.dataset.locked = 'true';
    }
    rfRefreshAll(); rfAttachListeners();
  }, 300);
  // Restore job status/type
  if (r.jobStatus) { jobStatus=r.jobStatus; setTimeout(()=>{if(typeof setStatus==='function')setStatus(r.jobStatus);},200); }
  if (r.jobType)   { jobType=r.jobType;   setTimeout(()=>{if(typeof setType==='function')setType(r.jobType);},200); }
  // Restore C4
  const _comps = r.complications||r.c4||[];
  if (_comps.length) {
    selectedComplications = new Set(_comps);
    setTimeout(()=>{
      document.querySelectorAll('#complications-grid .comp-item').forEach(el=>{
        const nm = el.dataset.name||el.querySelector?.('label')?.textContent?.trim()||el.textContent?.trim();
        if (_comps.includes(nm)||selectedComplications.has(nm)) el.classList.add('selected');
      });
      if(typeof updateRequiredComplications==='function') updateRequiredComplications();
    },300);
  }
  snack(`Loaded: ${r.reportNum || 'report'}`);
}

function openCopyOfReport(idx) {
  const all = loadSavedReports();
  const r = all[idx];
  if (!r) return;
  const copy = JSON.parse(JSON.stringify(r));

  // Keep WO# and Notification# from original
  // Set date to TODAY (new shift)
  const today = new Date().toISOString().split('T')[0];
  copy.date = today;
  copy.approvaldate = today;  // also update approval date

  // Clear only the unique identifiers
  copy.reportNum = '';   // will regenerate with new date
  copy.savedAt   = '';
  window._editingReportNum = null; // treat as new report

  switchView('fr');
  setTimeout(() => {
    populateFormFromReport(copy);
    // Clear lock so number regenerates with new date
    const rnEl = document.getElementById('f-reportnum');
    if (rnEl) {
      rnEl.value = '';
      rnEl.dataset.locked = '';
    }
    // Also restore date to today (in case populateFormFromReport overwrote it)
    const dateEl = document.getElementById('f-date');
    if (dateEl) {
      dateEl.value = today;
      dateEl.dispatchEvent(new Event('change'));
    }
    // Regenerate number with today's date
    setTimeout(() => {
      // Force today's date one more time after all field population
      const dateEl2 = document.getElementById('f-date');
      if (dateEl2) { dateEl2.value = today; }
      const rnEl2 = document.getElementById('f-reportnum');
      if (rnEl2) { rnEl2.dataset.locked = ''; }
      updateReportNumber();
      snack('📋 Copy: WO# kept, new date & report number generated');
    }, 200);
  }, 50);
}

function addPartRow() {
  const id = ++partIdCounter;
  partRows.push(id);
  partData[id] = {qty:1, partNo:'', desc:''};
  const tbody = document.getElementById('parts-body');
  const tr = document.createElement('tr');
  tr.id = `part-row-${id}`;
  tr.innerHTML = `
    <td><input type="number" min="1" value="1" id="qty-${id}" style="width:70px;text-align:center"
      oninput="partData[${id}].qty=this.value"></td>
    <td><div id="dd-part-${id}"></div></td>
    <td><input type="text" id="pdesc-${id}" placeholder="Description" style="width:100%"
      oninput="partData[${id}].desc=this.value"></td>
    <td><button class="btn-icon" onclick="removePartRow(${id})" title="Remove">✕</button></td>`;
  tbody.appendChild(tr);
  createDropdown({
    id: `part-${id}`,
    container: `dd-part-${id}`,
    items: getPartsDB(),
    placeholder: 'Search part…',
    displayFn: p => p.partNo,
    subFn: p => p.desc,
    allowCustom: true,
    onSelect: p => {
      if (!p) { partData[id].partNo=''; document.getElementById(`pdesc-${id}`).value=''; partData[id].desc=''; return; }
      if (p._custom) { partData[id].partNo=p.value; }
      else { partData[id].partNo=p.partNo; document.getElementById(`pdesc-${id}`).value=p.desc; partData[id].desc=p.desc; }
    }
  });
}

function removePartRow(id) {
  const s = dropdownRegistry[`part-${id}`];
  if (s && s.dropdown && s.dropdown.parentNode === document.body) s.dropdown.remove();
  const el = document.getElementById(`part-row-${id}`);
  if (el) el.remove();
  partRows = partRows.filter(r => r !== id);
  delete partData[id];
  delete dropdownRegistry[`part-${id}`];
}

function addTechRow() {
  const id = ++techIdCounter;
  techRows.push(id);
  techData[id] = {name:'', truck:'', timeIn:'', timeOut:'', reg:true, ot:false, stat:false, lockout:false};
  const container = document.getElementById('tech-rows');
  const div = document.createElement('div');
  div.className = 'tech-row';
  div.id = `tech-row-${id}`;
  div.innerHTML = `
    <div class="form-group">
      <label>Technician</label>
      <div id="dd-tech-${id}"></div>
    </div>
    <div class="form-group">
      <label>Truck #</label>
      <div id="dd-truck-${id}"></div>
    </div>
    <div class="form-group">
      <label>Time In / Out</label>
      <div style="display:flex;gap:6px">
        <input type="time" id="tin-${id}" oninput="techData[${id}].timeIn=this.value" style="flex:1">
        <input type="time" id="tout-${id}" oninput="techData[${id}].timeOut=this.value" style="flex:1">
      </div>
    </div>
    <div class="form-group">
      <label>Hours</label>
      <div class="checkboxes">
        <label class="check-label"><input type="checkbox" id="reg-${id}" checked onchange="techData[${id}].reg=this.checked"> REG</label>
        <label class="check-label"><input type="checkbox" id="ot-${id}" onchange="techData[${id}].ot=this.checked"> OT</label>
        <label class="check-label"><input type="checkbox" id="stat-${id}" onchange="techData[${id}].stat=this.checked"> STAT</label>

      </div>
    </div>
    <div style="padding-bottom:8px">
      <button class="btn-icon" onclick="removeTechRow(${id})" title="Remove">✕</button>
    </div>`;
  container.appendChild(div);
  createDropdown({
    id: `tech-${id}`,
    container: `dd-tech-${id}`,
    items: getTechniciansDB(),
    placeholder: 'Search technician…',
    allowCustom: true,
    onSelect: (val) => {
      const name = (val && val._custom) ? val.value : (val || '');
      techData[id].name = name;
      const dt = getDefaultTruckForTech(name);
      if (dt && !techData[id].truck) {
        const tdd = dropdownRegistry[`truck-${id}`];
        if (tdd) {
          tdd.selected = dt; tdd.input.value = dt;
          tdd.wrap.classList.add('has-value','auto-filled-flash');
          setTimeout(() => tdd.wrap.classList.remove('auto-filled-flash'), 1200);
          techData[id].truck = dt;
        }
      }
      updateReportNumber();
    }
  });
  createDropdown({
    id: `truck-${id}`,
    container: `dd-truck-${id}`,
    items: getTrucksDB(),
    placeholder: 'Truck…',
    allowCustom: true,
    onSelect: (val) => { techData[id].truck = (val && val._custom) ? val.value : (val || ''); }
  });
}

function removeTechRow(id) {
  ['tech-','truck-'].forEach(prefix => {
    const s = dropdownRegistry[`${prefix}${id}`];
    if (s && s.dropdown && s.dropdown.parentNode === document.body) s.dropdown.remove();
    delete dropdownRegistry[`${prefix}${id}`];
  });
  const el = document.getElementById(`tech-row-${id}`);
  if (el) el.remove();
  techRows = techRows.filter(r => r !== id);
  delete techData[id];
}

function setStatus(s) {
  jobStatus = s;
  if (typeof rfRefreshAll === 'function') setTimeout(rfRefreshAll, 50);
  ['btn-completed','btn-incomplete'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('selected-completed','selected-incomplete','flash-red','flash-red-block');
  });
  const bc = document.getElementById('btn-completed');
  const bi = document.getElementById('btn-incomplete');
  if (s === 'completed' && bc) bc.classList.add('selected-completed');
  if (s === 'incomplete' && bi) bi.classList.add('selected-incomplete');
}

function setType(t) {
  jobType = t;
  if (typeof rfRefreshAll === 'function') setTimeout(rfRefreshAll, 50);
  ['btn-hvac','btn-fs'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('selected-completed','flash-red','flash-red-block');
  });
  const bh = document.getElementById('btn-hvac');
  const bf = document.getElementById('btn-fs');
  if (t === 'HVAC' && bh) bh.classList.add('selected-completed');
  if (t === 'F/S' && bf) bf.classList.add('selected-completed');
  updateReportNumber();
}

function toggleComplication(name, el) {
  if (selectedComplications.has(name)) {
    selectedComplications.delete(name);
    el.classList.remove('selected');
  } else {
    selectedComplications.add(name);
    el.classList.add('selected');
  }
  if (selectedComplications.size >= 2) {
    const g = document.getElementById('complications-grid');
    if (g) g.classList.remove('flash-red','flash-red-block','validation-error','validation-error-pulse');
  }
  updateRequiredComplications();
}

function setLockOut(checked) {
  lockOutActive = checked;
  const overlay = document.getElementById('lockout-overlay');
  const label   = document.getElementById('lockout-label');
  const hours   = document.getElementById('f-hours');
  if (overlay) {
    overlay.style.display = checked ? 'flex' : 'none';
  }
  if (hours) {
    hours.style.color = checked ? 'transparent' : '';
  }
  if (label) {
    label.style.borderColor = checked ? '#e74c3c' : '#ddd';
    label.style.background  = checked ? '#fff0f0' : '#fff';
    label.style.color       = checked ? '#c0392b' : 'inherit';
    label.style.fontWeight  = checked ? '700'     : '500';
  }
}

function autoFillCustomerPO(category) {
  const poEl = document.getElementById('f-po');
  if (!poEl) return;
  // Don't overwrite if manually edited (unless empty)
  const cur = poEl.value.trim();

  let labourPO = SYNCRUDE_PO.shopLabour;
  if (category && category.toLowerCase().includes('shovel')) {
    labourPO = SYNCRUDE_PO.shovelsLabour;
  }
  const autoVal = labourPO + '(L)/' + SYNCRUDE_PO.parts + '(P)';

  // Only auto-fill if field is empty or still has the old auto value
  const isAutoValue = cur === '' || 
    cur.includes('SUENTQ') && cur.includes('(L)/') && cur.includes('(P)');
  if (isAutoValue) {
    poEl.value = autoVal;
  }
}

function autoFillPO(category) {
  const el = document.getElementById('f-po');
  if (!el) return;
  // Don't overwrite if user manually entered a value
  if (el.dataset.manualEntry === 'true' && el.value.trim()) return;
  const mapping = CATEGORY_PO_MAP[category] || CATEGORY_PO_MAP['_default'];
  if (mapping) {
    el.value = mapping.labour + '(L)/' + mapping.parts + '(P)';
    el.style.color = '';
    el.dataset.autoFilled = 'true';
  }
}

function applySyncrudeAutoFill() {
  const dateStr = document.getElementById('f-date').value;
  const result = getSyncrudeShiftForDate(dateStr);
  if (!result) return;

  // Set shift dropdown
  const shiftDD = dropdownRegistry['shift'];
  if (shiftDD) {
    shiftDD.selected = result.shift;
    shiftDD.input.value = result.shift;
    shiftDD.wrap.classList.add('has-value');
  }

  // Rebuild contact dropdown with this shift's leaders, default-selected to first
  rebuildContactDropdown(result.leaders, result.leader);
  // Refresh required field highlighting after auto-fill
  setTimeout(rfRefreshAll, 200);
}

function rfRefreshAll(forceRed) {
  RF_INPUTS.forEach(id => rfApplyInput(id, forceRed));
  RF_DROPDOWNS.forEach(id => rfApplyDD(id, forceRed));
  RF_STATUSES.forEach(s => rfApplyStatus(s.key, s.btns, s.getValue, forceRed));
}

function rfApplyInput(id, forceRed) {
  const el = document.getElementById(id);
  if (!el) return;
  const filled = el.value.trim().length > 0;
  el.classList.remove('rf-green','rf-red');
  if (filled) {
    RF_STATE[id] = { red: false };
  } else if (forceRed || RF_STATE[id]?.red) {
    el.classList.add('rf-red');
    RF_STATE[id] = { red: true };
  } else {
    el.classList.add('rf-green');
  }
}

function rfApplyDD(ddId, forceRed) {
  const dd = dropdownRegistry[ddId];
  if (!dd || !dd.wrap) return;
  const filled = dd.input && dd.input.value.trim().length > 0;
  dd.wrap.classList.remove('rf-green','rf-red');
  if (filled) {
    RF_STATE[ddId] = { red: false };
  } else if (forceRed || RF_STATE[ddId]?.red) {
    dd.wrap.classList.add('rf-red');
    RF_STATE[ddId] = { red: true };
  } else {
    dd.wrap.classList.add('rf-green');
  }
}

function rfApplyStatus(key, btns, getValue, forceRed) {
  const filled = !!getValue();
  btns.forEach(bid => {
    const b = document.getElementById(bid);
    if (!b) return;
    b.style.removeProperty('border-color');
    b.style.removeProperty('background');
  });
  if (!filled) {
    if (forceRed || RF_STATE[key]?.red) {
      RF_STATE[key] = { red: true };
      btns.forEach(bid => {
        const b = document.getElementById(bid);
        if (b && !b.classList.contains('selected-completed') && !b.classList.contains('selected-incomplete')) {
          b.style.borderColor = '#e74c3c';
          b.style.background  = '#fff5f5';
        }
      });
    } else {
      btns.forEach(bid => {
        const b = document.getElementById(bid);
        if (b && !b.classList.contains('selected-completed') && !b.classList.contains('selected-incomplete')) {
          b.style.borderColor = '#5daa7a';
        }
      });
    }
  } else {
    RF_STATE[key] = { red: false };
  }
}

function rfAttachListeners() {
  RF_INPUTS.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._rfHooked) {
      el._rfHooked = true;
      el.addEventListener('input', () => rfApplyInput(id));
    }
  });
  RF_DROPDOWNS.forEach(id => {
    const dd = dropdownRegistry[id];
    if (dd && dd.input && !dd.input._rfHooked) {
      dd.input._rfHooked = true;
      dd.input.addEventListener('input', () => rfApplyDD(id));
    }
  });
}

function trackC1Usage(text) {
  const usage = getC1Usage();
  usage[text] = (usage[text] || 0) + 1;
  localStorage.setItem(C1_USAGE_KEY, JSON.stringify(usage));
  renderC1QuickBtns();
}

function renderC1QuickBtns() {
  const container = document.getElementById('c1-quick-btns');
  if (!container) return;
  const usage = getC1Usage();
  const sorted = Object.entries(usage).sort((a,b) => b[1]-a[1]).slice(0,8);
  container.innerHTML = '';
  sorted.forEach(([text, count], i) => {
    const btn = document.createElement('button');
    btn.className = 'c1-quick';
    const label = text.length > 18 ? text.slice(0,16) + '…' : text;
    btn.title = text + ' (' + count + ' uses)';
    if (i < 3) {
      btn.innerHTML = label + ' <span style="background:rgba(0,0,0,.15);border-radius:8px;padding:0 4px;font-size:9px">' + count + '</span>';
    } else {
      btn.textContent = label;
    }
    if (i === 0) { btn.style.background='#1a3560'; btn.style.color='#fff'; btn.style.borderColor='#1a3560'; }
    btn.onclick = () => { appendC1(text); trackC1Usage(text); };
    container.appendChild(btn);
  });
  const addBtn = document.createElement('button');
  addBtn.className = 'c1-quick';
  addBtn.title = 'Save current C1 as quick button';
  addBtn.textContent = '＋';
  addBtn.style.cssText = 'background:#27ae60;color:#fff;border-color:#27ae60;font-weight:700';
  addBtn.onclick = addC1QuickPhrase;
  container.appendChild(addBtn);
}

function learnFromSavedReports() {
  const usage = getC1Usage();
  const reports = typeof loadSavedReports === 'function' ? loadSavedReports() : [];
  reports.forEach(r => {
    if (!r.c1 || r.c1.trim().length < 5 || r.c1.length > 80) return;
    const text = r.c1.trim();
    usage[text] = (usage[text] || 0) + 1;
  });
  localStorage.setItem(C1_USAGE_KEY, JSON.stringify(usage));
  renderC1QuickBtns();
}

function renderTemplateButtons() { renderTemplateSelect(); }

function applyTemplate(idx) {
  const templates = getTemplates();
  const tpl = templates[idx];
  if (!tpl) return;
  const fC1 = document.getElementById('f-c1');
  const fC2 = document.getElementById('f-c2');
  const fC3 = document.getElementById('f-c3');
  if (fC1 && tpl.c1) fC1.value = tpl.c1;
  if (fC2 && tpl.c2) fC2.value = tpl.c2;
  if (fC3 && tpl.c3) fC3.value = tpl.c3;
  // Apply parts — first remove empty rows, then add template parts
  if (tpl.parts && tpl.parts.length) {
    // Remove rows that have no part number and no description
    [...partRows].forEach(id => {
      if (!partData[id]?.partNo && !document.getElementById(`pdesc-${id}`)?.value?.trim()) {
        removePartRow(id);
      }
    });
    tpl.parts.forEach(p => {
      addPartRow();
      const id = partIdCounter;
      const qEl = document.getElementById(`qty-${id}`);
      const dEl = document.getElementById(`pdesc-${id}`);
      if (qEl) qEl.value = p.qty;
      if (dEl) dEl.value = p.desc;
      partData[id] = {qty:p.qty, partNo:p.partNo, desc:p.desc};
      const dd = dropdownRegistry[`part-${id}`];
      if (dd && p.partNo) { dd.selected={_custom:true,value:p.partNo}; dd.input.value=p.partNo; dd.wrap.classList.add('has-value'); }
    });
  }
  // Apply complications
  if (tpl.complications && tpl.complications.length) {
    tpl.complications.forEach(c => {
      selectedComplications.add(c);
      document.querySelectorAll('#complications-grid .comp-item').forEach(el => {
        if (el.textContent === c) el.classList.add('selected');
      });
    });
  }
  if (tpl.type) setType(tpl.type);
  snack(`✔ Template applied: ${tpl.name}`);
}

function renderPartSetButtons() {
  const c = document.getElementById('part-set-buttons');
  if (!c) return;
  const sets = getPartSets();
  if (!sets.length) { c.innerHTML = '<span style="font-size:11px;color:var(--muted)">No part sets saved yet</span>'; return; }
  c.innerHTML = sets.map((s, i) => `
    <button class="part-set-btn" onclick="applyPartSet(${i})" title="${escapeHtml(s.parts.map(p=>p.partNo).join(', '))}">
      📦 ${escapeHtml(s.name)}
    </button>
    <button class="btn-icon" onclick="deletePartSet(${i})" title="Delete" style="font-size:12px;margin-right:4px">✕</button>
  `).join('');
}

function applyPartSet(idx) {
  const sets = getPartSets();
  const set = sets[idx];
  if (!set) return;
  if (!confirm(`Apply part set "${set.name}"? Empty rows will be removed first.`)) return;
  // Remove empty rows first
  [...partRows].forEach(id => {
    if (!partData[id]?.partNo && !document.getElementById(`pdesc-${id}`)?.value?.trim()) {
      removePartRow(id);
    }
  });
  set.parts.forEach(p => {
    addPartRow();
    const id = partIdCounter;
    const qEl = document.getElementById(`qty-${id}`);
    const dEl = document.getElementById(`pdesc-${id}`);
    if (qEl) qEl.value = p.qty;
    if (dEl) dEl.value = p.desc;
    partData[id] = {qty: p.qty, partNo: p.partNo, desc: p.desc};
    const dd = dropdownRegistry[`part-${id}`];
    if (dd && p.partNo) {
      dd.selected = {_custom:true, value:p.partNo};
      dd.input.value = p.partNo;
      dd.wrap.classList.add('has-value');
    }
  });
  snack(`✔ Applied: ${set.name}`);
}

function renderSavedList() {
  const all = loadSavedReports();
  const c = document.getElementById('saved-list-container');
  if (!c) return;
  if (!all.length) {
    c.innerHTML = '<div class="empty-state"><h3>No saved reports yet</h3><p>Click 💾 Save in any Field Report to save it here.</p></div>';
    return;
  }
  // Group by date+shift (archive by shift)
  const groups = {};
  all.forEach((r, i) => {
    const key = `${r.date || 'no-date'} · ${r.shift || 'no-shift'}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push({r, i});
  });
  // Sort group keys descending by date
  const keys = Object.keys(groups).sort((a,b) => b.localeCompare(a));

  c.innerHTML = keys.map(key => {
    const items = groups[key];
    return `<div style="margin-bottom:24px">
      <h3 style="font-family:'Barlow Condensed',sans-serif;font-size:18px;color:var(--steel);margin-bottom:8px;letter-spacing:.5px">📅 ${escapeHtml(key)} <span style="font-size:13px;color:var(--muted);font-weight:400">— ${items.length} report${items.length===1?'':'s'}</span></h3>
      <div class="saved-list">${items.map(({r,i}) => {
        const techNames = (r.techs || []).map(t => (t.name || '').split(/\\s{2,}/)[0]).join(', ');
        const savedTime = r.savedAt ? new Date(r.savedAt).toLocaleTimeString('en-CA', {hour:'2-digit', minute:'2-digit'}) : '';
        return `<div class="saved-item">
          <div class="saved-num">${escapeHtml(r.reportNum || '—')}</div>
          <div class="saved-meta">
            <strong>Unit ${escapeHtml(r.unit || '—')}</strong> · ${escapeHtml(r.type || '—')} · saved at ${escapeHtml(savedTime)}<br>
            <span style="font-size:11px">${escapeHtml(techNames)}</span>
          </div>
          <div class="saved-actions">
            <button onclick="previewSavedReport(${i})" style="background:var(--steel);color:#fff;border:none;border-radius:4px;padding:5px 10px;cursor:pointer;font-size:12px">👁 View</button>
            <button onclick="loadReportIntoForm(${i})">📝 Edit</button>
            <button onclick="openCopyOfReport(${i})" title="Open as new copy">📋 Copy</button>
            <button class="btn-danger" onclick="deleteSavedReport(${i})">✕</button>
          </div>
        </div>`;
      }).join('')}</div>
    </div>`;
  }).join('');
}
