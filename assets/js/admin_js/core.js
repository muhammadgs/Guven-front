window.apiService = window.apiService || new window.ApiService();
window.authService = window.authService || new window.AuthService(window.apiService);
window.api = window.apiService;
window.auth = window.authService;
window.API_BASE = window.apiService.resolveBaseUrl();

window.makeApiRequest = window.makeApiRequest || function(endpoint, method='GET', data=null, isFormData=false){
  return window.apiService.request(endpoint, method, data, isFormData);
};

window.safeApiCall = async function(endpointOrUrl, options = {}) {
  const method = options.method || 'GET';
  const isFormData = options.body instanceof FormData;
  const data = options.body || null;
  let endpoint = endpointOrUrl;
  endpoint = endpoint.replace(/^https?:\/\/[^/]+/,'').replace(/^\/proxy\.php/,'');
  return window.apiService.request(endpoint, method, data, isFormData);
};
