// ═══════════════════════════════════
// PRINT.JS
// ═══════════════════════════════════

function openPrintWindow(bodyContent, title) {
  const win = window.open('', '_blank', 'width=920,height=820,scrollbars=yes');
  if (!win) { snack('Pop-ups blocked — please allow pop-ups and try again'); return; }
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="AIRCON">
  <meta name="theme-color" content="#1a3560">
  
  
    <title>${escapeHtml(title)}</title>
    <style>
      * { box-sizing:border-box; margin:0; padding:0; }
      body {
        font-family:Arial,Helvetica,sans-serif;
        background:#ccc;
        padding:16px;
      }
      .wrap {
        background:#fff;
        max-width:795px; /* A4 width at 96dpi minus margins */
        margin:0 auto;
        padding:12px 14px;
        box-shadow:0 3px 16px rgba(0,0,0,.3);
        min-height:1100px;
      }
      .hint {
        background:#e8f4e8; border:1px solid #3a8a3a;
        border-radius:6px; padding:8px 14px;
        max-width:795px; margin:0 auto 10px;
        font-size:12px; display:flex; align-items:center; gap:10px;
      }
      .hint b { color:#1a6a1a; }
      .hint button {
        margin-left:auto; background:#1a3560; color:#fff; border:none;
        padding:7px 20px; border-radius:4px; cursor:pointer;
        font-size:13px; font-weight:bold;
      }
      @media print {
        @page { size:A4 portrait; margin:0; }
        body  { background:#fff; padding:0; margin:0; }
        .wrap {
          box-shadow:none; padding:5mm 6mm;
          max-width:none; min-height:auto; margin:0;
          /* Scale down slightly if content overflows */
          transform-origin: top left;
        }
        .hint { display:none !important; }
      }
    
  /* Required field highlight */

</style>
    <scr` + `ipt src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"><` + `/script>
</head><body>
    <div class="hint">
      &#9989; Колонтитулы (URL и страница) уже <b>отключены</b> через CSS.
      Если всё равно видны — нажмите <b>Подробнее</b> в диалоге печати и снимите галочку <b>«Печатать колонтитулы»</b>.
      <button onclick="window.print()">&#128424; Печать / PDF</button>
    </div>
    <div class="wrap">${bodyContent}</div>
    <script>setTimeout(function(){ window.print(); }, 900);<\/script>
  </body></html>`);
  win.document.close();
}

function generatePrintHTML(d) {
  const S  = (v) => escapeHtml(String(v||''));
  const NL = (v) => S(v).replace(/\n/g,'<br>');
  const fmtDate = (s) => {
    if (!s) return '';
    return new Date(s+'T00:00:00').toLocaleDateString('en-US',
      {weekday:'long',year:'numeric',month:'long',day:'numeric'});
  };
  const frNum = (document.getElementById('f-reportnum')||{}).value || '—';
  const now   = new Date();
  const nowStr = now.toLocaleDateString('en-CA') + ' ' +
    String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');

  const logo = '<img src="data:image/jpeg;base64,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" style="height:44px;width:auto;display:block" alt="AYİKON">';;;;;;

  const partsFilled = (d.parts||[]).filter(p => p.partNo||p.desc);
  const PART_ROWS   = Math.max(5, partsFilled.length + 2);
  const CS = 'border-bottom:1px solid #b8c8dc;padding:2px 4px;font-size:12px';

  const partsBody = [
    ...partsFilled.map(p=>`<tr>
      <td style="${CS};text-align:center;width:24px">${S(p.qty)}</td>
      <td style="${CS};width:76px">${S(p.partNo)}</td>
      <td style="${CS}">${S(p.desc)}</td>
      <td style="${CS};width:30px"></td></tr>`),
    ...Array.from({length: PART_ROWS - partsFilled.length}, ()=>`<tr>
      <td style="${CS};height:14px"></td>
      <td style="${CS}"></td>
      <td style="${CS}"></td>
      <td style="${CS}"></td></tr>`)
  ].join('');

  const compsHTML = (d.complications||[]).length
    ? (d.complications||[]).map(c=>`<div style="font-size:12px;line-height:1.4">${S(c)}</div>`).join('')
    : '<span style="font-size:12px;color:#aaa">—</span>';

  const techs    = d.techs||[];
  const TR_COUNT = Math.max(3, techs.length);
  const TS = 'border-bottom:1px solid #b8c8dc;padding:1px 4px;font-size:12px';
  const CHK = (v) => `<span style="border:1px solid #333;display:inline-block;width:10px;height:10px;text-align:center;line-height:10px;font-size:12px">${v?'&#10003;':''}</span>`;

  const techBody = Array.from({length: TR_COUNT}, (_,i) => {
    const t = techs[i]||{};
    const nm = t.name ? t.name.split(/\s{2,}/)[0] : '';
    const id = t.name && /\s{2,}/.test(t.name) ? t.name.split(/\s{2,}/)[1]||'' : '';
    return `<tr>
      <td style="${TS}">${S(nm)} ${S(id)}</td>
      <td style="${TS};text-align:center;width:52px">${S(t.truck)}</td>
      <td style="${TS};text-align:center;width:28px">${CHK(t.reg)}</td>
      <td style="${TS};text-align:center;width:28px">${CHK(t.ot)}</td>
      <td style="${TS};text-align:center;width:32px">${CHK(t.stat)}</td>
      <td style="${TS};text-align:center;width:52px">${S(t.timeIn)}</td>
      <td style="${TS};text-align:center;width:52px">${S(t.timeOut)}</td>
    </tr>`;
  }).join('');

  const NV = '#6a7b97';
  const LB = '#dceaf8';
  const BD = `border:1px solid ${NV}`;
  const P  = 'padding:1px 3px';

  return `
<div style="display:flex;flex-direction:column;min-height:257mm;
     font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#000">

<table style="width:100%;margin-bottom:4px;border-collapse:collapse">
 <tr>
  <td style="width:28%;vertical-align:bottom">${logo}</td>
  <td style="width:36%;text-align:center;font-size:12px;color:#444;vertical-align:middle;line-height:1.6">
    8118 Manning Avenue<br>Fort McMurray, Alberta T9H 1V7<br>
    Phone: (780)791-0430<br>www.aircontech.com
  </td>
  <td style="width:36%;vertical-align:top;text-align:right;font-size:12px">
    <div style="color:#666;margin-bottom:2px">${S(nowStr)}</div>
    <div style="font-weight:bold;color:#444;margin-bottom:2px;font-size:12px">FIELD REPORT #</div>
    <div style="${BD};padding:3px 10px;font-size:16px;font-weight:bold;
                color:#cc0000;letter-spacing:1px;display:inline-block">${S(frNum)}</div>
    ${d.unit?`<div style="color:#888;margin-top:2px;font-size:12px">Unit # ${S(d.unit)}</div>`:''}
    ${d.invoice?`<div style="color:#888;font-size:12px">Invoice # ${S(d.invoice)}</div>`:''}
  </td>
 </tr>
</table>

<table style="width:100%;${BD};border-collapse:collapse;margin-bottom:3px;font-size:12px">
 <tr>
  <td style="background:${LB};${BD};${P};font-weight:bold;width:16%">CUSTOMER</td>
  <td style="${BD};${P};text-align:center;width:34%">Syncrude Mildred Lake</td>
  <td style="background:${LB};${BD};${P};font-weight:bold;width:16%">CONTACT</td>
  <td style="${BD};${P};text-align:center">${S(d.contact)}</td>
 </tr><tr>
  <td style="background:${LB};${BD};${P};font-weight:bold">DATE</td>
  <td style="${BD};${P};text-align:center">${fmtDate(d.date)}</td>
  <td style="background:${LB};${BD};${P};font-weight:bold">UNIT No.</td>
  <td style="${BD};${P};text-align:center">${S(d.unit)}</td>
 </tr><tr>
  <td style="background:${LB};${BD};${P};font-weight:bold">CUSTOMER PO #</td>
  <td style="${BD};${P};text-align:center">${S(d.po)}</td>
  <td style="background:${LB};${BD};${P};font-weight:bold">MAKE</td>
  <td style="${BD};${P};text-align:center">${S(d.make)}</td>
 </tr><tr>
  <td style="background:${LB};${BD};${P};font-weight:bold">WORK ORDER #</td>
  <td style="${BD};${P};text-align:center">${S(d.workorder)}</td>
  <td style="background:${LB};${BD};${P};font-weight:bold">MODEL</td>
  <td style="${BD};${P};text-align:center">${S(d.model)}</td>
 </tr><tr>
  <td style="background:${LB};${BD};${P};font-weight:bold">Operation #</td>
  <td style="${BD};${P};text-align:center">${S(d.operation)}</td>
  <td style="background:${LB};${BD};${P};font-weight:bold">Serial No.</td>
  <td style="${BD};${P};text-align:center">${S(d.serial)}</td>
 </tr><tr>
  <td style="background:${LB};${BD};${P};font-weight:bold">NOTIFICATION #</td>
  <td style="${BD};${P};text-align:center">${S(d.notif)}</td>
  <td style="background:${LB};${BD};${P};font-weight:bold">EQUIP CATEGORY</td>
  <td style="${BD};${P};text-align:center">${S(d.category)}</td>
 </tr><tr>
  <td style="background:${LB};${BD};${P}"></td>
  <td style="${BD};${P};text-align:center"></td>
  <td style="background:${LB};${BD};${P};font-weight:bold">HOUR METER${d.lockout?'<br><span style="color:#e74c3c;font-size:10px;font-weight:700">🔒 LOCK OUT</span>':''}</td>
  <td style="${BD};${P};text-align:center">${S(d.hours)}</td>
 </tr>
</table>

<table style="width:100%;${BD};border-collapse:collapse;flex:1;margin-bottom:3px">
 <tr>
  <td style="width:44%;vertical-align:top;border-right:1px solid ${NV};padding:0">
   <table style="width:100%;border-collapse:collapse">
    <thead>
     <tr>
      <th style="background:${NV};color:#fff;padding:2px 4px;font-size:11px;border-right:1px solid #4a6090;width:24px;text-align:center">QTY.</th>
      <th style="background:${NV};color:#fff;padding:2px 4px;font-size:11px;border-right:1px solid #4a6090;text-align:left;width:76px">Part No.</th>
      <th style="background:${NV};color:#fff;padding:2px 4px;font-size:11px;border-right:1px solid #4a6090;text-align:left">DESCRIPTION</th>
      <th style="background:${NV};color:#fff;padding:2px 4px;font-size:11px;text-align:center;width:30px">ADMIN</th>
     </tr>
    </thead>
    <tbody>${partsBody}</tbody>
   </table>
  </td>
  <td style="width:56%;vertical-align:top;padding:0">
   <table style="width:100%;border-collapse:collapse;height:100%">
    <tr><td colspan="2" style="background:${NV};color:#fff;padding:1px 3px;font-size:11px;font-weight:bold">DESCRIPTION OF WORK</td></tr>
    <tr><td colspan="2" style="padding:1px 6px;font-size:11px;font-weight:bold;border-bottom:1px solid ${NV}">C1 - Complaint:</td></tr>
    <tr><td colspan="2" style="padding:1px 4px;font-size:12px;border-bottom:1px solid ${NV};vertical-align:top;min-height:17px">${NL(d.c1)}&nbsp;</td></tr>
    <tr><td colspan="2" style="padding:1px 6px;font-size:11px;font-weight:bold;border-bottom:1px solid ${NV}">C2 - Cause:</td></tr>
    <tr><td colspan="2" style="padding:1px 4px;font-size:12px;border-bottom:1px solid ${NV};vertical-align:top;min-height:16px">${NL(d.c2)}&nbsp;</td></tr>
    <tr><td colspan="2" style="padding:1px 6px;font-size:11px;font-weight:bold;border-bottom:1px solid ${NV}">C3 - Correction</td></tr>
    <tr><td colspan="2" style="padding:1px 4px;font-size:12px;border-bottom:1px solid ${NV};vertical-align:top;min-height:25px">${NL(d.c3)}&nbsp;</td></tr>
    <tr><td colspan="2" style="padding:1px 6px;font-size:11px;font-weight:bold;border-bottom:1px solid ${NV}">C4 - Complications: <span style="font-weight:normal">(Minimum of 2)</span></td></tr>
    <tr><td colspan="2" style="padding:1px 4px;border-bottom:1px solid ${NV};vertical-align:top;min-height:17px">${compsHTML}&nbsp;</td></tr>
    <tr><td colspan="2" style="padding:1px 6px;font-size:11px;font-weight:bold;border-bottom:1px solid ${NV}">WORK REMAINING</td></tr>
    <tr><td colspan="2" style="padding:1px 4px;font-size:12px;vertical-align:top;min-height:16px">${NL(d.remaining)}&nbsp;</td></tr>
   </table>
  </td>
 </tr>
</table>

<table style="width:100%;${BD};border-collapse:collapse;margin-bottom:3px;font-size:12px">
 <tr>
  <td colspan="7" style="background:${LB};${BD};padding:1px 6px;font-size:11px">
   Team: <strong style="color:${NV}">${S(d.shift)}</strong>
  </td>
 </tr>
 <tr>
  <th style="background:${NV};color:#fff;padding:1px 3px;font-size:11px;border:1px solid #4a6090;text-align:left">Performed By</th>
  <th style="background:${NV};color:#fff;padding:1px 3px;font-size:11px;border:1px solid #4a6090;text-align:center;width:52px">Truck #</th>
  <th style="background:${NV};color:#fff;padding:2px 4px;font-size:11px;border:1px solid #4a6090;text-align:center;width:28px">REG</th>
  <th style="background:${NV};color:#fff;padding:2px 4px;font-size:11px;border:1px solid #4a6090;text-align:center;width:28px">OT</th>
  <th style="background:${NV};color:#fff;padding:2px 4px;font-size:11px;border:1px solid #4a6090;text-align:center;width:32px">STAT</th>
  <th style="background:${NV};color:#fff;padding:1px 3px;font-size:11px;border:1px solid #4a6090;text-align:center;width:52px">TIME IN</th>
  <th style="background:${NV};color:#fff;padding:1px 3px;font-size:11px;border:1px solid #4a6090;text-align:center;width:52px">TIME OUT</th>
 </tr>
 ${techBody}
</table>

<div style="${BD};padding:2px 4px;margin-bottom:3px;font-size:12px;color:#333;line-height:1.4">
 Not Responsible for loss or damage to equipment and accessories in case of fire, theft or other cause(s) beyond our control.
 I hereby authorize the above repair work to be done along with the necessary parts. An express mechanic's lien is hereby
 acknowledged on the above equipment to secure the repair payment.
</div>

<table style="width:100%;border-collapse:collapse;font-size:12px">
 <tr>
  <td style="width:55%;vertical-align:top;padding-right:10px">
   <table style="width:100%">
    <tr>
     <td style="width:80px;padding:1px 0">Approved by:</td>
     <td style="border-bottom:1px solid #333;padding:1px 4px">${S(d.approved)}</td>
    </tr><tr>
     <td style="padding:2px 0">Company:</td>
     <td style="border-bottom:1px solid #333;padding:1px 4px">${S(d.company)}</td>
    </tr><tr>
     <td style="padding:2px 0">Date:</td>
     <td style="border-bottom:1px solid #333;padding:1px 4px">${fmtDate(d.approvalDate)}</td>
    </tr>
   </table>
  </td>
  <td style="width:45%;vertical-align:top;${BD};padding:5px 10px">
   <table style="width:100%">
    <tr>
     <td style="font-weight:bold;font-size:11px;padding-bottom:4px">JOB STATUS:</td>
     <td style="font-weight:bold;font-size:11px;padding-bottom:4px">JOB TYPE:</td>
    </tr><tr>
     <td>
      <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px">
       <span style="${BD};width:11px;height:11px;display:inline-block;text-align:center;line-height:11px;font-size:12px">${d.status==='completed'?'&#10003;':''}</span> Completed
      </div>
      <div style="display:flex;align-items:center;gap:4px">
       <span style="${BD};width:11px;height:11px;display:inline-block;text-align:center;line-height:11px;font-size:12px">${d.status==='incomplete'?'&#10003;':''}</span> Incomplete
      </div>
     </td>
     <td>
      <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px">
       <span style="${BD};width:11px;height:11px;display:inline-block;text-align:center;line-height:11px;font-size:12px">${d.type==='HVAC'?'&#10003;':''}</span> HVAC
      </div>
      <div style="display:flex;align-items:center;gap:4px">
       <span style="${BD};width:11px;height:11px;display:inline-block;text-align:center;line-height:11px;font-size:12px">${d.type==='F/S'?'&#10003;':''}</span> F/S
      </div>
     </td>
    </tr>
   </table>
  </td>
 </tr>
</table>

</div>`;
}

function printReport() {
  const result = validateForm();
  if (!result.ok) {
    showValidationErrors(result.errors);
    snack(`⚠ Cannot print — fix ${result.errors.length} field${result.errors.length===1?'':'s'}`);
    return;
  }
  const d = collectData();
  openPrintWindow(generatePrintHTML(d), 'Field Report');
  snack('Opening print dialog…');
}

function printTimeCard() {
  try {
  const rows = (timeCardRows || []);

  const techDD = dropdownRegistry['tc-tech'];
  const techName = techDD?.input?.value || '';
  const badgeNum = document.getElementById('tc-badge-manual')?.value || '';
  const techDisplay = techName.split(/  +/)[0];  // Name only, no badge
  const date = document.getElementById('tc-date-start')?.value || '';
  const shiftDD = dropdownRegistry['tc-shift'];
  // Use shift from field report if available, fallback to TC dropdown
  const shift = (rows.length && rows[0].shift) || (shiftDD?.input?.value) || '';

  if (!techName) { snack('Select technician first'); return; }

  let totReg = 0, totOt = 0, totNight = 0;
  const NV = '#6a7b97';

  // Format shift info
  const isNightShift = shift && shift.endsWith('N');
  const shiftLabel = shift || '—';
  const dayNight = isNightShift ? '🌙 Night shift' : '☀️ Day shift';
  const shiftDisplay = shiftLabel + ' — ' + dayNight;

  // Format dates
  const fmtDate = d => {
    if (!d) return '_______________';
    const [y, m, day] = d.split('-');
    return m + '/' + day + '/' + y;
  };

  // Calculate end date (night shift may end next day)
  let endDate = date;
  if (isNightShift && date) {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    endDate = d.toISOString().split('T')[0];
  }

  var hasNight = rows.some(function(r){ return r.night; });
  const rowsHtml = rows.map(function(r) {
    const hrs = (typeof calcHours === 'function') ? calcHours(r.start, r.end) : 0;
    var reg = 0, ot = 0;
    if (hrs > 0) {
      if (r.ot) { ot = hrs; reg = 0; }  // OT only
      else      { reg = hrs; }            // Night is just marker, hours in REG
    }
    totReg += reg; totOt += ot;
    const f = n => n > 0 ? n.toFixed(1) : '';
    const TD = 'padding:8px 10px;border:1px solid ' + NV + ';font-size:14px';
    const fmtTime = t => t || '';
    return '<tr>' +
      '<td style="' + TD + ';font-size:9px;word-break:break-all;line-height:1.3">' + (r.fr||'') + '</td>' +
      '<td style="' + TD + '">' + (r.job||'') + '</td>' +
      '<td style="' + TD + ';text-align:center">' + fmtTime(r.start) + '</td>' +
      '<td style="' + TD + ';text-align:center">' + fmtTime(r.end) + '</td>' +
      '<td style="' + TD + ';text-align:center;font-weight:700;color:#1d5e38">' + (reg > 0 ? reg.toFixed(1) : '') + '</td>' +
      '<td style="' + TD + ';text-align:center;font-weight:700;color:#8a3d00">' + (ot > 0 ? ot.toFixed(1) : '') + '</td>' +
      '<td style="' + TD + ';text-align:center;font-weight:800;font-size:17px;color:#1a3560">' + (r.night ? 'X' : '') + '</td>' +
    '</tr>';
  }).join('');

  // Blank rows to fill up to 12
  const BLANK_TD = '<td style="padding:8px 10px;border:1px solid ' + NV + ';height:26px"></td>';
  var blanks = '';
  for (var i = rows.length; i < 12; i++) {
    blanks += '<tr>' + BLANK_TD.repeat(7) + '</tr>';
  }

  const totalPaid = totReg + totOt + totNight;
  const f2 = n => n > 0 ? n.toFixed(1) : '';
  const logo = (typeof AIRCON_LOGO_B64 !== 'undefined')
    ? '<img src="' + AIRCON_LOGO_B64 + '" style="height:64px;display:block;margin:0 auto 4px">'
    : '<div style="font-size:38px;font-weight:900;color:' + NV + ';font-style:italic;text-align:center">AIRCON</div>';

  const TH = 'padding:9px 10px;background:' + NV + ';color:#fff;text-align:center;font-size:14px;font-weight:700;border:1px solid ' + NV;

  var html = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:780px;margin:0 auto;padding:24px 28px">' +

    // Logo + Title
    '<div style="text-align:center;margin-bottom:18px">' + logo +
    '<div style="font-size:22px;font-weight:700;letter-spacing:0.5px">Employee Time Card</div></div>' +

    // Header info
    '<table style="width:100%;border-collapse:collapse;margin-bottom:6px">' +
      '<tr>' +
        '<td style="padding:4px 0;width:55%">' +
          '<span style="text-decoration:underline;font-weight:700;font-size:17px">Name:</span>&nbsp;' +
          '<span style="font-size:19px;font-weight:900;color:' + NV + '">' + techDisplay + '</span>' +
          (badgeNum ? '<span style="font-size:14px;color:#888;margin-left:8px">' + badgeNum + '</span>' : '') +
        '</td>' +
        '<td style="padding:4px 0;text-align:right">' +
          '<span style="text-decoration:underline;font-weight:700;font-size:17px">Unit #:</span>&nbsp;' +
          '<span style="font-size:17px;font-weight:700">' + ((document.getElementById('tc-truck-manual')?.value || (rows.length && rows[0].truck) || (dropdownRegistry['tc-truck']?.input?.value) || '___')) + '</span>' +
        '</td>' +
      '</tr>' +
      '<tr>' +
        '<td style="padding:4px 0">' +
          '<span style="text-decoration:underline;font-weight:700;font-size:16px">Date Shift Started:</span>&nbsp;' +
          '<span style="font-size:17px;font-weight:700;color:' + NV + '">' + fmtDate(date) + '</span>' +
        '</td>' +
        '<td style="padding:4px 0;text-align:right">' +
          '<span style="font-size:16px;font-weight:700;color:' + (isNightShift ? '#6a7b97' : '#b35400') + '">' + shiftDisplay + '</span>' +
        '</td>' +
      '</tr>' +
      '<tr>' +
        '<td style="padding:4px 0">' +
          '<span style="text-decoration:underline;font-weight:700;font-size:16px">Date Shift Finished:</span>&nbsp;' +
          '<span style="font-size:17px;font-weight:700;color:' + NV + '">' + fmtDate(endDate) + '</span>' +
        '</td>' +
      '</tr>' +
    '</table>' +

    // Main table
    '<table style="width:100%;border-collapse:collapse;margin-top:14px">' +
      '<thead>' +
        '<tr>' +
          '<th style="' + TH + ';width:30%">Field Report #</th>' +
          '<th style="' + TH + ';width:20%">Customer / Job</th>' +
          '<th style="' + TH + ';width:10%">Start Time</th>' +
          '<th style="' + TH + ';width:10%">End Time</th>' +
          '<th style="' + TH + ';width:10%;background:#1d5e38">Reg.</th>' +
          '<th style="' + TH + ';width:10%;background:#8a3d00">O.T.</th>' +
          '<th style="' + TH + ';width:14%;background:#0d2d5a">Night<br>Shift</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' + rowsHtml + blanks + '</tbody>' +
      '<tfoot>' +
        // Totals
        '<tr>' +
          '<td colspan="4" style="padding:8px 10px;border:1px solid ' + NV + ';text-align:right;font-weight:700;font-size:14px">Total Hours</td>' +
          '<td style="padding:8px 10px;border:1px solid ' + NV + ';text-align:center;font-weight:800;font-size:16px;color:#1d5e38">' + f2(totReg) + '</td>' +
          '<td style="padding:8px 10px;border:1px solid ' + NV + ';text-align:center;font-weight:800;font-size:16px;color:#8a3d00">' + f2(totOt) + '</td>' +
          '<td style="padding:8px 10px;border:1px solid ' + NV + ';text-align:center;font-weight:900;font-size:18px">' + (hasNight?'X':'') + '</td>' +
        '</tr>' +
        '<tr style="background:#f0f4f8">' +
          '<td colspan="4" style="padding:8px 10px;border:1px solid ' + NV + ';text-align:right;font-weight:700;font-size:14px">Total Paid Hours</td>' +
          '<td style="padding:8px 10px;border:1px solid ' + NV + ';text-align:center;font-weight:900;font-size:17px;color:' + NV + '">' + f2(totReg) + '</td>' +
          '<td style="padding:8px 10px;border:1px solid ' + NV + ';text-align:center;font-weight:900;font-size:17px;color:' + NV + '">' + f2(totOt) + '</td>' +
          '<td style="padding:8px 10px;border:1px solid ' + NV + ';text-align:center;font-weight:900;font-size:18px">' + (hasNight?'X':'') + '</td>' +
        '</tr>' +
      '</tfoot>' +
    '</table>' +

    // Explanation
    '<div style="margin-top:18px">' +
      '<p style="font-weight:700;font-size:14px">Explanation needed if your actual work time exceeds 12 hours:</p>' +
      '<div style="border-bottom:1px solid #000;margin:8px 0;height:18px"></div>' +
      '<div style="border-bottom:1px solid #000;margin:8px 0;height:18px"></div>' +
    '</div>' +

    // Signatures
    '<table style="width:100%;margin-top:16px;border-collapse:collapse">' +
      '<tr>' +
        '<td style="padding:6px 0;width:55%">' +
          '<span style="text-decoration:underline;font-weight:700;font-size:14px">Technician Remarks:</span>' +
          '<span style="display:inline-block;border-bottom:1px solid #000;width:180px;margin-left:6px">&nbsp;</span>' +
        '</td>' +
        '<td style="padding:6px 0">' +
          '<span style="text-decoration:underline;font-weight:700;font-size:14px">Technician\'s Signature:</span>' +
          '<span style="display:inline-block;border-bottom:1px solid #000;width:140px;margin-left:6px">&nbsp;</span>' +
        '</td>' +
      '</tr>' +
      '<tr>' +
        '<td style="padding:6px 0">' +
          '<span style="text-decoration:underline;font-weight:700;font-size:14px">Manager\'s Remarks:</span>' +
          '<span style="display:inline-block;border-bottom:1px solid #000;width:196px;margin-left:6px">&nbsp;</span>' +
        '</td>' +
        '<td style="padding:6px 0">' +
          '<span style="text-decoration:underline;font-weight:700;font-size:14px">Manager\'s Signature:</span>' +
          '<span style="display:inline-block;border-bottom:1px solid #000;width:148px;margin-left:6px">&nbsp;</span>' +
        '</td>' +
      '</tr>' +
    '</table>' +

  '</div>';

  if (typeof openPrintWindow === 'function') {
    openPrintWindow(html, 'Time Card - ' + techName);
  }
  snack('Opening Time Card...');

  } catch(err) {
    console.error('printTimeCard error:', err);
    snack('⚠ Print error: ' + err.message);
  }
}

function printAllShiftReports() {
  // Get current TC context
  const techDD = dropdownRegistry['tc-tech'];
  const techName = techDD?.input?.value || '';
  const dateStr  = document.getElementById('tc-date-start')?.value || '';
  const shiftDD  = dropdownRegistry['tc-shift'];
  const shift    = shiftDD?.input?.value || '';

  if (!techName || !dateStr) {
    snack('⚠ Select technician and date in Time Card first');
    switchView('tc');
    return;
  }

  // Find all matching field reports
  const all = loadSavedReports ? loadSavedReports() : [];
  const techClean = techName.split(/  +/)[0].trim().toLowerCase();
  const matches = all.filter(r => {
    if (r.date !== dateStr) return false;
    // Shift filter: relaxed - skip if either is empty
    if (shift && r.shift && r.shift.trim() && r.shift !== shift) return false;
    return (r.techs||[]).some(t => {
      const n = (t.name||'').split(/  +/)[0].trim().toLowerCase();
      return n === techClean;
    });
  }).sort((a,b) => (a.savedAt||'').localeCompare(b.savedAt||''));

  if (!matches.length) {
    snack('⚠ No field reports found for this shift');
    return;
  }

  // Build combined print: Time Card first, then each field report
  let combinedHtml = '';

  // Time Card section
  if (typeof generateTimeCardPrintHtml === 'function') {
    combinedHtml += generateTimeCardPrintHtml();
    combinedHtml += '<div style="page-break-after:always"></div>';
  }

  // Each field report
  matches.forEach((r, i) => {
    if (typeof generatePrintHTML === 'function') {
      combinedHtml += '<div style="' + (i > 0 ? 'page-break-before:always;' : '') + '">';
      combinedHtml += generatePrintHTML(r);
      combinedHtml += '</div>';
    }
  });

  if (typeof openPrintWindow === 'function') {
    openPrintWindow(combinedHtml, 'Time Card + ' + matches.length + ' Reports — ' + techName);
  }
  snack('🖨 Opening: Time Card + ' + matches.length + ' field reports');
}

function printInhausReport() {
  const d   = collectInhausData();
  const S   = v => typeof escapeHtml === 'function' ? escapeHtml(String(v||'')) : String(v||'');
  const chk = v => v ? '&#10003;' : '&#9744;';
  const fmtD = s => {
    if (!s) return '';
    const parts = s.split('-');
    if (parts.length >= 2) return parts[1] + '/' + parts[0];
    return s;
  };

  const NV = '#1a3560';

  const thStyle = `background:${NV};color:#fff;padding:6px 8px;text-align:left;font-size:11px;font-weight:700;border:1px solid ${NV}`;
  const tdStyle = `padding:6px 8px;border:1px solid #ccc;font-size:11px`;
  const th = cols => cols.map(c=>`<th style="${thStyle}">${S(c)}</th>`).join('');
  const tableHTML = (cols, rows) => {
    if (!rows||!rows.length) return `<tr><td colspan="${cols.length}" style="${tdStyle};color:#aaa;font-style:italic">No entries</td></tr>`;
    return rows.map(row=>'<tr>'+cols.map(c=>`<td style="${tdStyle}">${S(row[c]||'')}</td>`).join('')+'</tr>').join('');
  };

  const dryHTML = (d.dryTanks||[]).length
    ? (d.dryTanks||[]).map((t,i)=>`<tr><td style="${tdStyle}">Tank ${i+1}</td><td style="${tdStyle}">${S(t.size)}</td><td style="${tdStyle}">${fmtD(t.date)}</td><td style="${tdStyle}">${S(t.notes)}</td></tr>`).join('')
    : `<tr><td colspan="4" style="${tdStyle};color:#aaa">No tanks</td></tr>`;

  const lvsHTML = (d.lvsTanks||[]).length
    ? (d.lvsTanks||[]).map((t,i)=>`<tr><td style="${tdStyle}">Tank ${i+1}</td><td style="${tdStyle}">${S(t.size)}</td><td style="${tdStyle}">${fmtD(t.date)}</td><td style="${tdStyle}">${S(t.notes)}</td></tr>`).join('')
    : `<tr><td colspan="4" style="${tdStyle};color:#aaa">No tanks</td></tr>`;

  const sysType = [
    d.systemType?.scn?'SCN':'', d.systemType?.s210?'210':'', d.systemType?.s210?'210D':'',
    d.systemType?.qir?'QIR':'', d.systemType?.manual?'Manual':''
  ].filter(Boolean).join(', ') || '—';

  const act = [
    d.actuators?.manual?`Manual(${d.actuators.manualQty||1})`:'',
    d.actuators?.auto?`Auto(${d.actuators.autoQty||1})`:'',
    d.actuators?.electric?`Electric(${d.actuators.electricQty||1})`:''
  ].filter(Boolean).join(', ') || '—';

  const noz = [
    d.nozzles?.lvs?`LVS(${d.nozzles.lvsQty||1})`:'',
    d.nozzles?.dry?`Dry(${d.nozzles.dryQty||1})`:'',
  ].filter(Boolean).join(', ') || '—';

  const cols_n2      = ['Ansul Seal','Stamp Date','TC Stamp','Gauge PSI','Hydro When','Size'];
  const cols_lt30    = ['Ansul Seal','Stamp Date','TC Stamp','Stamp Weight','Actual Weight','Hydro When'];
  const cols_inergen = ['Ansul Seal','Stamp Date','TC Stamp','Gauge PSI','Hydro When','Size'];
  const cols_co2     = ['Ansul Seal','Stamp Date','TC Stamp','Stamp Weight','Tare Weight','Hydro When','Actual Weight'];
  const cols_hose    = ['Current Hose Date','Hose Expiry Date'];

  const printBody = `
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  @page { size: letter landscape; margin: 6mm; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9.5px;
    width: 100%;
    height: 100%;
    color: #000;
  }
  .page {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto;
    gap: 6px;
    page-break-inside: avoid;
  }
  .full-width { grid-column: 1 / -1; }
  .section {
    border: 1px solid ${NV};
    border-radius: 3px;
    overflow: hidden;
  }
  .section-header {
    background: ${NV};
    color: #fff;
    font-weight: 700;
    font-size: 11px;
    padding: 4px 8px;
  }
  .section-body { padding: 6px 8px; }
  table { width:100%; border-collapse:collapse; font-size:10.5px; }
  th { background:${NV}; color:#fff; padding:4px 6px; text-align:left; font-size:10px; }
  td { padding:4px 6px; border-bottom:1px solid #eee; font-size:10.5px; }
  .label { font-weight:700; color:#333; font-size:10px; }
  .val { font-size:11px; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:4px; }
  .grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; }
  .field { margin-bottom:4px; }
  .signature-line { border-top:1px solid #000; margin-top:20px; }
</style>

<div class="page">

  <!-- HEADER -->
  <div class="section full-width" style="background:#f0f4f8">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 12px">
      <div>
        <div style="font-size:16px;font-weight:900;color:${NV}">Ansul Fire Suppression Information Sheet</div>
        <div style="font-size:9px;color:#c00;font-style:italic">⚠ This is not to be used as a procedure!</div>
      </div>
      <div style="text-align:right;font-size:11px">
        <div><span class="label">FR#:</span> <strong style="color:#c00;font-size:14px">${S(d.frNum)}</strong></div>
        <div><span class="label">Unit#:</span> <strong>${S(d.unit)}</strong></div>
      </div>
    </div>
  </div>

  <!-- LEFT COLUMN: System Info -->
  <div class="section">
    <div class="section-header">⚙ System Information</div>
    <div class="section-body">
      <div class="grid2" style="gap:6px;margin-bottom:6px">
        <div class="field"><div class="label">System Type</div><div class="val">${sysType}</div></div>
        <div class="field"><div class="label"># Actuators</div><div class="val">${act}</div></div>
        <div class="field"><div class="label"># Nozzles</div><div class="val">${noz}</div></div>
        <div class="field"><div class="label">A101 PAD Dates</div><div class="val">${(d.a101Dates||[]).filter(Boolean).map(fmtD).join(' / ')||'—'}</div></div>
      </div>
      <div class="field"><div class="label">210 PAD Dates</div>
        <div class="val" style="display:flex;gap:8px;flex-wrap:wrap">
          ${['PAD 1','PAD 2','PAD 3','PAD 4'].map((lbl,i)=>
            `<span>${lbl}: <strong>${fmtD((d.pad210Dates||[])[i])||'—'}</strong></span>`
          ).join('')}
        </div>
      </div>
    </div>
  </div>

  <!-- RIGHT COLUMN: Dry Chemical & LVS -->
  <div class="section">
    <div class="section-header">🧪 Dry Chemical Tanks</div>
    <div class="section-body">
      <table><thead><tr><th>#</th><th>Size</th><th>Date</th><th>Notes</th></tr></thead>
      <tbody>${dryHTML}</tbody></table>
    </div>
    <div class="section-header">💧 LVS Tanks</div>
    <div class="section-body">
      <table><thead><tr><th>#</th><th>Size</th><th>Date</th><th>Notes</th></tr></thead>
      <tbody>${lvsHTML}</tbody></table>
    </div>
  </div>

  ${(d.n2Rows&&d.n2Rows.length) ? `
  <div class="section">
    <div class="section-header">🔵 N2 Cartridges</div>
    <div class="section-body">
      <table><thead><tr>${th(cols_n2)}</tr></thead><tbody>${tableHTML(cols_n2,d.n2Rows)}</tbody></table>
    </div>
  </div>` : ''}

  ${(d.lt30Rows&&d.lt30Rows.length) ? `
  <div class="section">
    <div class="section-header">🟡 LT30</div>
    <div class="section-body">
      <table><thead><tr>${th(cols_lt30)}</tr></thead><tbody>${tableHTML(cols_lt30,d.lt30Rows)}</tbody></table>
    </div>
  </div>` : ''}

  ${(d.inergenRows&&d.inergenRows.length) ? `
  <div class="section">
    <div class="section-header">🟣 Inergen</div>
    <div class="section-body">
      <table><thead><tr>${th(cols_inergen)}</tr></thead><tbody>${tableHTML(cols_inergen,d.inergenRows)}</tbody></table>
    </div>
  </div>` : ''}

  ${(d.co2Rows&&d.co2Rows.length) ? `
  <div class="section">
    <div class="section-header">⚫ CO2 Tanks</div>
    <div class="section-body">
      <table><thead><tr>${th(cols_co2)}</tr></thead><tbody>${tableHTML(cols_co2,d.co2Rows)}</tbody></table>
    </div>
  </div>` : ''}

  ${(d.hoseRows&&d.hoseRows.length) ? `
  <div class="section">
    <div class="section-header">🟤 CO2 Hose</div>
    <div class="section-body">
      <table><thead><tr>${th(cols_hose)}</tr></thead><tbody>${tableHTML(cols_hose,d.hoseRows)}</tbody></table>
    </div>
  </div>` : ''}

  <!-- Comments -->
  <div class="section">
    <div class="section-header">📝 Repairs / Comments</div>
    <div class="section-body" style="min-height:60px;font-size:11px">
      ${S(d.comments||'').replace(/\n/g,'<br>') || '&nbsp;'}
    </div>
  </div>

  <!-- Inspectors -->
  <div class="section full-width">
    <div class="section-header">✅ Inspected By</div>
    <div class="section-body">
      <table style="width:50%">
        <thead><tr><th>Technician</th><th>Date</th></tr></thead>
        <tbody>
          ${(d.inspectors||[]).length
            ? (d.inspectors||[]).map(ins=>`<tr><td style="${tdStyle}">${S(ins.name)}</td><td style="${tdStyle}">${S(ins.date)}</td></tr>`).join('')
            : `<tr><td colspan="2" style="${tdStyle};color:#aaa">—</td></tr>`}
          <tr><td colspan="2" style="padding:16px 6px 4px;border-top:2px solid #000">
            <div style="display:flex;gap:60px">
              <div><div style="border-top:1px solid #000;width:180px;margin-top:24px"></div><div style="font-size:9px;margin-top:2px">Signature</div></div>
              <div><div style="border-top:1px solid #000;width:120px;margin-top:24px"></div><div style="font-size:9px;margin-top:2px">Date</div></div>
            </div>
          </td></tr>
        </tbody>
      </table>
    </div>
  </div>

</div>`;

  const win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) { snack('⚠ Allow popups to print'); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Inhaus - ${S(d.frNum)||'Report'}</title>
    </head><body>${printBody}
<!-- Scroll to top button -->
<button id="scroll-top-btn" onclick="window.scrollTo({top:0,behavior:'smooth'})"
  style="position:fixed;bottom:80px;right:16px;z-index:999;
  width:44px;height:44px;border-radius:50%;background:#1a3560;color:#fff;
  border:none;cursor:pointer;font-size:20px;box-shadow:0 3px 12px rgba(0,0,0,.3);
  display:none;align-items:center;justify-content:center;line-height:1"
  title="Back to top">↑</button>
</body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 800);
}
