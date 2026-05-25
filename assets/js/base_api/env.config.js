(function () {
  if (window.GF_CONFIG) return;

  function trimSlash(s) { return (s || '').replace(/\/+$/, ''); }
  function ensureLeadingSlash(s) { return s.startsWith('/') ? s : '/' + s; }
  function normalizeEndpoint(endpoint) {
    var ep = (endpoint || '').toString().trim();
    if (!ep) return '/api/v1';
    if (/^https?:\/\//i.test(ep)) return ep;
    ep = ep.replace(/^\/+/, '');
    if (ep === 'api/v1') return '/api/v1';
    if (ep.startsWith('api/v1/')) return '/' + ep;
    return '/api/v1/' + ep;
  }

  function detectLocal() {
    var h = window.location.hostname || '';
    var p = window.location.protocol || '';
    return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local') || p === 'file:';
  }

  function detectAppBasePath() {
    if (!detectLocal()) return '/';
    var path = window.location.pathname || '/';
    var m = path.match(/^\/([^/]+)\//);
    if (m && m[1] && !m[1].includes('.')) return '/' + m[1] + '/';
    return '/';
  }

  function getStorageOverride() {
    try { return localStorage.getItem('GF_API_BASE_OVERRIDE'); } catch (_) { return null; }
  }

  function getAuthToken() {
    var keys = ['guven_token', 'access_token', 'auth_token', 'token'];
    for (var i = 0; i < keys.length; i++) {
      try {
        var v = localStorage.getItem(keys[i]) || sessionStorage.getItem(keys[i]);
        if (v) return v;
      } catch (_) {}
    }
    return null;
  }

  var isLocal = detectLocal();
  var productionApiBase = 'https://guvenfinans.az/proxy.php';
  var localApiBase = 'http://vps.guvenfinans.az:8008';
  var apiBase = trimSlash(getStorageOverride() || (isLocal ? localApiBase : productionApiBase));

  window.GF_CONFIG = {
    isLocal: isLocal,
    productionApiBase: productionApiBase,
    localApiBase: localApiBase,
    apiBase: apiBase,
    appBasePath: detectAppBasePath(),
    get apiV1Base() {
      var base = trimSlash(this.apiBase);
      return base.endsWith('/api/v1') ? base : base + '/api/v1';
    },
    buildApiUrl: function (endpoint) {
      var ep = normalizeEndpoint(endpoint);
      if (/^https?:\/\//i.test(ep)) return ep;
      return trimSlash(this.apiBase) + ep;
    },
    getAuthToken: getAuthToken,
    getAuthHeaders: function (headers) {
      var out = headers ? Object.assign({}, headers) : {};
      var t = this.getAuthToken();
      if (t) out.Authorization = 'Bearer ' + t;
      return out;
    },
    getLoginUrl: function () {
      return trimSlash(this.appBasePath === '/' ? '' : this.appBasePath) + '/login.html';
    },
    redirectToLogin: function (reason) {
      var url = this.getLoginUrl();
      if (reason) {
        var sep = url.includes('?') ? '&' : '?';
        url += sep + 'reason=' + encodeURIComponent(reason);
      }
      window.location.href = url;
    }
  };

  window.API_BASE = window.GF_CONFIG.apiBase;
})();
