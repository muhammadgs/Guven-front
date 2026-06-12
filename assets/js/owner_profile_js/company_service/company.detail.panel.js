/**
 * ŞİRKƏT DETAL PANELİ
 * assets/js/owner_profile_js/company.detail.panel.js
 *
 * company.service.js ilə birlikdə işləyir.
 * Şirkət siyahısından bir şirkət seçildiyi zaman
 * 4 tabli panel açır:
 *  1. Tam məlumatlar
 *  2. Göstərilən xidmətlər (əlavə + təsdiq)
 *  3. Xidmət göstərən əməkdaşlar
 *  4. Ortaq fayllar
 */

class CompanyDetailPanel {
    constructor(apiService) {
        this.api = apiService || (window.app && window.app.api) || null;
        this.activeCode = null;
        this.activeTab = 'info';
        this.companies = [];
        this.servicesCache = {};
        this.employeesCache = {};
        this.filesCache = {};
        this.userCompanyCode = this._getUserCompanyCode();
    }

    _getUserCompanyCode() {
        try {
            const d = JSON.parse(localStorage.getItem('userData') || '{}');
            return d.user?.company_code || d.company_code || '';
        } catch { return ''; }
    }

    /** Ana giriş — company.service.js-dən companies massivi gəlir */
    mount(companies, containerId) {
        this.companies = companies || [];
        this.activeCode = null;
        this.activeTab = 'info';

        const root = document.getElementById(containerId);
        if (!root) return;

        root.innerHTML = this._panelHTML();
        this._bindSearch();
        this._renderList();
    }

    /** ==== HTML ŞABLONLARI ==== */

    _panelHTML() {
        return `
<div id="cdpPanel" style="display:flex;height:600px;border:0.5px solid var(--color-border-tertiary,#e5e7eb);border-radius:12px;overflow:hidden;background:var(--color-background-primary,#fff);font-family:inherit;">

  <!-- Solda siyahı -->
  <div id="cdpSidebar" style="width:260px;flex-shrink:0;border-right:0.5px solid var(--color-border-tertiary,#e5e7eb);display:flex;flex-direction:column;">
    <div style="padding:14px 16px 10px;border-bottom:0.5px solid var(--color-border-tertiary,#e5e7eb);">
      <p style="font-size:11px;font-weight:500;color:var(--color-text-secondary,#6b7280);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Şirkətlər</p>
      <div style="position:relative;">
        <svg style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--color-text-tertiary,#9ca3af);" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
        <input id="cdpSearch" type="text" placeholder="Axtar..." style="width:100%;padding:7px 10px 7px 28px;font-size:12px;border:0.5px solid var(--color-border-tertiary,#e5e7eb);border-radius:8px;background:var(--color-background-secondary,#f9fafb);color:var(--color-text-primary,#111);outline:none;" />
      </div>
    </div>
    <div id="cdpList" style="flex:1;overflow-y:auto;"></div>
  </div>

  <!-- Sağda panel -->
  <div id="cdpMain" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
    <div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:10px;color:var(--color-text-tertiary,#9ca3af);">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      <p style="font-size:13px;">Şirkət seçin</p>
    </div>
  </div>

</div>

<!-- Modal container -->
<div id="cdpModal"></div>
        `;
    }

    _bindSearch() {
        const inp = document.getElementById('cdpSearch');
        if (!inp) return;
        inp.addEventListener('input', e => {
            const q = e.target.value.toLowerCase().trim();
            this._renderList(q);
        });
    }

    /** ==== SİYAHI ==== */

