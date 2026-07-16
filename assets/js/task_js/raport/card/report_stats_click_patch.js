(function () {

    /* ── Helpers ──────────────────────────────────────────── */
    function statusLabel(st) {
        const map = {
            completed: 'Tamamlandı', pending: 'Gözləyir',
            in_progress: 'Davam edir', overdue: 'Gecikmiş',
            rejected: 'İmtina', waiting_approval: 'Təsdiq gözləyir',
            pending_approval: 'Təsdiq gözləyir', waiting: 'Gözləmə',
            approval_overdue: 'Müddəti keçib'
        };
        return map[st] || st || '-';
    }

    function fmtDate(date) {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d)) return '-';
        return [
            String(d.getDate()).padStart(2, '0'),
            String(d.getMonth() + 1).padStart(2, '0'),
            d.getFullYear()
        ].join('.');
    }

    function esc(str) {
        if (!str) return '-';
        return String(str)
            .replace(/[\[\]👇]/g, '')
            .trim()
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function safeJson(obj) {
        try { return JSON.stringify(obj).replace(/'/g, '&#39;'); }
        catch { return '{}'; }
    }

    /* ── Metadata Enricher ────────────────────────────────── */
    // Payload-da metadata JSON string kimi saxlanır:
    // {"display_company_name":"Azersud","target_company_name":"Azersud",
    //  "company_name":"Azersud","company_id":null,
    //  "created_by_company":"SOC26001","created_by_company_id":55,...}
    //
    // API /reports/full bu metadata-nı ayrıca field-lərə map etmir,
    // ona görə biz parse edib task-a əlavə edirik.
    function enrichTasksWithMetadata(tasks) {
        tasks.forEach(t => {
            if (t._metaEnriched) return;
            t._metaEnriched = true;

            let meta = null;
            if (t.metadata) {
                try {
                    meta = typeof t.metadata === 'string'
                        ? JSON.parse(t.metadata)
                        : t.metadata;
                } catch (e) { /* parse xətası */ }
            }
            if (!meta) return;

            // "Azersud" — tapşırığın verildiyi şirkətin adı
            if (!t.target_company_name) {
                t.target_company_name =
                    meta.target_company_name  ||
                    meta.display_company_name ||
                    meta.original_company_name||
                    meta.company_name         || null;
            }

            // target_company_id (null ola bilər — string "null" yoxla)
            if (!t.target_company_id) {
                const raw = meta.target_company_id;
                if (raw && String(raw) !== 'null') t.target_company_id = raw;
            }

            // creator tərəfin şirkəti
            if (!t.created_by_company_id && meta.created_by_company_id)
                t.created_by_company_id = meta.created_by_company_id;
            if (!t.created_by_company && meta.created_by_company)
                t.created_by_company = meta.created_by_company;
        });
    }

    /* ── Inline Modal ─────────────────────────────────────── */
    function ensureInlineModal() {
        if (document.getElementById('rsp-backdrop')) return;

        const css = `
        #rsp-backdrop {
            display:none; position:fixed; inset:0;
            background:rgba(0,0,0,0.55); backdrop-filter:blur(4px);
            z-index:99998; align-items:center; justify-content:center;
        }
        #rsp-backdrop.active { display:flex; }
        #rsp-modal {
            background:#1e293b; border:1px solid rgba(255,255,255,0.1);
            border-radius:16px; width:min(900px,96vw); max-height:88vh;
            display:flex; flex-direction:column; overflow:hidden;
            box-shadow:0 24px 80px rgba(0,0,0,0.6);
            animation: rspSlideIn .25s cubic-bezier(.22,1,.36,1);
        }
        @keyframes rspSlideIn {
            from { opacity:0; transform:translateY(32px) scale(.97); }
            to   { opacity:1; transform:none; }
        }
        #rsp-header {
            display:flex; align-items:center; gap:12px;
            padding:18px 22px; border-bottom:1px solid rgba(255,255,255,0.08);
            background:rgba(255,255,255,0.03);
        }
        #rsp-header-icon {
            width:38px; height:38px; border-radius:10px;
            display:flex; align-items:center; justify-content:center;
            font-size:16px; flex-shrink:0;
        }
        #rsp-title { font-size:16px; font-weight:700; color:#f1f5f9; flex:1; }
        #rsp-count {
            font-size:12px; color:#94a3b8;
            background:rgba(255,255,255,0.07);
            padding:3px 10px; border-radius:20px;
        }
        #rsp-close-btn {
            width:34px; height:34px; border-radius:8px; border:none;
            background:rgba(255,255,255,0.07); color:#94a3b8;
            cursor:pointer; font-size:14px; display:flex;
            align-items:center; justify-content:center; transition:all .15s;
        }
        #rsp-close-btn:hover { background:rgba(239,68,68,0.2); color:#ef4444; }
        #rsp-body {
            overflow-y:auto; flex:1;
            scrollbar-width:thin; scrollbar-color:#334155 transparent;
        }
        .rsp-task-row {
            display:flex; align-items:center; gap:14px;
            padding:14px 22px; border-bottom:1px solid rgba(255,255,255,0.05);
            cursor:pointer; transition:background .15s;
        }
        .rsp-task-row:hover { background:rgba(255,255,255,0.04); }
        .rsp-task-icon {
            width:36px; height:36px; border-radius:9px; flex-shrink:0;
            display:flex; align-items:center; justify-content:center; font-size:14px;
        }
        .rsp-task-icon.completed   { background:rgba(16,185,129,.18); color:#10b981; }
        .rsp-task-icon.pending     { background:rgba(245,158,11,.18); color:#f59e0b; }
        .rsp-task-icon.pending_approval { background:rgba(245,158,11,.18); color:#f59e0b; }
        .rsp-task-icon.in_progress { background:rgba(59,130,246,.18); color:#3b82f6; }
        .rsp-task-icon.overdue     { background:rgba(239,68,68,.18);  color:#ef4444; }
        .rsp-task-icon.rejected    { background:rgba(100,116,139,.18);color:#94a3b8; }
        .rsp-task-icon.rsp-default { background:rgba(99,102,241,.18); color:#6366f1; }
        .rsp-task-body { flex:1; min-width:0; }
        .rsp-task-title {
            font-size:13px; font-weight:600; color:#f1f5f9;
            white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .rsp-task-meta {
            display:flex; gap:14px; flex-wrap:wrap;
            font-size:11px; color:#64748b; margin-top:4px;
        }
        .rsp-task-meta span { display:flex; align-items:center; gap:4px; }
        .rsp-badge {
            font-size:10px; font-weight:600; padding:2px 9px;
            border-radius:20px; flex-shrink:0;
        }
        .rsp-badge.completed   { background:rgba(16,185,129,.18); color:#10b981; }
        .rsp-badge.pending     { background:rgba(245,158,11,.18);  color:#f59e0b; }
        .rsp-badge.pending_approval { background:rgba(245,158,11,.18); color:#f59e0b; }
        .rsp-badge.in_progress { background:rgba(59,130,246,.18);  color:#3b82f6; }
        .rsp-badge.overdue     { background:rgba(239,68,68,.18);   color:#ef4444; }
        .rsp-badge.rejected    { background:rgba(100,116,139,.18); color:#94a3b8; }
        .rsp-badge.rsp-default { background:rgba(99,102,241,.18);  color:#6366f1; }
        .rsp-empty {
            display:flex; flex-direction:column; align-items:center;
            justify-content:center; padding:60px 20px; color:#475569;
            font-size:14px; gap:12px;
        }
        .rsp-empty i { font-size:32px; }

        /* Task Detail Modal */
        #rspd-backdrop {
            display:none; position:fixed; inset:0;
            background:rgba(0,0,0,0.65); backdrop-filter:blur(6px);
            z-index:99999; align-items:center; justify-content:center;
        }
        #rspd-backdrop.active { display:flex; }
        #rspd-modal {
            background:#1e293b; border:1px solid rgba(255,255,255,0.1);
            border-radius:16px; width:min(680px,96vw); max-height:88vh;
            display:flex; flex-direction:column; overflow:hidden;
            box-shadow:0 24px 80px rgba(0,0,0,0.7);
            animation: rspSlideIn .22s cubic-bezier(.22,1,.36,1);
        }
        #rspd-header {
            padding:18px 22px 14px; border-bottom:1px solid rgba(255,255,255,0.08);
        }
        #rspd-htop { display:flex; align-items:flex-start; gap:10px; }
        #rspd-title { font-size:15px; font-weight:700; color:#f1f5f9; flex:1; line-height:1.4; }
        #rspd-close {
            width:32px; height:32px; border-radius:8px; border:none; flex-shrink:0;
            background:rgba(255,255,255,0.07); color:#94a3b8;
            cursor:pointer; font-size:13px; display:flex;
            align-items:center; justify-content:center; transition:all .15s;
        }
        #rspd-close:hover { background:rgba(239,68,68,0.2); color:#ef4444; }
        #rspd-badges { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
        #rspd-body {
            overflow-y:auto; flex:1; padding:20px 22px;
            scrollbar-width:thin; scrollbar-color:#334155 transparent;
        }
        .rspd-grid {
            display:grid; grid-template-columns:1fr 1fr;
            gap:10px 18px; margin-bottom:18px;
        }
        .rspd-field-label {
            font-size:10px; font-weight:600; color:#475569;
            text-transform:uppercase; letter-spacing:.6px; margin-bottom:4px;
        }
        .rspd-field-value { font-size:13px; color:#cbd5e1; font-weight:500; }
        .rspd-desc {
            background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);
            border-radius:10px; padding:14px; margin-top:6px;
        }
        .rspd-desc-label {
            font-size:11px; font-weight:600; color:#64748b;
            text-transform:uppercase; letter-spacing:.5px; margin-bottom:8px;
        }
        .rspd-desc-text { font-size:13px; color:#94a3b8; line-height:1.6; }
        .rspd-timeline { margin-top:16px; }
        .rspd-tl-item {
            display:flex; align-items:flex-start; gap:12px;
            padding:8px 0; position:relative;
        }
        .rspd-tl-item:not(:last-child)::before {
            content:''; position:absolute; left:15px; top:28px;
            width:2px; height:calc(100% - 8px); background:rgba(255,255,255,0.06);
        }
        .rspd-tl-dot {
            width:30px; height:30px; border-radius:50%; flex-shrink:0;
            display:flex; align-items:center; justify-content:center; font-size:12px;
        }
        .rspd-tl-dot.created  { background:rgba(99,102,241,.2);  color:#6366f1; }
        .rspd-tl-dot.started  { background:rgba(59,130,246,.2);  color:#3b82f6; }
        .rspd-tl-dot.due      { background:rgba(245,158,11,.2);  color:#f59e0b; }
        .rspd-tl-dot.done     { background:rgba(16,185,129,.2);  color:#10b981; }
        .rspd-tl-dot.rejected { background:rgba(239,68,68,.2);   color:#ef4444; }
        .rspd-tl-event { font-size:12px; font-weight:600; color:#cbd5e1; }
        .rspd-tl-date  { font-size:11px; color:#475569; }
        `;

        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        document.body.insertAdjacentHTML('beforeend', `
        <div id="rsp-backdrop">
          <div id="rsp-modal">
            <div id="rsp-header">
              <div id="rsp-header-icon"></div>
              <div id="rsp-title">Tasklar</div>
              <span id="rsp-count">0 task</span>
              <button id="rsp-close-btn"><i class="fas fa-times"></i></button>
            </div>
            <div id="rsp-body"></div>
          </div>
        </div>
        <div id="rspd-backdrop">
          <div id="rspd-modal">
            <div id="rspd-header">
              <div id="rspd-htop">
                <div id="rspd-title">Task detalları</div>
                <button id="rspd-close"><i class="fas fa-times"></i></button>
              </div>
              <div id="rspd-badges"></div>
            </div>
            <div id="rspd-body"></div>
          </div>
        </div>`);

        document.getElementById('rsp-close-btn').addEventListener('click', closeTaskList);
        document.getElementById('rsp-backdrop').addEventListener('click', function (e) {
            if (e.target === this) closeTaskList();
        });
        document.getElementById('rspd-close').addEventListener('click', closeTaskDetail);
        document.getElementById('rspd-backdrop').addEventListener('click', function (e) {
            if (e.target === this) closeTaskDetail();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                if (document.getElementById('rspd-backdrop').classList.contains('active')) {
                    closeTaskDetail(); return;
                }
                if (document.getElementById('rsp-backdrop').classList.contains('active')) {
                    closeTaskList();
                }
            }
        });
    }

    function closeTaskList()   { document.getElementById('rsp-backdrop')?.classList.remove('active'); }
    function closeTaskDetail() { document.getElementById('rspd-backdrop')?.classList.remove('active'); }

    /* ── openTaskListInline ───────────────────────────────── */
    function openTaskListInline(tasks, title, colorClass) {
        ensureInlineModal();

        const iconMap = {
            blue:   { bg: 'rgba(59,130,246,.2)',  color: '#3b82f6', i: 'fas fa-tasks' },
            purple: { bg: 'rgba(139,92,246,.2)',  color: '#8b5cf6', i: 'fas fa-sitemap' },
            teal:   { bg: 'rgba(20,184,166,.2)',  color: '#14b8a6', i: 'fas fa-tag' },
            amber:  { bg: 'rgba(245,158,11,.2)',  color: '#f59e0b', i: 'fas fa-handshake' },
            green:  { bg: 'rgba(16,185,129,.2)',  color: '#10b981', i: 'fas fa-building' },
        };
        const ic = iconMap[colorClass] || iconMap.blue;

        const iconEl = document.getElementById('rsp-header-icon');
        iconEl.innerHTML = `<i class="${ic.i}"></i>`;
        iconEl.style.cssText = `background:${ic.bg};color:${ic.color};`;
        document.getElementById('rsp-title').textContent = title;
        document.getElementById('rsp-count').textContent = `${tasks.length} task`;

        const body = document.getElementById('rsp-body');

        if (!tasks.length) {
            body.innerHTML = `
            <div class="rsp-empty">
              <i class="fas fa-inbox"></i>
              <span>Bu kontekstə aid task tapılmadı</span>
            </div>`;
        } else {
            const stIconMap = {
                completed:        'fas fa-check-circle',
                pending:          'fas fa-clock',
                pending_approval: 'fas fa-hourglass-half',
                in_progress:      'fas fa-spinner',
                overdue:          'fas fa-exclamation-triangle',
                rejected:         'fas fa-ban',
            };
            const validSt = ['completed','pending','pending_approval','in_progress','overdue','rejected'];
            body.innerHTML = tasks.map(t => {
                const st = t.status || '';
                const stCls = validSt.includes(st) ? st : 'rsp-default';
                const icon  = stIconMap[st] || 'fas fa-tasks';
                const isOverdue = t.due_date && new Date(t.due_date) < new Date() && st !== 'completed';
                // Görünən şirkət adı: metadata-dan target > company_name
                const displayCompany = t.target_company_name || t.company_name || '-';
                return `
                <div class="rsp-task-row" data-task-json='${safeJson(t)}'>
                  <div class="rsp-task-icon ${stCls}"><i class="${icon}"></i></div>
                  <div class="rsp-task-body">
                    <div class="rsp-task-title">${esc(t.task_title || t.name || 'Adsız task')}</div>
                    <div class="rsp-task-meta">
                      <span><i class="fas fa-building"></i>${esc(displayCompany)}</span>
                      <span style="${isOverdue ? 'color:#ef4444;' : ''}">
                        <i class="fas fa-calendar"></i>Son: ${fmtDate(t.due_date)}
                      </span>
                      ${t.assignee_name || t.executor
                        ? `<span><i class="fas fa-user"></i>${esc(t.assignee_name || t.executor)}</span>`
                        : ''}
                    </div>
                  </div>
                  <span class="rsp-badge ${stCls}">${statusLabel(st)}</span>
                  <i class="fas fa-chevron-right" style="color:#334155;font-size:11px;"></i>
                </div>`;
            }).join('');

            body.querySelectorAll('[data-task-json]').forEach(row => {
                row.addEventListener('click', () => {
                    try { openTaskDetailInline(JSON.parse(row.dataset.taskJson)); }
                    catch (e) { console.error(e); }
                });
            });
        }

        document.getElementById('rsp-backdrop').classList.add('active');
    }

    /* ── openTaskDetailInline ─────────────────────────────── */
    function openTaskDetailInline(task) {
        ensureInlineModal();

        const st = task.status || 'pending';
        const validSt = ['completed','pending','pending_approval','in_progress','overdue','rejected'];
        const stCls = validSt.includes(st) ? st : 'rsp-default';

        document.getElementById('rspd-title').textContent =
            task.task_title || task.name || 'Task detalları';

        const pColorMap = { high:'overdue', medium:'pending', low:'completed', urgent:'overdue' };
        const pCls = pColorMap[task.priority] || 'rsp-default';
        document.getElementById('rspd-badges').innerHTML = `
          <span class="rsp-badge ${stCls}">${statusLabel(st)}</span>
          ${task.priority ? `<span class="rsp-badge ${pCls}">${esc(task.priority)}</span>` : ''}
          ${task.work_type_name ? `<span class="rsp-badge rsp-default">${esc(task.work_type_name)}</span>` : ''}
        `;

        const progress = Math.min(100, Math.max(0,
            task.progress_percentage || (st === 'completed' ? 100 : 0)));
        const pBarColor = progress >= 70 ? '#10b981' : progress >= 40 ? '#f59e0b' : '#ef4444';

        const timeline = [];
        if (task.created_at) timeline.push({ cls:'created',  icon:'plus',  label:'Yaradıldı',    date:task.created_at });
        if (task.started_at||task.started_date) timeline.push({ cls:'started', icon:'play', label:'Başlandı', date:task.started_at||task.started_date });
        if (task.due_date)     timeline.push({ cls:'due',      icon:'clock', label:'Son müddət',   date:task.due_date });
        if (task.completed_date) timeline.push({ cls:'done',   icon:'check', label:'Tamamlandı',  date:task.completed_date });
        if (task.rejected_at)  timeline.push({ cls:'rejected', icon:'times', label:'İmtina edildi',date:task.rejected_at });
        timeline.sort((a,b) => new Date(a.date) - new Date(b.date));

        // Görünən şirkət adı metadata-dan
        const displayCompany = task.target_company_name || task.company_name || task.company || '-';

        const fields = [
            { label:'Yaradan',     val: task.creator_name || task.created_by_name },
            { label:'İcraçı',      val: task.assignee_name || task.executor },
            { label:'Şirkət',      val: displayCompany },
            { label:'Şöbə',        val: task.department_name },
            { label:'Yaradılma',   val: fmtDate(task.created_at) },
            { label:'Son müddət',  val: fmtDate(task.due_date),
              red: !!(task.due_date && new Date(task.due_date) < new Date() && st !== 'completed') },
            { label:'Tamamlanma',  val: fmtDate(task.completed_date), green: !!task.completed_date },
            { label:'Plan saatı',  val: task.estimated_hours ? task.estimated_hours + ' saat' : null },
            { label:'Həqiqi saat', val: task.actual_hours    ? task.actual_hours    + ' saat' : null },
        ].filter(f => f.val && f.val !== '-');

        document.getElementById('rspd-body').innerHTML = `
          <div class="rspd-grid">
            ${fields.map(f => `
            <div>
              <div class="rspd-field-label">${f.label}</div>
              <div class="rspd-field-value"
                style="${f.red?'color:#ef4444;font-weight:700;':f.green?'color:#10b981;':''}">
                ${esc(f.val)}
              </div>
            </div>`).join('')}
          </div>

          ${progress > 0 ? `
          <div style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:6px;">
              <span>İcra faizi</span>
              <span style="font-weight:700;color:${pBarColor};">${progress}%</span>
            </div>
            <div style="height:6px;background:rgba(255,255,255,0.07);border-radius:99px;overflow:hidden;">
              <div style="height:100%;width:${progress}%;background:${pBarColor};border-radius:99px;"></div>
            </div>
          </div>` : ''}

          ${task.task_description ? `
          <div class="rspd-desc" style="margin-bottom:16px;">
            <div class="rspd-desc-label"><i class="fas fa-align-left" style="margin-right:5px;"></i>Açıqlama</div>
            <div class="rspd-desc-text">${esc(task.task_description)}</div>
          </div>` : ''}

          ${task.rejection_reason ? `
          <div class="rspd-desc" style="border-color:rgba(239,68,68,.2);background:rgba(239,68,68,.05);margin-bottom:16px;">
            <div class="rspd-desc-label" style="color:#ef4444;"><i class="fas fa-ban" style="margin-right:5px;"></i>İmtina səbəbi</div>
            <div class="rspd-desc-text" style="color:#ef4444;">${esc(task.rejection_reason)}</div>
          </div>` : ''}

          ${timeline.length ? `
          <div class="rspd-timeline">
            <div class="rspd-desc-label" style="margin-bottom:10px;">
              <i class="fas fa-stream" style="margin-right:5px;"></i>Tarixçə
            </div>
            ${timeline.map(ev => `
            <div class="rspd-tl-item">
              <div class="rspd-tl-dot ${ev.cls}"><i class="fas fa-${ev.icon}"></i></div>
              <div>
                <div class="rspd-tl-event">${ev.label}</div>
                <div class="rspd-tl-date">${fmtDate(ev.date)}</div>
              </div>
            </div>`).join('')}
          </div>` : ''}
        `;

        document.getElementById('rspd-backdrop').classList.add('active');
    }

    /* ── openStatTasks ────────────────────────────────────── */
    function openStatTasks(tasks, title, colorClass) {
        openTaskListInline(tasks, title, colorClass);
    }

    /* ── Hover helper ─────────────────────────────────────── */
    function addHoverStyle(item) {
        item.style.cursor = 'pointer';
        item.addEventListener('mouseenter', () => item.style.background = 'rgba(255,255,255,0.04)');
        item.addEventListener('mouseleave', () => item.style.background = '');
    }

    /* ── ReportManager Patch ──────────────────────────────── */
    function patchReportManager() {
        const rm = window.reportManager;
        if (!rm) return;

        /* ── Company ── */
        rm.updateCompanyStats = function () {
            const companies = this.data.companies || [];
            const tasks = this.data.tasks || [];
            const listEl = this.elements.companyStats;
            if (!listEl) return;

            enrichTasksWithMetadata(tasks);

            // Unique companies
            const uniqueCompanies = [];
            const seenIds = new Set();
            companies.forEach(c => {
                if (!seenIds.has(c.id)) { seenIds.add(c.id); uniqueCompanies.push(c); }
            });

            // Correct task counts: use target_company_id || company_id
            const totalTasks = tasks.length;
            const counts = {};
            const completedCounts = {};
            tasks.forEach(t => {
                const eid = t.target_company_id || t.company_id;
                if (eid) {
                    counts[eid] = (counts[eid] || 0) + 1;
                    if (t.status === 'completed') completedCounts[eid] = (completedCounts[eid] || 0) + 1;
                }
            });

            let html = '';
            uniqueCompanies.forEach(c => {
                const cid = c.id;
                const cname = c.company_name || c.name || '';
                const ccode = c.company_code || c.code || '';
                const taskCount = counts[cid] || 0;
                const completedCount = completedCounts[cid] || 0;
                const pct = totalTasks ? Math.round((taskCount / totalTasks) * 100) : 0;
                const complPct = taskCount ? Math.round((completedCount / taskCount) * 100) : 0;
                let avatarColor = 'linear-gradient(135deg, #3b82f6, #2563eb)';
                if (c.relationship_type === 'parent') avatarColor = 'linear-gradient(135deg, #8b5cf6, #6366f1)';
                else if (c.relationship_type === 'child') avatarColor = 'linear-gradient(135deg, #10b981, #059669)';
                html += `<div class="stat-item" onclick="reportManager.showCompanyDetails(${cid})">
                    <div class="stat-avatar" style="background:${avatarColor};">${cname.charAt(0).toUpperCase()}</div>
                    <div class="stat-info">
                        <span class="stat-name">${esc(cname)}</span>
                        <span class="stat-code">${esc(ccode)}</span>
                        <div class="stat-progress">
                            <div class="progress-sm">
                                <div class="progress-sm-fill" style="width:${pct}%"></div>
                            </div>
                            <span class="stat-count">${taskCount} task</span>
                            <span class="stat-percent">${complPct}% tamam</span>
                        </div>
                    </div>
                </div>`;
            });
            listEl.innerHTML = html;

            listEl.querySelectorAll('.stat-item').forEach(item => {
                addHoverStyle(item);
                item.addEventListener('click', () => {
                    const name = (item.querySelector('.stat-name') || {}).textContent?.trim() || '';
                    const onclickAttr = item.getAttribute('onclick') || '';
                    const idMatch = onclickAttr.match(/showCompanyDetails\((\d+)\)/);
                    const companyId = idMatch ? idMatch[1] : null;
                    const company = companyId
                        ? companies.find(c => String(c.id) === companyId)
                        : companies.find(c => (c.company_name || c.name || '') === name);
                    const cname = company ? (company.company_name || company.name || name) : name;
                    const cid = company ? String(company.id) : companyId;

                    const filteredTasks = tasks.filter(t => {
                        if (t.target_company_name && t.target_company_name === cname) return true;
                        if (t.company_name && t.company_name === cname) return true;
                        if (cid) {
                            if (t.target_company_id && String(t.target_company_id) === cid) return true;
                            if (t.company_id && String(t.company_id) === cid) return true;
                        }
                        return false;
                    });

                    openStatTasks(filteredTasks, `${cname} — Tasklar`, 'blue');
                });
            });
        };

        /* ── Department ── */
        const origDept = rm.updateDepartmentStats.bind(rm);
        rm.updateDepartmentStats = function () {
            origDept();
            const listEl = this.elements.departmentStats;
            if (!listEl) return;
            const departments = this.data.departments || [];
            enrichTasksWithMetadata(this.data.tasks || []);
            listEl.querySelectorAll('.stat-item').forEach(item => {
                addHoverStyle(item);
                item.addEventListener('click', () => {
                    const name = (item.querySelector('.stat-name') || {}).textContent?.trim() || '';
                    const dept = departments.find(d => (d.name || '') === name);
                    const tasks = this.data.tasks || [];

                    let filteredTasks;
                    if (dept) {
                        const did = String(dept.id);
                        filteredTasks = tasks.filter(t =>
                            String(t.department_id) === did ||
                            String(t.executor_department_id) === did
                        );
                        if (!filteredTasks.length) {
                            filteredTasks = tasks.filter(t =>
                                (t.department_name || '') === name
                            );
                        }
                    } else {
                        filteredTasks = tasks.filter(t =>
                            (t.department_name || '') === name
                        );
                    }

                    console.log(`[StatClick] Şöbə: "${name}" → ${filteredTasks.length} task`);
                    openStatTasks(filteredTasks, `${name} — Şöbə Taskları`, 'purple');
                });
            });
        };

        /* ── TaskType ── */
        const origTaskType = rm.updateTaskTypeStats.bind(rm);
        rm.updateTaskTypeStats = function () {
            origTaskType();
            const listEl = this.elements.taskTypeStats;
            if (!listEl) return;
            const taskTypes = this.data.taskTypes || [];
            enrichTasksWithMetadata(this.data.tasks || []);
            listEl.querySelectorAll('.stat-item').forEach(item => {
                addHoverStyle(item);
                item.addEventListener('click', () => {
                    const name = (item.querySelector('.stat-name') || {}).textContent?.trim() || '';
                    const type = taskTypes.find(tp => (tp.name || '') === name);
                    const tasks = this.data.tasks || [];

                    let filteredTasks;
                    if (type) {
                        const tid = String(type.id);
                        filteredTasks = tasks.filter(t =>
                            String(t.work_type_id) === tid ||
                            String(t.task_type_id) === tid
                        );
                        if (!filteredTasks.length) {
                            filteredTasks = tasks.filter(t =>
                                (t.work_type_name || '') === name ||
                                (t.task_type_name || '') === name
                            );
                        }
                    } else {
                        filteredTasks = tasks.filter(t =>
                            (t.work_type_name || '') === name ||
                            (t.task_type_name || '') === name
                        );
                    }

                    console.log(`[StatClick] İş növü: "${name}" → ${filteredTasks.length} task`);
                    openStatTasks(filteredTasks, `${name} — İş Növü Taskları`, 'teal');
                });
            });
        };

        /* ── Partner ── */
        const origPartner = rm.updatePartnerStats.bind(rm);
        rm.updatePartnerStats = function () {
            origPartner();
            const listEl = this.elements.partnerStats;
            if (!listEl) return;
            const partners = this.data.partners || [];
            const partnerTasks = this.data.partnerTasks || [];
            listEl.querySelectorAll('.stat-item').forEach(item => {
                addHoverStyle(item);
                item.addEventListener('click', () => {
                    const name = (item.querySelector('.stat-name') || {}).textContent?.trim() || '';
                    const partner = partners.find(p =>
                        (p.partner_name || p.partner_company_name || p.name || '') === name);

                    let filteredTasks;
                    if (partner) {
                        const pid  = String(partner.partner_company_id || partner.id || '');
                        const pid2 = String(partner.id || '');
                        filteredTasks = partnerTasks.filter(t =>
                            String(t.partner_company_id) === pid  ||
                            String(t.partner_company_id) === pid2 ||
                            String(t.partner_id)         === pid  ||
                            String(t.partner_id)         === pid2
                        );
                        if (!filteredTasks.length) {
                            filteredTasks = partnerTasks.filter(t =>
                                (t.partner_name || t.partner_company_name || '') === name
                            );
                        }
                    } else {
                        filteredTasks = partnerTasks.filter(t =>
                            (t.partner_name || t.partner_company_name || '') === name
                        );
                    }

                    console.log(`[StatClick] Partner: "${name}" → ${filteredTasks.length} task`);
                    openStatTasks(filteredTasks, `${name} — Partner Taskları`, 'amber');
                });
            });
        };

        console.log('✅ report_stats_click_patch v2 aktiv (metadata enrich daxil)');
    }

    /* ── Init ─────────────────────────────────────────────── */
    function tryPatch(attempt) {
        if (window.reportManager) {
            patchReportManager();
        } else if (attempt < 50) {
            setTimeout(() => tryPatch(attempt + 1), 200);
        } else {
            console.warn('report_stats_click_patch: reportManager tapılmadı');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => tryPatch(0));
    } else {
        tryPatch(0);
    }

})();