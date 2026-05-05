// ========================================
// REPORT MANAGER - report.js
// TAM VERSİYA - BÜTÜN DÜYMƏLƏR İŞLƏYİR
// ========================================

class ReportManager {
    constructor() {
        this.data = {
            tasks: [],
            companies: [],
            departments: [],
            employees: [],
            taskTypes: [],
            partners: [],
            partnerTasks: [],
            archiveTasks: [],
            financial: {}
        };

        this.charts = {};
        this.stats = {};
        this.filters = {};

        this.searchFilters = {
            companies: '',
            departments: '',
            employees: '',
            taskTypes: '',
            partners: ''
        };

        this.dateRange = {
            start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            end: new Date()
        };

        this.elements = {};
        this.api = null;
        this.notification = null;
    }

    initialize(services = {}) {
        this.notification = services.notification || null;

        if (typeof makeApiRequest === 'undefined') {
            console.error('makeApiRequest funksiyası tapılmadı!');
            this.showError('API Service yüklənməyib');
            return;
        }

        this.cacheElements();
        this.bindEvents();
        this.setDefaultDates();
        this.loadData();
    }

    cacheElements() {
        this.elements.totalTasks = document.getElementById('totalTasksCount');
        this.elements.completedTasks = document.getElementById('completedTasksCount');
        this.elements.pendingTasks = document.getElementById('pendingTasksCount');
        this.elements.overdueTasks = document.getElementById('overdueTasksCount');
        this.elements.totalTrend = document.getElementById('totalTrend');
        this.elements.completedTrend = document.getElementById('completedTrend');
        this.elements.pendingTrend = document.getElementById('pendingTrend');
        this.elements.overdueTrend = document.getElementById('overdueTrend');
        this.elements.totalProgress = document.getElementById('totalProgress');
        this.elements.completedProgress = document.getElementById('completedProgress');
        this.elements.pendingProgress = document.getElementById('pendingProgress');
        this.elements.overdueProgress = document.getElementById('overdueProgress');
        this.elements.completedPercentage = document.getElementById('completedPercentage');
        this.elements.pendingPercentage = document.getElementById('pendingPercentage');
        this.elements.overduePercentage = document.getElementById('overduePercentage');
        this.elements.companyStats = document.getElementById('companyStatsList');
        this.elements.departmentStats = document.getElementById('departmentStatsList');
        this.elements.employeeStats = document.getElementById('employeeStatsList');
        this.elements.taskTypeStats = document.getElementById('taskTypeStatsList');
        this.elements.partnerStats = document.getElementById('partnerStatsList');
        this.elements.reportTasksBody = document.getElementById('reportTasksBody');
        this.elements.partnerTasksBody = document.getElementById('partnerTasksBody');
        this.elements.archiveTasksBody = document.getElementById('archiveTasksBody');
        this.elements.startDate = document.getElementById('reportStartDate');
        this.elements.endDate = document.getElementById('reportEndDate');
        this.elements.lastUpdate = document.getElementById('lastReportUpdate');
        this.elements.avgCompletionTime = document.getElementById('avgCompletionTime');
        this.elements.productivityRate = document.getElementById('productivityRate');
        this.elements.ontimeRate = document.getElementById('ontimeRate');
        this.elements.activeUsers = document.getElementById('activeUsers');
        this.elements.totalRevenue = document.getElementById('totalRevenue');
        this.elements.totalProfit = document.getElementById('totalProfit');
        this.elements.refreshBtn = document.getElementById('refreshReportBtn');
        this.elements.exportBtn = document.getElementById('exportReportBtn');
        this.elements.printBtn = document.getElementById('printReportBtn');
        this.elements.applyDateBtn = document.getElementById('applyDateRangeBtn');
        this.elements.generateFullBtn = document.getElementById('generateFullReport');
        this.elements.scheduleBtn = document.getElementById('scheduleReport');
        this.elements.filterBtn = document.getElementById('filterReportBtn');
        this.elements.resetFilterBtn = document.getElementById('resetFilterBtn');
        this.elements.filterCompany = document.getElementById('filterCompany');
        this.elements.filterDepartment = document.getElementById('filterDepartment');
        this.elements.filterStatus = document.getElementById('filterStatus');
        this.elements.filterPriority = document.getElementById('filterPriority');
        this.elements.reportModal = document.getElementById('reportDetailModal');
        this.elements.modalTitle = document.getElementById('reportDetailTitle');
        this.elements.modalBody = document.getElementById('reportDetailBody');
        this.elements.closeModalBtn = document.getElementById('closeReportModal');
        this.elements.exportDetailBtn = document.getElementById('exportDetailReport');
        this.elements.printDetailBtn = document.getElementById('printDetailReport');

        // YENİ: Axtarış input elementləri
        this.elements.searchCompany = document.getElementById('searchCompany');
        this.elements.searchDepartment = document.getElementById('searchDepartment');
        this.elements.searchEmployee = document.getElementById('searchEmployee');
        this.elements.searchTaskType = document.getElementById('searchTaskType');
        this.elements.searchPartner = document.getElementById('searchPartner');
    }

