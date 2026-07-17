// board-api.js - Mövcud /api/diagrams endpointləri ilə board-ların saxlanması
(function() {
    const TOKEN_KEYS = ['guven_token', 'access_token', 'auth_token', 'token'];

    class BoardApi {
        constructor() {
            this.token = this.loadToken();
        }

        loadToken() {
            for (const key of TOKEN_KEYS) {
                const token = localStorage.getItem(key) || sessionStorage.getItem(key);
                if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
                    return token;
                }
            }
            return null;
        }

        isAuthenticated() {
            return !!this.token;
        }

        async request(endpoint, method = 'GET', data = null) {
            const headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }

            const options = { method, headers, credentials: 'include' };
            if (data && method !== 'GET') {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(`${BoardConfig.API_URL}${endpoint}`, options);

            if (response.status === 401) {
                const err = new Error('AUTH_EXPIRED');
                err.code = 401;
                throw err;
            }
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
            }
            return response.json();
        }

        // Board yeni sənəd kimi yaradılır (tags: ['board'] ilə diaqramlardan ayrılır)
        async createBoard(payload) {
            return this.request('/api/diagrams/', 'POST', payload);
        }

        async updateBoard(uuid, payload) {
            return this.request(`/api/diagrams/${uuid}`, 'PUT', payload);
        }

        async getBoard(uuid) {
            return this.request(`/api/diagrams/${uuid}`, 'GET');
        }

        async listMyDiagrams(page = 1, perPage = 50) {
            return this.request(`/api/diagrams/my-diagrams?page=${page}&per_page=${perPage}`, 'GET');
        }

        // ==================== Lokal qaralama (giriş olmayanda) ====================
        saveDraft(doc, name) {
            try {
                localStorage.setItem(BoardConfig.LOCAL_DRAFT_KEY, JSON.stringify({
                    name,
                    doc,
                    saved_at: new Date().toISOString()
                }));
                return true;
            } catch (e) {
                console.error('Draft saxlanıla bilmədi:', e);
                return false;
            }
        }

        loadDraft() {
            try {
                const raw = localStorage.getItem(BoardConfig.LOCAL_DRAFT_KEY);
                if (!raw) return null;
                const draft = JSON.parse(raw);
                if (!BoardState.isBoardDoc(draft.doc)) return null;
                return draft;
            } catch (e) {
                return null;
            }
        }

        clearDraft() {
            localStorage.removeItem(BoardConfig.LOCAL_DRAFT_KEY);
        }
    }

    window.BoardApi = BoardApi;
})();
