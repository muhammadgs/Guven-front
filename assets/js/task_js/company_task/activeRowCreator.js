// activeRowCreator.js - İŞ SAATİ COUNTDOWN + ŞİRKƏT ADI DÜZƏLİŞİ
// Geri sayım: yalnız 09:00-18:00 arasında sayır
// Tapşırıq TƏSDİQİ: istənilən vaxt işləyir (gecə də)
// Backend: pending_approval → waiting → in_progress ↔ paused → completed

// ======================== İŞ SAATI HESABLAMA ========================
const WorkHours = {
    START: 9,   // 09:00
    END: 18,    // 18:00

    getDayEnd: function(date) {
        const d = new Date(date);
        d.setHours(this.END, 0, 0, 0);
        return d;
    },

    // Verilən an iş saatı içindəmi?
    isWorkTime: function(date) {
        const d = new Date(date);
        const totalMin = d.getHours() * 60 + d.getMinutes();
        return totalMin >= this.START * 60 && totalMin < this.END * 60;
    },

    // Növbəti iş başlanğıcına qədər ms (sabah 09:00 və ya bugün 09:00)
    msUntilNextWorkStart: function(fromDate) {
        const now = new Date(fromDate);
        const totalMin = now.getHours() * 60 + now.getMinutes();
        const next = new Date(now);

        if (totalMin < this.START * 60) {
            // Hələ başlamamış - bugün 09:00
            next.setHours(this.START, 0, 0, 0);
        } else {
            // 18:00 keçib - sabah 09:00
            next.setDate(next.getDate() + 1);
            next.setHours(this.START, 0, 0, 0);
        }
        return next.getTime() - now.getTime();
    },

    /**
     * calcDeadline: fromDate-dən başlayaraq totalWorkMs qədər
     * iş vaxtı keçdikdən sonra real deadline-ı qaytarır.
     *
     * Nümunələr:
     *  - Saat 17:30, 2 iş saatı → sabah 10:30
     *  - Saat 20:00, 2 iş saatı → sabah 11:00
     *  - Saat 08:00, 2 iş saatı → bugün 11:00
     *  - Saat 09:00, 2 iş saatı → bugün 11:00
     *
     * BUG DÜZƏLİŞİ: Köhnə versiyada saat 20:00-da yaranan tapşırıqda
     * calcDeadline anında iş saatı blokuna girə bilmirdi (isWorkTime=false),
     * amma msUntilNextWorkStart düzgün sabah 09:00-u qaytarırdı.
     * İndi hər iterasiyada əvvəl iş saatı yoxlanılır, deyilsə növbəti
     * iş başlanğıcına keçilir - sonsuz dövrə riski yoxdur (MAX_ITER=100).
     */
    calcDeadline: function(from, totalWorkMs) {
        let remaining = totalWorkMs;
        let cursor = new Date(from);
        const MAX_ITER = 100;
        let iter = 0;

        while (remaining > 0 && iter < MAX_ITER) {
            iter++;

            if (this.isWorkTime(cursor)) {
                const dayEnd = this.getDayEnd(cursor);
                const availableMs = dayEnd.getTime() - cursor.getTime();

                if (availableMs >= remaining) {
                    cursor = new Date(cursor.getTime() + remaining);
                    remaining = 0;
                } else {
                    remaining -= availableMs;
                    // Sabah 09:00-a keç
                    cursor = new Date(dayEnd);
                    cursor.setDate(cursor.getDate() + 1);
                    cursor.setHours(this.START, 0, 0, 0);
                }
            } else {
                // İş saatı dışındayıq - növbəti iş başlanğıcına keç
                const msUntil = this.msUntilNextWorkStart(cursor);
                cursor = new Date(cursor.getTime() + msUntil);
            }
        }

        return cursor;
    },

    /**
     * workMsBetween: İki vaxt arasında neçə ms iş vaxtı var?
     * Countdown üçün qalıq iş vaxtını hesablar.
     */
    workMsBetween: function(from, to) {
        if (from >= to) return 0;
        let total = 0;
        let cursor = new Date(from);
        const MAX_ITER = 200;
        let iter = 0;

        while (cursor < to && iter < MAX_ITER) {
            iter++;

            if (this.isWorkTime(cursor)) {
                const dayEnd = this.getDayEnd(cursor);
                const segEnd = dayEnd < to ? dayEnd : new Date(to);
                total += segEnd.getTime() - cursor.getTime();

                if (dayEnd < to) {
                    cursor = new Date(dayEnd);
                    cursor.setDate(cursor.getDate() + 1);
                    cursor.setHours(this.START, 0, 0, 0);
                } else {
                    break;
                }
            } else {
                const msUntil = this.msUntilNextWorkStart(cursor);
                cursor = new Date(cursor.getTime() + msUntil);
            }
        }

        return total;
    }
};

