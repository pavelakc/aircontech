// ═══════════════════════════════════
// TIMECARD.JS
// ═══════════════════════════════════

function calcHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

function getDefaultTruckForTech(techName) {
  if (!techName) return '';
  const lower = techName.toLowerCase();
  for (const [key, truck] of Object.entries(TECH_TRUCK_MAP)) {
    if (lower.includes(key)) return truck;
  }
  return '';
}

function autoShiftFollowingRows(changedIdx, fromEnd) {
  // Cascade: when row N changes, row N+1's start = row N's end, etc.
  // If 'start' was changed and end is empty, do nothing further.
  // If 'end' was changed, propagate so next row starts at this end.
  const row = timeCardRows[changedIdx];
  if (!row) return;

  let cursor = row.end;
  if (!cursor && row.start && fromEnd === false) {
    // start changed but no end; can't propagate
    return;
  }
  for (let i = changedIdx + 1; i < timeCardRows.length; i++) {
    const r = timeCardRows[i];
    if (!cursor) break;
    // Calculate this row's existing duration to preserve it
    const existingDur = calcHours(r.start, r.end);
    r.start = cursor;
    if (existingDur > 0) {
      const [sh, sm] = cursor.split(':').map(Number);
      let endMin = sh * 60 + sm + existingDur * 60;
      endMin = Math.round(endMin / 10) * 10;
      const eh = Math.floor(endMin / 60) % 24;
      const em = endMin % 60;
      r.end = `${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`;
    }
    cursor = r.end;
  }
  renderTimeCardRows();
}

function setTcField(idx, field, val) {
  if (!timeCardRows[idx]) return;
  timeCardRows[idx][field] = val;
  // When start time changes, auto-shift subsequent rows so total stays continuous
  if (field === 'start' && val) {
    autoShiftFollowingRows(idx);
  }
  if (field === 'end' && val) {
    autoShiftFollowingRows(idx, true);
  }
  recalcTimeCard();
  syncTimeCardToReports();
}

function syncTimeCardToReports() {
  const all = loadSavedReports();
  if (!all || !all.length) return;
  let updated = 0;
  timeCardRows.forEach(row => {
    if (!row.fr) return;
    const rIdx = all.findIndex(r => r.reportNum === row.fr);
    if (rIdx < 0) return;
    const r = all[rIdx];
    r.startTime = row.start || '';
    r.endTime   = row.end   || '';
    if (r.techs && r.techs.length) {
      r.techs[0].timeIn  = row.start || '';
      r.techs[0].timeOut = row.end   || '';
    }
    updated++;
  });
  if (updated > 0) {
    saveSavedReports(all);
    timeCardRows.forEach(row => {
      if (!row.fr) return;
      const r = all.find(rep => rep.reportNum === row.fr);
      if (r) syncPushReport(r).catch(()=>{});
    });
  }
}

