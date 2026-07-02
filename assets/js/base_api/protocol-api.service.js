// Protocol API Service - Pratakol/Qeydlər real backend integration
(function() {
    class ProtocolApiService {
        constructor(apiClient) {
            this.api = apiClient || window.api || window.apiService;
        }

        ensureApi() {
            this.api = this.api || window.api || window.apiService;
            if (!this.api) throw new Error('API client tapılmadı');
            return this.api;
        }

        startProtocol() {
            return this.ensureApi().post('/api/v1/protocols/start');
        }

        getAvailableEmployees(protocolId) {
            return this.ensureApi().get(`/api/v1/protocols/${protocolId}/available-employees`);
        }

        addProtocolParticipant(protocolId, employeeId) {
            return this.ensureApi().post(`/api/v1/protocols/${protocolId}/participants`, { employee_id: employeeId });
        }

        removeProtocolParticipant(protocolId, employeeId) {
            return this.ensureApi().delete(`/api/v1/protocols/${protocolId}/participants/${employeeId}`);
        }

        updateProtocolTitle(protocolId, title) {
            return this.ensureApi().patch(`/api/v1/protocols/${protocolId}/title`, { title });
        }

        completeProtocol(protocolId, payload) {
            return this.ensureApi().post(`/api/v1/protocols/${protocolId}/complete`, payload);
        }

        addProtocolNote(protocolId, content, noteOrder = 0) {
            return this.ensureApi().post(`/api/v1/protocols/${protocolId}/notes`, { content, note_order: noteOrder });
        }
    }

    window.ProtocolApiService = ProtocolApiService;
    window.protocolApi = window.protocolApi || new ProtocolApiService(window.api || window.apiService);
})();