// ======================== GLOBAL TIMER SİSTEMİ ========================
window.TaskTimerSystem = window.TaskTimerSystem || {
    countdowns: {},
    workTimers: {},
    delayedTasks: {},

    startConfirmationCountdown: function(taskId, approvalExpiresAt) {
        console.log(`⏱️ Countdown başlayır: task=${taskId}, saat=${new Date().toLocaleTimeString()}`);

        const key = `confirm_${taskId}`;

        // Köhnə timeri təmizlə
        if (this.countdowns[key]) {
            clearInterval(this.countdowns[key].interval);
            clearTimeout(this.countdowns[key].sleepTimeout);
        }

        const TOTAL_WORK_MS = 2 * 60 * 60 * 1000; // 2 iş saatı
        const storageKey = `task_confirm_work_deadline_${taskId}`;

        // ── Deadline-ı müəyyən et ─────────────────────────────────────
        let realDeadline;
        const storedDeadline = localStorage.getItem(storageKey);

        if (storedDeadline) {
            realDeadline = new Date(parseInt(storedDeadline));
            // Saxlanmış deadline keçibsə yenidən hesabla
            if (realDeadline <= new Date()) {
                localStorage.removeItem(storageKey);
                realDeadline = null;
            } else {
                console.log(`📀 Saxlanmış deadline: ${realDeadline.toLocaleString()}`);
            }
        }

        if (!realDeadline) {
            const now = new Date();
            realDeadline = WorkHours.calcDeadline(now, TOTAL_WORK_MS);
            localStorage.setItem(storageKey, realDeadline.getTime().toString());
            console.log(`🆕 Yeni deadline: ${now.toLocaleTimeString()} + 2 iş saatı = ${realDeadline.toLocaleString()}`);
        }

        this.countdowns[key] = {
            realDeadline, taskId,
            interval: null, sleepTimeout: null
        };

        const self = this;

        // ── İş saatı dışında göstəriş və sleep ───────────────────────
        const showOutOfHours = (el, cd) => {
            if (cd.interval) { clearInterval(cd.interval); cd.interval = null; }
            if (cd.sleepTimeout) { clearTimeout(cd.sleepTimeout); }

            const now = new Date();
            const msUntil = WorkHours.msUntilNextWorkStart(now);
            const nextStart = new Date(now.getTime() + msUntil);
            const nextH = String(nextStart.getHours()).padStart(2, '0');
            const nextM = String(nextStart.getMinutes()).padStart(2, '0');
            const nextDate = nextStart.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' });

            const remWorkMs = WorkHours.workMsBetween(nextStart, cd.realDeadline);
            const rh = Math.floor(remWorkMs / 3600000);
            const rm = Math.floor((remWorkMs % 3600000) / 60000);
            const remStr = rh > 0 ? `${rh}s ${rm}d qalıb` : `${rm}d qalıb`;

            el.innerHTML = `
                <div style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;
                    border-radius:20px;background:#f1f5f9;color:#475569;
                    border:1px solid #cbd5e1;font-size:12px;font-weight:600;">
                    <i class="fas fa-moon" style="color:#94a3b8;font-size:11px;"></i>
                    <span>İş saatı bitti</span>
                    <span style="font-size:10px;opacity:0.8;background:rgba(0,0,0,0.07);padding:1px 7px;border-radius:10px;">
                        ${nextDate} ${nextH}:${nextM}-də davam · ${remStr}
                    </span>
                </div>`;

            console.log(`🌙 Task ${taskId}: iş saatı dışı, ${Math.round(msUntil / 60000)} dəq sonra davam`);

            cd.sleepTimeout = setTimeout(() => {
                const cd2 = self.countdowns[key];
                if (!cd2) return;
                console.log(`☀️ Task ${taskId}: iş saatı başladı`);
                tick();
                if (!cd2.interval) cd2.interval = setInterval(tick, 1000);
            }, msUntil);
        };

        // ── Tick (hər saniyə) ─────────────────────────────────────────
        const tick = () => {
            const cd = self.countdowns[key];
            if (!cd) return;

            const el = document.querySelector(`[data-confirm-timer="${taskId}"]`);
            if (!el) return;

            const now = new Date();

            // Deadline keçibmi?
            if (now >= cd.realDeadline) {
                const delayHours = ((now - cd.realDeadline) / 3600000).toFixed(1);
                self._markDelayed(taskId, delayHours);
                el.innerHTML = `<div class="timer-delayed">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span class="delay-time">Gecikmə: ${delayHours} saat</span>
                </div>`;
                if (cd.interval) { clearInterval(cd.interval); cd.interval = null; }
                return;
            }

            // İş saatı dışındayıqsa → durur
            if (!WorkHours.isWorkTime(now)) {
                showOutOfHours(el, cd);
                return;
            }

            // Normal iş vaxtı countdown
            const remMs = WorkHours.workMsBetween(now, cd.realDeadline);
            const h = Math.floor(remMs / 3600000);
            const m = Math.floor((remMs % 3600000) / 60000);
            const s = Math.floor((remMs % 60000) / 1000);

            let cls = 'normal', warn = '';
            if (remMs < 30 * 60 * 1000) {
                cls = 'urgent critical-warning';
                warn = `<span class="delay-warning">⚠️ ${m}d ${s}s qaldı!</span>`;
            } else if (remMs < 60 * 60 * 1000) {
                cls = 'warning warning-sign';
                warn = `<span class="delay-warning">⚠️ ${m} dəq qaldı!</span>`;
            }

            el.innerHTML = `
                <div class="confirm-countdown ${cls}">
                    <i class="fas fa-hourglass-half"></i>
                    <span class="countdown-time">${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}</span>
                    <span class="countdown-label">İş vaxtı qaldı</span>
                    ${warn}
                </div>`;
        };

        // ── Başlat ────────────────────────────────────────────────────
        tick();
        if (WorkHours.isWorkTime(new Date())) {
            this.countdowns[key].interval = setInterval(tick, 1000);
        }
        // İş saatı dışındayıqsa tick() içindəki showOutOfHours sleep yaradacaq
    },

    _markDelayed: function(taskId, delayHours) {
        const dkey = `delay_${taskId}`;
        if (!this.delayedTasks[dkey]) {
            this.delayedTasks[dkey] = { taskId, delayHours, notified: false };
            if (!this.delayedTasks[dkey].notified) {
                const n = document.createElement('div');
                n.className = 'timer-notification';
                n.style.background = '#ef4444';
                n.innerHTML = `<i class="fas fa-exclamation-triangle"></i>
                    Tapşırıq #${taskId} təsdiqlənmədi! Gecikmə: ${delayHours} saat
                    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:white;margin-left:10px;cursor:pointer;">✕</button>`;
                document.body.appendChild(n);
                setTimeout(() => n.remove(), 8000);
                this.delayedTasks[dkey].notified = true;
            }
            localStorage.setItem(`task_delay_${taskId}`, JSON.stringify({ delayHours, delayStartTime: Date.now() }));
        }
    },

    getDelayInfo: function(taskId) {
        const stored = localStorage.getItem(`task_delay_${taskId}`);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                const elapsed = (Date.now() - data.delayStartTime) / 3600000;
                return { isDelayed: true, delayHours: (parseFloat(data.delayHours) + elapsed).toFixed(1) };
            } catch(e) {}
        }
        return { isDelayed: false, delayHours: 0 };
    },

    // startWorkTimer funksiyasını DƏYİŞDİR (müdaxilə yox, sadəcə göstərmə)
    startWorkTimer: function(taskId, startedAt, totalPausedSeconds) {
        const key = `work_${taskId}`;
        if (this.workTimers[key]) clearInterval(this.workTimers[key].interval);

        let startTime;
        if (startedAt) {
            startTime = new Date(startedAt).getTime();
        } else {
            const stored = localStorage.getItem(`task_work_start_${taskId}`);
            startTime = stored ? parseInt(stored) : Date.now();
            if (!stored) localStorage.setItem(`task_work_start_${taskId}`, startTime);
        }

        const pausedMs = Math.max(0, (totalPausedSeconds || 0) * 1000);
        this.workTimers[key] = { startTime, pausedMs, isPaused: false };

        const tick = () => {
            const t = this.workTimers[key];
            if (!t) return;

            // Timer göstəricisi - HƏR KƏS ÜÇÜN İŞLƏYİR
            const el = document.querySelector(`[data-work-timer="${taskId}"]`);
            const lbl = document.querySelector(`[data-worked-label="${taskId}"]`);
            if (!el) return;

            let elapsed;
            if (t.isPaused) {
                // Paused vəziyyətində vaxt dayanır
                elapsed = t.pausedAt ? (t.pausedAt - t.startTime - t.pausedMs) : (Date.now() - t.startTime - t.pausedMs);
            } else {
                elapsed = Math.max(0, Date.now() - t.startTime - t.pausedMs);
            }

            const h = Math.floor(elapsed / 3600000);
            const m = Math.floor((elapsed % 3600000) / 60000);
            const s = Math.floor((elapsed % 60000) / 1000);
            el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

            if (lbl) {
                const fmtWorked = ms => {
                    if (ms < 0) ms = 0;
                    const hh = Math.floor(ms / 3600000), mm = Math.floor((ms % 3600000) / 60000);
                    return hh > 0 ? `${hh}s ${mm}d` : `${mm}d`;
                };
                lbl.textContent = fmtWorked(elapsed);
            }
        };

        tick();
        this.workTimers[key].interval = setInterval(tick, 1000);
    },

    togglePauseUI: function(taskId, action) {
        const key = `work_${taskId}`;
        if (this.workTimers[key]) this.workTimers[key].isPaused = (action === 'pause');
    },

    clearConfirmation: function(taskId) {
        const key = `confirm_${taskId}`;
        if (this.countdowns[key]) {
            clearInterval(this.countdowns[key].interval);
            clearTimeout(this.countdowns[key].sleepTimeout);
            delete this.countdowns[key];
        }
        localStorage.removeItem(`task_confirm_work_deadline_${taskId}`);
        localStorage.removeItem(`task_delay_${taskId}`);
    },

    clearWorkTimer: function(taskId) {
        const key = `work_${taskId}`;
        if (this.workTimers[key]) { clearInterval(this.workTimers[key].interval); delete this.workTimers[key]; }
        localStorage.removeItem(`task_work_start_${taskId}`);
    },

    initNewTaskCountdown: function(taskId, approvalExpiresAt) {
        localStorage.removeItem(`task_confirm_work_deadline_${taskId}`);
        setTimeout(() => this.startConfirmationCountdown(taskId, approvalExpiresAt), 100);
    },
};

