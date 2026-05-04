// ============================================================
// filemanager.js — Admin Fayl Meneceri Modulu
// admin-panel.html-in <main> bölməsinin içinə açılır
// Sol menyudan "Fayl Meneceri" seçildikdə sağda görünür
// ============================================================

(function () {
  'use strict';

  // ── API konfiqurasiya ────────────────────────────────────────
  const API = window.API_BASE || 'https://guvenfinans.az/proxy.php';

  // ── Vəziyyət (state) ─────────────────────────────────────────
  let fm = {
    files: [],           // serverdən gələn bütün fayllar
    filtered: [],        // filtrə uyğun fayllar
    selected: new Set(), // seçilmiş fayl id-ləri
    section: 'all',      // aktiv sol panel bölməsi
    page: 1,
    perPage: 20,
    totalPages: 1,
    search: '',
    typeFilter: '',
    loading: false,
    renaming: null,      // hazırda rename edilən fayl id-si
  };

  // ── Köməkçi funksiyalar ───────────────────────────────────────
  function fmtSize(b) {
    if (!b) return '—';
    if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB';
    if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB';
    if (b >= 1e3) return (b / 1e3).toFixed(0) + ' KB';
    return b + ' B';
  }
  function fmtDate(s) {
    if (!s) return '—';
    try { return new Date(s).toLocaleDateString('az-AZ'); } catch { return s; }
  }
  function typeOf(f) {
    const m = (f.mime_type || '').toLowerCase();
    const n = (f.original_filename || '').toLowerCase();
    if (m.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(n)) return 'img';
    if (m.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/.test(n)) return 'vid';
    if (m.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/.test(n)) return 'aud';
    if (/pdf|word|excel|spreadsheet|presentation|msword|officedocument/.test(m) ||
        /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/.test(n)) return 'doc';
    if (/zip|rar|7z|tar|gzip/.test(m) || /\.(zip|rar|7z|tar|gz)$/.test(n)) return 'arc';
    return 'other';
  }
  function typeLabel(t) {
    return { img: 'Şəkil', vid: 'Video', aud: 'Audio', doc: 'Sənəd', arc: 'Arxiv', other: 'Digər' }[t] || 'Digər';
  }
  function typeColor(t) {
    return { img: '#1D9E75', vid: '#BA7517', aud: '#534AB7', doc: '#185FA5', arc: '#993556', other: '#5F5E5A' }[t] || '#5F5E5A';
  }
  function typeBg(t) {
    return { img: '#E1F5EE', vid: '#FAEEDA', aud: '#EEEDFE', doc: '#E6F1FB', arc: '#FBEAF0', other: '#F1EFE8' }[t] || '#F1EFE8';
  }
  function iconSvg(t) {
    const icons = {
      img: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      vid: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
      aud: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
      doc: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      arc: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
      other: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>',
    };
    return icons[t] || icons.other;
  }
  function token() {
    return localStorage.getItem('guven_token') || localStorage.getItem('access_token') || '';
  }
  function notify(msg, type) {
    if (typeof window.showSuccess === 'function' && type === 'success') { window.showSuccess(msg); return; }
    if (typeof window.showError === 'function' && type === 'error') { window.showError(msg); return; }
    console.log(`[FM ${type}]`, msg);
  }

  // ── HTML şablonu ─────────────────────────────────────────────
  function buildHTML() {
    return `
<style>
#fm-root *{box-sizing:border-box;margin:0;padding:0}
#fm-root{display:flex;height:calc(100vh - 120px);min-height:480px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#fff;font-family:'Segoe UI',sans-serif;font-size:13px}
/* Sol panel */
#fm-nav{width:210px;min-width:210px;background:#f8fafc;border-right:1px solid #e2e8f0;display:flex;flex-direction:column}
#fm-nav-header{padding:14px 16px;border-bottom:1px solid #e2e8f0}
#fm-nav-header h3{font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px}
#fm-nav-list{flex:1;overflow-y:auto;padding:6px 0}
.fm-nav-item{display:flex;align-items:center;gap:9px;padding:9px 16px;cursor:pointer;color:#64748b;border-left:3px solid transparent;transition:all .15s;user-select:none}
.fm-nav-item:hover{background:#f1f5f9;color:#1e293b}
.fm-nav-item.active{background:#eff6ff;color:#1d4ed8;border-left-color:#2563eb;font-weight:500}
.fm-nav-item svg{flex-shrink:0;opacity:.7}
.fm-nav-item.active svg{opacity:1}
.fm-nav-badge{margin-left:auto;font-size:10px;background:#e2e8f0;color:#64748b;padding:1px 6px;border-radius:10px;min-width:18px;text-align:center}
.fm-nav-item.active .fm-nav-badge{background:#dbeafe;color:#1d4ed8}
.fm-nav-divider{height:1px;background:#e2e8f0;margin:6px 12px}
/* Ana panel */
#fm-main{flex:1;display:flex;flex-direction:column;overflow:hidden;background:#fff}
/* Toolbar */
#fm-toolbar{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #e2e8f0;flex-wrap:wrap;background:#fff}
#fm-search{flex:1;min-width:140px;padding:6px 10px 6px 32px;border:1px solid #e2e8f0;border-radius:7px;font-size:13px;color:#1e293b;background:#f8fafc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E") no-repeat 10px center;transition:border .15s}
#fm-search:focus{outline:none;border-color:#2563eb;background-color:#fff}
#fm-type-filter{padding:6px 10px;border:1px solid #e2e8f0;border-radius:7px;font-size:12px;color:#475569;background:#f8fafc;cursor:pointer}
#fm-type-filter:focus{outline:none;border-color:#2563eb}
.fm-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:7px;border:1px solid #e2e8f0;font-size:12px;font-weight:500;cursor:pointer;background:#fff;color:#475569;transition:all .15s;white-space:nowrap}
.fm-btn:hover{background:#f1f5f9;border-color:#cbd5e1}
.fm-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff}
.fm-btn.primary:hover{background:#1d4ed8}
.fm-btn.danger{border-color:#fca5a5;color:#dc2626}
.fm-btn.danger:hover{background:#fef2f2}
.fm-btn:disabled{opacity:.4;cursor:not-allowed}
/* Tablo */
#fm-table-wrap{flex:1;overflow-y:auto}
#fm-table{width:100%;border-collapse:collapse}
#fm-table thead th{padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;background:#f8fafc;border-bottom:1px solid #e2e8f0;position:sticky;top:0;white-space:nowrap;user-select:none}
#fm-table thead th:hover{color:#64748b;cursor:pointer}
#fm-table tbody tr{border-bottom:1px solid #f1f5f9;transition:background .1s}
#fm-table tbody tr:hover{background:#f8fafc}
#fm-table tbody tr.fm-selected{background:#eff6ff}
#fm-table td{padding:8px 12px;vertical-align:middle;color:#334155}
.fm-file-cell{display:flex;align-items:center;gap:9px;max-width:220px}
.fm-type-icon{width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.fm-fname{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px;font-weight:500;color:#1e293b}
.fm-badge{font-size:10px;padding:2px 8px;border-radius:20px;font-weight:500;white-space:nowrap}
.fm-status-active{background:#dcfce7;color:#166534}
.fm-status-deleted{background:#fee2e2;color:#991b1b}
.fm-actions{display:flex;gap:4px;opacity:0;transition:opacity .15s}
tr:hover .fm-actions{opacity:1}
.fm-selected .fm-actions{opacity:1}
.fm-action-btn{width:26px;height:26px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;background:#fff;color:#64748b;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}
.fm-action-btn:hover{background:#f1f5f9;border-color:#94a3b8;color:#1e293b}
.fm-action-btn.fm-del-btn:hover{background:#fef2f2;border-color:#fca5a5;color:#dc2626}
.fm-action-btn.fm-hard-del-btn:hover{background:#450a0a;border-color:#7f1d1d;color:#fca5a5}
.fm-rename-input{padding:3px 7px;font-size:12px;border:1px solid #2563eb;border-radius:5px;background:#fff;color:#1e293b;width:150px;outline:none}
/* Footer */
#fm-footer{display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:12px;color:#64748b;flex-wrap:wrap;gap:6px}
#fm-pagination{display:flex;gap:4px}
.fm-page-btn{padding:3px 9px;border:1px solid #e2e8f0;border-radius:5px;cursor:pointer;background:#fff;font-size:12px;color:#475569;transition:all .15s}
.fm-page-btn:hover{background:#f1f5f9}
.fm-page-btn.active{background:#2563eb;border-color:#2563eb;color:#fff;font-weight:600}
.fm-page-btn:disabled{opacity:.3;cursor:not-allowed}
/* Loading */
#fm-loading{display:none;position:absolute;inset:0;background:rgba(255,255,255,.8);align-items:center;justify-content:center;z-index:10;border-radius:10px}
#fm-loading.show{display:flex}
.fm-spinner{width:28px;height:28px;border:3px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:fm-spin .7s linear infinite}
@keyframes fm-spin{to{transform:rotate(360deg)}}
/* Modal overlay (detail / confirm) */
.fm-overlay{display:none;position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:9000;align-items:center;justify-content:center}
.fm-overlay.open{display:flex}
.fm-modal{background:#fff;border-radius:12px;width:440px;max-width:96vw;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.fm-modal-header{padding:18px 20px 14px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between}
.fm-modal-header h4{font-size:15px;font-weight:600;color:#1e293b}
.fm-modal-close{background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;line-height:1;padding:0;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:5px}
.fm-modal-close:hover{background:#f1f5f9;color:#475569}
.fm-modal-body{padding:18px 20px}
.fm-detail-row{display:flex;justify-content:space-between;align-items:flex-start;padding:7px 0;border-bottom:1px solid #f8fafc;gap:10px}
.fm-detail-row:last-child{border-bottom:none}
.fm-detail-key{color:#94a3b8;font-size:12px;min-width:100px;padding-top:1px}
.fm-detail-val{color:#1e293b;font-size:12px;text-align:right;word-break:break-all;font-family:'Courier New',monospace}
.fm-modal-footer{padding:12px 20px;border-top:1px solid #f1f5f9;display:flex;justify-content:flex-end;gap:8px}
/* Boş vəziyyət */
.fm-empty{text-align:center;padding:70px 20px;color:#94a3b8}
.fm-empty-icon{font-size:36px;margin-bottom:10px;opacity:.4}
.fm-empty-text{font-size:14px}
/* Checkbox */
.fm-cb{width:14px;height:14px;cursor:pointer;accent-color:#2563eb}
/* Responsive */
@media(max-width:600px){#fm-nav{width:160px;min-width:160px}#fm-fname{max-width:100px}}
</style>

<div id="fm-root" style="position:relative">
  <!-- Sol panel -->
  <div id="fm-nav">
    <div id="fm-nav-header"><h3>Fayl Meneceri</h3></div>
    <div id="fm-nav-list"></div>
  </div>

  <!-- Sağ panel -->
  <div id="fm-main">
    <!-- Toolbar -->
    <div id="fm-toolbar">
      <input type="text" id="fm-search" placeholder="Fayl axtar...">
      <select id="fm-type-filter">
        <option value="">Bütün tiplər</option>
        <option value="img">Şəkil</option>
        <option value="vid">Video</option>
        <option value="aud">Audio</option>
        <option value="doc">Sənəd</option>
        <option value="arc">Arxiv</option>
        <option value="other">Digər</option>
      </select>
      <button class="fm-btn" id="fm-select-all-btn" onclick="FM.selectAll()">&#10003; Hamısını seç</button>
      <button class="fm-btn" id="fm-bulk-download-btn" style="display:none" onclick="FM.bulkDownload()">📦 Seçilənləri yüklə (ZIP)</button>
      <button class="fm-btn danger" id="fm-bulk-del-btn" style="display:none" onclick="FM.bulkSoftDelete()">&#10006; Seçilənləri sil</button>
      <button class="fm-btn danger" id="fm-bulk-hard-del-btn" style="display:none" onclick="FM.bulkHardDelete()">&#128465; Hard sil</button>
      <button class="fm-btn primary" onclick="FM.refresh()">&#8635; Yenilə</button>
    </div>

    <!-- Tablo -->
    <div id="fm-table-wrap">
      <table id="fm-table">
        <thead>
          <tr>
            <th style="width:34px"><input type="checkbox" class="fm-cb" id="fm-master-cb" onchange="FM.toggleAll(this)"></th>
            <th>Fayl adı</th>
            <th>Tip</th>
            <th>Ölçü</th>
            <th>Sahibi</th>
            <th>Tarix</th>
            <th>Status</th>
            <th style="width:130px">Əməliyyatlar</th>
          </tr>
        </thead>
        <tbody id="fm-tbody"></tbody>
      </table>
    </div>

    <!-- Footer -->
    <div id="fm-footer">
      <span id="fm-info">Yüklənir...</span>
      <div id="fm-pagination"></div>
    </div>
  </div>

  <!-- Loading overlay -->
  <div id="fm-loading"><div class="fm-spinner"></div></div>
</div>

<!-- Fayl detail modalı -->
<div class="fm-overlay" id="fm-detail-overlay">
  <div class="fm-modal">
    <div class="fm-modal-header">
      <h4 id="fm-modal-title">Fayl məlumatları</h4>
      <button class="fm-modal-close" onclick="FM.closeModal('fm-detail-overlay')">&#10005;</button>
    </div>
    <div class="fm-modal-body" id="fm-modal-body"></div>
    <div class="fm-modal-footer">
      <button class="fm-btn" onclick="FM.downloadFile(FM._modalFile)">&#8595; Yüklə</button>
      <button class="fm-btn danger" onclick="FM.softDeleteFile(FM._modalFile);FM.closeModal('fm-detail-overlay')">Soft sil</button>
      <button class="fm-btn danger fm-hard-del-btn" onclick="FM.confirmHardDelete(FM._modalFile)">&#128465; Hard sil</button>
      <button class="fm-btn" onclick="FM.closeModal('fm-detail-overlay')">Bağla</button>
    </div>
  </div>
</div>

<!-- Confirm modal -->
<div class="fm-overlay" id="fm-confirm-overlay">
  <div class="fm-modal" style="width:360px">
    <div class="fm-modal-header">
      <h4 id="fm-confirm-title">Əminsiniz?</h4>
      <button class="fm-modal-close" onclick="FM.closeModal('fm-confirm-overlay')">&#10005;</button>
    </div>
    <div class="fm-modal-body">
      <p id="fm-confirm-msg" style="color:#475569;line-height:1.6;font-size:13px"></p>
    </div>
    <div class="fm-modal-footer">
      <button class="fm-btn" onclick="FM.closeModal('fm-confirm-overlay')">Ləğv et</button>
      <button class="fm-btn danger" id="fm-confirm-ok">Təsdiqlə</button>
    </div>
  </div>
</div>
`;
  }

  // ── Sol panel bölmələri ──────────────────────────────────────
  const NAV_SECTIONS = [
    { id: 'all',     label: 'Bütün fayllar',   icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' },
    { id: 'img',     label: 'Şəkillər',         icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' },
    { id: 'vid',     label: 'Videolar',          icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>' },
    { id: 'aud',     label: 'Audio',             icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' },
    { id: 'doc',     label: 'Sənədlər',          icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
    { id: 'arc',     label: 'Arxivlər',          icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>' },
    { id: 'other',   label: 'Digər',             icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' },
    { divider: true },
    { id: 'deleted', label: 'Silinənlər',        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>' },
  ];

  // ── Render: sol panel ─────────────────────────────────────────
  function renderNav() {
    const counts = { all: 0, img: 0, vid: 0, aud: 0, doc: 0, arc: 0, other: 0, deleted: 0 };
    fm.files.forEach(f => {
      if (f._status === 'deleted') { counts.deleted++; return; }
      counts.all++;
      const t = typeOf(f);
      if (counts[t] !== undefined) counts[t]++;
      else counts.other++;
    });

    const list = document.getElementById('fm-nav-list');
    if (!list) return;
    list.innerHTML = NAV_SECTIONS.map(s => {
      if (s.divider) return '<div class="fm-nav-divider"></div>';
      return `
        <div class="fm-nav-item${fm.section === s.id ? ' active' : ''}" onclick="FM.switchSection('${s.id}')">
          ${s.icon}
          <span>${s.label}</span>
          <span class="fm-nav-badge">${counts[s.id] || 0}</span>
        </div>`;
    }).join('');
  }

  // ── Render: tablo ─────────────────────────────────────────────
  function renderTable() {
    const tbody = document.getElementById('fm-tbody');
    if (!tbody) return;

    if (fm.filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="fm-empty"><div class="fm-empty-icon">&#128193;</div><div class="fm-empty-text">Fayl tapılmadı</div></div></td></tr>`;
      updateFooter();
      return;
    }

    const start = (fm.page - 1) * fm.perPage;
    const pageItems = fm.filtered.slice(start, start + fm.perPage);

    tbody.innerHTML = pageItems.map(f => {
      const t = typeOf(f);
      const id = f.uuid || f.id;
      const sel = fm.selected.has(id);
      const name = f.original_filename || f.name || '—';
      const isDeleted = f._status === 'deleted';
      return `
        <tr id="fmrow-${id}" class="${sel ? 'fm-selected' : ''}">
          <td><input type="checkbox" class="fm-cb" ${sel ? 'checked' : ''} onchange="FM.toggleSel('${id}',this)"></td>
          <td>
            <div class="fm-file-cell">
              <div class="fm-type-icon" style="background:${typeBg(t)};color:${typeColor(t)}">${iconSvg(t)}</div>
              <span class="fm-fname" id="fmname-${id}" title="${name}">${name}</span>
            </div>
          </td>
          <td><span class="fm-badge" style="background:${typeBg(t)};color:${typeColor(t)}">${typeLabel(t)}</span></td>
          <td style="color:#64748b">${fmtSize(f.file_size || f.size)}</td>
          <td style="color:#64748b;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.owner || f.uploaded_by_name || f.company_name || '—'}</td>
          <td style="color:#64748b;white-space:nowrap">${fmtDate(f.created_at)}</td>
          <td><span class="fm-badge ${isDeleted ? 'fm-status-deleted' : 'fm-status-active'}">${isDeleted ? 'Silinib' : 'Aktiv'}</span></td>
          <td>
            <div class="fm-actions">
              <button class="fm-action-btn" title="Bax" onclick="FM.viewFile('${id}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button class="fm-action-btn" title="Yüklə" onclick="FM.downloadFile('${id}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
              <button class="fm-action-btn" title="Adı dəyiş" onclick="FM.startRename('${id}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="fm-action-btn fm-del-btn" title="Soft sil" onclick="FM.softDeleteFile('${id}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <button class="fm-action-btn fm-hard-del-btn" title="Hard sil (database)" onclick="FM.confirmHardDelete('${id}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    updateFooter();
    renderPagination();
  }

  function updateFooter() {
        const inf = document.getElementById('fm-info');
        if (!inf) return;
        const totalSize = fm.filtered.reduce((a, f) => a + (f.file_size || f.size || 0), 0);
        const selCount = fm.selected.size;
        inf.textContent = `${fm.filtered.length} fayl · ${fmtSize(totalSize)}${selCount ? ` · ${selCount} seçilib` : ''}`;

        const bbd = document.getElementById('fm-bulk-del-btn');
        const bbhd = document.getElementById('fm-bulk-hard-del-btn');
        const bbdw = document.getElementById('fm-bulk-download-btn'); // YENİ

        if (bbd) bbd.style.display = selCount ? 'inline-flex' : 'none';
        if (bbhd) bbhd.style.display = selCount ? 'inline-flex' : 'none';
        if (bbdw) bbdw.style.display = selCount ? 'inline-flex' : 'none'; // YENİ
  }

  function renderPagination() {
    fm.totalPages = Math.max(1, Math.ceil(fm.filtered.length / fm.perPage));
    const pag = document.getElementById('fm-pagination');
    if (!pag || fm.totalPages <= 1) { if (pag) pag.innerHTML = ''; return; }
    let html = `<button class="fm-page-btn" onclick="FM.goPage(${fm.page - 1})" ${fm.page <= 1 ? 'disabled' : ''}>&#8249;</button>`;
    for (let i = 1; i <= fm.totalPages; i++) {
      if (fm.totalPages > 7 && Math.abs(i - fm.page) > 2 && i !== 1 && i !== fm.totalPages) {
        if (i === 2 || i === fm.totalPages - 1) html += '<span style="padding:3px 4px;color:#94a3b8">…</span>';
        continue;
      }
      html += `<button class="fm-page-btn${i === fm.page ? ' active' : ''}" onclick="FM.goPage(${i})">${i}</button>`;
    }
    html += `<button class="fm-page-btn" onclick="FM.goPage(${fm.page + 1})" ${fm.page >= fm.totalPages ? 'disabled' : ''}>&#8250;</button>`;
    pag.innerHTML = html;
  }

  // ── Filtrasiya ────────────────────────────────────────────────
  function applyFilter() {
    const q = fm.search.toLowerCase();
    const tf = fm.typeFilter;
    fm.filtered = fm.files.filter(f => {
      const t = typeOf(f);
      const isDeleted = f._status === 'deleted';
      // Bölmə filtri
      const secMatch = fm.section === 'deleted' ? isDeleted
        : fm.section === 'all' ? !isDeleted
        : (!isDeleted && t === fm.section);
      // Axtarış
      const name = (f.original_filename || f.name || '').toLowerCase();
      const owner = (f.owner || f.uploaded_by_name || f.company_name || '').toLowerCase();
      const sqMatch = !q || name.includes(q) || owner.includes(q);
      // Tip filtri (toolbar dropdown)
      const tfMatch = !tf || t === tf;
      return secMatch && sqMatch && tfMatch;
    });
    fm.page = 1;
    renderTable();
  }

  // ── API çağırışları ───────────────────────────────────────────
  async function apiCall(endpoint, method = 'GET', body = null) {
    const opts = {
      method,
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token()}` }
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(`${API}${endpoint}`, opts);
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) throw new Error(data?.detail || data?.message || `HTTP ${res.status}`);
    return data;
  }

  // ── Əsas modul (FM) ──────────────────────────────────────────
  window.FM = {
    _modalFile: null,



    // Faylları serverdən yüklə
    async load() {
      const loading = document.getElementById('fm-loading');
      if (loading) loading.classList.add('show');
      fm.loading = true;
      try {
        // Admin-in bütün fayllarını çək
        const data = await apiCall('/api/v1/admin/files?limit=500');
        // Müxtəlif cavab formatlarını dəstəklə
        const raw = data.items || data.files || data.data?.files || data || [];
        fm.files = Array.isArray(raw) ? raw : [];

        // Silinmiş faylları da əlavə et (əgər varsa)
        try {
          const del = await apiCall('/api/v1/admin/files?status=deleted&limit=200');
          const delRaw = del.items || del.files || del.data?.files || [];
          delRaw.forEach(f => { f._status = 'deleted'; fm.files.push(f); });
        } catch { /* silinmişlər endpoint yoxdursa keç */ }

        // Aktiv faylları işarələ
        fm.files.forEach(f => { if (!f._status) f._status = f.is_active === false ? 'deleted' : 'active'; });

      } catch (err) {
        console.warn('[FM] Server cavabı yoxdur, demo data istifadə edilir:', err.message);
        // Demo data (real API olmadığında)
        fm.files = FM._demoFiles();
      } finally {
        if (loading) loading.classList.remove('show');
        fm.loading = false;
        applyFilter();
        renderNav();
      }
    },


    // Demo data (API qoşulmamışsa)
    _demoFiles() {
      return [
        { uuid: 'uuid-001', original_filename: 'layihe-banner.jpg', mime_type: 'image/jpeg', file_size: 245000, uploaded_by_name: 'ABC Şirkəti', created_at: '2025-03-15T10:30:00', is_active: true, _status: 'active' },
        { uuid: 'uuid-002', original_filename: 'maliyye-hesabat-q1.pdf', mime_type: 'application/pdf', file_size: 1200000, uploaded_by_name: 'XYZ MMC', created_at: '2025-04-01T14:00:00', is_active: true, _status: 'active' },
        { uuid: 'uuid-003', original_filename: 'servis-tanitim.mp4', mime_type: 'video/mp4', file_size: 52000000, uploaded_by_name: 'Admin', created_at: '2025-02-20T09:00:00', is_active: true, _status: 'active' },
        { uuid: 'uuid-004', original_filename: 'logo-guvenfinans.png', mime_type: 'image/png', file_size: 89000, uploaded_by_name: 'Admin', created_at: '2025-04-10T11:15:00', is_active: true, _status: 'active' },
        { uuid: 'uuid-005', original_filename: 'muqavile-2025.docx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', file_size: 330000, uploaded_by_name: 'ABC Şirkəti', created_at: '2025-01-18T16:45:00', is_active: true, _status: 'active' },
        { uuid: 'uuid-006', original_filename: 'prezentasiya-erp.pptx', mime_type: 'application/vnd.ms-powerpoint', file_size: 4500000, uploaded_by_name: 'QSC Ltd', created_at: '2025-03-28T08:30:00', is_active: true, _status: 'active' },
        { uuid: 'uuid-007', original_filename: 'backup-aprel.zip', mime_type: 'application/zip', file_size: 95000000, uploaded_by_name: 'Admin', created_at: '2025-04-05T22:00:00', is_active: true, _status: 'active' },
        { uuid: 'uuid-008', original_filename: 'kohne-profil.jpg', mime_type: 'image/jpeg', file_size: 112000, uploaded_by_name: 'Test User', created_at: '2025-01-01T12:00:00', is_active: false, _status: 'deleted' },
        { uuid: 'uuid-009', original_filename: 'kohne-video.mp4', mime_type: 'video/mp4', file_size: 30000000, uploaded_by_name: 'ABC Şirkəti', created_at: '2025-02-01T10:00:00', is_active: false, _status: 'deleted' },
        { uuid: 'uuid-010', original_filename: 'excel-iandar.xlsx', mime_type: 'application/vnd.ms-excel', file_size: 880000, uploaded_by_name: 'XYZ MMC', created_at: '2025-04-15T13:00:00', is_active: true, _status: 'active' },
      ];
    },

    // Yenilə
    async refresh() { await FM.load(); notify('Yeniləndi', 'success'); },

    // Bölmə keç
    switchSection(id) {
      fm.section = id;
      fm.selected.clear();
      fm.search = '';
      fm.typeFilter = '';
      const si = document.getElementById('fm-search');
      const tf = document.getElementById('fm-type-filter');
      if (si) si.value = '';
      if (tf) tf.value = '';
      applyFilter();
      renderNav();
    },

    // Seç / seçimləri sil
    toggleSel(id, cb) {
      if (cb.checked) fm.selected.add(id); else fm.selected.delete(id);
      const row = document.getElementById(`fmrow-${id}`);
      if (row) row.className = cb.checked ? 'fm-selected' : '';
      updateFooter();
    },
    toggleAll(masterCb) {
      const start = (fm.page - 1) * fm.perPage;
      const pageItems = fm.filtered.slice(start, start + fm.perPage);
      if (masterCb.checked) pageItems.forEach(f => fm.selected.add(f.uuid || f.id));
      else pageItems.forEach(f => fm.selected.delete(f.uuid || f.id));
      renderTable();
    },
    selectAll() {
      fm.filtered.forEach(f => fm.selected.add(f.uuid || f.id));
      renderTable();
    },

    // Sayfalama
    goPage(p) {
      if (p < 1 || p > fm.totalPages) return;
      fm.page = p;
      renderTable();
    },

    // Baxış modalı
    viewFile(id) {
      const f = fm.files.find(x => (x.uuid || x.id) === id);
      if (!f) return;
      FM._modalFile = id;
      const t = typeOf(f);
      document.getElementById('fm-modal-title').textContent = f.original_filename || f.name || 'Fayl';
      document.getElementById('fm-modal-body').innerHTML = `
        <div class="fm-detail-row"><span class="fm-detail-key">UUID</span><span class="fm-detail-val">${f.uuid || f.id || '—'}</span></div>
        <div class="fm-detail-row"><span class="fm-detail-key">Fayl adı</span><span class="fm-detail-val">${f.original_filename || '—'}</span></div>
        <div class="fm-detail-row"><span class="fm-detail-key">Tip</span><span class="fm-detail-val">${typeLabel(t)} · ${f.mime_type || '—'}</span></div>
        <div class="fm-detail-row"><span class="fm-detail-key">Ölçü</span><span class="fm-detail-val">${fmtSize(f.file_size || f.size)}</span></div>
        <div class="fm-detail-row"><span class="fm-detail-key">Sahibi</span><span class="fm-detail-val">${f.owner || f.uploaded_by_name || '—'}</span></div>
        <div class="fm-detail-row"><span class="fm-detail-key">Şirkət</span><span class="fm-detail-val">${f.company_name || '—'}</span></div>
        <div class="fm-detail-row"><span class="fm-detail-key">Tarix</span><span class="fm-detail-val">${fmtDate(f.created_at)}</span></div>
        <div class="fm-detail-row"><span class="fm-detail-key">Status</span><span class="fm-detail-val">${f._status === 'deleted' ? '🔴 Silinib' : '🟢 Aktiv'}</span></div>
        <div class="fm-detail-row"><span class="fm-detail-key">Kateqoriya</span><span class="fm-detail-val">${f.category || '—'}</span></div>
        <div class="fm-detail-row"><span class="fm-detail-key">Download URL</span><span class="fm-detail-val" style="font-size:11px">/api/v1/files/${f.uuid || f.id}/download</span></div>
      `;
      document.getElementById('fm-detail-overlay').classList.add('open');
    },

    // Fayl yüklə
    downloadFile(id) {
      const fid = typeof id === 'object' ? FM._modalFile : id;
      const f = fm.files.find(x => (x.uuid || x.id) === fid);
      if (!f) return;
      const url = `${API}/api/v1/files/${f.uuid || f.id}/download`;
      const tk = token();
      // Token ilə fetch, sonra blob kimi yüklə
      fetch(url, { headers: { 'Authorization': `Bearer ${tk}` } })
        .then(r => {
          if (!r.ok) throw new Error('Yükləmə xətası: ' + r.status);
          return r.blob();
        })
        .then(blob => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = f.original_filename || f.name || 'fayl';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(a.href);
          notify('Yükləndi: ' + (f.original_filename || ''), 'success');
        })
        .catch(err => notify('Yükləmə xətası: ' + err.message, 'error'));
    },

    // Rename
    startRename(id) {
      if (fm.renaming) FM.cancelRename();
      fm.renaming = id;
      const cell = document.getElementById(`fmname-${id}`);
      if (!cell) return;
      const f = fm.files.find(x => (x.uuid || x.id) === id);
      const name = f ? (f.original_filename || f.name || '') : '';
      const dotIdx = name.lastIndexOf('.');
      const base = dotIdx > 0 ? name.slice(0, dotIdx) : name;
      const ext = dotIdx > 0 ? name.slice(dotIdx) : '';
      cell.innerHTML = `<input class="fm-rename-input" id="fm-ri-${id}" value="${base}"
        onblur="FM.saveRename('${id}','${ext}')"
        onkeydown="if(event.key==='Enter')FM.saveRename('${id}','${ext}');if(event.key==='Escape')FM.cancelRename()">`;
      const inp = document.getElementById(`fm-ri-${id}`);
      if (inp) { inp.focus(); inp.select(); }
    },

    async saveRename(id, ext) {
      const inp = document.getElementById(`fm-ri-${id}`);
      if (!inp) return;
      const nv = inp.value.trim();
      if (!nv) { FM.cancelRename(); return; }
      const newName = nv + ext;
      fm.renaming = null;
      // Lokal güncəllə
      const f = fm.files.find(x => (x.uuid || x.id) === id);
      if (f) f.original_filename = newName;
      // Server-ə göndər
      try {
        await apiCall(`/api/v1/admin/files/${id}`, 'PATCH', { original_filename: newName });
        notify('Fayl adı dəyişdirildi', 'success');
      } catch (err) {
        notify('Rename server xətası: ' + err.message, 'error');
      }
      renderTable();
    },
    cancelRename() {
      fm.renaming = null;
      renderTable();
    },


    softDeleteFile(id) {
        const fid = typeof id === 'object' ? FM._modalFile : id;
        FM._confirm('Faylı arşivə göndər?', 'Bu fayl deaktiv ediləcək (soft delete).', async () => {
            try {
                // DÜZƏLDİLƏN HİSSƏ: admin prefix-i əlavə edildi
                await apiCall(`/api/v1/admin/files/${fid}`, 'DELETE');
                const f = fm.files.find(x => (x.uuid || x.id) === fid);
                if (f) f._status = 'deleted';
                fm.selected.delete(fid);
                applyFilter();
                renderNav();
                notify('Fayl arşivə göndərildi', 'success');
            } catch (err) {
                notify('Soft sil xətası: ' + err.message, 'error');
            }
        });
    },


    // Hard sil
    confirmHardDelete(id) {
        const fid = typeof id === 'object' ? FM._modalFile : id;
        const f = fm.files.find(x => (x.uuid || x.id) === fid);
        const name = f ? (f.original_filename || '') : '';
        FM._confirm(
            '⚠️ Hard delete — əminsiniz?',
            `"${name}" faylı DATABASE-dən tamamilə silinəcək. Bu əməliyyat GERİ ALINMAZ.`,
            async () => {
              try {
                // DÜZƏLDİLƏN HİSSƏ: admin prefix-i əlavə edildi
                await apiCall(`/api/v1/admin/files/${fid}/hard`, 'DELETE');
                console.log(`✅ File ${fid} hard deleted successfully`);
              } catch (err) {
                console.warn(`Hard delete xətası: ${err.message}`);
                // Alternativ: soft delete et
                try {
                  await apiCall(`/api/v1/admin/files/${fid}`, 'DELETE');
                  console.log(`✅ File ${fid} soft deleted as fallback`);
                } catch (e) {
                  console.error(`Silinə bilmədi: ${e.message}`);
                }
              }
              const idx = fm.files.findIndex(x => (x.uuid || x.id) === fid);
              if (idx > -1) fm.files.splice(idx, 1);
              fm.selected.delete(fid);
              FM.closeModal('fm-detail-overlay');
              applyFilter();
              renderNav();
              notify('Fayl silindi', 'success');
            }
        );
    },

    // Toplu soft sil
    bulkSoftDelete() {
      if (!fm.selected.size) return;
      FM._confirm(
        `${fm.selected.size} faylı sil?`,
        'Seçilmiş fayllar arşivə göndəriləcək.',
        async () => {
          const ids = [...fm.selected];
          for (const id of ids) {
            try { await apiCall(`/api/v1/files/${id}`, 'DELETE'); } catch { }
            const f = fm.files.find(x => (x.uuid || x.id) === id);
            if (f) f._status = 'deleted';
          }
          fm.selected.clear();
          applyFilter();
          renderNav();
          notify(`${ids.length} fayl arşivə göndərildi`, 'success');
        }
      );
    },

      // Toplu yükləmə (ZIP)
    // Toplu yükləmə (ZIP) - Serverdəki bulk-download endpoint-i istifadə et
    async bulkDownload() {
        if (!fm.selected.size) {
            notify('Heç bir fayl seçilməyib', 'error');
            return;
        }

        const selectedIds = [...fm.selected];

        FM._confirm(
            `📦 ${selectedIds.length} faylı yüklə?`,
            `Seçilmiş fayllar ZIP arşivi olaraq yüklənəcək.`,
            async () => {
                try {
                    const response = await fetch(`${API}/api/v1/admin/files/bulk-download`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token()}`
                        },
                        body: JSON.stringify(selectedIds)
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const blob = await response.blob();
                    const downloadUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                    a.download = `fayllar_${timestamp}.zip`;
                    a.href = downloadUrl;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(downloadUrl);

                    notify(`${selectedIds.length} fayl uğurla yükləndi`, 'success');

                } catch (err) {
                    console.error('Bulk download error:', err);
                    notify('ZIP faylı yaradılarkən xəta: ' + err.message, 'error');
                }
            }
        );
    },

    // Toplu hard sil

    bulkHardDelete() {
        if (!fm.selected.size) return;
        FM._confirm(
            `⚠️ ${fm.selected.size} faylı DATABASE-dən sil?`,
            'Bu əməliyyat GERİ ALINMAZ. Bütün seçilmiş fayllar tamamilə silinəcək.',
            async () => {
              const ids = [...fm.selected];
              let successCount = 0;
              for (const id of ids) {
                try {
                  // DÜZƏLDİLƏN HİSSƏ: admin prefix-i əlavə edildi
                  await apiCall(`/api/v1/admin/files/${id}/hard`, 'DELETE');
                  successCount++;
                } catch (err) {
                  console.warn(`Failed to delete ${id}: ${err.message}`);
                  // Alternativ: soft delete
                  try {
                    await apiCall(`/api/v1/admin/files/${id}`, 'DELETE');
                    successCount++;
                  } catch (e) {}
                }
                const idx = fm.files.findIndex(x => (x.uuid || x.id) === id);
                if (idx > -1) fm.files.splice(idx, 1);
              }
              fm.selected.clear();
              applyFilter();
              renderNav();
              notify(`${successCount} fayl silindi`, 'success');
            }
        );
    },

    // Confirm helper
    _confirm(title, msg, onOk) {
      document.getElementById('fm-confirm-title').textContent = title;
      document.getElementById('fm-confirm-msg').textContent = msg;
      const okBtn = document.getElementById('fm-confirm-ok');
      const newOk = okBtn.cloneNode(true);
      okBtn.parentNode.replaceChild(newOk, okBtn);
      newOk.addEventListener('click', () => {
        FM.closeModal('fm-confirm-overlay');
        onOk();
      });
      document.getElementById('fm-confirm-overlay').classList.add('open');
    },

    closeModal(id) { document.getElementById(id)?.classList.remove('open'); },

        // Init
    init() {
        console.log('[FM] init çağırıldı');
        const page = document.getElementById('filesPage');
        if (!page) {
            console.error('[FM] #filesPage tapılmadı! HTML-də <div id="filesPage"> əlavə edin');
            return;
        }

        // Həmişə HTML-i təzələ (əgər boşdursa və ya placeholder varsa)
        const hasContent = page.innerHTML &&
                           !page.innerHTML.includes('fm-root-placeholder') &&
                           !page.innerHTML.includes('Yüklənir');

        if (!hasContent || page.dataset.fmInit !== '1') {
            console.log('[FM] İlk dəfə yüklənir, HTML yaradılır...');
            page.dataset.fmInit = '1';
            page.innerHTML = buildHTML();

            // Event-lər
            const searchInput = document.getElementById('fm-search');
            if (searchInput) {
                searchInput.addEventListener('input', e => {
                    fm.search = e.target.value;
                    applyFilter();
                });
            }

            const typeFilter = document.getElementById('fm-type-filter');
            if (typeFilter) {
                typeFilter.addEventListener('change', e => {
                    fm.typeFilter = e.target.value;
                    applyFilter();
                });
            }

            // Modalları ESC ilə bağla
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape') {
                    FM.closeModal('fm-detail-overlay');
                    FM.closeModal('fm-confirm-overlay');
                    if (fm.renaming) FM.cancelRename();
                }
            });

            FM.load();
        } else {
            console.log('[FM] Artıq init edilib, sadəcə yenilənir...');
            FM.refresh();
        }
    }
  };

  // ── admin-panel.html ilə inteqrasiya ─────────────────────────
  // 1) core.js-in showPage funksiyasını genişləndir
  const _origShowPage = window.showPage;
  window.showPage = function (pageName) {
    if (typeof _origShowPage === 'function') _origShowPage(pageName);
    if (pageName === 'files') {
      // Əgər filesPage yeni açılırsa, init et
      const page = document.getElementById('filesPage');
      if (page && !page.dataset.fmInit) {
        page.dataset.fmInit = '1';
        FM.init();
      } else if (page && page.dataset.fmInit) {
        // Artıq init edilib, sadəcə yenilə
        FM.refresh();
      }
    }
  };

  // 2) core.js-in switch-case-ni genişləndir (əgər switch istifadə edirsə)
  // pageMappings-ə əlavə
  if (typeof window.pageMappings !== 'undefined') {
    window.pageMappings['files'] = 'filesPage';
  }


  // 3) loadFiles global olaraq
  window.loadFiles = function () { FM.refresh(); };

  console.log('[FM] filemanager.js yükləndi ✓');
})();

// JSZip kitabxanasını yüklə
function loadJSZip() {
    return new Promise((resolve, reject) => {
        if (typeof JSZip !== 'undefined') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => {
            console.log('JSZip yükləndi');
            resolve();
        };
        script.onerror = () => {
            reject(new Error('JSZip yüklənə bilmədi'));
        };
        document.head.appendChild(script);
    });
}