    _renderList(query = '') {
        const list = document.getElementById('cdpList');
        if (!list) return;

        const filtered = query
            ? this.companies.filter(c =>
                (c.company_name || '').toLowerCase().includes(query) ||
                (c.company_code || '').toLowerCase().includes(query) ||
                (c.voen || '').includes(query))
            : this.companies;

        if (!filtered.length) {
            list.innerHTML = `<p style="text-align:center;padding:24px 12px;font-size:12px;color:var(--color-text-secondary,#6b7280);">Şirkət tapılmadı</p>`;
            return;
        }

        list.innerHTML = filtered.map(c => {
            const initials = this._initials(c.company_name || c.company_code);
            const colors = this._colorFor(c.company_code);
            const active = c.company_code === this.activeCode;
            const badge = c.is_active
                ? `<span style="font-size:10px;padding:1px 6px;border-radius:10px;background:#EAF3DE;color:#3B6D11;margin-left:4px;">Aktiv</span>`
                : `<span style="font-size:10px;padding:1px 6px;border-radius:10px;background:#FCEBEB;color:#A32D2D;margin-left:4px;">Deaktiv</span>`;

            return `
<div class="cdp-item" data-code="${c.company_code}"
  style="padding:11px 16px;border-bottom:0.5px solid var(--color-border-tertiary,#e5e7eb);cursor:pointer;display:flex;align-items:center;gap:10px;background:${active ? '#E6F1FB' : 'transparent'};transition:background .12s;">
  <div style="width:34px;height:34px;border-radius:8px;background:${colors.bg};color:${colors.fg};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;flex-shrink:0;">${initials}</div>
  <div style="min-width:0;">
    <div style="font-size:13px;font-weight:500;color:var(--color-text-primary,#111);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.company_name || c.company_code}</div>
    <div style="font-size:11px;color:var(--color-text-secondary,#6b7280);margin-top:1px;">${c.company_code}${badge}</div>
  </div>
</div>`;
        }).join('');

        list.querySelectorAll('.cdp-item').forEach(el => {
            el.addEventListener('click', () => this._selectCompany(el.dataset.code));
            el.addEventListener('mouseenter', () => { if (el.dataset.code !== this.activeCode) el.style.background = 'var(--color-background-secondary,#f9fafb)'; });
            el.addEventListener('mouseleave', () => { if (el.dataset.code !== this.activeCode) el.style.background = 'transparent'; });
        });
    }

    async _selectCompany(code) {
        this.activeCode = code;
        this.activeTab = 'info';
        this._renderList(document.getElementById('cdpSearch')?.value || '');
        await this._renderMain();
    }

    /** ==== ANA PANEL ==== */

    async _renderMain() {
        const main = document.getElementById('cdpMain');
        if (!main) return;

        const c = this.companies.find(x => x.company_code === this.activeCode);
        if (!c) return;

        const colors = this._colorFor(c.company_code);
        const initials = this._initials(c.company_name || c.company_code);

        main.innerHTML = `
<div style="padding:14px 20px 0;border-bottom:0.5px solid var(--color-border-tertiary,#e5e7eb);flex-shrink:0;">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
    <div style="width:36px;height:36px;border-radius:8px;background:${colors.bg};color:${colors.fg};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;">${initials}</div>
    <div>
      <div style="font-size:15px;font-weight:500;color:var(--color-text-primary,#111);">${c.company_name || c.company_code}</div>
      <div style="font-size:11px;color:var(--color-text-secondary,#6b7280);margin-top:1px;">${c.company_code} · VÖEN: ${c.voen || '—'}</div>
    </div>
  </div>
  <div style="display:flex;gap:0;" id="cdpTabs">
    ${this._tabBtn('info','Məlumatlar')}
    ${this._tabBtn('services','Xidmətlər')}
    ${this._tabBtn('employees','Əməkdaşlar')}
    ${this._tabBtn('files','Fayllar')}
  </div>
</div>
<div id="cdpTabBody" style="flex:1;overflow-y:auto;padding:16px 20px;"></div>
        `;

        main.style.display = 'flex';
        main.style.flexDirection = 'column';

        document.querySelectorAll('.cdp-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
        });