// ======================== CSS STİLLƏRİ ========================
if (!document.getElementById('task-timer-styles')) {
    const style = document.createElement('style');
    style.id = 'task-timer-styles';
    style.textContent = `
        .confirm-countdown { display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap; }
        .confirm-countdown.normal  { background:#e0f2fe;color:#0369a1;border:1px solid #7dd3fc; }
        .confirm-countdown.warning { background:#fef3c7;color:#b45309;border:1px solid #fbbf24;animation:pulse-warn 1.5s infinite; }
        .confirm-countdown.urgent  { background:#fee2e2;color:#b91c1c;border:1px solid #f87171;animation:pulse-urgent 0.8s infinite; }
        .confirm-countdown.warning-sign   { box-shadow:0 0 0 3px rgba(245,158,11,0.3); }
        .confirm-countdown.critical-warning { box-shadow:0 0 0 3px rgba(239,68,68,0.4); }
        .countdown-time  { font-family:'Courier New',monospace;font-size:13px;font-weight:700; }
        .countdown-label { font-size:10px;opacity:0.75; }
        .delay-warning   { font-size:10px;background:#f97316;color:white;padding:2px 6px;border-radius:12px;margin-left:5px;animation:blink 1s infinite; }
        .timer-delayed   { display:inline-flex;align-items:center;gap:8px;background:#dc2626;color:white;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;border:1px solid #f87171; }
        .delay-time      { background:#991b1b;padding:2px 8px;border-radius:12px;font-family:'Courier New',monospace;font-weight:bold; }
        @keyframes pulse-warn   { 0%,100%{opacity:1} 50%{opacity:0.65} }
        @keyframes pulse-urgent { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.03)} }
        @keyframes blink        { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes slideInRight { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
        .confirm-actions { display:flex;gap:4px;margin-top:5px;flex-wrap:wrap; }
        .btn-approve {
            background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;
            padding:5px 11px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;
            display:inline-flex;align-items:center;gap:4px;transition:all 0.2s;box-shadow:0 2px 5px rgba(16,185,129,0.3);
        }
        .btn-approve:hover { transform:translateY(-1px);box-shadow:0 4px 10px rgba(16,185,129,0.45); }
        .btn-approve:disabled { opacity:0.6;cursor:not-allowed;transform:none; }
        .btn-reject-approval {
            background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;
            padding:5px 11px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;
            display:inline-flex;align-items:center;gap:4px;transition:all 0.2s;box-shadow:0 2px 5px rgba(239,68,68,0.3);
        }
        .btn-reject-approval:hover { transform:translateY(-1px);box-shadow:0 4px 10px rgba(239,68,68,0.45); }
        .btn-reject-approval:disabled { opacity:0.6;cursor:not-allowed;transform:none; }
        .waiting-section { display:flex;flex-direction:column;gap:5px; }
        .status-waiting-badge { display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:20px;font-size:12px;font-weight:600;width:fit-content;background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46;border:1px solid #6ee7b7; }
        .btn-start-work { background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:all 0.2s;width:fit-content;box-shadow:0 2px 6px rgba(59,130,246,0.35); }
        .btn-start-work:hover { transform:translateY(-1px);box-shadow:0 4px 12px rgba(59,130,246,0.45); }
        .btn-start-work:disabled { opacity:0.6;cursor:not-allowed;transform:none; }
        .working-section { display:flex;flex-direction:column;gap:5px; }
        .work-timer-display { display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:20px;background:linear-gradient(135deg,#1e40af,#1d4ed8);color:#fff;font-size:12px;font-weight:600;width:fit-content; }
        .work-timer-display.paused-mode { background:linear-gradient(135deg,#78716c,#57534e); }
        .work-timer-clock { font-family:'Courier New',monospace;font-size:14px;color:#bfdbfe;font-weight:700; }
        .timer-status-label { font-size:10px;opacity:0.8; }
        .btn-pause-toggle { background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:5px 12px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all 0.2s;width:fit-content;box-shadow:0 2px 5px rgba(245,158,11,0.3); }
        .btn-pause-toggle:hover { transform:translateY(-1px);box-shadow:0 4px 10px rgba(245,158,11,0.45); }
        .btn-pause-toggle:disabled { opacity:0.6;cursor:not-allowed;transform:none; }
        .btn-pause-toggle.resume-mode { background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 2px 5px rgba(16,185,129,0.3); }
        .timer-notification { position:fixed;bottom:80px;right:20px;color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:600;z-index:10005;box-shadow:0 4px 12px rgba(0,0,0,0.2);display:flex;align-items:center;gap:8px;animation:slideInRight 0.3s ease; }
        /* Mənə aid olmayan tasklar üçün disabled düymə stili */
        .btn-not-mine {
            opacity: 0.5;
            cursor: not-allowed;
            filter: grayscale(0.2);
        }
        .btn-not-mine:hover {
            transform: none !important;
            box-shadow: none !important;
        }
    `;
    document.head.appendChild(style);
}

// ======================== GLOBAL HANDLER-LƏR ========================

window.handleTaskApprove = async function(taskId) {
    const btn = document.querySelector(`[data-approve-btn="${taskId}"]`);
    const rBtn = document.querySelector(`[data-reject-btn="${taskId}"]`);
    if (btn) btn.disabled = true;
    if (rBtn) rBtn.disabled = true;
    try {
        Object.keys(sessionStorage).forEach(k => {
            if (k.startsWith('tc_') || k.startsWith('task_') || k.startsWith('cache_')) sessionStorage.removeItem(k);
        });
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('task_confirm_end_') || k.startsWith('task_delay_') ||
                k.startsWith('task_work_start_') || k.startsWith('cache_') ||
                k === 'tasks_cache' || k === 'partners_cache') localStorage.removeItem(k);
        });
        if (window.dbManager) await window.dbManager.clearCache();
        window.TaskTimerSystem.clearConfirmation(taskId);
        if (typeof makeApiRequest !== 'function') throw new Error('makeApiRequest tapılmadı');
        const response = await makeApiRequest(`/tasks/${taskId}/approve`, 'POST', {});
        if (!response || response.error) throw new Error(response?.error || 'Xəta baş verdi');
        if (window.taskManager) await window.taskManager.loadActiveTasks(1, true);
        showTimerNotification('✅ Tapşırıq qəbul edildi!', '#10b981');
    } catch (error) {
        showTimerNotification('❌ ' + (error.message || 'Xəta baş verdi'), '#ef4444');
        if (btn) btn.disabled = false;
        if (rBtn) rBtn.disabled = false;
    }
};

window.handleTaskRejectApproval = async function(taskId) {
    const reason = prompt('İmtina səbəbini yazın (boş buraxmaq olar):');
    if (reason === null) return;
    const btn = document.querySelector(`[data-approve-btn="${taskId}"]`);
    const rBtn = document.querySelector(`[data-reject-btn="${taskId}"]`);
    if (btn) btn.disabled = true;
    if (rBtn) rBtn.disabled = true;
    try {
        if (typeof makeApiRequest !== 'function') throw new Error('makeApiRequest tapılmadı');
        const response = await makeApiRequest(`/tasks/${taskId}/reject-approval`, 'POST', {
            rejection_reason: reason || 'İmtina edildi', rejection_notes: ''
        });
        if (!response || response.error) throw new Error(response?.error || 'Xəta baş verdi');
        window.TaskTimerSystem.clearConfirmation(taskId);
        if (window.taskManager?.loadActiveTasks) setTimeout(() => window.taskManager.loadActiveTasks(1, true), 500);
        showTimerNotification('❌ Tapşırıqdan imtina edildi.', '#f59e0b');
    } catch (error) {
        showTimerNotification('❌ ' + (error.message || 'Xəta baş verdi'), '#ef4444');
        if (btn) btn.disabled = false;
        if (rBtn) rBtn.disabled = false;
    }
};

