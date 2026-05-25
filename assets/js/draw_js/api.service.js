console.warn('Deprecated draw api.service.js: using base_api/api.service.js');
window.apiService = window.apiService || new window.ApiService();
window.api = window.apiService;
