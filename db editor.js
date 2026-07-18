// ═══════════════════════════════════
// DB_EDITOR.JS
// ═══════════════════════════════════

function renderDBTable(type) {
  // Highlight active tab
  ['parts','technicians','trucks','equipment'].forEach(t => {
    const btn = document.getElementById('db-tab-' + t);
    if (btn) {
      btn.style.background = (t === type) ? '#1a3560' : '#e8ecf0';
      btn.style.color = (t === type) ? '#fff' : '#333';
    }
  });

  const container = document.getElementById('db-editor-content');
  if (!container) { console.warn('db-editor-content not found'); return; }

  let items, storageKey, addLabel, renderRow, defaultItem;

  if (type === 'parts') {
    items = getPartsDB(); storageKey = DB_KEYS.parts; addLabel = '＋ Add Part';
    defaultItem = { partNo: '', desc: '' };
    renderRow = (item, i) => `
      <tr id="db-row-${i}">
        <td style="padding:5px 8px"><input type="text" value="${escapeHtml(item.partNo||'')}"
          oninput="dbUpdateField('${type}',${i},'partNo',this.value)"
          style="width:110px;padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-family:monospace;font-size:12px"></td>
        <td style="padding:5px 8px"><input type="text" value="${escapeHtml(item.desc||'')}"
          oninput="dbUpdateField('${type}',${i},'desc',this.value)"
          style="width:100%;padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px"></td>
        <td style="padding:5px 8px;white-space:nowrap">
          <button onclick="dbCopyItem('${type}',${i})" class="db-action-btn" title="Duplicate row">⧉ Dup</button>
          <button onclick="dbRemoveItem('${type}',${i})" class="db-action-btn db-danger" title="Delete">🗑</button>
        </td>
      </tr>`;
  } else if (type === 'technicians') {
    items = getTechniciansDB(); storageKey = DB_KEYS.technicians; addLabel = '＋ Add Technician';
    defaultItem = '';
    renderRow = (item, i) => {
      const val = typeof item === 'string' ? item : JSON.stringify(item);
      return `<tr id="db-row-${i}">
        <td style="padding:5px 8px" colspan="2"><input type="text" value="${escapeHtml(val)}"
          oninput="dbUpdateField('${type}',${i},'value',this.value)"
          style="width:100%;padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px"
          placeholder="Full Name   ID-12345678"></td>
        <td style="padding:5px 8px;white-space:nowrap">
          <button onclick="dbCopyItem('${type}',${i})" class="db-action-btn" title="Duplicate row">⧉ Dup</button>
          <button onclick="dbRemoveItem('${type}',${i})" class="db-action-btn db-danger" title="Delete">🗑</button>
        </td>
      </tr>`;
    };
  } else if (type === 'trucks') {
    items = getTrucksDB(); storageKey = DB_KEYS.trucks; addLabel = '＋ Add Truck';
    defaultItem = '';
    renderRow = (item, i) => {
      const val = typeof item === 'string' ? item : JSON.stringify(item);
      return `<tr id="db-row-${i}">
        <td style="padding:5px 8px" colspan="2"><input type="text" value="${escapeHtml(val)}"
          oninput="dbUpdateField('${type}',${i},'value',this.value)"
          style="width:100%;padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px"
          placeholder="Truck name or number"></td>
        <td style="padding:5px 8px;white-space:nowrap">
          <button onclick="dbCopyItem('${type}',${i})" class="db-action-btn" title="Duplicate row">⧉ Dup</button>
          <button onclick="dbRemoveItem('${type}',${i})" class="db-action-btn db-danger" title="Delete">🗑</button>
        </td>
      </tr>`;
    };
  } else if (type === 'equipment') {
    items = getEquipmentDB(); storageKey = DB_KEYS.equipment; addLabel = '＋ Add Unit';
    defaultItem = { unit:'', make:'', model:'', serial:'', category:'' };
    renderRow = (item, i) => {
      const it = typeof item === 'string' ? {unit:item} : item;
      return `<tr id="db-row-${i}">
        <td style="padding:4px 5px"><input type="text" value="${escapeHtml(it.unit||'')}"
          oninput="dbUpdateField('${type}',${i},'unit',this.value)"
          style="width:80px;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:12px;font-weight:700" placeholder="Unit#"></td>
        <td style="padding:4px 5px"><input type="text" value="${escapeHtml(it.make||'')}"
          oninput="dbUpdateField('${type}',${i},'make',this.value)"
          style="width:70px;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:12px" placeholder="Make"></td>
        <td style="padding:4px 5px"><input type="text" value="${escapeHtml(it.model||'')}"
          oninput="dbUpdateField('${type}',${i},'model',this.value)"
          style="width:80px;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:12px" placeholder="Model"></td>
        <td style="padding:4px 5px"><input type="text" value="${escapeHtml(it.serial||'')}"
          oninput="dbUpdateField('${type}',${i},'serial',this.value)"
          style="width:90px;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:12px" placeholder="Serial"></td>
        <td style="padding:4px 5px"><input type="text" value="${escapeHtml(it.category||'')}"
          oninput="dbUpdateField('${type}',${i},'category',this.value)"
          style="width:70px;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:12px" placeholder="Category"></td>
        <td style="padding:4px 5px;white-space:nowrap">
          <button onclick="dbCopyItem('${type}',${i})" class="db-action-btn" title="Duplicate row">⧉ Dup</button>
          <button onclick="dbRemoveItem('${type}',${i})" class="db-action-btn db-danger" title="Delete">🗑</button>
        </td>
      </tr>`;
    };
  } else { return; }

  const TH = 'padding:8px 10px;background:#1a3560;color:#fff;text-align:left;font-weight:700;font-size:12px;white-space:nowrap';
  const hdrs = type === 'parts'
    ? '<th style="'+TH+'">Part No.</th><th style="'+TH+'">Description</th><th style="width:70px;background:#1a3560"></th>'
    : type === 'equipment'
    ? '<th style="'+TH+'">Unit#</th><th style="'+TH+'">Make</th><th style="'+TH+'">Model</th><th style="'+TH+'">Serial</th><th style="'+TH+'">Category</th><th style="width:70px;background:#1a3560"></th>'
    : '<th style="'+TH+';width:100%">Value</th><th style="width:70px;background:#1a3560"></th>';

  container.innerHTML = `
    <div style="background:#f8fafc;border-bottom:2px solid var(--border);padding:8px 10px;
      display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <button onclick="dbAddItem('${type}')" style="background:#27ae60;color:#fff;border:none;
        border-radius:6px;padding:7px 14px;cursor:pointer;font-size:13px;font-weight:600">${addLabel}</button>
      <button onclick="dbSave('${type}')" style="background:#1a3560;color:#fff;border:none;
        border-radius:6px;padding:7px 14px;cursor:pointer;font-size:13px;font-weight:600">💾 Save All</button>
      <input type="text" id="db-search-${type}" placeholder="🔍 Search…"
        style="flex:1;min-width:150px;padding:7px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px"
        oninput="dbFilterTable('${type}',this.value)">
      <span id="db-count-${type}" style="font-size:12px;color:#888;white-space:nowrap">${items.length} items</span>
    </div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr>${hdrs}</tr>
        </thead>
        <tbody id="db-tbody">${items.map((item,i) => renderRow(item,i)).join('')}</tbody>
      </table>
    </div>
    <div style="background:#f8fafc;border-top:2px solid var(--border);padding:8px 10px;
      display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <button onclick="dbAddItem('${type}')" style="background:#27ae60;color:#fff;border:none;
        border-radius:6px;padding:6px 14px;cursor:pointer;font-size:13px;font-weight:600">${addLabel}</button>
      <button onclick="dbSave('${type}')" style="background:#1a3560;color:#fff;border:none;
        border-radius:6px;padding:6px 14px;cursor:pointer;font-size:13px;font-weight:600">💾 Save All</button>
      <span style="font-size:11px;color:#aaa;margin-left:auto">⧉ Dup to copy · 🗑 to delete</span>
    </div>`;

  window._dbEditItems = JSON.parse(JSON.stringify(items));
  window._dbEditType  = type;
  window._dbEditKey   = storageKey;
  window._dbDefaultItem = defaultItem;
  window._dbRenderRow   = renderRow;
}

