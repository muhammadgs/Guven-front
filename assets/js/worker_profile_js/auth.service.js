console.warn('Deprecated: use assets/js/base_api/auth.service.js');
window.authService = window.authService || new window.AuthService(window.apiService);
window.auth = window.authService;