window.handleStartWork = async function(taskId) {
    const btn = document.querySelector(`[data-start-btn="${taskId}"]`);
    if (btn) btn.disabled = true;
    try {
        const currentUserId = window.taskManager?.userData?.userId;
        if (currentUserId) {
            const cached = (typeof TaskCache !== 'undefined' && TaskCache?.get?.('active_tasks')) || [];
            const myActive = cached.filter(t => t.assigned_to == currentUserId && t.status === 'in_progress' && t.id != taskId);
            if (myActive.length > 0) {
                const confirmed = await showActiveTaskWarning(myActive[0].task_title || `#${myActive[0].id}`, myActive[0].id);
                if (!confirmed) { if (btn) btn.disabled = false; return; }
                showTimerNotification('⏸️ Aktiv tapşırıq fasilə edilir...', '#f59e0b');
                try {
                    await makeApiRequest(`/tasks/${myActive[0].id}/pause`, 'POST', { reason: 'Yeni tapşırığa keçid' });
                    const pb = document.querySelector(`[data-pause-btn="${myActive[0].id}"]`);
                    if (pb) { pb.classList.add('resume-mode'); pb.innerHTML = '<i class="fa-sharp fa-solid fa-play-pause"></i>'; }
                    const disp = document.querySelector(`[data-work-timer-display="${myActive[0].id}"]`);
                    if (disp) disp.classList.add('paused-mode');
                    const tk = `work_${myActive[0].id}`;
                    if (window.TaskTimerSystem.workTimers[tk]) window.TaskTimerSystem.workTimers[tk].isPaused = true;
                } catch(e) { showTimerNotification('❌ Aktiv tapşırıq fasilə edilə bilmədi', '#ef4444'); if (btn) btn.disabled = false; return; }
            }
        }
        if (typeof makeApiRequest !== 'function') throw new Error('makeApiRequest tapılmadı');
        const taskResp = await makeApiRequest(`/tasks/${taskId}`, 'GET', null, { silent: true });
        const cur = taskResp?.data || taskResp;
        if (cur.status === 'in_progress') { showTimerNotification('ℹ️ Bu task artıq işlənir!', '#f59e0b'); if (btn) btn.disabled = false; return; }
        if (cur.status !== 'waiting') throw new Error(`Task '${cur.status}' statusundadır. Yalnız 'waiting' başladıla bilər.`);
        const response = await makeApiRequest(`/tasks/${taskId}/start`, 'POST', {});
        if (!response || response.error) throw new Error(response?.error || 'Xəta baş verdi');
        const startedAt = response.task?.started_at || response.data?.started_at || new Date().toISOString();
        const pausedSec = response.task?.total_paused_seconds || 0;
        const row = document.querySelector(`tr[data-task-id="${taskId}"]`);
        if (row) {
            const sec = row.querySelector('.status-section');
            if (sec) {
                sec.innerHTML = `<div class="status-section" style="display:flex;flex-direction:column;gap:5px;">
                    ${buildWorkingHTML(taskId, false, true, 0)}
                    <div style="display:flex;gap:3px;flex-wrap:wrap;"><button class="btn btn-sm btn-warning" onclick="TableManager.openEditModal(${taskId},'active')" title="Redaktə"><i class="fa-solid fa-edit"></i></button></div>
                </div>`;
                setTimeout(() => window.TaskTimerSystem.startWorkTimer(taskId, startedAt, pausedSec), 150);
            }
        }
        if (window.taskManager?.loadActiveTasks) setTimeout(() => window.taskManager.loadActiveTasks(1, true), 1000);
        showTimerNotification('▶️ İş başladı! Uğurlar!', '#3b82f6');
    } catch (error) {
        showTimerNotification('❌ ' + (error.message || 'Xəta baş verdi'), '#ef4444');
        if (btn) btn.disabled = false;
    }
};

