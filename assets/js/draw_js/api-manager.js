// api-manager.js - TAM DÜZƏLDİLMİŞ VERSİYA
(function() {
    class ApiManager {
        constructor(diagramTool) {
            this.diagramTool = diagramTool;
            this.API_URL = "http://vps.guvenfinans.az:8008";
            this.token = this.loadToken();
            this.autoSaveInterval = null;

            console.log('🔧 ApiManager initialized');
            console.log(`📡 API URL: ${this.API_URL}`);
        }

        // ==================== TOKEN MANAGEMENT ====================
        loadToken() {
            const TOKEN_KEYS = [
                'guven_token',
                'access_token',
                'auth_token',
                'token'
            ];

            for (const key of TOKEN_KEYS) {
                const token = localStorage.getItem(key) || sessionStorage.getItem(key);
                if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
                    console.log(`✅ Token tapıldı: ${key}`);
                    return token;
                }
            }

            console.warn('⚠️ Token tapılmadı');
            return null;
        }

        setToken(token) {
            this.token = token;
            localStorage.setItem('guven_token', token);
            sessionStorage.setItem('auth_token', token);
            console.log('💾 Token saxlanıldı');
        }

        clearToken() {
            this.token = null;
            localStorage.removeItem('guven_token');
            sessionStorage.removeItem('auth_token');
            console.log('🗑️ Token silindi');
        }

        // ==================== REQUEST HELPER ====================
        async makeRequest(endpoint, method = 'GET', data = null) {
            try {
                const url = `${this.API_URL}${endpoint}`;
                console.log(`📡 ${method} ${endpoint}`);

                const headers = {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                };

                if (this.token) {
                    headers['Authorization'] = `Bearer ${this.token}`;
                }

                const options = {
                    method,
                    headers,
                    credentials: 'include'
                };

                if (data && method !== 'GET') {
                    options.body = JSON.stringify(data);
                }

                const response = await fetch(url, options);
                console.log(`📥 Response: ${response.status}`);

                // 401 - Token expired
                if (response.status === 401) {
                    console.error('🔴 Token vaxtı qurtarıb');
                    this.clearToken();
                    this.redirectToLogin();
                    return null;
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
                }

                const result = await response.json();
                return result;

            } catch (error) {
                console.error('❌ API Error:', error.message);
                throw error;
            }
        }

        // ==================== AUTHENTICATION ====================
        async testConnection() {
            try {
                console.log('🔌 Connection test...');

                const response = await fetch(`${this.API_URL}/api/auth/me`, {
                    method: 'GET',
                    headers: {
                        'Authorization': this.token ? `Bearer ${this.token}` : undefined,
                        'Accept': 'application/json'
                    },
                    credentials: 'include'
                });

                const connected = response.ok || response.status === 401;
                console.log(`✅ Server mövcud: ${response.status}`);
                return connected;

            } catch (error) {
                console.error('❌ Connection failed:', error.message);
                return false;
            }
        }

        async getCurrentUser() {
            try {
                return await this.makeRequest('/api/auth/me', 'GET');
            } catch (error) {
                console.error('❌ getCurrentUser failed:', error);
                return null;
            }
        }

        // ==================== DIAGRAM OPERATIONS ====================
        async saveDiagram(diagramData) {
            try {
                console.log('💾 Saving diagram...');

                if (!this.token) {
                    throw new Error('Authentication required');
                }

                const payload = {
                    name: diagramData.name || `Diagram_${new Date().toLocaleString()}`,
                    description: diagramData.description || '',
                    diagram_data: diagramData.diagram_data,
                    tags: diagramData.tags || ['diagram', 'flowdraw'],
                    is_public: false
                };

                const result = await this.makeRequest('/api/diagrams/', 'POST', payload);

                if (result && result.id) {
                    this.diagramTool.currentDiagramId = result.id;
                    localStorage.setItem('current_diagram_id', result.id);
                    console.log(`✅ Diagram saved: ${result.id}`);
                }

                return result;

            } catch (error) {
                console.error('❌ Save failed:', error);
                // Local fallback
                return this.saveToLocalStorage(diagramData);
            }
        }

        async getMyDiagrams(page = 1, perPage = 20) {
            try {
                console.log(`📋 Loading my diagrams (page ${page})...`);

                const endpoint = `/api/diagrams/my-diagrams?page=${page}&per_page=${perPage}`;
                const result = await this.makeRequest(endpoint, 'GET');

                return result || {
                    diagrams: [],
                    total: 0,
                    page,
                    per_page: perPage,
                    total_pages: 1
                };

            } catch (error) {
                console.error('❌ Load diagrams failed:', error);
                return this.getLocalDiagrams();
            }
        }

        async getSharedDiagrams(page = 1, perPage = 20) {
            try {
                console.log(`👥 Loading shared diagrams (page ${page})...`);

                const endpoint = `/api/diagrams/shared-with-me?page=${page}&per_page=${perPage}`;
                const result = await this.makeRequest(endpoint, 'GET');

                return result || {
                    diagrams: [],
                    total: 0,
                    page,
                    per_page: perPage,
                    total_pages: 1
                };

            } catch (error) {
                console.error('❌ Load shared diagrams failed:', error);
                return { diagrams: [], total: 0, page, per_page: perPage, total_pages: 1 };
            }
        }

        async getDiagram(diagramId) {
            try {
                console.log(`📥 Loading diagram: ${diagramId}`);

                const result = await this.makeRequest(`/api/diagrams/${diagramId}`, 'GET');

                if (!result || !result.diagram_data) {
                    throw new Error('Invalid diagram data');
                }

                return result;

            } catch (error) {
                console.error('❌ Load diagram failed:', error);
                throw error;
            }
        }

        async deleteDiagram(diagramId) {
            try {
                console.log(`🗑️ Deleting diagram: ${diagramId}`);

                await this.makeRequest(`/api/diagrams/${diagramId}`, 'DELETE');

                console.log('✅ Diagram deleted');
                return true;

            } catch (error) {
                console.error('❌ Delete failed:', error);
                throw error;
            }
        }

        async saveDiagramVersion(diagramId, diagramData, versionName) {
            try {
                console.log(`📝 Saving version: ${versionName}`);

                const payload = {
                    ...diagramData,
                    version_name: versionName
                };

                const result = await this.makeRequest(
                    `/api/diagrams/${diagramId}/versions`,
                    'POST',
                    payload
                );

                console.log('✅ Version saved');
                return result;

            } catch (error) {
                console.error('❌ Version save failed:', error);
                throw error;
            }
        }

        getCurrentDiagramData(name = '') {
            return {
                name: name || `Diagram_${new Date().toLocaleString()}`,
                diagram_data: {
                    shapes: this.diagramTool.shapes.map(shape => {
                        const { connectionPoints, ...rest } = shape;
                        return rest;
                    }),
                    connections: this.diagramTool.connections,
                    viewport: {
                        zoom: this.diagramTool.zoom,
                        offset: this.diagramTool.offset
                    }
                },
                metadata: {
                    created_at: new Date().toISOString(),
                    shape_count: this.diagramTool.shapes.length,
                    connection_count: this.diagramTool.connections.length,
                    tool_version: '2.0'
                }
            };
        }

        // ==================== LOCAL STORAGE FALLBACK ====================
        saveToLocalStorage(diagramData) {
            try {
                const localId = `local_diagram_${Date.now()}`;
                const saveData = {
                    ...diagramData,
                    id: localId,
                    saved_at: new Date().toISOString(),
                    is_local: true
                };

                localStorage.setItem(localId, JSON.stringify(saveData));

                // Add to local list
                const localList = JSON.parse(localStorage.getItem('local_diagrams') || '[]');
                localList.push({
                    id: localId,
                    name: diagramData.name,
                    saved_at: new Date().toISOString(),
                    is_local: true
                });
                localStorage.setItem('local_diagrams', JSON.stringify(localList));

                console.log(`💾 Saved locally: ${localId}`);
                return { id: localId, saved_locally: true };

            } catch (error) {
                console.error('❌ Local save failed:', error);
                return null;
            }
        }

        getLocalDiagrams() {
            try {
                const localDiagrams = JSON.parse(localStorage.getItem('local_diagrams') || '[]');
                return {
                    diagrams: localDiagrams,
                    total: localDiagrams.length,
                    page: 1,
                    per_page: 20,
                    total_pages: 1,
                    from_local: true
                };
            } catch (error) {
                console.error('❌ Load local diagrams failed:', error);
                return { diagrams: [], total: 0, page: 1, per_page: 20, total_pages: 1 };
            }
        }

        // ==================== AUTO SAVE ====================
        setupAutoSave(interval = 30000) {
            if (this.autoSaveInterval) {
                clearInterval(this.autoSaveInterval);
            }

            this.autoSaveInterval = setInterval(() => {
                if (this.diagramTool.isModified && this.diagramTool.shapes.length > 0) {
                    this.autoSave();
                }
            }, interval);

            console.log(`⏰ Auto-save setup: ${interval}ms`);
        }

        async autoSave() {
            try {
                const diagramData = this.getCurrentDiagramData('Auto-saved');

                if (this.diagramTool.currentDiagramId) {
                    await this.saveDiagramVersion(
                        this.diagramTool.currentDiagramId,
                        diagramData,
                        'Auto-save'
                    );
                } else {
                    await this.saveDiagram(diagramData);
                }

                this.diagramTool.isModified = false;
                console.log('💾 Auto-saved');

            } catch (error) {
                console.error('❌ Auto-save failed:', error);
            }
        }

        // ==================== UTILITIES ====================
        isAuthenticated() {
            return !!this.token;
        }

        redirectToLogin() {
            console.log('🔴 Redirecting to login...');
            setTimeout(() => {
                window.location.href = '../login.html';
            }, 1000);
        }

        // ==================== DEBUG ====================
        async debugInfo() {
            console.group('🔍 ApiManager Debug');
            console.log('Token:', this.token ? '✅' : '❌');
            console.log('Authenticated:', this.isAuthenticated());

            try {
                const connected = await this.testConnection();
                console.log('Server connected:', connected ? '✅' : '❌');
            } catch (error) {
                console.log('Server test:', '❌', error.message);
            }

            const diagrams = await this.getMyDiagrams(1, 1);
            console.log('Can load diagrams:', diagrams?.diagrams ? '✅' : '❌');

            console.groupEnd();
        }
    }

    window.ApiManager = ApiManager;
})();