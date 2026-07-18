// ═══════════════════════════════════
// SYNC.JS
// ═══════════════════════════════════

function setSyncStatus(s, detail) {
  const c = {online:'#27ae60', offline:'#e74c3c', connecting:'#f39c12', syncing:'#3498db'};
  const color = c[s] || '#aaa';

  // Header dot
  const dot = document.getElementById('sync-dot');
  if (dot) { dot.style.background = color; dot.title = s; }

  // Sync bar
  const barDot   = document.getElementById('sync-dot-bar');
  const label    = document.getElementById('sync-label');
  const syncBtn  = document.getElementById('sync-btn');
  const lastEl   = document.getElementById('sync-last');

  if (barDot) barDot.style.background = color;
  if (label) {
    const msgs = {
      online:     '☁ Cloud sync ON',
      offline:    'Local only (tap to setup)',
      connecting: '⟳ Connecting…',
      syncing:    '↑ Syncing…',
    };
    label.textContent = detail || msgs[s] || s;
    label.style.color = s === 'offline' ? '#c0392b' : s === 'online' ? '#27ae60' : '#555';
  }
  if (syncBtn) syncBtn.style.display = s === 'online' || s === 'syncing' ? 'inline-block' : 'inline-block';
  if (lastEl && s === 'online') {
    const now = new Date();
    lastEl.textContent = 'Last sync: ' + now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  }
  window._lastSyncStatus = s;
}

function initSupabase() {
  // Always use the current hardcoded key (clears any stale cached key)
  const CURRENT_KEY = 'sb_publishable_uQp2rf4MOlodZUbTsN8LJA_D5CfY4Y4';
  localStorage.setItem('supabase_key', CURRENT_KEY);
  initSupabaseWithKey(SUPABASE_URL_CONST, CURRENT_KEY);
}

function initSupabaseWithKey(url, key) {
  try {
    if (typeof supabase === 'undefined') {
      setSyncStatus('offline', '⚠ Library not loaded — check CDN');
      return;
    }
    _sbClient = supabase.createClient(url, key);
    setSyncStatus('connecting', '⟳ Connecting…');

    _sbClient.from('field_reports').select('report_num').limit(1)
      .then(({data, error}) => {
        if (error) {
          const msg = error.message || error.code || JSON.stringify(error);
          console.error('Supabase:', msg, error);

          // Table doesn't exist — offer to create it
          if (msg.includes('does not exist') || msg.includes('relation') ||
              error.code === '42P01' || msg.includes('PGRST')) {
            setSyncStatus('offline', '⚠ DB not set up');
            showSupabaseSetupBtn();
            // Auto-show setup on first load
            if (!localStorage.getItem('sb_setup_dismissed')) {
              setTimeout(supabaseSetupTable, 500);
            }
            return;
          }
          setSyncStatus('offline', '⚠ ' + msg.substring(0,50));
          return;
        }

        setSyncStatus('online', '☁ Synced');
        syncPullAll().then(() => {
          const count = loadSavedReports().length;
          setSyncStatus('online', '☁ Synced');
          const countEl = document.getElementById('sync-count');
          if (countEl) countEl.textContent = count + ' reports';
        });

        snack('☁ Connected — cloud sync active');
        // Poll for updates every 30 seconds (no real-time subscription to avoid postMessage errors)
        if (window._syncInterval) clearInterval(window._syncInterval);
        window._syncInterval = setInterval(async () => {
          if (_sbClient) {
            await syncPullReports();
            setSyncStatus('online', '☁ Synced');
          }
        }, 30000);
      })
      .catch(e => {
        console.error('Supabase catch:', e);
        setSyncStatus('offline', '⚠ Network error');
      });
  } catch(e) {
    console.error('Supabase init:', e);
    setSyncStatus('offline', '⚠ Init failed: ' + e.message);
  }
}

function waitForSupabase(tries) {
  if (typeof supabase !== 'undefined') {
    initSupabase();
  } else if (tries > 0) {
    setTimeout(function() { waitForSupabase(tries - 1); }, 400);
  } else {
    setSyncStatus('offline', '⚠ CDN not loaded');
  }
}

async function syncPushReport(reportData) {
  if (!_sbClient || !reportData.reportNum) return;
  setSyncStatus('syncing');
  try {
    await _sbClient.from('field_reports').upsert({
      report_num: reportData.reportNum,
      data: reportData,
      updated_at: new Date().toISOString()
    }, {onConflict:'report_num'});
    setSyncStatus('online');
  } catch(e) { setSyncStatus('offline'); }
}

async function syncPullAll() {
  if (!_sbClient) return;
  setSyncStatus('syncing');
  try {
    const {data, error} = await _sbClient.from('field_reports')
      .select('report_num,data').order('updated_at', {ascending:false});
    if (!error && data) {
      const reports = data.map(r => ({...r.data, reportNum: r.report_num}));
      saveSavedReports(reports);
    }
    setSyncStatus('online');
  } catch(e) { setSyncStatus('offline'); }
}

async function manualSync() {
  setSyncStatus('syncing', '↑ Syncing…');
  if (!window._sbClient) {
    setSyncStatus('connecting', '⏳ Reconnecting…');
    waitForSupabase(10);
    return;
  }
  try {
    await syncPullAll();
    const count = (typeof loadSavedReports === 'function') ? loadSavedReports().length : 0;
    setSyncStatus('online', '☁ Synced');
    var ce = document.getElementById('sync-count');
    if (ce) ce.textContent = count + ' reports';
    if (typeof renderSavedList === 'function') renderSavedList();
    snack('☁ Synced — ' + count + ' reports');
  } catch(e) {
    setSyncStatus('offline', '⚠ ' + (e.message || 'Sync failed'));
  }
}