function showActiveTaskWarning(activeTitle, activeTaskId) {
    return new Promise(resolve => {
        document.getElementById('active-task-warning-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'active-task-warning-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;';
        overlay.innerHTML = `<div style="background:var(--color-background-primary,#fff);border-radius:14px;padding:28px 32px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.18);border:1px solid var(--color-border-tertiary,#e2e8f0);">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                <div style="width:44px;height:44px;border-radius:50%;background:#fef3c7;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-exclamation-triangle" style="color:#d97706;font-size:20px;"></i></div>
                <div><div style="font-weight:600;font-size:15px;color:var(--color-text-primary);">Aktiv tapşırıq var</div>
                <div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">Eyni anda yalnız 1 tapşırıq icra edilə bilər</div></div>
            </div>
            <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:10px 14px;margin-bottom:18px;font-size:13px;color:#92400e;">
                <i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i><strong>İcra edilir:</strong> ${activeTitle}
            </div>
            <div style="font-size:13px;color:var(--color-text-secondary);margin-bottom:20px;line-height:1.5;">Yeni tapşırığa başlamaq üçün əvvəlcə aktiv tapşırığı <strong>fasilə edin</strong>.</div>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="awt-cancel" style="padding:8px 18px;border-radius:8px;border:1px solid var(--color-border-secondary,#cbd5e1);background:transparent;color:var(--color-text-secondary);font-size:13px;cursor:pointer;">Ləğv et</button>
                <button id="awt-confirm" style="padding:8px 18px;border-radius:8px;border:none;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="fas fa-pause"></i> Fasilə ver və başla</button>
            </div></div>`;
        document.body.appendChild(overlay);
        document.getElementById('awt-cancel').onclick = () => { overlay.remove(); resolve(false); };
        document.getElementById('awt-confirm').onclick = () => { overlay.remove(); resolve(true); };
        overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
    });
}

window.handlePauseToggle = async function(taskId) {
    const btn = document.querySelector(`[data-pause-btn="${taskId}"]`);
    if (!btn) return;
    const isPaused = btn.classList.contains('resume-mode');
    btn.disabled = true;
    try {
        if (typeof makeApiRequest !== 'function') throw new Error('makeApiRequest tapılmadı');
        if (isPaused) {
            const response = await makeApiRequest(`/tasks/${taskId}/resume`, 'POST', {});
            if (!response || response.error) throw new Error(response?.error || 'Xəta');
            btn.classList.remove('resume-mode');
            btn.innerHTML = '<i class="fas fa-pause"></i>';
            document.querySelector(`[data-work-timer-display="${taskId}"]`)?.classList.remove('paused-mode');
            const stEl = document.querySelector(`[data-timer-status="${taskId}"]`);
            if (stEl) stEl.textContent = 'İşlənir';
            const newPausedSec = response.total_paused_seconds ?? response.task?.total_paused_seconds ?? 0;
            const wkey = `work_${taskId}`;
            const existing = window.TaskTimerSystem.workTimers[wkey];
            if (existing) { existing.pausedMs = Math.max(0, newPausedSec * 1000); existing.isPaused = false; }
            else window.TaskTimerSystem.startWorkTimer(taskId, response.started_at || response.task?.started_at, newPausedSec);
        } else {
            const response = await makeApiRequest(`/tasks/${taskId}/pause`, 'POST', { reason: 'Fasilə' });
            if (!response || response.error) throw new Error(response?.error || 'Xəta');
            btn.classList.add('resume-mode');
           btn.innerHTML = `
                            <div style="position: relative; display: inline-flex; align-items: center; gap: 2px;">
                                <i class="fa-solid fa-play" style="position: relative;"></i>
                                <i class="fa-solid fa-pause" style="position: relative; font-size: 0.7em; margin-left: -6px;"></i>
                            </div>
                            <span style="margin-left: 4px;"></span>
                        `;
            document.querySelector(`[data-work-timer-display="${taskId}"]`)?.classList.add('paused-mode');
            const stEl = document.querySelector(`[data-timer-status="${taskId}"]`);
            if (stEl) stEl.textContent = 'Fasilə';
            window.TaskTimerSystem.togglePauseUI(taskId, 'pause');
        }
    } catch (error) {
        showTimerNotification('❌ ' + (error.message || 'Xəta baş verdi'), '#ef4444');
    } finally {
        if (btn) btn.disabled = false;
    }
};

// ======================== HTML BUILDER-LƏR ========================

/**
 * Təsdiq müddəti keçmiş task (approval_overdue)
 * - Hər kəs gecikmə vaxtını GÖRƏ BİLƏR
 * - Mənə aid deyilsə: GÖTÜR düyməsi (digər user ala bilər)
 * - Mənə aiddirsə: Təsdiq/İmtina düymələri
 */
function buildApprovalOverdueHTML(taskId, delayHours, isAssignedToMe) {
    const overdueHtml = `
        <div data-confirm-timer="${taskId}">
            <div class="timer-delayed" style="background:#dc2626;">
                <i class="fas fa-exclamation-triangle"></i>
                <span class="delay-time">Təsdiq olunmayıb! Gecikmə: ${delayHours} saat</span>
            </div>
        </div>
    `;

    // Edit button - YALNIZ MƏNƏ AİD OLDUQDA
    const editButton = isAssignedToMe ? `
        <button class="btn-edit-task" data-edit-btn="${taskId}" 
                onclick="TableManager.openEditModal(${taskId},'active')" title="Redaktə">
            <i class="fa-solid fa-pen"></i>
        </button>
    ` : '';

    // Mənə aiddirsə - təsdiq/imtina düymələri
    if (isAssignedToMe) {
        return `
            ${overdueHtml}
            <div class="confirm-actions" style="margin-top:5px;">
                <button class="btn-approve" data-approve-btn="${taskId}" onclick="handleTaskApprove(${taskId})">
                    <i class="fas fa-check"></i> Təsdiq et (Gecikmiş)
                </button>
                <button class="btn-reject-approval" data-reject-btn="${taskId}" onclick="handleTaskRejectApproval(${taskId})">
                    <i class="fas fa-times"></i> İmtina
                </button>
                ${editButton}
            </div>`;
    }

    // Mənə AİD DEYİL - digər user götürə bilər
    return `
        ${overdueHtml}
        <div class="confirm-actions" style="margin-top:5px;">
            <button class="btn-take-task" data-take-btn="${taskId}" 
                    onclick="handleTakeOverdueTask(${taskId})"
                    style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;
                           padding:5px 11px;border-radius:7px;font-size:11px;font-weight:600;
                           cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                <i class="fas fa-hand-paper"></i> Tapşırığı götür
            </button>
        </div>`;
}

/**
 * Təsdiq gözləyən task (pending_approval)
 * - Hər kəs countdown-u GÖRƏ BİLƏR
 * - Düymələr YALNIZ task sahibinə
 */
function buildPendingApprovalHTML(taskId, isAssignedToMe) {
    const delayInfo = window.TaskTimerSystem.getDelayInfo(taskId);

    setTimeout(() => {
        if (!window.TaskTimerSystem.countdowns[`confirm_${taskId}`])
            window.TaskTimerSystem.startConfirmationCountdown(taskId);
    }, 100);

    // Countdown HTML - HƏR KƏS GÖRƏ BİLƏR
    let countdownHtml = '';
    if (delayInfo.isDelayed) {
        countdownHtml = `<div data-confirm-timer="${taskId}">
            <div class="timer-delayed">
                <i class="fas fa-exclamation-triangle"></i>
                <span class="delay-time">Gecikmə: ${delayInfo.delayHours} saat</span>
            </div>
        </div>`;
    } else {
        countdownHtml = `<div data-confirm-timer="${taskId}">
            <div class="confirm-countdown normal">
                <i class="fas fa-hourglass-half"></i>
                <span class="countdown-time">02:00:00</span>
                <span class="countdown-label">İş vaxtı qaldı</span>
            </div>
        </div>`;
    }

    // Edit button - YALNIZ MƏNƏ AİD OLDUQDA
    const editButton = isAssignedToMe ? `
        <button class="btn-edit-task" data-edit-btn="${taskId}" onclick="TableManager.openEditModal(${taskId},'active')" title="Redaktə">
            <i class="fa-solid fa-pen"></i>
        </button>
    ` : '';

    // Mənə aid deyilsə - YALNIZ COUNTDOWN (düyməsiz)
    if (!isAssignedToMe) {
        return `<div class="pending-section">
            ${countdownHtml}
            <div class="confirm-actions" style="margin-top:5px;">
                <!-- Düymə yoxdur - sadəcə vaxt göstəricisi -->
            </div>
        </div>`;
    }

    // Mənə aiddirsə - COUNTDOWN + DÜYMƏLƏR
    const approveBtn = delayInfo.isDelayed ?
        `<button class="btn-approve" data-approve-btn="${taskId}" onclick="handleTaskApprove(${taskId})">
            <i class="fas fa-check"></i> Təsdiq et (Gecikmiş)
        </button>` :
        `<button class="btn-approve" data-approve-btn="${taskId}" onclick="handleTaskApprove(${taskId})">
            <i class="fas fa-check"></i> Təsdiq et
        </button>`;

    return `<div class="pending-section">
        ${countdownHtml}
        <div class="confirm-actions" style="margin-top:5px;">
            ${approveBtn}
            <button class="btn-reject-approval" data-reject-btn="${taskId}" onclick="handleTaskRejectApproval(${taskId})">
                <i class="fas fa-times"></i> İmtina
            </button>
            ${editButton}
        </div>
    </div>`;
}

/**
 * Təsdiqlənmiş gözləmə statusu (waiting)
 * - Hər kəs statusu GÖRƏ BİLƏR
 * - "Başla" düyməsi YALNIZ task sahibinə
 */
function buildWaitingHTML(taskId, isAssignedToMe) {
    const waitingHtml = `<span class="status-waiting-badge"><i class="fas fa-check-circle"></i>Gözləyir</span>`;

    // Mənə aid deyilsə - YALNIZ STATUS
    if (!isAssignedToMe) {
        return `<div class="waiting-section">
            ${waitingHtml}
            <div style="margin-top:5px;"></div>
        </div>`;
    }

    // Mənə aiddirsə - STATUS + BAŞLA DÜYMƏSİ + EDIT
    const editButton = `
        <button class="btn-edit-task" data-edit-btn="${taskId}" onclick="TableManager.openEditModal(${taskId},'active')" title="Redaktə">
            <i class="fa-solid fa-pen"></i>
        </button>
    `;

    return `<div class="waiting-section">
        ${waitingHtml}
        <div style="display:flex;gap:8px;align-items:center;margin-top:5px;">
            <button class="btn-start-work" data-start-btn="${taskId}" onclick="handleStartWork(${taskId})">
                <i class="fas fa-play"></i> Başla
            </button>
            ${editButton}
        </div>
    </div>`;
}

/**
 * İşlənən status (in_progress / paused)
 * - Hər kəs timer-ları görə bilər
 * - MÜDAXİLƏ butonları yalnız task sahibinə
 */
function buildWorkingHTML(taskId, isPaused, isAssignedToMe, workedMinutes) {
    // Timer HTML - HƏR KƏS GÖRƏ BİLƏR
    const timerHtml = `
        <div class="work-timer-display ${isPaused ? 'paused-mode' : ''}" data-work-timer-display="${taskId}">
            <i class="fas fa-${isPaused ? 'pause' : 'spinner fa-spin'}" style="font-size:11px;"></i>
            <span class="work-timer-clock" data-work-timer="${taskId}">00:00:00</span>
            <span class="timer-status-label" data-timer-status="${taskId}">${isPaused ? 'Fasilə' : 'İşlənir'}</span>
            <span data-worked-label="${taskId}" style="font-size:10px;opacity:0.75;background:rgba(255,255,255,0.15);padding:1px 6px;border-radius:10px;"></span>
        </div>
    `;

    // Timer başlat - HƏR KƏS ÜÇÜN (vaxtı görmək üçün)
    // Timer sistemini hər kəs üçün başlat, amma butonlara müdaxilə etməsin
    setTimeout(() => {
        // Timer-i başlat (yalnız göstərmək üçün)
        window.TaskTimerSystem.startWorkTimer(taskId, null, 0);

        // Əgər paused statusdadırsa, UI-da göstər
        if (isPaused) {
            const wkey = `work_${taskId}`;
            if (window.TaskTimerSystem.workTimers[wkey]) {
                window.TaskTimerSystem.workTimers[wkey].isPaused = true;
            }
        }
    }, 150);

    // Mənə aid deyilsə - YALNIZ TIMER GÖRÜNSÜN, BUTON YOX
    if (!isAssignedToMe) {
        return `<div class="working-section">
            ${timerHtml}
            <div style="display:flex;gap:8px;align-items:center;margin-top:5px;">
                <!-- Buton yoxdur - sadəcə timer -->
            </div>
        </div>`;
    }

    // Mənə aiddirsə - TIMER + BUTONLAR
    const actionButton = `
        <button class="btn-pause-toggle ${isPaused ? 'resume-mode' : ''}" data-pause-btn="${taskId}" onclick="handlePauseToggle(${taskId})">
            ${isPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>'}
        </button>
    `;

    const editButton = `
        <button class="btn-edit-task" data-edit-btn="${taskId}" onclick="TableManager.openEditModal(${taskId},'active')" title="Redaktə">
            <i class="fa-solid fa-pen"></i>
        </button>
    `;

    return `<div class="working-section">
        ${timerHtml}
        <div style="display:flex;gap:8px;align-items:center;margin-top:5px;">
            ${actionButton}
            ${editButton}
        </div>
    </div>`;
}



// ======================== YENİ FUNKSİYA: Gecikmiş taskı götürmək ========================
window.handleTakeOverdueTask = async function(taskId) {
    if (!confirm('Bu tapşırığı özünüzə götürmək istəyirsiniz? Təsdiq müddəti keçib.')) return;

    const btn = document.querySelector(`[data-take-btn="${taskId}"]`);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Götürülür...';
    }

    try {
        if (typeof makeApiRequest !== 'function') throw new Error('makeApiRequest tapılmadı');

        // Əvvəl task-ın məlumatlarını al
        const taskResp = await makeApiRequest(`/tasks/${taskId}`, 'GET', null, { silent: true });
        const task = taskResp?.data || taskResp;

        if (task.status !== 'approval_overdue') {
            throw new Error(`Bu task artıq statusu dəyişib: ${task.status}`);
        }

        // Task-ı özünə götür (təsdiq et)
        const response = await makeApiRequest(`/tasks/${taskId}/approve`, 'POST', {});

        if (!response || response.error) throw new Error(response?.error || 'Xəta baş verdi');

        // Timer-ları təmizlə
        window.TaskTimerSystem.clearConfirmation(taskId);

        // Səhifəni yenilə
        if (window.taskManager) {
            await window.taskManager.loadActiveTasks(1, true);
        } else {
            location.reload();
        }

        showTimerNotification('✅ Tapşırıq uğurla götürüldü! İndi işə başlaya bilərsiniz.', '#10b981');

    } catch (error) {
        showTimerNotification('❌ ' + (error.message || 'Xəta baş verdi'), '#ef4444');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-hand-paper"></i> Tapşırığı götür';
        }
    }
};

