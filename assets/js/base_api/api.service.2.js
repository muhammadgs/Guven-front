/**
 * Əlavə API servisləri.
 *
 * Bu fayl əsas ApiService-i dəyişmədən yeni endpoint qruplarını ayrıca saxlayır.
 */
class ApiService2 {
    constructor(apiService = window.apiService) {
        this.apiService = apiService;
    }

    getApiService() {
        this.apiService = this.apiService || window.apiService;
        if (!this.apiService) {
            throw new Error('Əsas API servisi tapılmadı');
        }
        return this.apiService;
    }

    buildQuery(params = {}) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                query.append(key, String(value));
            }
        });
        return query.toString();
    }

    isError(response) {
        return response?.success === false;
    }

    async listCompanyServices(params = {}) {
        const api = this.getApiService();
        const query = this.buildQuery(params);
        const filteredEndpoint = query ? `/company-services/?${query}` : '/company-services/';
        let response = await api.get(filteredEndpoint);

        // Bəzi backend versiyalarında pagination parametrləri qəbul edilmir.
        if (this.isError(response) && params.company_id) {
            const companyQuery = this.buildQuery({ company_id: params.company_id });
            response = await api.get(`/company-services/?${companyQuery}`);
        }

        // Slash yönləndirməsi proxy-də problem yaradarsa slash-sız variantı sına.
        if (this.isError(response) && [404, 405].includes(Number(response.status))) {
            const endpoint = query ? `/company-services?${query}` : '/company-services';
            response = await api.get(endpoint);
        }

        return response;
    }

    async createCompanyService(payload) {
        const api = this.getApiService();
        let response = await api.post('/company-services/', payload);

        if (this.isError(response) && [404, 405].includes(Number(response.status))) {
            response = await api.post('/company-services', payload);
        }

        return response;
    }

    get companyServices() {
        return {
            list: (params = {}) => this.listCompanyServices(params),
            create: (payload) => this.createCompanyService(payload)
        };
    }
}

window.ApiService2 = ApiService2;
window.apiService2 = window.apiService2 || new ApiService2(window.apiService);
