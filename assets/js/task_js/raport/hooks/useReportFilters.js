// raport/hooks/useReportFilters.js
// Filter management hook

class ReportFiltersHook {
    constructor() {
        this.filters = {
            dateRange: {
                start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                end: new Date()
            },
            company_id: null,
            department_id: null,
            employee_id: null,
            status: null,
            priority: null,
            payment_status: null,
            partner_company_id: null,
            searchTerm: '',
            showPartnerTasks: false
        };
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    getFilters() {
        return { ...this.filters };
    }

    setFilter(key, value) {
        this.filters[key] = value;
        this.notify();
    }

    setDateRange(start, end) {
        this.filters.dateRange = { start, end };
        this.notify();
    }

    resetFilters() {
        this.filters = {
            dateRange: this.filters.dateRange,
            company_id: null,
            department_id: null,
            employee_id: null,
            status: null,
            priority: null,
            payment_status: null,
            partner_company_id: null,
            searchTerm: '',
            showPartnerTasks: false
        };
        this.notify();
    }

    notify() {
        this.listeners.forEach(listener => listener(this.getFilters()));
    }

    toApiParams() {
        return {
            start_date: ReportUtils.formatDate(this.filters.dateRange.start, 'YYYY-MM-DD'),
            end_date: ReportUtils.formatDate(this.filters.dateRange.end, 'YYYY-MM-DD'),
            company_id: this.filters.company_id,
            department_id: this.filters.department_id,
            employee_id: this.filters.employee_id,
            status: this.filters.status,
            priority: this.filters.priority,
            payment_status: this.filters.payment_status,
            partner_company_id: this.filters.partner_company_id,
            show_partner_tasks: this.filters.showPartnerTasks
        };
    }
}

window.ReportFiltersHook = ReportFiltersHook;