function dbSave(type) {
  if (!window._dbEditItems || !window._dbEditKey) return;
  localStorage.setItem(window._dbEditKey, JSON.stringify(window._dbEditItems));
  snack('✔ Saved ' + type + ' — ' + window._dbEditItems.length + ' items');
  rebuildDropdownsAfterDBSave(type);
}

function dbFilterTable(type, query) {
  const tbody = document.getElementById('db-tbody');
  const countEl = document.getElementById('db-count-' + type);
  if (!tbody) return;
  const q = query.toLowerCase().trim();
  let visible = 0;
  tbody.querySelectorAll('tr').forEach(tr => {
    // Collect all input values in this row (inputs hold the data, not textContent)
    const rowText = Array.from(tr.querySelectorAll('input'))
      .map(inp => inp.value || inp.placeholder || '')
      .join(' ')
      .toLowerCase();
    const show = !q || rowText.includes(q);
    tr.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  if (countEl) {
    const total = window._dbEditItems ? window._dbEditItems.length : tbody.querySelectorAll('tr').length;
    countEl.textContent = q ? (visible + ' of ' + total + ' items') : (total + ' items');
  }
}

function dbAddItem(type) {
  if (!window._dbEditItems) return;
  const def = JSON.parse(JSON.stringify(window._dbDefaultItem || ''));
  window._dbEditItems.push(def);
  dbSave(type);
  renderDBTable(type);
  // Scroll to bottom and focus new row
  setTimeout(() => {
    const tbody = document.getElementById('db-tbody');
    if (tbody) tbody.lastElementChild?.querySelector('input')?.focus();
  }, 100);
}

function dbRemoveItem(type, idx) {
  if (!window._dbEditItems) return;
  window._dbEditItems.splice(idx, 1);
  dbSave(type);
  renderDBTable(type);
}

function dbCopyItem(type, idx) {
  if (!window._dbEditItems) return;
  const copy = JSON.parse(JSON.stringify(window._dbEditItems[idx]));
  // Modify unit# to indicate it's a copy
  if (copy && typeof copy === 'object' && copy.unit) copy.unit = copy.unit + '-COPY';
  else if (typeof copy === 'string') copy = copy + ' (copy)';
  window._dbEditItems.splice(idx + 1, 0, copy);
  dbSave(type);
  renderDBTable(type);
  snack('✔ Row copied');
  // Focus the new row
  setTimeout(() => {
    const newRow = document.getElementById('db-row-' + (idx+1));
    if (newRow) { newRow.style.background='#fffde7'; newRow.querySelector('input')?.focus(); }
  }, 100);
}
