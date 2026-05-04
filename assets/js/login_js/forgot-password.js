// ============================================
// FORGOT PASSWORD MODULE - REAL API VERSİYASI
// ============================================

document.addEventListener('DOMContentLoaded', function() {

    // DOM elements
    const forgotBtn = document.getElementById('forgotPasswordBtn');
    const forgotModal = document.getElementById('forgotModal');
    const resetModal = document.getElementById('resetModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeResetModalBtn = document.getElementById('closeResetModalBtn');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const emailField = document.getElementById('emailField');
    const telegramField = document.getElementById('telegramField');
    const resetEmail = document.getElementById('resetEmail');
    const resetTelegram = document.getElementById('resetTelegram');
    const methodRadios = document.querySelectorAll('input[name="resetMethod"]');
    const sendResetLinkBtn = document.getElementById('sendResetLinkBtn');
    const step2OkBtn = document.getElementById('step2OkBtn');
    const successInfo = document.getElementById('successInfo');
    const resetPasswordBtn = document.getElementById('resetPasswordBtn');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const passwordError = document.getElementById('passwordError');
    const authStatus = document.getElementById('authStatus');

    // API base URL - proxy ilə eyni
    const API_BASE = '/proxy.php/api/v1';

    // ============================================
    // SHOW MODAL
    // ============================================
    if (forgotBtn) {
        forgotBtn.addEventListener('click', function() {
            forgotModal.style.display = 'flex';
            step1.style.display = 'block';
            step2.style.display = 'none';

            // Clear fields
            if (resetEmail) resetEmail.value = '';
            if (resetTelegram) resetTelegram.value = '';
            if (passwordError) passwordError.textContent = '';

            // Reset radio to email
            const emailRadio = document.querySelector('input[name="resetMethod"][value="email"]');
            if (emailRadio) {
                emailRadio.checked = true;
                if (emailField) emailField.style.display = 'block';
                if (telegramField) telegramField.style.display = 'none';
            }
        });
    }

    // ============================================
    // CLOSE MODALS
    // ============================================
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            forgotModal.style.display = 'none';
        });
    }

    if (closeResetModalBtn) {
        closeResetModalBtn.addEventListener('click', function() {
            resetModal.style.display = 'none';
            // Clear password fields
            if (newPassword) newPassword.value = '';
            if (confirmPassword) confirmPassword.value = '';
            if (passwordError) passwordError.textContent = '';
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === forgotModal) {
            forgotModal.style.display = 'none';
        }
        if (e.target === resetModal) {
            resetModal.style.display = 'none';
            if (newPassword) newPassword.value = '';
            if (confirmPassword) confirmPassword.value = '';
            if (passwordError) passwordError.textContent = '';
        }
    });

    // ============================================
    // TOGGLE FIELDS (EMAIL/TELEGRAM)
    // ============================================
    if (methodRadios.length) {
        methodRadios.forEach(function(radio) {
            radio.addEventListener('change', function(e) {
                if (e.target.value === 'email') {
                    if (emailField) emailField.style.display = 'block';
                    if (telegramField) telegramField.style.display = 'none';
                } else {
                    if (emailField) emailField.style.display = 'none';
                    if (telegramField) telegramField.style.display = 'block';
                }
            });
        });
    }

    // ============================================
    // SEND RESET LINK - REAL API
    // ============================================
    if (sendResetLinkBtn) {
        sendResetLinkBtn.addEventListener('click', async function() {
            const selectedMethod = document.querySelector('input[name="resetMethod"]:checked')?.value || 'email';
            let destination = '';

            // Validate input
            if (selectedMethod === 'email') {
                destination = resetEmail?.value.trim() || '';
                if (!destination || !destination.includes('@') || !destination.includes('.')) {
                    showPasswordError('Zəhmət olmasa düzgün e-poçt ünvanı daxil edin');
                    return;
                }
            } else {
                destination = resetTelegram?.value.trim() || '';
                if (!destination || !destination.startsWith('@')) {
                    showPasswordError('Zəhmət olmasa düzgün Telegram istifadəçi adı daxil edin (@ ilə başlayan)');
                    return;
                }
                // Remove @ for API
                destination = destination.substring(1);
            }

            // Disable button
            sendResetLinkBtn.disabled = true;
            sendResetLinkBtn.textContent = 'Göndərilir...';

            try {
                // REAL API CALL
                const response = await fetch(`${API_BASE}/auth/forgot-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        method: selectedMethod,
                        destination: destination
                    }),
                    credentials: 'include'  // Cookie-lər üçün
                });

                let data;
                try {
                    data = await response.json();
                } catch (e) {
                    console.error('JSON parse error:', e);
                    throw new Error('Server cavabı oxunmadı');
                }

                if (!response.ok) {
                    throw new Error(data?.detail || data?.message || 'Xəta baş verdi');
                }

                // SUCCESS
                step1.style.display = 'none';
                step2.style.display = 'block';

                // Show masked destination
                const displayDest = data.destination_masked || destination;
                successInfo.textContent = `Link ${displayDest} ünvanına göndərildi. Zəhmət olmasa qutunuzu yoxlayın.`;

                console.log('✅ Reset link sent successfully');

            } catch (error) {
                console.error('❌ Forgot password error:', error);
                showPasswordError(error.message || 'Xəta baş verdi');

                // Re-enable button
                sendResetLinkBtn.disabled = false;
                sendResetLinkBtn.textContent = 'Link göndər';
            }
        });
    }

    // ============================================
    // STEP 2 OK BUTTON
    // ============================================
    if (step2OkBtn) {
        step2OkBtn.addEventListener('click', function() {
            forgotModal.style.display = 'none';
            step1.style.display = 'block';
            step2.style.display = 'none';

            // Re-enable button if disabled
            if (sendResetLinkBtn) {
                sendResetLinkBtn.disabled = false;
                sendResetLinkBtn.textContent = 'Link göndər';
            }
        });
    }

    // ============================================
    // RESET PASSWORD - REAL API
    // ============================================
    if (resetPasswordBtn) {
        resetPasswordBtn.addEventListener('click', async function() {
            const pass = newPassword?.value || '';
            const confirm = confirmPassword?.value || '';

            // Validate
            if (!pass || !confirm) {
                if (passwordError) passwordError.textContent = 'Zəhmət olmasa bütün xanaları doldurun';
                return;
            }

            if (pass.length < 6) {
                if (passwordError) passwordError.textContent = 'Şifrə ən az 6 simvol olmalıdır';
                return;
            }

            if (pass !== confirm) {
                if (passwordError) passwordError.textContent = 'Şifrələr uyğun gəlmir';
                return;
            }

            // Get token from URL or localStorage
            const urlParams = new URLSearchParams(window.location.search);
            let token = urlParams.get('token');

            // If no token in URL, try to get from localStorage (for demo)
            if (!token) {
                token = localStorage.getItem('reset_token');
            }

            if (!token) {
                if (passwordError) passwordError.textContent = 'Yeniləmə tokeni tapılmadı';
                return;
            }

            // Clear error
            if (passwordError) passwordError.textContent = '';

            // Disable button
            resetPasswordBtn.disabled = true;
            resetPasswordBtn.textContent = 'Yenilənir...';

            try {
                // REAL API CALL
                const response = await fetch(`${API_BASE}/auth/reset-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        token: token,
                        new_password: pass
                    }),
                    credentials: 'include'
                });

                let data;
                try {
                    data = await response.json();
                } catch (e) {
                    console.error('JSON parse error:', e);
                    throw new Error('Server cavabı oxunmadı');
                }

                if (!response.ok) {
                    throw new Error(data?.detail || data?.message || 'Xəta baş verdi');
                }

                // SUCCESS
                alert('Şifrə uğurla yeniləndi! İndi yeni şifrə ilə daxil ola bilərsiniz.');
                resetModal.style.display = 'none';

                // Clear fields
                if (newPassword) newPassword.value = '';
                if (confirmPassword) confirmPassword.value = '';

                // Remove token from URL
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);

                // Remove from localStorage
                localStorage.removeItem('reset_token');

                // Optionally redirect to login
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);

            } catch (error) {
                console.error('❌ Reset password error:', error);
                if (passwordError) passwordError.textContent = error.message || 'Xəta baş verdi';
            } finally {
                // Re-enable button
                resetPasswordBtn.disabled = false;
                resetPasswordBtn.textContent = 'Şifrəni yenilə';
            }
        });
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    function showPasswordError(message) {
        if (passwordError) {
            passwordError.textContent = message;
            setTimeout(function() {
                passwordError.textContent = '';
            }, 3000);
        } else {
            alert(message);
        }
    }

    function showStatus(type, message) {
        if (authStatus) {
            authStatus.className = `auth-status ${type}`;
            authStatus.textContent = message;
            authStatus.classList.remove('is-hidden');

            setTimeout(() => {
                authStatus.classList.add('is-hidden');
            }, 5000);
        }
    }

    // ============================================
    // CHECK URL FOR RESET TOKEN
    // ============================================
    async function checkForResetToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
            console.log('🔑 Reset token found in URL:', token.substring(0, 20) + '...');

            // Save token for later use
            localStorage.setItem('reset_token', token);

            // Verify token with backend
            try {
                const response = await fetch(`${API_BASE}/auth/verify-reset-token/${token}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Token is valid');

                    // Show reset modal
                    setTimeout(function() {
                        if (resetModal) {
                            resetModal.style.display = 'flex';
                            if (newPassword) newPassword.focus();
                        }
                    }, 500);
                } else {
                    console.error('❌ Invalid token');
                    showStatus('error', 'Yanlış və ya müddəti bitmiş link. Zəhmət olmasa yenidən cəhd edin.');
                    localStorage.removeItem('reset_token');
                }
            } catch (error) {
                console.error('❌ Token verification error:', error);
                showStatus('error', 'Token yoxlanılarkən xəta baş verdi');
            }

            // Clean URL (remove token)
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }

    // ============================================
    // INITIAL CHECK
    // ============================================
    checkForResetToken();
});