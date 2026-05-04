/* ============================================
   USER REPORT EXPORTER - userReportExporter.js
   GF44 Professional Report System
   Excel (XLSX) + PDF (print) export
   Version: 2.0 (Layout & Task Details Enhanced)
   ============================================ */

const UserReportExporter = (() => {

    /* ==========================================
       HELPER FUNCTIONS
    ========================================== */
    function fmtDate(date) {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d)) return '-';
        const day   = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year  = d.getFullYear();
        return `${day}.${month}.${year}`;
    }

    function statusLabel(status) {
        const map = {
            completed:        'Tamamlandı',
            pending:          'Gözləyir',
            in_progress:      'Davam edir',
            overdue:          'Gecikmiş',
            rejected:         'İmtina',
            waiting_approval: 'Təsdiq gözləyir'
        };
        return map[status] || status || '-';
    }

    function calcDuration(t) {
        if (t.completed_date && t.created_at) {
            const days = Math.round(
                (new Date(t.completed_date) - new Date(t.created_at)) / 86400000
            );
            return `${days} gün`;
        }
        return '-';
    }

    function getPriorityLabel(priority) {
        const map = {
            high: 'Yüksək',
            medium: 'Orta',
            low: 'Aşağı'
        };
        return map[priority] || priority || '-';
    }

    /* ==========================================
       EXCEL EXPORT
    ========================================== */
    function toExcel(userData, allEmployees) {
        if (typeof XLSX === 'undefined') {
            alert('XLSX kitabxanası yüklənməyib. Səhifəni yenidən yükləyin.');
            return;
        }

        const wb   = XLSX.utils.book_new();
        const d    = userData;
        const emp  = d.employee || {};
        const name = emp.name && emp.surname
            ? `${emp.name} ${emp.surname}`
            : (emp.ceo_name || 'İstifadəçi');

        const userInitial = (emp.name || emp.ceo_name || '?')[0].toUpperCase();

        /* ---- SHEET 1: ÜMUMİ XÜLASƏ (Profil + Logo layout) ---- */
        const summaryRows = [
            // Sətir 1: Sol tərəfdə Profil, Sağ tərəfdə Logo
            ['İstifadəçi Profili', '', '', 'GF44'],
            [`Ad: ${name}`, '', '', 'İkonca'],
            [`Baş Hərf: ${userInitial}`, '', '', ''],
            [`Vəzifə: ${emp.position || '-'}`, '', '', ''],
            [`Şöbə: ${emp.department_name || '-'}`, '', '', ''],
            ['', '', '', ''],
            // Xülasə məlumatları
            ['GÖSTƏRİCİ', 'DƏYƏR', 'FAİZ', 'QEYD'],
            ['Ümumi task',              d.total,              '100%',  ''],
            ['Tamamlanan',             d.completed,           `${d.completionRate}%`,  ''],
            ['Gözləyən',               d.pending,             `${d.total ? Math.round(d.pending/d.total*100) : 0}%`, ''],
            ['Davam edir',             d.inProgress,          `${d.total ? Math.round(d.inProgress/d.total*100) : 0}%`, ''],
            ['Gecikmiş',               d.overdue,             `${d.total ? Math.round(d.overdue/d.total*100) : 0}%`, ''],
            ['İmtina edilmiş',         d.rejected,            `${d.total ? Math.round(d.rejected/d.total*100) : 0}%`, ''],
            ['Təsdiq gözləyir',        d.waitingApproval,     `${d.total ? Math.round(d.waitingApproval/d.total*100) : 0}%`, ''],
            ['', '', '', ''],
            ['Orta icra müddəti (gün)', d.avgCompDays, '', ''],
            ['Vaxtında bitirmə %',      `${d.ontimeRate}%`, '', ''],
            ['Reytinq',                 `${d.currentRank} / ${d.totalPeers}`, '', 'Tamamlanan task sayına görə'],
            ['Yaratdığı tasklar',       d.createdByUser.length, '', ''],
        ];
        const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
        ws1['!cols'] = [{wch:28},{wch:20},{wch:12},{wch:30}];
        // Stil tətbiqi (başlıq və loqo)
        if(ws1['A1']) ws1['A1'].s = { font: { bold: true, sz: 14, color: { rgb: '1E40AF' } } };
        if(ws1['D1']) ws1['D1'].s = { font: { bold: true, sz: 18, color: { rgb: '2563EB' } }, alignment: { horizontal: 'right' } };
        if(ws1['D2']) ws1['D2'].s = { font: { italic: true, sz: 10 }, alignment: { horizontal: 'right' } };
        _styleSectionTitle(ws1, 'A7');
        XLSX.utils.book_append_sheet(wb, ws1, 'Xülasə');

        /* ---- SHEET 2: BÜTÜN TASKLAR (Detallı) ---- */
        const taskHeader = [
            'N', 'Task adı', 'Task kodu', 'Şirkət', 'Status',
            'Yaradılma tarixi', 'Son müddət', 'Tamamlanma tarixi', 'İcra müddəti', 'Prioritet'
        ];
        const taskRows = d.tasks.map((t, i) => [
            i + 1,
            t.task_title || '-',
            t.task_code  || '-',
            t.company_name || '-',
            statusLabel(t.status),
            fmtDate(t.created_at),
            fmtDate(t.due_date),
            fmtDate(t.completed_date),
            calcDuration(t),
            getPriorityLabel(t.priority)
        ]);
        const ws2 = XLSX.utils.aoa_to_sheet([taskHeader, ...taskRows]);
        ws2['!cols'] = [
            {wch:5},{wch:35},{wch:14},{wch:22},{wch:16},
            {wch:16},{wch:16},{wch:18},{wch:14},{wch:12}
        ];
        _styleHeader(ws2, 'A1');
        XLSX.utils.book_append_sheet(wb, ws2, 'Tasklar');

        /* ---- SHEET 3: YARATDIĞI TASKLAR ---- */
        if (d.createdByUser.length) {
            const cHeader = [
                'N', 'Task adı', 'Şirkət', 'İcraçı', 'Status', 'Yaradılma tarixi'
            ];
            const cRows = d.createdByUser.map((t, i) => [
                i + 1,
                t.task_title || '-',
                t.company_name || '-',
                t.assignee_name || '-',
                statusLabel(t.status),
                fmtDate(t.created_at)
            ]);
            const ws3 = XLSX.utils.aoa_to_sheet([cHeader, ...cRows]);
            ws3['!cols'] = [{wch:5},{wch:35},{wch:22},{wch:22},{wch:16},{wch:16}];
            _styleHeader(ws3, 'A1');
            XLSX.utils.book_append_sheet(wb, ws3, 'Yaratdığı Tasklar');
        }

        /* ---- SHEET 4: ŞİRKƏTLƏR ---- */
        if (d.companies.length) {
            const compHeader = ['Şirkət', 'Task sayı', 'Faiz (%)'];
            const compRows   = d.companies.map(c => [
                c.name,
                c.count,
                d.total ? `${Math.round(c.count/d.total*100)}%` : '0%'
            ]);
            const ws4 = XLSX.utils.aoa_to_sheet([compHeader, ...compRows]);
            ws4['!cols'] = [{wch:30},{wch:12},{wch:10}];
            _styleHeader(ws4, 'A1');
            XLSX.utils.book_append_sheet(wb, ws4, 'Şirkətlər');
        }

        /* ---- SHEET 5: AYLIK PERFORMANS ---- */
        const months = ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'];
        const monthHeader = ['Ay', 'Ümumi', 'Tamamlanan', 'Tamamlanma %'];
        const monthRows   = Object.entries(d.monthlyMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([ym, v]) => {
                const [y, m] = ym.split('-');
                const rate   = v.total ? Math.round(v.completed/v.total*100) : 0;
                return [`${months[parseInt(m)-1]} ${y}`, v.total, v.completed, `${rate}%`];
            });
        const ws5 = XLSX.utils.aoa_to_sheet([monthHeader, ...monthRows]);
        ws5['!cols'] = [{wch:16},{wch:10},{wch:12},{wch:14}];
        _styleHeader(ws5, 'A1');
        XLSX.utils.book_append_sheet(wb, ws5, 'Aylıq Performans');

        /* ---- SHEET 6: MÜQAYİSƏ (TOP 20) ---- */
        if (d.peersData.length) {
            const compHeader2 = ['Yer', 'İşçi', 'Şöbə', 'Ümumi Task', 'Tamamlanan', 'Tamamlanma %', 'Qeyd'];
            const compRows2   = d.peersData.slice(0, 20).map((p, i) => [
                i + 1,
                p.name,
                p.department,
                p.total,
                p.completed,
                `${p.rate}%`,
                p.isCurrent ? '← Bu işçi' : ''
            ]);
            const ws6 = XLSX.utils.aoa_to_sheet([compHeader2, ...compRows2]);
            ws6['!cols'] = [{wch:6},{wch:25},{wch:20},{wch:12},{wch:12},{wch:14},{wch:12}];
            _styleHeader(ws6, 'A1');
            XLSX.utils.book_append_sheet(wb, ws6, 'Müqayisə (Top 20)');
        }

        /* ---- FILENAME & WRITE ---- */
        const today   = fmtDate(new Date()).replace(/\./g, '-');
        const safeName = name.replace(/[^\w\s]/g, '').replace(/\s+/g, '_');
        XLSX.writeFile(wb, `GF44_Hesabat_${safeName}_${today}.xlsx`);
    }

    /* ==========================================
       CELL STYLES (basic XLSX)
    ========================================== */
    function _styleHeader(ws, ref) {
        if (!ws[ref]) return;
        ws[ref].s = {
            font:    { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
            fill:    { fgColor: { rgb: '1E40AF' } },
            alignment: { horizontal: 'center' }
        };
    }

    function _styleSectionTitle(ws, ref) {
        if (!ws[ref]) return;
        ws[ref].s = {
            font: { bold: true, sz: 11, color: { rgb: '1E40AF' } },
            fill: { fgColor: { rgb: 'DBEAFE' } }
        };
    }

    /* ==========================================
       PDF EXPORT (print-based, professional)
       Layout: User Profile (Left) + GF44 Logo (Right)
    ========================================== */
    function toPDF(userData, allEmployees) {
        const d    = userData;
        const emp  = d.employee || {};
        const name = emp.name && emp.surname
            ? `${emp.name} ${emp.surname}`
            : (emp.ceo_name || 'İstifadəçi');
        const userInitial = (emp.name || emp.ceo_name || '?')[0].toUpperCase();
        const position = emp.position || '-';
        const department = emp.department_name || '-';
        const companyCode = emp.company_code || '';

        const months = ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'];

        const monthlyRows = Object.entries(d.monthlyMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([ym, v]) => {
                const [y, m] = ym.split('-');
                const rate   = v.total ? Math.round(v.completed/v.total*100) : 0;
                return `
                <tr>
                    <td>${months[parseInt(m)-1]} ${y}</td>
                    <td class="num">${v.total}</td>
                    <td class="num">${v.completed}</td>
                    <td class="num">${rate}%</td>
                </tr>`;
            }).join('');

        // Task siyahısı - BÜTÜN DETALLAR alt-alta
        const taskRows = d.tasks.slice(0, 50).map((t, i) => {
            const isLate = t.status === 'overdue' ||
                (t.due_date && !t.completed_date && new Date(t.due_date) < new Date());
            return `
            <tr class="${isLate ? 'row-late' : ''}">
                <td class="num">${i+1}</td>
                <td><strong>${t.task_title || '-'}</strong><br><span style="font-size:10px; color:#666;">Kod: ${t.task_code || '-'}</span></td>
                <td>${t.company_name || '-'}</td>
                <td><span class="badge badge-${t.status || 'pending'}">${statusLabel(t.status)}</span></td>
                <td class="num">${fmtDate(t.created_at)}</td>
                <td class="num">${fmtDate(t.due_date)}</td>
                <td class="num">${fmtDate(t.completed_date)}</td>
                <td class="num">${calcDuration(t)}</td>
                <td class="num">${getPriorityLabel(t.priority)}</td>
            </tr>`;
        }).join('');

        const comparisonRows = d.peersData.slice(0, 15).map((p, i) => `
            <tr ${p.isCurrent ? 'class="highlight"' : ''}>
                <td class="num">${i+1}</td>
                <td>${p.name}${p.isCurrent ? ' <strong>(Siz)</strong>' : ''}</td>
                <td>${p.department}</td>
                <td class="num">${p.total}</td>
                <td class="num">${p.completed}</td>
                <td class="num">${p.rate}%</td>
            </tr>`).join('');

        const html = `<!DOCTYPE html>
<html lang="az">
<head>
<meta charset="UTF-8">
<title>GF44 — ${name} Hesabatı</title>
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #1e293b; background: #fff; font-size: 13px; }
    @page { size: A4; margin: 18mm 15mm; }
    @media print { .no-print { display: none; } }

    /* HEADER: Profil Sol, Logo Sağ */
    .pdf-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 18px 24px; background: linear-gradient(135deg,#1e40af,#3b82f6);
        color: #fff; border-radius: 8px; margin-bottom: 20px;
    }
    .profile-area {
        display: flex; align-items: center; gap: 20px;
    }
    .pdf-avatar {
        width: 56px; height: 56px; border-radius: 50%;
        background: rgba(255,255,255,0.25); display: flex;
        align-items: center; justify-content: center;
        font-size: 22px; font-weight: 700; border: 2px solid rgba(255,255,255,0.5);
        flex-shrink: 0;
    }
    .user-info h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .user-info p  { font-size: 12px; color: rgba(255,255,255,0.85); }
    .logo-area {
        text-align: right;
    }
    .gf44-icon {
        font-size: 28px; font-weight: 900;
        background: rgba(255,255,255,0.2); padding: 8px 16px;
        border-radius: 12px; letter-spacing: 2px;
    }
    .gf44-icon small {
        font-size: 10px; font-weight: normal; display: block;
        color: rgba(255,255,255,0.7);
    }

    /* KPI GRID */
    .kpi-grid {
        display: grid; grid-template-columns: repeat(5,1fr);
        gap: 10px; margin-bottom: 20px;
    }
    .kpi-card {
        background: #f8fafc; border: 1px solid #e2e8f0;
        border-radius: 8px; padding: 12px; text-align: center;
    }
    .kpi-val  { font-size: 22px; font-weight: 700; color: #0f172a; }
    .kpi-lbl  { font-size: 10px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.4px; }
    .kpi-sub  { font-size: 11px; color: #94a3b8; margin-top: 2px; }

    /* SECTION */
    .section { margin-bottom: 24px; }
    .section-title {
        font-size: 13px; font-weight: 700; color: #1d4ed8;
        border-bottom: 2px solid #3b82f6; padding-bottom: 5px;
        margin-bottom: 12px; display: flex; align-items: center; gap: 6px;
    }

    /* TABLE */
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #1e40af; color: #fff; padding: 7px 8px; text-align: left;
         font-weight: 700; font-size: 11px; letter-spacing: 0.3px; }
    td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    tr:hover td { background: #f8fafc; }
    tr.row-late td { background: #fff5f5; }
    tr.highlight td { background: #eff6ff; font-weight: 700; color: #1d4ed8; }
    .num { text-align: center; }

    /* BADGE */
    .badge { display: inline-block; padding: 2px 8px; border-radius: 20px;
             font-size: 10px; font-weight: 600; }
    .badge-completed        { background: #d1fae5; color: #065f46; }
    .badge-pending          { background: #fef3c7; color: #92400e; }
    .badge-overdue          { background: #fee2e2; color: #991b1b; }
    .badge-rejected         { background: #f1f5f9; color: #475569; }
    .badge-in_progress      { background: #dbeafe; color: #1d4ed8; }
    .badge-waiting_approval { background: #ede9fe; color: #5b21b6; }

    /* STATUS GRID */
    .status-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
    .status-card {
        background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;
        padding: 10px; display: flex; align-items: center; gap: 10px;
    }
    .status-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
    .dot-completed        { background: #10b981; }
    .dot-pending          { background: #f59e0b; }
    .dot-overdue          { background: #ef4444; }
    .dot-rejected         { background: #94a3b8; }
    .dot-in_progress      { background: #3b82f6; }
    .dot-waiting_approval { background: #8b5cf6; }
    .status-txt { flex: 1; }
    .status-txt .lbl { font-size: 11px; color: #64748b; }
    .status-txt .val { font-size: 16px; font-weight: 700; }
    .status-pct { font-size: 11px; color: #94a3b8; }

    /* FOOTER */
    .pdf-footer {
        margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0;
        display: flex; justify-content: space-between; align-items: center;
        font-size: 11px; color: #94a3b8;
    }
    .gf44-stamp {
        display: inline-block; padding: 4px 12px;
        background: #1e40af; color: #fff; border-radius: 4px;
        font-weight: 700; font-size: 13px; letter-spacing: 1px;
    }

    /* PRINT BTN */
    .print-bar {
        position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
        background: #1e40af; color: #fff;
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .print-bar button {
        padding: 7px 20px; border-radius: 6px; border: 1.5px solid rgba(255,255,255,0.6);
        background: rgba(255,255,255,0.15); color: #fff; cursor: pointer;
        font-size: 13px; font-weight: 600;
    }
    .print-bar button:hover { background: rgba(255,255,255,0.3); }
    @media print { .print-bar { display: none !important; } body { margin-top: 0; } }
    body { margin-top: 56px; }
    @media print { body { margin-top: 0; } }
</style>
</head>
<body>

<!-- PRINT BAR -->
<div class="print-bar no-print">
    <span><strong>GF44</strong> — ${name} İşçi Hesabatı</span>
    <div style="display:flex; gap:8px;">
        <button onclick="window.print()">🖨️ Çap et</button>
        <button onclick="window.close()">✕ Bağla</button>
    </div>
</div>

<!-- HEADER: User Profile (Left) + GF44 Icon (Right) -->
<div class="pdf-header">
    <div class="profile-area">
        <div class="pdf-avatar">${userInitial}</div>
        <div class="user-info">
            <h1>${name}</h1>
            <p>${position} &nbsp;|&nbsp; ${department} &nbsp;|&nbsp; ${companyCode}</p>
            <p style="margin-top:4px;">Hesabat dövrü: <strong>${fmtDate(userData._startDate)} — ${fmtDate(userData._endDate)}</strong></p>
        </div>
    </div>
    <div class="logo-area">
        <div class="gf44-icon">
            GF44
            <small>Professional Report</small>
        </div>
    </div>
</div>

<!-- KPI (Əsas göstəricilər) -->
<div class="section">
    <div class="section-title">📊 Əsas göstəricilər</div>
    <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-val">${d.total}</div><div class="kpi-lbl">Ümumi task</div></div>
        <div class="kpi-card"><div class="kpi-val">${d.completed}</div><div class="kpi-lbl">Tamamlanan</div><div class="kpi-sub">${d.completionRate}%</div></div>
        <div class="kpi-card"><div class="kpi-val">${d.pending}</div><div class="kpi-lbl">Gözləyən</div></div>
        <div class="kpi-card"><div class="kpi-val">${d.overdue}</div><div class="kpi-lbl">Gecikmiş</div></div>
        <div class="kpi-card"><div class="kpi-val">${d.rejected}</div><div class="kpi-lbl">İmtina</div></div>
        <div class="kpi-card"><div class="kpi-val">${d.waitingApproval}</div><div class="kpi-lbl">Təsdiq gözləyir</div></div>
        <div class="kpi-card"><div class="kpi-val">${d.avgCompDays}</div><div class="kpi-lbl">Ort. müddət (gün)</div></div>
        <div class="kpi-card"><div class="kpi-val">${d.ontimeRate}%</div><div class="kpi-lbl">Vaxtında bitirmə</div></div>
        <div class="kpi-card"><div class="kpi-val">${d.currentRank || '-'}</div><div class="kpi-lbl">Reytinq</div><div class="kpi-sub">${d.totalPeers} işçi arasında</div></div>
        <div class="kpi-card"><div class="kpi-val">${d.createdByUser.length}</div><div class="kpi-lbl">Yaratdığı tasklar</div></div>
    </div>
</div>

<!-- STATUS PAYLANMASI -->
<div class="section">
    <div class="section-title">📋 Status paylanması</div>
    <div class="status-grid">
        <div class="status-card"><div class="status-dot dot-completed"></div><div class="status-txt"><div class="lbl">Tamamlanan</div><div class="val">${d.completed}</div></div><div class="status-pct">${d.total ? Math.round(d.completed/d.total*100) : 0}%</div></div>
        <div class="status-card"><div class="status-dot dot-pending"></div><div class="status-txt"><div class="lbl">Gözləyən</div><div class="val">${d.pending}</div></div><div class="status-pct">${d.total ? Math.round(d.pending/d.total*100) : 0}%</div></div>
        <div class="status-card"><div class="status-dot dot-in_progress"></div><div class="status-txt"><div class="lbl">Davam edir</div><div class="val">${d.inProgress}</div></div><div class="status-pct">${d.total ? Math.round(d.inProgress/d.total*100) : 0}%</div></div>
        <div class="status-card"><div class="status-dot dot-overdue"></div><div class="status-txt"><div class="lbl">Gecikmiş</div><div class="val">${d.overdue}</div></div><div class="status-pct">${d.total ? Math.round(d.overdue/d.total*100) : 0}%</div></div>
        <div class="status-card"><div class="status-dot dot-rejected"></div><div class="status-txt"><div class="lbl">İmtina</div><div class="val">${d.rejected}</div></div><div class="status-pct">${d.total ? Math.round(d.rejected/d.total*100) : 0}%</div></div>
        <div class="status-card"><div class="status-dot dot-waiting_approval"></div><div class="status-txt"><div class="lbl">Təsdiq gözləyir</div><div class="val">${d.waitingApproval}</div></div><div class="status-pct">${d.total ? Math.round(d.waitingApproval/d.total*100) : 0}%</div></div>
    </div>
</div>

<!-- AYLIK PERFORMANS -->
${monthlyRows ? `
<div class="section">
    <div class="section-title">📅 Aylıq performans</div>
    <table>
        <thead><tr><th>Ay</th><th>Ümumi</th><th>Tamamlanan</th><th>Tamamlanma %</th></tr></thead>
        <tbody>${monthlyRows}</tbody>
    </table>
</div>` : ''}

<!-- BÜTÜN TASKLAR (DETALLI SİYAHI) -->
<div class="section">
    <div class="section-title">📝 Task siyahısı (Bütün detallar) ${d.tasks.length > 50 ? '(ilk 50)' : ''}</div>
    <table>
        <thead>
            <tr>
                <th class="num">#</th>
                <th>Task adı / Kodu</th>
                <th>Şirkət</th>
                <th>Status</th>
                <th>Yaradılma</th>
                <th>Son müddət</th>
                <th>Tamamlanma</th>
                <th>Müddət</th>
                <th>Prioritet</th>
            </tr>
        </thead>
        <tbody>${taskRows || '<tr><td colspan="9" style="text-align:center; color:#94a3b8;">Məlumat yoxdur</td></tr>'}</tbody>
    </table>
</div>

<!-- MÜQAYİSƏ -->
${comparisonRows ? `
<div class="section">
    <div class="section-title">🏆 İşçilər arasında müqayisə (İlk 15)</div>
    <table>
        <thead><tr><th>Yer</th><th>İşçi</th><th>Şöbə</th><th>Ümumi</th><th>Tamamlanan</th><th>%</th></tr></thead>
        <tbody>${comparisonRows}</tbody>
    </table>
    <p style="font-size:11px; color:#64748b; margin-top:8px; text-align:center;">Mavi sətir bu işçini göstərir. Reytinq tamamlanan task sayına görədir.</p>
</div>` : ''}

<!-- FOOTER -->
<div class="pdf-footer">
    <span>Hesabat tarixi: ${fmtDate(new Date())} &nbsp;|&nbsp; GF44 İş İdarəetmə Sistemi</span>
    <span class="gf44-stamp">GF44</span>
</div>

</body>
</html>`;

        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
    }

    /* ==========================================
       PUBLIC API
    ========================================== */
    return { toExcel, toPDF };

})();

window.UserReportExporter = UserReportExporter;