(function(){
  const form = document.getElementById('loginForm') || document.querySelector('form');
  const msg = document.getElementById('statusMessage') || document.getElementById('message');
  if (!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = (document.getElementById('email')||{}).value;
    const password = (document.getElementById('password')||{}).value;
    if (msg) msg.textContent = 'Giriş edilir...';
    const r = await window.authService.login(email, password);
    if (!r.success) { if (msg) msg.textContent = r.error || 'Giriş uğursuz'; return; }
    if (msg) msg.textContent = 'Uğurlu giriş...';
    const role = r.data?.user_service?.role || r.data?.role;
    window.authService.redirectToDashboard(role);
  });
})();
