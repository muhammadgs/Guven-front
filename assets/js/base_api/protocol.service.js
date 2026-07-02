// base_api/protocol.service.js

/**
 * Protocol API wrapper.
 * Uses the existing global ApiService instance so auth headers/base URL stay centralized.
 */
class ProtocolService {
    constructor(apiService) {
        this.api = apiService || window.apiService || window.api;
    }

    ensureApi() {
        this.api = this.api || window.apiService || window.api;
        if (!this.api) throw new Error('ApiService tapılmadı');
        return this.api;
    }

    async unwrap(promise) {
        const response = await promise;
        if (response?.success === false) {
            throw new Error(response.error || response.message || 'Protocol API xətası');
        }
        return response?.data ?? response;
    }

    start() {
        return this.unwrap(this.ensureApi().post('/protocols/start'));
    }

    getProtocols() {
        return this.unwrap(this.ensureApi().get('/protocols'));
    }

    getAvailableEmployees(protocolId) {
        return this.unwrap(this.ensureApi().get(`/protocols/${protocolId}/available-employees`));
    }

    addParticipant(protocolId, employeeId) {
        return this.unwrap(this.ensureApi().post(`/protocols/${protocolId}/participants`, { employee_id: employeeId }));
    }

    removeParticipant(protocolId, employeeId) {
        return this.unwrap(this.ensureApi().delete(`/protocols/${protocolId}/participants/${employeeId}`));
    }

    updateTitle(protocolId, title) {
        return this.unwrap(this.ensureApi().patch(`/protocols/${protocolId}/title`, { title }));
    }

    complete(protocolId, payload) {
        return this.unwrap(this.ensureApi().post(`/protocols/${protocolId}/complete`, payload));
    }

    addNote(protocolId, content, noteOrder = 0) {
        return this.unwrap(this.ensureApi().post(`/protocols/${protocolId}/notes`, { content, note_order: noteOrder }));
    }
}

window.ProtocolService = ProtocolService;
window.protocolService = window.protocolService || new ProtocolService(window.apiService || window.api);
