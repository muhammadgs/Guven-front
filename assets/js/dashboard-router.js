(function(){
  async function run(){
    const token = window.getAuthToken && window.getAuthToken();
    if(!token){ window.authService.redirectToLogin(); return; }
    const me = await window.authService.getCurrentUser();
    if(!me.success){ window.authService.redirectToLogin(); return; }
    const role = me.data?.user_service?.role || me.data?.role || localStorage.getItem('guven_user_role');
    window.location.href = window.authService.resolveDashboardRoute(role);
  }
  run();
})();