function rebuildTimeCard() {
  // Auto-fill truck from first matching report
  setTimeout(function() {
    const sel = document.getElementById('tc-truck-manual');
    if (sel && !sel.value) {
      const reports = typeof loadSavedReports === 'function' ? loadSavedReports() : [];
      const techDD = dropdownRegistry['tc-tech'];
      const techName = techDD?.input?.value || '';
      const dateStr = document.getElementById('tc-date-start')?.value || '';
      const match = reports.find(r => r.date === dateStr &&
        (r.techs||[]).some(t => (t.name||'').split(/  +/)[0].trim() === techName.split(/  +/)[0].trim()) &&
        r.truck);
      if (match && match.truck) { sel.value = match.truck || ''; }
    }
  }, 200);
  const techDD = dropdownRegistry['tc-tech'];
  const techName = techDD ? (techDD.selected && techDD.selected._custom ? techDD.selected.value :
                              (typeof techDD.selected === 'string' ? techDD.selected :
                               (techDD.input ? techDD.input.value : ''))) : '';
  const dateStr = document.getElementById('tc-date-start').value;
  const shiftDD = dropdownRegistry['tc-shift'];
  const shift = shiftDD ? (shiftDD.selected || shiftDD.input.value || '') : '';
  const isNightShift = shift && shift.endsWith('N');

  const tbody = document.getElementById('tc-rows');
  const countEl = document.getElementById('tc-fr-count');

  if (!techName || !dateStr) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="9">Select a technician and date to load Field Reports</td></tr>';
    countEl.textContent = '';
    timeCardRows = [];
    recalcTimeCard();
    return;
  }

  // Find saved reports matching tech + date + shift
  const all = loadSavedReports();
  const techCleanName = techName.split(/\s{2,}/)[0].trim().toLowerCase();
  const matches = all.filter(r => {
    if (r.date !== dateStr) return false;
    // Shift filter: relaxed - skip if either is empty
    if (shift && r.shift && r.shift.trim() && r.shift !== shift) return false;
    return (r.techs || []).some(t => {
      const tFull = (t.name || '').trim().toLowerCase();
      const tFirst = tFull.split(/\s{2,}/)[0].trim();
      // Match exact or partial (handles badge number in name)
      return tFirst === techCleanName ||
             tFull.startsWith(techCleanName) ||
             techCleanName.startsWith(tFirst) ||
             tFirst.includes(techCleanName) ||
             techCleanName.includes(tFirst);
    });
  });

  // Sort by savedAt timestamp (creation order)
  matches.sort((a, b) => (a.savedAt || '').localeCompare(b.savedAt || ''));

  // Holiday check
  const holiday = isCanadianHoliday(dateStr);
  let holidayHint = '';
  if (holiday) holidayHint = ` · 🎉 ${holiday} (consider OT)`;

  countEl.textContent = `(${matches.length} report${matches.length === 1 ? '' : 's'} · ${isNightShift ? '🌙 Night' : '☀ Day'} shift${holidayHint})`;

  if (!matches.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="9">No Field Reports found for this technician on this date/shift.<br>Create reports in the Field Report tab first.</td></tr>';
    timeCardRows = [];
    recalcTimeCard();
    return;
  }

  // Preserve user-entered times for known FRs
  const oldByFr = {};
  timeCardRows.forEach(r => { if (r.fr) oldByFr[r.fr] = r; });

  timeCardRows = matches.map((r, idx) => ({
    id: idx,
    reportIdx: all.indexOf(r),  // index in storage for sync-back
    fr: r.reportNum || '',
    job: 'SCL ' + (r.unit || ''),
    unit: r.unit,
    truck: r.truck || '',
    shift: r.shift || '',
    start: oldByFr[r.reportNum]?.start || '',
    end: oldByFr[r.reportNum]?.end || '',
    night: (() => {
      if (oldByFr[r.reportNum] !== undefined) return oldByFr[r.reportNum].night;
      if (isNightShift) return true;
      // Auto-detect from report start time
      const st = r.startTime || r.shiftStart || '';
      if (st) {
        const [sh, sm] = st.split(':').map(Number);
        if (sh >= 18) return true;
      }
      return false;
    })(),
    ot: oldByFr[r.reportNum]?.ot || false  // OT manual only
  }));

  renderTimeCardRows();
  initTCDragDrop();
}