function showTimerNotification(msg, color) {
    document.querySelectorAll('.timer-notification').forEach(n => n.remove());
    const n = document.createElement('div');
    n.className = 'timer-notification';
    n.style.background = color || '#3b82f6';
    n.innerHTML = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
}

/**
 * Bitmiş/İmtina edilmiş task (completed/rejected)
 * - Hər kəs statusu GÖRƏ BİLƏR
 * - Edit düyməsi YALNIZ task sahibinə
 */
function buildCompletedRejectedHTML(taskId, status, isAssignedToMe) {
    const statusText = status === 'completed' ? 'Tamamlandı' : 'İmtina edildi';
    const statusIcon = status === 'completed' ? 'fa-check-circle' : 'fa-ban';
    const statusColor = status === 'completed' ? '#10b981' : '#ef4444';

    const statusHtml = `<span class="status-badge" style="background:${statusColor}20;color:${statusColor};">
        <i class="fas ${statusIcon}"></i> ${statusText}
    </span>`;

    // Mənə aid deyilsə - YALNIZ STATUS
    if (!isAssignedToMe) {
        return `<div>${statusHtml}</div>`;
    }

    // Mənə aiddirsə - STATUS + EDIT
    const editButton = `
        <button class="btn-edit-task" data-edit-btn="${taskId}" onclick="TableManager.openEditModal(${taskId},'active')" title="Redaktə">
            <i class="fa-solid fa-pen"></i> Redaktə
        </button>
    `;

    return `<div>
        ${statusHtml}
        <div style="margin-top:5px;">${editButton}</div>
    </div>`;
}


