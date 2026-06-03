// externalTableManager.js - OPTİMLƏŞDİRİLMİŞ VERSİYA
// ✅ Cache istifadə edir (getExternalTasksWithCache)
// ❌ Dublikat sorğular yoxdur

const ExternalTableManager = {
    currentPage: 1,
    itemsPerPage: 20,
    totalItems: 0,
    tasks: [],
    filteredTasks: [],
    currentSort: { field: 'created_at', direction: 'desc' },
    filters: { status: '', priority: '', search: '', company_id: '', date_from: '', date_to: '' },
    isLoading: false,

    tableBody: null,
    paginationNumbers: null,
    prevBtn: null,
    nextBtn: null,
    showingInfo: null,

    // ==================== INIT ====================
    init: function () {
        this.tableBody        = document.getElementById('externalTableBody');
        this.paginationNumbers = document.getElementById('externalPaginationNumbers');
        this.prevBtn          = document.getElementById('externalPrevBtn');
        this.nextBtn          = document.getElementById('externalNextBtn');
        this.showingInfo      = document.getElementById('externalShowingInfo');

        if (!this.tableBody) {
            setTimeout(() => this.init(), 1000);
            return;
        }

        this.bindEvents();

        const wait = () => {
            if (window.taskManager?.apiRequest || window.makeApiRequest) {
                this.loadTasks();
            } else {
                setTimeout(wait, 500);
            }
        };
        wait();

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                if (e.target.dataset.tab === 'external') this.loadTasks();
            });
        });

        console.log('✅ ExternalTableManager initialized');
    },

    bindEvents: function () {
        this.prevBtn?.addEventListener('click', () => this.prevPage());
        this.nextBtn?.addEventListener('click', () => this.nextPage());
        document.getElementById('externalSortBtn')?.addEventListener('click', () => this.toggleSort());
        document.getElementById('externalFilterBtn')?.addEventListener('click', () => this.showFilterModal());
        document.getElementById('externalRefreshBtn')?.addEventListener('click', () => this.refresh());
        document.getElementById('externalColumnsBtn')?.addEventListener('click', () => this.showColumnSelector());
    },

    // ==================== TASK YÜKLƏMƏ (CACHE İLƏ) ====================
    loadTasks: async function () {
        try {
            this.isLoading = true;
            this.showLoading();

            console.log('📥 External tasklar yüklənir (cache ilə)...');

            // ✅ CACHE İSTİFADƏ ET - getExternalTasksWithCache apiService-dən
            let tasks = [];

            if (window.getExternalTasksWithCache) {
                const result = await window.getExternalTasksWithCache();
                tasks = Array.isArray(result) ? result : (result?.data || result?.items || []);
            } else {
                // Fallback: birbaşa API
                console.warn('⚠️ getExternalTasksWithCache tapılmadı, birbaşa API istifadə olunur');
                const res = await window.makeApiRequest('/tasks-external/', 'GET');
                tasks = Array.isArray(res) ? res : (res?.data || res?.items || []);
            }

            // Metadata parse
            tasks.forEach(task => {
                if (task.metadata && typeof task.metadata === 'string') {
                    try { task.metadata = JSON.parse(task.metadata); } catch (e) {}
                }
            });

            this.tasks = tasks;
            this.totalItems = tasks.length;
            console.log(`✅ ${tasks.length} external task yükləndi`);

            this.applyFilters();
            await this.renderTable();
            this.updatePagination();

        } catch (error) {
            console.error('❌ External tasks xəta:', error);
            this.showError(error.message || 'External tasklar yüklənərkən xəta');
        } finally {
            this.isLoading = false;
        }
    },

    // ==================== FİLTER ====================
    applyFilters: function () {
        if (!this.tasks?.length) { this.filteredTasks = []; return; }
        let filtered = [...this.tasks];

        if (this.filters.status)     filtered = filtered.filter(t => t.status === this.filters.status);
        if (this.filters.priority)   filtered = filtered.filter(t => t.priority === this.filters.priority);
        if (this.filters.company_id) filtered = filtered.filter(t => t.company_id == this.filters.company_id || t.target_company_id == this.filters.company_id);

        if (this.filters.search) {
            const s = this.filters.search.toLowerCase();
            filtered = filtered.filter(t =>
                [t.task_title, t.task_description, t.target_company_name, t.company_name, t.creator_name]
                    .some(f => f?.toLowerCase().includes(s)));
        }

        if (this.filters.date_from) {
            const from = new Date(this.filters.date_from); from.setHours(0,0,0,0);
            filtered = filtered.filter(t => t.created_at && new Date(t.created_at) >= from);
        }

        if (this.filters.date_to) {
            const to = new Date(this.filters.date_to); to.setHours(23,59,59,999);
            filtered = filtered.filter(t => t.created_at && new Date(t.created_at) <= to);
        }

        this.sortTasks(filtered);
        this.filteredTasks = filtered;
        console.log(`📊 Filter: ${filtered.length} task`);
    },

    sortTasks: function (tasks) {
        const { field, direction } = this.currentSort;
        const m = direction === 'asc' ? 1 : -1;
        const priorityOrder = { urgent:4, high:3, medium:2, low:1 };

        tasks.sort((a, b) => {
            if (['created_at','due_date','completed_date'].includes(field)) {
                return (new Date(a[field]||0) - new Date(b[field]||0)) * m;
            }
            if (field === 'priority') {
                return ((priorityOrder[a.priority]||0) - (priorityOrder[b.priority]||0)) * m;
            }
            const av = String(a[field]||'').toLowerCase();
            const bv = String(b[field]||'').toLowerCase();
            return av < bv ? -m : av > bv ? m : 0;
        });
    },

    // ==================== RENDER ====================
    renderTable: async function () {
        if (!this.tableBody) return;

        if (!this.filteredTasks?.length) { this.renderEmpty(); return; }

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end   = Math.min(start + this.itemsPerPage, this.filteredTasks.length);
        const page  = this.filteredTasks.slice(start, end);

        let html = '';
        for (let i = 0; i < page.length; i++) {
            const task = page[i];
            if (window.ExternalRowCreator) {
                try {
                    const rowHTML = await window.ExternalRowCreator.createExternalRowHTML(task, i, this.currentPage);
                    html += `<tr data-task-id="${task.id}">${rowHTML}</tr>`;
                } catch (e) {
                    html += this.createFallbackRow(task, start + i);
                }
            } else {
                html += this.createFallbackRow(task, start + i);
            }
        }

        this.tableBody.innerHTML = html;

        if (this.showingInfo) {
            this.showingInfo.textContent = `Göstərilir: ${start+1}-${end} / ${this.filteredTasks.length}`;
        }
    },

    createFallbackRow: function (task, index) {
        const serial = index + 1;
        const currentCompanyId = window.taskManager?.userData?.companyId;
        let companyName = task.target_company_name || task.company_name || 'Üst şirkət';
        let directionIcon = '';

        if (task.target_company_id == currentCompanyId) {
            directionIcon = '<i class="fas fa-arrow-down text-success ms-1" title="Sizə göndərilib"></i>';
        } else if (task.company_id == currentCompanyId) {
            directionIcon = '<i class="fas fa-arrow-up text-primary ms-1" title="Siz göndərmisiniz"></i>';
        }

        const takeButton = task.status === 'pending'
            ? `<button class="btn btn-sm btn-success" onclick="ExternalTableManager.takeTask(${task.id})" title="Götür">
                   <i class="fa-solid fa-hand-paper"></i> Götür
               </button>`
            : '';

        return `
            <tr data-task-id="${task.id}">
                <td class="text-center">${serial}</td>
                <td>${this.formatDate(task.created_at)}</td>
                <td><div class="company-name-cell">${this.escapeHtml(companyName)}${directionIcon}</div></td>
                <td>${this.escapeHtml(task.creator_name || `ID: ${task.created_by}`)}</td>
                <td>${this.escapeHtml(task.assigned_to_name || 'Təyin edilməyib')}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="ExternalTableManager.viewTask(${task.id})">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    ${takeButton}
                </td>
                <td>${this.escapeHtml(task.work_type_name || '-')}</td>
                <td>${this.truncateText(task.task_description || '', 50)}</td>
                <td>-</td>
                <td>${this.formatDate(task.due_date)}</td>
                <td><span class="status-badge ${this.getStatusClass(task.status)}">${this.getStatusText(task.status)}</span></td>
                <td>${this.formatDate(task.completed_date)}</td>
                <td>${task.duration_minutes || 0}</td>
                <td>${task.billing_rate || 0}</td>
                <td>${this.calculateSalary(task.billing_rate, task.duration_minutes)} ₼</td>
                <td>${this.escapeHtml(task.department_name || '-')}</td>
            </tr>`;
    },

    renderEmpty: function () {
        if (!this.tableBody) return;
        this.tableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="16">
                    <div class="empty-state">
                        <i class="fas fa-building fa-3x mb-3" style="color:#94a3b8"></i>
                        <h3>External Task Yoxdur</h3>
                        <p>Digər şirkətlərdən task gəlməyib.</p>
                        <button class="primary-btn mt-3" onclick="ExternalTableManager.refresh()">
                            <i class="fas fa-sync-alt"></i> Yenilə
                        </button>
                    </div>
                </td>
            </tr>`;
        if (this.showingInfo) this.showingInfo.textContent = 'Göstərilir: 0-0 / 0';
    },

    showLoading: function () {
        if (!this.tableBody) return;
        this.tableBody.innerHTML = `
            <tr class="loading-row">
                <td colspan="16">
                    <div class="table-loading">
                        <div class="loader"><div></div><div></div></div>
                        <p>External tasklar yüklənir...</p>
                    </div>
                </td>
            </tr>`;
    },

    showError: function (message) {
        if (!this.tableBody) return;
        this.tableBody.innerHTML = `
            <tr class="error-row">
                <td colspan="16">
                    <div class="empty-state error">
                        <i class="fas fa-exclamation-triangle fa-3x mb-3" style="color:#ef4444"></i>
                        <h3>Xəta baş verdi</h3>
                        <p>${message}</p>
                        <button class="primary-btn mt-3" onclick="ExternalTableManager.refresh()">
                            <i class="fas fa-sync-alt"></i> Təkrar cəhd et
                        </button>
                    </div>
                </td>
            </tr>`;
    },

    // ==================== TASK ACTIONS ====================
    takeTask: async function (taskId) {
        try {
            const task = this.tasks.find(t => t.id == taskId);
            if (!task) throw new Error('Task tapılmadı');
            if (task.status !== 'pending') throw new Error('Yalnız gözləmədə olan işlər götürülə bilər');

            if (typeof Swal !== 'undefined') {
                Swal.fire({ title:'İş götürülür...', allowOutsideClick:false, didOpen:()=>Swal.showLoading() });
            }

            const res = await window.makeApiRequest(`/tasks-external/${taskId}`, 'PUT', { status:'in_progress' });
            console.log('✅ İş götürüldü:', res);

            if (typeof Swal !== 'undefined') {
                Swal.fire({ title:'Uğurlu!', text:'İş götürüldü', icon:'success', timer:2000 });
            }

            // Cache təmizlə və yenilə
            if (window.refreshTaskCache) await window.refreshTaskCache();
            setTimeout(() => this.loadTasks(), 1000);
            return true;

        } catch (error) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ title:'Xəta!', text:error.message, icon:'error' });
            }
            return false;
        }
    },

    takeTaskFromOthers: async function (taskId) {
        try {
            const task = this.tasks.find(t => t.id == taskId);
            if (!task) throw new Error('Task tapılmadı');
            if (task.status !== 'pending') throw new Error('Yalnız gözləmədə olan işlər götürülə bilər');

            const isAdmin = window.taskManager?.userData?.is_admin ||
                            window.taskManager?.userData?.role === 'company_admin';
            if (!isAdmin) throw new Error('Admin icazəsi lazımdır');

            if (typeof Swal !== 'undefined') {
                Swal.fire({ title:'İş götürülür...', allowOutsideClick:false, didOpen:()=>Swal.showLoading() });
            }

            await window.makeApiRequest(`/tasks-external/${taskId}`, 'PUT', { status:'in_progress' });

            if (typeof Swal !== 'undefined') {
                Swal.fire({ title:'Uğurlu!', text:'İş götürüldü', icon:'success', timer:2000 });
            }

            // Cache təmizlə və yenilə
            if (window.refreshTaskCache) await window.refreshTaskCache();
            setTimeout(() => this.loadTasks(), 1000);
            return true;

        } catch (error) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ title:'Xəta!', text:error.message, icon:'error' });
            }
            return false;
        }
    },

    viewTask: function (taskId) {
        if (window.ModalManager?.openTaskDetails) {
            window.ModalManager.openTaskDetails(taskId, 'external');
        } else {
            window.open(`/task-details.html?id=${taskId}&type=external`, '_blank');
        }
    },

    deleteTask: async function (taskId) {
        if (!confirm('Bu taskı silmək istədiyinizə əminsiniz?')) return;
        try {
            await window.makeApiRequest(`/tasks-external/${taskId}`, 'DELETE');
            if (window.refreshTaskCache) await window.refreshTaskCache();
            this.refresh();
        } catch (error) {
            alert('Xəta: ' + error.message);
        }
    },

    // ==================== PAGİNASİYA ====================
    updatePagination: function () {
        const total = Math.ceil(this.filteredTasks.length / this.itemsPerPage);
        if (this.prevBtn) this.prevBtn.disabled = this.currentPage <= 1;
        if (this.nextBtn) this.nextBtn.disabled = this.currentPage >= total || total === 0;
        if (this.paginationNumbers) this.renderPaginationNumbers(total);
    },

    renderPaginationNumbers: function (totalPages) {
        if (totalPages <= 1) { this.paginationNumbers.innerHTML = ''; return; }

        const max = 5;
        let start = Math.max(1, this.currentPage - Math.floor(max/2));
        let end   = Math.min(totalPages, start + max - 1);
        if (end - start + 1 < max) start = Math.max(1, end - max + 1);

        let html = '';
        for (let i = start; i <= end; i++) {
            html += `<button class="pagination-number ${i===this.currentPage?'active':''}" data-page="${i}">${i}</button>`;
        }
        this.paginationNumbers.innerHTML = html;
        this.paginationNumbers.querySelectorAll('.pagination-number').forEach(btn => {
            btn.addEventListener('click', () => this.goToPage(parseInt(btn.dataset.page)));
        });
    },

    prevPage: function () { if (this.currentPage > 1) { this.currentPage--; this.renderTable(); this.updatePagination(); } },
    nextPage: function () { const t = Math.ceil(this.filteredTasks.length/this.itemsPerPage); if (this.currentPage < t) { this.currentPage++; this.renderTable(); this.updatePagination(); } },
    goToPage: function (page) { this.currentPage = page; this.renderTable(); this.updatePagination(); },

    toggleSort: function () {
        this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        this.applyFilters(); this.currentPage = 1; this.renderTable(); this.updatePagination();
    },

    showFilterModal: function () {
        if (window.ModalManager) {
            window.ModalManager.open('externalFilterModal', {
                filters: this.filters,
                onApply: (f) => { this.filters = {...this.filters,...f}; this.currentPage=1; this.applyFilters(); this.renderTable(); this.updatePagination(); }
            });
        }
    },

    showColumnSelector: function () { window.ColumnManager?.show('external'); },

    refresh: function () {
        // Cache təmizlə, sonra yüklə
        if (window.clearCacheByType) window.clearCacheByType('externalTasks');
        this.currentPage = 1;
        this.loadTasks();
    },

    setFilter: function (key, value) {
        this.filters[key] = value; this.currentPage=1; this.applyFilters(); this.renderTable(); this.updatePagination();
    },

    resetFilters: function () {
        this.filters = { status:'', priority:'', search:'', company_id:'', date_from:'', date_to:'' };
        this.currentPage=1; this.applyFilters(); this.renderTable(); this.updatePagination();
    },

    search: function (term) {
        this.filters.search = term; this.currentPage=1; this.applyFilters(); this.renderTable(); this.updatePagination();
    },

    // ==================== HELPER ====================
    formatDate: function (d) {
        if (!d) return '-';
        try {
            const date = new Date(d);
            if (isNaN(date.getTime())) return '-';
            return `${String(date.getDate()).padStart(2,'0')}.${String(date.getMonth()+1).padStart(2,'0')}.${date.getFullYear()}`;
        } catch (e) { return '-'; }
    },

    getStatusClass: function (status) {
        return { pending:'status-pending', in_progress:'status-progress', completed:'status-completed', rejected:'status-rejected', overdue:'status-overdue', approved:'status-approved', cancelled:'status-cancelled' }[status] || 'status-pending';
    },

    getStatusText: function (status) {
        return { pending:'Gözləmədə', in_progress:'İcra olunur', completed:'Tamamlandı', rejected:'İmtina edildi', overdue:'Gecikmiş', approved:'Təsdiqləndi', cancelled:'Ləğv edildi' }[status] || status || 'Gözləmədə';
    },

    truncateText: function (text, max = 100) {
        if (!text) return '-';
        return text.length <= max ? text : text.substring(0, max) + '...';
    },

    calculateSalary: function (hourlyRate, durationMinutes) {
        if (!hourlyRate || !durationMinutes) return '0.00';
        return ((durationMinutes / 60) * parseFloat(hourlyRate)).toFixed(2);
    },

    escapeHtml: function (text) {
        if (!text) return '';
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }
};

if (typeof window !== 'undefined') {
    window.ExternalTableManager = ExternalTableManager;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(() => ExternalTableManager.init(), 100));
    } else {
        setTimeout(() => ExternalTableManager.init(), 100);
    }

    window.addEventListener('load', () => {
        if (!ExternalTableManager.tableBody) ExternalTableManager.init();
    });

    console.log('✅ ExternalTableManager yükləndi (OPTİMLƏŞDİRİLMİŞ - cache dəstəyi)');
}