function recalcTimeCard() {
  let totReg = 0, totOt = 0, totNight = 0;

  timeCardRows.forEach((r, idx) => {
    const hrs = calcHours(r.start, r.end);
    let reg = 0, ot = 0, night = 0;
    if (hrs > 0) {
      // Night = marker only, hours ALWAYS go to REG
      // OT + REG = double pay (both show same hours)
      if (r.ot) {
        ot  = hrs;
        reg = hrs; // double pay
      } else {
        reg = hrs; // always REG regardless of night flag
      }
      // Night is just an informational marker (X in print)
      // Auto-detect night if start time >= 18:20
      if (!r.night && r.start) {
        const [sh, sm] = (r.start || '00:00').split(':').map(Number);
        if (sh >= 18) {
          r.night = true;
          const nightCb = document.getElementById('tc-rows')
            ?.querySelector('tr:nth-child('+(idx+1)+') input[type=checkbox]:last-of-type');
          if (nightCb && !nightCb.checked) nightCb.checked = true;
        }
      }
    }
    totReg += reg; totOt += ot; totNight += night;
    const fmt = (n) => n > 0 ? n.toFixed(2) : '—';
    const regEl   = document.getElementById(`tc-reg-${idx}`);
    const otEl    = document.getElementById(`tc-ot-${idx}`);
    const nightEl = document.getElementById(`tc-night-${idx}`);
    const totEl   = document.getElementById(`tc-tot-${idx}`);
    if (regEl)   regEl.textContent   = fmt(reg);
    if (otEl)    otEl.textContent    = ot > 0 ? ot.toFixed(2) : '';
    if (nightEl) nightEl.textContent = night > 0 ? night.toFixed(2) : '';
    if (totEl)   totEl.textContent   = (reg+ot+night) > 0 ? (reg+ot+night).toFixed(2) : '—';
  });

  const totalHours = totReg + totOt + totNight;
  const totPaid = totalHours;

  // Update tfoot totals
  var el;
  el = document.getElementById('tf-reg');   if(el) el.textContent = totReg.toFixed(2);
  el = document.getElementById('tf-ot');    if(el) el.textContent = totOt.toFixed(2);
  el = document.getElementById('tf-night'); if(el){ var _anyN=(timeCardRows||[]).some(function(r){return r.night;}); el.textContent=_anyN?'X':'—'; el.style.fontSize=_anyN?'18px':''; }
  el = document.getElementById('tf-total'); if(el) el.textContent = totPaid.toFixed(2);

  // Validation: must total exactly 12 hours (excluding lunch)
  const target = 12;
  const tolerance = 0.01;
  const warnEl = document.getElementById('tc-12h-warn');
  if (warnEl) {
    if (timeCardRows.length === 0) {
      warnEl.textContent = '';
      warnEl.className = 'tc-warn';
    } else if (Math.abs(totalHours - target) < tolerance) {
      warnEl.textContent = `✔ Exactly ${target}h covered`;
      warnEl.className = 'tc-warn ok';
    } else if (totalHours < target) {
      warnEl.textContent = `⚠ Only ${totalHours.toFixed(2)}h covered — need ${(target - totalHours).toFixed(2)}h more for full shift`;
      warnEl.className = 'tc-warn err';
      // Highlight rows red
      document.querySelectorAll('#tc-rows tr').forEach(tr => tr.classList.add('tc-row-warn'));
    } else {
      warnEl.textContent = `⚠ ${totalHours.toFixed(2)}h covered — exceeds 12h shift by ${(totalHours - target).toFixed(2)}h`;
      warnEl.className = 'tc-warn err';
      document.querySelectorAll('#tc-rows tr').forEach(tr => tr.classList.add('tc-row-warn'));
    }
    if (Math.abs(totalHours - target) < tolerance) {
      document.querySelectorAll('#tc-rows tr').forEach(tr => tr.classList.remove('tc-row-warn'));
    }
  }
}

