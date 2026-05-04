/* ============================================================
   USER REPORT MODAL - ENHANCED JS
   GF44 Task Management System
   - KPI cards clickable → Task List Modal
   - Status items clickable → Task List Modal
   - Task rows clickable → Task Detail Modal
   - Header: real avatar, detailed user info, completion score
   ============================================================ */

class UserReportModal {
    constructor() {
        this.currentUserId = null;
        this.currentUserData = null;
        this.allUsersData = [];
        this.dateRange = {
            start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            end: new Date()
        };
        this.backdropEl = null;
        this.modalEl = null;
        this._taskListModal = null;
        this._taskDetailModal = null;
        this._init();
    }

    /* ── Init ─────────────────────────────────────────────── */
    _init() {
        this._injectCSS();
        this._createMainModal();
        this._createTaskListModal();
        this._createTaskDetailModal();
        this._bindGlobalEvents();
    }

    _injectCSS() {
        // CSS ayrıca fayla link ediləcək — burda yalnız dinamik hissələr
        if (document.getElementById('urm-enhanced-css-check')) return;
        const el = document.createElement('meta');
        el.id = 'urm-enhanced-css-check';
        document.head.appendChild(el);
    }

    /* ── DOM: Main Modal ──────────────────────────────────── */
    _createMainModal() {
        const html = `
    <div class="user-report-backdrop" id="userReportBackdrop">
      <div class="user-report-modal" id="userReportModal">

        <!-- HEADER -->
        <div class="urm-header" id="urmHeader">
          <div class="urm-header-avatar-wrap">
            <div class="urm-header-avatar" id="urmAvatar">?</div>
            <div class="urm-avatar-status" id="urmAvatarStatus"></div>
          </div>
          <div class="urm-header-info">
            <div class="urm-header-name" id="urmUserName">İstifadəçi</div>
            <div class="urm-header-meta" id="urmUserMeta">
              <span><i class="fas fa-sitemap"></i> <span id="urmDept">-</span></span>
              <span><i class="fas fa-briefcase"></i> <span id="urmPosition">-</span></span>
              <span><i class="fas fa-building"></i> <span id="urmCompany">-</span></span>
              <span><i class="fas fa-envelope"></i> <span id="urmEmail">-</span></span>
              <span><i class="fas fa-phone"></i> <span id="urmPhone">-</span></span>
            </div>
          </div>
          <div class="urm-header-score" id="urmHeaderScore">
            <div class="urm-header-score-val" id="urmScoreVal">—%</div>
            <div class="urm-header-score-label">Tamamlama</div>
          </div>
          <div class="urm-header-actions">
            <button class="urm-export-btn excel" id="urmExcelBtn" title="Excel ixrac">
              <i class="fas fa-file-excel"></i> <span>Excel</span>
            </button>
            <button class="urm-export-btn pdf" id="urmPdfBtn" title="PDF ixrac">
              <i class="fas fa-file-pdf"></i> <span>PDF</span>
            </button>
            <button class="urm-close-btn" id="urmCloseBtn"><i class="fas fa-times"></i></button>
          </div>
        </div>

        <!-- DATE BAR -->
        <div class="urm-date-bar">
          <label><i class="fas fa-calendar-alt"></i> Tarix aralığı:</label>
          <input type="date" id="urmStartDate" />
          <span>—</span>
          <input type="date" id="urmEndDate" />
          <button class="urm-apply-date-btn" id="urmApplyDate">
            <i class="fas fa-check"></i> Tətbiq et
          </button>
        </div>

        <!-- BODY -->
        <div class="urm-body" id="urmBody">
          <div class="urm-loading" id="urmLoading">
            <div class="urm-loading-spinner"></div>
            <span>Məlumatlar yüklənir...</span>
          </div>
          <div id="urmContent" style="display:none;"></div>
        </div>

      </div>
    </div>`;

        document.body.insertAdjacentHTML('beforeend', html);
        this.backdropEl = document.getElementById('userReportBackdrop');
        this.modalEl = document.getElementById('userReportModal');
    }

    /* ── DOM: Task List Modal ─────────────────────────────── */
    _createTaskListModal() {
        const html = `
    <div class="urm-tasklist-backdrop" id="urmTaskListBackdrop">
      <div class="urm-tasklist-modal">
        <div class="urm-tasklist-header">
          <div class="urm-tasklist-title">
            <i class="fas fa-list" id="urmTLIcon"></i>
            <span id="urmTLTitle">Tasklar</span>
            <span class="urm-badge" id="urmTLBadge">-</span>
            <span class="urm-tasklist-count" id="urmTLCount">0 task</span>
          </div>
          <button class="urm-close-btn" id="urmTLClose"><i class="fas fa-times"></i></button>
        </div>
        <div class="urm-tasklist-body" id="urmTLBody"></div>
      </div>
    </div>`;

        document.body.insertAdjacentHTML('beforeend', html);
        this._taskListModal = document.getElementById('urmTaskListBackdrop');

        document.getElementById('urmTLClose').addEventListener('click', () => this._closeTaskList());
        this._taskListModal.addEventListener('click', e => {
            if (e.target === this._taskListModal) this._closeTaskList();
        });
    }