        await this._renderTab();
    }

    _tabBtn(tab, label) {
        const active = tab === this.activeTab;
        return `<button class="cdp-tab-btn" data-tab="${tab}" style="padding:9px 16px;font-size:13px;font-weight:${active ? '500' : '400'};color:${active ? '#185FA5' : 'var(--color-text-secondary,#6b7280)'};background:none;border:none;border-bottom:2px solid ${active ? '#185FA5' : 'transparent'};cursor:pointer;white-space:nowrap;transition:all .12s;">${label}</button>`;
    }

    async _switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('.cdp-tab-btn').forEach(b => {
            const on = b.dataset.tab === tab;
            b.style.color = on ? '#185FA5' : 'var(--color-text-secondary,#6b7280)';
            b.style.fontWeight = on ? '500' : '400';
            b.style.borderBottom = on ? '2px solid #185FA5' : '2px solid transparent';
        });
        await this._renderTab();
    }

    async _renderTab() {
        const body = document.getElementById('cdpTabBody');
        if (!body) return;

        body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--color-text-tertiary,#9ca3af);font-size:13px;">Yüklənir...</div>`;

        switch (this.activeTab) {
            case 'info':      body.innerHTML = await this._tabInfo(); break;
            case 'services':  body.innerHTML = await this._tabServices(); break;
            case 'employees': body.innerHTML = await this._tabEmployees(); break;
            case 'files':     body.innerHTML = await this._tabFiles(); break;
        }

        this._bindTabEvents();
    }

    /** ==== TAB 1: MƏLUMATLAR ==== */

    async _tabInfo() {
        const c = this.companies.find(x => x.company_code === this.activeCode);
        if (!c) return '';

        // Full məlumatları API-dən al
        let full = { ...c };
        try {
            if (this.api) {
                const res = await this.api.get(`/companies/${this.activeCode}/full`);
                if (res) full = { ...full, ...res };
            }
        } catch { /* cache ilə davam et */ }

        const rel = full.is_parent ? 'Üst şirkət' : full.is_child ? 'Alt şirkət' : '—';
        const f = v => v || '—';

        const stat = (label, value, color) => `
<div style="background:var(--color-background-secondary,#f9fafb);border-radius:8px;padding:12px 14px;">
  <div style="font-size:11px;color:var(--color-text-secondary,#6b7280);margin-bottom:3px;">${label}</div>
  <div style="font-size:13px;font-weight:500;color:${color || 'var(--color-text-primary,#111)'};">${value}</div>
</div>`;

        const row = (l, v) => `
<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:0.5px solid var(--color-border-tertiary,#e5e7eb);font-size:13px;">
  <span style="color:var(--color-text-secondary,#6b7280);">${l}</span>
  <span style="font-weight:500;color:var(--color-text-primary,#111);text-align:right;max-width:200px;word-break:break-word;">${v}</span>
</div>`;

        const sectionTitle = t => `<p style="font-size:11px;font-weight:500;color:var(--color-text-secondary,#6b7280);text-transform:uppercase;letter-spacing:.05em;margin:14px 0 8px;">${t}</p>`;

        return `
${sectionTitle('Ümumi')}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
  ${stat('Status', full.is_active ? '<span style="background:#EAF3DE;color:#3B6D11;padding:2px 8px;border-radius:10px;font-size:11px;">Aktiv</span>' : '<span style="background:#FCEBEB;color:#A32D2D;padding:2px 8px;border-radius:10px;font-size:11px;">Deaktiv</span>', '')}
  ${stat('Əlaqə növü', rel)}
  ${stat('Hüquqi forma', f(full.company_structure || full.legal_form))}
  ${stat('Kapital', f(full.capital))}
</div>

${sectionTitle('Şirkət məlumatları')}
<div style="border:0.5px solid var(--color-border-tertiary,#e5e7eb);border-radius:8px;padding:0 12px;">
  ${row('VÖEN', f(full.voen))}
  ${row('Fəaliyyət sahəsi', f(full.industry_sector || full.industry))}
  ${row('Ünvan', f(full.address))}
  ${row('Telefon', f(full.phone))}
  ${row('Email', f(full.email))}
  ${row('Vebsayt', f(full.company_website || full.website))}
  ${row('Bank', f(full.bank_name || full.bank))}
  ${row('Hesab', f(full.bank_account))}
  ${row('Qeydiyyat tarixi', full.registration_date ? new Date(full.registration_date).toLocaleDateString('az-AZ') : '—')}
</div>

${sectionTitle('Rəhbər')}
<div style="border:0.5px solid var(--color-border-tertiary,#e5e7eb);border-radius:8px;padding:0 12px;">
  ${row('Ad', f(full.ceo_name || (full.ceo_info && full.ceo_info.ceo_name)))}
  ${row('Email', f(full.ceo_email || (full.ceo_info && full.ceo_info.ceo_email)))}
  ${row('Telefon', f(full.ceo_phone || (full.ceo_info && full.ceo_info.ceo_phone)))}
</div>
        `;
    }

    /** ==== TAB 2: XİDMƏTLƏR ==== */

    async _tabServices() {
        if (!this.servicesCache[this.activeCode]) {
            try {
                if (this.api) {
                    const res = await this.api.get(`/services/company/${this.activeCode}`);
                    this.servicesCache[this.activeCode] = (res && (res.services || res)) || [];
                } else {
                    this.servicesCache[this.activeCode] = [];
                }
            } catch {
                this.servicesCache[this.activeCode] = [];
            }
        }

        const list = this.servicesCache[this.activeCode];

        const svcIcon = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#185FA5" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5 8h6M5 5h6M5 11h3"/></svg>`;

        const items = list.length ? list.map(s => {
            const confirmed = s.status === 'confirmed' || s.is_confirmed;
            const statusBadge = confirmed
                ? `<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:#EAF3DE;color:#3B6D11;">Təsdiqlənib</span>`
                : `<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:#FAEEDA;color:#854F0B;">Gözlənilir</span>`;

            return `
<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:0.5px solid var(--color-border-tertiary,#e5e7eb);border-radius:8px;background:var(--color-background-primary,#fff);">
  <div style="width:28px;height:28px;border-radius:8px;background:#E6F1FB;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${svcIcon}</div>
  <div style="flex:1;min-width:0;">
    <div style="font-size:13px;font-weight:500;color:var(--color-text-primary,#111);">${s.name || s.service_name}</div>
    <div style="font-size:11px;color:var(--color-text-secondary,#6b7280);margin-top:1px;">${s.period || s.service_period || ''} ${s.start_date ? '· ' + new Date(s.start_date).toLocaleDateString('az-AZ') : ''}</div>
  </div>
  ${statusBadge}
</div>`;
        }).join('<div style="height:6px;"></div>') : `
<div style="text-align:center;padding:32px;color:var(--color-text-secondary,#6b7280);font-size:13px;">
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin:0 auto 8px;display:block;"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
  Hələ xidmət əlavə edilməyib
</div>`;

        return `
<p style="font-size:11px;font-weight:500;color:var(--color-text-secondary,#6b7280);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">Göstərilən xidmətlər</p>
<div id="cdpServiceList" style="display:flex;flex-direction:column;gap:6px;">${items}</div>
<button id="cdpAddService" style="display:flex;align-items:center;gap:6px;padding:8px 14px;font-size:13px;border:0.5px dashed var(--color-border-secondary,#d1d5db);border-radius:8px;background:none;color:var(--color-text-secondary,#6b7280);cursor:pointer;width:100%;margin-top:10px;transition:all .12s;">
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>
  Yeni xidmət əlavə et
</button>`;
    }

    /** ==== TAB 3: ƏMƏKDAŞLAR ==== */

    async _tabEmployees() {
        if (!this.employeesCache[this.activeCode]) {
            try {
                if (this.api) {
                    const res = await this.api.get(`/users/company/${this.userCompanyCode}`);
                    const all = (res && (res.users || res)) || [];
                    // Bu şirkətə təyin edilənləri filtrləyirik
                    this.employeesCache[this.activeCode] = all.filter(e =>
                        (e.assigned_companies || []).includes(this.activeCode) ||
                        e.company_code === this.userCompanyCode
                    );
                } else {
                    this.employeesCache[this.activeCode] = [];
                }
            } catch {
                this.employeesCache[this.activeCode] = [];
            }
        }

        const list = this.employeesCache[this.activeCode];
        const colorPairs = [
            { bg: '#B5D4F4', fg: '#185FA5' },
            { bg: '#9FE1CB', fg: '#0F6E56' },
            { bg: '#CECBF6', fg: '#533AB7' },
            { bg: '#FAC775', fg: '#854F0B' },
        ];

        const items = list.length ? list.map((e, i) => {
            const cp = colorPairs[i % colorPairs.length];
            const name = [e.ceo_name || e.first_name || e.name, e.ceo_lastname || e.last_name || e.surname].filter(Boolean).join(' ') || 'İstifadəçi';
            const initials = this._initials(name);
            const pos = e.position || (e.is_admin ? 'Admin' : 'İşçi');

            return `
<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:0.5px solid var(--color-border-tertiary,#e5e7eb);border-radius:8px;">
  <div style="width:32px;height:32px;border-radius:50%;background:${cp.bg};color:${cp.fg};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;flex-shrink:0;">${initials}</div>
  <div style="flex:1;">
    <div style="font-size:13px;font-weight:500;color:var(--color-text-primary,#111);">${name}</div>
    <div style="font-size:11px;color:var(--color-text-secondary,#6b7280);margin-top:1px;">${pos} · ${e.ceo_email || e.email || ''}</div>
  </div>
  <span style="font-size:10px;padding:2px 7px;border-radius:10px;background:var(--color-background-secondary,#f9fafb);color:var(--color-text-secondary,#6b7280);">${e.is_admin ? 'Admin' : 'İşçi'}</span>
</div>`;
        }).join('<div style="height:6px;"></div>') : `
<div style="text-align:center;padding:32px;color:var(--color-text-secondary,#6b7280);font-size:13px;">
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin:0 auto 8px;display:block;"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
  Bu şirkətə təyin edilmiş əməkdaş tapılmadı
</div>`;

        return `
<p style="font-size:11px;font-weight:500;color:var(--color-text-secondary,#6b7280);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">Xidmət göstərən əməkdaşlar</p>
<div style="display:flex;flex-direction:column;gap:6px;">${items}</div>`;
    }

    /** ==== TAB 4: FAYLLAR ==== */

    async _tabFiles() {
        if (!this.filesCache[this.activeCode]) {
            try {
                if (this.api) {
                    const res = await this.api.get(`/company-files/${this.activeCode}`);
                    const d = res && (res.data || res);
                    this.filesCache[this.activeCode] = d && d.files ? d.files : (Array.isArray(d) ? d : []);
                } else {
                    this.filesCache[this.activeCode] = [];
                }
            } catch {
                this.filesCache[this.activeCode] = [];
            }
        }

        const list = this.filesCache[this.activeCode];

        const extInfo = name => {
            const ext = (name || '').split('.').pop().toUpperCase();
            const map = {
                PDF: { bg: '#F7C1C1', fg: '#A32D2D' },
                DOC: { bg: '#B5D4F4', fg: '#185FA5' },
                DOCX: { bg: '#B5D4F4', fg: '#185FA5' },
                XLS: { bg: '#C0DD97', fg: '#3B6D11' },
                XLSX: { bg: '#C0DD97', fg: '#3B6D11' },
                PNG: { bg: '#CECBF6', fg: '#533AB7' },
                JPG: { bg: '#CECBF6', fg: '#533AB7' },
            };
            return { ext, ...(map[ext] || { bg: '#D3D1C7', fg: '#5F5E5A' }) };
        };

        const fmtSize = bytes => {
            if (!bytes) return '—';
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
            return (bytes / 1048576).toFixed(1) + ' MB';
        };

        const items = list.length ? list.map(f => {
            const { ext, bg, fg } = extInfo(f.file_name || f.name);
            const size = fmtSize(f.file_size || f.size);
            const date = f.created_at ? new Date(f.created_at).toLocaleDateString('az-AZ') : (f.upload_date || '');

            return `
<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:0.5px solid var(--color-border-tertiary,#e5e7eb);border-radius:8px;">
  <div style="width:28px;height:28px;border-radius:8px;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;flex-shrink:0;">${ext}</div>
  <div style="flex:1;min-width:0;">
    <div style="font-size:13px;font-weight:500;color:var(--color-text-primary,#111);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.file_name || f.name}</div>
    <div style="font-size:11px;color:var(--color-text-secondary,#6b7280);margin-top:1px;">${date}</div>
  </div>
  <span style="font-size:11px;color:var(--color-text-secondary,#6b7280);flex-shrink:0;">${size}</span>
</div>`;
        }).join('<div style="height:6px;"></div>') : `
<div style="text-align:center;padding:32px;color:var(--color-text-secondary,#6b7280);font-size:13px;">
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin:0 auto 8px;display:block;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
  Hələ fayl əlavə edilməyib
</div>`;

        return `
<p style="font-size:11px;font-weight:500;color:var(--color-text-secondary,#6b7280);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">Ortaq fayllar</p>
<div style="display:flex;flex-direction:column;gap:6px;">${items}</div>

<div id="cdpUploadZone" style="border:0.5px dashed var(--color-border-secondary,#d1d5db);border-radius:8px;padding:18px;text-align:center;margin-top:12px;cursor:pointer;transition:background .12s;">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="color:var(--color-text-tertiary,#9ca3af);margin:0 auto 6px;display:block;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
  <p style="font-size:13px;color:var(--color-text-secondary,#6b7280);">Fayl yükləmək üçün klikləyin</p>
</div>`;
    }

    /** ==== TAB EVENT BİNDİNGLƏR ==== */

    _bindTabEvents() {
        // Xidmət əlavə et düyməsi
        const addSvcBtn = document.getElementById('cdpAddService');
        if (addSvcBtn) addSvcBtn.addEventListener('click', () => this._openServiceModal());

        // Upload zone
        const uploadZone = document.getElementById('cdpUploadZone');
        if (uploadZone) {
            uploadZone.addEventListener('mouseenter', () => { uploadZone.style.background = 'var(--color-background-secondary,#f9fafb)'; });
            uploadZone.addEventListener('mouseleave', () => { uploadZone.style.background = 'transparent'; });
            uploadZone.addEventListener('click', () => this._openFileModal());
        }
    }

    /** ==== MODAL: XİDMƏT ƏLAVƏSİ ==== */

    _openServiceModal() {
        const modal = document.getElementById('cdpModal');
        if (!modal) return;

        modal.innerHTML = `
<div style="position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:9999;" id="cdpModalOverlay">
  <div style="background:var(--color-background-primary,#fff);border-radius:12px;padding:20px 24px;width:360px;border:0.5px solid var(--color-border-tertiary,#e5e7eb);">
    <h4 style="font-size:15px;font-weight:500;color:var(--color-text-primary,#111);margin-bottom:12px;">Yeni xidmət əlavə et</h4>
    <div style="font-size:11px;color:#854F0B;padding:8px 10px;background:#FAEEDA;border-radius:8px;margin-bottom:12px;">
      Əlavə etdikdən sonra qarşı tərəf təsdiqləməlidir
    </div>
    <input id="cdpSvcName" type="text" placeholder="Xidmət adı *" style="width:100%;padding:8px 10px;font-size:13px;border:0.5px solid var(--color-border-secondary,#d1d5db);border-radius:8px;margin-bottom:8px;background:var(--color-background-primary,#fff);color:var(--color-text-primary,#111);" />
    <select id="cdpSvcPeriod" style="width:100%;padding:8px 10px;font-size:13px;border:0.5px solid var(--color-border-secondary,#d1d5db);border-radius:8px;margin-bottom:8px;background:var(--color-background-primary,#fff);color:var(--color-text-primary,#111);">
      <option value="Aylıq">Aylıq</option>
      <option value="Rüblük">Rüblük</option>
      <option value="İllik">İllik</option>
      <option value="Birdəfəlik">Birdəfəlik</option>
    </select>
    <input id="cdpSvcDate" type="date" style="width:100%;padding:8px 10px;font-size:13px;border:0.5px solid var(--color-border-secondary,#d1d5db);border-radius:8px;margin-bottom:14px;background:var(--color-background-primary,#fff);color:var(--color-text-primary,#111);" />
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button id="cdpModalCancel" style="padding:8px 18px;font-size:13px;background:none;border:0.5px solid var(--color-border-secondary,#d1d5db);border-radius:8px;cursor:pointer;color:var(--color-text-secondary,#6b7280);">Ləğv et</button>
      <button id="cdpModalSave" style="padding:8px 18px;font-size:13px;font-weight:500;background:#185FA5;color:#fff;border:none;border-radius:8px;cursor:pointer;">Göndər</button>
    </div>
  </div>
</div>`;

        document.getElementById('cdpModalOverlay').addEventListener('click', e => {
            if (e.target === e.currentTarget) this._closeModal();
        });
        document.getElementById('cdpModalCancel').addEventListener('click', () => this._closeModal());
        document.getElementById('cdpModalSave').addEventListener('click', () => this._submitService());
    }

    async _submitService() {
        const name = document.getElementById('cdpSvcName')?.value.trim();
        const period = document.getElementById('cdpSvcPeriod')?.value;
        const date = document.getElementById('cdpSvcDate')?.value;

        if (!name) {
            document.getElementById('cdpSvcName').style.borderColor = '#E24B4A';
            return;
        }

        const payload = {
            service_name: name,
            service_period: period,
            start_date: date || null,
            company_code: this.activeCode,
            provider_company_code: this.userCompanyCode,
            status: 'pending',
        };

        try {
            if (this.api) {
                await this.api.post('/services/company-service', payload);
            }
        } catch (e) {
            console.warn('Service POST failed, local only:', e);
        }

        // Lokal cache-ə əlavə et
        if (!this.servicesCache[this.activeCode]) this.servicesCache[this.activeCode] = [];
        this.servicesCache[this.activeCode].unshift({
            name, period, status: 'pending', start_date: date
        });

        this._closeModal();
        await this._switchTab('services');
    }

    /** ==== MODAL: FAYL ==== */

    _openFileModal() {
        const modal = document.getElementById('cdpModal');
        if (!modal) return;

        modal.innerHTML = `
<div style="position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:9999;" id="cdpModalOverlay">
  <div style="background:var(--color-background-primary,#fff);border-radius:12px;padding:20px 24px;width:360px;border:0.5px solid var(--color-border-tertiary,#e5e7eb);">
    <h4 style="font-size:15px;font-weight:500;color:var(--color-text-primary,#111);margin-bottom:12px;">Fayl yüklə</h4>
    <input id="cdpFileInput" type="file" style="width:100%;padding:8px 0;font-size:13px;margin-bottom:14px;color:var(--color-text-primary,#111);" />
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button id="cdpModalCancel" style="padding:8px 18px;font-size:13px;background:none;border:0.5px solid var(--color-border-secondary,#d1d5db);border-radius:8px;cursor:pointer;color:var(--color-text-secondary,#6b7280);">Ləğv et</button>
      <button id="cdpModalSave" style="padding:8px 18px;font-size:13px;font-weight:500;background:#185FA5;color:#fff;border:none;border-radius:8px;cursor:pointer;">Yüklə</button>
    </div>
  </div>
</div>`;

        document.getElementById('cdpModalOverlay').addEventListener('click', e => {
            if (e.target === e.currentTarget) this._closeModal();
        });
        document.getElementById('cdpModalCancel').addEventListener('click', () => this._closeModal());
        document.getElementById('cdpModalSave').addEventListener('click', () => this._submitFile());
    }

    async _submitFile() {
        const fileInput = document.getElementById('cdpFileInput');
        const file = fileInput?.files?.[0];
        if (!file) return;

        // Lokal cache-ə əlavə et
        if (!this.filesCache[this.activeCode]) this.filesCache[this.activeCode] = [];
        this.filesCache[this.activeCode].unshift({
            file_name: file.name,
            file_size: file.size,
            created_at: new Date().toISOString(),
        });

        // Real yükləmə — əgər FileService varsa
        if (window.fileService && window.fileService.uploadFile) {
            try {
                await window.fileService.uploadFile(file, this.activeCode);
            } catch (e) {
                console.warn('Upload failed:', e);
            }
        }

        this._closeModal();
        await this._switchTab('files');
    }

    _closeModal() {
        const m = document.getElementById('cdpModal');
        if (m) m.innerHTML = '';
    }

    /** ==== KÖMƏKÇI ==== */

    _initials(name) {
        if (!name) return '?';
        const words = name.trim().split(/\s+/);
        if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    }

    _colorFor(code) {
        const palettes = [
            { bg: '#E6F1FB', fg: '#185FA5' },
            { bg: '#E1F5EE', fg: '#0F6E56' },
            { bg: '#EEEDFE', fg: '#533AB7' },
            { bg: '#FAEEDA', fg: '#854F0B' },
            { bg: '#FAECE7', fg: '#993C1D' },
            { bg: '#EAF3DE', fg: '#3B6D11' },
        ];
        let hash = 0;
        for (let i = 0; i < (code || '').length; i++) hash = (hash * 31 + code.charCodeAt(i)) & 0xFFFFFF;
        return palettes[Math.abs(hash) % palettes.length];
    }
}

// Global export
if (typeof window !== 'undefined') {
    window.CompanyDetailPanel = CompanyDetailPanel;
}