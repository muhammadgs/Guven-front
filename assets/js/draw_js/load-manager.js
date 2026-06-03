// load-manager.js - DÜZƏLDİLMİŞ VERSİYA
(function() {
    class LoadManager {
        constructor(diagramTool) {
            this.diagramTool = diagramTool;
            this.apiManager = diagramTool.apiManager;
            this.selectedDiagram = null;
            this.currentPage = 1;
            this.perPage = 20;
            this.currentView = 'my-diagrams';
        }

        // load-manager.js - setupLoadControls funksiyası
    setupLoadControls() {
        console.log('🔧 Setting up load controls...');

        // Load düyməsi
        const loadBtn = document.getElementById('loadBtn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                console.log('📂 Load button clicked');
                this.showLoadModal();
            });
        } else {
            console.error('❌ Load button not found!');
        }

        // Load modal kontrolləri
        const cancelBtn = document.getElementById('cancelLoadBtn');
        const confirmBtn = document.getElementById('confirmLoadBtn');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                console.log('❌ Cancel button clicked');
                this.hideLoadModal();
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                console.log('✅ Confirm button clicked');
                this.loadSelectedDiagram();
            });
        }

        // Auto-save (conditional - only if apiManager exists and has method)
        if (this.apiManager && typeof this.apiManager.setupAutoSave === 'function') {
            console.log('⏰ Setting up auto-save...');
            this.apiManager.setupAutoSave(30000); // 30 saniyə
        } else {
            console.warn('⚠️ Auto-save not available');
        }

        // View switcher əlavə et
        this.setupViewSwitcher();
    }

        setupViewSwitcher() {
            const modalContent = document.querySelector('#loadModal .modal-content');
            const listElement = document.getElementById('savedDiagramsList');

            if (!modalContent || !listElement) {
                console.error('❌ Modal elements not found for view switcher');
                return;
            }

            // View switcher container
            const switcher = document.createElement('div');
            switcher.className = 'diagram-view-switcher';
            switcher.style.cssText = `
                display: flex;
                margin-bottom: 15px;
                border-bottom: 1px solid #e0e0e0;
                background: #f8f9fa;
                border-radius: 6px;
                padding: 5px;
            `;

            // Düymələr
            const myDiagramsBtn = this.createViewButton('My Diagrams', 'my-diagrams', true);
            const sharedBtn = this.createViewButton('Shared with Me', 'shared-with-me', false);

            switcher.appendChild(myDiagramsBtn);
            switcher.appendChild(sharedBtn);

            // Modal-a əlavə et
            modalContent.insertBefore(switcher, listElement);

            console.log('🔘 View switcher setup complete');
        }

        createViewButton(text, view, isActive) {
            const button = document.createElement('button');
            button.textContent = text;
            button.className = 'view-switch-btn';
            button.dataset.view = view;

            if (isActive) {
                button.classList.add('active');
            }

            button.style.cssText = `
                flex: 1;
                padding: 10px 15px;
                background: ${isActive ? '#2196f3' : 'transparent'};
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                color: ${isActive ? 'white' : '#666'};
                transition: all 0.2s;
                margin: 0 2px;
                font-weight: ${isActive ? '600' : 'normal'};
            `;

            button.addEventListener('click', () => {
                console.log('🔘 View switched to:', view);
                this.switchView(view);
            });

            return button;
        }

        async switchView(view) {
            if (this.currentView === view) return;

            console.log('🔄 Switching view from', this.currentView, 'to', view);
            this.currentView = view;

            // Düymələri yenilə
            document.querySelectorAll('.view-switch-btn').forEach(btn => {
                const isActive = btn.dataset.view === view;
                btn.classList.toggle('active', isActive);
                btn.style.background = isActive ? '#2196f3' : 'transparent';
                btn.style.color = isActive ? 'white' : '#666';
                btn.style.fontWeight = isActive ? '600' : 'normal';
            });

            // Diagramları yenidən yüklə
            await this.loadDiagrams(1);
        }

        // load-manager.js - local diagrams dəstəyi
        async showLoadModal() {
            console.log('📂 Showing load modal...');

            try {
                // API test et
                const connected = await this.apiManager.testConnection();

                if (!connected) {
                    console.warn('⚠️ API not connected, showing local diagrams');
                    this.showLocalDiagrams();
                    return;
                }

                // API diagrams yüklə
                await this.loadDiagrams(1);

            } catch (error) {
                console.error('❌ Load failed:', error);
                this.showLocalDiagrams();
            }

            // Modal göstər
            const modal = document.getElementById('loadModal');
            if (modal) modal.style.display = 'flex';
        }

        showLocalDiagrams() {
            const listElement = document.getElementById('savedDiagramsList');
            if (!listElement) return;

            const localDiagrams = JSON.parse(localStorage.getItem('local_diagrams') || '[]');

            if (localDiagrams.length === 0) {
                listElement.innerHTML = `
                    <div class="no-diagrams">
                        <i class="fas fa-inbox"></i>
                        <div>No diagrams found</div>
                        <small>Create a new diagram using Save button</small>
                    </div>
                `;
                return;
            }

            listElement.innerHTML = `
                <div style="padding: 10px; background: #f0f0f0; border-radius: 5px; margin-bottom: 10px;">
                    <i class="fas fa-laptop"></i> Local Storage (${localDiagrams.length} diagrams)
                </div>
            `;

            localDiagrams.forEach(diagram => {
                const div = document.createElement('div');
                div.className = 'diagram-item local';
                div.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                        <div>
                            <strong>${diagram.name}</strong>
                            <div style="font-size: 12px; color: #666;">
                                <i class="far fa-clock"></i> ${new Date(diagram.saved_at).toLocaleString()}
                            </div>
                            <div style="font-size: 11px; color: #888; margin-top: 2px;">
                                <i class="fas fa-laptop"></i> Local Storage
                            </div>
                        </div>
                        <button class="load-local-btn" data-key="${diagram.id}" 
                            style="padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer;">
                            Load
                        </button>
                    </div>
                `;

                listElement.appendChild(div);
            });

            // Local load buttons
            setTimeout(() => {
                document.querySelectorAll('.load-local-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const key = e.target.dataset.key;
                        this.loadLocalDiagram(key);
                    });
                });
            }, 100);
        }

        loadLocalDiagram(key) {
            try {
                const diagramData = JSON.parse(localStorage.getItem(key));
                if (diagramData && diagramData.diagram_data) {
                    this.diagramTool.loadDiagram(diagramData.diagram_data);
                    this.hideLoadModal();
                    alert('✅ Local diagram loaded!');
                }
            } catch (error) {
                console.error('❌ Local load failed:', error);
                alert('❌ Failed to load local diagram');
            }
        }

        hideLoadModal() {
            const modal = document.getElementById('loadModal');
            if (modal) {
                modal.style.display = 'none';
                console.log('📂 Load modal hidden');
            }
            this.selectedDiagram = null;

            const confirmBtn = document.getElementById('confirmLoadBtn');
            if (confirmBtn) {
                confirmBtn.disabled = true;
            }
        }

        async loadDiagrams(page = 1) {
            console.log('📥 Loading diagrams, view:', this.currentView, 'page:', page);

            this.currentPage = page;
            const listElement = document.getElementById('savedDiagramsList');

            if (!listElement) {
                console.error('❌ Diagram list element not found!');
                return;
            }

            // Check apiManager
            if (!this.apiManager) {
                listElement.innerHTML = `
                    <div class="no-diagrams error">
                        <div style="color: #f44336;">API Manager not initialized</div>
                        <small>Please refresh the page</small>
                    </div>
                `;
                return;
            }

            // Yüklənmə indikatoru
            listElement.innerHTML = `
                <div class="loading-diagrams" style="text-align: center; padding: 40px;">
                    <div class="spinner"></div>
                    <div style="margin-top: 15px; color: #666;">Loading ${this.currentView.replace('-', ' ')}...</div>
                </div>
            `;

            try {
                let result;
                if (this.currentView === 'my-diagrams') {
                    if (typeof this.apiManager.getMyDiagrams === 'function') {
                        result = await this.apiManager.getMyDiagrams(page, this.perPage);
                    } else {
                        throw new Error('getMyDiagrams function not available');
                    }
                } else {
                    if (typeof this.apiManager.getSharedDiagrams === 'function') {
                        result = await this.apiManager.getSharedDiagrams(page, this.perPage);
                    } else {
                        throw new Error('getSharedDiagrams function not available');
                    }
                }

                console.log('📊 API response:', result);

                if (!result || !result.diagrams) {
                    throw new Error('Invalid response from server');
                }

                if (result.diagrams.length === 0) {
                    listElement.innerHTML = `
                        <div class="no-diagrams" style="text-align: center; padding: 40px; color: #666;">
                            <i class="fas fa-inbox" style="font-size: 48px; color: #ddd; margin-bottom: 15px;"></i>
                            <div style="font-size: 16px; margin-bottom: 10px;">No ${this.currentView.replace('-', ' ')} found.</div>
                            <div style="font-size: 14px; color: #888;">
                                ${this.currentView === 'my-diagrams' ? 
                                    'Create your first diagram using Save button!' : 
                                    'No one has shared diagrams with you yet.'}
                            </div>
                        </div>
                    `;
                    return;
                }

                listElement.innerHTML = '';

                result.diagrams.forEach((diagram, index) => {
                    const diagramItem = this.createDiagramItem(diagram, index);
                    listElement.appendChild(diagramItem);
                });

                console.log(`✅ Loaded ${result.diagrams.length} diagrams`);

                // Pagination əlavə et
                this.addPagination(result);

            } catch (error) {
                console.error('❌ Error loading diagrams:', error);
                listElement.innerHTML = `
                    <div class="no-diagrams error" style="text-align: center; padding: 40px;">
                        <div style="color: #f44336; font-size: 16px; margin-bottom: 10px;">
                            <i class="fas fa-exclamation-triangle"></i> Error loading diagrams
                        </div>
                        <small style="color: #666;">${error.message}</small>
                        <div style="margin-top: 15px;">
                            <button onclick="window.location.reload()" style="
                                padding: 8px 16px;
                                background: #2196f3;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                            ">
                                <i class="fas fa-redo"></i> Refresh
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        createDiagramItem(diagram, index) {
            const diagramItem = document.createElement('div');
            diagramItem.className = 'diagram-item';
            diagramItem.dataset.id = diagram.id;
            diagramItem.style.cssText = `
                padding: 15px;
                border-bottom: 1px solid #eee;
                cursor: pointer;
                transition: background 0.2s;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            const savedDate = new Date(diagram.updated_at || diagram.created_at);
            const isShared = this.currentView === 'shared-with-me';

            diagramItem.innerHTML = `
                <div class="diagram-info" style="flex: 1;">
                    <div class="diagram-name-row" style="display: flex; align-items: center; margin-bottom: 5px;">
                        <span class="diagram-name" style="font-weight: 600; color: #333; font-size: 16px;">
                            ${diagram.name || 'Unnamed Diagram'}
                        </span>
                        ${isShared && diagram.owner_name ? `
                            <span class="shared-badge" style="
                                background: #e3f2fd;
                                color: #1976d2;
                                padding: 2px 8px;
                                border-radius: 12px;
                                font-size: 12px;
                                margin-left: 10px;
                                display: flex;
                                align-items: center;
                                gap: 4px;
                            " title="Shared by ${diagram.owner_name}">
                                <i class="fas fa-share-alt" style="font-size: 10px;"></i> Shared
                            </span>
                        ` : ''}
                    </div>
                    <div class="diagram-meta" style="font-size: 13px; color: #666; margin-bottom: 8px;">
                        <span><i class="far fa-clock"></i> ${this.formatDate(savedDate)}</span>
                        ${isShared && diagram.owner_name ? `
                            <span style="margin-left: 10px;">
                                <i class="fas fa-user"></i> ${diagram.owner_name}
                            </span>
                        ` : ''}
                    </div>
                    ${diagram.description ? `
                        <div class="diagram-description" style="
                            font-size: 14px;
                            color: #555;
                            margin-bottom: 8px;
                            line-height: 1.4;
                        ">${diagram.description}</div>
                    ` : ''}
                    ${diagram.tags && diagram.tags.length > 0 ? `
                        <div class="diagram-tags" style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px;">
                            ${diagram.tags.map(tag => 
                                `<span class="diagram-tag" style="
                                    background: #f0f0f0;
                                    color: #555;
                                    padding: 2px 8px;
                                    border-radius: 12px;
                                    font-size: 11px;
                                ">${tag}</span>`
                            ).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="diagram-actions" style="display: flex; align-items: center; gap: 10px;">
                    <span class="diagram-shape-count" style="
                        background: #e8f5e9;
                        color: #2e7d32;
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    " title="${diagram.shape_count || 0} shapes, ${diagram.connection_count || 0} connections">
                        <i class="fas fa-shapes"></i> ${diagram.shape_count || 0}
                    </span>
                    ${!isShared ? `
                        <button class="diagram-delete-btn" style="
                            background: none;
                            border: none;
                            color: #f44336;
                            cursor: pointer;
                            padding: 5px;
                            border-radius: 4px;
                            transition: background 0.2s;
                        " title="Delete diagram">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            `;

            // Seçim hadisəsi
            diagramItem.addEventListener('click', (e) => {
                if (e.target.closest('.diagram-delete-btn')) {
                    e.stopPropagation();
                    this.deleteDiagram(diagram.id, diagramItem);
                    return;
                }

                document.querySelectorAll('.diagram-item').forEach(item => {
                    item.style.background = '';
                });
                diagramItem.style.background = '#e3f2fd';

                this.selectedDiagram = diagram;

                const confirmBtn = document.getElementById('confirmLoadBtn');
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.style.background = '#2196f3';
                }
            });

            // Hover effekti
            diagramItem.addEventListener('mouseenter', () => {
                if (!diagramItem.style.background.includes('#e3f2fd')) {
                    diagramItem.style.background = '#f8f9fa';
                }
            });

            diagramItem.addEventListener('mouseleave', () => {
                if (!diagramItem.style.background.includes('#e3f2fd')) {
                    diagramItem.style.background = '';
                }
            });

            // Çift kliklə yüklə
            diagramItem.addEventListener('dblclick', () => {
                this.selectedDiagram = diagram;
                this.loadSelectedDiagram();
            });

            return diagramItem;
        }

        async deleteDiagram(diagramId, element) {
            if (!confirm('Are you sure you want to delete this diagram?')) {
                return;
            }

            try {
                this.showLoading(true, 'Deleting diagram...');

                // API ilə sil
                if (this.apiManager && typeof this.apiManager.deleteDiagram === 'function') {
                    await this.apiManager.deleteDiagram(diagramId);
                }

                // Elementi sil
                if (element && element.parentNode) {
                    element.parentNode.removeChild(element);
                }

                this.showNotification('✅ Diagram deleted successfully!', 'success');

                // Əgər silinən diagram cari diagram id-dirsə, təmizlə
                if (this.diagramTool.currentDiagramId === diagramId) {
                    this.diagramTool.currentDiagramId = null;
                }

            } catch (error) {
                console.error('❌ Delete failed:', error);
                this.showNotification('❌ Failed to delete diagram', 'error');
            } finally {
                this.hideLoading();
            }
        }
        setupSearch() {
            const searchInput = document.getElementById('diagramSearch');
            if (!searchInput) return;

            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const searchTerm = e.target.value.trim().toLowerCase();

                searchTimeout = setTimeout(() => {
                    this.filterDiagrams(searchTerm);
                }, 300);
            });
        }
        filterDiagrams(searchTerm) {
            const diagramItems = document.querySelectorAll('.diagram-item');

            diagramItems.forEach(item => {
                const name = item.querySelector('.diagram-name')?.textContent?.toLowerCase() || '';
                const description = item.querySelector('.diagram-description')?.textContent?.toLowerCase() || '';
                const tags = Array.from(item.querySelectorAll('.diagram-tag'))
                    .map(tag => tag.textContent.toLowerCase())
                    .join(' ');

                const matches = searchTerm === '' ||
                    name.includes(searchTerm) ||
                    description.includes(searchTerm) ||
                    tags.includes(searchTerm);

                item.style.display = matches ? '' : 'none';
            });
        }
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                const modal = document.getElementById('loadModal');
                if (!modal || modal.style.display !== 'flex') return;

                // Escape: Modal bağla
                if (e.key === 'Escape') {
                    this.hideLoadModal();
                    e.preventDefault();
                }

                // Enter: Seçilmiş diagramı yüklə
                if (e.key === 'Enter' && this.selectedDiagram) {
                    this.loadSelectedDiagram();
                    e.preventDefault();
                }

                // Arrow keys: Seçimi dəyiş
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    this.navigateSelection(e.key);
                    e.preventDefault();
                }
            });
        }
        navigateSelection(direction) {
            const items = Array.from(document.querySelectorAll('.diagram-item:not([style*="display: none"])'));
            if (items.length === 0) return;

            let currentIndex = -1;
            if (this.selectedDiagram) {
                currentIndex = items.findIndex(item =>
                    item.dataset.id === this.selectedDiagram.id
                );
            }

            let newIndex;
            if (direction === 'ArrowDown') {
                newIndex = (currentIndex + 1) % items.length;
            } else {
                newIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
            }

            // Yeni elementi seç
            const newItem = items[newIndex];
            const newId = newItem.dataset.id;

            // Fake click event yarat
            newItem.dispatchEvent(new Event('click'));
        }

        async loadSelectedDiagram() {
            if (!this.selectedDiagram) {
                console.warn('⚠️ No diagram selected');
                return;
            }

            console.log('📥 Loading selected diagram:', this.selectedDiagram.id);

            if (this.diagramTool.shapes.length > 0) {
                const confirmed = confirm('Load new diagram? Current changes will be lost.');
                if (!confirmed) {
                    console.log('❌ Load cancelled by user');
                    return;
                }
            }

            try {
                this.showLoading(true, 'Loading diagram...');

                const diagramData = await this.apiManager.getDiagram(this.selectedDiagram.id);

                if (!diagramData || !diagramData.diagram_data) {
                    throw new Error('Invalid diagram data received');
                }

                // Current diagram ID-ni saxla (auto-save üçün)
                this.diagramTool.currentDiagramId = diagramData.id;

                // Diagram məlumatlarını yüklə
                this.diagramTool.loadDiagram(diagramData.diagram_data);

                this.hideLoading();
                this.hideLoadModal();

                this.showNotification('✅ Diagram loaded successfully!', 'success');

            } catch (error) {
                this.hideLoading();
                console.error('❌ Failed to load diagram:', error);
                this.showNotification('❌ Failed to load diagram: ' + error.message, 'error');
            }
        }

        async saveDiagramToAPI(name) {
            try {
                console.log('💾 Saving diagram to API:', name);

                if (!this.apiManager) {
                    throw new Error('API Manager not initialized');
                }

                const diagramData = this.apiManager.getCurrentDiagramData();

                let result;
                if (this.diagramTool.currentDiagramId) {
                    // Update existing
                    result = await this.apiManager.saveDiagramVersion(
                        this.diagramTool.currentDiagramId,
                        diagramData,
                        'Manual save'
                    );
                } else {
                    // Create new
                    result = await this.apiManager.saveDiagram(name, diagramData);
                    // Yeni yaradılan diagramın ID-sini saxla
                    this.diagramTool.currentDiagramId = result.id;
                }

                console.log('✅ Diagram saved to API:', result);
                return result;

            } catch (error) {
                console.error('❌ Save to API error:', error);
                throw error;
            }
        }

        // Helper methods
        formatDate(date) {
            const now = new Date();
            const diff = now - date;

            // Son 24 saat
            if (diff < 24 * 60 * 60 * 1000) {
                if (diff < 60 * 60 * 1000) {
                    const mins = Math.floor(diff / (60 * 1000));
                    return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
                }
                const hours = Math.floor(diff / (60 * 60 * 1000));
                return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
            }

            // Bu həftə
            if (diff < 7 * 24 * 60 * 60 * 1000) {
                const days = Math.floor(diff / (24 * 60 * 60 * 1000));
                return `${days} day${days !== 1 ? 's' : ''} ago`;
            }

            // Tarix formatı
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
            });
        }

        showNotification(message, type = 'info') {
            console.log(`[${type.toUpperCase()}] ${message}`);

            // Sadə alert (daha sonra gözəl notification ilə əvəz edə bilərsiniz)
            if (type === 'error') {
                alert(`❌ ${message}`);
            } else if (type === 'success') {
                alert(`✅ ${message}`);
            } else {
                alert(`ℹ️ ${message}`);
            }
        }

        showLoading(show, message = '') {
            if (show) {
                // Loading göstər
                let loadingDiv = document.getElementById('diagram-loading');
                if (!loadingDiv) {
                    loadingDiv = document.createElement('div');
                    loadingDiv.id = 'diagram-loading';
                    loadingDiv.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0,0,0,0.5);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 9999;
                    `;
                    document.body.appendChild(loadingDiv);
                }

                loadingDiv.innerHTML = `
                    <div style="background: white; padding: 30px; border-radius: 8px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                        <div class="spinner" style="
                            border: 4px solid #f3f3f3;
                            border-top: 4px solid #3498db;
                            border-radius: 50%;
                            width: 40px;
                            height: 40px;
                            animation: spin 1s linear infinite;
                            margin: 0 auto;
                        "></div>
                        <div style="margin-top: 15px; color: #333; font-size: 16px;">${message}</div>
                    </div>
                `;

                // Add animation if not exists
                if (!document.getElementById('spin-animation')) {
                    const style = document.createElement('style');
                    style.id = 'spin-animation';
                    style.textContent = `
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `;
                    document.head.appendChild(style);
                }

            } else {
                // Loading gizlət
                const loadingDiv = document.getElementById('diagram-loading');
                if (loadingDiv && loadingDiv.parentNode) {
                    loadingDiv.parentNode.removeChild(loadingDiv);
                }
            }
        }

        addPagination(result) {
            // Pagination əlavə et (əgər çox səhifə varsa)
            if (result.total_pages > 1) {
                const listElement = document.getElementById('savedDiagramsList');
                const paginationDiv = document.createElement('div');
                paginationDiv.className = 'diagram-pagination';
                paginationDiv.style.cssText = `
                    display: flex;
                    justify-content: center;
                    padding: 20px;
                    gap: 10px;
                    border-top: 1px solid #eee;
                `;

                // Əvvəlki düymə
                if (this.currentPage > 1) {
                    const prevBtn = document.createElement('button');
                    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
                    prevBtn.style.cssText = `
                        padding: 8px 12px;
                        background: #f0f0f0;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        color: #333;
                    `;
                    prevBtn.addEventListener('click', () => this.loadDiagrams(this.currentPage - 1));
                    paginationDiv.appendChild(prevBtn);
                }

                // Səhifə nömrələri
                const pageInfo = document.createElement('span');
                pageInfo.textContent = `Page ${this.currentPage} of ${result.total_pages}`;
                pageInfo.style.cssText = `
                    padding: 8px 16px;
                    color: #666;
                    display: flex;
                    align-items: center;
                `;
                paginationDiv.appendChild(pageInfo);

                // Sonrakı düymə
                if (this.currentPage < result.total_pages) {
                    const nextBtn = document.createElement('button');
                    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                    nextBtn.style.cssText = `
                        padding: 8px 12px;
                        background: #f0f0f0;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        color: #333;
                    `;
                    nextBtn.addEventListener('click', () => this.loadDiagrams(this.currentPage + 1));
                    paginationDiv.appendChild(nextBtn);
                }

                listElement.appendChild(paginationDiv);
            }
        }
    }

    window.LoadManager = LoadManager;
})();