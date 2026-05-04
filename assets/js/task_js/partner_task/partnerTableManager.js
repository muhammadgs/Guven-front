// partnerTableManager.js - OPTİMLƏŞDİRİLMİŞ VERSİYA
// ✅ Cache istifadə edir (getPartnerTasksWithCache)
// ❌ Dublikat sorğular yoxdur

const PartnerTableManager = {
    currentPage: 1,
    pageSize: 20,
    totalTasks: 0,
    totalPages: 1,
    tasks: [],
    filters: { status: '', priority: '', search: '' },
    lastWorkingEndpoint: '/partner-tasks/detailed',

    // ==================== TASK YÜKLƏMƏ (CACHE İLƏ) ====================
    loadTasks: async function (page = 1) {
        try {
            console.log(`🤝 Partner tasklar yüklənir (səhifə ${page})...`);
            this.showLoading();
            this.currentPage = page;

            const myCompanyId = window.taskManager?.userData?.companyId;

            // ✅ CACHE İSTİFADƏ ET
            let allTasks = [];

            if (window.getPartnerTasksWithCache) {
                const result = await window.getPartnerTasksWithCache();
                allTasks = Array.isArray(result) ? result : (result?.data || result?.items || []);
            } else {
                // Fallback: birbaşa API
                console.warn('⚠️ getPartnerTasksWithCache tapılmadı, birbaşa API istifadə olunur');
                const res = await makeApiRequest('/partner-tasks/detailed', 'GET');
                allTasks = Array.isArray(res) ? res : (res?.data || res?.items || []);
            }

            console.log(`✅ ${allTasks.length} partner task cache-dən`);

            // Filter tətbiq et
            let filtered = this._applyLocalFilters(allTasks);

            this.totalTasks  = filtered.length;
            this.totalPages  = Math.ceil(this.totalTasks / this.pageSize) || 1;

            // Pagination üçün kəs
            const start = (page - 1) * this.pageSize;
            const end   = start + this.pageSize;
            const pageTasks = filtered.slice(start, end);

            // Zənginləşdir
            const enriched = this.enrichPartnerTasks(pageTasks, myCompanyId);
            this.tasks = enriched;

            await this.renderTasks(enriched, page);
            this.updatePagination();
            this.updateTaskCount();
            this.hideLoading();

            // TaskManager pagination sinxronizasiya
            if (window.taskManager) {
                window.taskManager.pagination.partner = {
                    page: this.currentPage,
                    pageSize: this.pageSize,
                    total: this.totalTasks,
                    totalPages: this.totalPages,
                    hasMore: this.currentPage < this.totalPages
                };
                window.taskManager.updatePaginationUI?.('partner');
            }

            return { tasks: enriched, total: this.totalTasks };

        } catch (error) {
            console.error('❌ Partner tasklar xəta:', error);
            this.showEmptyTable();
            this.hideLoading();
            return { tasks: [], total: 0 };
        }
    },

    // Lokal filter
    _applyLocalFilters: function (tasks) {
        let filtered = [...tasks];
        if (this.filters.status)   filtered = filtered.filter(t => t.status === this.filters.status);
        if (this.filters.priority) filtered = filtered.filter(t => t.priority === this.filters.priority);
        if (this.filters.search) {
            const s = this.filters.search.toLowerCase();
            filtered = filtered.filter(t =>
                [t.task_title, t.task_description, t.partner_company_name, t.creator_name]
                    .some(f => f?.toLowerCase().includes(s)));
        }
        return filtered;
    },

    enrichPartnerTasks: function (tasks, myCompanyId) {
        if (!tasks?.length) return tasks;
        return tasks.map(task => {
            task.direction = task.company_id === myCompanyId ? 'outgoing' : 'incoming';
            if (!task.partner_company_name) {
                task.partner_company_name = task.direction === 'outgoing'
                    ? (task.target_company_name || 'Partnyor şirkət')
                    : (task.company_name || 'Göndərən şirkət');
            }
            const statusMap = { pending:'Gözləyir', in_progress:'İcra olunur', completed:'Tamamlandı', rejected:'İmtina edildi' };
            task.status_display = statusMap[task.status] || task.status;
            return task;
        });
    },

    // ==================== RENDER ====================
    renderTasks: async function (tasks, page) {
        const tbody = document.getElementById('partnerTableBody');
        if (!tbody) { console.error('❌ partnerTableBody tapılmadı'); return; }

        if (!tasks?.length) { this.showEmptyTable(); return; }

        let html = '';
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            if (window.PartnerRowCreator) {
                try {
                    const result = window.PartnerRowCreator.createPartnerRowHTML(task, i, page);
                    html += (result && typeof result.then === 'function') ? await result : result;
                } catch (e) {
                    html += this.createFallbackRow(task, i, page);
                }
            } else {
                html += this.createFallbackRow(task, i, page);
            }
        }

        tbody.innerHTML = html;

        document.dispatchEvent(new CustomEvent('partnerTasksRendered', { detail: { tasks, page } }));
    },

    createFallbackRow: function (task, index, page) {
        const serial = (page - 1) * this.pageSize + index + 1;
        const fmt = d => d ? new Date(d).toLocaleDateString('az-AZ') : '-';
        return `
            <tr data-task-id="${task.id}" data-task-type="partner">
                <td class="text-center">${serial}</td>
                <td>${fmt(task.created_at)}</td>
                <td>${task.partner_company_name || task.partner_name || '-'}</td>
                <td>${task.creator_name || task.created_by_name || 'Sistem'}</td>
                <td>${task.assigned_to_name || 'Təyin edilməyib'}</td>
                <td>${task.task_title || '-'}</td>
                <td>${task.task_description ? task.task_description.substring(0,50)+'...' : '-'}</td>
                <td>${fmt(task.due_date)}</td>
                <td><span class="status-badge status-${task.status}">${task.status_display || task.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="PartnerTableManager.viewTaskDetails(${task.id})">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </td>
            </tr>`;
    },

    showEmptyTable: function () {
        const tbody = document.getElementById('partnerTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="14" class="empty-state">
                        <i class="fas fa-handshake fa-3x mb-3" style="color:#94a3b8"></i>
                        <h3>Partnyor Taskları</h3>
                        <p>Hazırda partnyor taskları yoxdur.</p>
                        <button class="primary-btn btn-sm" onclick="PartnerTableManager.refresh()">
                            <i class="fas fa-sync-alt"></i> Yenidən yüklə
                        </button>
                    </td>
                </tr>`;
        }
        const pg = document.getElementById('partnerPagination');
        if (pg) pg.style.display = 'none';
    },

    viewTaskDetails: function (taskId) {
        if (window.PartnerRowCreator?.viewPartnerTaskDetails) {
            window.PartnerRowCreator.viewPartnerTaskDetails(taskId);
        } else {
            alert(`Task ID: ${taskId}`);
        }
    },

    editTask: function (taskId) {
        if (window.TaskEditModule) {
            window.TaskEditModule.open(taskId, 'partner');
        }
    },

    // ==================== PAGİNASİYA ====================
    updatePagination: function (filteredCount) {
        const pagination  = document.getElementById('partnerPagination');
        const showing     = document.getElementById('partnerShowing');
        const pageNumbers = document.getElementById('partnerPageNumbers');
        if (!pagination || !showing || !pageNumbers) return;

        const count = filteredCount ?? this.totalTasks;
        if (count === 0) { pagination.style.display = 'none'; return; }

        pagination.style.display = 'flex';
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end   = Math.min(this.currentPage * this.pageSize, count);
        showing.textContent = `Göstərilir: ${start}-${end} / ${count}`;

        const totalPages = filteredCount !== undefined ? Math.ceil(count / this.pageSize) : this.totalPages;
        this.renderPageNumbers(totalPages);

        const firstBtn = document.getElementById('partnerFirstPage');
        const prevBtn  = document.getElementById('partnerPrevPage');
        const nextBtn  = document.getElementById('partnerNextPage');
        const lastBtn  = document.getElementById('partnerLastPage');
        if (firstBtn) firstBtn.disabled = this.currentPage === 1;
        if (prevBtn)  prevBtn.disabled  = this.currentPage === 1;
        if (nextBtn)  nextBtn.disabled  = this.currentPage === totalPages;
        if (lastBtn)  lastBtn.disabled  = this.currentPage === totalPages;
    },

    renderPageNumbers: function (totalPages) {
        const pn = document.getElementById('partnerPageNumbers');
        if (!pn) return;
        let html = '';
        const pages = totalPages <= 7 ? Array.from({length:totalPages},(_,i)=>i+1) : (() => {
            const arr = [1];
            let s = Math.max(2, this.currentPage-1), e = Math.min(totalPages-1, this.currentPage+1);
            if (this.currentPage > 3)             arr.push('...');
            for (let i=s; i<=e; i++) arr.push(i);
            if (this.currentPage < totalPages-2)  arr.push('...');
            if (totalPages > 1) arr.push(totalPages);
            return arr;
        })();

        pages.forEach(p => {
            if (p === '...') {
                html += '<span class="pagination-ellipsis">...</span>';
            } else {
                html += `<button class="pagination-number ${p===this.currentPage?'active':''}" onclick="PartnerTableManager.goToPage(${p})">${p}</button>`;
            }
        });
        pn.innerHTML = html;
    },

    createPageButton: function (page) {
        return `<button class="pagination-number ${page===this.currentPage?'active':''}" onclick="PartnerTableManager.goToPage(${page})">${page}</button>`;
    },

    goToPage: function (page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        this.loadTasks(page);
    },

    prevPage:  function () { if (this.currentPage > 1) this.loadTasks(this.currentPage - 1); },
    nextPage:  function () { if (this.currentPage < this.totalPages) this.loadTasks(this.currentPage + 1); },
    firstPage: function () { if (this.currentPage !== 1) this.loadTasks(1); },
    lastPage:  function () { if (this.currentPage !== this.totalPages) this.loadTasks(this.totalPages); },

    updateTaskCount: function () {
        const el = document.getElementById('countPartner');
        if (el) el.textContent = this.totalTasks;
        const badge = document.getElementById('partnerTaskCount');
        if (badge) badge.textContent = this.totalTasks;
    },

    // ==================== FİLTER ====================
    applyFilters: function () {
        const statusEl   = document.getElementById('partnerStatusFilter');
        const priorityEl = document.getElementById('partnerPriorityFilter');
        const searchEl   = document.getElementById('partnerSearchFilter');
        this.filters = {
            status:   statusEl?.value   || '',
            priority: priorityEl?.value || '',
            search:   searchEl?.value   || ''
        };
        this.loadTasks(1);
    },

    toggleFilterBar: function () {
        const bar = document.getElementById('partnerFilterBar');
        if (bar) bar.style.display = bar.style.display === 'none' ? 'block' : 'none';
    },

    refresh: function () {
        // Cache təmizlə, sonra yüklə
        if (window.clearCacheByType) window.clearCacheByType('partnerTasks');
        this.loadTasks(this.currentPage);
    },

    // ==================== LOADING ====================
    showLoading: function () {
        const tbody = document.getElementById('partnerTableBody');
        if (tbody && tbody.children.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="14">
                        <div class="table-loading">
                            <div class="loader"><div></div><div></div></div>
                            <p>Partnyor tasklar yüklənir...</p>
                        </div>
                    </td>
                </tr>`;
        }
    },

    hideLoading: function () {},

    showError: function (message) {
        if (window.notificationService) notificationService.showError(message);
        else console.error('❌', message);
    },

    // ==================== EVENT LISTENERS ====================
    setupEventListeners: function () {
        document.getElementById('partnerFilterBtn')?.addEventListener('click', () => this.toggleFilterBar());
        document.getElementById('partnerApplyFilter')?.addEventListener('click', () => this.applyFilters());
        document.getElementById('partnerRefreshBtn')?.addEventListener('click', () => this.refresh());
        document.getElementById('partnerFirstPage')?.addEventListener('click', () => this.firstPage());
        document.getElementById('partnerPrevPage')?.addEventListener('click', () => this.prevPage());
        document.getElementById('partnerNextPage')?.addEventListener('click', () => this.nextPage());
        document.getElementById('partnerLastPage')?.addEventListener('click', () => this.lastPage());
        document.getElementById('partnerSearchFilter')?.addEventListener('keypress', e => {
            if (e.key === 'Enter') this.applyFilters();
        });
    },

    // ==================== INITIALIZE ====================
    initialize: function () {
        console.log('🚀 PartnerTableManager başladılır...');
        this.setupEventListeners();

        if (!window.PartnerRowCreator) {
            console.warn('⚠️ PartnerRowCreator tapılmadı, yüklənir...');
            this.loadPartnerRowCreator();
        }

        setTimeout(() => this.loadTasks(1), 300);
        return this;
    },

    loadPartnerRowCreator: function () {
        const script = document.createElement('script');
        script.src = '../assets/js/task_js/partner_task/partnerRowCreator.js';
        script.onload = () => {
            console.log('✅ PartnerRowCreator yükləndi');
            PartnerTableManager.refresh();
        };
        document.head.appendChild(script);
    }
};

if (typeof window !== 'undefined') {
    window.PartnerTableManager = PartnerTableManager;

    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => PartnerTableManager.initialize(), 500);
    });

    console.log('✅ PartnerTableManager yükləndi (OPTİMLƏŞDİRİLMİŞ - cache dəstəyi)');
}