function renderTimeCardRows() {
  const tbody = document.getElementById('tc-rows');
  const timeOpts = generateTimeOptions();
  const buildSelect = (idx, field, currentVal) => {
    const optsHtml = '<option value="">--</option>' + timeOpts.map(t =>
      `<option value="${t}"${t===currentVal?' selected':''}>${t}</option>`
    ).join('');
    return `<select onchange="setTcField(${idx},'${field}',this.value)">${optsHtml}</select>`;
  };

  tbody.innerHTML = timeCardRows.map((r, idx) => `
    <tr id="tc-row-${idx}" draggable="true"
      ondragstart="tcDragStart(event,${idx})"
      ondragover="tcDragOver(event)"
      ondrop="tcDrop(event,${idx})"
      ondragend="tcDragEnd(event)">
      <td class="col-fr" style="white-space:nowrap">
        <span style="color:#aaa;cursor:grab;margin-right:4px" title="Drag to reorder">⠿</span>${escapeHtml(r.fr)}
      </td>
      <td class="col-job">${escapeHtml(r.job)}</td>
      <td class="col-time">${buildSelect(idx, 'start', r.start)}</td>
      <td class="col-time">${buildSelect(idx, 'end', r.end)}</td>
      <td class="col-hours" id="tc-reg-${idx}" style="text-align:center">—</td>
      <td class="col-hours" style="text-align:center">
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
          <input type="checkbox" ${r.ot?'checked':''} onchange="setTcField(${idx},'ot',this.checked)" title="OT: check for overtime (can combine with REG for double pay)" style="margin:0">
          <span id="tc-ot-${idx}" style="font-size:11px;color:#b35400;font-weight:700"></span>
        </div>
      </td>
      <td class="col-hours" style="text-align:center">
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
          <input type="checkbox" ${r.night?'checked':''} onchange="setTcField(${idx},'night',this.checked)" title="Mark as Night" style="margin:0">
          <span id="tc-night-${idx}" style="font-size:11px;color:#1a5276;font-weight:700"></span>
        </div>
      </td>
      <td class="col-hours" id="tc-tot-${idx}" style="text-align:center">—</td>
    </tr>
  `).join('');
  recalcTimeCard();
}

async function tcDistribute12h() {
  if (!timeCardRows || !timeCardRows.length) {
    snack('⚠ No reports in Time Card — select technician and date first');
    return;
  }

  const n = timeCardRows.length;
  const totalMinutes = 12 * 60;      // 720 min = 12h shift
  const perJob = Math.floor(totalMinutes / n);
  const remainder = totalMinutes - perJob * n;

  // Default shift start: 07:00 day / 19:00 night
  const shiftDD = dropdownRegistry['tc-shift'];
  const shift = shiftDD ? (shiftDD.input?.value || '') : '';
  // Use the actual Shift Start Time input value
  const startTimeEl = document.getElementById('tc-shift-start');
  let startTime = startTimeEl ? startTimeEl.value : '';
  let cursor = 7 * 60; // default 07:00
  if (startTime) {
    const [sh, sm] = startTime.split(':').map(Number);
    cursor = sh * 60 + (sm || 0);
  } else if (shift && shift.endsWith('N')) {
    cursor = 19 * 60; // 19:00 night default
  }

  const toHHMM = m => {
    const h = Math.floor(((m % 1440) + 1440) % 1440 / 60);
    const min = ((m % 1440) + 1440) % 1440 % 60;
    return String(h).padStart(2,'0') + ':' + String(min).padStart(2,'0');
  };

  const allReports = loadSavedReports ? loadSavedReports() : [];

  snack('⚡ Distributing 12h across ' + n + ' reports…');

  for (let i = 0; i < timeCardRows.length; i++) {
    const row = timeCardRows[i];
    const duration = perJob + (i === n-1 ? remainder : 0);
    const startTime = toHHMM(cursor);
    const endTime   = toHHMM(cursor + duration);
    cursor += duration;

    // Use setTcField so the UI selects are also updated + recalc runs
    timeCardRows[i].start = startTime;
    timeCardRows[i].end   = endTime;

    // Save back to field report
    const report = allReports.find(r => r.reportNum === row.fr);
    if (report) { report.startTime = startTime; report.endTime = endTime; }
  }

  // Persist updated reports
  if (typeof saveSavedReports === 'function') saveSavedReports(allReports);

  // Sync changed reports to cloud
  if (typeof syncPushReport === 'function') {
    const tcReportNums = new Set(timeCardRows.map(r => r.fr));
    allReports.filter(r => tcReportNums.has(r.reportNum)).forEach(r => {
      syncPushReport(r).catch(() => {});
    });
  }

  // Rebuild TC UI with new times
  renderTimeCardRows();
  recalcTimeCard();
  snack('✔ 12h distributed equally — reports updated');
}

