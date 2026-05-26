// ================================================================
// report_fixes.js — report.js-ə patch
// HTML-də report.js-dən SONRA qoşun:
// <script src="report_fixes.js"></script>
//
// Nə düzəldir:
//  1. calculateGeneralStats() — refused/cancelled/approvalPending
//     artıq tasks array-dan real hesablanır (0 deyil)
//  2. fetchFullReport limit-i 500-dən silindi (backend limit yoxdur)
//  3. fetchArchiveTasks limit 5000-ə çəkildi
// ================================================================

(function patchReportManager() {

    function applyPatches(rm) {
        if (rm._fixesApplied) return;
        rm._fixesApplied = true;

        // ── 1. calculateGeneralStats — düzgün hesabla ──────────
        rm.calculateGeneralStats = function () {
            const tasks = this.data.tasks || [];
            const now   = new Date();

            const safeStatuses = ['pending', 'in_progress', 'overdue'];

            return {
                total_tasks:            tasks.length,
                completed_tasks:        tasks.filter(t => t.status === 'completed').length,
                pending_tasks:          tasks.filter(t => t.status === 'pending').length,
                in_progress_tasks:      tasks.filter(t => t.status === 'in_progress').length,
                overdue_tasks:          tasks.filter(t =>
                    t.status === 'overdue' ||
                    (safeStatuses.includes(t.status) && t.due_date && new Date(t.due_date) < now)
                ).length,
                // ── Əvvəlcə hardcode 0 idi — indi düzgün ──
                refused_tasks:          tasks.filter(t =>
                    t.status === 'rejected' || t.status === 'refused'
                ).length,
                cancelled_tasks:        tasks.filter(t =>
                    t.status === 'cancelled' || t.status === 'canceled'
                ).length,
                approval_pending_tasks: tasks.filter(t =>
                    t.status === 'pending_approval' || t.status === 'approval_overdue'
                ).length,
                active_employees: new Set(tasks.map(t => t.assigned_to).filter(Boolean)).size,
                active_companies: new Set(tasks.map(t => t.company_id).filter(Boolean)).size,
            };
        };

        // ── 2. fetchFullReport — limit yox, arxiv də gəlsin ───
        rm.fetchFullReport = async function (dateRange, filters = {}) {
            try {
                const params = new URLSearchParams({
                    start_date: this.formatDate(dateRange.start, 'YYYY-MM-DD'),
                    end_date:   this.formatDate(dateRange.end,   'YYYY-MM-DD'),
                    // limit parametri göndərmə — backend default istifadə etsin
                });

                if (filters.company_id)       params.append('company_id',        filters.company_id);
                if (filters.department_id)    params.append('department_id',      filters.department_id);
                if (filters.employee_id)      params.append('employee_id',        filters.employee_id);
                if (filters.status)           params.append('status',             filters.status);
                if (filters.priority)         params.append('priority',           filters.priority);
                if (filters.show_partner_tasks) params.append('show_partner_tasks', 'true');

                const response = await makeApiRequest(
                    `/reports/full?${params.toString()}`, 'GET', null, true
                );

                if (response?.error) { console.error('fetchFullReport:', response.error); return {}; }
                return response?.data || {};
            } catch (e) {
                console.error('fetchFullReport xətası:', e);
                return {};
            }
        };

        // ── 3. fetchArchiveTasks — limit 5000 ─────────────────
        rm.fetchArchiveTasks = async function (dateRange, filters = {}) {
            try {
                const params = new URLSearchParams({
                    start_date: this.formatDate(dateRange.start, 'YYYY-MM-DD'),
                    end_date:   this.formatDate(dateRange.end,   'YYYY-MM-DD'),
                    limit: 5000,   // bütün arxivi gətir
                });

                if (filters.company_id) params.append('company_id', filters.company_id);
                if (filters.status)     params.append('status',     filters.status);

                const response = await makeApiRequest(
                    `/reports/archive?${params.toString()}`, 'GET', null, true
                );

                if (response?.error) { console.error('fetchArchiveTasks:', response.error); return []; }
                return response?.data || [];
            } catch (e) {
                console.error('fetchArchiveTasks xətası:', e);
                return [];
            }
        };

        // ── 4. fetchTasks — limit yox ──────────────────────────
        rm.fetchTasks = async function (dateRange, filters = {}) {
            try {
                const params = new URLSearchParams({
                    start_date: this.formatDate(dateRange.start, 'YYYY-MM-DD'),
                    end_date:   this.formatDate(dateRange.end,   'YYYY-MM-DD'),
                    limit: 5000,
                });

                if (filters.company_id)    params.append('company_id',    filters.company_id);
                if (filters.department_id) params.append('department_id', filters.department_id);
                if (filters.employee_id)   params.append('employee_id',   filters.employee_id);
                if (filters.status)        params.append('status',        filters.status);
                if (filters.priority)      params.append('priority',      filters.priority);

                const response = await makeApiRequest(
                    `/reports/tasks?${params.toString()}`, 'GET', null, true
                );

                if (response?.error) { console.error('fetchTasks:', response.error); return []; }
                return response?.data || [];
            } catch (e) {
                console.error('fetchTasks xətası:', e);
                return [];
            }
        };

        console.log('✅ [report_fixes] Patch tətbiq edildi');
    }

    // reportManager hazır olduqda patch et
    let n = 0;
    const poll = setInterval(() => {
        n++;
        if (window.reportManager) {
            applyPatches(window.reportManager);
            clearInterval(poll);
        }
        if (n > 40) clearInterval(poll);
    }, 250);

})();