    /* ── DOM: Task Detail Modal ───────────────────────────── */
    _createTaskDetailModal() {
        const html = `
    <div class="urm-taskdetail-backdrop" id="urmTaskDetailBackdrop">
      <div class="urm-taskdetail-modal">
        <div class="urm-taskdetail-header">
          <div class="urm-taskdetail-htop">
            <div class="urm-taskdetail-title" id="urmTDTitle">Task detalları</div>
            <button class="urm-taskdetail-close" id="urmTDClose"><i class="fas fa-times"></i></button>
          </div>
          <div class="urm-taskdetail-badges" id="urmTDBadges"></div>
        </div>
        <div class="urm-taskdetail-body" id="urmTDBody"></div>
      </div>
    </div>`;

        document.body.insertAdjacentHTML('beforeend', html);
        this._taskDetailModal = document.getElementById('urmTaskDetailBackdrop');

        document.getElementById('urmTDClose').addEventListener('click', () => this._closeTaskDetail());
        this._taskDetailModal.addEventListener('click', e => {
            if (e.target === this._taskDetailModal) this._closeTaskDetail();
        });
    }

    /* ── Global Events ────────────────────────────────────── */
    _bindGlobalEvents() {
        document.getElementById('urmCloseBtn').addEventListener('click', () => this.close());
        this.backdropEl.addEventListener('click', e => {
            if (e.target === this.backdropEl) this.close();
        });

        document.getElementById('urmApplyDate').addEventListener('click', () => {
            const s = document.getElementById('urmStartDate').value;
            const e = document.getElementById('urmEndDate').value;
            if (s) this.dateRange.start = new Date(s);
            if (e) this.dateRange.end = new Date(e);
            if (this.currentUserId) this._loadAndRender(this.currentUserId);
        });

        document.getElementById('urmExcelBtn').addEventListener('click', () => {
            if (this.currentUserData && typeof UserReportExporter !== 'undefined')
                UserReportExporter.toExcel(this.currentUserData, this.allUsersData);
        });
        document.getElementById('urmPdfBtn').addEventListener('click', () => {
            if (this.currentUserData && typeof UserReportExporter !== 'undefined')
                UserReportExporter.toPDF(this.currentUserData, this.allUsersData);
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                if (this._taskDetailModal?.classList.contains('active')) {
                    this._closeTaskDetail();
                    return;
                }
                if (this._taskListModal?.classList.contains('active')) {
                    this._closeTaskList();
                    return;
                }
                this.close();
            }
        });
    }

    /* ── Public: Open / Close ─────────────────────────────── */
    open(userId) {
        this.currentUserId = userId;
        this.backdropEl.classList.add('active');
        document.body.style.overflow = 'hidden';
        this._setDefaultDates();
        this._loadAndRender(userId);
    }

    close() {
        this.backdropEl.classList.remove('active');
        document.body.style.overflow = '';
    }

    _setDefaultDates() {
        document.getElementById('urmStartDate').value = this._fmtDate(this.dateRange.start, 'YYYY-MM-DD');
        document.getElementById('urmEndDate').value = this._fmtDate(this.dateRange.end, 'YYYY-MM-DD');
    }


    /* ── API ──────────────────────────────────────────────── */
    async _loadAndRender(userId) {
          this._showLoading();
          try {
            const s = this._fmtDate(this.dateRange.start, 'YYYY-MM-DD');
            const e = this._fmtDate(this.dateRange.end, 'YYYY-MM-DD');

            const [empReport, fullReport] = await Promise.all([
              this._apiGet(`/reports/employee/${userId}?start_date=${s}&end_date=${e}`),
              this._apiGet(`/reports/full?start_date=${s}&end_date=${e}`)
            ]);

            // 🔥 DEBUG - Cavabları yoxla
            console.log('📊 EMPLOYEE REPORT:', empReport);
            console.log('📊 FULL REPORT:', fullReport);

            // 🔥 DÜZƏLİŞ: success flag-ini yoxla, əgər yoxdursa birbaşa data-nı istifadə et
            const employeeData = empReport?.success ? empReport.data : (empReport?.data || empReport);
            const fullData = fullReport?.success ? fullReport.data : (fullReport?.data || fullReport);

            console.log('📊 employeeData keys:', Object.keys(employeeData || {}));
            console.log('📊 fullData keys:', Object.keys(fullData || {}));

            const employee = employeeData?.employee || {};
            const userTasks = employeeData?.tasks || [];
            const performance = employeeData?.performance || {};
            const allEmployees = fullData?.employees || [];
            const allTasks = fullData?.detailed_tasks || [];

            console.log('📊 userTasks sayı:', userTasks.length);
            console.log('📊 allTasks sayı:', allTasks.length);
            console.log('📊 allEmployees sayı:', allEmployees.length);

            const d = this._buildUserData(employee, userTasks, performance, allEmployees, allTasks);
            this.currentUserData = d;
            this.allUsersData = allEmployees;

            this._updateHeader(employee, d);
            this._renderContent(d);
            this._hideLoading();
          } catch(err) {
            console.error('UserReportModal:', err);
            this._showError('Məlumatlar yüklənərkən xəta baş verdi.');
          }
    }

    async _apiGet(endpoint) {
        if (typeof makeApiRequest !== 'undefined') {
            return await makeApiRequest(endpoint, 'GET', null, true) || {};
        }
        const r = await fetch(endpoint);
        return r.json();
    }

    /* ── Build Data ───────────────────────────────────────── */
    _buildUserData(employee, tasks, performance, allEmployees, allTasks) {
        const now = new Date();
        const filter = (st) => tasks.filter(t => t.status === st);

        const completed = filter('completed');
        const pending = filter('pending');
        const inProgress = filter('in_progress');
        const overdue = tasks.filter(t =>
            t.status === 'overdue' ||
            (t.due_date && new Date(t.due_date) < now && t.status !== 'completed')
        );
        const rejected = filter('rejected');
        const waitingApproval = tasks.filter(t =>
            ['waiting_approval', 'pending_approval', 'waiting', 'approval_overdue'].includes(t.status)
        );

        const total = tasks.length;

        // avg completion days
        let avgCompDays = 0;
        if (completed.length) {
            const sum = completed.reduce((a, t) => {
                const d = t.completed_date && t.created_at
                    ? (new Date(t.completed_date) - new Date(t.created_at)) / 86400000
                    : 0;
                return a + Math.max(0, d);
            }, 0);
            avgCompDays = Math.round(sum / completed.length);
        }

        // on-time rate
        const ontimeCount = completed.filter(t =>
            t.due_date && new Date(t.completed_date) <= new Date(t.due_date)
        ).length;
        const ontimeRate = completed.length ? Math.round((ontimeCount / completed.length) * 100) : 0;

        // created by user
        const createdByUser = allTasks.filter(t =>
            t.created_by === employee.id || t.assigned_by === employee.id
        );

        // companies
        const companyMap = {};
        tasks.forEach(t => {
            const k = t.company_name || String(t.company_id || '-');
            companyMap[k] = (companyMap[k] || 0) + 1;
        });
        const companies = Object.entries(companyMap)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({name, count}));

        // peers
        const peersData = allEmployees.map(emp => {
            const empTasks = allTasks.filter(t => t.assigned_to === emp.id);
            const empComp = empTasks.filter(t => t.status === 'completed').length;
            const rate = empTasks.length ? Math.round((empComp / empTasks.length) * 100) : 0;
            const name = emp.name && emp.surname ? `${emp.name} ${emp.surname}`
                : (emp.ceo_name || emp.ceo_email || '-');
            return {
                id: emp.id, name, department: emp.department_name || '-',
                total: empTasks.length, completed: empComp, rate, isCurrent: emp.id === employee.id
            };
        }).sort((a, b) => b.completed - a.completed);

        const currentRank = peersData.findIndex(p => p.isCurrent) + 1;

        // monthly map
        const monthlyMap = {};
        tasks.forEach(t => {
            if (!t.created_at) return;
            const d = new Date(t.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyMap[key]) monthlyMap[key] = {total: 0, completed: 0};
            monthlyMap[key].total++;
            if (t.status === 'completed') monthlyMap[key].completed++;
        });

        // grouped tasks map for quick filter
        const tasksByStatus = {
            all: tasks,
            completed,
            pending,
            in_progress: inProgress,
            overdue,
            rejected,
            waiting: waitingApproval,
            created: createdByUser
        };

        return {
            employee, tasks, tasksByStatus,
            total,
            completed: completed.length,
            pending: pending.length,
            inProgress: inProgress.length,
            overdue: overdue.length,
            rejected: rejected.length,
            waitingApproval: waitingApproval.length,
            createdByUser,
            avgCompDays, ontimeRate,
            completionRate: total ? Math.round((completed.length / total) * 100) : 0,
            companies, peersData, currentRank, totalPeers: peersData.length,
            performance, monthlyMap
        };
    }

    /* ── Update Header ────────────────────────────────────── */
    _updateHeader(emp, d) {
        const fullName = emp.name && emp.surname
            ? `${emp.name} ${emp.surname}`
            : (emp.ceo_name || 'İstifadəçi');
        const initial = (fullName[0] || '?').toUpperCase();

        // Avatar — foto varsa göstər
        const avatarEl = document.getElementById('urmAvatar');
        const photoUrl = emp.photo_url || emp.avatar || emp.profile_image || null;
        if (photoUrl) {
            avatarEl.innerHTML = `<img src="${photoUrl}" alt="${fullName}" onerror="this.parentElement.textContent='${initial}'">`;
        } else {
            avatarEl.textContent = initial;
        }

        document.getElementById('urmUserName').textContent = fullName;
        document.getElementById('urmDept').textContent = emp.department_name || '-';
        document.getElementById('urmPosition').textContent = emp.position || emp.user_type || '-';
        document.getElementById('urmCompany').textContent = emp.company_name || emp.company_code || '-';
        document.getElementById('urmEmail').textContent = emp.ceo_email || emp.email || '-';
        document.getElementById('urmPhone').textContent = emp.phone || emp.ceo_phone || '-';
        document.getElementById('urmScoreVal').textContent = d.completionRate + '%';

        // Score color
        const scoreEl = document.getElementById('urmHeaderScore');
        const val = d.completionRate;
        scoreEl.style.borderColor = val >= 70 ? 'rgba(16,185,129,0.35)'
            : val >= 40 ? 'rgba(245,158,11,0.35)'
                : 'rgba(239,68,68,0.35)';
        document.getElementById('urmScoreVal').style.color = val >= 70 ? 'var(--urm-green)'
            : val >= 40 ? 'var(--urm-amber)'
                : 'var(--urm-red)';
    }

    /* ── Render Content ───────────────────────────────────── */
    _renderContent(d) {
        const content = document.getElementById('urmContent');
        content.style.display = 'flex';
        content.innerHTML = `
      ${this._renderKPIs(d)}
      ${this._renderStatusBreakdown(d)}
      ${this._renderTabs(d)}
    `;
        this._bindKPIClicks(d);
        this._bindStatusClicks(d);
        this._bindTabEvents();
        this._animateBars();
    }

    /* ── KPIs ─────────────────────────────────────────────── */
    _renderKPIs(d) {
        const s = this._fmtDate(this.dateRange.start);
        const e = this._fmtDate(this.dateRange.end);

        const kpis = [
            {icon: 'blue', i: 'fas fa-tasks', val: d.total, label: 'Ümumi task', key: 'all', clickable: true},
            {
                icon: 'green',
                i: 'fas fa-check-circle',
                val: d.completed,
                label: 'Tamamlanan',
                key: 'completed',
                clickable: true,
                sub: d.completionRate + '%'
            },
            {icon: 'amber', i: 'fas fa-clock', val: d.pending, label: 'Gözləyən', key: 'pending', clickable: true},
            {
                icon: 'blue',
                i: 'fas fa-spinner',
                val: d.inProgress,
                label: 'Davam edir',
                key: 'in_progress',
                clickable: true
            },
            {
                icon: 'red',
                i: 'fas fa-exclamation-triangle',
                val: d.overdue,
                label: 'Gecikmiş',
                key: 'overdue',
                clickable: true
            },
            {icon: 'gray', i: 'fas fa-ban', val: d.rejected, label: 'İmtina edilmiş', key: 'rejected', clickable: true},
            {
                icon: 'purple',
                i: 'fas fa-hourglass-half',
                val: d.waitingApproval,
                label: 'Təsdiq gözləyən',
                key: 'waiting',
                clickable: true
            },
            {icon: 'teal', i: 'fas fa-stopwatch', val: d.avgCompDays, label: 'Ort. icra (gün)', key: null},
            {icon: 'pink', i: 'fas fa-medal', val: d.ontimeRate + '%', label: 'Vaxtında bitirmə', key: null},
            {
                icon: 'blue',
                i: 'fas fa-paper-plane',
                val: d.createdByUser.length,
                label: 'Yaratdığı tasklar',
                key: 'created',
                clickable: true
            },
            {
                icon: 'amber',
                i: 'fas fa-trophy',
                val: (d.currentRank || '-'),
                label: `Reytinq (${d.totalPeers} nəfər)`,
                key: null
            }
        ];

        return `
    <div>
      <div class="urm-section-title">
        <i class="fas fa-tachometer-alt"></i>
        Əsas göstəricilər
        <span style="font-size:12px;color:#475569;font-weight:400;">${s} — ${e}</span>
      </div>
      <div class="urm-kpi-grid">
        ${kpis.map(k => `
        <div class="urm-kpi-card ${k.clickable ? 'clickable-kpi' : ''}"
             ${k.clickable && k.key ? `data-kpi-key="${k.key}"` : ''}
             title="${k.clickable ? 'Taskları gör' : ''}">
          <div class="urm-kpi-icon ${k.icon}"><i class="${k.i}"></i></div>
          <div class="urm-kpi-value">${k.val}</div>
          <div class="urm-kpi-label">${k.label}</div>
          ${k.sub ? `<div class="urm-kpi-sub">${k.sub}</div>` : ''}
          ${k.clickable ? `<div style="font-size:9px;color:var(--urm-accent);margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Klik et →</div>` : ''}
        </div>`).join('')}
      </div>
    </div>`;
    }

    _bindKPIClicks(d) {
        document.querySelectorAll('[data-kpi-key]').forEach(card => {
            card.addEventListener('click', () => {
                const key = card.dataset.kpiKey;
                const tasks = d.tasksByStatus[key] || [];
                this._openTaskList(tasks, this._kpiLabel(key));
            });
        });
    }

    _kpiLabel(key) {
        const map = {
            all: 'Bütün tasklar',
            completed: 'Tamamlanan tasklar',
            pending: 'Gözləyən tasklar',
            in_progress: 'Davam edən tasklar',
            overdue: 'Gecikmiş tasklar',
            rejected: 'İmtina edilmiş tasklar',
            waiting: 'Təsdiq gözləyən tasklar',
            created: 'Yaradılan tasklar'
        };
        return map[key] || key;
    }

    /* ── Status Breakdown ─────────────────────────────────── */
    _renderStatusBreakdown(d) {
        const statuses = [
            {key: 'completed', label: 'Tamamlanan', count: d.completed},
            {key: 'pending', label: 'Gözləyən', count: d.pending},
            {key: 'in_progress', label: 'Davam edir', count: d.inProgress},
            {key: 'overdue', label: 'Gecikmiş', count: d.overdue},
            {key: 'rejected', label: 'İmtina edilmiş', count: d.rejected},
            {key: 'waiting', label: 'Təsdiq gözləyir', count: d.waitingApproval}
        ];
        return `
    <div>
      <div class="urm-section-title"><i class="fas fa-chart-pie"></i> Status paylanması</div>
      <div class="urm-status-breakdown">
        ${statuses.map(s => `
        <div class="urm-status-item" data-status-key="${s.key}" style="cursor:pointer;">
          <div class="urm-status-color ${s.key}"></div>
          <div class="urm-status-info">
            <div class="urm-status-label">${s.label}</div>
            <div class="urm-status-count">${s.count}</div>
          </div>
          <div class="urm-status-pct">${d.total ? Math.round(s.count / d.total * 100) : 0}%</div>
        </div>`).join('')}
      </div>
    </div>`;
    }

    _bindStatusClicks(d) {
        document.querySelectorAll('[data-status-key]').forEach(el => {
            el.addEventListener('click', () => {
                const key = el.dataset.statusKey;
                const tasks = d.tasksByStatus[key] || [];
                const label = el.querySelector('.urm-status-label')?.textContent || key;
                this._openTaskList(tasks, label, key);
            });
        });
    }

    /* ── Tabs ─────────────────────────────────────────────── */
    _renderTabs(d) {
        return `
    <div>
      <div class="urm-tabs">
        <button class="urm-tab-btn active" data-urm-tab="tasks">
          <i class="fas fa-list"></i> Tasklar
        </button>
        <button class="urm-tab-btn" data-urm-tab="created">
          <i class="fas fa-paper-plane"></i> Yaratdığı (${d.createdByUser.length})
        </button>
        <button class="urm-tab-btn" data-urm-tab="companies">
          <i class="fas fa-building"></i> Şirkətlər
        </button>
        <button class="urm-tab-btn" data-urm-tab="time">
          <i class="fas fa-clock"></i> Vaxt analizi
        </button>
        <button class="urm-tab-btn" data-urm-tab="comparison">
          <i class="fas fa-users"></i> Müqayisə
        </button>
      </div>
      <div id="urmTabContent">${this._renderTabTasks(d)}</div>
    </div>`;
    }

    _bindTabEvents() {
        const content = document.getElementById('urmContent');
        if (!content) return;
        content.querySelectorAll('[data-urm-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                content.querySelectorAll('[data-urm-tab]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const d = this.currentUserData;
                const el = document.getElementById('urmTabContent');
                switch (btn.dataset.urmTab) {
                    case 'tasks':
                        el.innerHTML = this._renderTabTasks(d);
                        break;
                    case 'created':
                        el.innerHTML = this._renderTabCreated(d);
                        break;
                    case 'companies':
                        el.innerHTML = this._renderTabCompanies(d);
                        break;
                    case 'time':
                        el.innerHTML = this._renderTabTime(d);
                        break;
                    case 'comparison':
                        el.innerHTML = this._renderTabComparison(d);
                        break;
                }
                this._animateBars();
                this._bindTableRowClicks();
            });
        });
        // initial bind
        this._bindTableRowClicks();
    }

    /* ── Tab: Tasks Table ─────────────────────────────────── */
    _renderTabTasks(d) {
        const tasks = d.tasks.slice(0, 50);
        if (!tasks.length) return `<div class="urm-empty"><i class="fas fa-inbox"></i><p>Task yoxdur</p></div>`;
        return `
    <div class="urm-table-scroll">
      <table class="urm-comparison-table">
        <thead>
          <tr>
            <th>#</th><th>Task adı</th><th>Şirkət</th><th>Status</th>
            <th>Yaradılma</th><th>Son müddət</th><th>Tamamlanma</th><th>İcra müddəti</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map((t, i) => {
            const dur = t.completed_date && t.created_at
                ? Math.round((new Date(t.completed_date) - new Date(t.created_at)) / 86400000) + ' gün' : '-';
            return `
            <tr data-task-id="${t.id || ''}" data-task-json='${this._safeJson(t)}'>
              <td>${i + 1}</td>
              <td title="${this._esc(t.task_title)}">${this._esc(t.task_title || '-')}</td>
              <td>${this._esc(t.company_name || '-')}</td>
              <td><span class="urm-badge ${t.status || 'pending'}">${this._statusLabel(t.status)}</span></td>
              <td>${this._fmtDate(t.created_at)}</td>
              <td>${this._fmtDate(t.due_date)}</td>
              <td>${this._fmtDate(t.completed_date)}</td>
              <td>${dur}</td>
            </tr>`;
        }).join('')}
        </tbody>
      </table>
    </div>
    ${tasks.length < d.tasks.length ? `<p style="font-size:11px;color:#475569;text-align:center;margin-top:8px;">İlk 50 task göstərilir.</p>` : ''}`;
    }

    /* ── Tab: Created Tasks ───────────────────────────────── */
    _renderTabCreated(d) {
        const tasks = d.createdByUser.slice(0, 30);
        if (!tasks.length) return `<div class="urm-empty"><i class="fas fa-paper-plane"></i><p>Yaradılmış task yoxdur</p></div>`;
        return `
    <div class="urm-table-scroll">
      <table class="urm-comparison-table">
        <thead>
          <tr><th>#</th><th>Task adı</th><th>Şirkət</th><th>İcraçı</th><th>Status</th><th>Tarix</th></tr>
        </thead>
        <tbody>
          ${tasks.map((t, i) => `
          <tr data-task-id="${t.id || ''}" data-task-json='${this._safeJson(t)}'>
            <td>${i + 1}</td>
            <td>${this._esc(t.task_title || '-')}</td>
            <td>${this._esc(t.company_name || '-')}</td>
            <td>${this._esc(t.assignee_name || t.assigned_to_name || '-')}</td>
            <td><span class="urm-badge ${t.status || 'pending'}">${this._statusLabel(t.status)}</span></td>
            <td>${this._fmtDate(t.created_at)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
    }

    /* ── Tab: Companies ───────────────────────────────────── */
    _renderTabCompanies(d) {
        if (!d.companies.length) return `<div class="urm-empty"><i class="fas fa-building"></i><p>Şirkət məlumatı yoxdur</p></div>`;
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];
        return `
    <div class="urm-section-title" style="margin-bottom:14px;"><i class="fas fa-building"></i> Şirkətlər üzrə task payı</div>
    <div class="urm-company-list">
      ${d.companies.map((c, i) => {
            const pct = d.total ? Math.round(c.count / d.total * 100) : 0;
            const color = colors[i % colors.length];
            return `
        <div class="urm-company-item">
          <div class="urm-company-avatar" style="background:${color};">${c.name[0].toUpperCase()}</div>
          <div style="flex:1;">
            <div class="urm-company-name">${this._esc(c.name)}</div>
            <div class="urm-perf-bar-wrap" style="margin-top:6px;">
              <div class="urm-perf-bar">
                <div class="urm-perf-bar-fill blue" data-width="${pct}" style="width:0%"></div>
              </div>
              <span class="urm-perf-pct">${pct}%</span>
            </div>
          </div>
          <div class="urm-company-count">${c.count} task</div>
        </div>`;
        }).join('')}
    </div>`;
    }

    /* ── Tab: Time Analysis ───────────────────────────────── */
    _renderTabTime(d) {
        const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];
        const rows = Object.entries(d.monthlyMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([ym, v]) => {
                const [y, m] = ym.split('-');
                const rate = v.total ? Math.round(v.completed / v.total * 100) : 0;
                const color = rate >= 70 ? 'green' : rate >= 40 ? 'amber' : 'red';
                return `
        <tr>
          <td>${months[parseInt(m) - 1]} ${y}</td>
          <td>${v.total}</td>
          <td>${v.completed}</td>
          <td>
            <div class="urm-perf-bar-wrap">
              <div class="urm-perf-bar">
                <div class="urm-perf-bar-fill ${color}" data-width="${rate}" style="width:0%"></div>
              </div>
              <span class="urm-perf-pct">${rate}%</span>
            </div>
          </td>
        </tr>`;
            }).join('');
        return `
    <div class="urm-time-stats" style="margin-bottom:20px;">
      <div class="urm-time-card">
        <div class="urm-time-value">${d.avgCompDays} <span style="font-size:16px;">gün</span></div>
        <div class="urm-time-label">Orta tamamlama müddəti</div>
      </div>
      <div class="urm-time-card">
        <div class="urm-time-value">${d.ontimeRate}<span style="font-size:16px;">%</span></div>
        <div class="urm-time-label">Vaxtında bitirmə faizi</div>
      </div>
    </div>
    <div class="urm-section-title"><i class="fas fa-calendar-alt"></i> Aylıq performans</div>
    <div class="urm-table-scroll">
      <table class="urm-comparison-table">
        <thead>
          <tr><th>Ay</th><th>Ümumi</th><th>Tamamlanan</th><th>Faiz</th></tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="4" style="text-align:center;color:#475569;padding:30px;">Məlumat yoxdur</td></tr>'}
        </tbody>
      </table>
    </div>`;
    }

    /* ── Tab: Comparison ──────────────────────────────────── */
    _renderTabComparison(d) {
        const top = d.peersData.slice(0, 20);
        return `
    <div class="urm-section-title"><i class="fas fa-trophy"></i> İşçilər arasında reytinq</div>
    <div class="urm-table-scroll">
      <table class="urm-comparison-table">
        <thead>
          <tr><th>Yer</th><th>İşçi</th><th>Şöbə</th><th>Ümumi</th><th>Tamamlanan</th><th>Faiz</th><th>Performans</th></tr>
        </thead>
        <tbody>
          ${top.map((emp, i) => {
            const rank = i + 1;
            const rCls = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
            const color = emp.rate >= 70 ? 'green' : emp.rate >= 40 ? 'amber' : 'red';
            return `
            <tr ${emp.isCurrent ? 'class="highlight-row"' : ''}>
              <td><span class="urm-rank-badge ${rCls}">${rank}</span></td>
              <td>${this._esc(emp.name)} ${emp.isCurrent ? '<span style="font-size:10px;color:#6366f1;">(Siz)</span>' : ''}</td>
              <td>${this._esc(emp.department)}</td>
              <td>${emp.total}</td>
              <td>${emp.completed}</td>
              <td><span style="font-family:var(--urm-mono);font-weight:700;">${emp.rate}%</span></td>
              <td>
                <div class="urm-perf-bar-wrap">
                  <div class="urm-perf-bar">
                    <div class="urm-perf-bar-fill ${color}" data-width="${emp.rate}" style="width:0%"></div>
                  </div>
                </div>
              </td>
            </tr>`;
        }).join('')}
        </tbody>
      </table>
    </div>
    <p style="font-size:11px;color:#475569;margin-top:12px;text-align:center;">
      <i class="fas fa-info-circle"></i>
      <strong style="color:#6366f1;">Mavi sətir</strong> — sizin nəticəniz. Reytinq tamamlanan task sayına görədir.
    </p>`;
    }

    /* ── Table Row Click → Task Detail ───────────────────── */
    _bindTableRowClicks() {
        document.querySelectorAll('#urmTabContent [data-task-json]').forEach(row => {
            row.addEventListener('click', () => {
                try {
                    const task = JSON.parse(row.dataset.taskJson);
                    this._openTaskDetail(task);
                } catch (e) {
                    console.error('Task parse err:', e);
                }
            });
        });
    }

    /* ══════════════════════════════════════════════════════
       TASK LIST MODAL
    ══════════════════════════════════════════════════════ */
    _openTaskList(tasks, title, statusKey = null) {
        const badge = statusKey || 'all';
        document.getElementById('urmTLTitle').textContent = title;
        document.getElementById('urmTLBadge').textContent = this._statusLabel(badge) || title;
        document.getElementById('urmTLBadge').className = `urm-badge ${badge}`;
        document.getElementById('urmTLCount').textContent = `${tasks.length} task`;

        const body = document.getElementById('urmTLBody');
        if (!tasks.length) {
            body.innerHTML = `<div class="urm-empty"><i class="fas fa-inbox"></i><p>Task tapılmadı</p></div>`;
        } else {
            const statusColorMap = {
                completed: 'green', pending: 'amber', in_progress: 'blue',
                overdue: 'red', rejected: 'gray', waiting: 'purple',
                pending_approval: 'purple', waiting_approval: 'purple'
            };
            const statusIconMap = {
                completed: 'fas fa-check-circle', pending: 'fas fa-clock',
                in_progress: 'fas fa-spinner', overdue: 'fas fa-exclamation-triangle',
                rejected: 'fas fa-ban', waiting: 'fas fa-hourglass-half',
                pending_approval: 'fas fa-hourglass-half'
            };
            body.innerHTML = tasks.map(t => {
                const st = t.status || 'pending';
                const color = statusColorMap[st] || 'gray';
                const icon = statusIconMap[st] || 'fas fa-tasks';
                const due = t.due_date ? this._fmtDate(t.due_date) : '-';
                const isOverdue = t.due_date && new Date(t.due_date) < new Date() && st !== 'completed';
                return `
        <div class="urm-task-row" data-task-json='${this._safeJson(t)}'>
          <div class="urm-task-row-icon urm-kpi-icon ${color}">
            <i class="${icon}"></i>
          </div>
          <div class="urm-task-row-body">
            <div class="urm-task-row-title">${this._esc(t.task_title || 'Adsız task')}</div>
            <div class="urm-task-row-meta">
              <span><i class="fas fa-building"></i> ${this._esc(t.company_name || '-')}</span>
              <span><i class="fas fa-calendar${isOverdue ? ' text-red' : ''}"></i>
                <span style="${isOverdue ? 'color:var(--urm-red);font-weight:600;' : ''}">Son: ${due}</span>
              </span>
              ${t.assigned_to_name ? `<span><i class="fas fa-user"></i> ${this._esc(t.assigned_to_name)}</span>` : ''}
              ${t.priority ? `<span><i class="fas fa-flag"></i> ${this._esc(t.priority)}</span>` : ''}
            </div>
          </div>
          <span class="urm-badge ${st}" style="flex-shrink:0;">${this._statusLabel(st)}</span>
          <i class="fas fa-chevron-right urm-task-row-arrow"></i>
        </div>`;
            }).join('');

            body.querySelectorAll('[data-task-json]').forEach(row => {
                row.addEventListener('click', () => {
                    try {
                        const task = JSON.parse(row.dataset.taskJson);
                        this._openTaskDetail(task);
                    } catch (e) {
                    }
                });
            });
        }

        this._taskListModal.classList.add('active');
    }

    _closeTaskList() {
        this._taskListModal.classList.remove('active');
    }

    /* ══════════════════════════════════════════════════════
       TASK DETAIL MODAL
    ══════════════════════════════════════════════════════ */
    _openTaskDetail(task) {
        const st = task.status || 'pending';
        document.getElementById('urmTDTitle').textContent = task.task_title || 'Task detalları';

        // Badges
        const badgesEl = document.getElementById('urmTDBadges');
        const priorityColors = {high: 'red', medium: 'amber', low: 'green', urgent: 'red'};
        const pColor = priorityColors[task.priority] || 'gray';
        badgesEl.innerHTML = `
      <span class="urm-badge ${st}">${this._statusLabel(st)}</span>
      ${task.priority ? `<span class="urm-badge ${pColor}">${this._esc(task.priority)}</span>` : ''}
      ${task.work_type_name ? `<span class="urm-badge" style="background:rgba(99,102,241,0.15);color:var(--urm-accent);">${this._esc(task.work_type_name)}</span>` : ''}
    `;

        // Body
        const body = document.getElementById('urmTDBody');

        // Progress bar
        const progress = Math.min(100, Math.max(0, task.progress_percentage || (st === 'completed' ? 100 : 0)));
        const pColor2 = progress >= 70 ? '#10b981' : progress >= 40 ? '#f59e0b' : '#ef4444';

        // Timeline events
        const timeline = [];
        if (task.created_at) timeline.push({icon: 'plus', cls: 'created', label: 'Yaradıldı', date: task.created_at});
        if (task.started_at || task.started_date) timeline.push({
            icon: 'play',
            cls: 'started',
            label: 'Başlandı',
            date: task.started_at || task.started_date
        });
        if (task.due_date) timeline.push({icon: 'clock', cls: 'due', label: 'Son müddət', date: task.due_date});
        if (task.completed_date) timeline.push({
            icon: 'check',
            cls: 'done',
            label: 'Tamamlandı',
            date: task.completed_date
        });
        if (task.rejected_at) timeline.push({
            icon: 'times',
            cls: 'rejected',
            label: 'İmtina edildi',
            date: task.rejected_at
        });
        timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

        body.innerHTML = `
    <!-- Detail Grid -->
    <div class="urm-detail-grid">
      <div class="urm-detail-field">
        <div class="urm-detail-field-label"><i class="fas fa-user"></i> Yaradan</div>
        <div class="urm-detail-field-value">${this._esc(task.creator_name || task.created_by_name || '-')}</div>
      </div>
      <div class="urm-detail-field">
        <div class="urm-detail-field-label"><i class="fas fa-user-check"></i> İcraçı</div>
        <div class="urm-detail-field-value">${this._esc(task.assigned_to_name || '-')}</div>
      </div>
      <div class="urm-detail-field">
        <div class="urm-detail-field-label"><i class="fas fa-building"></i> Şirkət</div>
        <div class="urm-detail-field-value">${this._esc(task.company_name || '-')}</div>
      </div>
      <div class="urm-detail-field">
        <div class="urm-detail-field-label"><i class="fas fa-sitemap"></i> Şöbə</div>
        <div class="urm-detail-field-value">${this._esc(task.department_name || '-')}</div>
      </div>
      <div class="urm-detail-field">
        <div class="urm-detail-field-label"><i class="fas fa-calendar-plus"></i> Yaradılma tarixi</div>
        <div class="urm-detail-field-value">${this._fmtDate(task.created_at)}</div>
      </div>
      <div class="urm-detail-field">
        <div class="urm-detail-field-label"><i class="fas fa-calendar-times" style="color:var(--urm-red);"></i> Son müddət</div>
        <div class="urm-detail-field-value" style="${task.due_date && new Date(task.due_date) < new Date() && st !== 'completed' ? 'color:var(--urm-red);font-weight:700;' : ''}">
          ${this._fmtDate(task.due_date)}
        </div>
      </div>
      ${task.completed_date ? `
      <div class="urm-detail-field">
        <div class="urm-detail-field-label"><i class="fas fa-check" style="color:var(--urm-green);"></i> Tamamlanma tarixi</div>
        <div class="urm-detail-field-value" style="color:var(--urm-green);">${this._fmtDate(task.completed_date)}</div>
      </div>` : ''}
      ${task.estimated_hours ? `
      <div class="urm-detail-field">
        <div class="urm-detail-field-label"><i class="fas fa-hourglass"></i> Plan saatı</div>
        <div class="urm-detail-field-value">${task.estimated_hours} saat</div>
      </div>` : ''}
      ${task.actual_hours ? `
      <div class="urm-detail-field">
        <div class="urm-detail-field-label"><i class="fas fa-stopwatch"></i> Həqiqi saat</div>
        <div class="urm-detail-field-value">${task.actual_hours} saat</div>
      </div>` : ''}
      ${task.approval_expires_at ? `
      <div class="urm-detail-field">
        <div class="urm-detail-field-label"><i class="fas fa-shield-alt"></i> Təsdiq vaxtı bitir</div>
        <div class="urm-detail-field-value">${this._fmtDate(task.approval_expires_at, 'DATETIME')}</div>
      </div>` : ''}
      ${task.approved_by_name ? `
      <div class="urm-detail-field">
        <div class="urm-detail-field-label"><i class="fas fa-user-shield"></i> Təsdiqləyən</div>
        <div class="urm-detail-field-value">${this._esc(task.approved_by_name)}</div>
      </div>` : ''}
    </div>

    <!-- Progress -->
    ${progress > 0 ? `
    <div class="urm-detail-progress">
      <div class="urm-detail-progress-top">
        <span class="urm-detail-progress-label"><i class="fas fa-tasks" style="margin-right:5px;"></i>İcra Faizi</span>
        <span class="urm-detail-progress-val">${progress}%</span>
      </div>
      <div class="urm-detail-progress-bar">
        <div class="urm-detail-progress-fill" style="width:${progress}%;background:linear-gradient(90deg,${pColor2},${pColor2}88);"></div>
      </div>
    </div>` : ''}

    <!-- Description -->
    ${task.task_description ? `
    <div class="urm-detail-desc">
      <div class="urm-detail-desc-label"><i class="fas fa-align-left" style="margin-right:5px;"></i>Açıqlama</div>
      <div class="urm-detail-desc-text">${this._esc(task.task_description)}</div>
    </div>` : ''}

    <!-- Rejection reason -->
    ${task.rejection_reason ? `
    <div class="urm-detail-desc" style="border-color:rgba(239,68,68,0.25);background:rgba(239,68,68,0.05);">
      <div class="urm-detail-desc-label" style="color:var(--urm-red);"><i class="fas fa-ban" style="margin-right:5px;"></i>İmtina səbəbi</div>
      <div class="urm-detail-desc-text" style="color:var(--urm-red);">${this._esc(task.rejection_reason)}</div>
    </div>` : ''}

    <!-- Timeline -->
    ${timeline.length ? `
    <div class="urm-section-title" style="margin-top:4px;"><i class="fas fa-stream"></i> Tarixçə</div>
    <div class="urm-detail-timeline">
      ${timeline.map(ev => `
      <div class="urm-timeline-item">
        <div class="urm-timeline-dot ${ev.cls}"><i class="fas fa-${ev.icon}"></i></div>
        <div class="urm-timeline-info">
          <div class="urm-timeline-event">${ev.label}</div>
          <div class="urm-timeline-date">${this._fmtDate(ev.date, 'DATETIME')}</div>
        </div>
      </div>`).join('')}
    </div>` : ''}
    `;

        this._taskDetailModal.classList.add('active');
    }

    _closeTaskDetail() {
        this._taskDetailModal.classList.remove('active');
    }

    /* ── Animate Bars ─────────────────────────────────────── */
    _animateBars() {
        setTimeout(() => {
            document.querySelectorAll('[data-width]').forEach(el => {
                el.style.width = (el.dataset.width || 0) + '%';
            });
        }, 80);
    }

    /* ── UI Helpers ───────────────────────────────────────── */
    _showLoading() {
        document.getElementById('urmLoading').style.display = 'flex';
        const c = document.getElementById('urmContent');
        c.style.display = 'none';
        c.innerHTML = '';
    }

    _hideLoading() {
        document.getElementById('urmLoading').style.display = 'none';
        document.getElementById('urmContent').style.display = 'flex';
    }

    _showError(msg) {
        document.getElementById('urmLoading').style.display = 'none';
        const c = document.getElementById('urmContent');
        c.style.display = 'flex';
        c.innerHTML = `<div class="urm-empty"><i class="fas fa-exclamation-triangle" style="color:var(--urm-red);"></i><p>${msg}</p></div>`;
    }

    /* ── Utils ────────────────────────────────────────────── */
    _statusLabel(status) {
        const map = {
            completed: 'Tamamlandı',
            pending: 'Gözləyir',
            in_progress: 'Davam edir',
            overdue: 'Gecikmiş',
            rejected: 'İmtina',
            waiting_approval: 'Təsdiq gözləyir',
            pending_approval: 'Təsdiq gözləyir',
            waiting: 'Gözləmə',
            approval_overdue: 'Müddəti keçib',
            all: 'Hamısı',
            created: 'Yaradılan',
            '-': '-'
        };
        return map[status] || status || '-';
    }

    _fmtDate(date, format = 'DD.MM.YYYY') {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d)) return '-';
        const day = String(d.getDate()).padStart(2, '0');
        const mon = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hr = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        if (format === 'YYYY-MM-DD') return `${year}-${mon}-${day}`;
        if (format === 'DATETIME') return `${day}.${mon}.${year} ${hr}:${min}`;
        return `${day}.${mon}.${year}`;
    }

    _safeJson(obj) {
        try {
            return JSON.stringify(obj).replace(/'/g, '&#39;');
        } catch {
            return '{}';
        }
    }

    _esc(str) {
        if (!str) return '-';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

/* ──────────────────────────────────────────────────────── */
window.userReportModal = new UserReportModal();
window.openUserReport = (userId) => window.userReportModal.open(userId);