function tcSelectAllCol(field) {
  if (!timeCardRows||!timeCardRows.length) return;
  var anySet = timeCardRows.some(function(r){return r[field];});
  var newVal = !anySet;
  timeCardRows.forEach(function(r,idx){
    r[field] = newVal;
    var row = document.querySelectorAll('#tc-rows tr')[idx];
    if (row) {
      var cbs = row.querySelectorAll('input[type=checkbox]');
      if (field==='ot'    && cbs[0]) cbs[0].checked=newVal;
      if (field==='night' && cbs[1]) cbs[1].checked=newVal;
    }
  });
  recalcTimeCard(); syncTimeCardToReports();
  snack(newVal?('All '+field+' marked'):('All '+field+' cleared'));
}

function tcPopulateTruckDropdown() {
  const t=new Set();
  (typeof getTrucksDB==='function'?getTrucksDB():[]).forEach(v=>{if(v)t.add(v.trim());});
  (typeof loadSavedReports==='function'?loadSavedReports():[]).forEach(r=>{if(r.truck)t.add(r.truck.trim());});
  const l=[...t].filter(Boolean).sort();
  ['truck-list-1','truck-list-2'].forEach(id=>{const d=document.getElementById(id);if(d)d.innerHTML=l.map(v=>'<option value="'+v+'">').join('');});
}

