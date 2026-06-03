// ========================================
// REPORT CARDS MANAGER v4 — reportCardsManager.js
// ========================================

(function () {
    'use strict';

    // ── STATUS FİLTERLƏRİ ───────────────────────────────────────────
    // Bütün tapşırıqlar: tasks + archiveTasks birlikdə
    const STATUS_GROUPS = {
        total: {
            label : 'Ümumi Tapşırıqlar',
            icon  : 'fa-layer-group',
            // tasks + archiveTasks
            filter: () => true,
            useAll: true,
        },
        completed: {
            label : 'Tamamlanan',
            icon  : 'fa-check-circle',
            filter: t => t.status === 'completed',
            useAll: true,  // arxivdən də gətir
        },
        pending: {
            label : 'İcra Gözləmə',
            icon  : 'fa-clock',
            filter: t => t.status === 'pending' || t.status === 'waiting',
            useAll: false,
        },
        in_progress: {
            label : 'İcra Edilir',
            icon  : 'fa-spinner',
            filter: t => t.status === 'in_progress',
            useAll: false,
        },
        overdue: {
            label : 'Müddəti Keçən',
            icon  : 'fa-exclamation-triangle',
            filter: t => {
                const safe = ['pending', 'overdue'];
                return t.status === 'overdue' ||
                    (safe.includes(t.status) && t.due_date && new Date(t.due_date) < new Date());
            },
            useAll: false,
        },
        rejected: {
            label : 'Rədd Edilən',
            icon  : 'fa-times-circle',
            filter: t => t.status === 'rejected' || t.status === 'refused',
            useAll: true,  // arxivdən də gətir
        },
        cancelled: {
            label : 'Ləğv Edilən',
            icon  : 'fa-ban',
            filter: t => t.status === 'cancelled' || t.status === 'canceled',
            useAll: true,  // arxivdən də gətir
        },
        approval_pending: {
            label : 'Təsdiq Gözləyən',
            icon  : 'fa-user-clock',
            filter: t => t.status === 'pending_approval' || t.status === 'approval_overdue',
            useAll: false,
        },
    };

    // data-type → group key
    const TYPE_MAP = {
        'total'            : 'total',
        'completed'        : 'completed',
        'pending'          : 'pending',
        'waiting'          : 'pending',
        'in-progress'      : 'in_progress',
        'in_progress'      : 'in_progress',
        'overdue'          : 'overdue',
        'refused'          : 'rejected',
        'rejected'         : 'rejected',
        'cancelled'        : 'cancelled',
        'canceled'         : 'cancelled',
        'approval-pending' : 'approval_pending',
        'approvalPending'  : 'approval_pending',
        'approval_pending' : 'approval_pending',
        'pending-approval' : 'approval_pending',
    };

    // ────────────────────────────────────────────────────────────────
    class ReportCardsManager {

        constructor(manager) {
            this.manager = manager;
            this._listModal   = null;
            this._detailModal = null;

            this._injectStyles();
            this._buildListModal();
            this._buildDetailModal();
            this._bindDelegation();
            this._bindEsc();
        }

        // ── EVENT DELEGATION ────────────────────────────────────
        _bindDelegation() {
            document.addEventListener('click', e => {
                const card = e.target.closest('.report-card[data-type]');
                if (!card) return;
                if (e.target.closest('.rcm-modal')) return;

                const key = TYPE_MAP[card.dataset.type];
                if (!key) {
                    console.warn(`[RCM] Tanınmayan data-type="${card.dataset.type}"`);
                    return;
                }
                this._openList(key);
            });

            // Cursor style
            const styleCards = () => {
                document.querySelectorAll('.report-card[data-type]').forEach(c => {
                    c.style.cursor = 'pointer';
                });
            };
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', styleCards);
            } else {
                styleCards();
            }
        }

        // ── KARTLARDAKI SAYI YENİLƏ ────────────────────────────
        updateCounts() {
            const tasks    = this._tasks();
            const allTasks = this._allTasks(); // tasks + archive
            if (!allTasks.length && !tasks.length) return;

            document.querySelectorAll('.report-card[data-type]').forEach(card => {
                const key   = TYPE_MAP[card.dataset.type];
                if (!key) return;
                const group = STATUS_GROUPS[key];
                if (!group) return;

                const pool  = group.useAll ? allTasks : tasks;
                const count = pool.filter(group.filter).length;
                const total = allTasks.length || 1;
                const pct   = key === 'total' ? 100 : Math.round(count / total * 100);

                const countEl = card.querySelector(
                    '[id$="TasksCount"],[id$="tasksCount"],[id$="Count"],.report-card-value'
                );
                if (countEl) countEl.textContent = count;

                const pctEl = card.querySelector('[id$="Percentage"]');
                if (pctEl) pctEl.textContent = `${pct}%`;

                const barEl = card.querySelector('.progress-fill');
                if (barEl) barEl.style.width = `${pct}%`;
            });
        }

        // ── LIST MODAL AÇ ───────────────────────────────────────
        _openList(groupKey) {
            const group    = STATUS_GROUPS[groupKey];
            if (!group) return;

            const pool     = group.useAll ? this._allTasks() : this._tasks();
            const tasks    = pool.filter(group.filter);
            const allTotal = this._allTasks().length || 1;
            const pct      = groupKey === 'total' ? 100 : Math.round(tasks.length / allTotal * 100);

            const m = this._listModal;
            m.querySelector('.rcm-lm-title').innerHTML =
                `<i class="fas ${group.icon}"></i> ${group.label}`;
            m.querySelector('.rcm-lm-count').textContent = tasks.length;
            m.querySelector('.rcm-lm-pct').textContent   =
                groupKey === 'total' ? 'bütün tapşırıqlar' : `ümuminin ${pct}%-i`;

            const tbody = m.querySelector('.rcm-lm-tbody');

            if (!tasks.length) {
                tbody.innerHTML = `
                    <tr><td colspan="6" class="rcm-empty">
                        <i class="fas fa-inbox"></i>
                        <p>Bu kateqoriyada tapşırıq yoxdur</p>
                    </td></tr>`;
            } else {
                tbody.innerHTML = tasks.map(t => `
                    <tr class="rcm-row" data-id="${t.id}" data-pool="${group.useAll ? 'all' : 'tasks'}" tabindex="0">
                        <td class="rcm-td rcm-td--main">
                            <span class="rcm-tname">${t.task_title || t.name || '—'}</span>
                            ${t.task_code ? `<span class="rcm-tcode">#${t.task_code}</span>` : ''}
                        </td>
                        <td class="rcm-td">${t.company_name || '—'}</td>
                        <td class="rcm-td">${t.assignee_name || t.assigned_to_name || t.creator_name || '—'}</td>
                        <td class="rcm-td">${this._priorityBadge(t.priority)}</td>
                        <td class="rcm-td">${this._fmtDate(t.due_date || t.archived_at)}</td>
                        <td class="rcm-td">${this._statusBadge(t.status)}</td>
                    </tr>`).join('');

                tbody.querySelectorAll('.rcm-row').forEach(row => {
                    const go = () => {
                        const task = tasks.find(x => String(x.id) === row.dataset.id);
                        if (task) this._openDetail(task);
                    };
                    row.addEventListener('click', go);
                    row.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
                });
            }

            this._show(m);
        }

        // ── DETAIL MODAL AÇ ─────────────────────────────────────
        _openDetail(task) {
            const m = this._detailModal;

            m.querySelector('.rcm-dm-title').textContent = task.task_title || task.name || '—';
            m.querySelector('.rcm-dm-code').textContent  = task.task_code ? `#${task.task_code}` : '';
            m.querySelector('.rcm-dm-status').innerHTML  = this._statusBadge(task.status);

            const rows = [
                ['Şirkət',         task.company_name],
                ['İcraçı',         task.assignee_name || task.assigned_to_name || task.creator_name],
                ['Şöbə',           task.department_name],
                ['İş növü',        task.work_type_name],
                ['Prioritet',      this._priorityText(task.priority)],
                ['Başlama tarixi', this._fmtDate(task.created_at)],
                ['Son müddət',     this._fmtDate(task.due_date)],
                ['Tamamlandı',     this._fmtDate(task.completed_date)],
                ['Arxivləndi',     this._fmtDate(task.archived_at)],
                ['Arxiv səbəbi',   task.archive_reason],
                ['Faktiki saat',   task.actual_hours     != null ? `${task.actual_hours} saat` : null],
                ['Təxmini saat',   task.estimated_hours  != null ? `${task.estimated_hours} saat` : null],
                ['İrəliləyiş',     task.progress_percentage != null ? `${task.progress_percentage}%` : null],
                ['Ödənişli',       task.is_billable != null ? (task.is_billable ? 'Bəli' : 'Xeyr') : null],
                ['Qiymət/saat',    task.billing_rate ? `${task.billing_rate} ₼` : null],
            ].filter(([, v]) => v != null && v !== '');

            m.querySelector('.rcm-dm-fields').innerHTML = rows.map(([lbl, val]) => `
                <div class="rcm-dm-field">
                    <span class="rcm-dm-flabel">${lbl}</span>
                    <span class="rcm-dm-fval">${val}</span>
                </div>`).join('');

            const descWrap = m.querySelector('.rcm-dm-desc');
            if (task.task_description) {
                descWrap.style.display = 'block';
                m.querySelector('.rcm-dm-dtext').textContent = task.task_description;
            } else {
                descWrap.style.display = 'none';
            }

            this._show(m);
        }

        // ── MƏLUMAT ─────────────────────────────────────────────
        // Yalnız aktiv tasks (tasks array)
        _tasks() {
            return window.reportManager?.data?.tasks || [];
        }

        // Tasks + archiveTasks birlikdə (deduplicate)
        _allTasks() {
            const tasks   = window.reportManager?.data?.tasks        || [];
            const archive = window.reportManager?.data?.archiveTasks || [];

            // Archive-dən yalnız tasks-da olmayanları əlavə et
            const taskIds = new Set(tasks.map(t => t.id));
            const extraArchive = archive.filter(t => !taskIds.has(t.id));

            return [...tasks, ...extraArchive];
        }

        // ── MODAL YARAT ─────────────────────────────────────────
        _buildListModal() {
            this._listModal = this._el(`
<div class="rcm-modal" id="rcmListModal" role="dialog" aria-modal="true">
  <div class="rcm-overlay"></div>
  <div class="rcm-panel rcm-panel--wide">
    <div class="rcm-head">
      <div class="rcm-head-l">
        <h2 class="rcm-lm-title"></h2>
        <div class="rcm-head-meta">
          <span class="rcm-badge rcm-lm-count"></span>
          <span class="rcm-muted rcm-lm-pct"></span>
        </div>
      </div>
      <button class="rcm-xbtn rcm-close-list" aria-label="Bağla"><i class="fas fa-times"></i></button>
    </div>
    <div class="rcm-body">
      <div class="rcm-scrollx">
        <table class="rcm-table">
          <thead><tr>
            <th>Tapşırıq</th><th>Şirkət</th><th>İcraçı</th>
            <th>Prioritet</th><th>Tarix</th><th>Status</th>
          </tr></thead>
          <tbody class="rcm-lm-tbody"></tbody>
        </table>
      </div>
    </div>
  </div>
</div>`);
            document.body.appendChild(this._listModal);
            this._listModal.querySelector('.rcm-overlay').addEventListener('click',    () => this._hide(this._listModal));
            this._listModal.querySelector('.rcm-close-list').addEventListener('click', () => this._hide(this._listModal));
        }

        _buildDetailModal() {
            this._detailModal = this._el(`
<div class="rcm-modal rcm-modal--center" id="rcmDetailModal" role="dialog" aria-modal="true">
  <div class="rcm-overlay"></div>
  <div class="rcm-panel rcm-panel--narrow">
    <div class="rcm-head">
      <div class="rcm-head-l">
        <h2 class="rcm-dm-title"></h2>
        <span class="rcm-muted rcm-dm-code"></span>
      </div>
      <div class="rcm-head-r">
        <span class="rcm-dm-status"></span>
        <button class="rcm-xbtn rcm-close-detail" aria-label="Bağla"><i class="fas fa-times"></i></button>
      </div>
    </div>
    <div class="rcm-body">
      <div class="rcm-dm-fields"></div>
      <div class="rcm-dm-desc" style="display:none">
        <h4 class="rcm-dm-dhead"><i class="fas fa-align-left"></i> Təsvir</h4>
        <p class="rcm-dm-dtext"></p>
      </div>
    </div>
  </div>
</div>`);
            document.body.appendChild(this._detailModal);
            this._detailModal.querySelector('.rcm-overlay').addEventListener('click',      () => this._hide(this._detailModal));
            this._detailModal.querySelector('.rcm-close-detail').addEventListener('click', () => this._hide(this._detailModal));
        }

        // ── SHOW / HIDE ─────────────────────────────────────────
        _show(m) { m.classList.add('rcm-open'); document.body.style.overflow = 'hidden'; }
        _hide(m) {
            m.classList.remove('rcm-open');
            if (!document.querySelector('.rcm-modal.rcm-open')) document.body.style.overflow = '';
        }
        _bindEsc() {
            document.addEventListener('keydown', e => {
                if (e.key !== 'Escape') return;
                if (this._detailModal?.classList.contains('rcm-open')) this._hide(this._detailModal);
                else if (this._listModal?.classList.contains('rcm-open'))  this._hide(this._listModal);
            });
        }

        // ── KÖMƏKÇI ─────────────────────────────────────────────
        _statusBadge(s) { return `<span class="rcm-sb rcm-sb--${this._sCls(s)}">${this._sTxt(s)}</span>`; }
        _sCls(s) {
            return { completed:'completed', pending:'pending', in_progress:'progress',
                     overdue:'overdue', rejected:'rejected', refused:'rejected',
                     cancelled:'cancelled', canceled:'cancelled',
                     pending_approval:'approval', approval_overdue:'approval' }[s] || 'default';
        }
        _sTxt(s) {
            return { completed:'Tamamlanıb', pending:'Gözləmədə', in_progress:'İcra edilir',
                     overdue:'Müddəti keçib', rejected:'Rədd edilib', refused:'Rədd edilib',
                     cancelled:'Ləğv edilib', canceled:'Ləğv edilib',
                     pending_approval:'Təsdiq gözləyir', approval_overdue:'Təsdiq gecikib' }[s] || (s || '—');
        }
        _priorityBadge(p) { return `<span class="rcm-pb rcm-pb--${p||'default'}">${this._priorityText(p)}</span>`; }
        _priorityText(p)  { return { critical:'Kritik', high:'Yüksək', medium:'Orta', low:'Aşağı' }[p] || (p||'—'); }
        _fmtDate(d) {
            if (!d) return '—';
            const dt = new Date(d);
            if (isNaN(dt)) return '—';
            return dt.toLocaleDateString('az-AZ', { day:'2-digit', month:'2-digit', year:'numeric' });
        }
        _el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }

        // ── CSS ─────────────────────────────────────────────────
        _injectStyles() {
            if (document.getElementById('rcm-styles')) return;
            const s = document.createElement('style');
            s.id = 'rcm-styles';
            s.textContent = `
.rcm-modal{position:fixed;inset:0;z-index:99900;display:flex;align-items:flex-end;justify-content:center;visibility:hidden;pointer-events:none}
.rcm-modal.rcm-open{visibility:visible;pointer-events:all}
.rcm-modal--center{align-items:center}
.rcm-overlay{position:absolute;inset:0;background:rgba(2,6,23,.76);backdrop-filter:blur(4px);opacity:0;cursor:pointer;transition:opacity .26s}
.rcm-modal.rcm-open .rcm-overlay{opacity:1}
.rcm-panel{position:relative;z-index:1;background:#1e293b;border:1px solid rgba(148,163,184,.1);box-shadow:0 28px 90px rgba(0,0,0,.75);display:flex;flex-direction:column;max-height:88vh;transform:translateY(28px) scale(.98);opacity:0;transition:transform .3s cubic-bezier(.34,1.4,.64,1),opacity .26s;overflow:hidden}
.rcm-panel--wide{width:100%;max-width:1080px;border-radius:20px 20px 0 0}
.rcm-panel--narrow{width:100%;max-width:640px;border-radius:20px}
.rcm-modal--center .rcm-panel{border-radius:20px}
.rcm-modal.rcm-open .rcm-panel{transform:translateY(0) scale(1);opacity:1}
.rcm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 24px 14px;border-bottom:1px solid rgba(148,163,184,.09);flex-shrink:0}
.rcm-head-l{flex:1;min-width:0}.rcm-head-r{display:flex;align-items:center;gap:10px;flex-shrink:0}
.rcm-head h2{font-size:17px;font-weight:700;color:#e2e8f0;margin:0 0 5px;display:flex;align-items:center;gap:9px}
.rcm-head h2 i{font-size:15px;opacity:.75}
.rcm-head-meta{display:flex;align-items:center;gap:10px}
.rcm-badge{background:#263044;color:#e2e8f0;font-size:12px;font-weight:700;padding:2px 10px;border-radius:99px}
.rcm-muted{font-size:12px;color:#64748b}
.rcm-xbtn{width:30px;height:30px;border-radius:50%;border:1px solid rgba(148,163,184,.14);background:transparent;color:#64748b;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;transition:background .14s,color .14s}
.rcm-xbtn:hover{background:#263044;color:#e2e8f0}
.rcm-body{overflow-y:auto;flex:1}
.rcm-body::-webkit-scrollbar{width:4px}
.rcm-body::-webkit-scrollbar-thumb{background:#334155;border-radius:99px}
.rcm-scrollx{overflow-x:auto}
.rcm-scrollx::-webkit-scrollbar{height:4px}
.rcm-scrollx::-webkit-scrollbar-thumb{background:#334155;border-radius:99px}
.rcm-table{width:100%;border-collapse:collapse}
.rcm-table thead th{padding:10px 15px;font-size:10.5px;text-transform:uppercase;letter-spacing:.55px;color:#475569;background:#172033;border-bottom:1px solid rgba(148,163,184,.08);text-align:left;font-weight:600;white-space:nowrap}
.rcm-td{padding:12px 15px;font-size:13px;color:#cbd5e1;border-bottom:1px solid rgba(148,163,184,.06);vertical-align:middle}
.rcm-td--main{min-width:190px}
.rcm-row{cursor:pointer;outline:none;transition:background .13s}
.rcm-row:hover,.rcm-row:focus{background:rgba(38,48,68,.7)}
.rcm-tname{display:block;font-weight:600;color:#e2e8f0}
.rcm-tcode{display:block;font-size:11px;color:#475569;margin-top:2px;font-family:monospace}
.rcm-empty{text-align:center;padding:60px 20px!important;color:#475569}
.rcm-empty i{font-size:28px;display:block;margin-bottom:10px;opacity:.3}
.rcm-empty p{margin:0;font-size:13px}
.rcm-sb{display:inline-flex;align-items:center;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;white-space:nowrap}
.rcm-sb--completed{background:rgba(16,185,129,.14);color:#34d399}
.rcm-sb--pending{background:rgba(245,158,11,.14);color:#fbbf24}
.rcm-sb--progress{background:rgba(99,102,241,.14);color:#818cf8}
.rcm-sb--overdue{background:rgba(239,68,68,.14);color:#f87171}
.rcm-sb--rejected{background:rgba(244,63,94,.14);color:#fb7185}
.rcm-sb--cancelled{background:rgba(100,116,139,.14);color:#94a3b8}
.rcm-sb--approval{background:rgba(168,85,247,.14);color:#c084fc}
.rcm-sb--default{background:rgba(148,163,184,.09);color:#94a3b8}
.rcm-pb{display:inline-flex;align-items:center;padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap}
.rcm-pb--critical{background:rgba(220,38,38,.17);color:#fca5a5}
.rcm-pb--high{background:rgba(239,68,68,.13);color:#f87171}
.rcm-pb--medium{background:rgba(245,158,11,.13);color:#fbbf24}
.rcm-pb--low{background:rgba(16,185,129,.13);color:#6ee7b7}
.rcm-pb--default{background:rgba(148,163,184,.09);color:#94a3b8}
.rcm-dm-fields{display:grid;grid-template-columns:1fr 1fr;padding:4px 0}
.rcm-dm-field{padding:11px 24px;border-bottom:1px solid rgba(148,163,184,.07);display:flex;flex-direction:column;gap:4px}
.rcm-dm-field:nth-child(odd){border-right:1px solid rgba(148,163,184,.07)}
.rcm-dm-flabel{font-size:10px;text-transform:uppercase;letter-spacing:.45px;color:#475569}
.rcm-dm-fval{font-size:13.5px;font-weight:600;color:#e2e8f0}
.rcm-dm-code{font-size:12px;font-family:monospace;display:block;margin-top:2px}
.rcm-dm-desc{padding:14px 24px 22px}
.rcm-dm-dhead{font-size:11px;color:#475569;font-weight:600;margin:0 0 8px;display:flex;align-items:center;gap:7px;text-transform:uppercase;letter-spacing:.4px}
.rcm-dm-dtext{font-size:13.5px;color:#94a3b8;line-height:1.7;margin:0;white-space:pre-wrap}
.report-card[data-type]{cursor:pointer!important;transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s ease!important}
.report-card[data-type]:hover{transform:translateY(-3px)!important;box-shadow:0 8px 28px rgba(0,0,0,.4)!important}
@media(max-width:680px){
  .rcm-panel--wide,.rcm-panel--narrow{max-width:100%}
  .rcm-panel--narrow,.rcm-modal--center .rcm-panel{border-radius:20px 20px 0 0}
  .rcm-modal--center{align-items:flex-end}
  .rcm-dm-fields{grid-template-columns:1fr}
  .rcm-dm-field:nth-child(odd){border-right:none}
  .rcm-table{min-width:560px}
}`;
            document.head.appendChild(s);
        }
    }

    // ── EXPORT ─────────────────────────────────────────────────────
    window.ReportModules = window.ReportModules || {};
    window.ReportModules.CardsManager = ReportCardsManager;

    // ── AUTO INIT ──────────────────────────────────────────────────
    function init() {
        if (window._rcmInstance) return;
        const mgr = new ReportCardsManager(window.reportManager || {});
        window._rcmInstance = mgr;

        const patch = () => {
            if (!window.reportManager || window.reportManager._rcmPatched) return;
            window.reportManager._rcmPatched = true;

            const _orig = window.reportManager.updateUI?.bind(window.reportManager);
            if (_orig) {
                window.reportManager.updateUI = function () {
                    _orig();
                    setTimeout(() => mgr.updateCounts(), 80);
                };
            }
            mgr.updateCounts();
        };

        let n = 0;
        const poll = setInterval(() => {
            n++;
            patch();
            if (window.reportManager?.data?.tasks?.length || window.reportManager?.data?.archiveTasks?.length) {
                mgr.updateCounts();
                clearInterval(poll);
            }
            if (n > 30) clearInterval(poll);
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();