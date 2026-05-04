// Tam ekran sidebar funksionallığı sidebar-fullscreen.js
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('mainSidebar');
    const profileContent = document.getElementById('profileContent');
    const sidebarLinks = document.querySelectorAll('[data-sidebar-item]');

    // Sidebar ilk açılışda da dar vəziyyətdə qalsın
    sidebar.classList.add('sidebar-collapsed');

    // Service-lərin hazır olmasını gözlə
    function waitForService(serviceName, callback, maxAttempts = 20) {
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (window[serviceName]) {
                clearInterval(interval);
                console.log(`✅ ${serviceName} tapıldı (${attempts} cəhddən sonra)`);
                callback();
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.error(`❌ ${serviceName} tapılmadı (${maxAttempts} cəhd)`);
                // Fallback - event yarat
                const fallbackBtn = document.getElementById(serviceName.replace('Service', 'Btn') ||
                                                              serviceName.replace('Modal', 'Btn') ||
                                                              'openCompaniesModalBtn');
                if (fallbackBtn) {
                    fallbackBtn.click();
                }
            }
        }, 100);
    }

    // Hər linkə klik eventi
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Modal açan linklər üçün
            if (this.getAttribute('href') === '#') {
                e.preventDefault();
            }

            // Sidebar-ı daralt
            sidebar.classList.add('sidebar-collapsed');

            // Profil hissəsinə scroll et (əgər eyni səhifədirsə)
            if (this.getAttribute('href') === '../wp.html') {
                profileContent.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }

            // Link-in öz funksionallığı
            const linkId = this.id;

            if (linkId === 'openCompaniesModalBtn') {
                e.preventDefault();
                setTimeout(() => {
                    console.log('🏢 Şirkətlər düyməsi klikləndi');

                    // Əvvəlcə window.companiesService yoxla
                    if (window.companiesService) {
                        console.log('✅ companiesService tapıldı, showCompaniesSection çağırılır');
                        window.companiesService.showCompaniesSection();
                    }
                    // Sonra window.profileApp?.companiesService yoxla
                    else if (window.profileApp && window.profileApp.companiesService) {
                        console.log('✅ profileApp.companiesService tapıldı');
                        window.profileApp.companiesService.showCompaniesSection();
                    }
                    // Ən sonda event yarat
                    else {
                        console.warn('⚠️ companiesService tapılmadı, event yaradılır');
                        const modalEvent = new Event('click', { bubbles: true });
                        document.getElementById('openCompaniesModalBtn').dispatchEvent(modalEvent);
                    }
                }, 150);
            }
            else if (linkId === 'openPartniorModalBtn') {
                e.preventDefault();
                setTimeout(() => {
                    console.log('🤝 Partnyorlar düyməsi klikləndi');
                    if (window.partnersModal) {
                        window.partnersModal.open();
                    } else {
                        const modalEvent = new Event('click', { bubbles: true });
                        document.getElementById('openPartniorModalBtn').dispatchEvent(modalEvent);
                    }
                }, 150);
            }
            else if (linkId === 'fayllarimBtn') {
                e.preventDefault();
                setTimeout(() => {
                    console.log('📁 Fayllarım düyməsi klikləndi');
                    if (window.showFilesSection) {
                        window.showFilesSection();
                    } else if (window.filesUI) {
                        window.filesUI.showFilesSection();
                    } else {
                        const modalEvent = new Event('click', { bubbles: true });
                        document.getElementById('fayllarimBtn').dispatchEvent(modalEvent);
                    }
                }, 150);
            }
            else if (linkId === 'openEmployeesModalBtn') {
                e.preventDefault();
                setTimeout(() => {
                    console.log('👥 İşçilər düyməsi klikləndi');
                    if (window.employeesService) {
                        window.employeesService.openEmployeesModal();
                    } else {
                        const modalEvent = new Event('click', { bubbles: true });
                        document.getElementById('openEmployeesModalBtn').dispatchEvent(modalEvent);
                    }
                }, 150);
            }
            else if (linkId === 'openPermissionsModalBtn') {
                e.preventDefault();
                setTimeout(() => {
                    console.log('🔐 Departament icazələri düyməsi klikləndi');
                    if (window.permissionsService) {
                        window.permissionsService.openDepartmentPermissions();
                    } else {
                        const modalEvent = new Event('click', { bubbles: true });
                        document.getElementById('openPermissionsModalBtn').dispatchEvent(modalEvent);
                    }
                }, 150);
            }
        });
    });

    // Sidebar hover olanda mətnləri göstər
    sidebar.addEventListener('mouseenter', function() {
        // Hoverda sidebar böyüyür (CSS-də idarə olunur)
    });

    // Modal pəncərələri tam ekran et
    function makeModalsFullscreen() {
        const modals = document.querySelectorAll('.companies-modal');
        modals.forEach(modal => {
            const content = modal.querySelector('.max-w-6xl, .max-w-4xl');
            if (content) {
                content.style.maxWidth = '95%';
                content.style.width = '95%';
                content.style.height = '90vh';
            }
        });
    }

    makeModalsFullscreen();

    // Yeni modal əlavə olunanda da tam ekran et
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1 && node.classList && node.classList.contains('companies-modal')) {
                    const content = node.querySelector('.max-w-6xl, .max-w-4xl');
                    if (content) {
                        content.style.maxWidth = '95%';
                        content.style.width = '95%';
                        content.style.height = '90vh';
                    }
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
});