function tcPopulateTech2Dropdown() {
  var sel = document.getElementById('tc-tech2');
  if (!sel) return;
  var current = sel.value;
  while (sel.options.length > 1) sel.remove(1);
  var techs = typeof getTechniciansDB === 'function' ? getTechniciansDB() : [];
  techs.forEach(function(t) {
    var full = typeof t === 'string' ? t : '';
    var name = full.split(/  +/)[0].trim();
    if (!name) return;
    var opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    opt.dataset.full = full; // store full entry for badge lookup
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

function tcAutoFillBadge2(techName) {
  if (!techName) {
    var b2 = document.getElementById('tc-badge2-manual');
    if (b2) b2.value = '';
    return;
  }
  var techs = typeof getTechniciansDB === 'function' ? getTechniciansDB() : [];
  var entry = techs.find(function(t) {
    return (typeof t === 'string' ? t : '').split(/  +/)[0].trim().toLowerCase() === techName.toLowerCase();
  });
  var b2 = document.getElementById('tc-badge2-manual');
  if (b2 && entry) {
    b2.value = entry.split(/  +/)[1] || '';
  }
}

function tcSetDate(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const iso = d.toISOString().split('T')[0];
  const el = document.getElementById('tc-date-start');
  if (el) { el.value = iso; rebuildTimeCard(); }
}

function tcSetShiftStart(time) {
  const el = document.getElementById('tc-shift-start');
  if (el) { el.value = time; el.dataset.userSet = 1; }
}

function initTimeCardView() {
  if (!timeCardInited) {
    createDropdown({
      id: 'tc-tech',
      container: 'dd-tc-tech',
      items: getTechniciansDB(),
      placeholder: 'Select technician…',
      allowCustom: true,
      onSelect: (v) => {
        const name = (v && v._custom) ? v.value : (v || '');
        // Auto-fill truck from tech's default truck
        const defaultTruck = getDefaultTruckForTech(name);
        const truckEl = document.getElementById('tc-truck-manual');
        if (truckEl && defaultTruck && !truckEl.value) {
          truckEl.value = defaultTruck;
        }
        // Auto-fill badge from tech DB
        const badgeEl = document.getElementById('tc-badge-manual');
        if (badgeEl && name) {
          const techs = typeof getTechniciansDB === 'function' ? getTechniciansDB() : [];
          const techEntry = techs.find(t => {
            const tn = (typeof t === 'string' ? t : '').split(/  +/)[0].trim();
            return tn.toLowerCase() === name.split(/  +/)[0].trim().toLowerCase();
          });
          if (techEntry) {
            const parts = techEntry.split(/  +/);
            badgeEl.value = parts[1] || '';
          } else {
            badgeEl.value = '';
          }
        }
        rebuildTimeCard();
      }
    });
    createDropdown({
      id: 'tc-truck', container: 'dd-tc-truck',
      items: TRUCKS, placeholder: 'Select truck…',
      allowCustom: true, onSelect: () => {}
    });
    createDropdown({
      id: 'tc-shift', container: 'dd-tc-shift',
      items: SHIFTS, placeholder: 'Select shift…',
      onSelect: () => {
        // When shift changes, update default start time
        updateDefaultShiftStart();
        rebuildTimeCard();
      }
    });

    // No default date/shift — user selects manually
    tcPopulateTruckDropdown();
    tcPopulateTech2Dropdown();
    // Default date = today
    const tcDateEl = document.getElementById('tc-date-start');
    if (tcDateEl && !tcDateEl.value) {
      tcDateEl.value = new Date().toISOString().split('T')[0];
    }
    timeCardInited = true;
  }
  rebuildTimeCard();
}

function buildTimeCardHtml(overrideTech) {
  // Save current tech, swap, generate, restore
  var techDD = dropdownRegistry['tc-tech'];
  var origTech = techDD?.input?.value || '';
  if (overrideTech && overrideTech !== origTech.split(/  +/)[0].trim()) {
    // Find badge for this tech
    var techs = typeof getTechniciansDB === 'function' ? getTechniciansDB() : [];
    var entry = techs.find(function(t) {
      return (typeof t === 'string' ? t : '').split(/  +/)[0].trim().toLowerCase() === overrideTech.toLowerCase();
    });
    if (entry && techDD && techDD.input) {
      techDD.input.value = entry;
    }
  }

  var techName = overrideTech || origTech.split(/  +/)[0].trim();
  var techs2 = typeof getTechniciansDB === 'function' ? getTechniciansDB() : [];
  var entry2 = techs2.find(function(t) {
    return (typeof t==='string'?t:'').split(/  +/)[0].trim().toLowerCase() === techName.toLowerCase();
  });
  var badgeNum = entry2 ? (entry2.split(/  +/)[1] || '') : (document.getElementById('tc-badge-manual')?.value || '');

  // Use the printTimeCard logic but return HTML instead of opening window
  var _origOpen = window.openPrintWindow;
  var captured = '';
  window.openPrintWindow = function(body) { captured = body; };
  // Temporarily set badge
  var badgeEl = document.getElementById('tc-badge-manual');
  var origBadge = badgeEl ? badgeEl.value : '';
  if (badgeEl) badgeEl.value = badgeNum;
  // For tech2, use their truck if set
  const truckEl = document.getElementById('tc-truck-manual');
  const truck2El = document.getElementById('tc-truck2-manual');
  const origTruck = truckEl ? truckEl.value : '';
  if (overrideTech && overrideTech !== origTech.split(/  +/)[0].trim() && truck2El && truckEl) {
    truckEl.value = truck2El.value || origTruck;
  }

  try { printTimeCard(); } catch(e) {}

  window.openPrintWindow = _origOpen;
  if (badgeEl) badgeEl.value = origBadge;
  return captured;
}

function printBothTimeCards() {
  var tech1 = (dropdownRegistry['tc-tech']?.input?.value || '').split(/  +/)[0].trim();
  var tech2 = (document.getElementById('tc-tech2')?.value || '').split(/  +/)[0].trim();
  if (!tech1) { snack('Select Technician 1 first'); return; }

  // Build HTML for both cards
  var html1 = buildTimeCardHtml(tech1);
  var html2 = tech2 ? buildTimeCardHtml(tech2) : '';

  if (typeof openPrintWindow === 'function') {
    var combined = html1 + (html2 ? '<div style="page-break-before:always"></div>' + html2 : '');
    openPrintWindow(combined, 'Time Cards - ' + tech1 + (tech2 ? ' & ' + tech2 : ''));
  }
}
