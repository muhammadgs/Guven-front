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

        const raw = String(date).trim();
        const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateOnlyMatch) {
            const [, year, month, day] = dateOnlyMatch;
            return `${day}.${month}.${year}`;
        }

        const d = new Date(date);
        if (isNaN(d)) return '-';
        const day   = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year  = d.getFullYear();
        return `${day}.${month}.${year}`;
    }

    function statusLabel(status) {
        return statusLabelAz(status);
    }

    function statusLabelAz(status) {
        const map = {
            completed: 'Tamamlandı',
            pending: 'Gözləyir',
            in_progress: 'Davam edir',
            overdue: 'Gecikmiş',
            rejected: 'İmtina',
            cancelled: 'Ləğv edildi',
            canceled: 'Ləğv edildi',
            waiting_approval: 'Təsdiq gözləyir'
        };

        return map[status] || status || '-';
    }

    function firstValue(...values) {
        return values.find(v => v !== undefined && v !== null && String(v).trim() !== '') || '';
    }

    function getReportPeriod(d = {}) {
        const start = firstValue(
            d?.pdfPeriodStart,
            d?.dateRange?.start,
            d?.dateRange?.startDate,
            d?.period?.start,
            d?.period?.startDate,
            d?.startDate,
            d?.fromDate,
            d?.date_from,
            d?._startDate,
            typeof document !== 'undefined' ? document.getElementById('urmStartDate')?.value : ''
        );

        const end = firstValue(
            d?.pdfPeriodEnd,
            d?.dateRange?.end,
            d?.dateRange?.endDate,
            d?.period?.end,
            d?.period?.endDate,
            d?.endDate,
            d?.toDate,
            d?.date_to,
            d?._endDate,
            typeof document !== 'undefined' ? document.getElementById('urmEndDate')?.value : ''
        );

        return {
            start: start ? fmtDate(start) : '-',
            end: end ? fmtDate(end) : '-'
        };
    }

    function cleanText(value, fallback = '-') {
        const text = String(value || '').trim();
        if (!text || text === 'null' || text === 'undefined') return fallback;
        return text;
    }

    function shortText(value, max = 70) {
        const text = cleanText(value);
        if (text === '-') return '-';
        return text.length > max ? text.slice(0, max).trim() + '...' : text;
    }

    function getTaskTypeName(t, taskTypes = []) {
        const direct = firstValue(
            t.task_type_name,
            t.work_type_name,
            t.job_type_name,
            t.type_name,
            t.task_type,
            t.work_type
        );

        if (direct) return direct;

        const typeId = firstValue(t.task_type_id, t.work_type_id, t.job_type_id);
        if (!typeId) return '-';

        const found = taskTypes.find(x =>
            String(x.id) === String(typeId) ||
            String(x.task_type_id) === String(typeId) ||
            String(x.work_type_id) === String(typeId)
        );

        return found?.name || found?.type_name || found?.work_type_name || '-';
    }

    function getDurationMinutes(t) {
        const directMinutes = firstValue(
            t.execution_duration_minutes,
            t.duration_minutes,
            t.actual_duration_minutes,
            t.work_duration_minutes
        );

        if (directMinutes && !Number.isNaN(Number(directMinutes))) {
            return Number(directMinutes);
        }

        const startRaw = firstValue(
            t.assigned_at,
            t.assign_date,
            t.assigned_date,
            t.created_at,
            t.created_date
        );

        const endRaw = firstValue(
            t.completed_date,
            t.completed_at,
            t.finished_at,
            t.done_at,
            t.execution_completed_at
        );

        if (!startRaw || !endRaw) return null;

        const start = new Date(startRaw);
        const end = new Date(endRaw);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

        return Math.max(0, Math.round((end - start) / 60000));
    }

    function getTaskDurationLabel(t) {
        const minutes = getDurationMinutes(t);

        if (minutes === null) {
            const direct = firstValue(
                t.execution_duration,
                t.duration,
                t.actual_duration,
                t.work_duration
            );

            return direct ? String(direct) : '-';
        }

        if (minutes < 60) return `${minutes} dəq`;

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        return mins ? `${hours} saat ${mins} dəq` : `${hours} saat`;
    }

    function getHourlyRate(t, taskTypes = []) {
        const direct = firstValue(
            t.hourly_rate,
            t.work_type_hourly_rate,
            t.task_type_hourly_rate,
            t.salary_per_hour,
            t.price_per_hour,
            t.rate
        );

        if (direct && !Number.isNaN(Number(direct))) return Number(direct);

        const typeId = firstValue(t.task_type_id, t.work_type_id, t.job_type_id);
        if (!typeId) return null;

        const found = taskTypes.find(x =>
            String(x.id) === String(typeId) ||
            String(x.task_type_id) === String(typeId) ||
            String(x.work_type_id) === String(typeId)
        );

        const rate = firstValue(
            found?.hourly_rate,
            found?.price_per_hour,
            found?.salary_per_hour,
            found?.rate
        );

        return rate && !Number.isNaN(Number(rate)) ? Number(rate) : null;
    }

    function getTaskSalary(t, taskTypes = []) {
        const minutes = getDurationMinutes(t);
        const hourlyRate = getHourlyRate(t, taskTypes);

        if (minutes === null || hourlyRate === null) return '-';

        const amount = (minutes / 60) * hourlyRate;
        return `${amount.toFixed(2)} ₼`;
    }

    function getTaskNotes(t = {}) {
        return cleanText(firstValue(
            t.notes,
            t.note,
            t.comment,
            t.comments,
            t.task_note,
            t.task_notes,
            t.description_note,
            t.admin_note,
            t.worker_note,
            t.executor_note,
            t.employee_note,
            t.completion_note,
            t.result_note,
            t.final_note,
            t.reject_reason,
            t.rejection_reason,
            t.cancel_reason,
            t.cancellation_reason
        ));
    }

    function getTaskCompletedDateRaw(t = {}) {
        return firstValue(
            t.completed_date,
            t.completion_date,
            t.completed_at,
            t.finished_at,
            t.done_at,
            t.executed_at,
            t.execution_date,
            t.execution_completed_at,
            t.completedAt,
            t.finishedAt
        );
    }

    function getTaskCompletedDate(t = {}) {
        const value = getTaskCompletedDateRaw(t);
        return value ? fmtDate(value) : '-';
    }

    function getTaskDuration(t = {}) {
        const direct = firstValue(
            t.execution_duration,
            t.execution_duration_minutes,
            t.execution_time,
            t.execution_time_minutes,
            t.duration,
            t.duration_minutes,
            t.actual_duration,
            t.actual_duration_minutes,
            t.completed_duration,
            t.work_duration,
            t.work_duration_minutes
        );

        if (direct) {
            const raw = String(direct).trim();

            if (/[a-zA-ZəğıöşüçƏĞIİÖŞÜÇ]/.test(raw)) {
                return raw;
            }

            const n = Number(raw);
            if (!Number.isNaN(n)) {
                if (n < 60) return `${n} dəq`;
                const hours = Math.floor(n / 60);
                const mins = n % 60;
                return mins ? `${hours} saat ${mins} dəq` : `${hours} saat`;
            }

            return raw;
        }

        const created = firstValue(t.created_at, t.created_date, t.createdAt);
        const completed = getTaskCompletedDateRaw(t);

        if (!created || !completed) return '-';

        const start = new Date(created);
        const end = new Date(completed);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-';

        const diffMs = Math.max(0, end - start);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffDays >= 1) return `${diffDays} gün`;

        const diffMinutes = Math.round(diffMs / 60000);
        if (diffMinutes < 60) return `${diffMinutes} dəq`;

        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        return mins ? `${hours} saat ${mins} dəq` : `${hours} saat`;
    }

    function calcDuration(t) {
        return getTaskDuration(t);
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
            getTaskCompletedDate(t),
            getTaskDuration(t),
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
        const period = getReportPeriod(d);

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
        const reportTaskTypes = d.taskTypes || d.workTypes || [];
        const taskRows = d.tasks.slice(0, 50).map((t, i) => {
            const isLate = t.status === 'overdue' ||
                (t.due_date && !getTaskCompletedDateRaw(t) && new Date(t.due_date) < new Date());
            return `
            <tr class="${isLate ? 'row-late' : ''}">
                <td class="num">${i + 1}</td>
                <td class="task-name">
                    <strong>${t.task_title || t.title || '-'}</strong>
                    <small>Kod: ${t.task_code || t.code || '-'}</small>
                </td>
                <td class="text-cell">${shortText(getTaskTypeName(t, reportTaskTypes), 55)}</td>
                <td class="text-cell">${shortText(firstValue(
                    t.task_description,
                    t.description,
                    t.details,
                    t.content
                ), 70)}</td>
                <td class="text-cell">${shortText(firstValue(
                    t.notes,
                    t.note,
                    t.comment,
                    t.comments,
                    t.task_note,
                    t.task_notes,
                    t.admin_note,
                    t.worker_note,
                    t.executor_note,
                    t.completion_note,
                    t.rejection_reason,
                    t.cancel_reason
                ), 70)}</td>
                <td>${statusLabelAz(t.status)}</td>
                <td>${fmtDate(firstValue(
                    t.assigned_at,
                    t.assign_date,
                    t.assigned_date,
                    t.created_at,
                    t.created_date
                ))}</td>
                <td>${fmtDate(firstValue(
                    t.due_date,
                    t.deadline,
                    t.end_date
                ))}</td>
                <td>${getTaskDurationLabel(t)}</td>
                <td>${getTaskSalary(t, reportTaskTypes)}</td>
                <td>${shortText(firstValue(
                    t.result,
                    t.result_text,
                    t.outcome,
                    t.final_result,
                    t.completion_result,
                    getPriorityLabel(t.priority)
                ), 50)}</td>
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
<title> </title>
<style>
    @page {
        size: A4 landscape;
        margin: 0;
    }
    html,
    body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        min-height: 100% !important;
        background: #ffffff !important;
        overflow: visible !important;
    }
    html,
    body,
    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
        font-family: Arial, sans-serif;
        color: #1e293b;
        background: #fff !important;
        font-size: 13px;
    }
    .print-report,
    .pdf-report,
    .report-print-wrapper,
    .report-container {
        margin: 0 auto !important;
        padding: 2mm 7mm 5mm 7mm !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        overflow: visible !important;
    }
    @media print {
        @page {
            size: A4 landscape;
            margin: 0;
        }

        .no-print { display: none !important; }
    }

    /* HEADER: Profil Sol, Logo Sağ */
    .pdf-header,
    .report-header,
    .print-header {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        width: 100%;
        max-width: 100%;
        min-height: 92px;
        box-sizing: border-box;
        padding: 18px 24px;
        background: linear-gradient(135deg, #1e40af, #3b82f6) !important;
        color: #ffffff !important;
        border-radius: 8px;
        margin-top: 0 !important;
        margin-bottom: 20px;
        overflow: hidden;
    }
    .pdf-header-title {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        color: #ffffff;
        font-size: 24px;
        font-weight: 800;
        letter-spacing: 0.4px;
        text-align: center;
        white-space: nowrap;
        line-height: 1.1;
        pointer-events: none;
        z-index: 1;
    }
    .profile-area {
        position: relative;
        z-index: 2;
        display: flex; align-items: center; gap: 20px; min-width: 0;
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
        position: relative;
        z-index: 2;
        text-align: right; flex: 0 0 auto; max-width: 150px; box-sizing: border-box;
        margin-left: auto;
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
    .task-table {
        width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
        font-size: 9.5px;
    }
    .task-table th,
    .task-table td {
        border-right: 1px solid rgba(0, 0, 0, 0.45);
        border-bottom: 1px solid rgba(0, 0, 0, 0.14);
        padding: 6px 5px;
        vertical-align: top;
        text-align: left;
        word-break: break-word;
    }
    .task-table th:first-child,
    .task-table td:first-child {
        border-left: 1px solid rgba(0, 0, 0, 0.45);
    }
    .task-table thead th {
        border-top: 1px solid rgba(0, 0, 0, 0.45);
        border-bottom: 1px solid rgba(0, 0, 0, 0.55);
        background: #1e40af;
        color: #fff;
        font-weight: 700;
    }
    .task-table tbody tr:last-child td {
        border-bottom: 1px solid rgba(0, 0, 0, 0.45);
    }
    .task-table .col-num { width: 3%; text-align: center; }
    .task-table .col-task { width: 15%; }
    .task-table .col-type { width: 9%; }
    .task-table .col-desc { width: 13%; }
    .task-table .col-notes { width: 11%; }
    .task-table .col-status { width: 8%; }
    .task-table .col-assigned { width: 8%; }
    .task-table .col-due { width: 8%; }
    .task-table .col-duration { width: 8%; }
    .task-table .col-salary { width: 8%; }
    .task-table .col-result { width: 9%; }
    .task-table .num { text-align: center; }
    .task-table .text-cell {
        line-height: 1.35;
        color: #334155;
        word-break: break-word;
    }
    .task-table .task-name { word-break: break-word; }
    .task-table .task-name small {
        display: block;
        margin-top: 2px;
        color: #64748b;
        font-size: 8.8px;
    }
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

    @media screen {
        .print-report,
        .pdf-report,
        .report-print-wrapper {
            padding-top: 86px !important;
        }

        .pdf-header {
            min-height: 118px !important;
            padding-top: 20px !important;
            padding-bottom: 20px !important;
            overflow: visible !important;
        }

        .profile-area,
        .user-info,
        .gf44-report-logo {
            overflow: visible !important;
        }

        .gf44-report-logo {
            flex-shrink: 0 !important;
        }
    }

    @media print {
        html,
        body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            max-width: 100% !important;
            background: #ffffff !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }

        .print-report,
        .pdf-report,
        .report-print-wrapper,
        .report-container {
            margin: 0 auto !important;
            padding: 2mm 7mm 5mm 7mm !important;
            transform: translateY(-2mm);
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow: visible !important;
        }

        .report-header,
        .pdf-header,
        .print-header {
            margin-top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            overflow: visible !important;
        }

        .report-logo,
        .pdf-logo,
        .gf44-logo,
        .gf44-report-logo {
            flex: 0 0 auto !important;
            max-width: 150px !important;
            margin-right: 0 !important;
            transform: none !important;
            box-sizing: border-box !important;
        }

        .pdf-header,
        .report-header,
        .print-header {
            background: linear-gradient(135deg, #1e40af, #3b82f6) !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }

        .pdf-header *,
        .report-header *,
        .print-header *,
        .pdf-header-title {
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }

        .gf44-icon {
            background: rgba(255, 255, 255, 0.16) !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }

        .gf44-icon small {
            color: rgba(255, 255, 255, 0.85) !important;
        }

        .gf44-report-logo,
        .gf44-report-logo * {
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }

        .section-title {
            color: #2563eb !important;
            border-bottom-color: #3b82f6 !important;
        }

        .employee-comparison-section {
            border-bottom: none !important;
        }

        .employee-comparison-section::after {
            display: none !important;
            content: none !important;
        }

        .employee-comparison-section table {
            border-bottom: none !important;
        }

        .employee-comparison-section table tbody tr:last-child td {
            border-bottom: none !important;
        }

        .employee-comparison-section + .task-list-section {
            border-top: none !important;
        }

        /*
         * The blue strip that appeared after the employee comparison table was the
         * task list table header starting at the bottom of the previous print page.
         * Move the entire detailed task list to a fresh printed page so its title
         * and header cannot be orphaned below the comparison section.
         */
        .task-list-section {
            break-before: page !important;
            page-break-before: always !important;
            break-inside: auto !important;
            page-break-inside: auto !important;
            border-top: 0 !important;
            margin-top: 0 !important;
        }

        .task-list-section .section-title {
            break-after: avoid !important;
            page-break-after: avoid !important;
        }

        .task-list-section table thead {
            display: table-header-group !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }

        .task-list-section table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }

        table thead th,
        .task-table thead th {
            background: #1e40af !important;
            color: #ffffff !important;
        }

        .kpi-card,
        .badge,
        tr.row-late td,
        tr.highlight td,
        .gf44-stamp {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }

        .print-bar { display: none !important; }
        body { margin-top: 0 !important; }
    }
</style>
</head>
<body class="print-report pdf-report report-print-wrapper">

<!-- PRINT BAR -->
<div class="print-bar no-print">
    <span><strong>GF44</strong> — ${name} Əməkdaş Hesabatı</span>
    <div style="display:flex; gap:8px;">
        <!-- Browser print headers/footers are controlled by the browser print dialog. -->
        <button onclick="printTaskReport()">🖨️ Çap et</button>
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
            <p class="report-period" style="margin-top:4px;">Hesabat dövrü: <strong>${period.start} — ${period.end}</strong></p>
        </div>
    </div>
    <div class="pdf-header-title">Tapşırıqların hesabatı</div>
    <div class="logo-area report-logo pdf-logo gf44-logo gf44-report-logo">
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
        <div class="kpi-card"><div class="kpi-val">${d.currentRank || '-'}</div><div class="kpi-lbl">Reytinq</div><div class="kpi-sub">${d.totalPeers} əməkdaş arasında</div></div>
        <div class="kpi-card"><div class="kpi-val">${d.createdByUser.length}</div><div class="kpi-lbl">Yaratdığı tasklar</div></div>
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

<!-- MÜQAYİSƏ -->
${comparisonRows ? `
<div class="section employee-comparison-section">
    <div class="section-title">🏆 Əməkdaşlar arasında müqayisə (İlk 15)</div>
    <table>
        <thead><tr><th>Yer</th><th>Əməkdaş</th><th>Şöbə</th><th>Ümumi</th><th>Tamamlanan</th><th>%</th></tr></thead>
        <tbody>${comparisonRows}</tbody>
    </table>
    <p style="font-size:11px; color:#64748b; margin-top:8px; text-align:center;">Mavi sətir bu əməkdaşı göstərir. Reytinq tamamlanan tapşırıq sayına görədir.</p>
</div>` : ''}

<!-- TAPŞIRIQ SİYAHISI (DETALLI SİYAHI) -->
<div class="section task-list-section">
    <div class="section-title">📝 Tapşırıq siyahısı (Bütün detallar) ${d.tasks.length > 50 ? '(ilk 50)' : ''}</div>
    <table class="task-table">
        <thead>
            <tr>
                <th class="col-num">#</th>
                <th class="col-task">Tapşırıq adı / Kodu</th>
                <th class="col-type">İşin növü</th>
                <th class="col-desc">Açıqlama</th>
                <th class="col-notes">Qeydlər</th>
                <th class="col-status">Status</th>
                <th class="col-assigned">Təyin etmə</th>
                <th class="col-due">Son müddət</th>
                <th class="col-duration">Müddət</th>
                <th class="col-salary">Əməkhaqqı</th>
                <th class="col-result">Nəticə</th>
            </tr>
        </thead>
        <tbody>${taskRows || '<tr><td colspan="11" style="text-align:center; color:#94a3b8;">Məlumat yoxdur</td></tr>'}</tbody>
    </table>
</div>

<!-- FOOTER -->
<div class="pdf-footer">
    <span>Hesabat tarixi: ${fmtDate(new Date())} &nbsp;|&nbsp; GF44 İş İdarəetmə Sistemi</span>
    <span class="gf44-stamp">GF44</span>
</div>

<script>
    document.title = ' ';
    function printTaskReport() {
        const openerDocument = window.opener && window.opener.document ? window.opener.document : null;
        const previousTitle = openerDocument ? openerDocument.title : '';

        document.title = ' ';
        if (openerDocument) {
            openerDocument.title = ' ';
        }

        window.focus();
        window.print();

        setTimeout(() => {
            document.title = ' ';
            if (openerDocument) {
                openerDocument.title = previousTitle;
            }
        }, 800);
    }
</script>
</body>
</html>`;

        const previousTitle = document.title;
        document.title = ' ';

        const win = window.open('', '_blank');
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.document.title = ' ';

        setTimeout(() => {
            document.title = previousTitle;
        }, 800);
    }

    /* ==========================================
       PUBLIC API
    ========================================== */
    return { toExcel, toPDF };

})();

window.UserReportExporter = UserReportExporter;