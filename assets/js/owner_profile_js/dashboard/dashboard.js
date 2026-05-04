// dashboard.js - REAL DATA ilə düzəliş edilmiş versiya (DETAYLI)

class DashboardManager {
    constructor(apiService) {
        this.apiService = apiService;
        this.userCompanyCode = null;
        this.userData = null;
        this.userId = null;
        this.companies = [];
        this.bazaId = null;
        this.employees = [];
        this.activeTasks = [];

        // ✅ CACHE MÜDDƏTLƏRİ (saniyə)
        this.cacheTTL = {
            companies: 3600,     // 10 dəqiqə
            employees: 3300,      // 5 dəqiqə
            tasks: 360,           // 1 dəqiqə
            userData: 1800       // 30 dəqiqə
        };

        // DOM elementləri
        this.elements = {
            companiesCount: document.getElementById('dashboardCompaniesCount'),
            employeesCount: document.getElementById('dashboardEmployeesCount'),
            tasksCount: document.getElementById('dashboardTasksCount'),
            recentActivitiesContainer: document.querySelector('#dashboardSection .space-y-3')
        };
    }

    /**
     * Məlumatı cache-lə
     */
    setCache(key, data, ttlSeconds) {
        try {
            const cacheItem = {
                data: data,
                timestamp: Date.now(),
                ttl: ttlSeconds * 1000
            };
            localStorage.setItem(`dashboard_cache_${key}`, JSON.stringify(cacheItem));
            console.log(`✅ Cache edildi: ${key} (${ttlSeconds}s)`);
            return true;
        } catch (error) {
            console.error(`❌ Cache xətası (${key}):`, error);
            return false;
        }
    }

    /**
     * Cache-dən məlumat oxu
     */
    getCache(key) {
        try {
            const cached = localStorage.getItem(`dashboard_cache_${key}`);
            if (!cached) return null;

            const cacheItem = JSON.parse(cached);
            const age = Date.now() - cacheItem.timestamp;

            if (age > cacheItem.ttl) {
                console.log(`⏰ Cache vaxtı keçib: ${key} (${Math.floor(age/1000)}s)`);
                localStorage.removeItem(`dashboard_cache_${key}`);
                return null;
            }

            console.log(`📦 Cache-dən oxundu: ${key} (${Math.floor(age/1000)}s əvvəl)`);
            return cacheItem.data;
        } catch (error) {
            console.error(`❌ Cache oxuma xətası (${key}):`, error);
            return null;
        }
    }