// ======================== ANA MODUL ========================
const ActiveRowCreator = {

    /**
     * ŞİRKƏT ADI ALMA - İKİ MƏRHƏLƏLİ:
     *
     * 1. _syncCompanyName: Dərhal (sinxron) - cərgə render olunarkən istifadə edilir
     *    Prioritet: viewable_company_name → metadata → cache → company_name → "ID: X"
     *
     * 2. _resolveCompanyName: Asinxron - "ID: X" göstərilirsə arxa planda API çağırır,
     *    cavab gəldikdə cərgənin company-name-cell-ini yeniləyir.
     *
     * BUG: Köhnə versiyada companyCache boşdursa dərhal "Şirkət ID: X" yazılır,
     * heç vaxt yenilənmirdi. İndi asinxron yükləmə ilə həll olunur.
     */
    _syncCompanyName: function(task) {
        if (task.viewable_company_name?.trim()) return task.viewable_company_name;
        if (task.metadata) {
            try {
                const m = typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata;
                const n = m.target_company_name || m.partner_company_name ||
                    m.original_company_name || m.viewable_company_name || m.display_for;
                if (n?.trim()) return n;
            } catch(e) {}
        }
        const cache = window.taskManager?.companyCache || {};
        if (task.viewable_company_id && cache[task.viewable_company_id]) {
            const c = cache[task.viewable_company_id];
            return typeof c === 'string' ? c : (c.company_name || c.name || '');
        }
        if (task.company_name?.trim()) return task.company_name;
        if (task.company_id && cache[task.company_id]) {
            const c = cache[task.company_id];
            return typeof c === 'string' ? c : (c.company_name || c.name || '');
        }
        const id = task.viewable_company_id || task.company_id;
        return id ? `Şirkət ID: ${id}` : 'Şirkət məlumatı yoxdur';
    },

    _resolveCompanyName: async function(task) {
        // Sinxron yoxlama (artıq bilirsə dərhal qaytar)
        const sync = this._syncCompanyName(task);
        if (!sync.startsWith('Şirkət ID:') && sync !== 'Şirkət məlumatı yoxdur') return sync;

        // API-dən yüklə
        const lookupId = task.viewable_company_id || task.company_id;
        if (!lookupId || typeof makeApiRequest !== 'function') return sync;

        try {
            const res = await makeApiRequest(`/companies/${lookupId}`, 'GET', null, { silent: true });
            const data = res?.data || res;
            const name = data?.company_name || data?.name || '';
            if (name) {
                // Cache-ə yaz - növbəti dəfə sinxron işləyəcək
                if (!window.taskManager) window.taskManager = {};
                if (!window.taskManager.companyCache) window.taskManager.companyCache = {};
                window.taskManager.companyCache[lookupId] = name;
                return name;
            }
        } catch(e) {}

        return sync;
    },

    createActiveRowHTML: function(task, index, currentPage) {
        const serialNumber = (currentPage - 1) * 20 + index + 1;
        const durationMinutes = task.duration_minutes || (task.estimated_hours ? task.estimated_hours * 60 : 0) || 0;
        const creatorName = task.creator_name || task.created_by_name || `ID: ${task.created_by}`;
        const executorName = task.assigned_to_name || task.executor_name ||
            (task.assigned_to ? `İşçi ID: ${task.assigned_to}` : 'Təyin edilməyib');
        const departmentName = task.department_name || '-';
        const workTypeName = task.work_type_name || '-';
        const description = task.task_description || task.description || '';

        // Şirkət adı: sinxron götür, "ID: X" isə asinxron yüklə
        let displayCompanyName = this._syncCompanyName(task);
        if (displayCompanyName.startsWith('Şirkət ID:') || displayCompanyName === 'Şirkət məlumatı yoxdur') {
            this._resolveCompanyName(task).then(name => {
                const cell = document.querySelector(`tr[data-task-id="${task.id}"] .company-name-cell`);
                if (cell) cell.textContent = name;
            });
        }

        const now = new Date();
        const dueDate = task.due_date ? new Date(task.due_date) : null;
        let isOverdue = false, isYesterday = false, daysOverdue = 0;
        if (dueDate) {
            const d0 = new Date(dueDate); d0.setHours(0,0,0,0);
            const n0 = new Date(now); n0.setHours(0,0,0,0);
            daysOverdue = Math.floor((n0 - d0) / 86400000);
            isOverdue = d0 < n0;
            isYesterday = daysOverdue === 1;
        }

        const currentUserId = window.taskManager?.userData?.userId;
        // 🔥 ƏSAS DƏYİŞİKLİK: task.assigned_to ilə currentUserId müqayisəsi
        const isAssignedToMe = task.assigned_to == currentUserId;


        let initialCommentCount = task.comment_count || 0;

        const commentsBtn = `
            <button class="btn btn-sm btn-outline-info" 
                    data-comment-btn="${task.id}"
                    onclick="TableManager.viewTaskComments(${task.id})"
                    style="position:relative; border-radius:20px; padding:4px 10px; display:inline-flex; align-items:center; gap:5px;">
                <i class="fa-solid fa-comments" style="font-size:13px;"></i>
                <span class="comment-count comment-count-badge" 
                      data-task-id="${task.id}"
                      style="display:inline-flex; align-items:center; justify-content:center;
                             min-width:20px; height:20px; padding:0 5px; border-radius:10px;
                             background: #f1f5f9;
                             color: #94a3b8;
                             font-size:11px; font-weight:700;
                             transition: background 0.3s, color 0.3s;">0</span>
            </button>
        `;

        const detailsBtn  = `<button class="btn btn-sm btn-secondary" onclick="TableManager.viewTaskDetails(${task.id})" title="Detallar"><i class="fa-solid fa-eye"></i></button>`;

        let statusBadgeHTML = '', statusButtonHTML = '';


        if (task.status === 'approval_overdue') {
            let delayHours = '?';
            if (task.approval_expires_at) {
                const expiredAt = new Date(task.approval_expires_at);
                const now = new Date();
                delayHours = ((now - expiredAt) / 3600000).toFixed(1);
            }
            statusBadgeHTML = buildApprovalOverdueHTML(task.id, delayHours, isAssignedToMe);

        } else if (task.status === 'pending_approval') {
            statusBadgeHTML = buildPendingApprovalHTML(task.id, isAssignedToMe);

        } else if (task.status === 'waiting') {
            statusBadgeHTML = buildWaitingHTML(task.id, isAssignedToMe);

        } else if (task.status === 'in_progress') {
            statusBadgeHTML = buildWorkingHTML(task.id, false, isAssignedToMe, task.worked_minutes ?? null);
            if (isAssignedToMe) {
                setTimeout(() => window.TaskTimerSystem.startWorkTimer(task.id, task.started_at || task.started_date, task.total_paused_seconds || 0), 150);
            }

        } else if (task.status === 'paused') {
            statusBadgeHTML = buildWorkingHTML(task.id, true, isAssignedToMe, task.worked_minutes ?? null);
            if (isAssignedToMe) {
                setTimeout(() => {
                    window.TaskTimerSystem.startWorkTimer(task.id, task.started_at || task.started_date, task.total_paused_seconds || 0);
                    const wkey = `work_${task.id}`;
                    if (window.TaskTimerSystem.workTimers[wkey]) window.TaskTimerSystem.workTimers[wkey].isPaused = true;
                }, 150);
            }

        } else if (task.status === 'completed') {
            statusBadgeHTML = buildCompletedRejectedHTML(task.id, 'completed', isAssignedToMe);

        } else if (task.status === 'rejected') {
            statusBadgeHTML = buildCompletedRejectedHTML(task.id, 'rejected', isAssignedToMe);

        } else if (task.status === 'pending' || task.status === 'overdue') {
            // Köhnə statuslar üçün fallback
            if (isOverdue) {
                statusBadgeHTML = `<span class="status-badge status-pending"><i class="fa-solid fa-clock"></i> GECİKMƏ</span>`;
                if (isAssignedToMe) {
                    statusButtonHTML = `<button class="btn btn-sm btn-warning" onclick="TableManager.startTaskWithNotification(${task.id})"><i class="fa-solid fa-hand-paper"></i></button>`;
                }
            } else {
                statusBadgeHTML = `<span class="status-badge status-pending"><i class="fa-solid fa-clock"></i> Gözləyir</span>`;
                if (isAssignedToMe) {
                    statusButtonHTML = `<button class="btn btn-sm btn-success" onclick="TableManager.startTaskWithNotification(${task.id}")><i class="fa-solid fa-play"></i></button>`;
                } else {
                    statusButtonHTML = `<button class="btn btn-sm btn-info" onclick="TableManager.takeTaskFromOthers(${task.id})"><i class="fa-solid fa-user-plus"></i> Özünə götür</button>`;
                }
            }
        }

        let dueDateClass = '', dueDateIcon = '', dueDateTitle = '';
        if (dueDate && isOverdue) {
            dueDateClass = 'text-danger fw-bold blinking-text';
            dueDateIcon = '<i class="fa-solid fa-exclamation-triangle ms-1 blinking-icon"></i>';
            dueDateTitle = isYesterday ? '⚠️ Dünən deadline keçib!' : `⚠️ ${daysOverdue} gün əvvəl deadline keçib!`;
        } else if (dueDate && daysOverdue === 0) {
            dueDateClass = 'text-success fw-bold';
            dueDateTitle = '✅ Deadline bugün';
        }

        // ===== FAYL HİSSƏSİ - YENİ VERSİYA (Debug ilə) =====
        let fileColumnHTML = '<span class="text-muted" style="color:#94a3b8;">-</span>';
        let attachments = [];

        // 🔥 DEBUG: Task məlumatlarını yoxla
        console.log(`🔍 TASK ${task.id} FAYL MƏLUMATLARI:`, {
            file_uuids: task.file_uuids,
            file_uuids_type: typeof task.file_uuids,
            attachments: task.attachments,
            has_file_uuids: !!task.file_uuids,
            status: task.status
        });

        // 1. Əvvəlcə file_uuids-i yoxla (backend-dən gələn əsas sahə)
        if (task.file_uuids) {
            let uuids = [];

            // PostgreSQL array formatını parse et: "{uuid1,uuid2}"
            if (typeof task.file_uuids === 'string') {
                let cleanStr = task.file_uuids
                    .replace(/^\{/, '')
                    .replace(/\}$/, '')
                    .trim();
                if (cleanStr) {
                    uuids = cleanStr.split(',').map(u =>
                        u.trim().replace(/^"(.*)"$/, '$1')
                    ).filter(u => u.length === 36 && u.includes('-'));
                }
            } else if (Array.isArray(task.file_uuids)) {
                uuids = task.file_uuids;
            }

            console.log(`📎 Task ${task.id}: ${uuids.length} UUID tapıldı:`, uuids);

            if (uuids.length > 0) {
                attachments = uuids.map(uuid => ({
                    file_id: uuid,
                    uuid: uuid,
                    id: uuid,
                    filename: `fayl_${uuid.substring(0, 8)}`,
                    original_filename: `Fayl ${uuid.substring(0, 8)}`,
                    mime_type: '',
                    is_audio_recording: true  // Audio olduğunu bildir
                }));
            }
        }

        // 2. Əgər file_uuids boşdursa, attachments-i yoxla
        if (attachments.length === 0 && task.attachments) {
            try {
                attachments = Array.isArray(task.attachments)
                    ? task.attachments
                    : JSON.parse(task.attachments);
                console.log(`📎 Task ${task.id}: ${attachments.length} fayl attachments-dən tapıldı`);
            } catch(e) {
                console.warn(`Attachments parse xətası (task ${task.id}):`, e);
            }
        }

        // 3. Fayl göstəricisini yarat
        if (attachments.length > 0) {
            console.log(`✅ Task ${task.id}: ${attachments.length} fayl göstəriləcək`);

            const getIcon = f => {
                const mt = f.mime_type || '';
                const fn = (f.filename || f.original_filename || '').toLowerCase();
                if (f.is_audio_recording || mt.startsWith('audio/') || fn.includes('recording') || fn.includes('webm') || fn.includes('səs'))
                    return '<i class="fas fa-microphone" style="color:#3b82f6;"></i>';
                if (mt.startsWith('image/') || fn.match(/\.(jpg|jpeg|png|gif|webp)$/))
                    return '<i class="fas fa-image" style="color:#3b82f6;"></i>';
                if (mt.includes('pdf') || fn.endsWith('.pdf'))
                    return '<i class="fas fa-file-pdf" style="color:#ef4444;"></i>';
                if (mt.includes('excel') || fn.endsWith('.xlsx') || fn.endsWith('.xls'))
                    return '<i class="fas fa-file-excel" style="color:#10b981;"></i>';
                if (mt.includes('word') || fn.endsWith('.docx'))
                    return '<i class="fas fa-file-word" style="color:#3b82f6;"></i>';
                return '<i class="fas fa-file" style="color:#64748b;"></i>';
            };

            if (attachments.length === 1) {
                const f = attachments[0];
                const fid = f.file_id || f.uuid || f.id;
                const fn = f.original_filename || f.filename || 'Fayl';
                const sn = fn.length > 15 ? fn.substring(0, 12) + '...' : fn;

                if (fid) {
                    fileColumnHTML = `<div style="display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:4px;background:#eef2ff;border:1px solid #cbd5e1;cursor:pointer;"
                        onclick="TableManager.previewFile('${fid}','${fn}','${f.mime_type||''}',${f.is_audio_recording||false})" title="${fn}">
                        ${getIcon(f)}<span style="font-size:12px;color:#1e293b;">${this.escapeHtml(sn)}</span>
                    </div>`;
                }
            } else {
                fileColumnHTML = `<div style="display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:4px;background:#f1f5f9;border:1px solid #cbd5e1;cursor:pointer;"
                    onclick="TableManager.showTaskFiles(${task.id})">
                    <i class="fas fa-paperclip" style="color:#475569;"></i>
                    <span style="font-size:12px;font-weight:600;color:#334155;">${attachments.length} fayl</span>
                    <i class="fas fa-chevron-down" style="font-size:10px;color:#94a3b8;"></i>
                </div>`;
            }
        } else {
            console.log(`ℹ️ Task ${task.id}: heç bir fayl tapılmadı`);
        }

        setTimeout(() => {
            if (window.CommentTracker) {
                window.CommentTracker.initForTasks([task.id]);
            }
        }, 300);


        return `<tr data-task-id="${task.id}" style="transition:all 0.2s;">
            <td style="text-align:center;font-weight:500;color:#64748b;">${serialNumber}</td>
            <td style="color:#334155;">${this.formatDateTime(task.created_at)}</td>
            <td class="company-name-cell" style="font-weight:500;color:#0f172a;">${this.escapeHtml(displayCompanyName)}</td>
            <td style="color:#475569;">${this.escapeHtml(creatorName)}</td>
            <td style="color:#475569;">${this.escapeHtml(executorName)}</td>
            <td><div class="status-section" style="display:flex;flex-direction:column;gap:5px;">
                ${statusBadgeHTML}
                <div style="display:flex;gap:3px;flex-wrap:wrap;">${statusButtonHTML}</div>
            </div></td>
            <td style="color:#334155;">${this.escapeHtml(workTypeName)}</td>
            <td class="description-col" style="max-width:200px; cursor:help;">
                <div style="position:relative;">
                    <div id="desc-${task.id}" style="display:block; color:#475569; font-size:13px;">${this.truncateText(description, 50)}</div>
                    <div id="full-desc-${task.id}" style="display:none;">${this.escapeHtml(description)}</div>
                </div>
            </td>
            <td class="file-col" style="min-width:100px;">${fileColumnHTML}</td>
            <td class="${dueDateClass}" title="${dueDateTitle}">${this.formatDate(task.due_date || task.due_at)}${dueDateIcon}</td>
            <td style="text-align:center;"><div style="display:flex;gap:5px;justify-content:center;">${commentsBtn}${detailsBtn}</div></td>
            <td style="color:#64748b;">${this.formatDate(task.completed_date || task.completed_at)}</td>
            <td style="color:#334155;font-weight:500;">${durationMinutes}</td>
            <td style="color:#475569;">${this.escapeHtml(departmentName)}</td>
        </tr>`;
    },

    formatDate: function(d) {
        if (!d) return '-';
        try { return new Date(d).toLocaleDateString('az-AZ'); } catch(e) { return d; }
    },

    formatDateTime: function(d) {
        if (!d) return '-';
        try {
            const dt = new Date(d);
            const date = dt.toLocaleDateString('az-AZ');
            const time = dt.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
            return `<div style="display:flex;flex-direction:column;gap:2px;">
                <span>${date}</span>
                <span style="color:#106bef;font-size:15px;">${time}</span>
            </div>`;
        } catch(e) { return d; }
    },
    escapeHtml: function(t) {
        if (!t) return '';
        const div = document.createElement('div');
        div.textContent = t;
        return div.innerHTML;
    },

    truncateText: function(t, l) {
        if (!t) return '';
        if (t.length <= l) return this.escapeHtml(t);
        return this.escapeHtml(t.substring(0, l)) + '...';
    },

    calculateSalary: function(r, d) {
        if (!r || !d) return '0.00';
        return ((d / 60) * parseFloat(r)).toFixed(2);
    }
};

