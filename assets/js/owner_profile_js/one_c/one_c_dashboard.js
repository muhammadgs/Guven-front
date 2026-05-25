/**
 * ================================================
 * GF44 | 1C BRIDGE DASHBOARD — JavaScript
 * Proxy: https://guvenfinans.az/proxy.php/api/v1
 * ================================================
 */

(function (global) {
    'use strict';

    /* ── CONFIG ─────────────────────────────────── */
    const API_BASE = 'https://guvenfinans.az/proxy.php/api/v1';
    const PAGE_SIZE = 15;

    /* ── STATE ──────────────────────────────────── */
    const state = {
        status: 'offline',
        activePanel: 'overview',
        bazalar: [],
        products:  { data: [], total: 0, page: 1, pages: 1, search: '', sort: 'name', dir: 'asc' },
        customers: { data: [], total: 0, page: 1, pages: 1, search: '', sort: 'name', dir: 'asc' },
        orders:    { data: [], total: 0, page: 1, pages: 1, search: '', statusFilter: '' },
        bankAccounts: { data: [], total: 0, page: 1, pages: 1, search: '' },   // ✅ yeni
        cashDesks: { data: [], total: 0, page: 1, pages: 1, search: '' },       // ✅ yeni
        warehouses: { data: [], total: 0, page: 1, pages: 1, search: '' },      // ✅ yeni
        unitsOfMeasure: { data: [], total: 0, page: 1, pages: 1, search: '' },  // ✅ yeni
        productGroups: { data: [], total: 0, page: 1, pages: 1, search: '' },   // ✅ yeni
        syncLog: [],
        stats: { products: 0, customers: 0, orders: 0, bazalar: 0 }
    };

    /* ── TOKEN ──────────────────────────────────── */
    function getToken() {
        return localStorage.getItem('guven_token')
            || localStorage.getItem('token')
            || sessionStorage.getItem('token')
            || null;
    }

    /* ── API HELPERS ────────────────────────────── */
    async function apiFetch(path, opts = {}) {
        const token = getToken();
        const url = API_BASE + path;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(url, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
    }

    const getProducts  = (page=1, search='', ps=PAGE_SIZE) => apiFetch(`/products/?page=${page}&page_size=${ps}${search?'&search='+encodeURIComponent(search):''}`);
    const getProduct   = id => apiFetch(`/products/${id}`);
    const getCustomers = (page=1, search='', ps=PAGE_SIZE) => apiFetch(`/customers/?page=${page}&page_size=${ps}${search?'&search='+encodeURIComponent(search):''}`);
    const getCustomer  = id => apiFetch(`/customers/${id}`);
    const getOrders    = (page=1, search='', status='', ps=PAGE_SIZE) => apiFetch(`/orders/?page=${page}&page_size=${ps}${search?'&search='+encodeURIComponent(search):''}${status?'&status='+status:''}`);
    const getOrder     = id => apiFetch(`/orders/${id}`);
    const getBazalar   = () => apiFetch('/multi-baza/bazalar');
    const syncCompany  = (payload={}) => apiFetch('/auto-sync/company', { method: 'POST', body: JSON.stringify(payload) });
    /* ── API HELPERS (yeni endpointlər) ────────────────────────────── */
    // Yeni kataloq endpointləri
    const getBankAccounts = (page=1, search='', ps=PAGE_SIZE) => apiFetch(`/bank-accounts/?page=${page}&page_size=${ps}${search?'&search='+encodeURIComponent(search):''}`);
    const getCashDesks = (page=1, search='', ps=PAGE_SIZE) => apiFetch(`/cash-desks/?page=${page}&page_size=${ps}${search?'&search='+encodeURIComponent(search):''}`);
    const getWarehouses = (page=1, search='', ps=PAGE_SIZE) => apiFetch(`/warehouses/?page=${page}&page_size=${ps}${search?'&search='+encodeURIComponent(search):''}`);
    const getUnitsOfMeasure = (page=1, search='', ps=PAGE_SIZE) => apiFetch(`/units-of-measure/?page=${page}&page_size=${ps}${search?'&search='+encodeURIComponent(search):''}`);
    const getProductGroups = (page=1, search='', ps=PAGE_SIZE) => apiFetch(`/product-groups/?page=${page}&page_size=${ps}${search?'&search='+encodeURIComponent(search):''}`);

    // Sync endpointləri
    const syncBankAccounts = () => apiFetch('/bank-accounts/sync', { method: 'GET' });
    const syncCashDesks = () => apiFetch('/cash-desks/sync', { method: 'GET' });
    const syncWarehouses = () => apiFetch('/warehouses/sync', { method: 'GET' });
    const syncUnitsOfMeasure = () => apiFetch('/units-of-measure/sync', { method: 'GET' });
    const syncProductGroups = () => apiFetch('/product-groups/sync', { method: 'GET' });

    /* ── TOAST ──────────────────────────────────── */
    function toast(msg, type='info', duration=3500) {
        const icons  = { success:'✓', error:'✕', info:'ℹ', warning:'⚠' };
        const colors = { success:'#34d399', error:'#f87171', info:'#7DB6FF', warning:'#fbbf24' };
        const container = document.getElementById('gf1c-toasts');
        if (!container) return;
        const t = document.createElement('div');
        t.className = `gf1c-toast ${type}`;
        t.innerHTML = `<span style="font-size:15px;color:${colors[type]};flex-shrink:0">${icons[type]}</span><span style="flex:1">${msg}</span>`;
        container.appendChild(t);
        setTimeout(() => { t.style.animation='toastOut 0.3s ease-in forwards'; setTimeout(()=>t.remove(),300); }, duration);
    }

    /* ── STATUS ─────────────────────────────────── */
    function setStatus(s) {
        state.status = s;
        const pill = document.getElementById('gf1c-connection-status');
        if (!pill) return;
        const map = { online:['online','● BAĞLI'], offline:['offline','○ BAĞLANTISIZ'], loading:['loading','◌ YÜKLƏNIR...'] };
        const [cls, label] = map[s] || map.offline;
        pill.className = `gf1c-status-pill ${cls}`;
        pill.innerHTML = `<span class="gf1c-status-dot"></span>${label}`;
    }

    /* ── NAV ────────────────────────────────────── */
    function switchPanel(name) {
        state.activePanel = name;
        document.querySelectorAll('.gf1c-panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.gf1c-nav-item').forEach(n => n.classList.remove('active'));
        const panel = document.getElementById(`gf1c-panel-${name}`);
        const nav   = document.querySelector(`[data-panel="${name}"]`);
        if (panel) panel.classList.add('active');
        if (nav)   nav.classList.add('active');

        // Mövcud panellər
        if (name === 'products')  loadProducts();
        if (name === 'customers') loadCustomers();
        if (name === 'orders')    loadOrders();
        if (name === 'bazalar')   loadBazalar();
        if (name === 'sync')      renderSyncLog();

        // ✅ YENİ PANELLƏR
        if (name === 'bank-accounts') loadBankAccounts();
        if (name === 'cash-desks') loadCashDesks();
        if (name === 'warehouses') loadWarehouses();
        if (name === 'units-of-measure') loadUnitsOfMeasure();
        if (name === 'product-groups') loadProductGroups();
    }

    /* ══════════════════════════════════════════════
   BANK ACCOUNTS — Bank Hesabları
   ══════════════════════════════════════════════ */
    async function loadBankAccounts(page = state.bankAccounts.page) {
        const wrap = document.getElementById('gf1c-bankaccounts-table');
        if (!wrap) return;
        state.bankAccounts.page = page;
        wrap.innerHTML = loadingHtml('Bank hesabları yüklənir...');
        try {
            const res = await getBankAccounts(page, state.bankAccounts.search);
            const items = res.data || res.results || res.items || [];
            const total = res.total || res.count || items.length;
            state.bankAccounts.data = items;
            state.bankAccounts.total = total;
            state.bankAccounts.pages = Math.ceil(total / PAGE_SIZE) || 1;
            setStatus('online');
            wrap.innerHTML = buildBankAccountsTable(items);
            renderPagination('gf1c-bankaccounts-pag', state.bankAccounts, 'bankAccounts');
        } catch (e) {
            setStatus('offline');
            wrap.innerHTML = errorHtml(e.message);
            toast(`Bank hesabları yüklənmədi: ${e.message}`, 'error');
        }
    }

    function buildBankAccountsTable(data) {
        if (!data || !data.length) return emptyHtml('🏦', 'Bank hesabı tapılmadı', 'Sinxronizasiya edin');
        const rows = data.map(b => `
            <tr>
                <td class="mono">${b.code || '—'}</td>
                <td><strong>${b.name || '—'}</strong></td>
                <td>${b.bank_name || '—'}</td>
                <td class="mono">${b.account_number || '—'}</td>
                <td>${b.currency || 'AZN'}</td>
                <td>${b.is_default ? '<span class="gf1c-badge success">Əsas</span>' : '<span class="gf1c-badge info">Əlavə</span>'}</td>
            </tr>
        `).join('');
        return `<table class="gf1c-table">
            <thead><tr><th>KOD</th><th>HESAB ADI</th><th>BANK</th><th>HESAB NÖMRƏSİ</th><th>VALYUTA</th><th>NÖV</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    }

    /* ══════════════════════════════════════════════
       CASH DESKS — Kassalar
       ══════════════════════════════════════════════ */
    async function loadCashDesks(page = state.cashDesks.page) {
        const wrap = document.getElementById('gf1c-cashdesks-table');
        if (!wrap) return;
        state.cashDesks.page = page;
        wrap.innerHTML = loadingHtml('Kassalar yüklənir...');
        try {
            const res = await getCashDesks(page, state.cashDesks.search);
            const items = res.data || res.results || res.items || [];
            const total = res.total || res.count || items.length;
            state.cashDesks.data = items;
            state.cashDesks.total = total;
            state.cashDesks.pages = Math.ceil(total / PAGE_SIZE) || 1;
            setStatus('online');
            wrap.innerHTML = buildCashDesksTable(items);
            renderPagination('gf1c-cashdesks-pag', state.cashDesks, 'cashDesks');
        } catch (e) {
            setStatus('offline');
            wrap.innerHTML = errorHtml(e.message);
            toast(`Kassalar yüklənmədi: ${e.message}`, 'error');
        }
    }

    function buildCashDesksTable(data) {
        if (!data || !data.length) return emptyHtml('💵', 'Kassa tapılmadı', 'Sinxronizasiya edin');
        const rows = data.map(c => `
            <tr>
                <td class="mono">${c.code || '—'}</td>
                <td><strong>${c.name || '—'}</strong></td>
                <td>${c.currency || 'AZN'}</td>
                <td>${c.is_active ? '<span class="gf1c-badge success">Aktiv</span>' : '<span class="gf1c-badge danger">Deaktiv</span>'}</td>
                <td style="color:var(--text-secondary);font-size:12px">${c.onec_guid || '—'}</td>
            </tr>
        `).join('');
        return `<table class="gf1c-table">
            <thead><tr><th>KOD</th><th>KASSA ADI</th><th>VALYUTA</th><th>STATUS</th><th>GUID</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    }

    /* ══════════════════════════════════════════════
       WAREHOUSES — Anbarlar
       ══════════════════════════════════════════════ */
    async function loadWarehouses(page = state.warehouses.page) {
        const wrap = document.getElementById('gf1c-warehouses-table');
        if (!wrap) return;
        state.warehouses.page = page;
        wrap.innerHTML = loadingHtml('Anbarlar yüklənir...');
        try {
            const res = await getWarehouses(page, state.warehouses.search);
            const items = res.data || res.results || res.items || [];
            const total = res.total || res.count || items.length;
            state.warehouses.data = items;
            state.warehouses.total = total;
            state.warehouses.pages = Math.ceil(total / PAGE_SIZE) || 1;
            setStatus('online');
            wrap.innerHTML = buildWarehousesTable(items);
            renderPagination('gf1c-warehouses-pag', state.warehouses, 'warehouses');
        } catch (e) {
            setStatus('offline');
            wrap.innerHTML = errorHtml(e.message);
            toast(`Anbarlar yüklənmədi: ${e.message}`, 'error');
        }
    }

    function buildWarehousesTable(data) {
        if (!data || !data.length) return emptyHtml('🏪', 'Anbar tapılmadı', 'Sinxronizasiya edin');
        const rows = data.map(w => {
            const typeMap = {
                'default': 'Standart',
                'wholesale': 'Topdansatış',
                'retail': 'Pərakəndə',
                'virtual': 'Virtual'
            };
            const typeLabel = typeMap[w.warehouse_type] || w.warehouse_type || 'Standart';
            return `
            <tr>
                <td class="mono">${w.code || '—'}</td>
                <td><strong>${w.name || '—'}</strong></td>
                <td>${typeLabel}</td>
                <td>${w.is_active ? '<span class="gf1c-badge success">Aktiv</span>' : '<span class="gf1c-badge danger">Deaktiv</span>'}</td>
            </tr>
        `}).join('');
        return `<table class="gf1c-table">
            <thead><tr><th>KOD</th><th>ANBAR ADI</th><th>NÖVÜ</th><th>STATUS</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    }

    /* ══════════════════════════════════════════════
       PRODUCT GROUPS — Məhsul Qrupları (Kateqoriyalar)
       ══════════════════════════════════════════════ */
    async function loadProductGroups(page = state.productGroups.page) {
        const wrap = document.getElementById('gf1c-productgroups-table');
        if (!wrap) return;
        state.productGroups.page = page;
        wrap.innerHTML = loadingHtml('Məhsul qrupları yüklənir...');
        try {
            const res = await getProductGroups(page, state.productGroups.search);
            const items = res.data || res.results || res.items || [];
            const total = res.total || res.count || items.length;
            state.productGroups.data = items;
            state.productGroups.total = total;
            state.productGroups.pages = Math.ceil(total / PAGE_SIZE) || 1;
            setStatus('online');
            wrap.innerHTML = buildProductGroupsTable(items);
            renderPagination('gf1c-productgroups-pag', state.productGroups, 'productGroups');
        } catch (e) {
            setStatus('offline');
            wrap.innerHTML = errorHtml(e.message);
            toast(`Məhsul qrupları yüklənmədi: ${e.message}`, 'error');
        }
    }

    function buildProductGroupsTable(data) {
        if (!data || !data.length) return emptyHtml('📁', 'Məhsul qrupu tapılmadı', 'Sinxronizasiya edin');

        // Ağac görünüşü üçün parent-child əlaqəsini qur
        const groupsById = {};
        data.forEach(g => { groupsById[g.onec_guid] = { ...g, children: [] }; });

        const rootGroups = [];
        data.forEach(g => {
            if (g.parent_guid && groupsById[g.parent_guid]) {
                groupsById[g.parent_guid].children.push(groupsById[g.onec_guid]);
            } else {
                rootGroups.push(groupsById[g.onec_guid]);
            }
        });

        function renderTree(groups, level = 0) {
            let html = '';
            groups.forEach(g => {
                const indent = '—'.repeat(level) + (level > 0 ? ' ' : '');
                html += `
                    <tr>
                        <td class="mono">${g.code || '—'}</td>
                        <td><strong>${indent}${g.name || '—'}</strong></td>
                        <td>${g.parent_guid ? 'Alt qrup' : 'Ana qrup'}</td>
                        <td style="color:var(--text-secondary);font-size:12px">${g.onec_guid || '—'}</td>
                    </tr>
                `;
                if (g.children && g.children.length) {
                    html += renderTree(g.children, level + 1);
                }
            });
            return html;
        }

        return `<table class="gf1c-table">
            <thead><tr><th>KOD</th><th>QRUP ADI</th><th>NÖV</th><th>GUID</th></td></thead>
            <tbody>${renderTree(rootGroups)}</tbody>
        </table>`;
    }

    async function loadProductGroupsTree() {
        try {
            const res = await apiFetch('/product-groups/tree');
            if (res.data && res.data.length) {
                const wrap = document.getElementById('gf1c-productgroups-table');
                if (wrap) {
                    wrap.innerHTML = buildProductGroupsTreeTable(res.data);
                }
            }
        } catch (e) {
            console.error('Tree yüklənmədi:', e);
        }
    }

    function buildProductGroupsTreeTable(data) {
        if (!data || !data.length) return emptyHtml('📁', 'Məhsul qrupu tapılmadı', '');

        function renderHierarchy(items, level = 0) {
            let html = '';
            items.forEach(item => {
                const indent = ' '.repeat(level * 2);
                const prefix = level === 0 ? '📁 ' : '📂 ';
                html += `
                    <tr>
                        <td class="mono">${item.code || '—'}</td>
                        <td>${indent}${prefix}${item.name || '—'}</td>
                        <td>${level === 0 ? 'Ana qrup' : `Alt qrup (${level}. səviyyə)`}</td>
                    </tr>
                `;
            });
            return html;
        }

        return `<table class="gf1c-table">
            <thead><tr><th>KOD</th><th>QRUP ADI (Ağac)</th><th>SƏVİYYƏ</th></tr></thead>
            <tbody>${renderHierarchy(data)}</tbody>
        </table>`;
    }



    /* ══════════════════════════════════════════════
       UNITS OF MEASURE — Ölçü Vahidləri
       ══════════════════════════════════════════════ */
    async function loadUnitsOfMeasure(page = state.unitsOfMeasure.page) {
        const wrap = document.getElementById('gf1c-unitsofmeasure-table');
        if (!wrap) return;
        state.unitsOfMeasure.page = page;
        wrap.innerHTML = loadingHtml('Ölçü vahidləri yüklənir...');
        try {
            const res = await getUnitsOfMeasure(page, state.unitsOfMeasure.search);
            const items = res.data || res.results || res.items || [];
            const total = res.total || res.count || items.length;
            state.unitsOfMeasure.data = items;
            state.unitsOfMeasure.total = total;
            state.unitsOfMeasure.pages = Math.ceil(total / PAGE_SIZE) || 1;
            setStatus('online');
            wrap.innerHTML = buildUnitsOfMeasureTable(items);
            renderPagination('gf1c-unitsofmeasure-pag', state.unitsOfMeasure, 'unitsOfMeasure');
        } catch (e) {
            setStatus('offline');
            wrap.innerHTML = errorHtml(e.message);
            toast(`Ölçü vahidləri yüklənmədi: ${e.message}`, 'error');
        }
    }

    function buildUnitsOfMeasureTable(data) {
        if (!data || !data.length) return emptyHtml('📏', 'Ölçü vahidi tapılmadı', 'Sinxronizasiya edin');
        const rows = data.map(u => `
            <tr>
                <td class="mono">${u.code || '—'}</td>
                <td><strong>${u.name || '—'}</strong></td>
                <td>${u.international_code || '—'}</td>
                <td style="color:var(--text-secondary);font-size:12px">${u.onec_guid || '—'}</td>
            </tr>
        `).join('');
        return `<table class="gf1c-table">
            <thead><tr><th>KOD</th><th>VAHİD ADI</th><th>BEYNƏLXALQ KOD</th><th>GUID</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    }


    /* ── STATS ──────────────────────────────────── */
    function updateOverviewStats() {
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.style.opacity = '0';
            setTimeout(() => { el.textContent = Number(val).toLocaleString('az-AZ'); el.style.transition='opacity 0.4s'; el.style.opacity='1'; }, 100);
        };
        set('gf1c-stat-products',  state.stats.products);
        set('gf1c-stat-customers', state.stats.customers);
        set('gf1c-stat-orders',    state.stats.orders);
        set('gf1c-stat-bazalar',   state.stats.bazalar);
    }

    /* ══════════════════════════════════════════════
       PRODUCTS
    ══════════════════════════════════════════════ */
    async function loadProducts(page = state.products.page) {
        const wrap = document.getElementById('gf1c-products-table');
        if (!wrap) return;
        state.products.page = page;
        wrap.innerHTML = loadingHtml('Məhsullar yüklənir...');
        try {
            const res   = await getProducts(page, state.products.search);
            const items = res.data || res.results || res.items || [];
            const total = res.total || res.count || items.length;
            state.products.data  = items;
            state.products.total = total;
            state.products.pages = Math.ceil(total / PAGE_SIZE) || 1;
            state.stats.products = total;
            updateOverviewStats();
            setStatus('online');
            wrap.innerHTML = buildProductsTable(items);
            renderPagination('gf1c-products-pag', state.products, 'products');
            setupTableSort('gf1c-products-table', 'products');
        } catch (e) {
            setStatus('offline');
            wrap.innerHTML = errorHtml(e.message);
            toast(`Məhsullar yüklənmədi: ${e.message}`, 'error');
        }
    }

    function buildProductsTable(data) {
        if (!data || !data.length) return emptyHtml('📦', 'Məhsul tapılmadı', 'Sinxronizasiya edin');
        const rows = data.map(p => {
            const price = Number(p.price || 0).toLocaleString('az-AZ', {minimumFractionDigits:2});
            const stock = p.stock_qty ?? p.stock ?? '—';
            const sb = stock !== '—' ? (Number(stock)>10?`<span class="gf1c-badge success">${stock}</span>`:Number(stock)>0?`<span class="gf1c-badge warning">${stock}</span>`:`<span class="gf1c-badge danger">Yoxdur</span>`) : `<span class="gf1c-badge info">—</span>`;
            return `<tr>
                <td class="mono">${p.code||'—'}</td>
                <td><strong style="color:var(--text-primary)">${p.name||'—'}</strong></td>
                <td style="color:var(--text-secondary)">${p.category||'—'}</td>
                <td class="gf1c-price">${price} ₼</td>
                <td>${p.unit||'—'}</td>
                <td>${sb}</td>
                <td><button class="gf1c-btn gf1c-btn-ghost gf1c-btn-sm" onclick="GF1C.openProduct(${p.id})"><i class="fa-solid fa-eye"></i></button></td>
            </tr>`;
        }).join('');
        return `<table class="gf1c-table">
            <thead><tr>
                <th data-sort="code">KOD</th><th data-sort="name">AD</th>
                <th>KATEQORİYA</th><th data-sort="price">QİYMƏT</th>
                <th>VAHİD</th><th data-sort="stock_qty">STOK</th><th></th>
            </tr></thead><tbody>${rows}</tbody></table>`;
    }

    /* ══════════════════════════════════════════════
       CUSTOMERS
    ══════════════════════════════════════════════ */
    async function loadCustomers(page = state.customers.page) {
        const wrap = document.getElementById('gf1c-customers-table');
        if (!wrap) return;
        state.customers.page = page;
        wrap.innerHTML = loadingHtml('Müştərilər yüklənir...');
        try {
            const res   = await getCustomers(page, state.customers.search);
            const items = res.data || res.results || res.items || [];
            const total = res.total || res.count || items.length;
            state.customers.data  = items;
            state.customers.total = total;
            state.customers.pages = Math.ceil(total / PAGE_SIZE) || 1;
            state.stats.customers = total;
            updateOverviewStats();
            setStatus('online');
            wrap.innerHTML = buildCustomersTable(items);
            renderPagination('gf1c-customers-pag', state.customers, 'customers');
        } catch (e) {
            setStatus('offline');
            wrap.innerHTML = errorHtml(e.message);
            toast(`Müştərilər yüklənmədi: ${e.message}`, 'error');
        }
    }

    function buildCustomersTable(data) {
        if (!data || !data.length) return emptyHtml('👥', 'Müştəri tapılmadı', '1C sinxronizasiyasını yoxlayın');
        const rows = data.map(c => {
            const name     = c.name || '—';
            const initials = name.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
            const typeLbl  = (c.customer_type||'').toLowerCase().includes('legal') ? `<span class="gf1c-badge purple">Hüquqi</span>` : `<span class="gf1c-badge info">Fiziki</span>`;
            return `<tr>
                <td><div style="display:flex;align-items:center;gap:10px"><div class="gf1c-avatar">${initials}</div><strong style="color:var(--text-primary)">${name}</strong></div></td>
                <td class="mono">${c.inn||c.code||'—'}</td>
                <td>${typeLbl}</td>
                <td style="color:var(--text-secondary)">${c.phone||'—'}</td>
                <td style="color:var(--text-secondary)">${c.email||'—'}</td>
                <td style="color:var(--text-secondary);font-size:12px">${(c.legal_address||c.actual_address||'—').substring(0,30)}</td>
                <td><button class="gf1c-btn gf1c-btn-ghost gf1c-btn-sm" onclick="GF1C.openCustomerDetail(${c.id})"><i class="fa-solid fa-eye"></i></button></td>
            </tr>`;
        }).join('');
        return `<table class="gf1c-table">
            <thead><tr>
                <th>AD-SOYAD</th><th>VÖEN / KOD</th><th>NÖV</th>
                <th>TELEFON</th><th>EMAIL</th><th>ÜNVAN</th><th></th>
            </tr></thead><tbody>${rows}</tbody></table>`;
    }

    /* ══════════════════════════════════════════════
       ORDERS — SİFARİŞLƏR
    ══════════════════════════════════════════════ */
    async function loadOrders(page = state.orders.page) {
        const wrap = document.getElementById('gf1c-orders-table');
        if (!wrap) return;
        state.orders.page = page;
        wrap.innerHTML = loadingHtml('Sifarişlər yüklənir...');
        try {
            const res   = await getOrders(page, state.orders.search, state.orders.statusFilter);
            const items = res.data || res.results || res.items || [];
            const total = res.total || res.count || items.length;
            state.orders.data  = items;
            state.orders.total = total;
            state.orders.pages = Math.ceil(total / PAGE_SIZE) || 1;
            state.stats.orders = total;
            updateOverviewStats();
            setStatus('online');
            wrap.innerHTML = buildOrdersTable(items);
            renderPagination('gf1c-orders-pag', state.orders, 'orders');
        } catch (e) {
            setStatus('offline');
            wrap.innerHTML = errorHtml(e.message);
            toast(`Sifarişlər yüklənmədi: ${e.message}`, 'error');
        }
    }

    function buildOrdersTable(data) {
        if (!data || !data.length) return emptyHtml('📋', 'Sifariş tapılmadı', '1C sinxronizasiyasını yoxlayın');

        const statusMap = {
            'new':'Yeni','confirmed':'Təsdiqləndi','processing':'İcradadır',
            'shipped':'Göndərildi','delivered':'Çatdırıldı',
            'cancelled':'Ləğv edildi','completed':'Tamamlandı'
        };
        const statusColor = {
            'new':'info','confirmed':'success','processing':'warning',
            'shipped':'purple','delivered':'success',
            'cancelled':'danger','completed':'success'
        };
        const payMap = { 'unpaid':'Ödənilməyib','partial':'Qismən','paid':'Ödənilib','overdue':'Gecikmiş' };
        const payColor = { 'unpaid':'danger','partial':'warning','paid':'success','overdue':'danger' };

        const rows = data.map(o => {
            const amount  = Number(o.total_amount||0).toLocaleString('az-AZ',{minimumFractionDigits:2});
            const date    = o.order_date ? new Date(o.order_date).toLocaleDateString('az-AZ') : '—';
            const st      = o.status || 'new';
            const pst     = o.payment_status || 'unpaid';
            return `<tr>
                <td class="mono">${o.order_number||o.id||'—'}</td>
                <td style="color:var(--text-secondary)">${date}</td>
                <td class="gf1c-price">${amount} ₼</td>
                <td><span class="gf1c-badge ${statusColor[st]||'info'}">${statusMap[st]||st}</span></td>
                <td><span class="gf1c-badge ${payColor[pst]||'info'}">${payMap[pst]||pst}</span></td>
                <td><button class="gf1c-btn gf1c-btn-ghost gf1c-btn-sm" onclick="GF1C.openOrderDetail(${o.id})"><i class="fa-solid fa-eye"></i></button></td>
            </tr>`;
        }).join('');

        return `<table class="gf1c-table">
            <thead><tr>
                <th>№ SİFARİŞ</th><th>TARİX</th><th>MƏBLƏĞ</th>
                <th>STATUS</th><th>ÖDƏNİŞ</th><th></th>
            </tr></thead><tbody>${rows}</tbody></table>`;
    }

    /* ══════════════════════════════════════════════
       BAZALAR
    ══════════════════════════════════════════════ */
    async function loadBazalar() {
        const grid = document.getElementById('gf1c-bazalar-grid');
        if (!grid) return;
        grid.innerHTML = `<div style="grid-column:1/-1" class="gf1c-empty"><div class="gf1c-spinner"></div></div>`;
        try {
            const res   = await getBazalar();
            const items = res.bazalar || res.data || res || [];
            state.bazalar = items;
            state.stats.bazalar = items.length;
            updateOverviewStats();
            if (!items.length) { grid.innerHTML = `<div style="grid-column:1/-1">${emptyHtml('🗄️','Baza tapılmadı','')}</div>`; return; }
            grid.innerHTML = items.map((b,i) => {
                const bname = b.name||b.baza||`Baza ${i+1}`;
                const bcode = b.code||b.id||'—';
                const btype = b.type||'Fayl';
                const bst   = b.active!==false ? 'success':'danger';
                return `<div class="gf1c-baza-card" onclick="GF1C.selectBaza('${bcode}',this)">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                        <div style="font-size:24px">🗄️</div>
                        <span class="gf1c-badge ${bst}">${b.active!==false?'Aktiv':'Deaktiv'}</span>
                    </div>
                    <div class="gf1c-baza-name">${bname}</div>
                    <div class="gf1c-baza-meta" style="margin-top:4px">KOD: ${bcode}</div>
                    <div class="gf1c-baza-meta">NÖV: ${btype}</div>
                    <div style="margin-top:14px">
                        <button class="gf1c-btn gf1c-btn-primary gf1c-btn-sm" onclick="event.stopPropagation();GF1C.syncBaza('${bcode}')">
                            <i class="fa-solid fa-rotate"></i> Sinxronizasiya
                        </button>
                    </div>
                </div>`;
            }).join('');
        } catch (e) {
            grid.innerHTML = `<div style="grid-column:1/-1">${errorHtml(e.message)}</div>`;
            toast(`Bazalar yüklənmədi: ${e.message}`,'error');
        }
    }

    /* ══════════════════════════════════════════════
       SYNC
    ══════════════════════════════════════════════ */
    function addLog(msg, type='info') {
        state.syncLog.unshift({msg, type, time: new Date()});
        if (state.syncLog.length > 100) state.syncLog.pop();
        renderSyncLog();
    }

    function renderSyncLog() {
        const el = document.getElementById('gf1c-sync-log');
        if (!el) return;
        if (!state.syncLog.length) { el.innerHTML = emptyHtml('📋','Sinxronizasiya loqu boşdur',''); return; }
        el.innerHTML = state.syncLog.map(l => {
            const t = l.time.toLocaleTimeString('az-AZ');
            return `<div class="gf1c-log-item"><div class="gf1c-log-dot ${l.type}"></div><div class="gf1c-log-msg">${l.msg}</div><div class="gf1c-log-time">${t}</div></div>`;
        }).join('');
    }

    async function doSync() {
        const btn = document.getElementById('gf1c-sync-btn');
        if (!btn) return;
        btn.disabled = true;
        btn.innerHTML = `<span class="gf1c-spinner" style="width:16px;height:16px;border-width:2px"></span> Sinxronizasiya...`;
        setStatus('loading');
        addLog('Sinxronizasiya başladı...', 'info');
        try {
            const res = await syncCompany({});
            const d = res.data || {};
            addLog(`✅ Tamamlandı — Məhsul: ${d.products?.total||0}, Müştəri: ${d.customers?.total||0}`, 'success');
            toast('1C sinxronizasiyası uğurlu!', 'success');
            setStatus('online');
            await loadProducts(1);
            await loadCustomers(1);
            if (state.activePanel === 'orders') await loadOrders(1);
        } catch (e) {
            addLog(`❌ Sinxronizasiya xətası: ${e.message}`, 'error');
            toast(`Sinxronizasiya xətası: ${e.message}`, 'error');
            setStatus('offline');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-rotate"></i> 1C Sinxronizasiya`;
        }
    }

    /* ══════════════════════════════════════════════
       DETAIL MODALS
    ══════════════════════════════════════════════ */
    async function openProduct(id) {
        showModal('📦 Məhsul', loadingHtml('Yüklənir...'));
        try {
            const p = await getProduct(id);
            const fields = [
                ['Kod', p.code], ['Ad', p.name], ['Kateqoriya', p.category],
                ['Qiymət', `${Number(p.price||0).toLocaleString('az-AZ',{minimumFractionDigits:2})} ₼`],
                ['Stok', p.stock_qty??'—'], ['Vahid', p.unit],
                ['Alış qiyməti', p.purchase_price ? `${Number(p.purchase_price).toLocaleString('az-AZ',{minimumFractionDigits:2})} ₼` : '—'],
                ['Topdansatış', p.wholesale_price ? `${Number(p.wholesale_price).toLocaleString('az-AZ',{minimumFractionDigits:2})} ₼` : '—'],
                ['Status', p.is_active ? '✅ Aktiv' : '❌ Deaktiv'],
                ['GUID', p.onec_guid], ['Yenilənib', p.updated_at ? new Date(p.updated_at).toLocaleString('az-AZ') : '—'],
            ];
            updateModal(`📦 ${p.name||'Məhsul'}`, detailGrid(fields));
        } catch (e) { updateModal('Xəta', errorHtml(e.message)); }
    }

    async function openCustomerDetail(id) {
        showModal('👤 Müştəri', loadingHtml('Yüklənir...'));
        try {
            const c = await getCustomer(id);
            const fields = [
                ['Ad', c.name], ['VÖEN/Kod', c.inn||c.code],
                ['Növ', c.customer_type||'—'], ['Telefon', c.phone],
                ['Email', c.email], ['Hüquqi ünvan', c.legal_address],
                ['Faktiki ünvan', c.actual_address], ['Kredit limiti', c.credit_limit ? `${Number(c.credit_limit).toLocaleString('az-AZ',{minimumFractionDigits:2})} ₼` : '—'],
                ['Ödəniş müddəti', c.payment_deadline_days ? `${c.payment_deadline_days} gün` : '—'],
                ['Bank', c.bank_name], ['Hesab №', c.bank_account],
                ['GUID', c.onec_guid],
            ];
            updateModal(`👤 ${c.name||'Müştəri'}`, detailGrid(fields));
        } catch (e) { updateModal('Xəta', errorHtml(e.message)); }
    }

    async function openOrderDetail(id) {
        showModal('📋 Sifariş', loadingHtml('Yüklənir...'));
        try {
            const o = await getOrder(id);
            const fields = [
                ['Sifariş №', o.order_number], ['Tarix', o.order_date ? new Date(o.order_date).toLocaleDateString('az-AZ') : '—'],
                ['Cəmi məbləğ', `${Number(o.total_amount||0).toLocaleString('az-AZ',{minimumFractionDigits:2})} ₼`],
                ['Endirim', `${Number(o.discount_amount||0).toLocaleString('az-AZ',{minimumFractionDigits:2})} ₼`],
                ['Vergi', `${Number(o.tax_amount||0).toLocaleString('az-AZ',{minimumFractionDigits:2})} ₼`],
                ['Ödənilən', `${Number(o.paid_amount||0).toLocaleString('az-AZ',{minimumFractionDigits:2})} ₼`],
                ['Qalıq borc', `${Number(o.remaining_amount||0).toLocaleString('az-AZ',{minimumFractionDigits:2})} ₼`],
                ['Status', o.status], ['Ödəniş statusu', o.payment_status],
                ['Valyuta', o.currency||'AZN'],
                ['Çatdırılma ünvanı', o.shipping_address],
                ['Qeyd', o.note], ['GUID', o.onec_guid],
            ];
            updateModal(`📋 Sifariş ${o.order_number||''}`, detailGrid(fields));
        } catch (e) { updateModal('Xəta', errorHtml(e.message)); }
    }

    function detailGrid(fields) {
        return `<div class="gf1c-detail-grid">${
            fields.filter(([,v]) => v!=null && v!=='' && v!=='—').map(([l,v]) =>
                `<div class="gf1c-detail-field"><label>${l}</label><div class="value">${v||'—'}</div></div>`
            ).join('')
        }</div>`;
    }

    function showModal(title, body) {
        closeModal();
        const ov = document.createElement('div');
        ov.className = 'gf1c-modal-overlay'; ov.id = 'gf1c-detail-modal';
        ov.innerHTML = `<div class="gf1c-modal">
            <div class="gf1c-modal-header">
                <div class="gf1c-modal-title">${title}</div>
                <button class="gf1c-modal-close" onclick="GF1C.closeModal()">✕</button>
            </div>
            <div class="gf1c-modal-body" id="gf1c-modal-body">${body}</div>
        </div>`;
        ov.addEventListener('click', e => { if (e.target === ov) closeModal(); });
        document.getElementById('gf-1c-overlay').appendChild(ov);
    }

    function updateModal(title, body) {
        const t = document.querySelector('#gf1c-detail-modal .gf1c-modal-title');
        const b = document.getElementById('gf1c-modal-body');
        if (t) t.textContent = title;
        if (b) b.innerHTML = body;
    }

    function closeModal() {
        const m = document.getElementById('gf1c-detail-modal');
        if (m) m.remove();
    }

    /* ══════════════════════════════════════════════
       PAGINATION
    ══════════════════════════════════════════════ */
    function renderPagination(elId, s, key) {
        const el = document.getElementById(elId);
        if (!el) return;
        const { page, pages, total } = s;
        if (pages <= 1) { el.innerHTML = ''; return; }
        const start = (page-1)*PAGE_SIZE+1;
        const end   = Math.min(page*PAGE_SIZE, total);
        let btns = '';
        const range = [];
        for (let i=Math.max(1,page-2); i<=Math.min(pages,page+2); i++) range.push(i);
        if (range[0]>1) btns += `<button class="gf1c-page-btn" onclick="GF1C.goPage('${key}',1)">1</button>`;
        if (range[0]>2) btns += `<span class="gf1c-page-btn" style="cursor:default">…</span>`;
        range.forEach(n => { btns += `<button class="gf1c-page-btn ${n===page?'active':''}" onclick="GF1C.goPage('${key}',${n})">${n}</button>`; });
        if (range[range.length-1]<pages-1) btns += `<span class="gf1c-page-btn" style="cursor:default">…</span>`;
        if (range[range.length-1]<pages)   btns += `<button class="gf1c-page-btn" onclick="GF1C.goPage('${key}',${pages})">${pages}</button>`;
        el.innerHTML = `<div class="gf1c-pagination">
            <div class="gf1c-pagination-info">${start}–${end} / ${total.toLocaleString()} nəticə</div>
            <div class="gf1c-pagination-btns">
                <button class="gf1c-page-btn" onclick="GF1C.goPage('${key}',${page-1})" ${page<=1?'disabled':''}>‹</button>
                ${btns}
                <button class="gf1c-page-btn" onclick="GF1C.goPage('${key}',${page+1})" ${page>=pages?'disabled':''}>›</button>
            </div>
        </div>`;
    }

    function goPage(key, page) {
        const s = state[key];
        if (!s) return;
        page = Math.max(1, Math.min(page, s.pages));

        // Mövcud panellər
        if (key === 'products') loadProducts(page);
        if (key === 'customers') loadCustomers(page);
        if (key === 'orders') loadOrders(page);

        // ✅ YENİ PANELLƏR
        if (key === 'bankAccounts') loadBankAccounts(page);
        if (key === 'cashDesks') loadCashDesks(page);
        if (key === 'warehouses') loadWarehouses(page);
        if (key === 'unitsOfMeasure') loadUnitsOfMeasure(page);
        if (key === 'productGroups') loadProductGroups(page);
    }

    /* ── TABLE SORT ─────────────────────────────── */
    function setupTableSort(containerId, stateKey) {
        const wrap = document.getElementById(containerId);
        if (!wrap) return;
        wrap.querySelectorAll('th[data-sort]').forEach(th => {
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => {
                const col = th.dataset.sort;
                const s = state[stateKey];
                if (s.sort===col) s.dir = s.dir==='asc'?'desc':'asc';
                else { s.sort=col; s.dir='asc'; }
                s.data.sort((a,b) => {
                    let av=a[col]??'', bv=b[col]??'';
                    if (typeof av==='number') return s.dir==='asc'?av-bv:bv-av;
                    return s.dir==='asc'?String(av).localeCompare(String(bv),'az'):String(bv).localeCompare(String(av),'az');
                });
                const tbody = wrap.querySelector('tbody');
                if (tbody && stateKey==='products') tbody.innerHTML = buildProductsTable(s.data).match(/<tbody>([\s\S]*)<\/tbody>/)?.[1]||'';
            });
        });
    }

    /* ── BAZA ACTIONS ───────────────────────────── */
    function selectBaza(code, el) {
        document.querySelectorAll('.gf1c-baza-card').forEach(c=>c.classList.remove('selected'));
        if (el) el.classList.add('selected');
        toast(`Baza seçildi: ${code}`, 'info');
    }

    async function syncBaza(code) {
        toast(`Baza sinxronizasiyası: ${code}`, 'info');
        addLog(`Baza sinxronizasiyası başladı: ${code}`, 'info');
        try {
            await syncCompany({baza: code});
            addLog(`✅ Baza ${code} sinxronizasiyası tamamlandı`, 'success');
            toast(`Baza ${code} uğurlu!`, 'success');
        } catch (e) {
            addLog(`❌ Baza xətası (${code}): ${e.message}`, 'error');
            toast(`Xəta: ${e.message}`, 'error');
        }
    }

    /* ── SEARCH ─────────────────────────────────── */
    let searchTimers = {};
    function onSearch(key, val) {
        clearTimeout(searchTimers[key]);
        searchTimers[key] = setTimeout(() => {
            if (state[key]) {
                state[key].search = val;
                state[key].page = 1;
            }

            // Mövcud panellər
            if (key === 'products') loadProducts(1);
            if (key === 'customers') loadCustomers(1);
            if (key === 'orders') loadOrders(1);

            // ✅ YENİ PANELLƏR
            if (key === 'bankAccounts') loadBankAccounts(1);
            if (key === 'cashDesks') loadCashDesks(1);
            if (key === 'warehouses') loadWarehouses(1);
            if (key === 'unitsOfMeasure') loadUnitsOfMeasure(1);
            if (key === 'productGroups') loadProductGroups(1);
        }, 400);
    }

    function onOrderStatusFilter(val) {
        state.orders.statusFilter = val;
        state.orders.page = 1;
        loadOrders(1);
    }

    /* ── HELPERS ────────────────────────────────── */
    function loadingHtml(msg='Yüklənir...') {
        return `<div class="gf1c-empty"><div class="gf1c-spinner"></div><div class="gf1c-empty-sub" style="margin-top:12px">${msg}</div></div>`;
    }
    function errorHtml(msg) {
        return `<div class="gf1c-empty"><div class="gf1c-empty-icon">⚠️</div><div class="gf1c-empty-text">Məlumat yüklənmədi</div><div class="gf1c-empty-sub">${msg}</div></div>`;
    }
    function emptyHtml(icon, title, sub) {
        return `<div class="gf1c-empty"><div class="gf1c-empty-icon">${icon}</div><div class="gf1c-empty-text">${title}</div>${sub?`<div class="gf1c-empty-sub">${sub}</div>`:''}</div>`;
    }

    function closeOverlay() {
        const el = document.getElementById('gf-1c-overlay');
        if (el) { el.style.opacity='0'; el.style.transform='translateY(-10px)'; el.style.transition='all 0.3s ease'; setTimeout(()=>el.remove(),300); }
    }

    function clearLog() { state.syncLog=[]; renderSyncLog(); }

    /* ── INITIAL LOAD ───────────────────────────── */
    async function initialLoad() {
        setStatus('loading');
        addLog('1C Bridge API-yə qoşulur...', 'info');
        try {
            await loadProducts(1);
            addLog(`✅ ${state.stats.products} məhsul yükləndi`, 'success');
        } catch (e) {
            addLog(`❌ Yükləmə xətası: ${e.message}`, 'error');
        }
    }


    /* ── RENDER HTML (DÜZƏLDİLMİŞ VERSİYA) ─────────────────────────────── */
    function render() {
        if (document.getElementById('gf-1c-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'gf-1c-overlay';
        overlay.innerHTML = `
        <div id="gf1c-toasts"></div>
    
        <!-- TOP BAR -->
        <div class="gf1c-topbar">
            <div class="gf1c-logo">
                <div class="gf1c-logo-badge">GF44</div>
                <div class="gf1c-logo-text">
                    <div class="gf1c-logo-title">1C Bridge</div>
                    <div class="gf1c-logo-sub">Güvən Finans · Data Mərkəzi</div>
                </div>
            </div>
            <div class="gf1c-topbar-actions">
                <div id="gf1c-connection-status" class="gf1c-status-pill loading"><span class="gf1c-status-dot"></span>YÜKLƏNIR...</div>
                <button class="gf1c-btn gf1c-btn-primary" id="gf1c-sync-btn" onclick="GF1C.doSync()">
                    <i class="fa-solid fa-rotate"></i> 1C Sinxronizasiya
                </button>
                <button class="gf1c-btn gf1c-btn-danger" onclick="GF1C.closeOverlay()">
                    <i class="fa-solid fa-times"></i> Bağla
                </button>
            </div>
        </div>
    
        <!-- LAYOUT -->
        <div class="gf1c-layout">
            <!-- SIDEBAR -->
            <div class="gf1c-sidebar">
                <div class="gf1c-sidebar-section">İcmal</div>
                <div class="gf1c-nav-item active" data-panel="overview" onclick="GF1C.switchPanel('overview')">
                    <span class="icon"><i class="fa-solid fa-gauge-high"></i></span> Əsas Panel
                </div>
                <div class="gf1c-sidebar-section">Məlumat</div>
                <div class="gf1c-nav-item" data-panel="products" onclick="GF1C.switchPanel('products')">
                    <span class="icon"><i class="fa-solid fa-box"></i></span> Məhsullar
                    <span class="gf1c-nav-badge" id="gf1c-nav-prod-count">—</span>
                </div>
                <div class="gf1c-nav-item" data-panel="customers" onclick="GF1C.switchPanel('customers')">
                    <span class="icon"><i class="fa-solid fa-users"></i></span> Müştərilər
                    <span class="gf1c-nav-badge" id="gf1c-nav-cust-count">—</span>
                </div>
                <div class="gf1c-nav-item" data-panel="orders" onclick="GF1C.switchPanel('orders')">
                    <span class="icon"><i class="fa-solid fa-file-invoice"></i></span> Sifarişlər
                    <span class="gf1c-nav-badge" id="gf1c-nav-ord-count">—</span>
                </div>
                
                <div class="gf1c-sidebar-section">Kataloqlar</div>
                <div class="gf1c-nav-item" data-panel="bank-accounts" onclick="GF1C.switchPanel('bank-accounts')">
                    <span class="icon"><i class="fa-solid fa-building-columns"></i></span> Bank Hesabları
                </div>
                <div class="gf1c-nav-item" data-panel="cash-desks" onclick="GF1C.switchPanel('cash-desks')">
                    <span class="icon"><i class="fa-solid fa-cash-register"></i></span> Kassalar
                </div>
                <div class="gf1c-nav-item" data-panel="warehouses" onclick="GF1C.switchPanel('warehouses')">
                    <span class="icon"><i class="fa-solid fa-warehouse"></i></span> Anbarlar
                </div>
                <div class="gf1c-nav-item" data-panel="units-of-measure" onclick="GF1C.switchPanel('units-of-measure')">
                    <span class="icon"><i class="fa-solid fa-ruler"></i></span> Ölçü Vahidləri
                </div>
                <div class="gf1c-nav-item" data-panel="product-groups" onclick="GF1C.switchPanel('product-groups')">
                    <span class="icon"><i class="fa-solid fa-tags"></i></span> Məhsul Qrupları
                </div>
                <div class="gf1c-nav-item" data-panel="bazalar" onclick="GF1C.switchPanel('bazalar')">
                    <span class="icon"><i class="fa-solid fa-database"></i></span> 1C Bazalar
                </div>
                <div class="gf1c-sidebar-section">Sistem</div>
                <div class="gf1c-nav-item" data-panel="sync" onclick="GF1C.switchPanel('sync')">
                    <span class="icon"><i class="fa-solid fa-rotate"></i></span> Sinx. Loqu
                </div>
            </div>
    
            <!-- CONTENT -->
            <div class="gf1c-content">
    
                <!-- OVERVIEW PANEL -->
                <div class="gf1c-panel active" id="gf1c-panel-overview">
                    <div class="gf1c-panel-header">
                        <div>
                            <div class="gf1c-panel-title">Xoş Gəldiniz, 1C Bridge</div>
                            <div class="gf1c-panel-subtitle">GÜVƏN FİNANS · ${new Date().toLocaleDateString('az-AZ',{day:'2-digit',month:'long',year:'numeric'})}</div>
                        </div>
                        <button class="gf1c-btn gf1c-btn-ghost" onclick="GF1C.switchPanel('products')">
                            <i class="fa-solid fa-arrow-right"></i> Məhsullara get
                        </button>
                    </div>
                    <div class="gf1c-stats-grid">
                        <div class="gf1c-stat-card blue">
                            <div class="gf1c-stat-icon"><i class="fa-solid fa-box"></i></div>
                            <div class="gf1c-stat-value" id="gf1c-stat-products">—</div>
                            <div class="gf1c-stat-label">Cəmi Məhsul</div>
                        </div>
                        <div class="gf1c-stat-card green">
                            <div class="gf1c-stat-icon"><i class="fa-solid fa-users"></i></div>
                            <div class="gf1c-stat-value" id="gf1c-stat-customers">—</div>
                            <div class="gf1c-stat-label">Cəmi Müştəri</div>
                        </div>
                        <div class="gf1c-stat-card amber">
                            <div class="gf1c-stat-icon"><i class="fa-solid fa-file-invoice"></i></div>
                            <div class="gf1c-stat-value" id="gf1c-stat-orders">—</div>
                            <div class="gf1c-stat-label">Cəmi Sifariş</div>
                        </div>
                        <div class="gf1c-stat-card purple">
                            <div class="gf1c-stat-icon"><i class="fa-solid fa-database"></i></div>
                            <div class="gf1c-stat-value" id="gf1c-stat-bazalar">—</div>
                            <div class="gf1c-stat-label">1C Bazası</div>
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:4px">
                        <div class="gf1c-table-wrap" style="cursor:pointer" onclick="GF1C.switchPanel('products')">
                            <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
                                <span style="font-weight:700;font-size:14px">Son Məhsullar</span>
                                <span style="font-size:10px;color:var(--accent)">HAMISI →</span>
                            </div>
                            <div id="gf1c-overview-products" style="min-height:120px"><div class="gf1c-empty"><div class="gf1c-spinner"></div></div></div>
                        </div>
                        <div class="gf1c-table-wrap" style="cursor:pointer" onclick="GF1C.switchPanel('orders')">
                            <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
                                <span style="font-weight:700;font-size:14px">Son Sifarişlər</span>
                                <span style="font-size:10px;color:var(--accent)">HAMISI →</span>
                            </div>
                            <div id="gf1c-overview-orders" style="min-height:120px"><div class="gf1c-empty"><div class="gf1c-spinner"></div></div></div>
                        </div>
                    </div>
                </div>
    
                <!-- BANK ACCOUNTS PANEL -->
                <div class="gf1c-panel" id="gf1c-panel-bank-accounts">
                    <div class="gf1c-panel-header">
                        <div><div class="gf1c-panel-title">🏦 Bank Hesabları</div><div class="gf1c-panel-subtitle">1C-DƏN SİNXRONİZASİYA EDİLMİŞ BANK HESABLARI</div></div>
                    </div>
                    <div class="gf1c-toolbar">
                        <div class="gf1c-search">
                            <i class="fa-solid fa-search gf1c-search-icon"></i>
                            <input type="text" placeholder="Hesab adı, bank adı axtar..." oninput="GF1C.onSearch('bankAccounts',this.value)">
                        </div>
                        <button class="gf1c-btn gf1c-btn-ghost" onclick="GF1C.loadBankAccounts(1)"><i class="fa-solid fa-rotate"></i> Yenilə</button>
                        <button class="gf1c-btn gf1c-btn-primary" onclick="GF1C.syncBankAccounts()"><i class="fa-solid fa-cloud-arrow-down"></i> Sync Et</button>
                    </div>
                    <div class="gf1c-table-wrap">
                        <div id="gf1c-bankaccounts-table"><div class="gf1c-empty"><div class="gf1c-spinner"></div></div></div>
                        <div id="gf1c-bankaccounts-pag"></div>
                    </div>
                </div>
    
                <!-- CASH DESKS PANEL -->
                <div class="gf1c-panel" id="gf1c-panel-cash-desks">
                    <div class="gf1c-panel-header">
                        <div><div class="gf1c-panel-title">💵 Kassalar</div><div class="gf1c-panel-subtitle">1C-DƏN SİNXRONİZASİYA EDİLMİŞ KASSALAR</div></div>
                    </div>
                    <div class="gf1c-toolbar">
                        <div class="gf1c-search">
                            <i class="fa-solid fa-search gf1c-search-icon"></i>
                            <input type="text" placeholder="Kassa adı axtar..." oninput="GF1C.onSearch('cashDesks',this.value)">
                        </div>
                        <button class="gf1c-btn gf1c-btn-ghost" onclick="GF1C.loadCashDesks(1)"><i class="fa-solid fa-rotate"></i> Yenilə</button>
                        <button class="gf1c-btn gf1c-btn-primary" onclick="GF1C.syncCashDesks()"><i class="fa-solid fa-cloud-arrow-down"></i> Sync Et</button>
                    </div>
                    <div class="gf1c-table-wrap">
                        <div id="gf1c-cashdesks-table"><div class="gf1c-empty"><div class="gf1c-spinner"></div></div></div>
                        <div id="gf1c-cashdesks-pag"></div>
                    </div>
                </div>
    
                <!-- WAREHOUSES PANEL -->
                <div class="gf1c-panel" id="gf1c-panel-warehouses">
                    <div class="gf1c-panel-header">
                        <div><div class="gf1c-panel-title">🏪 Anbarlar</div><div class="gf1c-panel-subtitle">1C-DƏN SİNXRONİZASİYA EDİLMİŞ ANBARLAR</div></div>
                    </div>
                    <div class="gf1c-toolbar">
                        <div class="gf1c-search">
                            <i class="fa-solid fa-search gf1c-search-icon"></i>
                            <input type="text" placeholder="Anbar adı axtar..." oninput="GF1C.onSearch('warehouses',this.value)">
                        </div>
                        <button class="gf1c-btn gf1c-btn-ghost" onclick="GF1C.loadWarehouses(1)"><i class="fa-solid fa-rotate"></i> Yenilə</button>
                        <button class="gf1c-btn gf1c-btn-primary" onclick="GF1C.syncWarehouses()"><i class="fa-solid fa-cloud-arrow-down"></i> Sync Et</button>
                    </div>
                    <div class="gf1c-table-wrap">
                        <div id="gf1c-warehouses-table"><div class="gf1c-empty"><div class="gf1c-spinner"></div></div></div>
                        <div id="gf1c-warehouses-pag"></div>
                    </div>
                </div>
    
                <!-- UNITS OF MEASURE PANEL -->
                <div class="gf1c-panel" id="gf1c-panel-units-of-measure">
                    <div class="gf1c-panel-header">
                        <div><div class="gf1c-panel-title">📏 Ölçü Vahidləri</div><div class="gf1c-panel-subtitle">1C-DƏN SİNXRONİZASİYA EDİLMİŞ ÖLÇÜ VAHİDLƏRİ</div></div>
                    </div>
                    <div class="gf1c-toolbar">
                        <div class="gf1c-search">
                            <i class="fa-solid fa-search gf1c-search-icon"></i>
                            <input type="text" placeholder="Vahid adı axtar..." oninput="GF1C.onSearch('unitsOfMeasure',this.value)">
                        </div>
                        <button class="gf1c-btn gf1c-btn-ghost" onclick="GF1C.loadUnitsOfMeasure(1)"><i class="fa-solid fa-rotate"></i> Yenilə</button>
                        <button class="gf1c-btn gf1c-btn-primary" onclick="GF1C.syncUnitsOfMeasure()"><i class="fa-solid fa-cloud-arrow-down"></i> Sync Et</button>
                    </div>
                    <div class="gf1c-table-wrap">
                        <div id="gf1c-unitsofmeasure-table"><div class="gf1c-empty"><div class="gf1c-spinner"></div></div></div>
                        <div id="gf1c-unitsofmeasure-pag"></div>
                    </div>
                </div>
    
                <!-- PRODUCT GROUPS PANEL -->
                <div class="gf1c-panel" id="gf1c-panel-product-groups">
                    <div class="gf1c-panel-header">
                        <div><div class="gf1c-panel-title">📁 Məhsul Qrupları</div><div class="gf1c-panel-subtitle">1C-DƏN SİNXRONİZASİYA EDİLMİŞ KATEQORİYALAR</div></div>
                    </div>
                    <div class="gf1c-toolbar">
                        <div class="gf1c-search">
                            <i class="fa-solid fa-search gf1c-search-icon"></i>
                            <input type="text" placeholder="Qrup adı axtar..." oninput="GF1C.onSearch('productGroups',this.value)">
                        </div>
                        <button class="gf1c-btn gf1c-btn-ghost" onclick="GF1C.loadProductGroups(1)"><i class="fa-solid fa-rotate"></i> Yenilə</button>
                        <button class="gf1c-btn gf1c-btn-primary" onclick="GF1C.syncProductGroups()"><i class="fa-solid fa-cloud-arrow-down"></i> Sync Et</button>
                    </div>
                    <div class="gf1c-table-wrap">
                        <div id="gf1c-productgroups-table"><div class="gf1c-empty"><div class="gf1c-spinner"></div></div></div>
                        <div id="gf1c-productgroups-pag"></div>
                    </div>
                </div>
    
                <!-- PRODUCTS PANEL -->
                <div class="gf1c-panel" id="gf1c-panel-products">
                    <div class="gf1c-panel-header">
                        <div><div class="gf1c-panel-title">📦 Məhsullar</div><div class="gf1c-panel-subtitle">1C-DƏN SİNXRONİZASİYA EDİLMİŞ MƏHSUL SİYAHISI</div></div>
                    </div>
                    <div class="gf1c-toolbar">
                        <div class="gf1c-search">
                            <i class="fa-solid fa-search gf1c-search-icon"></i>
                            <input type="text" placeholder="Məhsul adı, kodu axtar..." oninput="GF1C.onSearch('products',this.value)">
                        </div>
                        <button class="gf1c-btn gf1c-btn-ghost" onclick="GF1C.loadProducts(1)"><i class="fa-solid fa-rotate"></i> Yenilə</button>
                    </div>
                    <div class="gf1c-table-wrap">
                        <div id="gf1c-products-table"><div class="gf1c-empty"><div class="gf1c-spinner"></div></div></div>
                        <div id="gf1c-products-pag"></div>
                    </div>
                </div>
    
                <!-- CUSTOMERS PANEL -->
                <div class="gf1c-panel" id="gf1c-panel-customers">
                    <div class="gf1c-panel-header">
                        <div><div class="gf1c-panel-title">👥 Müştərilər</div><div class="gf1c-panel-subtitle">1C-DƏN SİNXRONİZASİYA EDİLMİŞ MÜŞTƏRİ SİYAHISI</div></div>
                    </div>
                    <div class="gf1c-toolbar">
                        <div class="gf1c-search">
                            <i class="fa-solid fa-search gf1c-search-icon"></i>
                            <input type="text" placeholder="Ad, VÖEN, kod axtar..." oninput="GF1C.onSearch('customers',this.value)">
                        </div>
                        <button class="gf1c-btn gf1c-btn-ghost" onclick="GF1C.loadCustomers(1)"><i class="fa-solid fa-rotate"></i> Yenilə</button>
                    </div>
                    <div class="gf1c-table-wrap">
                        <div id="gf1c-customers-table"><div class="gf1c-empty"><div class="gf1c-spinner"></div></div></div>
                        <div id="gf1c-customers-pag"></div>
                    </div>
                </div>
    
                <!-- ORDERS PANEL -->
                <div class="gf1c-panel" id="gf1c-panel-orders">
                    <div class="gf1c-panel-header">
                        <div><div class="gf1c-panel-title">📋 Sifarişlər</div><div class="gf1c-panel-subtitle">1C-DƏN SİNXRONİZASİYA EDİLMİŞ SİFARİŞ SİYAHISI</div></div>
                    </div>
                    <div class="gf1c-toolbar">
                        <div class="gf1c-search">
                            <i class="fa-solid fa-search gf1c-search-icon"></i>
                            <input type="text" placeholder="Sifariş № axtar..." oninput="GF1C.onSearch('orders',this.value)">
                        </div>
                        <select class="gf1c-select" onchange="GF1C.onOrderStatusFilter(this.value)">
                            <option value="">Bütün statuslar</option>
                            <option value="new">Yeni</option>
                            <option value="confirmed">Təsdiqləndi</option>
                            <option value="processing">İcradadır</option>
                            <option value="shipped">Göndərildi</option>
                            <option value="delivered">Çatdırıldı</option>
                            <option value="cancelled">Ləğv edildi</option>
                            <option value="completed">Tamamlandı</option>
                        </select>
                        <button class="gf1c-btn gf1c-btn-ghost" onclick="GF1C.loadOrders(1)"><i class="fa-solid fa-rotate"></i> Yenilə</button>
                    </div>
                    <div class="gf1c-table-wrap">
                        <div id="gf1c-orders-table"><div class="gf1c-empty"><div class="gf1c-spinner"></div></div></div>
                        <div id="gf1c-orders-pag"></div>
                    </div>
                </div>
    
                <!-- BAZALAR PANEL -->
                <div class="gf1c-panel" id="gf1c-panel-bazalar">
                    <div class="gf1c-panel-header">
                        <div><div class="gf1c-panel-title">🗄️ 1C Bazaları</div><div class="gf1c-panel-subtitle">MÖVCUD 1C BAZA SİYAHISI VƏ İDARƏETMƏ</div></div>
                        <button class="gf1c-btn gf1c-btn-ghost" onclick="GF1C.loadBazalar()"><i class="fa-solid fa-rotate"></i> Yenilə</button>
                    </div>
                    <div class="gf1c-baza-grid" id="gf1c-bazalar-grid">
                        <div style="grid-column:1/-1" class="gf1c-empty"><div class="gf1c-spinner"></div></div>
                    </div>
                </div>
    
                <!-- SYNC LOG PANEL -->
                <div class="gf1c-panel" id="gf1c-panel-sync">
                    <div class="gf1c-panel-header">
                        <div><div class="gf1c-panel-title">📋 Sinxronizasiya Loqu</div><div class="gf1c-panel-subtitle">SİSTEM HADİSƏLƏRİ VƏ XƏTA LOQLARI</div></div>
                        <div style="display:flex;gap:8px">
                            <button class="gf1c-btn gf1c-btn-primary" onclick="GF1C.doSync()"><i class="fa-solid fa-rotate"></i> Sinxronizasiya Et</button>
                            <button class="gf1c-btn gf1c-btn-ghost" onclick="GF1C.clearLog()"><i class="fa-solid fa-trash"></i> Təmizlə</button>
                        </div>
                    </div>
                    <div class="gf1c-log-list" id="gf1c-sync-log"></div>
                </div>
    
            </div><!-- /content -->
        </div><!-- /layout -->
        `;

        document.body.appendChild(overlay);

        initialLoad().then(async () => {
            const pc = document.getElementById('gf1c-nav-prod-count');
            const cc = document.getElementById('gf1c-nav-cust-count');
            if (pc) pc.textContent = state.stats.products || '—';

            const ov = document.getElementById('gf1c-overview-products');
            if (ov) {
                const data = state.products.data.slice(0,5);
                if (data.length) {
                    ov.innerHTML = data.map(p =>
                        `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 20px;border-bottom:1px solid var(--border)">
                            <span style="font-size:13px;color:var(--text-primary)">${p.name||'—'}</span>
                            <span class="gf1c-price" style="font-size:13px">${Number(p.price||0).toLocaleString('az-AZ',{minimumFractionDigits:2})} ₼</span>
                        </div>`
                    ).join('');
                } else {
                    ov.innerHTML = emptyHtml('','Məlumat yoxdur','');
                }
            }

            try {
                const ordRes  = await getOrders(1,'','',5);
                const ordData = ordRes.data||ordRes.results||[];
                state.stats.orders = ordRes.total||ordRes.count||ordData.length;
                updateOverviewStats();
                const oo = document.getElementById('gf1c-overview-orders');
                const oc = document.getElementById('gf1c-nav-ord-count');
                if (oc) oc.textContent = state.stats.orders || '—';
                if (oo && ordData.length) {
                    oo.innerHTML = ordData.map(o =>
                        `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 20px;border-bottom:1px solid var(--border)">
                            <span style="font-size:13px;color:var(--text-primary)">№ ${o.order_number||o.id||'—'}</span>
                            <span class="gf1c-price" style="font-size:13px">${Number(o.total_amount||0).toLocaleString('az-AZ',{minimumFractionDigits:2})} ₼</span>
                        </div>`
                    ).join('');
                } else if (oo) {
                    oo.innerHTML = emptyHtml('','Sifariş yoxdur','');
                }
            } catch(e) {
                const oo = document.getElementById('gf1c-overview-orders');
                if (oo) oo.innerHTML = `<div class="gf1c-empty" style="padding:24px"><div class="gf1c-empty-sub">Sifarişlər yüklənmədi</div></div>`;
            }
        });
    }

    /* ── PUBLIC API ─────────────────────────────── */
    global.GF1C = {
        open: render,
        closeOverlay,
        switchPanel,
        loadProducts, loadCustomers, loadOrders, loadBazalar,
        loadBankAccounts, loadCashDesks, loadWarehouses, loadUnitsOfMeasure, loadProductGroups,
        syncBankAccounts, syncCashDesks, syncWarehouses, syncUnitsOfMeasure, syncProductGroups,
        doSync,
        openProduct, openCustomerDetail, openOrderDetail,
        closeModal,
        // köhnə adlarla uyğunluq
        openCustomer: openCustomerDetail,
        closeDetailModal: closeModal,
        selectBaza, syncBaza,
        goPage, onSearch, onOrderStatusFilter,
        clearLog
    };

})(window);