// ===============================================
// archiveTableManager.js - Arxiv Tasklar üçün Xüsusi Manager
// ===============================================

const ArchiveTableManager = {
    // Cari səhifə
    currentPage: 1,
    pageSize: 20,
    totalTasks: 0,
    totalPages: 1,

    // Filter məlumatları
    filters: {
        company_id: '',
        status: '',
        search: '',
        start_date: '',
        end_date: ''
    },

    // Taskların cache-i
    tasks: [],


    loadArchiveTasks: async function(page = 1) {
        try {
            console.log(`📁 Arxiv tasklar yüklənir (səhifə ${page})...`);

            // ========== 🔥 BİRBAŞA TOKEN-DAN COMPANY_ID AL - BAŞQA HEÇ NƏYƏ BAXMA! ==========
            let currentCompanyId = null;

            const token = localStorage.getItem('guven_token') || localStorage.getItem('access_token');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.company_id) {
                        currentCompanyId = payload.company_id;
                        console.log('🔑 TOKEN-dan company_id:', currentCompanyId);
                    }
                } catch(e) {
                    console.warn('⚠️ Token parse xətası:', e);
                }
            }

            // Token-dan alınmadısa, HARDCODE (Güvən Finans üçün 51, Socarrr üçün 55)
            if (!currentCompanyId) {
                // Şirkət koduna görə təyin et
                const companyCode = localStorage.getItem('company_code') || 'GUV26001';
                if (companyCode === 'GUV26001') {
                    currentCompanyId = 51;
                } else if (companyCode === 'SOC26001') {
                    currentCompanyId = 55;
                } else {
                    currentCompanyId = 55; // default
                }
                console.log('🎯 HARDCODE company_id:', currentCompanyId);
            }

            // ❌ Əgər hələ də yoxdursa, XƏTA VER
            if (!currentCompanyId) {
                console.error('❌ Company ID tapılmadı!');
                this.showError('Şirkət məlumatları tapılmadı');
                return;
            }

            console.log('🎯 İSTİFADƏ OLUNACAQ COMPANY_ID:', currentCompanyId);


            // Tab aktivliyini dəyiş
            const internalTab = document.getElementById('internalArchiveTab');
            const externalTab = document.getElementById('externalArchiveTab');
            const partnerTab = document.getElementById('partnerArchiveTab');

            if (internalTab) internalTab.classList.add('active');
            if (externalTab) externalTab.classList.remove('active');
            if (partnerTab) partnerTab.classList.remove('active');

            this.showLoading();
            this.currentPage = page;

            // 🔥 MÜTLƏQ company_id əlavə et!
            const queryParams = new URLSearchParams({
                page: page,
                limit: this.pageSize,
                company_id: currentCompanyId  // ← BU ÇOX VACİB!
            });

            // Əgər filtrlər varsa, onları da əlavə et
            if (this.filters.status) queryParams.append('status', this.filters.status);
            if (this.filters.search) queryParams.append('search', this.filters.search);
            if (this.filters.start_date) queryParams.append('start_date', this.filters.start_date);
            if (this.filters.end_date) queryParams.append('end_date', this.filters.end_date);

            const endpoint = `/task-archive/?${queryParams.toString()}`;
            console.log(`📡 Endpoint: ${endpoint}`);

            // 🔥 508 xətası üçün xüsusi handling
            let response;
            try {
                response = await makeApiRequest(endpoint, 'GET');
            } catch (requestError) {
                console.error('❌ Network xətası:', requestError);

                // Cache-dən yükləməyə çalış
                const cachedData = this.loadFromCache(currentCompanyId);
                if (cachedData) {
                    console.log('📦 Cache-dən arxiv məlumatları göstərilir');
                    this.renderArchiveTasks(cachedData.tasks, page);
                    this.totalTasks = cachedData.total;
                    this.totalPages = Math.ceil(this.totalTasks / this.pageSize) || 1;
                    this.updatePagination();
                    this.hideLoading();
                    return;
                }

                this.showError('Serverlə əlaqə qurula bilmədi');
                this.hideLoading();
                return;
            }

            // 🔥 508 xətasını yoxla
            if (response && (response.status === 508 || response.error?.includes('Loop') || response.error?.includes('508'))) {
                console.error('❌ Server 508 Loop Detected xətası');

                // Cache-dən yüklə
                const cachedData = this.loadFromCache(currentCompanyId);
                if (cachedData) {
                    console.log('📦 Cache-dən (508 xətası səbəbilə) arxiv məlumatları göstərilir');
                    this.renderArchiveTasks(cachedData.tasks, page);
                    this.totalTasks = cachedData.total;
                    this.totalPages = Math.ceil(this.totalTasks / this.pageSize) || 1;
                    this.updatePagination();
                } else {
                    this.showError('Arxiv məlumatları müvəqqəti olaraq əlçatan deyil');
                    this.showEmptyTable();
                }

                this.hideLoading();
                return;
            }

            console.log('📦 Cavab:', response);

            let archiveTasks = [];
            let total = 0;

            if (response && !response.error) {
                if (response.items && Array.isArray(response.items)) {
                    archiveTasks = response.items;
                    total = response.total || archiveTasks.length;
                } else if (response.data && Array.isArray(response.data)) {
                    archiveTasks = response.data;
                    total = response.total || archiveTasks.length;
                } else if (Array.isArray(response)) {
                    archiveTasks = response;
                    total = archiveTasks.length;
                }
            }

            console.log(`✅ ${archiveTasks.length} arxiv task tapıldı`);

            // 🔥 Cache-də saxla (company_id-ə görə)
            this.saveToCache(currentCompanyId, archiveTasks, total);

            this.tasks = archiveTasks;
            this.totalTasks = total;
            this.totalPages = Math.ceil(total / this.pageSize) || 1;

            // Taskları göstər
            await this.renderArchiveTasks(archiveTasks, page);

            // Pagination-ı yenilə
            this.updatePagination();

            this.hideLoading();

        } catch (error) {
            console.error('❌ Xəta:', error);

            // Fallback: LocalStorage cache
            const token = localStorage.getItem('guven_token');
            let companyId = null;
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    companyId = payload.company_id;
                } catch(e) {}
            }

            if (companyId) {
                const cachedData = this.loadFromCache(companyId);
                if (cachedData) {
                    console.log('📦 Fallback: Cache-dən göstərilir');
                    this.renderArchiveTasks(cachedData.tasks, page);
                    this.totalTasks = cachedData.total;
                    this.totalPages = Math.ceil(this.totalTasks / this.pageSize) || 1;
                    this.updatePagination();
                } else {
                    this.showEmptyTable();
                }
            } else {
                this.showEmptyTable();
            }

            this.hideLoading();
        }
    },

    // 🔥 YENİ FUNKSİYALAR: Cache idarəsi

    saveToCache: function(companyId, tasks, total) {
        try {
            const cacheData = {
                tasks: tasks,
                total: total,
                timestamp: Date.now(),
                company_id: companyId
            };
            localStorage.setItem(`archive_cache_${companyId}`, JSON.stringify(cacheData));
            console.log(`💾 Arxiv cache yadda saxlanıldı: company_${companyId}, ${tasks.length} task`);
        } catch (e) {
            console.warn('⚠️ Cache save xətası:', e);
        }
    },

    loadFromCache: function(companyId) {
        try {
            const cached = localStorage.getItem(`archive_cache_${companyId}`);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const age = (Date.now() - data.timestamp) / 1000 / 60; // dəqiqə ilə

            // 5 dəqiqədən azdırsa, cache etibarlıdır
            if (age < 5 && data.company_id === companyId) {
                console.log(`📦 Cache-dən yükləndi: company_${companyId}, yaş: ${age.toFixed(1)} dəq`);
                return data;
            }

            console.log(`⏰ Cache vaxtı keçib: ${age.toFixed(1)} dəq`);
            return null;
        } catch (e) {
            console.warn('⚠️ Cache load xətası:', e);
            return null;
        }
    },

    clearCache: function(companyId = null) {
        try {
            if (companyId) {
                localStorage.removeItem(`archive_cache_${companyId}`);
                console.log(`🗑️ Arxiv cache silindi: company_${companyId}`);
            } else {
                // Bütün archive cache-lərini sil
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('archive_cache_')) {
                        localStorage.removeItem(key);
                        console.log(`🗑️ Silindi: ${key}`);
                    }
                });
            }
        } catch (e) {
            console.warn('⚠️ Cache clear xətası:', e);
        }
    },

    showError: function(message) {
        const tbody = document.getElementById('archiveTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="17" class="empty-state">
                        <i class="fas fa-exclamation-triangle fa-3x mb-3" style="color: #dc2626;"></i>
                        <h3>Xəta Baş Verdi</h3>
                        <p>${message}</p>
                        <button class="primary-btn btn-sm" onclick="ArchiveTableManager.loadArchiveTasks(1)">
                            <i class="fas fa-sync-alt"></i> Yenidən cəhd et
                        </button>
                    </td>
                </tr>
            `;
        }

        const pagination = document.getElementById('archivePagination');
        if (pagination) pagination.style.display = 'none';
    },


    /**
     * Arxiv tasklarını cədvəldə göstər
     */
    renderArchiveTasks: async function(tasks, page) {
        console.log(`🎨 renderArchiveTasks: ${tasks.length} task, səhifə ${page}`);

        const tbody = document.getElementById('archiveTableBody');
        if (!tbody) {
            console.error('❌ archiveTableBody tapılmadı!');
            return;
        }

        if (!tasks || tasks.length === 0) {
            this.showEmptyTable();
            return;
        }

        try {
            let html = '';

            for (let i = 0; i < tasks.length; i++) {
                const task = tasks[i];
                console.log(`📝 Sətir ${i+1}: ID=${task.id}, Kod=${task.task_code}`);

                // ✅ BİRBAŞA ArchiveTasks-dən istifadə et
                if (window.ArchiveTasks && typeof window.ArchiveTasks.createArchiveRowHTML === 'function') {
                    try {
                        const rowHTML = await window.ArchiveTasks.createArchiveRowHTML(task, i, page);
                        html += rowHTML;
                    } catch (rowError) {
                        console.error(`❌ Sətir xətası:`, rowError);
                        html += this.createFallbackRow(task, i, page);
                    }
                } else {
                    console.warn('⚠️ ArchiveTasks.createArchiveRowHTML tapılmadı, fallback istifadə olunur');
                    html += this.createFallbackRow(task, i, page);
                }
            }

            tbody.innerHTML = html;
            console.log('✅ Arxiv cədvəli yeniləndi');

        } catch (error) {
            console.error('❌ Render xətası:', error);
            this.showEmptyTable();
        }
    },

    /**
     * Fallback sətir
     */
    createFallbackRow: function(task, index, page) {
        const serialNumber = (page - 1) * this.pageSize + index + 1;
        const formatDate = (d) => d ? new Date(d).toLocaleDateString('az-AZ') : '-';

        return `
            <tr data-archive-id="${task.id}">
                <td class="text-center">${serialNumber}</td>
                <td>${formatDate(task.created_at)}</td>
                <td>${task.company_name || `ID: ${task.company_id}` || '-'}</td>
                <td>${task.creator_name || task.created_by_name || `ID: ${task.created_by}`}</td>
                <td>${task.assigned_to_name || task.executor_name || 'Təyin edilməyib'}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="ArchiveTableManager.viewArchiveDetails(${task.id})">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </td>
                <td>${task.work_type_name || '-'}</td>
                <td>${(task.task_description || '').substring(0, 50)}${(task.task_description || '').length > 50 ? '...' : ''}</td>
                <td>${task.attachments?.length || 0} fayl</td>
                <td>${formatDate(task.due_date)}</td>
                <td><span class="status-badge status-${task.status}">${task.status || '-'}</span></td>
                <td>${formatDate(task.completed_date)}</td>
                <td>${formatDate(task.archived_at)}</td>
                <td>${task.estimated_hours || 0}</td>
                <td>${task.billing_rate || 0} ₼</td>
                <td>0.00 ₼</td>
                <td>${task.department_name || '-'}</td>
            </tr>
        `;
    },

    /**
     * Arxiv details görüntülə - BİRBAŞA ArchiveTasks-ə yönləndir
     */
    viewArchiveDetails: function(archiveId) {
        console.log('👁️ Arxiv details:', archiveId);

        // ✅ Birbaşa ArchiveTasks-in funksiyasını çağır
        if (window.ArchiveTasks && typeof window.ArchiveTasks.viewArchiveTaskDetails === 'function') {
            window.ArchiveTasks.viewArchiveTaskDetails(archiveId);
        } else {
            console.error('❌ ArchiveTasks.viewArchiveTaskDetails tapılmadı');
            console.log('📋 Mövcud ArchiveTasks funksiyaları:', Object.keys(window.ArchiveTasks || {}));
            alert(`Arxiv ID: ${archiveId} detalları göstərilir`);
        }
    },

    /**
     * Boş cədvəl göstər
     */
    showEmptyTable: function() {
        const tbody = document.getElementById('archiveTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="17" class="empty-state">
                        <i class="fas fa-archive fa-3x mb-3" style="color: #94a3b8;"></i>
                        <h3>Arxivlənmiş İşlər</h3>
                        <p>Hazırda arxivdə heç bir iş yoxdur.</p>
                        <p class="empty-hint">Tamamlanmış işlər avtomatik olaraq buraya arxivlənir.</p>
                        <button class="primary-btn btn-sm" onclick="ArchiveTableManager.loadArchiveTasks(1)">
                            <i class="fas fa-sync-alt"></i> Yenidən yüklə
                        </button>
                    </td>
                </tr>
            `;
        }

        const pagination = document.getElementById('archivePagination');
        if (pagination) pagination.style.display = 'none';
    },

    /**
     * Yükləmə göstəricisi
     */
    showLoading: function() {
        const tbody = document.getElementById('archiveTableBody');
        if (tbody && tbody.children.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="17">
                        <div class="table-loading">
                            <div class="loader">
                                <div></div>
                                <div></div>
                            </div>
                            <p>Arxiv yüklənir...</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    },

    /**
     * Yükləmə göstəricisini gizlət
     */
    hideLoading: function() {
        // Heç nə etməyə ehtiyac yox
    },

    // archiveTableManager.js - updatePagination funksiyası

    updatePagination: function() {
        const pagination = document.getElementById('archivePagination');
        const showing = document.getElementById('archiveShowing');
        const pageNumbers = document.getElementById('archivePageNumbers');

        if (!pagination || !showing || !pageNumbers) return;

        if (this.totalTasks === 0) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';

        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, this.totalTasks);
        showing.textContent = `Göstərilir: ${start}-${end} / ${this.totalTasks}`;

        let numbersHTML = '';

        if (this.totalPages <= 7) {
            for (let i = 1; i <= this.totalPages; i++) {
                numbersHTML += this.createPageButton(i);
            }
        } else {
            numbersHTML += this.createPageButton(1);

            if (this.currentPage > 3) {
                numbersHTML += '<span class="pagination-ellipsis">...</span>';
            }

            let startPage = Math.max(2, this.currentPage - 1);
            let endPage = Math.min(this.totalPages - 1, this.currentPage + 1);

            for (let i = startPage; i <= endPage; i++) {
                numbersHTML += this.createPageButton(i);
            }

            if (this.currentPage < this.totalPages - 2) {
                numbersHTML += '<span class="pagination-ellipsis">...</span>';
            }

            numbersHTML += this.createPageButton(this.totalPages);
        }

        pageNumbers.innerHTML = numbersHTML;

        // ===== ARCHİV PAGİNATİON NUMBERS CONTAİNER-I DA YENİLƏ =====
        const archiveNumbers = document.getElementById('archivePaginationNumbers');
        if (archiveNumbers) {
            let numbersHtml = '';

            // Sadəcə 1-ci səhifəni göstər və ya bütün səhifələri
            if (this.totalPages <= 1) {
                numbersHtml = `<button class="pagination-number active" onclick="ArchiveTableManager.goToPage(1)">1</button>`;
            } else {
                for (let i = 1; i <= this.totalPages; i++) {
                    numbersHtml += `<button class="pagination-number ${i === this.currentPage ? 'active' : ''}" onclick="ArchiveTableManager.goToPage(${i})">${i}</button>`;
                }
            }

            archiveNumbers.innerHTML = numbersHtml;
        }

        const firstBtn = document.getElementById('archiveFirstPage');
        const prevBtn = document.getElementById('archivePrevPage');
        const nextBtn = document.getElementById('archiveNextPage');
        const lastBtn = document.getElementById('archiveLastPage');

        if (firstBtn) {
            firstBtn.disabled = this.currentPage === 1;
            firstBtn.onclick = () => this.firstPage();
        }
        if (prevBtn) {
            prevBtn.disabled = this.currentPage === 1;
            prevBtn.onclick = () => this.prevPage();
        }
        if (nextBtn) {
            nextBtn.disabled = this.currentPage === this.totalPages;
            nextBtn.onclick = () => this.nextPage();
        }
        if (lastBtn) {
            lastBtn.disabled = this.currentPage === this.totalPages;
            lastBtn.onclick = () => this.lastPage();
        }
    },

    /**
     * Səhifə düyməsi yaradır
     */
    createPageButton: function(page) {
        return `
            <button class="pagination-number ${page === this.currentPage ? 'active' : ''}" 
                    onclick="ArchiveTableManager.goToPage(${page})">
                ${page}
            </button>
        `;
    },

    /**
     * Səhifəyə keçid
     */
    goToPage: function(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        console.log(`📌 Archive səhifə dəyişir: ${page}`);
        this.loadArchiveTasks(page);
    },

    /**
     * Əvvəlki səhifə
     */
    prevPage: function() {
        if (this.currentPage > 1) {
            this.loadArchiveTasks(this.currentPage - 1);
        }
    },

    /**
     * Növbəti səhifə
     */
    nextPage: function() {
        if (this.currentPage < this.totalPages) {
            this.loadArchiveTasks(this.currentPage + 1);
        }
    },

    /**
     * İlk səhifə
     */
    firstPage: function() {
        if (this.currentPage !== 1) {
            this.loadArchiveTasks(1);
        }
    },

    /**
     * Son səhifə
     */
    lastPage: function() {
        if (this.currentPage !== this.totalPages) {
            this.loadArchiveTasks(this.totalPages);
        }
    },

    /**
     * Filtrləri tətbiq et
     */
    applyFilters: function() {
        const companyFilter = document.getElementById('archiveCompanyFilter');
        const statusFilter = document.getElementById('archiveStatusFilter');
        const searchFilter = document.getElementById('archiveSearchFilter');
        const startDateFilter = document.getElementById('archiveStartDate');
        const endDateFilter = document.getElementById('archiveEndDate');

        this.filters = {
            company_id: companyFilter ? companyFilter.value : '',
            status: statusFilter ? statusFilter.value : '',
            search: searchFilter ? searchFilter.value : '',
            start_date: startDateFilter ? startDateFilter.value : '',
            end_date: endDateFilter ? endDateFilter.value : ''
        };

        console.log('🔍 Arxiv filtr tətbiq edildi:', this.filters);
        this.loadArchiveTasks(1);
    },

    /**
     * Filtrləri təmizlə
     */
    clearFilters: function() {
        const companyFilter = document.getElementById('archiveCompanyFilter');
        const statusFilter = document.getElementById('archiveStatusFilter');
        const searchFilter = document.getElementById('archiveSearchFilter');
        const startDateFilter = document.getElementById('archiveStartDate');
        const endDateFilter = document.getElementById('archiveEndDate');

        if (companyFilter) companyFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        if (searchFilter) searchFilter.value = '';
        if (startDateFilter) startDateFilter.value = '';
        if (endDateFilter) endDateFilter.value = '';

        this.filters = {
            company_id: '',
            status: '',
            search: '',
            start_date: '',
            end_date: ''
        };

        this.loadArchiveTasks(1);
    },

    /**
     * Cədvəli yenilə
     */
    refresh: function() {
        this.loadArchiveTasks(this.currentPage);
    },

    /**
     * Event listener-ları qur
     */
    setupEventListeners: function() {
        console.log('🔌 ArchiveTableManager: Event listeners qurulur...');

        // Pagination düymələri
        document.getElementById('archiveFirstPage')?.addEventListener('click', () => {
            this.firstPage();
        });

        document.getElementById('archivePrevPage')?.addEventListener('click', () => {
            this.prevPage();
        });

        document.getElementById('archiveNextPage')?.addEventListener('click', () => {
            this.nextPage();
        });

        document.getElementById('archiveLastPage')?.addEventListener('click', () => {
            this.lastPage();
        });

        // Filter düymələri
        document.getElementById('archiveApplyFilter')?.addEventListener('click', () => {
            this.applyFilters();
        });

        document.getElementById('archiveClearFilter')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // Refresh düyməsi
        document.getElementById('archiveRefreshBtn')?.addEventListener('click', () => {
            this.refresh();
        });

        // Export düyməsi
        document.getElementById('exportArchiveBtn')?.addEventListener('click', () => {
            this.exportArchive();
        });

        console.log('✅ ArchiveTableManager: Event listeners quruldu');
    },

    /**
     * Arxiv məlumatlarını export et
     */
    exportArchive: function() {
        console.log('📊 Arxiv export edilir...');
        if (window.ExcelExport && typeof window.ExcelExport.exportArchive === 'function') {
            window.ExcelExport.exportArchive(this.tasks);
        } else {
            alert('Export funksiyası hazırlanır');
        }
    },

    setupTabEvents: function() {
        const internalTab = document.getElementById('internalArchiveTab');
        const externalTab = document.getElementById('externalArchiveTab');
        const partnerTab = document.getElementById('partnerArchiveTab');

        if (internalTab) {
            internalTab.addEventListener('click', () => {
                this.loadArchiveTasks(1);
            });
        }

        if (externalTab) {
            externalTab.addEventListener('click', () => {
                if (window.ExternalTaskArchive) {
                    window.ExternalTaskArchive.loadExternalArchiveTasks(1);
                }
            });
        }

        if (partnerTab) {
            partnerTab.addEventListener('click', () => {
                if (window.PartnerTaskArchive) {
                    window.PartnerTaskArchive.loadPartnerArchiveTasks(1);
                }
            });
        }
    },


    /**
     * İlkin yükləmə
     */
    initialize: function() {
        console.log('🚀 ArchiveTableManager başladılır...');

        this.setupEventListeners();
        this.setupTabEvents();

        // ArchiveTasks-in mövcudluğunu yoxla
        if (!window.ArchiveTasks) {
            console.warn('⚠️ ArchiveTasks tapılmadı!');
        } else {
            console.log('✅ ArchiveTasks mövcuddur');
        }

        // Taskları yüklə - DÜZGÜN ENDPOINT-Ə sorğu göndər
        setTimeout(() => {
            this.loadArchiveTasks(1);
        }, 300);

        return this;
    }
};

// Global export
if (typeof window !== 'undefined') {
    window.ArchiveTableManager = ArchiveTableManager;

    // DOM hazır olduqda başlat
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM hazır, ArchiveTableManager başladılır...');
        setTimeout(() => {
            ArchiveTableManager.initialize();
        }, 500);
    });

    console.log('✅ ArchiveTableManager yükləndi');
}