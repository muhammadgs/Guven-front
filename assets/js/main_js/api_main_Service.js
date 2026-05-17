// =============================================
// API MAIN SERVICE - Mərkəzi API idarəetmə
// Tarix: 14 Fevral 2026 - DÜZƏLDİLMİŞ VERSİYA
// =============================================

const ApiMainService = (function() {
    'use strict';

    console.log('🚀 API Main Service yüklənir...');

    // ==================== KONFİQURASİYA ====================
    const CONFIG = {
        // PROXY üzərindən backend-ə müraciət
        baseURL: 'http://vps.guvenfinans.az:8008/api/v1',
        proxyBase: 'http://vps.guvenfinans.az:8008',
        timeout: 30000,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    };

    // ==================== DAXİLİ KÖMƏKÇİLƏR ====================
    function logRequest(method, url, data) {
        console.log(`📤 API Request: ${method} ${url}`, data || '');
    }

    function logResponse(url, status, data) {
        if (status >= 200 && status < 300) {
            console.log(`📥 API Response: ${url} [${status}]`, data);
        } else {
            console.warn(`⚠️ API Response: ${url} [${status}]`, data);
        }
    }

    function handleError(error, url) {
        console.error(`❌ API Error: ${url}`, error);
        return {
            success: false,
            error: error.message || 'Bilinməyən xəta',
            status: error.status || 500
        };
    }

    // ==================== ƏSAS FETCH FUNKSİYASI ====================
    async function apiFetch(endpoint, options = {}) {
        const url = `${CONFIG.baseURL}${endpoint}`;
        const defaultOptions = {
            method: 'GET',
            headers: { ...CONFIG.headers },
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'include'
        };

        const fetchOptions = { ...defaultOptions, ...options };

        if (fetchOptions.body instanceof FormData) {
            delete fetchOptions.headers['Content-Type'];
        }

        logRequest(fetchOptions.method, url, fetchOptions.body);

        try {
            const response = await fetch(url, fetchOptions);

            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            logResponse(url, response.status, data);

            if (!response.ok) {
                throw {
                    message: typeof data === 'string' ? data : data.detail || data.message || 'Xəta baş verdi',
                    status: response.status,
                    data: data
                };
            }

            return {
                success: true,
                status: response.status,
                data: data,
                headers: response.headers
            };

        } catch (error) {
            return handleError(error, url);
        }
    }

    // ==================== PROXY TEST ====================
    async function testConnection() {
        console.log('🔍 API bağlantısı test edilir...');

        const testEndpoints = [
            `${CONFIG.baseURL}/projects/test`,
            `${CONFIG.baseURL}/health`,
            `${CONFIG.baseURL}/`
        ];

        for (const endpoint of testEndpoints) {
            try {
                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: CONFIG.headers,
                    mode: 'cors',
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ API işləyir: ${endpoint}`, data);
                    return { success: true, endpoint, data };
                }
            } catch (e) {
                console.log(`❌ Xəta: ${endpoint}`, e.message);
            }
        }

        console.warn('⚠️ API bağlantısı yoxdur!');
        return { success: false, error: 'Bağlantı yoxdur' };
    }

    // ==================== LAYİHƏ ENDPOINTLƏRİ ====================
    const projects = {
        // Public layihələri gətir (SAYT ÜÇÜN)
        getPublic: async (limit = 20, skip = 0) => {
            const result = await apiFetch(`/projects/public?limit=${limit}&skip=${skip}`);

            if (result.success) {
                let projects = [];
                if (Array.isArray(result.data)) {
                    projects = result.data;
                } else if (result.data && Array.isArray(result.data.data)) {
                    projects = result.data.data;
                } else if (result.data && result.data.projects) {
                    projects = result.data.projects;
                }

                // ✅ Media URL-lərini yoxla və placeholder əlavə et
                projects = projects.map(p => {
                    let mediaUrl = p.media_url || '';

                    // UUID varsa, proxy URL yarat
                    if (mediaUrl) {
                        const uuidMatch = mediaUrl.match(/[a-f0-9-]{36}/);
                        if (uuidMatch) {
                            const uuid = uuidMatch[0];
                            mediaUrl = `${CONFIG.proxyBase}/api/v1/files/${uuid}/download`;
                        }
                    }

                    return {
                        id: p.id,
                        name: p.name || 'Adsız layihə',
                        mediaType: p.media_type || 'image',
                        mediaUrl: mediaUrl,
                        description: p.description || '',
                        fullDescription: p.full_description || '',
                        category: p.category || '',
                        client: p.client_name || p.client || '',
                        startDate: p.start_date || '',
                        endDate: p.expected_end_date || p.end_date || '',
                        order: p.order || 1,
                        active: true,
                        // ✅ Əgər mediaUrl yoxdursa və ya xəta verirsə, placeholder istifadə et
                        hasValidMedia: mediaUrl ? true : false,
                        original: p
                    };
                });

                return {
                    success: true,
                    data: projects,
                    total: result.data.total || projects.length
                };
            }

            return result;
        },

        // Tək layihəni gətir
        getById: async (id) => {
            return await apiFetch(`/projects/${id}`);
        },

        // Test endpoint
        test: async () => {
            return await apiFetch('/projects/test');
        },

        // Admin panel üçün - bütün layihələr
        getAll: async (page = 1, perPage = 20, search = '') => {
            let url = `/projects/?page=${page}&per_page=${perPage}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            return await apiFetch(url);
        },

        // Yeni layihə yarat
        create: async (projectData) => {
            return await apiFetch('/projects/', {
                method: 'POST',
                body: JSON.stringify(projectData)
            });
        },

        // Layihə yenilə
        update: async (id, projectData) => {
            return await apiFetch(`/projects/${id}`, {
                method: 'PUT',
                body: JSON.stringify(projectData)
            });
        },

        // Layihə sil
        delete: async (id) => {
            return await apiFetch(`/projects/${id}`, {
                method: 'DELETE'
            });
        },

        // Status dəyiş
        toggleActive: async (id) => {
            return await apiFetch(`/projects/${id}/toggle`, {
                method: 'PATCH'
            });
        }
    };

    // ==================== FAYL ENDPOINTLƏRİ ====================
    const files = {
        // Fayl yüklə
        upload: async (file, category = 'project_image') => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', category);

            return await apiFetch('/files/simple-upload', {
                method: 'POST',
                body: formData
            });
        },

        // ✅ DÜZGÜN PUBLIC URL - PROXY İLƏ
        getUrl: (uuid) => {
            if (!uuid) return '';
            return `${CONFIG.proxyBase}/api/v1/files/${uuid}/download`;
        },

        // Fayl məlumatlarını gətir
        getInfo: async (uuid) => {
            return await apiFetch(`/files/${uuid}`);
        },

        // Fayl sil
        delete: async (uuid) => {
            return await apiFetch(`/files/${uuid}`, {
                method: 'DELETE'
            });
        },

        // UUID-ni URL-dən çıxart
        extractUuid: (url) => {
            if (!url) return null;
            const match = url.match(/[a-f0-9-]{36}/);
            return match ? match[0] : null;
        }
    };

    // ==================== PARTNYOR ENDPOINTLƏRİ ====================
    const partners = {
        getPublic: async () => {
            // TODO: Partnyor endpoint-i əlavə et
            const saved = localStorage.getItem('guvenfinans-partners');
            if (saved) {
                try {
                    return { success: true, data: JSON.parse(saved) };
                } catch (e) {
                    return { success: false, data: [] };
                }
            }
            return { success: false, data: [] };
        }
    };

    // ==================== XİDMƏT ENDPOINTLƏRİ ====================
    const services = {
        normalizeAzSlug: (value) => String(value || '')
            .toLowerCase()
            .replace(/[əƏ]/g, 'e')
            .replace(/[ıİI]/g, 'i')
            .replace(/[öÖ]/g, 'o')
            .replace(/[üÜ]/g, 'u')
            .replace(/[şŞ]/g, 's')
            .replace(/[çÇ]/g, 'c')
            .replace(/[ğĞ]/g, 'g')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, ''),

        normalizeServiceItems: (rawItems) => {
            const sourceList = Array.isArray(rawItems) ? rawItems : [];
            return sourceList.map((item) => {
                if (typeof item === 'string') {
                    const title = item.trim();
                    return title ? { title, description: '', order: 0, original: item } : null;
                }
                if (!item || typeof item !== 'object') return null;
                const title = String(item.title || item.name || item.text || item.description || item.content || '').trim();
                const description = String(item.description || item.content || '').trim();
                const order = Number(item.order ?? item.order_num ?? item.sort_order ?? 0);
                if (!title && !description) return null;
                return {
                    title: title || description,
                    description,
                    order: Number.isFinite(order) ? order : 0,
                    original: item
                };
            }).filter(Boolean);
        },

        normalizeService: (raw) => {
            if (!raw || typeof raw !== 'object') return null;

            const itemSource = raw.items || raw.service_items || raw.details || raw.children || raw.sub_services || [];
            const items = services.normalizeServiceItems(itemSource);

            const name = raw.name || raw.title || raw.service_name || '';
            const description = raw.description || raw.text || raw.content || '';
            const slug = raw.slug || services.normalizeAzSlug(name);
            const order = Number(raw.order ?? raw.sort_order ?? raw.order_num ?? 0);

            return {
                id: raw.id || null,
                name: name,
                slug: slug,
                description: description,
                items: items,
                order: Number.isFinite(order) ? order : 0,
                active: raw.active ?? raw.is_active ?? true,
                original: raw
            };
        },

        getPublic: async () => {
            const result = await apiFetch('/services/public');
            if (result.success) {
                const payload = result.data;
                let rawServices = [];
                if (Array.isArray(payload)) rawServices = payload;
                else if (payload && Array.isArray(payload.data)) rawServices = payload.data;
                else if (payload && Array.isArray(payload.services)) rawServices = payload.services;
                else if (payload && Array.isArray(payload.items)) rawServices = payload.items;

                const normalized = rawServices.map((item) => services.normalizeService(item)).filter(Boolean);
                localStorage.setItem('guvenfinans-active-services', JSON.stringify(normalized));
                localStorage.removeItem('guvenfinans-services');
                return { success: true, data: normalized, status: result.status };
            }

            try {
                const saved = localStorage.getItem('guvenfinans-active-services');
                const parsed = saved ? JSON.parse(saved) : [];
                const normalized = Array.isArray(parsed) ? parsed.map((item) => services.normalizeService(item)).filter(Boolean) : [];
                if (normalized.length > 0) {
                    return { success: false, data: normalized, offline: true, status: result.status, error: result.error };
                }
                return { success: false, data: [], status: result.status, error: result.error };
            } catch (e) {
                return { success: false, data: [], status: result.status, error: result.error };
            }
        },

        getBySlug: async (slug) => {
            const result = await apiFetch(`/services/public/${encodeURIComponent(slug)}`);
            if (result.success) {
                const payload = result.data;
                const rawService = (payload && typeof payload === 'object' && !Array.isArray(payload))
                    ? (payload.data || payload.service || payload)
                    : null;

                const normalized = services.normalizeService(rawService);
                if (!normalized) return { success: false, data: null, status: result.status };

                try {
                    const saved = localStorage.getItem('guvenfinans-active-services');
                    const parsed = saved ? JSON.parse(saved) : [];
                    const list = Array.isArray(parsed) ? parsed.map((item) => services.normalizeService(item)).filter(Boolean) : [];
                    const normalizedSlug = services.normalizeAzSlug(normalized.slug || normalized.name);
                    const nextList = list.filter((item) => services.normalizeAzSlug(item.slug || item.name) !== normalizedSlug);
                    nextList.push(normalized);
                    localStorage.setItem('guvenfinans-active-services', JSON.stringify(nextList));
                    localStorage.removeItem('guvenfinans-services');
                } catch (e) {}

                return { success: true, data: normalized, status: result.status };
            }

            const listResult = await services.getPublic();
            if (listResult && Array.isArray(listResult.data)) {
                const target = services.normalizeAzSlug(slug);
                const fromList = listResult.data.find((item) =>
                    services.normalizeAzSlug(item.slug || item.name) === target
                ) || null;
                if (fromList) return { success: true, data: fromList, status: listResult.status, offline: !!listResult.offline };
            }

            return { success: false, data: null, status: result.status, error: result.error };
        }
    };

    // ==================== PUBLIC API ====================
    return {
        config: CONFIG,
        test: testConnection,
        projects,
        files,
        partners,
        services,
        fetch: apiFetch,
        getFileUrl: files.getUrl,
        extractUuid: files.extractUuid
    };

})();

window.ApiMainService = ApiMainService;
console.log('✅ API Main Service hazır:', ApiMainService);
