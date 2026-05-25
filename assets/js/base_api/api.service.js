(function (window) {
  const PROD_HOSTS = new Set(['guvenfinans.az', 'www.guvenfinans.az']);
  const AUTH_KEYS = ['guven_token', 'access_token', 'auth_token', 'token'];

  function parseTokenPayload(token) {
    try {
      if (!token) return null;
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch (_) { return null; }
  }

  function readCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  class ApiService {
    constructor() { this.isRefreshing = false; }
    resolveBaseUrl() {
      const override = localStorage.getItem('GF_API_BASE_OVERRIDE');
      if (override) return override.replace(/\/$/, '');
      const { protocol, hostname } = window.location;
      if (PROD_HOSTS.has(hostname)) return 'https://guvenfinans.az/proxy.php';
      if (protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1' || !PROD_HOSTS.has(hostname)) {
        return 'http://vps.guvenfinans.az:8008';
      }
      return 'http://vps.guvenfinans.az:8008';
    }
    getAuthToken() {
      for (const k of AUTH_KEYS) {
        const v = localStorage.getItem(k) || sessionStorage.getItem(k);
        if (v && v !== 'null' && v !== 'undefined') return v;
      }
      for (const k of AUTH_KEYS) {
        const v = readCookie(k);
        if (v && v !== 'null' && v !== 'undefined') return v;
      }
      return null;
    }
    getAuthHeaders(extra = {}) {
      const headers = { Accept: 'application/json', ...extra };
      const token = this.getAuthToken();
      if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
      return headers;
    }
    normalizeEndpoint(endpoint) {
      let ep = String(endpoint || '').trim();
      if (!ep.startsWith('/')) ep = '/' + ep;
      ep = ep.replace(/^\/proxy\.php/, '');
      ep = ep.replace(/^\/api\/v1\/api\/v1/, '/api/v1');
      if (!ep.startsWith('/api/v1/')) ep = ep.replace(/^\//, '/api/v1/');
      return ep;
    }
    buildApiUrl(endpoint) {
      return `${this.resolveBaseUrl()}${this.normalizeEndpoint(endpoint)}`;
    }
    async _fetch(endpoint, method='GET', data=null, isFormData=false, retry=true, requiresAuth=true) {
      const url = this.buildApiUrl(endpoint);
      const headers = this.getAuthHeaders();
      if (!isFormData) headers['Content-Type'] = 'application/json';
      if (!requiresAuth) delete headers.Authorization;
      const options = { method, headers, credentials: 'include' };
      if (data != null) options.body = isFormData ? data : JSON.stringify(data);
      let res;
      try { res = await fetch(url, options); } catch (e) {
        return { success:false, status:0, error:e.message || 'Failed to fetch', data:null };
      }
      let payload = null;
      const ct = res.headers.get('content-type') || '';
      if (res.status !== 204) {
        payload = ct.includes('application/json') ? await res.json().catch(()=>null) : await res.text().catch(()=>null);
      }
      if ((res.status === 401 || res.status === 403) && retry && !this.normalizeEndpoint(endpoint).includes('/auth/refresh')) {
        const ok = await this.refreshToken();
        if (ok) return this._fetch(endpoint, method, data, isFormData, false, requiresAuth);
        if (window.authService?.clearSession) window.authService.clearSession();
        if (window.authService?.redirectToLogin) window.authService.redirectToLogin();
      }
      if (!res.ok) return { success:false, status:res.status, error: payload?.error || payload?.message || res.statusText, data: payload };
      return { success:true, status:res.status, data:payload };
    }
    async refreshToken() {
      if (this.isRefreshing) return false;
      this.isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh_token') || localStorage.getItem('guven_refresh_token');
      const body = refreshToken ? { refresh_token: refreshToken } : null;
      const resp = await this._fetch('/auth/refresh', 'POST', body, false, false, false);
      this.isRefreshing = false;
      if (!resp.success) return false;
      const t = resp.data?.access_token || resp.data?.token;
      if (t) {
        AUTH_KEYS.forEach(k => localStorage.setItem(k, t));
        return true;
      }
      return false;
    }
    request(e,m='GET',d=null,f=false){ return this._fetch(e,m,d,f,true,true); }
    requestOneC(e,m='GET',d=null,f=false){
      const bazaId = localStorage.getItem('baza_id');
      let ep = this.normalizeEndpoint(e);
      if (bazaId && !ep.includes('baza_id=')) ep += (ep.includes('?')?'&':'?') + `baza_id=${encodeURIComponent(bazaId)}`;
      return this._fetch(ep,m,d,f,true,true);
    }
    get(e, requiresAuth=true){ return this._fetch(e,'GET',null,false,true,requiresAuth); }
    post(e,d=null,f=false, requiresAuth=true){ return this._fetch(e,'POST',d,f,true,requiresAuth); }
    put(e,d=null,f=false, requiresAuth=true){ return this._fetch(e,'PUT',d,f,true,requiresAuth); }
    delete(e,d=null,f=false, requiresAuth=true){ return this._fetch(e,'DELETE',d,f,true,requiresAuth); }
    getOneC(e){ return this.requestOneC(e,'GET'); }
    postOneC(e,d,f=false){ return this.requestOneC(e,'POST',d,f); }
  }

  window.ApiService = ApiService;
  window.apiService = window.apiService || new ApiService();
  window.api = window.apiService;
  window.getAuthToken = () => window.apiService.getAuthToken();
  window.parseTokenPayload = parseTokenPayload;
  window.getAuthHeaders = (...args) => window.apiService.getAuthHeaders(...args);
  window.makeApiRequest = (endpoint, method='GET', data=null, isFormData=false) => window.apiService.request(endpoint, method, data, isFormData);
  window.GF_API = { resolveBaseUrl: () => window.apiService.resolveBaseUrl(), buildApiUrl: (e) => window.apiService.buildApiUrl(e) };
})(window);
