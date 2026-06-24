// ========================================
// REPORT MANAGER - exportManager.js
// EXPORT VƏ PRINT FUNKSİYALARI
// ========================================
// raport/exportManager.js
class ExportManager {
    constructor(manager) {
        this.manager = manager;
        this.ui = manager.ui;
        this.utils = manager.utils;
        this.modalManager = manager.modalManager;
    }

    async exportReport() {
        if (typeof XLSX === 'undefined') {
            this.manager.showError('XLSX kitabxanası yüklənməyib');
            return;
        }

        try {
            this.ui.showLoading();

            const wb = XLSX.utils.book_new();

            this.addSummarySheet(wb);
            this.addCompaniesSheet(wb);
            this.addEmployeesSheet(wb);
            this.addPartnersSheet(wb);

            const fileName = `hesabat_${this.utils.formatDate(new Date(), 'YYYY-MM-DD')}.xlsx`;
            XLSX.writeFile(wb, fileName);

            this.manager.showNotification('Hesabat uğurla ixrac edildi', 'success');
        } catch (error) {
            console.error('Export xətası:', error);
            this.manager.showError('Hesabat export edilərkən xəta baş verdi');
        } finally {
            this.ui.hideLoading();
        }
    }

    addSummarySheet(wb) {
        const stats = this.manager.stats;
        const summaryData = [
            ['Metrik', 'Dəyər'],
            ['Ümumi tapşırıqlar', stats.total],
            ['Tamamlanan', stats.completed],
            ['Gözləmədə', stats.pending],
            ['İcra edilir', stats.in_progress],
            ['Müddəti keçən', stats.overdue],
            ['Tamamlanma faizi', `${stats.productivityRate}%`],
            ['Ortalama icra müddəti', `${stats.avgCompletionTime} gün`],
            ['Vaxtında tamamlanma', `${stats.ontimeRate}%`],
            ['Aktiv işçilər', stats.activeUsers],
            ['Ümumi gəlir', stats.totalRevenue],
            ['Xalis mənfəət', stats.totalProfit]
        ];

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Xülasə');
    }

    addCompaniesSheet(wb) {
        const data = this.manager.data;
        const companies = data.companies || [];
        const tasks = data.tasks || [];

        const companyData = [
            ['Şirkət', 'Kod', 'Ümumi', 'Tamamlanan', 'Gözləmədə', 'İcra edilir', 'Müddəti keçən', 'Tamamlanma %', 'Gəlir'],
            ...companies.map(c => {
                const companyTasks = tasks.filter(t => t.company_id === c.id);
                const total = companyTasks.length;
                const completed = companyTasks.filter(t => t.status === 'completed').length;
                const revenue = companyTasks.reduce((sum, t) => sum + (t.is_billable ? (t.billing_rate || 0) * (t.actual_hours || 0) : 0), 0);

                return [
                    c.company_name || c.name || '-',
                    c.company_code || c.code || '-',
                    total,
                    completed,
                    companyTasks.filter(t => t.status === 'pending').length,
                    companyTasks.filter(t => t.status === 'in_progress').length,
                    companyTasks.filter(t => t.status === 'overdue').length,
                    total ? Math.round((completed / total) * 100) + '%' : '0%',
                    revenue
                ];
            })
        ];

        const wsCompanies = XLSX.utils.aoa_to_sheet(companyData);
        XLSX.utils.book_append_sheet(wb, wsCompanies, 'Şirkətlər');
    }

    addEmployeesSheet(wb) {
        const data = this.manager.data;
        const employees = data.employees || [];
        const tasks = data.tasks || [];

        const employeeData = [
            ['İşçi', 'Şöbə', 'Vəzifə', 'Ümumi', 'Tamamlanan', 'Gözləmədə', 'Müddəti keçən', 'Tamamlanma %', 'Gəlir'],
            ...employees.map(e => {
                const empTasks = tasks.filter(t => t.assigned_to === e.id);
                const total = empTasks.length;
                const completed = empTasks.filter(t => t.status === 'completed').length;
                const revenue = empTasks.reduce((sum, t) => sum + (t.is_billable ? (t.billing_rate || 0) * (t.actual_hours || 0) : 0), 0);
                const fullName = e.name && e.surname ?
                    `${e.name} ${e.surname}` :
                    (e.name || e.ceo_name || 'Adsız');

                return [
                    fullName,
                    e.department_name || e.departmentName || '-',
                    e.position || '-',
                    total,
                    completed,
                    empTasks.filter(t => t.status === 'pending').length,
                    empTasks.filter(t => t.status === 'overdue').length,
                    total ? Math.round((completed / total) * 100) + '%' : '0%',
                    revenue
                ];
            })
        ];

        const wsEmployees = XLSX.utils.aoa_to_sheet(employeeData);
        XLSX.utils.book_append_sheet(wb, wsEmployees, 'İşçilər');
    }

