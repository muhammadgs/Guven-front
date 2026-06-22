// raport/reportApi.js
// Bütün hesabat endpoint-ləri üçün API sorğuları

/**
 * Report API Service
 * Mövcud backend endpoint-lərindən istifadə edir
 */

class ReportApiService {
    constructor() {
        this.baseEndpoint = '/reports';
    }

    /**
     * API sorğusu göndər
     * @private
     */
    async _request(endpoint, params = {}, showLoading = false) {
        const url = new URL(endpoint, window.location.origin);
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
                url.searchParams.append(key, params[key]);
            }
        });

        try {
            if (showLoading && window.showLoading) window.showLoading();
            const response = await makeApiRequest(url.pathname + url.search, 'GET', null, true);
            if (showLoading && window.hideLoading) window.hideLoading();
            return response;
        } catch (error) {
            if (showLoading && window.hideLoading) window.hideLoading();
            console.error(`API xətası [${endpoint}]:`, error);
            throw error;
        }
    }

    // ========== ƏSAS ENDPOINT-LƏR ==========

    /**
     * Tam hesabat - /reports/full
     * @param {DateRange} dateRange
     * @param {Object} options
     */
    async getFullReport(dateRange, options = {}) {
        const params = {
            start_date: this._formatDate(dateRange.start),
            end_date: this._formatDate(dateRange.end),
            show_partner_tasks: options.show_partner_tasks || false
        };
        return this._request('/reports/full', params, true);
    }

    /**
     * Task siyahısı - /reports/tasks
     */
    async getTasks(dateRange, filters = {}) {
        const params = {
            start_date: this._formatDate(dateRange.start),
            end_date: this._formatDate(dateRange.end),
            company_id: filters.company_id,
            department_id: filters.department_id,
            employee_id: filters.employee_id,
            status: filters.status,
            priority: filters.priority,
            limit: filters.limit || 1000
        };
        const response = await this._request('/reports/tasks', params);
        return response?.data || [];
    }

    /**
     * Şirkətlər - /reports/companies
     */
    async getCompanies() {
        const response = await this._request('/reports/companies');
        return response?.data || [];
    }

    /**
     * Şöbələr - /reports/departments
     */
    async getDepartments() {
        const response = await this._request('/reports/departments');
        return response?.data || [];
    }

    /**
     * İşçilər - /reports/employees
     */
    async getEmployees() {
        const response = await this._request('/reports/employees');
        return response?.data || [];
    }

    /**
     * İş növləri - /reports/work-types
     */
    async getWorkTypes() {
        const response = await this._request('/reports/work-types');
        return response?.data || [];
    }

    /**
     * Partnerlər - /reports/partners
     */
    async getPartners() {
        const response = await this._request('/reports/partners');
        return response?.data || [];
    }

    /**
     * Şirkət əlaqələri - /reports/company-relationships
     */
    async getCompanyRelationships() {
        const response = await this._request('/reports/company-relationships');
        return response?.data || [];
    }

    /**
     * Partner taskları - /reports/partner-tasks
     */
    async getPartnerTasks(dateRange, filters = {}) {
        const params = {
            start_date: this._formatDate(dateRange.start),
            end_date: this._formatDate(dateRange.end),
            partner_company_id: filters.partner_company_id,
            status: filters.status,
            payment_status: filters.payment_status,
            limit: filters.limit || 500
        };
        const response = await this._request('/reports/partner-tasks', params);
        return response?.data || [];
    }

    /**
     * Arxiv taskları - /reports/archive
     */
    async getArchiveTasks(dateRange, filters = {}) {
        const params = {
            start_date: this._formatDate(dateRange.start),
            end_date: this._formatDate(dateRange.end),
            company_id: filters.company_id,
            status: filters.status,
            limit: filters.limit || 500
        };
        const response = await this._request('/reports/archive', params);
        return response?.data || [];
    }

    /**
     * Maliyyə statistikası - /reports/financial
     */
    async getFinancialStats(dateRange) {
        const params = {
            start_date: this._formatDate(dateRange.start),
            end_date: this._formatDate(dateRange.end)
        };
        const response = await this._request('/reports/financial', params);
        return response?.data || {};
    }

    /**
     * Aylıq trend - /reports/monthly-trend
     */
    async getMonthlyTrend(year) {
        const response = await this._request('/reports/monthly-trend', { year });
        return response?.data || [];
    }

    // ========== DİNAMIK ENDPOINT-LƏR ==========

    /**
     * Şirkət hesabatı - /reports/company/{company_id}
     */
    async getCompanyReport(companyId, dateRange) {
        const params = {
            start_date: this._formatDate(dateRange.start),
            end_date: this._formatDate(dateRange.end)
        };
        const response = await this._request(`/reports/company/${companyId}`, params, true);
        return response?.success ? response.data : null;
    }

    /**
     * İşçi hesabatı - /reports/employee/{employee_id}
     */
    async getEmployeeReport(employeeId, dateRange) {
        const params = {
            start_date: this._formatDate(dateRange.start),
            end_date: this._formatDate(dateRange.end)
        };
        const response = await this._request(`/reports/employee/${employeeId}`, params, true);
        return response?.success ? response.data : null;
    }

    // ========== KÖMƏKÇİ METODLAR ==========

    _formatDate(date) {
        if (!date) return null;
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    /**
     * Bütün məlumatları paralel yüklə (performans üçün)
     */
    async loadAllData(dateRange, options = {}) {
        const promises = {
            full: this.getFullReport(dateRange, options),
            companies: this.getCompanies(),
            departments: this.getDepartments(),
            employees: this.getEmployees(),
            workTypes: this.getWorkTypes(),
            partners: this.getPartners(),
            relationships: this.getCompanyRelationships(),
            financial: this.getFinancialStats(dateRange),
            monthlyTrend: this.getMonthlyTrend(dateRange.end.getFullYear())
        };

        // Əlavə olaraq partner task və archive task (əgər lazımdırsa)
        if (options.includePartnerTasks) {
            promises.partnerTasks = this.getPartnerTasks(dateRange, options.partnerFilters);
        }
        if (options.includeArchiveTasks) {
            promises.archiveTasks = this.getArchiveTasks(dateRange, options.archiveFilters);
        }

        const results = await Promise.allSettled(Object.values(promises));
        const keys = Object.keys(promises);

        const output = {};
        results.forEach((result, index) => {
            const key = keys[index];
            output[key] = result.status === 'fulfilled' ? result.value : (key === 'full' ? {} : []);
        });

        return output;
    }
}

// Singleton instance
window.ReportApiService = new ReportApiService();