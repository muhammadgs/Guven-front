// assets/js/admin_js/services/service-detail-store.js
// Fetches and normalizes public service data from the existing admin-managed source.
(function(window) {
    'use strict';

    const namespace = window.GuvenServiceDetails = window.GuvenServiceDetails || {};
    const utils = namespace.utils;
    const config = namespace.config;

    const state = {
        cache: null,
        cacheTime: 0,
        pendingRequest: null
    };

    function normalizeServiceList(rawData) {
        let list = rawData;

        if (rawData && !Array.isArray(rawData)) {
            list = rawData.data || rawData.services || rawData.results || rawData.items || [];
        }

        return Array.isArray(list)
            ? list.filter(Boolean).filter(utils.isActiveService).sort((a, b) => (a.order || 0) - (b.order || 0))
            : [];
    }

    function readServicesFromStorage() {
        for (const key of config.storageKeys) {
            const saved = localStorage.getItem(key);
            if (!saved) continue;

            try {
                const services = normalizeServiceList(JSON.parse(saved));
                if (services.length) return services;
            } catch (error) {
                console.warn(`Service storage parse failed for ${key}:`, error);
            }
        }

        return [];
    }

    async function fetchServices(force = false) {
        const now = Date.now();
        if (!force && state.cache && now - state.cacheTime < config.cacheTtl) {
            return state.cache;
        }

        if (!force && state.pendingRequest) {
            return state.pendingRequest;
        }

        state.pendingRequest = (async () => {
            if (window.ApiMainService?.services?.getPublic) {
                const response = await window.ApiMainService.services.getPublic();
                if (response?.success) {
                    const normalized = normalizeServiceList(response.data);
                    if (normalized.length) return normalized;
                }
            }

            return readServicesFromStorage();
        })()
            .then((services) => {
                state.cache = services;
                state.cacheTime = Date.now();
                return services;
            })
            .finally(() => {
                state.pendingRequest = null;
            });

        return state.pendingRequest;
    }

    function invalidate() {
        state.cache = null;
        state.cacheTime = 0;
        state.pendingRequest = null;
    }

    namespace.store = {
        fetchServices,
        invalidate,
        normalizeServiceList
    };
})(window);
