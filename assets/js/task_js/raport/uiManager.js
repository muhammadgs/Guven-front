// ========================================
// REPORT MANAGER - uiManager.js
// UI ELEMENTLƏRİ VƏ EVENT HANDLERLAR
// ========================================
// raport/uiManager.js
class UIManager {
    constructor(manager) {
        this.manager = manager;
        this.manager = manager;
        this.elements = manager.elements;
        this.searchFilters = manager.searchFilters;
    }

    cacheElements() {
        const ids = [
            'totalTasksCount', 'completedTasksCount', 'pendingTasksCount', 'overdueTasksCount',
            'totalTrend', 'completedTrend', 'pendingTrend', 'overdueTrend',
            'totalProgress', 'completedProgress', 'pendingProgress', 'overdueProgress',
            'completedPercentage', 'pendingPercentage', 'overduePercentage',
            'companyStatsList', 'departmentStatsList', 'employeeStatsList',
            'taskTypeStatsList', 'partnerStatsList',
            'reportTasksBody', 'partnerTasksBody', 'archiveTasksBody',
            'reportStartDate', 'reportEndDate', 'lastReportUpdate',
            'avgCompletionTime', 'productivityRate', 'ontimeRate', 'activeUsers',
            'totalRevenue', 'totalProfit',
            'refreshReportBtn', 'exportReportBtn', 'printReportBtn',
            'applyDateRangeBtn', 'generateFullReport', 'scheduleReport',
            'filterReportBtn', 'resetFilterBtn',
            'filterCompany', 'filterDepartment', 'filterStatus', 'filterPriority',
            'reportDetailModal', 'reportDetailTitle', 'reportDetailBody',
            'closeReportModal', 'exportDetailReport', 'printDetailReport',
            'searchCompany', 'searchDepartment', 'searchEmployee', 'searchTaskType', 'searchPartner'
        ];

        ids.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });

        // View all buttons
        ['Companies', 'Departments', 'Employees', 'TaskTypes', 'Partners'].forEach(type => {
            const btn = document.getElementById(`viewAll${type}`);
            if (btn) this.elements[`viewAll${type}`] = btn;
        });
    }

    bindEvents() {
        this.bindButtonEvents();
        this.bindSearchEvents();
        this.bindTabEvents();
        this.bindModalEvents();
        this.bindWindowEvents();
    }

    bindButtonEvents() {
        const btnMap = {
            refreshReportBtn: () => this.manager.loadData(),
            applyDateRangeBtn: () => this.manager.applyDateRange(),
            exportReportBtn: () => this.manager.exportManager.exportReport(),
            printReportBtn: () => this.manager.exportManager.printReport(),
            generateFullReport: () => this.manager.modalManager.showDetailModal('full'),
            filterReportBtn: () => this.manager.applyFilters(),
            resetFilterBtn: () => this.manager.resetFilters(),
            scheduleReport: () => this.manager.exportManager.scheduleReport(),
            closeReportModal: () => this.manager.modalManager.closeModal(),
            exportDetailReport: () => this.manager.exportManager.exportDetailReport(),
            printDetailReport: () => this.manager.exportManager.printDetailReport()
        };

        Object.entries(btnMap).forEach(([id, handler]) => {
            if (this.elements[id]) {
                this.elements[id].addEventListener('click', handler);
            }
        });

        // View all buttons
        ['Companies', 'Departments', 'Employees', 'TaskTypes', 'Partners'].forEach(type => {
            const btn = this.elements[`viewAll${type}`];
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.manager.modalManager[`showAll${type}`]();
                });
            }
        });
    }

    bindSearchEvents() {
        const searchMap = {
            searchCompany: 'companies',
            searchDepartment: 'departments',
            searchEmployee: 'employees',
            searchTaskType: 'taskTypes',
            searchPartner: 'partners'
        };

        Object.entries(searchMap).forEach(([elementId, filterKey]) => {
            if (this.elements[elementId]) {
                this.elements[elementId].addEventListener('input', (e) => {
                    this.searchFilters[filterKey] = e.target.value.toLowerCase();
                    this[`update${filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}Stats`]();
                });
            }
        });
    }

    bindTabEvents() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target));
        });

        document.querySelectorAll('.expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleExpand(e.target));
        });
    }

    bindModalEvents() {
        if (this.elements.closeReportModal) {
            this.elements.closeReportModal.addEventListener('click', () => {
                this.manager.modalManager.closeModal();
            });
        }
    }

    bindWindowEvents() {
        window.addEventListener('click', (e) => {
            if (e.target === this.elements.reportDetailModal) {
                this.manager.modalManager.closeModal();
            }
        });
    }

    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        tab.classList.add('active');

        const tabId = tab.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const targetTab = document.getElementById(`${tabId}Tab`);
        if (targetTab) {
            targetTab.classList.add('active');
            this.populateTab(tabId);
        }
    }

    populateTab(tabId) {
        const tabContent = document.getElementById(`${tabId}Tab`);
        if (!tabContent) return;

        const generators = {
            companies: () => this.manager.modalManager.generateCompanyDetailTable(true),
            employees: () => this.manager.modalManager.generateEmployeeDetailTable(true),
            partners: () => this.manager.modalManager.generatePartnerDetailTable(true),
            financial: () => this.manager.modalManager.generateFinancialTable()
        };

        if (generators[tabId]) {
            tabContent.innerHTML = generators[tabId]();
        }
    }

    toggleExpand(btn) {
        const targetId = btn.dataset.target;
        const content = document.getElementById(targetId);

        if (content) {
            content.classList.toggle('expanded');
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = content.classList.contains('expanded') ?
                    'fas fa-chevron-up' : 'fas fa-chevron-down';
            }
        }
    }

    setDefaultDates() {
        if (this.elements.reportStartDate) {
            this.elements.reportStartDate.value = this.formatDate(this.manager.dateRange.start, 'YYYY-MM-DD');
        }
        if (this.elements.reportEndDate) {
            this.elements.reportEndDate.value = this.formatDate(this.manager.dateRange.end, 'YYYY-MM-DD');
        }
    }

    updateLastUpdateTime() {
        if (this.elements.lastReportUpdate) {
            this.elements.lastReportUpdate.innerHTML = `
                <i class="fas fa-sync-alt"></i>
                Son yenilənmə: ${new Date().toLocaleTimeString('az-AZ')}
            `;
        }
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.add('active');
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('active');
    }

    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('notificationsContainer');
        if (!container) return;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
            <div class="notification-content">${message}</div>
        `;

        container.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    formatDate(date, format = 'DD.MM.YYYY') {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        if (format === 'YYYY-MM-DD') {
            return `${year}-${month}-${day}`;
        }
        return `${day}.${month}.${year}`;
    }

    // Stats update methods will be called from StatsManager
    updateCompanyStats() { this.manager.statsManager.updateCompanyStats(); }
    updateDepartmentStats() { this.manager.statsManager.updateDepartmentStats(); }
    updateEmployeeStats() { this.manager.statsManager.updateEmployeeStats(); }
    updateTaskTypeStats() { this.manager.statsManager.updateTaskTypeStats(); }
    updatePartnerStats() { this.manager.statsManager.updatePartnerStats(); }
    updateTasksTable() { this.manager.statsManager.updateTasksTable(); }
    updatePartnerTasksTable() { this.manager.statsManager.updatePartnerTasksTable(); }
    updateArchiveTasksTable() { this.manager.statsManager.updateArchiveTasksTable(); }
}
// Global modula əlavə et
window.ReportModules = window.ReportModules || {};
window.ReportModules.UIManager = UIManager;