// ======================== TABLEMANAGER EXTENSIONS ========================
if (typeof TableManager !== 'undefined') {
    const origStart = TableManager.startTask;
    const origComplete = TableManager.completeTask;
    TableManager.startTaskWithNotification = async function(taskId, taskTitle) {
        try {
            if (origStart) await origStart.call(this, taskId);
            else await this.apiRequest?.(`/tasks/${taskId}/status`, 'PUT', { status: 'in_progress' });
            if (typeof notificationService !== 'undefined') notificationService.showSuccess?.(`"${taskTitle}" tapşırığına başlanıldı`);
        } catch(e) { if (origStart) await origStart.call(this, taskId); }
    };
    TableManager.completeTaskWithNotification = async function(taskId, taskTitle) {
        try {
            window.TaskTimerSystem.clearWorkTimer(taskId);
            if (origComplete) await origComplete.call(this, taskId);
            else await this.apiRequest?.(`/tasks/${taskId}/status`, 'PUT', { status: 'completed' });
            if (typeof notificationService !== 'undefined') notificationService.showSuccess?.(`"${taskTitle}" tapşırığı tamamlandı`);
            if (typeof SoundManager !== 'undefined') SoundManager.playTaskCompleted?.();
            setTimeout(() => { window.taskManager?.loadActiveTasks?.(1, true); window.taskManager?.loadArchiveTasks?.(); }, 500);
        } catch(e) { if (origComplete) await origComplete.call(this, taskId); }
    };
}

// ======================== GLOBAL EXPORT ========================
if (typeof window !== 'undefined') {
    window.ActiveRowCreator = ActiveRowCreator;
    window.WorkHours = WorkHours;
    console.log('✅ ActiveRowCreator yükləndi');
    console.log('   ⏰ Countdown: yalnız 09:00-18:00 arası sayır, gecə "İş saatı bitti" göstərir');
    console.log('   ✅ Təsdiq düyməsi: istənilən vaxt işləyir');
    console.log('   🏢 Şirkət adı: sinxron + asinxron (API fallback ilə)');
    console.log('   🔐 Mənə aid olmayan tasklar üçün düymələr disabled olur');
}

// ======================== AÇIQLAMA HOVER POPUP (SADƏ VƏ YIĞCAM) ========================

if (!document.getElementById('desc-hover-style')) {
    const style = document.createElement('style');
    style.id = 'desc-hover-style';
    style.textContent = `
        .desc-tooltip {
            position: fixed;
            z-index: 99999;
            background: #0f172a;
            color: #f1f5f9;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            line-height: 1.4;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 1px solid #334155;
            pointer-events: none;
            font-family: system-ui;
        }
    `;
    document.head.appendChild(style);
}

let activeTip = null;
let tipTimer = null;

function showTip(el, text) {
    if (activeTip) activeTip.remove();
    if (!text || text.length < 10) return;

    const rect = el.getBoundingClientRect();
    const tip = document.createElement('div');
    tip.className = 'desc-tooltip';
    tip.innerHTML = text.length > 200 ? text.slice(0, 197) + '...' : text;
    document.body.appendChild(tip);

    let top = rect.bottom + 6;
    let left = rect.left;

    if (top + tip.offsetHeight > window.innerHeight - 10) {
        top = rect.top - tip.offsetHeight - 6;
    }
    if (left + tip.offsetWidth > window.innerWidth - 10) {
        left = window.innerWidth - tip.offsetWidth - 10;
    }
    if (left < 5) left = 5;

    tip.style.top = Math.max(5, top) + 'px';
    tip.style.left = left + 'px';
    activeTip = tip;
}

function hideTip() {
    if (activeTip) { activeTip.remove(); activeTip = null; }
}

function initHover() {
    document.querySelectorAll('.description-col').forEach(cell => {
        if (cell._hoverDone) return;
        cell._hoverDone = true;

        const taskId = cell.closest('tr')?.dataset.taskId;
        if (!taskId) return;

        const full = document.getElementById(`full-desc-${taskId}`);
        if (!full) return;

        const text = (full.textContent || full.innerText || '').trim();
        if (!text || text.length < 10) return;

        let t;
        cell.onmouseenter = () => { clearTimeout(t); t = setTimeout(() => showTip(cell, text), 300); };
        cell.onmouseleave = () => { clearTimeout(t); hideTip(); };
        cell.style.cursor = 'help';
    });
}

setTimeout(initHover, 200);
setInterval(initHover, 2000);