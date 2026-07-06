// commentTracker.js - OXUNMAMIŞ COMMENT SAYI İLƏ (FİKS EDİLMİŞ VERSİYA)
// 🔥 ƏSAS DƏYİŞİKLİKLƏR:
// 1. Paralel API çağırışları LƏĞV EDİLDİ (508 səbəbi)
// 2. Hər task üçün ayrı interval YOX, tək global interval
// 3. 508 xətası tutulur və təkrar cəhd EDİLMİR

window.CommentTracker = {
    commentCounts: {},
    unreadCounts: {},
    initializedTasks: new Set(),
    failedTasks: new Set(),           // ✅ 508 xətası alan tasklar
    globalInterval: null,
    pollingIntervalMs: 45000,         // ✅ 45 saniyəyə artırıldı (server yükü azalsın)
    isInitializing: false,

    async initForTasks(taskIds) {
        if (!taskIds || taskIds.length === 0) return;

        // ✅ ƏGƏR ARTIQ INIT DAVAM EDİR İDƏ, GÖZLƏ
        if (this.isInitializing) {
            console.log('⏳ CommentTracker artıq init olunur, gözlənilir...');
            let waitCount = 0;
            while (this.isInitializing && waitCount < 50) {
                await new Promise(r => setTimeout(r, 100));
                waitCount++;
            }
        }

        this.isInitializing = true;

        // ✅ YALNIZ YENİ VƏ UĞURSUZ OLMAYAN TASKLARI YÜKLƏ
        const newTaskIds = taskIds.filter(id =>
            !this.initializedTasks.has(id) && !this.failedTasks.has(id)
        );

        if (newTaskIds.length === 0) {
            console.log(`ℹ️ CommentTracker: ${taskIds.length} task artıq init edilib`);
            this.isInitializing = false;
            return;
        }

        console.log(`🚀 CommentTracker init: ${newTaskIds.length} yeni task (cəmi ${taskIds.length})`);

        // ✅ ARDICIL YÜKLƏMƏ (PARALEL YOX!) - hər task üçün 1 saniyə gözləmə
        for (let i = 0; i < newTaskIds.length; i++) {
            const taskId = newTaskIds[i];

            try {
                // ✅ TIMEOUT MEXANİZMİ (5 saniyə)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                const response = await makeApiRequest(`/comments/task/${taskId}`, 'GET', null, {
                    silent: true,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                // ✅ 508 xətasını yoxla
                if (response && (response.status === 508 || response.error?.includes('508'))) {
                    throw new Error('508 Loop Detected');
                }

                const count = Array.isArray(response) ? response.length :
                              (response?.data?.length || response?.items?.length || 0);

                this.commentCounts[taskId] = count;
                this.unreadCounts[taskId] = count;
                this.initializedTasks.add(taskId);
                this._updateBadge(taskId, count, count);
                console.log(`✅ Task ${taskId}: ${count} comment (${count} oxunmamış)`);

            } catch(e) {
                if (e.message?.includes('508') || e.message?.includes('Loop')) {
                    console.warn(`⚠️ Task ${taskId} 508 xətası - tracking LƏĞV EDİLDİ`);
                    this.failedTasks.add(taskId);  // ✅ BİR DAHA CƏHD ETMƏ
                    this.commentCounts[taskId] = 0;
                    this.unreadCounts[taskId] = 0;
                    this._updateBadge(taskId, 0, 0);
                } else if (e.name === 'AbortError') {
                    console.warn(`⚠️ Task ${taskId} timeout - tracking LƏĞV EDİLDİ`);
                    this.failedTasks.add(taskId);
                } else {
                    console.warn(`⚠️ Task ${taskId} comment alınmadı:`, e.message);
                    this.commentCounts[taskId] = 0;
                    this.unreadCounts[taskId] = 0;
                    this.initializedTasks.add(taskId);
                    this._updateBadge(taskId, 0, 0);
                }
            }

            // ✅ Hər task arasında GÖZLƏ (server overload olmasın)
            if (i < newTaskIds.length - 1) {
                await new Promise(r => setTimeout(r, 500));
            }
        }

        // ✅ BİR DƏFƏLİK GLOBAL POLLING BAŞLAT
        this._startGlobalPolling();
        this.isInitializing = false;
    },

    _startGlobalPolling() {
        if (this.globalInterval) {
            return; // Artıq işləyir
        }

        // ✅ YALNIZ SAĞLAM TASKLAR ÜÇÜN POLLING
        const healthyTasks = Array.from(this.initializedTasks).filter(
            id => !this.failedTasks.has(id)
        );

        if (healthyTasks.length === 0) {
            console.log('ℹ️ CommentTracker: Polling başladılmadı (sağlam task yoxdur)');
            return;
        }

        console.log(`🔄 CommentTracker: Global polling başladı (${healthyTasks.length} task, hər ${this.pollingIntervalMs/1000} saniyə)`);

        this.globalInterval = setInterval(async () => {
            const activeTasks = Array.from(this.initializedTasks).filter(
                id => !this.failedTasks.has(id)
            );

            if (activeTasks.length === 0) {
                return;
            }

            // ✅ ARDICIL YOXLAMA (PARALEL YOX!)
            for (const taskId of activeTasks) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);

                    const res = await makeApiRequest(`/comments/task/${taskId}`, 'GET', null, {
                        silent: true,
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (res && (res.status === 508 || res.error?.includes('508'))) {
                        console.warn(`⚠️ Task ${taskId} polling-də 508 xətası - tracking dayandırıldı`);
                        this.failedTasks.add(taskId);
                        this.initializedTasks.delete(taskId);
                        continue;
                    }

                    const newCount = Array.isArray(res) ? res.length :
                                    (res?.data?.length || res?.items?.length || 0);

                    const oldCount = this.commentCounts[taskId] || 0;

                    if (newCount !== oldCount) {
                        const diff = newCount - oldCount;
                        const newUnread = (this.unreadCounts[taskId] || 0) + diff;
                        this.commentCounts[taskId] = newCount;
                        this.unreadCounts[taskId] = newUnread;
                        this._updateBadge(taskId, newCount, newUnread);
                        console.log(`🆕 Task ${taskId}: +${diff} yeni comment (${newUnread} oxunmamış)`);
                    }

                } catch(e) {
                    if (!e.message?.includes('508') && e.name !== 'AbortError') {
                        console.warn(`⚠️ Task ${taskId} polling xətası:`, e.message);
                    }
                }

                // ✅ Hər yoxlama arasında 200ms gözlə
                await new Promise(r => setTimeout(r, 200));
            }
        }, this.pollingIntervalMs);
    },

    markAsRead(taskId) {
        if (this.unreadCounts[taskId] && this.unreadCounts[taskId] > 0) {
            console.log(`📖 Task ${taskId} comment-ləri oxundu`);
            this.unreadCounts[taskId] = 0;
            this._updateBadge(taskId, this.commentCounts[taskId], 0);
        }
    },

    _updateBadge(taskId, totalCount, unreadCount) {
        const badge = document.querySelector(`.comment-count-badge[data-task-id="${taskId}"]`);
        if (!badge) return;

        const displayCount = unreadCount > 0 ? unreadCount : totalCount;

        badge.textContent = displayCount;
        badge.setAttribute('data-unread', unreadCount);
        badge.setAttribute('data-total', totalCount);

        if (unreadCount > 0) {
            badge.style.background = '#ef4444';
            badge.style.color = '#ffffff';
            badge.style.animation = 'pulse-red 1s infinite';
        } else {
            badge.style.background = totalCount > 0 ? '#dbeafe' : '#f1f5f9';
            badge.style.color = totalCount > 0 ? '#1d4ed8' : '#94a3b8';
            badge.style.animation = 'none';
        }
    },

    stopTracking(taskId) {
        this.initializedTasks.delete(taskId);
        this.failedTasks.delete(taskId);
    },

    stopAllTracking() {
        if (this.globalInterval) {
            clearInterval(this.globalInterval);
            this.globalInterval = null;
        }
        this.initializedTasks.clear();
        this.failedTasks.clear();
        console.log('⏹️ CommentTracker tamamilə dayandırıldı');
    },

    onCommentAdded(taskId) {
        // 508 xətası almış tasklar üçün comment əlavə etmə
        if (this.failedTasks.has(taskId)) return;

        const curTotal = this.commentCounts[taskId] ?? 0;
        const curUnread = this.unreadCounts[taskId] ?? 0;
        const newTotal = curTotal + 1;
        const newUnread = curUnread + 1;

        this.commentCounts[taskId] = newTotal;
        this.unreadCounts[taskId] = newUnread;
        this._updateBadge(taskId, newTotal, newUnread);
        console.log(`💬 Yeni comment! Task ${taskId}: ümumi=${newTotal}, oxunmamış=${newUnread}`);
    },

    refresh() {
        const taskIds = Array.from(this.initializedTasks).filter(id => !this.failedTasks.has(id));
        if (taskIds.length > 0) {
            this.initForTasks(taskIds);
        }
    }
};

// CSS pulsasiya animasiyası
if (!document.getElementById('cmt-tracker-styles')) {
    const s = document.createElement('style');
    s.id = 'cmt-tracker-styles';
    s.textContent = `
        @keyframes pulse-red {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
            70% { transform: scale(1.05); box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        
        .comment-count-badge {
            transition: all 0.2s ease;
        }
    `;
    document.head.appendChild(s);
}

window.refreshCommentCount = (taskId) => {
    if (!window.CommentTracker.failedTasks.has(taskId)) {
        window.CommentTracker._fetchSingle(taskId);
    }
};
window.onCommentAdded = (taskId) => window.CommentTracker.onCommentAdded(taskId);
window.stopCommentTracking = () => window.CommentTracker.stopAllTracking();

console.log('✅ CommentTracker yükləndi (FİKS EDİLMİŞ - 508 xətası həll olundu)');