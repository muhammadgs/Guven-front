// commentTracker.js - OXUNMAMIŞ COMMENT SAYI İLƏ (FİKS EDİLMİŞ VERSİYA)
// 🔥 ƏSAS DƏYİŞİKLİK: Sonsuz interval qurulmasının QARŞISI ALINIB

window.CommentTracker = {
    commentCounts: {},
    unreadCounts: {},
    intervals: {},
    initializedTasks: new Set(),     // ✅ HANSI TASKLAR ARTIQ INIT EDİLİB
    globalInterval: null,            // ✅ BİR ƏDƏD GLOBAL INTERVAL
    isPolling: false,
    pollingIntervalMs: 30000,

    async initForTasks(taskIds) {
        if (!taskIds || taskIds.length === 0) return;

        // ✅ YALNIZ YENİ TASKLARI TAP
        const newTaskIds = taskIds.filter(id => !this.initializedTasks.has(id));

        if (newTaskIds.length === 0) {
            console.log(`ℹ️ CommentTracker: ${taskIds.length} task artıq init edilib, yeni task yoxdur`);
            return;
        }

        console.log(`🚀 CommentTracker init: ${newTaskIds.length} yeni task (cəmi ${taskIds.length})`);

        // ✅ YENİ TASKLAR ÜÇÜN MƏLUMATLARI YÜKLƏ
        for (const taskId of newTaskIds) {
            try {
                const response = await makeApiRequest(`/comments/task/${taskId}`, 'GET', null, { silent: true });
                const count = Array.isArray(response) ? response.length :
                              (response?.data?.length || response?.items?.length || 0);

                this.commentCounts[taskId] = count;
                this.unreadCounts[taskId] = count;
                this.initializedTasks.add(taskId);      // ✅ ARTIQ INIT EDİLDİ
                this._updateBadge(taskId, count, count);
                console.log(`✅ Task ${taskId}: ${count} comment (${count} oxunmamış)`);
            } catch(e) {
                console.warn(`⚠️ Task ${taskId} comment alınmadı:`, e);
                this.commentCounts[taskId] = 0;
                this.unreadCounts[taskId] = 0;
                this.initializedTasks.add(taskId);
                this._updateBadge(taskId, 0, 0);
            }

            await new Promise(r => setTimeout(r, 50)); // 100ms → 50ms azaldıldı
        }

        // ✅ BİR DƏFƏLİK GLOBAL POLLING BAŞLAT (hər task üçün AYRI interval YOX!)
        this._startGlobalPolling();
    },

    // ✅ BİR DƏFƏLİK GLOBAL POLLING - bütün taskları BİRLİKDƏ yoxlayır
    _startGlobalPolling() {
        if (this.globalInterval) {
            // Artıq polling işləyir, yenisini başlatma
            return;
        }

        console.log('🔄 CommentTracker: Global polling başladı (hər 30 saniyə)');

        this.globalInterval = setInterval(async () => {
            if (this.initializedTasks.size === 0) return;

            const taskIds = Array.from(this.initializedTasks);
            console.log(`📊 CommentTracker: ${taskIds.length} task yoxlanılır...`);

            // ✅ BÜTÜN TASKLARI BİR YERDƏ YOXLA (serial yox, parallel limitli)
            const batchSize = 5;
            for (let i = 0; i < taskIds.length; i += batchSize) {
                const batch = taskIds.slice(i, i + batchSize);
                await Promise.all(batch.map(taskId => this._checkSingleTask(taskId)));
                await new Promise(r => setTimeout(r, 100));
            }
        }, this.pollingIntervalMs);
    },

    // ✅ TAK BİR TASK-I YOXLA (global polling üçün)
    async _checkSingleTask(taskId) {
        try {
            const res = await makeApiRequest(`/comments/task/${taskId}`, 'GET', null, { silent: true });
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
            // Səhvləri ignor et, amma logla
            if (!e.message?.includes('508')) {
                console.warn(`⚠️ Task ${taskId} yoxlanılmadı:`, e.message);
            }
        }
    },

    // 🔥 İstifadəçi comment-ləri açdıqda çağırılır
    markAsRead(taskId) {
        if (this.unreadCounts[taskId] && this.unreadCounts[taskId] > 0) {
            console.log(`📖 Task ${taskId} comment-ləri oxundu, oxunmamış sayı sıfırlanır`);
            this.unreadCounts[taskId] = 0;
            this._updateBadge(taskId, this.commentCounts[taskId], 0);
        }
    },

    _updateBadge(taskId, totalCount, unreadCount) {
        const badge = document.querySelector(`.comment-count-badge[data-task-id="${taskId}"]`);
        if (!badge) return;

        const oldUnread = parseInt(badge.getAttribute('data-unread') || '0');
        const displayCount = unreadCount > 0 ? unreadCount : totalCount;

        badge.textContent = displayCount;
        badge.setAttribute('data-unread', unreadCount);
        badge.setAttribute('data-total', totalCount);

        if (unreadCount > 0) {
            badge.style.background = '#ef4444';
            badge.style.color = '#ffffff';
            badge.style.animation = 'pulse-red 1s infinite';

            if (unreadCount > oldUnread && oldUnread !== undefined) {
                const btn = badge.closest('button');
                if (btn) {
                    btn.querySelectorAll('.cmt-plus-one').forEach(e => e.remove());
                    const plus = document.createElement('span');
                    plus.className = 'cmt-plus-one';
                    plus.textContent = `+${unreadCount - oldUnread}`;
                    plus.style.cssText = `
                        position: absolute;
                        top: -15px;
                        right: -10px;
                        background: #ef4444;
                        color: white;
                        font-size: 11px;
                        font-weight: bold;
                        padding: 3px 6px;
                        border-radius: 20px;
                        pointer-events: none;
                        animation: cmtBounce 0.5s ease-out forwards;
                        z-index: 100;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                        white-space: nowrap;
                    `;
                    btn.style.position = 'relative';
                    btn.appendChild(plus);
                    setTimeout(() => plus.remove(), 500);
                }
            }
        } else {
            badge.style.background = totalCount > 0 ? '#dbeafe' : '#f1f5f9';
            badge.style.color = totalCount > 0 ? '#1d4ed8' : '#94a3b8';
            badge.style.animation = 'none';
        }
    },

    // ✅ Tək task tracking-i dayandır (artıq ehtiyac yoxdur, amma legacy üçün saxlanır)
    stopTracking(taskId) {
        if (this.intervals[taskId]) {
            clearInterval(this.intervals[taskId]);
            delete this.intervals[taskId];
        }
        this.initializedTasks.delete(taskId);
    },

    // ✅ BÜTÜN polling-i dayandır
    stopAllTracking() {
        if (this.globalInterval) {
            clearInterval(this.globalInterval);
            this.globalInterval = null;
        }
        this.initializedTasks.clear();
        console.log('⏹️ CommentTracker tamamilə dayandırıldı');
    },

    onCommentAdded(taskId) {
        const curTotal = this.commentCounts[taskId] ?? 0;
        const curUnread = this.unreadCounts[taskId] ?? 0;
        const newTotal = curTotal + 1;
        const newUnread = curUnread + 1;

        this.commentCounts[taskId] = newTotal;
        this.unreadCounts[taskId] = newUnread;

        this._updateBadge(taskId, newTotal, newUnread);
        console.log(`💬 Yeni comment! Task ${taskId}: ümumi=${newTotal}, oxunmamış=${newUnread}`);

        setTimeout(() => this._fetchSingle(taskId), 2000);
    },

    async _fetchSingle(taskId) {
        try {
            const res = await makeApiRequest(`/comments/task/${taskId}`, 'GET', null, { silent: true });
            const newCount = Array.isArray(res) ? res.length :
                            (res?.data?.length || res?.items?.length || 0);

            const oldCount = this.commentCounts[taskId] || 0;

            if (newCount !== oldCount) {
                const diff = newCount - oldCount;
                const newUnread = (this.unreadCounts[taskId] || 0) + diff;
                this.commentCounts[taskId] = newCount;
                this.unreadCounts[taskId] = newUnread;
                this._updateBadge(taskId, newCount, newUnread);
            }
        } catch(e) {}
    },

    // ✅ Təzələmə (lazım olarsa)
    refresh() {
        const taskIds = Array.from(this.initializedTasks);
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
        @keyframes cmtBounce {
            0% { transform: translateY(0) scale(0.8); opacity: 0; }
            30% { transform: translateY(-8px) scale(1.1); opacity: 1; }
            70% { transform: translateY(-2px) scale(1); opacity: 1; }
            100% { transform: translateY(-20px) scale(0.9); opacity: 0; }
        }
        
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

window.refreshCommentCount = (taskId) => window.CommentTracker._fetchSingle(taskId);
window.onCommentAdded = (taskId) => window.CommentTracker.onCommentAdded(taskId);
window.stopCommentTracking = () => window.CommentTracker.stopAllTracking();

console.log('✅ CommentTracker yükləndi (FİKS EDİLMİŞ - oxunmamış comment sayı aktiv)');