    addPartnersSheet(wb) {
        const data = this.manager.data;
        const partners = data.partners || [];
        const partnerTasks = data.partnerTasks || [];

        const partnerData = [
            ['Partner', 'Əlaqə şəxs', 'Telefon', 'Ümumi task', 'Tamamlanan', 'Ödənilən', 'Ümumi məbləğ'],
            ...partners.map(p => {
                const tasks = partnerTasks.filter(t =>
                    t.partner_company_id === p.id || t.partner_id === p.id
                );
                const total = tasks.length;
                const completed = tasks.filter(t => t.status === 'completed').length;
                const paid = tasks.filter(t => t.payment_status === 'paid').length;
                const totalCost = tasks.reduce((sum, t) => sum + (t.actual_cost || 0), 0);
                const partnerName = p.partner_name || p.partner_company_name || p.name || 'Adsız';

                return [
                    partnerName,
                    p.contact_person || '-',
                    p.contact_phone || '-',
                    total,
                    completed,
                    paid,
                    totalCost
                ];
            })
        ];

        const wsPartners = XLSX.utils.aoa_to_sheet(partnerData);
        XLSX.utils.book_append_sheet(wb, wsPartners, 'Partnerlər');
    }

    printReport() {
        const printWindow = window.open('', '_blank');
        const reportContent = this.modalManager.generateFullReport();
        const styles = this.getPrintStyles();

        printWindow.document.write(`
            <html>
                <head>
                    <title>Hesabat - ${this.utils.formatDate(new Date())}</title>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    <style>${styles}</style>
                </head>
                <body>
                    <div class="print-header">
                        <h1>Hesabat</h1>
                        <p>Tarix: ${this.utils.formatDate(this.manager.dateRange.start)} - ${this.utils.formatDate(this.manager.dateRange.end)}</p>
                        <p>Yaradılma tarixi: ${new Date().toLocaleString('az-AZ')}</p>
                    </div>
                    ${reportContent}
                    <div class="print-footer">
                        <p>Hesabat ${new Date().toLocaleDateString('az-AZ')} tarixində yaradılmışdır</p>
                    </div>
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.print();
    }

    getPrintStyles() {
        return `
            body { font-family: Arial, sans-serif; padding: 30px; color: #333; background: white; }
            .print-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #3b82f6; }
            h1 { color: #1e293b; margin: 0; }
            h4 { color: #1e293b; margin: 25px 0 10px; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #3b82f6; color: white; font-weight: 600; }
            .report-summary-cards { display: flex; gap: 15px; margin: 25px 0; }
            .summary-card { flex: 1; padding: 15px; background: #f8fafc; border-radius: 8px; text-align: center; }
            .text-success { color: #10b981; }
            .text-warning { color: #f59e0b; }
            .text-danger { color: #ef4444; }
            .text-info { color: #3b82f6; }
        `;
    }

    scheduleReport() {
        const modal = document.createElement('div');
        modal.className = 'modal schedule-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-clock"></i> Hesabat Planlaşdır</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <form id="scheduleForm">
                        <div class="form-group">
                            <label>Hesabat tipi</label>
                            <select id="scheduleReportType" class="form-select">
                                <option value="full">Tam hesabat</option>
                                <option value="company">Şirkət hesabatı</option>
                                <option value="financial">Maliyyə hesabatı</option>
                                <option value="partner">Partner hesabatı</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Göndərilmə tezliyi</label>
                            <select id="scheduleFrequency" class="form-select">
                                <option value="daily">Gündəlik</option>
                                <option value="weekly">Həftəlik</option>
                                <option value="monthly">Aylıq</option>
                                <option value="quarterly">Rüblük</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Email ünvanları</label>
                            <input type="email" id="scheduleEmails" class="form-input" placeholder="email@example.com, email2@example.com" multiple>
                            <small>Birdən çox email üçün vergül ilə ayırın</small>
                        </div>
                        <div class="form-group">
                            <label>Format</label>
                            <select id="scheduleFormat" class="form-select">
                                <option value="pdf">PDF</option>
                                <option value="excel">Excel</option>
                                <option value="csv">CSV</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="secondary-btn" onclick="this.closest('.modal').remove()">Ləğv et</button>
                    <button class="primary-btn" onclick="reportManager.exportManager.saveSchedule()">Planlaşdır</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    saveSchedule() {
        this.manager.showNotification('Hesabat planlaşdırıldı', 'success');
        document.querySelector('.schedule-modal')?.remove();
    }

    exportDetailReport() {
        // Implementation
    }

    printDetailReport() {
        // Implementation
    }
}
// Global modula əlavə et
window.ReportModules = window.ReportModules || {};
window.ReportModules.ExportManager = ExportManager;