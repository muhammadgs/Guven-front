(function(window){
  const AUTH_SESSION_KEYS = ['guven_token','access_token','auth_token','token','refresh_token','guven_refresh_token','guven_token_type','guven_user_role','guven_last_role_raw','guven_last_role_norm','current_role','userRole','user_role','guven_user_id','user_email','user_name','user_uuid','company_code','company_id','company_name','baza_id','guven_user'];
  class AuthService {
    constructor(api){ this.api = api || window.apiService; }
    normalizeRole(role=''){ const r=String(role).toLowerCase(); if(['company_admin','company','owner','ceo'].includes(r))return 'owner'; if(['employee','worker','user'].includes(r))return 'worker'; if(['admin','super_admin'].includes(r))return 'admin'; return r||'worker'; }
    resolveDashboardRoute(role){ const n=this.normalizeRole(role||localStorage.getItem('guven_user_role')||localStorage.getItem('current_role')); if(n==='owner') return 'owner/owp.html'; if(n==='admin') return 'admin/admin.html'; return 'worker/wp.html'; }
    getLoginPath(){ const p=window.location.pathname; const depth=(p.match(/\//g)||[]).length-1; return depth>1 ? '../login.html':'login.html'; }
    redirectToLogin(){ window.location.href=this.getLoginPath(); }
    redirectToDashboard(role){ window.location.href=this.resolveDashboardRoute(role); }
    saveSession(payload={}){
      const token=payload.access_token||payload.token||payload.guven_token;
      const refresh=payload.refresh_token||payload.guven_refresh_token;
      const user=payload.user_service||payload.user||payload.data?.user_service||{};
      const rawRole=user.role||payload.role||localStorage.getItem('guven_user_role');
      const norm=this.normalizeRole(rawRole);
      if(token) ['guven_token','access_token','auth_token','token'].forEach(k=>localStorage.setItem(k, token));
      if(refresh) ['refresh_token','guven_refresh_token'].forEach(k=>localStorage.setItem(k, refresh));
      localStorage.setItem('guven_last_role_raw', rawRole||''); localStorage.setItem('guven_last_role_norm', norm);
      ['guven_user_role','current_role','userRole','user_role'].forEach(k=>localStorage.setItem(k,norm));
      if(user.id) localStorage.setItem('guven_user_id', user.id);
      if(user.email) localStorage.setItem('user_email', user.email);
      if(user.name||user.full_name) localStorage.setItem('user_name', user.name||user.full_name);
      if(user.uuid) localStorage.setItem('user_uuid', user.uuid);
      if(user.company_code) localStorage.setItem('company_code', user.company_code);
      if(user.company_id) localStorage.setItem('company_id', user.company_id);
      if(user.company_name) localStorage.setItem('company_name', user.company_name);
      if(user.baza_id) localStorage.setItem('baza_id', user.baza_id);
      localStorage.setItem('guven_user', JSON.stringify(user||{}));
    }
    clearSession(){ AUTH_SESSION_KEYS.forEach(k=>{ localStorage.removeItem(k); sessionStorage.removeItem(k); }); }
    async login(email,password){ const r=await this.api.post('/auth/login',{email,password},false,false); if(r.success) this.saveSession(r.data); return r; }
    async refresh(){ return this.api.refreshToken(); }
    async logout(){ await this.api.post('/auth/logout',{},false,true); this.clearSession(); this.redirectToLogin(); }
    async getCurrentUser(){ const r=await this.api.get('/auth/me', true); if(r.success) this.saveSession(r.data); return r; }
  }
  window.AuthService=AuthService;
  window.authService=window.authService||new AuthService(window.apiService);
  window.auth=window.authService;
  window.logoutUser=()=>window.authService.logout();
  window.redirectToLogin=()=>window.authService.redirectToLogin();
})(window);