    bindEvents() {
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => this.loadData());
        }

        if (this.elements.applyDateBtn) {
            this.elements.applyDateBtn.addEventListener('click', () => this.applyDateRange());
        }

        if (this.elements.exportBtn) {
            this.elements.exportBtn.addEventListener('click', () => this.exportReport());
        }

        if (this.elements.printBtn) {
            this.elements.printBtn.addEventListener('click', () => this.printReport());
        }

        if (this.elements.generateFullBtn) {
            this.elements.generateFullBtn.addEventListener('click', () => {
                this.showDetailModal('full');
            });
        }

        if (this.elements.filterBtn) {
            this.elements.filterBtn.addEventListener('click', () => this.applyFilters());
        }

        if (this.elements.resetFilterBtn) {
            this.elements.resetFilterBtn.addEventListener('click', () => this.resetFilters());
        }

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target));
        });

        const reportSection = document.getElementById('reportTableSection');
        if (reportSection) {
            reportSection.querySelectorAll('.expand-btn').forEach(btn => {
                btn.addEventListener('click', (e) => this.toggleExpand(e.target));
            });
        }

        // ========== HAMISINA BAX DÜYMƏLƏRİ ==========
        const viewAllCompanies = document.getElementById('viewAllCompanies');
        if (viewAllCompanies) {
            viewAllCompanies.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showAllCompanies();
            });
        }

        const viewAllDepartments = document.getElementById('viewAllDepartments');
        if (viewAllDepartments) {
            viewAllDepartments.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showAllDepartments();
            });
        }

        const viewAllEmployees = document.getElementById('viewAllEmployees');
        if (viewAllEmployees) {
            viewAllEmployees.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showAllEmployees();
            });
        }

        const viewAllTaskTypes = document.getElementById('viewAllTaskTypes');
        if (viewAllTaskTypes) {
            viewAllTaskTypes.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showAllTaskTypes();
            });
        }

        const viewAllPartners = document.getElementById('viewAllPartners');
        if (viewAllPartners) {
            viewAllPartners.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showAllPartners();
            });
        }

        if (this.elements.closeModalBtn) {
            this.elements.closeModalBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        if (this.elements.exportDetailBtn) {
            this.elements.exportDetailBtn.addEventListener('click', () => {
                this.exportDetailReport();
            });
        }

        if (this.elements.printDetailBtn) {
            this.elements.printDetailBtn.addEventListener('click', () => {
                this.printDetailReport();
            });
        }

        // YENİ: Axtarış input-ları üçün event listener-lar
        if (this.elements.searchCompany) {
            this.elements.searchCompany.addEventListener('input', (e) => {
                this.searchFilters.companies = e.target.value.toLowerCase();
                this.updateCompanyStats();
            });
        }

        if (this.elements.searchDepartment) {
            this.elements.searchDepartment.addEventListener('input', (e) => {
                this.searchFilters.departments = e.target.value.toLowerCase();
                this.updateDepartmentStats();
            });
        }

        if (this.elements.searchEmployee) {
            this.elements.searchEmployee.addEventListener('input', (e) => {
                this.searchFilters.employees = e.target.value.toLowerCase();
                this.updateEmployeeStats();
            });
        }

        if (this.elements.searchTaskType) {
            this.elements.searchTaskType.addEventListener('input', (e) => {
                this.searchFilters.taskTypes = e.target.value.toLowerCase();
                this.updateTaskTypeStats();
            });
        }

        if (this.elements.searchPartner) {
            this.elements.searchPartner.addEventListener('input', (e) => {
                this.searchFilters.partners = e.target.value.toLowerCase();
                this.updatePartnerStats();
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === this.elements.reportModal) {
                this.closeModal();
            }
        });
    }

    setDefaultDates() {
        if (this.elements.startDate) {
            this.elements.startDate.value = this.formatDate(this.dateRange.start, 'YYYY-MM-DD');
        }
        if (this.elements.endDate) {
            this.elements.endDate.value = this.formatDate(this.dateRange.end, 'YYYY-MM-DD');
        }
    }

    // ========== API SORĞULARI ==========

    async fetchTasks(dateRange, filters = {}) {
        try {
            const params = new URLSearchParams({
                start_date: this.formatDate(dateRange.start, 'YYYY-MM-DD'),
                end_date: this.formatDate(dateRange.end, 'YYYY-MM-DD'),
                limit: filters.limit || 1000
            });

            if (filters.company_id) params.append('company_id', filters.company_id);
            if (filters.department_id) params.append('department_id', filters.department_id);
            if (filters.employee_id) params.append('employee_id', filters.employee_id);
            if (filters.status) params.append('status', filters.status);
            if (filters.priority) params.append('priority', filters.priority);

            const endpoint = `/reports/tasks?${params.toString()}`;
            const response = await makeApiRequest(endpoint, 'GET', null, true);

            if (response.error) {
                console.error('fetchTasks xətası:', response.error);
                return [];
            }

            return response.data || [];
        } catch (error) {
            console.error('fetchTasks xətası:', error);
            return [];
        }
    }

    async fetchCompanies() {
        try {
            const response = await makeApiRequest('/reports/companies', 'GET', null, true);

            if (response.error) {
                console.error('fetchCompanies xətası:', response.error);
                return [];
            }

            return response.data || [];
        } catch (error) {
            console.error('fetchCompanies xətası:', error);
            return [];
        }
    }

    async fetchDepartments() {
        try {
            const response = await makeApiRequest('/reports/departments', 'GET', null, true);

            if (response.error) {
                console.error('fetchDepartments xətası:', response.error);
                return [];
            }

            return response.data || [];
        } catch (error) {
            console.error('fetchDepartments xətası:', error);
            return [];
        }
    }

    async fetchEmployees() {
        try {
            const response = await makeApiRequest('/reports/employees', 'GET', null, true);

            if (response.error) {
                console.error('fetchEmployees xətası:', response.error);
                return [];
            }

            return response.data || [];
        } catch (error) {
            console.error('fetchEmployees xətası:', error);
            return [];
        }
    }

    async fetchTaskTypes() {
        try {
            const response = await makeApiRequest('/reports/work-types', 'GET', null, true);

            if (response.error) {
                console.error('fetchTaskTypes xətası:', response.error);
                return [];
            }

            return response.data || [];
        } catch (error) {
            console.error('fetchTaskTypes xətası:', error);
            return [];
        }
    }

    async fetchPartners() {
        try {
            const response = await makeApiRequest('/reports/partners', 'GET', null, true);

            if (response.error) {
                console.error('fetchPartners xətası:', response.error);
                return [];
            }

            return response.data || [];
        } catch (error) {
            console.error('fetchPartners xətası:', error);
            return [];
        }
    }

    async fetchPartnerTasks(dateRange, filters = {}) {
        try {
            const params = new URLSearchParams({
                start_date: this.formatDate(dateRange.start, 'YYYY-MM-DD'),
                end_date: this.formatDate(dateRange.end, 'YYYY-MM-DD'),
                limit: filters.limit || 500
            });

            if (filters.partner_company_id) params.append('partner_company_id', filters.partner_company_id);
            if (filters.status) params.append('status', filters.status);
            if (filters.payment_status) params.append('payment_status', filters.payment_status);

            const endpoint = `/reports/partner-tasks?${params.toString()}`;
            const response = await makeApiRequest(endpoint, 'GET', null, true);

            if (response.error) {
                console.error('fetchPartnerTasks xətası:', response.error);
                return [];
            }

            return response.data || [];
        } catch (error) {
            console.error('fetchPartnerTasks xətası:', error);
            return [];
        }
    }

    async fetchArchiveTasks(dateRange, filters = {}) {
        try {
            const params = new URLSearchParams({
                start_date: this.formatDate(dateRange.start, 'YYYY-MM-DD'),
                end_date: this.formatDate(dateRange.end, 'YYYY-MM-DD'),
                limit: filters.limit || 500
            });

            if (filters.company_id) params.append('company_id', filters.company_id);
            if (filters.status) params.append('status', filters.status);

            const endpoint = `/reports/archive?${params.toString()}`;
            const response = await makeApiRequest(endpoint, 'GET', null, true);

            if (response.error) {
                console.error('fetchArchiveTasks xətası:', response.error);
                return [];
            }

            return response.data || [];
        } catch (error) {
            console.error('fetchArchiveTasks xətası:', error);
            return [];
        }
    }

    async fetchFinancialStats(dateRange) {
        try {
            const params = new URLSearchParams({
                start_date: this.formatDate(dateRange.start, 'YYYY-MM-DD'),
                end_date: this.formatDate(dateRange.end, 'YYYY-MM-DD')
            });

            const endpoint = `/reports/financial?${params.toString()}`;
            const response = await makeApiRequest(endpoint, 'GET', null, true);

            if (response.error) {
                console.error('fetchFinancialStats xətası:', response.error);
                return {};
            }

            return response.data || {};
        } catch (error) {
            console.error('fetchFinancialStats xətası:', error);
            return {};
        }
    }

    async fetchFullReport(dateRange, filters = {}) {
        try {
            const params = new URLSearchParams({
                start_date: this.formatDate(dateRange.start, 'YYYY-MM-DD'),
                end_date: this.formatDate(dateRange.end, 'YYYY-MM-DD')
            });

            if (filters.company_id) params.append('company_id', filters.company_id);
            if (filters.department_id) params.append('department_id', filters.department_id);
            if (filters.employee_id) params.append('employee_id', filters.employee_id);
            if (filters.status) params.append('status', filters.status);
            if (filters.priority) params.append('priority', filters.priority);
            if (filters.show_partner_tasks) params.append('show_partner_tasks', 'true');

            const endpoint = `/reports/full?${params.toString()}`;
            const response = await makeApiRequest(endpoint, 'GET', null, true);

            if (response.error) {
                console.error('fetchFullReport xətası:', response.error);
                return {};
            }

            return response.data || {};
        } catch (error) {
            console.error('fetchFullReport xətası:', error);
            return {};
        }
    }

    async fetchCompanyReport(companyId, dateRange) {
        try {
            const params = new URLSearchParams({
                start_date: this.formatDate(dateRange.start, 'YYYY-MM-DD'),
                end_date: this.formatDate(dateRange.end, 'YYYY-MM-DD')
            });

            const endpoint = `/reports/company/${companyId}?${params.toString()}`;
            const response = await makeApiRequest(endpoint, 'GET', null, true);

            if (response.error) {
                console.error('fetchCompanyReport xətası:', response.error);
                return {};
            }

            return response.data || {};
        } catch (error) {
            console.error('fetchCompanyReport xətası:', error);
            return {};
        }
    }

    async fetchEmployeeReport(employeeId, dateRange) {
        try {
            const params = new URLSearchParams({
                start_date: this.formatDate(dateRange.start, 'YYYY-MM-DD'),
                end_date: this.formatDate(dateRange.end, 'YYYY-MM-DD')
            });

            const endpoint = `/reports/employee/${employeeId}?${params.toString()}`;
            const response = await makeApiRequest(endpoint, 'GET', null, true);

            if (response.error) {
                console.error('fetchEmployeeReport xətası:', response.error);
                return {};
            }

            return response.data || {};
        } catch (error) {
            console.error('fetchEmployeeReport xətası:', error);
            return {};
        }
    }

    async fetchMonthlyTrend(year) {
        try {
            const endpoint = `/reports/monthly-trend?year=${year}`;
            const response = await makeApiRequest(endpoint, 'GET', null, true);

            if (response.error) {
                console.error('fetchMonthlyTrend xətası:', response.error);
                return [];
            }

            return response.data || [];
        } catch (error) {
            console.error('fetchMonthlyTrend xətası:', error);
            return [];
        }
    }

    // ========== MƏLUMAT YÜKLƏMƏ ==========

    async loadData() {
        this.showLoading();

        try {
            const fullReport = await this.fetchFullReport(this.dateRange, this.filters);

            if (fullReport && Object.keys(fullReport).length > 0) {
                this.data = {
                    tasks: fullReport.detailed_tasks || [],
                    companies: fullReport.companies || [],
                    departments: fullReport.departments || [],
                    employees: fullReport.employees || [],
                    taskTypes: fullReport.work_types || [],
                    partners: fullReport.partners || [],
                    partnerTasks: fullReport.partner_tasks || [],
                    archiveTasks: fullReport.archive_tasks || [],
                    financial: fullReport.financial || {},
                    general: fullReport.general || {},
                    trends: fullReport.trends || {},
                    monthlyTrend: fullReport.monthly_trend || [],
                    recentTasks: fullReport.recent_tasks || []
                };

                console.log('✅ Məlumatlar yükləndi:', {
                    companies: this.data.companies.length,
                    employees: this.data.employees.length,
                    partners: this.data.partners.length,
                    tasks: this.data.tasks.length
                });
            } else {
                await this.loadDataSeparately();
            }

            this.processData();
            this.updateUI();
            this.updateCharts();

            if (this.elements.lastUpdate) {
                this.elements.lastUpdate.innerHTML = `
                    <i class="fas fa-sync-alt"></i>
                    Son yenilənmə: ${new Date().toLocaleTimeString('az-AZ')}
                `;
            }

            this.showNotification('Məlumatlar uğurla yeniləndi', 'success');
        } catch (error) {
            console.error('loadData xətası:', error);
            this.showError('Məlumatlar yüklənərkən xəta baş verdi');
        } finally {
            this.hideLoading();
        }
    }

    async loadDataSeparately() {
        try {
            const [
                tasks,
                companies,
                departments,
                employees,
                taskTypes,
                partners,
                partnerTasks,
                archiveTasks,
                financial,
                monthlyTrend
            ] = await Promise.allSettled([
                this.fetchTasks(this.dateRange, this.filters),
                this.fetchCompanies(),
                this.fetchDepartments(),
                this.fetchEmployees(),
                this.fetchTaskTypes(),
                this.fetchPartners(),
                this.fetchPartnerTasks(this.dateRange, this.filters),
                this.fetchArchiveTasks(this.dateRange, this.filters),
                this.fetchFinancialStats(this.dateRange),
                this.fetchMonthlyTrend(this.dateRange.end.getFullYear())
            ]);

            this.data = {
                tasks: tasks.status === 'fulfilled' ? tasks.value : [],
                companies: companies.status === 'fulfilled' ? companies.value : [],
                departments: departments.status === 'fulfilled' ? departments.value : [],
                employees: employees.status === 'fulfilled' ? employees.value : [],
                taskTypes: taskTypes.status === 'fulfilled' ? taskTypes.value : [],
                partners: partners.status === 'fulfilled' ? partners.value : [],
                partnerTasks: partnerTasks.status === 'fulfilled' ? partnerTasks.value : [],
                archiveTasks: archiveTasks.status === 'fulfilled' ? archiveTasks.value : [],
                financial: financial.status === 'fulfilled' ? financial.value : {},
                monthlyTrend: monthlyTrend.status === 'fulfilled' ? monthlyTrend.value : []
            };

            this.data.general = this.calculateGeneralStats();
            this.data.trends = await this.calculateTrends();
        } catch (error) {
            console.error('loadDataSeparately xətası:', error);
            throw error;
        }
    }

    calculateGeneralStats() {
        const tasks = this.data.tasks || [];
        const now = new Date();

        return {
            total_tasks: tasks.length,
            completed_tasks: tasks.filter(t => t.status === 'completed').length,
            pending_tasks: tasks.filter(t => t.status === 'pending').length,
            in_progress_tasks: tasks.filter(t => t.status === 'in_progress').length,
            overdue_tasks: tasks.filter(t =>
                t.status === 'overdue' ||
                (t.due_date && new Date(t.due_date) < now && t.status !== 'completed')
            ).length,
            active_employees: new Set(tasks.map(t => t.assigned_to).filter(id => id)).size,
            active_companies: new Set(tasks.map(t => t.company_id).filter(id => id)).size
        };
    }

    async calculateTrends() {
        const daysDiff = Math.ceil((this.dateRange.end - this.dateRange.start) / (1000 * 60 * 60 * 24));
        const previousStart = new Date(this.dateRange.start);
        previousStart.setDate(previousStart.getDate() - daysDiff);
        const previousEnd = new Date(this.dateRange.start);

        const previousRange = { start: previousStart, end: previousEnd };
        const previousTasks = await this.fetchTasks(previousRange, this.filters);

        const currentCount = this.data.tasks.length;
        const previousCount = previousTasks.length;

        const calcTrend = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        return {
            total_tasks: calcTrend(currentCount, previousCount),
            completed_tasks: calcTrend(
                this.data.tasks.filter(t => t.status === 'completed').length,
                previousTasks.filter(t => t.status === 'completed').length
            ),
            pending_tasks: calcTrend(
                this.data.tasks.filter(t => t.status === 'pending').length,
                previousTasks.filter(t => t.status === 'pending').length
            ),
            overdue_tasks: calcTrend(
                this.data.tasks.filter(t => t.status === 'overdue').length,
                previousTasks.filter(t => t.status === 'overdue').length
            ),
            revenue: calcTrend(this.data.financial?.total_revenue || 0, 0),
            productivity: calcTrend(
                (this.data.tasks.filter(t => t.status === 'completed').length / (currentCount || 1)) * 100,
                (previousTasks.filter(t => t.status === 'completed').length / (previousCount || 1)) * 100
            )
        };
    }

    processData() {
        const tasks = this.data.tasks;
        const general = this.data.general || this.calculateGeneralStats();
        const trends = this.data.trends || {};
        const financial = this.data.financial || {};

        this.stats = {
            total: general.total_tasks || 0,
            completed: general.completed_tasks || 0,
            pending: general.pending_tasks || 0,
            in_progress: general.in_progress_tasks || 0,
            overdue: general.overdue_tasks || 0,
            totalTrend: trends.total_tasks || 0,
            completedTrend: trends.completed_tasks || 0,
            pendingTrend: trends.pending_tasks || 0,
            overdueTrend: trends.overdue_tasks || 0,
            totalRevenue: financial.total_revenue || 0,
            totalCost: financial.total_cost || 0,
            totalProfit: financial.total_profit || 0
        };

        this.stats.completedPercentage = this.stats.total ?
            Math.round((this.stats.completed / this.stats.total) * 100) : 0;
        this.stats.pendingPercentage = this.stats.total ?
            Math.round((this.stats.pending / this.stats.total) * 100) : 0;
        this.stats.overduePercentage = this.stats.total ?
            Math.round((this.stats.overdue / this.stats.total) * 100) : 0;

        const completedTasks = tasks.filter(t => t.completed_date);
        if (completedTasks.length > 0) {
            const totalDays = completedTasks.reduce((sum, task) => {
                const start = new Date(task.created_at);
                const end = new Date(task.completed_date);
                return sum + Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
            }, 0);
            this.stats.avgCompletionTime = Math.round(totalDays / completedTasks.length);
        } else {
            this.stats.avgCompletionTime = 0;
        }

        const ontimeCompleted = completedTasks.filter(t =>
            t.completed_date && t.due_date && new Date(t.completed_date) <= new Date(t.due_date)
        ).length;
        this.stats.ontimeRate = completedTasks.length ?
            Math.round((ontimeCompleted / completedTasks.length) * 100) : 0;

        this.stats.productivityRate = this.stats.total ?
            Math.round((this.stats.completed / this.stats.total) * 100) : 0;

        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        const activeUsers = new Set(
            tasks
                .filter(t => new Date(t.created_at) >= last30Days)
                .map(t => t.assigned_to)
                .filter(id => id)
        );
        this.stats.activeUsers = activeUsers.size;
    }

    updateUI() {
        if (this.elements.totalTasks) {
            this.elements.totalTasks.textContent = this.stats.total;
            this.elements.totalProgress.style.width = '100%';
        }

        if (this.elements.completedTasks) {
            this.elements.completedTasks.textContent = this.stats.completed;
            this.elements.completedPercentage.textContent = `${this.stats.completedPercentage}%`;
            this.elements.completedProgress.style.width = `${this.stats.completedPercentage}%`;
        }

        if (this.elements.pendingTasks) {
            this.elements.pendingTasks.textContent = this.stats.pending;
            this.elements.pendingPercentage.textContent = `${this.stats.pendingPercentage}%`;
            this.elements.pendingProgress.style.width = `${this.stats.pendingPercentage}%`;
        }

        if (this.elements.overdueTasks) {
            this.elements.overdueTasks.textContent = this.stats.overdue;
            this.elements.overduePercentage.textContent = `${this.stats.overduePercentage}%`;
            this.elements.overdueProgress.style.width = `${this.stats.overduePercentage}%`;
        }

        if (this.elements.totalTrend) {
            this.elements.totalTrend.textContent = `${this.stats.totalTrend > 0 ? '+' : ''}${this.stats.totalTrend}%`;
            this.elements.totalTrend.className = `report-card-trend ${this.stats.totalTrend >= 0 ? 'positive' : 'negative'}`;
        }
        if (this.elements.completedTrend) {
            this.elements.completedTrend.textContent = `${this.stats.completedTrend > 0 ? '+' : ''}${this.stats.completedTrend}%`;
            this.elements.completedTrend.className = `report-card-trend ${this.stats.completedTrend >= 0 ? 'positive' : 'negative'}`;
        }
        if (this.elements.pendingTrend) {
            this.elements.pendingTrend.textContent = `${this.stats.pendingTrend > 0 ? '+' : ''}${this.stats.pendingTrend}%`;
            this.elements.pendingTrend.className = `report-card-trend ${this.stats.pendingTrend <= 0 ? 'positive' : 'negative'}`;
        }
        if (this.elements.overdueTrend) {
            this.elements.overdueTrend.textContent = `${this.stats.overdueTrend > 0 ? '+' : ''}${this.stats.overdueTrend}%`;
            this.elements.overdueTrend.className = `report-card-trend ${this.stats.overdueTrend <= 0 ? 'positive' : 'negative'}`;
        }

        if (this.elements.avgCompletionTime) {
            this.elements.avgCompletionTime.textContent = `${this.stats.avgCompletionTime} gün`;
        }
        if (this.elements.productivityRate) {
            this.elements.productivityRate.textContent = `${this.stats.productivityRate}%`;
        }
        if (this.elements.ontimeRate) {
            this.elements.ontimeRate.textContent = `${this.stats.ontimeRate}%`;
        }
        if (this.elements.activeUsers) {
            this.elements.activeUsers.textContent = this.stats.activeUsers;
        }
        if (this.elements.totalRevenue) {
            this.elements.totalRevenue.textContent = this.formatMoney(this.stats.totalRevenue);
        }
        if (this.elements.totalProfit) {
            this.elements.totalProfit.textContent = this.formatMoney(this.stats.totalProfit);
        }

        this.updateCompanyStats();
        this.updateDepartmentStats();
        this.updateEmployeeStats();
        this.updateTaskTypeStats();
        this.updatePartnerStats();
        this.updateTasksTable();
        this.updatePartnerTasksTable();
        this.updateArchiveTasksTable();
    }

    // ========== STATİSTİKALAR ==========
    clearSearchResultCount(listElement) {
        if (!listElement || !listElement.parentNode) return;
        const oldCount = listElement.parentNode.querySelector('.search-result-count');
        if (oldCount) oldCount.remove();
    }

    resetStatsListScroll(listElement) {
        if (!listElement) return;
        listElement.scrollTop = 0;
    }

    updateCompanyStats() {
        if (!this.elements.companyStats) return;
        this.clearSearchResultCount(this.elements.companyStats);

        const companies = this.data.companies || [];
        const tasks = this.data.tasks || [];

        if (companies.length === 0) {
            this.elements.companyStats.innerHTML = '<div class="empty-state small">Şirkət məlumatı yoxdur</div>';
            return;
        }

        // Şirkətləri unikal et (ID-yə görə)
        const uniqueCompanies = [];
        const seenIds = new Set();

        companies.forEach(company => {
            if (!seenIds.has(company.id)) {
                seenIds.add(company.id);
                uniqueCompanies.push(company);
            }
        });

        // YENİ: Axtarış filteri tətbiq et
        const searchTerm = this.searchFilters.companies || '';
        let filteredCompanies = uniqueCompanies;

        if (searchTerm) {
            filteredCompanies = uniqueCompanies.filter(company => {
                const companyName = (company.company_name || company.name || '').toLowerCase();
                const companyCode = (company.company_code || company.code || '').toLowerCase();
                return companyName.includes(searchTerm) || companyCode.includes(searchTerm);
            });
        }

        const companyTaskCounts = {};
        tasks.forEach(task => {
            if (task.company_id) {
                companyTaskCounts[task.company_id] = (companyTaskCounts[task.company_id] || 0) + 1;
            }
        });

        const totalTasks = tasks.length;

        // BÜTÜN şirkətləri göstər (filterlənmiş)
        let html = '';
        filteredCompanies.forEach(company => {
            const companyId = company.id;
            const taskCount = companyTaskCounts[companyId] || 0;
            const percentage = totalTasks ? Math.round((taskCount / totalTasks) * 100) : 0;

            const completedCount = tasks.filter(t =>
                t.company_id === companyId && t.status === 'completed'
            ).length;
            const completedPercent = taskCount ? Math.round((completedCount / taskCount) * 100) : 0;

            const companyName = company.company_name || company.name || 'Adsız';
            const companyCode = company.company_code || company.code || '';

            // Relationship type-a görə fərqli rəng
            let avatarColor = 'linear-gradient(135deg, #3b82f6, #2563eb)'; // mavi - öz şirkət
            if (company.relationship_type === 'parent') {
                avatarColor = 'linear-gradient(135deg, #8b5cf6, #6366f1)'; // bənövşəyi - ana şirkət
            } else if (company.relationship_type === 'child') {
                avatarColor = 'linear-gradient(135deg, #10b981, #059669)'; // yaşıl - alt şirkət
            }

            html += `
                <div class="stat-item" onclick="reportManager.showCompanyDetails(${companyId})">
                    <div class="stat-avatar" style="background: ${avatarColor};">
                        ${companyName.charAt(0).toUpperCase()}
                    </div>
                    <div class="stat-info">
                        <span class="stat-name">${companyName}</span>
                        <span class="stat-code">${companyCode}</span>
                        <div class="stat-progress">
                            <div class="progress-sm">
                                <div class="progress-sm-fill" style="width: ${percentage}%"></div>
                            </div>
                            <span class="stat-count">${taskCount} task</span>
                            <span class="stat-percent">${completedPercent}% tamam</span>
                        </div>
                    </div>
                </div>
            `;
        });

        // Nəticə tapılmadısa
        if (filteredCompanies.length === 0) {
            this.elements.companyStats.innerHTML = `<div class="empty-state small">"${searchTerm}" üzrə nəticə tapılmadı</div>`;
        } else {
            this.elements.companyStats.innerHTML = html;
        }
        this.resetStatsListScroll(this.elements.companyStats);

        // YENİ: Nəticə sayını göstər (əgər filter varsa)
        if (searchTerm && this.elements.companyStats) {
            const resultCount = document.createElement('div');
            resultCount.className = 'search-result-count';
            resultCount.innerHTML = `<small>${filteredCompanies.length} nəticə tapıldı</small>`;

            // Əvvəlki result count-u sil
            const oldCount = this.elements.companyStats.parentNode.querySelector('.search-result-count');
            if (oldCount) oldCount.remove();

            this.elements.companyStats.parentNode.insertBefore(resultCount, this.elements.companyStats);
        }
    }

    updateDepartmentStats() {
        if (!this.elements.departmentStats) return;
        this.clearSearchResultCount(this.elements.departmentStats);

        const departments = this.data.departments || [];
        const tasks = this.data.tasks || [];

        if (departments.length === 0) {
            this.elements.departmentStats.innerHTML = '<div class="empty-state small">Şöbə məlumatı yoxdur</div>';
            return;
        }

        // YENİ: Axtarış filteri tətbiq et
        const searchTerm = this.searchFilters.departments || '';
        let filteredDepartments = departments;

        if (searchTerm) {
            filteredDepartments = departments.filter(dept => {
                const deptName = (dept.name || '').toLowerCase();
                const deptCode = (dept.code || '').toLowerCase();
                return deptName.includes(searchTerm) || deptCode.includes(searchTerm);
            });
        }

        const deptTaskCounts = {};
        tasks.forEach(task => {
            if (task.department_id) {
                deptTaskCounts[task.department_id] = (deptTaskCounts[task.department_id] || 0) + 1;
            }
        });

        const totalTasks = tasks.length;

        // BÜTÜN departamentləri göstər (filterlənmiş)
        let html = '';
        filteredDepartments.forEach(dept => {
            const taskCount = deptTaskCounts[dept.id] || 0;
            const percentage = totalTasks ? Math.round((taskCount / totalTasks) * 100) : 0;

            const completedCount = tasks.filter(t =>
                t.department_id === dept.id && t.status === 'completed'
            ).length;
            const completedPercent = taskCount ? Math.round((completedCount / taskCount) * 100) : 0;

            html += `
                <div class="stat-item">
                    <div class="stat-avatar" style="background: linear-gradient(135deg, #8b5cf6, #6366f1);">
                        ${dept.name ? dept.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div class="stat-info">
                        <span class="stat-name">${dept.name || 'Adsız'}</span>
                        <div class="stat-progress">
                            <div class="progress-sm">
                                <div class="progress-sm-fill" style="width: ${percentage}%"></div>
                            </div>
                            <span class="stat-count">${taskCount} task</span>
                            <span class="stat-percent">${completedPercent}%</span>
                        </div>
                    </div>
                </div>
            `;
        });

        // Nəticə tapılmadısa
        if (filteredDepartments.length === 0) {
            this.elements.departmentStats.innerHTML = `<div class="empty-state small">"${searchTerm}" üzrə nəticə tapılmadı</div>`;
        } else {
            this.elements.departmentStats.innerHTML = html;
        }
        this.resetStatsListScroll(this.elements.departmentStats);

        // Nəticə sayını göstər
        if (searchTerm) {
            const resultCount = document.createElement('div');
            resultCount.className = 'search-result-count';
            resultCount.innerHTML = `<small>${filteredDepartments.length} nəticə tapıldı</small>`;

            const oldCount = this.elements.departmentStats.parentNode.querySelector('.search-result-count');
            if (oldCount) oldCount.remove();

            this.elements.departmentStats.parentNode.insertBefore(resultCount, this.elements.departmentStats);
        }
    }

    updateEmployeeStats() {
        if (!this.elements.employeeStats) return;
        this.clearSearchResultCount(this.elements.employeeStats);

        const employees = this.data.employees || [];
        const tasks = this.data.tasks || [];

        if (employees.length === 0) {
            this.elements.employeeStats.innerHTML = '<div class="empty-state small">İşçi məlumatı yoxdur</div>';
            return;
        }

        // YENİ: Axtarış filteri tətbiq et
        const searchTerm = this.searchFilters.employees || '';
        let filteredEmployees = employees;

        if (searchTerm) {
            filteredEmployees = employees.filter(emp => {
                const fullName = (emp.name && emp.surname ?
                    `${emp.name} ${emp.surname}` :
                    (emp.name || emp.ceo_name || '')).toLowerCase();
                const position = (emp.position || '').toLowerCase();
                const department = (emp.department_name || emp.departmentName || '').toLowerCase();
                return fullName.includes(searchTerm) ||
                       position.includes(searchTerm) ||
                       department.includes(searchTerm);
            });
        }

        const empTaskCounts = {};
        const empCompletedCounts = {};

        tasks.forEach(task => {
            if (task.assigned_to) {
                empTaskCounts[task.assigned_to] = (empTaskCounts[task.assigned_to] || 0) + 1;
                if (task.status === 'completed') {
                    empCompletedCounts[task.assigned_to] = (empCompletedCounts[task.assigned_to] || 0) + 1;
                }
            }
        });

        const totalTasks = tasks.length;

        // BÜTÜN işçiləri göstər (filterlənmiş)
        let html = '';
        filteredEmployees.forEach(emp => {
            const empId = emp.id;
            const taskCount = empTaskCounts[empId] || 0;
            const completedCount = empCompletedCounts[empId] || 0;
            const percentage = totalTasks ? Math.round((taskCount / totalTasks) * 100) : 0;
            const completedPercent = taskCount ? Math.round((completedCount / taskCount) * 100) : 0;

            const fullName = emp.name && emp.surname ?
                `${emp.name} ${emp.surname}` :
                (emp.name || emp.ceo_name || 'Adsız');

            const initials = (emp.name || emp.ceo_name || '?').charAt(0).toUpperCase();
            const departmentName = emp.department_name || emp.departmentName || '';

            html += `
                <div class="stat-item" onclick="openUserReport(${empId})">
                    <div class="stat-avatar" style="background: linear-gradient(135deg, #ec4899, #f43f5e);">
                        ${initials}
                    </div>
                    <div class="stat-info">
                        <span class="stat-name">${fullName}</span>
                        <span class="stat-dept">${departmentName}</span>
                        <div class="stat-progress">
                            <div class="progress-sm">
                                <div class="progress-sm-fill" style="width: ${percentage}%"></div>
                            </div>
                            <span class="stat-count">${completedCount}/${taskCount}</span>
                            <span class="stat-percent">${completedPercent}%</span>
                        </div>
                    </div>
                </div>
            `;
        });

        // Nəticə tapılmadısa
        if (filteredEmployees.length === 0) {
            this.elements.employeeStats.innerHTML = `<div class="empty-state small">"${searchTerm}" üzrə nəticə tapılmadı</div>`;
        } else {
            this.elements.employeeStats.innerHTML = html;
        }
        this.resetStatsListScroll(this.elements.employeeStats);

        // Nəticə sayını göstər
        if (searchTerm) {
            const resultCount = document.createElement('div');
            resultCount.className = 'search-result-count';
            resultCount.innerHTML = `<small>${filteredEmployees.length} nəticə tapıldı</small>`;

            const oldCount = this.elements.employeeStats.parentNode.querySelector('.search-result-count');
            if (oldCount) oldCount.remove();

            this.elements.employeeStats.parentNode.insertBefore(resultCount, this.elements.employeeStats);
        }
    }

    updateTaskTypeStats() {
        if (!this.elements.taskTypeStats) return;
        this.clearSearchResultCount(this.elements.taskTypeStats);

        const taskTypes = this.data.taskTypes || [];
        const tasks = this.data.tasks || [];

        if (taskTypes.length === 0) {
            this.elements.taskTypeStats.innerHTML = '<div class="empty-state small">İş növü məlumatı yoxdur</div>';
            return;
        }

        // YENİ: Axtarış filteri tətbiq et
        const searchTerm = this.searchFilters.taskTypes || '';
        let filteredTaskTypes = taskTypes;

        if (searchTerm) {
            filteredTaskTypes = taskTypes.filter(type => {
                const typeName = (type.name || '').toLowerCase();
                const typeCode = (type.code || '').toLowerCase();
                return typeName.includes(searchTerm) || typeCode.includes(searchTerm);
            });
        }

        const typeCounts = {};
        tasks.forEach(task => {
            if (task.work_type_id) {
                typeCounts[task.work_type_id] = (typeCounts[task.work_type_id] || 0) + 1;
            }
        });

        const totalTasks = tasks.length;

        // BÜTÜN iş növlərini göstər (filterlənmiş)
        let html = '';
        filteredTaskTypes.forEach(type => {
            const taskCount = typeCounts[type.id] || 0;
            const percentage = totalTasks ? Math.round((taskCount / totalTasks) * 100) : 0;

            html += `
                <div class="stat-item">
                    <div class="stat-avatar" style="background: linear-gradient(135deg, #14b8a6, #06b6d4);">
                        ${type.name ? type.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div class="stat-info">
                        <span class="stat-name">${type.name || 'Adsız'}</span>
                        <span class="stat-rate">${type.hourly_rate || 0} ₼/saat</span>
                        <div class="stat-progress">
                            <div class="progress-sm">
                                <div class="progress-sm-fill" style="width: ${percentage}%"></div>
                            </div>
                            <span class="stat-count">${taskCount} task</span>
                        </div>
                    </div>
                </div>
            `;
        });

        // Nəticə tapılmadısa
        if (filteredTaskTypes.length === 0) {
            this.elements.taskTypeStats.innerHTML = `<div class="empty-state small">"${searchTerm}" üzrə nəticə tapılmadı</div>`;
        } else {
            this.elements.taskTypeStats.innerHTML = html;
        }
        this.resetStatsListScroll(this.elements.taskTypeStats);

        // Nəticə sayını göstər
        if (searchTerm) {
            const resultCount = document.createElement('div');
            resultCount.className = 'search-result-count';
            resultCount.innerHTML = `<small>${filteredTaskTypes.length} nəticə tapıldı</small>`;

            const oldCount = this.elements.taskTypeStats.parentNode.querySelector('.search-result-count');
            if (oldCount) oldCount.remove();

            this.elements.taskTypeStats.parentNode.insertBefore(resultCount, this.elements.taskTypeStats);
        }
    }

    updatePartnerStats() {
        if (!this.elements.partnerStats) return;
        this.clearSearchResultCount(this.elements.partnerStats);

        const partners = this.data.partners || [];
        const partnerTasks = this.data.partnerTasks || [];

        if (partners.length === 0) {
            this.elements.partnerStats.innerHTML = '<div class="empty-state small">Partner məlumatı yoxdur</div>';
            return;
        }

        // Partnerləri unikal et
        const uniquePartners = [];
        const seenIds = new Set();

        partners.forEach(partner => {
            const partnerId = partner.partner_company_id || partner.id;
            if (!seenIds.has(partnerId)) {
                seenIds.add(partnerId);
                uniquePartners.push(partner);
            }
        });

        // YENİ: Axtarış filteri tətbiq et
        const searchTerm = this.searchFilters.partners || '';
        let filteredPartners = uniquePartners;

        if (searchTerm) {
            filteredPartners = uniquePartners.filter(partner => {
                const partnerName = (partner.partner_name ||
                                    partner.partner_company_name ||
                                    partner.name || '').toLowerCase();
                const contactPerson = (partner.contact_person || '').toLowerCase();
                return partnerName.includes(searchTerm) || contactPerson.includes(searchTerm);
            });
        }

        // BÜTÜN partnerləri göstər (filterlənmiş)
        let html = '';
        filteredPartners.forEach(partner => {
            const partnerTaskCount = partnerTasks.filter(t =>
                t.partner_company_id === partner.partner_company_id ||
                t.partner_id === partner.id
            ).length;

            const partnerName = partner.partner_name ||
                               partner.partner_company_name ||
                               partner.name ||
                               'Adsız';

            html += `
                <div class="stat-item">
                    <div class="stat-avatar" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                        ${partnerName.charAt(0).toUpperCase()}
                    </div>
                    <div class="stat-info">
                        <span class="stat-name">${partnerName}</span>
                        <span class="stat-count">${partnerTaskCount} task</span>
                    </div>
                </div>
            `;
        });

        // Nəticə tapılmadısa
        if (filteredPartners.length === 0) {
            this.elements.partnerStats.innerHTML = `<div class="empty-state small">"${searchTerm}" üzrə nəticə tapılmadı</div>`;
        } else {
            this.elements.partnerStats.innerHTML = html;
        }
        this.resetStatsListScroll(this.elements.partnerStats);

        // Nəticə sayını göstər
        if (searchTerm) {
            const resultCount = document.createElement('div');
            resultCount.className = 'search-result-count';
            resultCount.innerHTML = `<small>${filteredPartners.length} nəticə tapıldı</small>`;

            const oldCount = this.elements.partnerStats.parentNode.querySelector('.search-result-count');
            if (oldCount) oldCount.remove();

            this.elements.partnerStats.parentNode.insertBefore(resultCount, this.elements.partnerStats);
        }
    }


    updateTasksTable() {
        if (!this.elements.reportTasksBody) return;

        const tasks = this.data.recentTasks || this.data.tasks?.slice(0, 10) || [];

        if (tasks.length === 0) {
            this.elements.reportTasksBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="8">
                        <div class="empty-state small">
                            <i class="fas fa-chart-bar"></i>
                            <p>Məlumat yoxdur</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        tasks.forEach(task => {
            const statusClass = task.status === 'completed' ? 'success' :
                               task.status === 'pending' ? 'warning' :
                               task.status === 'in_progress' ? 'info' : 'danger';
            const statusText = task.status === 'completed' ? 'Tamamlanıb' :
                              task.status === 'pending' ? 'Gözləmədə' :
                              task.status === 'in_progress' ? 'İcra edilir' : 'Müddəti keçib';
            const statusIcon = task.status === 'completed' ? 'fa-check-circle' :
                              task.status === 'pending' ? 'fa-clock' :
                              task.status === 'in_progress' ? 'fa-spinner' : 'fa-exclamation-triangle';

            html += `
                <tr onclick="reportManager.viewTaskDetails(${task.id})">
                    <td>
                        <div class="task-name">
                            <strong>${task.task_title || task.name || '-'}</strong>
                            <small>${task.task_code || ''}</small>
                        </div>
                    </td>
                    <td>${task.company_name || task.company || '-'}</td>
                    <td>${task.assignee_name || task.executor || '-'}</td>
                    <td>
                        <span class="badge badge-${statusClass}">
                            <i class="fas ${statusIcon}"></i>
                            ${statusText}
                        </span>
                    </td>
                    <td>${task.created_at ? this.formatDate(task.created_at) : '-'}</td>
                    <td>${task.completed_date ? this.formatDate(task.completed_date) : '-'}</td>
                    <td>${task.due_date ? this.formatDate(task.due_date) : '-'}</td>
                    <td>
                        <button class="table-action-btn" onclick="event.stopPropagation(); reportManager.viewTaskDetails(${task.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        this.elements.reportTasksBody.innerHTML = html;
    }

    updatePartnerTasksTable() {
        if (!this.elements.partnerTasksBody) return;

        const tasks = this.data.partnerTasks || [];

        if (tasks.length === 0) {
            this.elements.partnerTasksBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="7">
                        <div class="empty-state small">
                            <i class="fas fa-handshake"></i>
                            <p>Partner tapşırığı yoxdur</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        tasks.slice(0, 10).forEach(task => {
            const statusClass = task.status === 'completed' ? 'success' :
                               task.status === 'pending' ? 'warning' : 'danger';
            const statusText = task.status === 'completed' ? 'Tamamlanıb' :
                              task.status === 'pending' ? 'Gözləmədə' : 'Müddəti keçib';

            html += `
                <tr>
                    <td>${task.task_title || '-'}</td>
                    <td>${task.partner_company_name || '-'}</td>
                    <td>${task.service_type || '-'}</td>
                    <td><span class="badge badge-${statusClass}">${statusText}</span></td>
                    <td>${task.created_at ? this.formatDate(task.created_at) : '-'}</td>
                    <td>${task.actual_cost ? this.formatMoney(task.actual_cost) : '-'}</td>
                    <td>
                        <span class="badge ${task.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}">
                            ${task.payment_status_label || task.payment_status || '-'}
                        </span>
                    </td>
                </tr>
            `;
        });

        this.elements.partnerTasksBody.innerHTML = html;
    }

    updateArchiveTasksTable() {
        if (!this.elements.archiveTasksBody) return;

        const tasks = this.data.archiveTasks || [];

        if (tasks.length === 0) {
            this.elements.archiveTasksBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="6">
                        <div class="empty-state small">
                            <i class="fas fa-archive"></i>
                            <p>Arxiv tapşırığı yoxdur</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        tasks.slice(0, 10).forEach(task => {
            html += `
                <tr>
                    <td>${task.task_title || '-'}</td>
                    <td>${task.company_name || '-'}</td>
                    <td>${task.status || '-'}</td>
                    <td>${task.created_at ? this.formatDate(task.created_at) : '-'}</td>
                    <td>${task.archived_at ? this.formatDate(task.archived_at) : '-'}</td>
                    <td>${task.archive_reason || '-'}</td>
                </tr>
            `;
        });

        this.elements.archiveTasksBody.innerHTML = html;
    }

    updateCharts() {
        this.updateMonthlyChart();
        this.updatePieChart();
    }

    updateMonthlyChart() {
        const ctx = document.getElementById('monthlyTrendChart')?.getContext('2d');
        if (!ctx) return;

        const monthlyData = this.data.monthlyTrend || [];
        const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];

        const completedData = months.map((_, index) => {
            const monthData = monthlyData.find(m => m.month === index + 1);
            return monthData ? monthData.completed_tasks : 0;
        });

        const pendingData = months.map((_, index) => {
            const monthData = monthlyData.find(m => m.month === index + 1);
            return monthData ? monthData.pending_tasks : 0;
        });

        const overdueData = months.map((_, index) => {
            const monthData = monthlyData.find(m => m.month === index + 1);
            return monthData ? monthData.overdue_tasks : 0;
        });

        if (this.charts.monthly) {
            this.charts.monthly.destroy();
        }

        this.charts.monthly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    { label: 'Tamamlanan', data: completedData, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 3, tension: 0.4, fill: true },
                    { label: 'Gözləmədə', data: pendingData, borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 3, tension: 0.4, fill: true },
                    { label: 'Müddəti keçən', data: overdueData, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 3, tension: 0.4, fill: true }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

    updatePieChart() {
        const ctx = document.getElementById('statusPieChart')?.getContext('2d');
        if (!ctx) return;

        if (this.charts.pie) {
            this.charts.pie.destroy();
        }

        this.charts.pie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Tamamlanan', 'Gözləmədə', 'İcra edilir', 'Müddəti keçən'],
                datasets: [{
                    data: [
                        this.stats.completed || 0,
                        this.stats.pending || 0,
                        this.stats.in_progress || 0,
                        this.stats.overdue || 0
                    ],
                    backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    applyDateRange() {
        const startDate = this.elements.startDate?.value;
        const endDate = this.elements.endDate?.value;

        if (startDate) {
            this.dateRange.start = new Date(startDate);
        }
        if (endDate) {
            this.dateRange.end = new Date(endDate);
        }

        this.loadData();
    }

    applyFilters() {
        this.filters = {
            company_id: this.elements.filterCompany?.value || null,
            department_id: this.elements.filterDepartment?.value || null,
            status: this.elements.filterStatus?.value || null,
            priority: this.elements.filterPriority?.value || null
        };

        this.loadData();
        this.showNotification('Filtrlər tətbiq edildi', 'success');
    }

    resetFilters() {
        this.filters = {};

        if (this.elements.filterCompany) this.elements.filterCompany.value = '';
        if (this.elements.filterDepartment) this.elements.filterDepartment.value = '';
        if (this.elements.filterStatus) this.elements.filterStatus.value = '';
        if (this.elements.filterPriority) this.elements.filterPriority.value = '';

        this.loadData();
        this.showNotification('Filtrlər sıfırlandı', 'info');
    }

    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
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

        switch(tabId) {
            case 'companies':
                tabContent.innerHTML = this.generateCompanyDetailTable(true);
                break;
            case 'employees':
                tabContent.innerHTML = this.generateEmployeeDetailTable(true);
                break;
            case 'partners':
                tabContent.innerHTML = this.generatePartnerDetailTable(true);
                break;
            case 'financial':
                tabContent.innerHTML = this.generateFinancialTable();
                break;
        }
    }

    // ========== DETALLI CƏDVƏLLƏR ==========

    generateCompanyDetailTable(full = false) {
        const companies = this.data.companies || [];
        const tasks = this.data.tasks || [];

        if (companies.length === 0) {
            return '<div class="empty-state">Şirkət məlumatı yoxdur</div>';
        }

        let rows = '';
        companies.forEach(company => {
            const companyTasks = tasks.filter(t => t.company_id === company.id);
            const totalTasks = companyTasks.length;
            const completed = companyTasks.filter(t => t.status === 'completed').length;
            const pending = companyTasks.filter(t => t.status === 'pending').length;
            const inProgress = companyTasks.filter(t => t.status === 'in_progress').length;
            const overdue = companyTasks.filter(t =>
                t.status === 'overdue' || (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed')
            ).length;

            const completedPercent = totalTasks ? Math.round((completed / totalTasks) * 100) : 0;
            const pendingPercent = totalTasks ? Math.round((pending / totalTasks) * 100) : 0;
            const overduePercent = totalTasks ? Math.round((overdue / totalTasks) * 100) : 0;

            rows += `
                <tr onclick="reportManager.showCompanyDetails(${company.id})">
                    <td><strong>${company.company_name || company.name || 'Adsız'}</strong></td>
                    <td>${company.company_code || '-'}</td>
                    <td>${totalTasks}</td>
                    <td class="text-success">${completed} (${completedPercent}%)</td>
                    <td class="text-warning">${pending} (${pendingPercent}%)</td>
                    <td class="text-info">${inProgress}</td>
                    <td class="text-danger">${overdue} (${overduePercent}%)</td>
                </tr>
            `;
        });

        return `
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>Şirkət</th>
                        <th>Kod</th>
                        <th>Ümumi</th>
                        <th>Tamamlanan</th>
                        <th>Gözləmədə</th>
                        <th>İcra edilir</th>
                        <th>Müddəti keçən</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    generateEmployeeDetailTable(full = false) {
        const employees = this.data.employees || [];
        const tasks = this.data.tasks || [];

        if (employees.length === 0) {
            return '<div class="empty-state">İşçi məlumatı yoxdur</div>';
        }

        let rows = '';
        employees.forEach(emp => {
            const empTasks = tasks.filter(t => t.assigned_to === emp.id);
            const totalTasks = empTasks.length;
            const completed = empTasks.filter(t => t.status === 'completed').length;
            const pending = empTasks.filter(t => t.status === 'pending').length;
            const overdue = empTasks.filter(t =>
                t.status === 'overdue' || (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed')
            ).length;

            const completedPercent = totalTasks ? Math.round((completed / totalTasks) * 100) : 0;
            const fullName = emp.name && emp.surname ?
                `${emp.name} ${emp.surname}` :
                (emp.name || emp.ceo_name || 'Adsız');

            rows += `
                <tr onclick="reportManager.showEmployeeDetails(${emp.id})">
                    <td><strong>${fullName}</strong></td>
                    <td>${emp.department_name || emp.departmentName || '-'}</td>
                    <td>${emp.position || '-'}</td>
                    <td>${totalTasks}</td>
                    <td class="text-success">${completed}</td>
                    <td class="text-warning">${pending}</td>
                    <td class="text-danger">${overdue}</td>
                    <td>${completedPercent}%</td>
                </tr>
            `;
        });

        return `
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>İşçi</th>
                        <th>Şöbə</th>
                        <th>Vəzifə</th>
                        <th>Ümumi</th>
                        <th>Tamamlanan</th>
                        <th>Gözləmədə</th>
                        <th>Müddəti keçən</th>
                        <th>Tamamlanma %</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    generatePartnerDetailTable(full = false) {
        const partners = this.data.partners || [];
        const partnerTasks = this.data.partnerTasks || [];

        if (partners.length === 0) {
            return '<div class="empty-state">Partner məlumatı yoxdur</div>';
        }

        let rows = '';
        partners.forEach(partner => {
            const tasks = partnerTasks.filter(t =>
                t.partner_company_id === partner.id ||
                t.partner_id === partner.id
            );
            const totalTasks = tasks.length;
            const completed = tasks.filter(t => t.status === 'completed').length;
            const paid = tasks.filter(t => t.payment_status === 'paid').length;
            const totalCost = tasks.reduce((sum, t) => sum + (t.actual_cost || 0), 0);

            const partnerName = partner.partner_name ||
                               partner.partner_company_name ||
                               partner.name ||
                               'Adsız';

            rows += `
                <tr>
                    <td><strong>${partnerName}</strong></td>
                    <td>${partner.contact_person || '-'}</td>
                    <td>${partner.contact_phone || '-'}</td>
                    <td>${totalTasks}</td>
                    <td class="text-success">${completed}</td>
                    <td class="text-info">${paid}</td>
                    <td>${this.formatMoney(totalCost)}</td>
                </tr>
            `;
        });

        return `
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>Partner şirkət</th>
                        <th>Əlaqə şəxs</th>
                        <th>Telefon</th>
                        <th>Ümumi task</th>
                        <th>Tamamlanan</th>
                        <th>Ödənilən</th>
                        <th>Ümumi məbləğ</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    generateFinancialTable() {
        const financial = this.data.financial || {};
        const tasks = this.data.tasks || [];
        const companies = this.data.companies || [];

        let companyRows = '';
        companies.slice(0, 5).forEach(company => {
            const companyTasks = tasks.filter(t => t.company_id === company.id);
            const revenue = companyTasks.reduce((sum, t) => sum + (t.is_billable ? (t.billing_rate || 0) * (t.actual_hours || 0) : 0), 0);
            const cost = companyTasks.reduce((sum, t) => sum + ((t.actual_hours || 0) * 50), 0);
            const taskCount = companyTasks.length;

            companyRows += `
                <tr>
                    <td>${company.company_name || company.name || '-'}</td>
                    <td>${taskCount}</td>
                    <td>${this.formatMoney(revenue)}</td>
                    <td>${this.formatMoney(cost)}</td>
                    <td>${this.formatMoney(revenue - cost)}</td>
                    <td>${taskCount ? Math.round(((revenue - cost) / revenue) * 100) : 0}%</td>
                </tr>
            `;
        });

        return `
            <h4>Ümumi maliyyə göstəriciləri</h4>
            <div class="financial-summary-cards">
                <div class="summary-card">
                    <div class="summary-card-label">Ümumi gəlir</div>
                    <div class="summary-card-value">${this.formatMoney(financial.total_revenue || 0)}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-label">Ümumi xərc</div>
                    <div class="summary-card-value">${this.formatMoney(financial.total_cost || 0)}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-label">Xalis mənfəət</div>
                    <div class="summary-card-value">${this.formatMoney(financial.total_profit || 0)}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-label">Mənfəət marjası</div>
                    <div class="summary-card-value">${financial.profit_margin || 0}%</div>
                </div>
            </div>

            <h4 style="margin-top: 30px;">Şirkətlər üzrə maliyyə</h4>
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>Şirkət</th>
                        <th>Task sayı</th>
                        <th>Gəlir</th>
                        <th>Xərc</th>
                        <th>Mənfəət</th>
                        <th>Marja</th>
                    </tr>
                </thead>
                <tbody>
                    ${companyRows || '<tr><td colspan="6" class="text-center">Məlumat yoxdur</td></tr>'}
                </tbody>
            </table>
        `;
    }

    generateFullReport() {
        const startDate = this.formatDate(this.dateRange.start);
        const endDate = this.formatDate(this.dateRange.end);

        const employees = this.data.employees || [];
        const tasks = this.data.tasks || [];

        const employeePerformance = employees.map(emp => {
            const empTasks = tasks.filter(t => t.assigned_to === emp.id);
            return {
                ...emp,
                completed: empTasks.filter(t => t.status === 'completed').length,
                total: empTasks.length
            };
        }).sort((a, b) => b.completed - a.completed).slice(0, 5);

        const topEmployeesList = employeePerformance.map(emp => {
            const fullName = emp.name && emp.surname ?
                `${emp.name} ${emp.surname}` :
                (emp.name || emp.ceo_name || 'Adsız');
            return `<li>${fullName} (${emp.department_name || emp.departmentName || '-'}) - ${emp.completed} tamamlanan tapşırıq</li>`;
        }).join('');

        const companies = this.data.companies || [];
        const companyPerformance = companies.map(comp => {
            const compTasks = tasks.filter(t => t.company_id === comp.id);
            return {
                ...comp,
                completed: compTasks.filter(t => t.status === 'completed').length,
                total: compTasks.length
            };
        }).sort((a, b) => b.completed - a.completed).slice(0, 5);

        const topCompaniesList = companyPerformance.map(comp =>
            `<li>${comp.company_name || comp.name || 'Adsız'} - ${comp.completed} tamamlanan tapşırıq</li>`
        ).join('');

        return `
            <div class="full-report">
                <div class="report-period">
                    <i class="fas fa-calendar-alt"></i>
                    <strong>Hesabat dövrü:</strong> ${startDate} - ${endDate}
                </div>
                
                <div class="report-summary-cards">
                    <div class="summary-card">
                        <div class="summary-card-label">Ümumi tapşırıqlar</div>
                        <div class="summary-card-value">${this.stats.total}</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-card-label">Tamamlanan</div>
                        <div class="summary-card-value">${this.stats.completed}</div>
                        <small>${this.stats.completedPercentage}%</small>
                    </div>
                    <div class="summary-card">
                        <div class="summary-card-label">Gözləmədə</div>
                        <div class="summary-card-value">${this.stats.pending}</div>
                        <small>${this.stats.pendingPercentage}%</small>
                    </div>
                    <div class="summary-card">
                        <div class="summary-card-label">Müddəti keçən</div>
                        <div class="summary-card-value">${this.stats.overdue}</div>
                        <small>${this.stats.overduePercentage}%</small>
                    </div>
                </div>
                
                <div class="report-section">
                    <h4><i class="fas fa-chart-line"></i> Əsas göstəricilər</h4>
                    <div class="key-metrics">
                        <div class="metric-item">
                            <span class="metric-label">Orta icra müddəti:</span>
                            <span class="metric-value">${this.stats.avgCompletionTime} gün</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Məhsuldarlıq dərəcəsi:</span>
                            <span class="metric-value">${this.stats.productivityRate}%</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Vaxtında tamamlanma:</span>
                            <span class="metric-value">${this.stats.ontimeRate}%</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Aktiv işçilər:</span>
                            <span class="metric-value">${this.stats.activeUsers}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Ümumi gəlir:</span>
                            <span class="metric-value">${this.formatMoney(this.stats.totalRevenue)}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Xalis mənfəət:</span>
                            <span class="metric-value">${this.formatMoney(this.stats.totalProfit)}</span>
                        </div>
                    </div>
                </div>
                
                <h4><i class="fas fa-building"></i> Şirkətlər üzrə statistika</h4>
                ${this.generateCompanyDetailTable(true)}
                
                <h4><i class="fas fa-users"></i> İşçilər üzrə statistika</h4>
                ${this.generateEmployeeDetailTable(true)}
                
                <div class="report-grid">
                    <div class="report-grid-item">
                        <h4><i class="fas fa-star"></i> Ən aktiv işçilər</h4>
                        <ol class="top-list">
                            ${topEmployeesList || '<li>Məlumat yoxdur</li>'}
                        </ol>
                    </div>
                    
                    <div class="report-grid-item">
                        <h4><i class="fas fa-building"></i> Ən aktiv şirkətlər</h4>
                        <ol class="top-list">
                            ${topCompaniesList || '<li>Məlumat yoxdur</li>'}
                        </ol>
                    </div>
                </div>

                <h4><i class="fas fa-handshake"></i> Partner statistikası</h4>
                ${this.generatePartnerDetailTable(true)}

                <h4><i class="fas fa-chart-pie"></i> Maliyyə hesabatı</h4>
                ${this.generateFinancialTable()}
            </div>
        `;
    }

    // ========== DETALLARI GÖSTƏR ==========

    async showCompanyDetails(companyId) {
        this.showLoading();

        try {
            const reportData = await this.fetchCompanyReport(companyId, this.dateRange);

            if (reportData) {
                const company = reportData.company || {};
                const companyName = company.company_name || company.name || 'Şirkət';

                let content = '<div class="company-detail">';
                content += `<h3>${companyName}</h3>`;
                content += `<p>Kod: ${company.company_code || company.code || '-'}</p>`;

                if (reportData.tasks && reportData.tasks.length > 0) {
                    content += '<h4>Tapşırıqlar</h4>';
                    content += '<table class="detail-table"><thead><tr><th>Tapşırıq</th><th>Status</th><th>Tarix</th></tr></thead><tbody>';
                    reportData.tasks.slice(0, 10).forEach(task => {
                        content += `<tr><td>${task.task_title || '-'}</td><td>${task.status || '-'}</td><td>${task.created_at ? this.formatDate(task.created_at) : '-'}</td></tr>`;
                    });
                    content += '</tbody></table>';
                } else {
                    content += '<p>Tapşırıq yoxdur</p>';
                }

                content += '</div>';

                this.showDetailModal('custom', companyName, content);
            }
        } catch (error) {
            console.error('showCompanyDetails xətası:', error);
            this.showError('Şirkət məlumatları yüklənərkən xəta');
        } finally {
            this.hideLoading();
        }
    }

    async showEmployeeDetails(employeeId) {
        this.showLoading();

        try {
            const reportData = await this.fetchEmployeeReport(employeeId, this.dateRange);

            if (reportData) {
                const employee = reportData.employee || {};
                const fullName = employee.name && employee.surname ?
                    `${employee.name} ${employee.surname}` :
                    (employee.name || employee.ceo_name || 'İşçi');

                let content = '<div class="employee-detail">';
                content += `<h3>${fullName}</h3>`;
                content += `<p>Vəzifə: ${employee.position || '-'} | Şöbə: ${employee.department_name || '-'}</p>`;

                if (reportData.tasks && reportData.tasks.length > 0) {
                    content += '<h4>Tapşırıqlar</h4>';
                    content += '<table class="detail-table"><thead><tr><th>Tapşırıq</th><th>Status</th><th>Tarix</th></tr></thead><tbody>';
                    reportData.tasks.slice(0, 10).forEach(task => {
                        content += `<tr><td>${task.task_title || '-'}</td><td>${task.status || '-'}</td><td>${task.created_at ? this.formatDate(task.created_at) : '-'}</td></tr>`;
                    });
                    content += '</tbody></table>';
                } else {
                    content += '<p>Tapşırıq yoxdur</p>';
                }

                content += '</div>';

                this.showDetailModal('custom', fullName, content);
            }
        } catch (error) {
            console.error('showEmployeeDetails xətası:', error);
            this.showError('İşçi məlumatları yüklənərkən xəta');
        } finally {
            this.hideLoading();
        }
    }

    showAllCompanies() {
        const title = '<i class="fas fa-building"></i> Bütün Şirkətlər';
        const content = this.generateCompanyDetailTable(true);
        this.showDetailModal('custom', title, content);
    }

    showAllDepartments() {
        const departments = this.data.departments || [];

        let html = '<table class="detail-table"><thead><tr><th>Şöbə</th><th>Kod</th><th>Status</th></tr></thead><tbody>';
        departments.forEach(dept => {
            html += `<tr><td>${dept.name || 'Adsız'}</td><td>${dept.code || '-'}</td><td>${dept.is_active ? 'Aktiv' : 'Deaktiv'}</td></tr>`;
        });
        html += '</tbody></table>';

        this.showDetailModal('custom', '<i class="fas fa-sitemap"></i> Bütün Şöbələr', html);
    }

    showAllEmployees() {
        const title = '<i class="fas fa-users"></i> Bütün İşçilər';
        const content = this.generateEmployeeDetailTable(true);
        this.showDetailModal('custom', title, content);
    }

    showAllTaskTypes() {
        const taskTypes = this.data.taskTypes || [];

        let html = '<table class="detail-table"><thead><tr><th>İş növü</th><th>Kod</th><th>Qiymət</th></tr></thead><tbody>';
        taskTypes.forEach(type => {
            html += `<tr><td>${type.name || 'Adsız'}</td><td>${type.code || '-'}</td><td>${type.hourly_rate || 0} ₼/saat</td></tr>`;
        });
        html += '</tbody></table>';

        this.showDetailModal('custom', '<i class="fas fa-tag"></i> Bütün İş Növləri', html);
    }

    showAllPartners() {
        const title = '<i class="fas fa-handshake"></i> Bütün Partnerlər';
        const content = this.generatePartnerDetailTable(true);
        this.showDetailModal('custom', title, content);
    }

    showDetailModal(type, title, content) {
        if (!this.elements.reportModal || !this.elements.modalBody) return;

        if (this.elements.modalTitle) {
            this.elements.modalTitle.innerHTML = title;
        }
        this.elements.modalBody.innerHTML = content;
        this.elements.reportModal.classList.add('active');
    }

    toggleExpand(btn) {
        const reportSection = document.getElementById('reportTableSection');
        if (reportSection && reportSection.contains(btn)) {
            return;
        }

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

    closeModal() {
        if (this.elements.reportModal) {
            this.elements.reportModal.classList.remove('active');
        }
    }

    // ========== EXPORT/PRINT ==========

    async exportReport() {
        if (typeof XLSX === 'undefined') {
            this.showError('XLSX kitabxanası yüklənməyib');
            return;
        }

        try {
            this.showLoading();

            const wb = XLSX.utils.book_new();

            const summaryData = [
                ['Metrik', 'Dəyər'],
                ['Ümumi tapşırıqlar', this.stats.total],
                ['Tamamlanan', this.stats.completed],
                ['Gözləmədə', this.stats.pending],
                ['İcra edilir', this.stats.in_progress],
                ['Müddəti keçən', this.stats.overdue],
                ['Tamamlanma faizi', `${this.stats.productivityRate}%`],
                ['Ortalama icra müddəti', `${this.stats.avgCompletionTime} gün`],
                ['Vaxtında tamamlanma', `${this.stats.ontimeRate}%`],
                ['Aktiv işçilər', this.stats.activeUsers],
                ['Ümumi gəlir', this.stats.totalRevenue],
                ['Xalis mənfəət', this.stats.totalProfit]
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Xülasə');

            const companyData = [
                ['Şirkət', 'Kod', 'Ümumi', 'Tamamlanan', 'Gözləmədə', 'İcra edilir', 'Müddəti keçən', 'Tamamlanma %', 'Gəlir'],
                ...this.data.companies.map(c => {
                    const companyTasks = this.data.tasks.filter(t => t.company_id === c.id);
                    const total = companyTasks.length;
                    const completed = companyTasks.filter(t => t.status === 'completed').length;
                    const revenue = companyTasks.reduce((sum, t) => sum + (t.is_billable ? (t.billing_rate || 0) * (t.actual_hours || 0) : 0), 0);

                    return [
                        c.company_name || c.name || '-',
                        c.company_code || c.code || '-',
                        total,
                        completed,
                        companyTasks.filter(t => t.status === 'pending').length,
                        companyTasks.filter(t => t.status === 'in_progress').length,
                        companyTasks.filter(t => t.status === 'overdue').length,
                        total ? Math.round((completed / total) * 100) + '%' : '0%',
                        revenue
                    ];
                })
            ];
            const wsCompanies = XLSX.utils.aoa_to_sheet(companyData);
            XLSX.utils.book_append_sheet(wb, wsCompanies, 'Şirkətlər');

            const employeeData = [
                ['İşçi', 'Şöbə', 'Vəzifə', 'Ümumi', 'Tamamlanan', 'Gözləmədə', 'Müddəti keçən', 'Tamamlanma %', 'Gəlir'],
                ...this.data.employees.map(e => {
                    const empTasks = this.data.tasks.filter(t => t.assigned_to === e.id);
                    const total = empTasks.length;
                    const completed = empTasks.filter(t => t.status === 'completed').length;
                    const revenue = empTasks.reduce((sum, t) => sum + (t.is_billable ? (t.billing_rate || 0) * (t.actual_hours || 0) : 0), 0);
                    const fullName = e.name && e.surname ?
                        `${e.name} ${e.surname}` :
                        (e.name || e.ceo_name || 'Adsız');

                    return [
                        fullName,
                        e.department_name || e.departmentName || '-',
                        e.position || '-',
                        total,
                        completed,
                        empTasks.filter(t => t.status === 'pending').length,
                        empTasks.filter(t => t.status === 'overdue').length,
                        total ? Math.round((completed / total) * 100) + '%' : '0%',
                        revenue
                    ];
                })
            ];
            const wsEmployees = XLSX.utils.aoa_to_sheet(employeeData);
            XLSX.utils.book_append_sheet(wb, wsEmployees, 'İşçilər');

            const partnerData = [
                ['Partner', 'Əlaqə şəxs', 'Telefon', 'Ümumi task', 'Tamamlanan', 'Ödənilən', 'Ümumi məbləğ'],
                ...this.data.partners.map(p => {
                    const partnerTasks = this.data.partnerTasks.filter(t =>
                        t.partner_company_id === p.id || t.partner_id === p.id
                    );
                    const total = partnerTasks.length;
                    const completed = partnerTasks.filter(t => t.status === 'completed').length;
                    const paid = partnerTasks.filter(t => t.payment_status === 'paid').length;
                    const totalCost = partnerTasks.reduce((sum, t) => sum + (t.actual_cost || 0), 0);
                    const partnerName = p.partner_name || p.partner_company_name || p.name || 'Adsız';

                    return [
                        partnerName,
                        p.contact_person || '-',
                        p.contact_phone || '-',
                        total,
                        completed,
                        paid,
                        totalCost
                    ];
                })
            ];
            const wsPartners = XLSX.utils.aoa_to_sheet(partnerData);
            XLSX.utils.book_append_sheet(wb, wsPartners, 'Partnerlər');

            const fileName = `hesabat_${this.formatDate(new Date(), 'YYYY-MM-DD')}.xlsx`;
            XLSX.writeFile(wb, fileName);

            this.showNotification('Hesabat uğurla ixrac edildi', 'success');
        } catch (error) {
            console.error('Export xətası:', error);
            this.showError('Hesabat export edilərkən xəta baş verdi');
        } finally {
            this.hideLoading();
        }
    }

    printReport() {
        const printWindow = window.open('', '_blank');
        const reportContent = this.generateFullReport();
        const styles = this.getPrintStyles();

        printWindow.document.write(`
            <html>
                <head>
                    <title>Hesabat - ${this.formatDate(new Date())}</title>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    <style>
                        ${styles}
                    </style>
                </head>
                <body>
                    <div class="print-header">
                        <h1>Hesabat</h1>
                        <p>Tarix: ${this.formatDate(this.dateRange.start)} - ${this.formatDate(this.dateRange.end)}</p>
                        <p>Yaradılma tarixi: ${new Date().toLocaleString('az-AZ')}</p>
                    </div>
                    ${reportContent}
                    <div class="print-footer">
                        <p>Hesabat ${new Date().toLocaleDateString('az-AZ')} tarixində yaradılmışdır</p>
                    </div>
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.print();
    }

    getPrintStyles() {
        return `
            body { font-family: Arial, sans-serif; padding: 30px; color: #333; background: white; }
            .print-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #3b82f6; }
            h1 { color: #1e293b; margin: 0; }
            h4 { color: #1e293b; margin: 25px 0 10px; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #3b82f6; color: white; font-weight: 600; }
            .report-summary-cards { display: flex; gap: 15px; margin: 25px 0; }
            .summary-card { flex: 1; padding: 15px; background: #f8fafc; border-radius: 8px; text-align: center; }
            .text-success { color: #10b981; }
            .text-warning { color: #f59e0b; }
            .text-danger { color: #ef4444; }
            .text-info { color: #3b82f6; }
        `;
    }

    scheduleReport() {
        const modal = document.createElement('div');
        modal.className = 'modal schedule-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-clock"></i> Hesabat Planlaşdır</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <form id="scheduleForm">
                        <div class="form-group">
                            <label>Hesabat tipi</label>
                            <select id="scheduleReportType" class="form-select">
                                <option value="full">Tam hesabat</option>
                                <option value="company">Şirkət hesabatı</option>
                                <option value="financial">Maliyyə hesabatı</option>
                                <option value="partner">Partner hesabatı</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Göndərilmə tezliyi</label>
                            <select id="scheduleFrequency" class="form-select">
                                <option value="daily">Gündəlik</option>
                                <option value="weekly">Həftəlik</option>
                                <option value="monthly">Aylıq</option>
                                <option value="quarterly">Rüblük</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Email ünvanları</label>
                            <input type="email" id="scheduleEmails" class="form-input" placeholder="email@example.com, email2@example.com" multiple>
                            <small>Birdən çox email üçün vergül ilə ayırın</small>
                        </div>
                        <div class="form-group">
                            <label>Format</label>
                            <select id="scheduleFormat" class="form-select">
                                <option value="pdf">PDF</option>
                                <option value="excel">Excel</option>
                                <option value="csv">CSV</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="secondary-btn" onclick="this.closest('.modal').remove()">Ləğv et</button>
                    <button class="primary-btn" onclick="reportManager.saveSchedule()">Planlaşdır</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    saveSchedule() {
        this.showNotification('Hesabat planlaşdırıldı', 'success');
        document.querySelector('.schedule-modal')?.remove();
    }

    viewTaskDetails(taskId) {
        const task = this.data.tasks?.find(t => t.id === taskId) ||
                     this.data.recentTasks?.find(t => t.id === taskId);

        if (task) {
            const details = `
                <div class="task-details-popup">
                    <h4>${task.task_title || task.name}</h4>
                    <p><strong>Kod:</strong> ${task.task_code || '-'}</p>
                    <p><strong>Şirkət:</strong> ${task.company_name || task.company || '-'}</p>
                    <p><strong>İcraçı:</strong> ${task.assignee_name || task.executor || '-'}</p>
                    <p><strong>Status:</strong> ${task.status_label || task.status || '-'}</p>
                    <p><strong>Prioritet:</strong> ${task.priority_label || task.priority || '-'}</p>
                    <p><strong>Başlama tarixi:</strong> ${task.created_at ? this.formatDate(task.created_at) : '-'}</p>
                    <p><strong>Bitmə tarixi:</strong> ${task.completed_date ? this.formatDate(task.completed_date) : '-'}</p>
                    <p><strong>Son müddət:</strong> ${task.due_date ? this.formatDate(task.due_date) : '-'}</p>
                    <p><strong>Təsvir:</strong> ${task.task_description || '-'}</p>
                </div>
            `;

            this.showNotification(details, 'info', 5000);
        }
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

    formatMoney(amount) {
        if (amount === undefined || amount === null) return '0 ₼';
        return new Intl.NumberFormat('az-AZ', {
            style: 'currency',
            currency: 'AZN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount).replace('AZN', '₼').trim();
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('active');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
        console.error(message);
    }

    showNotification(message, type = 'info', duration = 3000) {
        if (this.notification && typeof this.notification.show === 'function') {
            this.notification.show(message, type, duration);
            return;
        }

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
}

// ========================================
// REPORT MANAGER INITIALIZATION
// ========================================

window.reportManager = null;

document.addEventListener('DOMContentLoaded', function() {
    if (typeof makeApiRequest === 'undefined') {
        console.error('makeApiRequest funksiyası tapılmadı!');

        const script = document.createElement('script');
        script.src = '../js/apiService.js';
        script.onload = function() {
            console.log('✅ apiService.js yükləndi');
            initializeReportWithChart();
        };
        script.onerror = function() {
            console.error('❌ apiService.js yüklənə bilmədi');
        };
        document.head.appendChild(script);
    } else {
        initializeReportWithChart();
    }
});

function initializeReportWithChart() {
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = initializeReport;
        document.head.appendChild(script);
    } else {
        initializeReport();
    }
}

function initializeReport() {
    window.reportManager = new ReportManager();

    const services = {};

    if (window.notification) {
        services.notification = window.notification;
    }

    window.reportManager.initialize(services);
}