    /**
     * Müəyyən cache-i sil
     */
    clearCache(key = null) {
        if (key) {
            localStorage.removeItem(`dashboard_cache_${key}`);
            console.log(`🗑️ Cache silindi: ${key}`);
        } else {
            // Bütün dashboard cache-lərini sil
            let count = 0;
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith('dashboard_cache_')) {
                    localStorage.removeItem(k);
                    count++;
                }
            });
            console.log(`🗑️ ${count} dashboard cache silindi`);
        }
    }

    // ==================== DƏYİŞDİRİLMİŞ METODLAR ====================

    async getUserCompanyCode(forceRefresh = false) {
        try {
            // Cache-dən yoxla
            if (!forceRefresh) {
                const cached = this.getCache('userData');
                if (cached) {
                    console.log('📦 User data cache-dən yükləndi');
                    this.userData = cached.userData;
                    this.userId = cached.userId;
                    this.userCompanyCode = cached.userCompanyCode;
                    this.bazaId = cached.bazaId;  // <-- BURAYA ƏLAVƏ EDİN

                    // baza_id-ni localStorage-da da saxla
                    if (this.bazaId) {
                        localStorage.setItem('baza_id', this.bazaId);
                        console.log('✅ baza_id cache-dən yükləndi:', this.bazaId);
                    }

                    if (this.userData) {
                        localStorage.setItem('user', JSON.stringify(this.userData));
                    }
                    return;
                }
            }

            const response = await this.apiService.getCurrentUser();
            console.log('👤 İstifadəçi məlumatları:', response);

            if (response && response.success && response.user) {
                this.userData = response.user;
            } else if (response && response.user) {
                this.userData = response.user;
            } else if (response && !response.user) {
                this.userData = response;
            }

            // 🔥 BURADA ƏSAS DƏYİŞİKLİK - baza_id-ni AL
            // user_service obyektindən götür
            if (response && response.user_service && response.user_service.baza_id) {
                this.bazaId = response.user_service.baza_id;
                console.log('✅ baza_id user_service-dən:', this.bazaId);
            }
            // user obyektindən götür
            else if (this.userData && this.userData.baza_id) {
                this.bazaId = this.userData.baza_id;
                console.log('✅ baza_id user-dən:', this.bazaId);
            }
            // token-dən götür
            else if (this.apiService.token) {
                try {
                    const token = this.apiService.token;
                    const parts = token.split('.');
                    if (parts.length === 3) {
                        const payload = JSON.parse(atob(parts[1]));
                        if (payload.baza_id) {
                            this.bazaId = payload.baza_id;
                            console.log('✅ baza_id token-dən:', this.bazaId);
                        }
                    }
                } catch(e) {}
            }

            console.log('📦 User data:', this.userData);
            console.log('🏢 baza_id:', this.bazaId);

            this.userId = this.userData?.id || this.userData?.user_id;
            console.log('🆔 İstifadəçi ID:', this.userId);

            this.userCompanyCode =
                this.userData?.company_code ||
                this.userData?.companyCode ||
                this.userData?.company?.code ||
                this.userData?.company?.company_code ||
                this.userData?.current_company_code;

            if (!this.userCompanyCode && this.apiService.token) {
                try {
                    const token = this.apiService.token;
                    const parts = token.split('.');
                    if (parts.length === 3) {
                        const payload = JSON.parse(atob(parts[1]));
                        this.userCompanyCode = payload.company_code || payload.companyCode;
                    }
                } catch(e) {}
            }

            console.log('🏢 İstifadəçi şirkət kodu:', this.userCompanyCode);

            // baza_id-ni localStorage-da saxla (1C Dashboard üçün)
            if (this.bazaId) {
                localStorage.setItem('baza_id', this.bazaId);
                localStorage.setItem('user_baza_id', this.bazaId);
                console.log('💾 baza_id localStorage-a yazıldı:', this.bazaId);
            }

            // Cache-lə
            this.setCache('userData', {
                userData: this.userData,
                userId: this.userId,
                userCompanyCode: this.userCompanyCode,
                bazaId: this.bazaId  // <-- BURAYA ƏLAVƏ EDİN
            }, this.cacheTTL.userData);

            if (this.userData) {
                localStorage.setItem('user', JSON.stringify({
                    ...this.userData,
                    company_code: this.userCompanyCode,
                    baza_id: this.bazaId,
                    id: this.userId
                }));
            }

        } catch (error) {
            console.error('❌ İstifadəçi məlumatları alınmadı:', error);
            if (error.message?.includes('401')) {
                this.apiService.redirectToLogin();
            }
            throw error;
        }
    }
    // 1C Dashboard-u açmaq üçün metod əlavə edin
    openOneCDashboard() {
        if (!this.bazaId) {
            console.error('❌ baza_id tapılmadı!');
            alert('Baza ID tapılmadı. Zəhmət olmasa yenidən daxil olun.');
            return;
        }

        console.log('🚀 Opening 1C Dashboard for baza_id:', this.bazaId);

        // Əgər GF1C obyekti varsa, onu çağır
        if (typeof GF1C !== 'undefined' && GF1C.open) {
            // baza_id-ni qlobal olaraq saxla
            window.GF_BAZA_ID = this.bazaId;
            GF1C.open();
        } else {
            // Əgər 1C Dashboard ayrı səhifədədirsə
            window.location.href = `owner/owp.html?baza_id=${this.bazaId}`;
        }
    }

    async loadCompanies(forceRefresh = false) {
        try {
            // Cache-dən yoxla
            if (!forceRefresh) {
                const cached = this.getCache('companies');
                if (cached) {
                    console.log('📦 Şirkətlər cache-dən yükləndi');
                    this.companies = cached;
                    localStorage.setItem('companiesCount', this.companies.length);
                    return;
                }
            }

            console.log('📡 Şirkətlər yüklənir...');
            console.log(`🌐 API: /companies/${this.userCompanyCode}/sub-companies`);

            const response = await this.apiService.get(`/companies/${this.userCompanyCode}/sub-companies`);

            console.log('📥 API cavabı:', response);

            if (response && response.sub_companies) {
                this.companies = response.sub_companies;
            } else if (Array.isArray(response)) {
                this.companies = response;
            } else {
                this.companies = [];
            }

            // Hər bir şirkət üçün created_at tarixini yoxla və adı düzgün al
            this.companies = this.companies.map(company => ({
                ...company,
                name: company.name || company.company_name || company.companyName || 'Şirkət',
                created_at: company.created_at || company.createdAt || company.created_date || null
            }));

            console.log(`📊 ${this.companies.length} şirkət tapıldı`);
            if (this.companies.length > 0) {
                console.log('📝 Nümunə şirkət:', {
                    name: this.companies[0].name,
                    created_at: this.companies[0].created_at
                });
            }

            // Cache-lə
            this.setCache('companies', this.companies, this.cacheTTL.companies);
            localStorage.setItem('companiesCount', this.companies.length);

        } catch (error) {
            console.error('❌ Şirkətlər yüklənərkən xəta:', error);
            this.companies = [];
            localStorage.setItem('companiesCount', '0');
        }
    }

    async loadEmployees(forceRefresh = false) {
        try {
            // Cache-dən yoxla
            if (!forceRefresh) {
                const cached = this.getCache('employees');
                if (cached) {
                    console.log('📦 İşçilər cache-dən yükləndi');
                    this.employees = cached;
                    localStorage.setItem('employeesCount', this.employees.length);
                    return;
                }
            }

            console.log('👥 İşçilər yüklənir...');
            console.log(`🌐 API: /users/company/${this.userCompanyCode}`);

            const employees = await this.apiService.get(`/users/company/${this.userCompanyCode}`);
            this.employees = Array.isArray(employees) ? employees : [];

            // Hər bir işçi üçün created_at tarixini yoxla və adı düzgün formatla
            this.employees = this.employees.map(employee => {
                const firstName = employee.first_name || employee.ceo_name || employee.name || '';
                const lastName = employee.last_name || employee.ceo_lastname || employee.surname || '';
                const fullName = `${firstName} ${lastName}`.trim();

                return {
                    ...employee,
                    full_name: fullName || employee.email || employee.ceo_email || 'İşçi',
                    created_at: employee.created_at || employee.createdAt || employee.created_date || employee.joined_date || null
                };
            });

            console.log(`👤 ${this.employees.length} işçi tapıldı`);
            if (this.employees.length > 0) {
                console.log('📝 Nümunə işçi:', {
                    name: this.employees[0].full_name,
                    created_at: this.employees[0].created_at
                });
            }

            // Cache-lə
            this.setCache('employees', this.employees, this.cacheTTL.employees);
            localStorage.setItem('employeesCount', this.employees.length);

        } catch (error) {
            console.error('❌ İşçilər yüklənərkən xəta:', error);
            this.employees = [];
            localStorage.setItem('employeesCount', '0');
        }
    }

    async loadActiveTasks(forceRefresh = false) {
        try {
            // Cache-dən yoxla
            if (!forceRefresh) {
                const cached = this.getCache('tasks');
                if (cached) {
                    console.log('📦 Tasklar cache-dən yükləndi');
                    this.activeTasks = cached;
                    if (this.elements.tasksCount) {
                        this.elements.tasksCount.textContent = this.activeTasks.length;
                    }
                    localStorage.setItem('tasksCount', this.activeTasks.length);
                    return;
                }
            }

            console.log('📋 Aktiv tasklar yüklənir...');

            const activeStatuses = ['pending', 'in_progress', 'overdue', 'pending_approval', 'waiting', 'paused'];
            const statusParam = activeStatuses.join(',');

            const queryParams = new URLSearchParams({
                page: 1,
                limit: 100,
                status: statusParam
            });

            if (this.userId) {
                queryParams.append('assigned_to', this.userId);
            }

            if (this.userCompanyCode) {
                queryParams.append('company_code', this.userCompanyCode);
            }

            const url = `/tasks/detailed?${queryParams.toString()}`;
            console.log(`🌐 API sorğusu: ${url}`);

            const tasks = await this.apiService.get(url);

            if (Array.isArray(tasks)) {
                this.activeTasks = tasks;
            } else if (tasks && tasks.data && Array.isArray(tasks.data)) {
                this.activeTasks = tasks.data;
            } else if (tasks && tasks.tasks && Array.isArray(tasks.tasks)) {
                this.activeTasks = tasks.tasks;
            } else if (tasks && tasks.items && Array.isArray(tasks.items)) {
                this.activeTasks = tasks.items;
            } else {
                this.activeTasks = [];
            }

            this.activeTasks = this.activeTasks.filter(task => {
                const status = task.status || task.task_status;
                return activeStatuses.includes(status);
            });

            // Hər bir task üçün tarix və məlumatları formatla
            this.activeTasks = this.activeTasks.map(task => ({
                ...task,
                title: task.title || task.task_title || task.name || task.task_name || 'Task',
                status: task.status || task.task_status || 'pending',
                created_at: task.created_at || task.createdAt || task.created_date || task.updated_at || null
            }));

            console.log(`✅ ${this.activeTasks.length} aktiv task tapıldı`);

            // Cache-lə (tasklar üçün qısa müddət)
            this.setCache('tasks', this.activeTasks, this.cacheTTL.tasks);

            // Task sayını göstər
            if (this.elements.tasksCount) {
                this.elements.tasksCount.textContent = this.activeTasks.length;
            }
            localStorage.setItem('tasksCount', this.activeTasks.length);

        } catch (error) {
            console.error('❌ Tasklar yüklənərkən xəta:', error);
            this.activeTasks = [];
            localStorage.setItem('tasksCount', '0');
            if (this.elements.tasksCount) {
                this.elements.tasksCount.textContent = '0';
            }
        }
    }

    // YENİ: Bütün məlumatları məcburi yenilə
    async refreshAllData() {
        console.log('🔄 Bütün məlumatlar məcburi yenilənir...');

        // Bütün cache-ləri təmizlə
        this.clearCache();

        // Məlumatları yenidən yüklə (forceRefresh = true)
        await this.getUserCompanyCode(true);
        await Promise.all([
            this.loadCompanies(true),
            this.loadEmployees(true),
            this.loadActiveTasks(true)
        ]);

        this.updateStats();
        this.generateRecentActivities();

        console.log('✅ Bütün məlumatlar yeniləndi');
    }

    // ƏSAS init metodunu dəyişdirin
    async init(forceRefresh = false) {
        try {
            console.log('🚀 Dashboard yüklənir...');

            if (!this.apiService || !this.apiService.hasToken()) {
                console.warn('⚠️ Token yoxdur, login olmalısınız');
                this.showAuthError();
                return;
            }

            await this.getUserCompanyCode(forceRefresh);
            await Promise.all([
                this.loadCompanies(forceRefresh),
                this.loadEmployees(forceRefresh),
                this.loadActiveTasks(forceRefresh)
            ]);
            this.updateStats();
            this.generateRecentActivities();
            console.log('✅ Dashboard uğurla yükləndi');
        } catch (error) {
            console.error('❌ Dashboard yüklənmə xətası:', error);
            this.showError();
        }
    }


    updateStats() {
        if (this.elements.companiesCount) {
            this.animateNumber(this.elements.companiesCount, 0, this.companies.length);
        }

        if (this.elements.employeesCount) {
            this.animateNumber(this.elements.employeesCount, 0, this.employees.length);
        }

        if (this.elements.tasksCount) {
            this.animateNumber(this.elements.tasksCount, 0, this.activeTasks.length);
        }
    }

    animateNumber(element, start, end) {
        if (!element) return;

        const duration = 1000;
        const stepTime = 20;
        const steps = duration / stepTime;
        const increment = (end - start) / steps;

        let current = start;
        let step = 0;

        const timer = setInterval(() => {
            step++;
            current += increment;

            if (step >= steps) {
                element.textContent = Math.round(end);
                clearInterval(timer);
            } else {
                element.textContent = Math.round(current);
            }
        }, stepTime);
    }

    // 🔥 ƏSAS DƏYİŞİKLİK: REAL DATA ilə DETAYLI aktivliklərin yaradılması
    buildActivitiesList() {
        const activities = [];

        console.log('🔍 buildActivitiesList çağırıldı');
        console.log('📊 Şirkət sayı:', this.companies.length);
        console.log('👥 İşçi sayı:', this.employees.length);
        console.log('📋 Task sayı:', this.activeTasks.length);

        // 1. Şirkət aktivlikləri - REAL created_at tarixləri ilə
        this.companies.forEach((company) => {
            if (company.created_at) {
                const date = new Date(company.created_at);
                if (!isNaN(date.getTime())) {
                    const companyName = company.name || company.company_name || company.companyName || 'Şirkət';
                    activities.push({
                        type: 'company',
                        description: `${companyName} şirkəti qeydiyyatdan keçdi`,
                        icon: 'building',
                        iconBg: 'green',
                        iconColor: 'green-600',
                        time: this.getTimeAgo(date),
                        date: date,
                        rawDate: company.created_at
                    });
                    console.log(`🏢 Şirkət aktivliyi: ${companyName} - ${company.created_at}`);
                }
            }
        });

        // 2. İşçi aktivlikləri - REAL created_at tarixləri ilə
        this.employees.forEach((employee) => {
            if (employee.created_at) {
                const date = new Date(employee.created_at);
                if (!isNaN(date.getTime())) {
                    const fullName = employee.full_name ||
                                    `${employee.first_name || ''} ${employee.last_name || ''}`.trim() ||
                                    employee.name ||
                                    employee.email ||
                                    'İşçi';

                    const position = employee.position || employee.user_type || 'işçi';
                    const positionText = position === 'admin' || position === 'company_admin' ? 'admin' : 'işçi';

                    activities.push({
                        type: 'employee',
                        description: `${fullName} ${positionText} kimi əlavə edildi`,
                        icon: 'user_service-plus',
                        iconBg: 'blue',
                        iconColor: 'brand-blue',
                        time: this.getTimeAgo(date),
                        date: date,
                        rawDate: employee.created_at
                    });
                    console.log(`👤 İşçi aktivliyi: ${fullName} - ${employee.created_at}`);
                }
            }
        });

        // 3. Task aktivlikləri - YALNIZ SON 5 TASK (hamısını deyil, ən son 5-i)
        // Taskları tarixə görə sırala və ən son 5-i götür
        const sortedTasks = [...this.activeTasks].sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA;
        });

        const recentTasks = sortedTasks.slice(0, 5); // Yalnız son 5 task

        recentTasks.forEach((task) => {
            if (task.created_at) {
                const date = new Date(task.created_at);
                if (!isNaN(date.getTime())) {
                    const taskTitle = task.title || task.task_title || task.name || 'Task';
                    const taskStatus = task.status || task.task_status;

                    let statusText = '';
                    let icon = 'clock';
                    let iconBg = 'orange';
                    let iconColor = 'orange-600';
                    let statusDescription = '';

                    if (taskStatus === 'pending') {
                        statusText = 'gözləmədə';
                        statusDescription = 'gözləmə vəziyyətindədir';
                        icon = 'hourglass-half';
                        iconBg = 'yellow';
                        iconColor = 'yellow-600';
                    } else if (taskStatus === 'in_progress') {
                        statusText = 'davam edir';
                        statusDescription = 'icra edilir';
                        icon = 'spinner';
                        iconBg = 'blue';
                        iconColor = 'blue-600';
                    } else if (taskStatus === 'overdue') {
                        statusText = 'vaxtı keçib';
                        statusDescription = 'müddəti bitmişdir';
                        icon = 'exclamation-triangle';
                        iconBg = 'red';
                        iconColor = 'red-600';
                    }

                    // Kimə aid olduğunu tap
                    let assignedToText = '';
                    if (task.assigned_to_name) {
                        assignedToText = ` (${task.assigned_to_name} üçün)`;
                    } else if (task.assigned_to) {
                        assignedToText = ` (İşçi #${task.assigned_to} üçün)`;
                    }

                    activities.push({
                        type: 'task',
                        description: `"${taskTitle}" tapşırığı ${statusDescription}${assignedToText}`,
                        icon: icon,
                        iconBg: iconBg,
                        iconColor: iconColor,
                        time: this.getTimeAgo(date),
                        date: date,
                        rawDate: task.created_at,
                        taskTitle: taskTitle,
                        taskStatus: taskStatus
                    });
                    console.log(`📋 Task aktivliyi: "${taskTitle}" - ${task.created_at}`);
                }
            }
        });

        // Tarixə görə SORT et (ən yenidən ən köhnəyə)
        activities.sort((a, b) => b.date - a.date);

        console.log(`📅 Ümumi ${activities.length} aktivlik tapıldı`);
        console.log(`   - Şirkət: ${activities.filter(a => a.type === 'company').length}`);
        console.log(`   - İşçi: ${activities.filter(a => a.type === 'employee').length}`);
        console.log(`   - Task: ${activities.filter(a => a.type === 'task').length}`);

        return activities;
    }

    generateRecentActivities() {
        const activities = this.buildActivitiesList();

        if (!this.elements.recentActivitiesContainer) return;

        this.elements.recentActivitiesContainer.innerHTML = '';

        // Son 10 aktivliyi göstər
        const recentActivities = activities.slice(0, 10);

        if (recentActivities.length === 0) {
            this.elements.recentActivitiesContainer.innerHTML = `
                <div class="text-center py-8 text-slate-500">
                    <i class="fa-solid fa-inbox text-4xl mb-2"></i>
                    <p>Hələ heç bir aktivlik yoxdur</p>
                </div>
            `;
            return;
        }

        recentActivities.forEach(activity => {
            const activityElement = this.createActivityElement(activity);
            this.elements.recentActivitiesContainer.appendChild(activityElement);
        });

        console.log(`✅ ${recentActivities.length} aktivlik göstərildi`);
    }

    createActivityElement(activity) {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-3 p-3 bg-white rounded-xl activity-item cursor-pointer hover:bg-gray-50 transition-all';

        const bgColor = {
            blue: 'bg-blue-100',
            green: 'bg-green-100',
            purple: 'bg-purple-100',
            orange: 'bg-orange-100',
            yellow: 'bg-yellow-100',
            red: 'bg-red-100'
        }[activity.iconBg] || 'bg-gray-100';

        div.innerHTML = `
            <div class="h-10 w-10 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0">
                <i class="fa-solid fa-${activity.icon} text-${activity.iconColor}"></i>
            </div>
            <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-800">${this.escapeHtml(activity.description)}</p>
                <p class="text-xs text-gray-500 mt-1">${activity.time}</p>
            </div>
        `;

        return div;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        const diffMonth = Math.floor(diffDay / 30);
        const diffYear = Math.floor(diffDay / 365);

        if (diffSec < 60) return 'bir neçə saniyə əvvəl';
        if (diffMin < 60) return `${diffMin} dəqiqə əvvəl`;
        if (diffHour < 24) return `${diffHour} saat əvvəl`;
        if (diffDay === 1) return 'dünən';
        if (diffDay < 7) return `${diffDay} gün əvvəl`;
        if (diffDay < 30) return `${Math.floor(diffDay / 7)} həftə əvvəl`;
        if (diffMonth < 12) return `${diffMonth} ay əvvəl`;

        return date.toLocaleDateString('az-AZ');
    }

    showError() {
        if (this.elements.companiesCount) this.elements.companiesCount.textContent = '0';
        if (this.elements.employeesCount) this.elements.employeesCount.textContent = '0';
        if (this.elements.tasksCount) this.elements.tasksCount.textContent = '0';

        if (this.elements.recentActivitiesContainer) {
            this.elements.recentActivitiesContainer.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <i class="fa-solid fa-circle-exclamation text-4xl mb-2"></i>
                    <p>Məlumatlar yüklənərkən xəta baş verdi</p>
                    <button onclick="location.reload()" class="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition">
                        <i class="fa-solid fa-rotate-right mr-2"></i>
                        Yenidən cəhd edin
                    </button>
                </div>
            `;
        }
    }

    showAuthError() {
        if (this.elements.recentActivitiesContainer) {
            this.elements.recentActivitiesContainer.innerHTML = `
                <div class="text-center py-8 text-orange-500">
                    <i class="fa-solid fa-lock text-4xl mb-2"></i>
                    <p>Zəhmət olmasa daxil olun</p>
                    <a href="/login.html" class="mt-3 inline-block px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition">
                        <i class="fa-solid fa-right-to-bracket mr-2"></i>
                        Daxil ol
                    </a>
                </div>
            `;
        }
    }
}

// Dashboard-u işə sal
document.addEventListener('DOMContentLoaded', async () => {
    // URL-də refresh parametri varsa, məcburi yenilə
    const urlParams = new URLSearchParams(window.location.search);
    const forceRefresh = urlParams.get('refresh') === 'true';

    if (forceRefresh) {
        console.log('🔄 Məcburi yeniləmə - cache təmizlənəcək');
        if (window.dashboardManager) {
            await window.dashboardManager.refreshAllData();
        }
    }

    setTimeout(async () => {
        if (typeof window.apiService !== 'undefined' && window.apiService) {
            console.log('✅ apiService tapıldı, dashboard başladılır...');
            const dashboard = new DashboardManager(window.apiService);
            await dashboard.init(forceRefresh); // forceRefresh parametri ötür
            window.dashboardManager = dashboard;
        } else {
            console.error('❌ apiService tapılmadı!');
            if (typeof ApiService !== 'undefined') {
                console.log('🔄 ApiService class-ı var, instance yaradılır...');
                window.apiService = new ApiService();
                const dashboard = new DashboardManager(window.apiService);
                await dashboard.init(forceRefresh);
                window.dashboardManager = dashboard;
            }
        }
    }, 100);
});

// Global refresh funksiyası (əl ilə yeniləmək üçün)
window.refreshDashboard = async function() {
    if (window.dashboardManager) {
        await window.dashboardManager.refreshAllData();
        console.log('✅ Dashboard əl ilə yeniləndi');
    } else {
        console.error('❌ Dashboard manager tapılmadı');
    }
};

