// ========================================
// REPORT MANAGER - modalManager.js
// MODAL VƏ DETALLI GÖRÜNÜŞLƏR
// ========================================
// raport/modalManager.js
class ReportModalManager  {
    constructor(manager) {
        this.manager = manager;
        this.ui = manager.ui;
        this.utils = manager.utils;
        this.data = manager.data;
        this.elements = manager.elements;
        this.api = manager.api;
    }

    showDetailModal(type, title, content) {
        if (!this.elements.reportDetailModal || !this.elements.reportDetailBody) return;

        if (this.elements.reportDetailTitle) {
            this.elements.reportDetailTitle.innerHTML = title || this.getModalTitle(type);
        }

        this.elements.reportDetailBody.innerHTML = content || this.getModalContent(type);
        this.elements.reportDetailModal.classList.add('active');
    }

    getModalTitle(type) {
        const titles = {
            full: '<i class="fas fa-chart-pie"></i> Tam Hesabat',
            companies: '<i class="fas fa-building"></i> Şirkətlər',
            departments: '<i class="fas fa-sitemap"></i> Şöbələr',
            employees: '<i class="fas fa-users"></i> İşçilər',
            taskTypes: '<i class="fas fa-tag"></i> İş Növləri',
            partners: '<i class="fas fa-handshake"></i> Partnerlər',
            financial: '<i class="fas fa-coins"></i> Maliyyə Hesabatı'
        };
        return titles[type] || '<i class="fas fa-file-alt"></i> Hesabat';
    }

    getModalContent(type) {
        const generators = {
            full: () => this.generateFullReport(),
            companies: () => this.generateCompanyDetailTable(true),
            departments: () => this.generateDepartmentDetailTable(),
            employees: () => this.generateEmployeeDetailTable(true),
            taskTypes: () => this.generateTaskTypeDetailTable(),
            partners: () => this.generatePartnerDetailTable(true),
            financial: () => this.generateFinancialTable()
        };
        return generators[type] ? generators[type]() : '<div class="empty-state">Məlumat yoxdur</div>';
    }

    closeModal() {
        if (this.elements.reportDetailModal) {
            this.elements.reportDetailModal.classList.remove('active');
        }
    }

    async showCompanyDetails(companyId) {
        this.ui.showLoading();

        try {
            const reportData = await this.api.fetchCompanyReport(companyId, this.manager.dateRange);

            if (reportData) {
                const company = reportData.company || {};
                const companyName = company.company_name || company.name || 'Şirkət';
                const content = this.generateCompanyDetailContent(reportData, company);
                this.showDetailModal('custom', companyName, content);
            }
        } catch (error) {
            console.error('showCompanyDetails xətası:', error);
            this.manager.showError('Şirkət məlumatları yüklənərkən xəta');
        } finally {
            this.ui.hideLoading();
        }
    }

    async showEmployeeDetails(employeeId) {
        this.ui.showLoading();

        try {
            const reportData = await this.api.fetchEmployeeReport(employeeId, this.manager.dateRange);

            if (reportData) {
                const employee = reportData.employee || {};
                const fullName = employee.name && employee.surname ?
                    `${employee.name} ${employee.surname}` :
                    (employee.name || employee.ceo_name || 'İşçi');
                const content = this.generateEmployeeDetailContent(reportData, employee);
                this.showDetailModal('custom', fullName, content);
            }
        } catch (error) {
            console.error('showEmployeeDetails xətası:', error);
            this.manager.showError('İşçi məlumatları yüklənərkən xəta');
        } finally {
            this.ui.hideLoading();
        }
    }

    showAllCompanies() {
        const title = '<i class="fas fa-building"></i> Bütün Şirkətlər';
        const content = this.generateCompanyDetailTable(true);
        this.showDetailModal('custom', title, content);
    }

    showAllDepartments() {
        const departments = this.data.departments || [];
        let html = '<table class="detail-table"><thead><tr><th>Şöbə</th><th>Kod</th><th>Status</th></tr></thead><tbody>';

        departments.forEach(dept => {
            html += `<tr><td>${dept.name || 'Adsız'}</td><td>${dept.code || '-'}</td><td>${dept.is_active ? 'Aktiv' : 'Deaktiv'}</td></tr>`;
        });

        html += '</tbody></table>';
        this.showDetailModal('custom', '<i class="fas fa-sitemap"></i> Bütün Şöbələr', html);
    }

    showAllEmployees() {
        const title = '<i class="fas fa-users"></i> Bütün İşçilər';
        const content = this.generateEmployeeDetailTable(true);
        this.showDetailModal('custom', title, content);
    }

    showAllTaskTypes() {
        const taskTypes = this.data.taskTypes || [];
        let html = '<table class="detail-table"><thead><tr><th>İş növü</th><th>Kod</th><th>Qiymət</th></tr></thead><tbody>';

        taskTypes.forEach(type => {
            html += `<tr><td>${type.name || 'Adsız'}</td><td>${type.code || '-'}</td><td>${type.hourly_rate || 0} ₼/saat</td></tr>`;
        });

        html += '</tbody></table>';
        this.showDetailModal('custom', '<i class="fas fa-tag"></i> Bütün İş Növləri', html);
    }

    showAllPartners() {
        const title = '<i class="fas fa-handshake"></i> Bütün Partnerlər';
        const content = this.generatePartnerDetailTable(true);
        this.showDetailModal('custom', title, content);
    }

    generateCompanyDetailTable(full = false) {
        const companies = this.data.companies || [];
        const tasks = this.data.tasks || [];

        if (companies.length === 0) {
            return '<div class="empty-state">Şirkət məlumatı yoxdur</div>';
        }

        let rows = '';
        companies.forEach(company => {
            const companyTasks = tasks.filter(t => t.company_id === company.id);
            const total = companyTasks.length;
            const completed = companyTasks.filter(t => t.status === 'completed').length;
            const pending = companyTasks.filter(t => t.status === 'pending').length;
            const inProgress = companyTasks.filter(t => t.status === 'in_progress').length;
            const overdue = companyTasks.filter(t =>
                t.status === 'overdue' || (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed')
            ).length;

            const completedPercent = total ? Math.round((completed / total) * 100) : 0;
            const pendingPercent = total ? Math.round((pending / total) * 100) : 0;
            const overduePercent = total ? Math.round((overdue / total) * 100) : 0;

            rows += `
                <tr onclick="reportManager.modalManager.showCompanyDetails(${company.id})">
                    <td><strong>${company.company_name || company.name || 'Adsız'}</strong></td>
                    <td>${company.company_code || '-'}</td>
                    <td>${total}</td>
                    <td class="text-success">${completed} (${completedPercent}%)</td>
                    <td class="text-warning">${pending} (${pendingPercent}%)</td>
                    <td class="text-info">${inProgress}</td>
                    <td class="text-danger">${overdue} (${overduePercent}%)</td>
                </tr>
            `;
        });

        return `
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>Şirkət</th>
                        <th>Kod</th>
                        <th>Ümumi</th>
                        <th>Tamamlanan</th>
                        <th>Gözləmədə</th>
                        <th>İcra edilir</th>
                        <th>Müddəti keçən</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    generateEmployeeDetailTable(full = false) {
        const employees = this.data.employees || [];
        const tasks = this.data.tasks || [];

        if (employees.length === 0) {
            return '<div class="empty-state">İşçi məlumatı yoxdur</div>';
        }

        let rows = '';
        employees.forEach(emp => {
            const empTasks = tasks.filter(t => t.assigned_to === emp.id);
            const total = empTasks.length;
            const completed = empTasks.filter(t => t.status === 'completed').length;
            const pending = empTasks.filter(t => t.status === 'pending').length;
            const overdue = empTasks.filter(t =>
                t.status === 'overdue' || (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed')
            ).length;

            const completedPercent = total ? Math.round((completed / total) * 100) : 0;
            const fullName = emp.name && emp.surname ?
                `${emp.name} ${emp.surname}` :
                (emp.name || emp.ceo_name || 'Adsız');

            rows += `
                <tr onclick="reportManager.modalManager.showEmployeeDetails(${emp.id})">
                    <td><strong>${fullName}</strong></td>
                    <td>${emp.department_name || emp.departmentName || '-'}</td>
                    <td>${emp.position || '-'}</td>
                    <td>${total}</td>
                    <td class="text-success">${completed}</td>
                    <td class="text-warning">${pending}</td>
                    <td class="text-danger">${overdue}</td>
                    <td>${completedPercent}%</td>
                </tr>
            `;
        });

        return `
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>İşçi</th>
                        <th>Şöbə</th>
                        <th>Vəzifə</th>
                        <th>Ümumi</th>
                        <th>Tamamlanan</th>
                        <th>Gözləmədə</th>
                        <th>Müddəti keçən</th>
                        <th>Tamamlanma %</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    generatePartnerDetailTable(full = false) {
        const partners = this.data.partners || [];
        const partnerTasks = this.data.partnerTasks || [];

        if (partners.length === 0) {
            return '<div class="empty-state">Partner məlumatı yoxdur</div>';
        }

        let rows = '';
        partners.forEach(partner => {
            const tasks = partnerTasks.filter(t =>
                t.partner_company_id === partner.id || t.partner_id === partner.id
            );
            const total = tasks.length;
            const completed = tasks.filter(t => t.status === 'completed').length;
            const paid = tasks.filter(t => t.payment_status === 'paid').length;
            const totalCost = tasks.reduce((sum, t) => sum + (t.actual_cost || 0), 0);

            const partnerName = partner.partner_name ||
                               partner.partner_company_name ||
                               partner.name ||
                               'Adsız';

            rows += `
                <tr>
                    <td><strong>${partnerName}</strong></td>
                    <td>${partner.contact_person || '-'}</td>
                    <td>${partner.contact_phone || '-'}</td>
                    <td>${total}</td>
                    <td class="text-success">${completed}</td>
                    <td class="text-info">${paid}</td>
                    <td>${this.utils.formatMoney(totalCost)}</td>
                </tr>
            `;
        });

        return `
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>Partner şirkət</th>
                        <th>Əlaqə şəxs</th>
                        <th>Telefon</th>
                        <th>Ümumi task</th>
                        <th>Tamamlanan</th>
                        <th>Ödənilən</th>
                        <th>Ümumi məbləğ</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    generateDepartmentDetailTable() {
        const departments = this.data.departments || [];
        const tasks = this.data.tasks || [];

        if (departments.length === 0) {
            return '<div class="empty-state">Şöbə məlumatı yoxdur</div>';
        }

        let rows = '';
        departments.forEach(dept => {
            const deptTasks = tasks.filter(t => t.department_id === dept.id);
            const total = deptTasks.length;
            const completed = deptTasks.filter(t => t.status === 'completed').length;

            rows += `
                <tr>
                    <td><strong>${dept.name || 'Adsız'}</strong></td>
                    <td>${dept.code || '-'}</td>
                    <td>${dept.is_active ? 'Aktiv' : 'Deaktiv'}</td>
                    <td>${total}</td>
                    <td class="text-success">${completed}</td>
                    <td>${total ? Math.round((completed / total) * 100) : 0}%</td>
                </tr>
            `;
        });

        return `
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>Şöbə</th>
                        <th>Kod</th>
                        <th>Status</th>
                        <th>Ümumi task</th>
                        <th>Tamamlanan</th>
                        <th>Tamamlanma %</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    generateTaskTypeDetailTable() {
        const taskTypes = this.data.taskTypes || [];
        const tasks = this.data.tasks || [];

        if (taskTypes.length === 0) {
            return '<div class="empty-state">İş növü məlumatı yoxdur</div>';
        }

        let rows = '';
        taskTypes.forEach(type => {
            const typeTasks = tasks.filter(t => t.work_type_id === type.id);
            const total = typeTasks.length;
            const totalHours = typeTasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);
            const totalRevenue = typeTasks.reduce((sum, t) => sum + (t.is_billable ? (t.billing_rate || 0) * (t.actual_hours || 0) : 0), 0);

            rows += `
                <tr>
                    <td><strong>${type.name || 'Adsız'}</strong></td>
                    <td>${type.code || '-'}</td>
                    <td>${type.hourly_rate || 0} ₼/saat</td>
                    <td>${total}</td>
                    <td>${totalHours} saat</td>
                    <td>${this.utils.formatMoney(totalRevenue)}</td>
                </tr>
            `;
        });

        return `
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>İş növü</th>
                        <th>Kod</th>
                        <th>Saatlıq qiymət</th>
                        <th>Task sayı</th>
                        <th>Ümumi saat</th>
                        <th>Ümumi gəlir</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    generateFinancialTable() {
        const financial = this.data.financial || {};
        const tasks = this.data.tasks || [];
        const companies = this.data.companies || [];

        let companyRows = '';
        companies.slice(0, 5).forEach(company => {
            const companyTasks = tasks.filter(t => t.company_id === company.id);
            const revenue = companyTasks.reduce((sum, t) => sum + (t.is_billable ? (t.billing_rate || 0) * (t.actual_hours || 0) : 0), 0);
            const cost = companyTasks.reduce((sum, t) => sum + ((t.actual_hours || 0) * 50), 0);
            const taskCount = companyTasks.length;

            companyRows += `
                <tr>
                    <td>${company.company_name || company.name || '-'}</td>
                    <td>${taskCount}</td>
                    <td>${this.utils.formatMoney(revenue)}</td>
                    <td>${this.utils.formatMoney(cost)}</td>
                    <td>${this.utils.formatMoney(revenue - cost)}</td>
                    <td>${taskCount ? Math.round(((revenue - cost) / revenue) * 100) : 0}%</td>
                </tr>
            `;
        });

        return `
            <h4>Ümumi maliyyə göstəriciləri</h4>
            <div class="financial-summary-cards">
                <div class="summary-card">
                    <div class="summary-card-label">Ümumi gəlir</div>
                    <div class="summary-card-value">${this.utils.formatMoney(financial.total_revenue || 0)}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-label">Ümumi xərc</div>
                    <div class="summary-card-value">${this.utils.formatMoney(financial.total_cost || 0)}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-label">Xalis mənfəət</div>
                    <div class="summary-card-value">${this.utils.formatMoney(financial.total_profit || 0)}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-label">Mənfəət marjası</div>
                    <div class="summary-card-value">${financial.profit_margin || 0}%</div>
                </div>
            </div>

            <h4 style="margin-top: 30px;">Şirkətlər üzrə maliyyə</h4>
            <table class="detail-table">
                <thead>
                    <tr>
                        <th>Şirkət</th>
                        <th>Task sayı</th>
                        <th>Gəlir</th>
                        <th>Xərc</th>
                        <th>Mənfəət</th>
                        <th>Marja</th>
                    </tr>
                </thead>
                <tbody>
                    ${companyRows || '<tr><td colspan="6" class="text-center">Məlumat yoxdur</td></tr>'}
                </tbody>
            </table>
        `;
    }

    generateFullReport() {
        const startDate = this.utils.formatDate(this.manager.dateRange.start);
        const endDate = this.utils.formatDate(this.manager.dateRange.end);
        const stats = this.manager.stats;

        // Top employees
        const employees = this.data.employees || [];
        const tasks = this.data.tasks || [];

        const employeePerformance = employees.map(emp => {
            const empTasks = tasks.filter(t => t.assigned_to === emp.id);
            return {
                ...emp,
                completed: empTasks.filter(t => t.status === 'completed').length,
                total: empTasks.length
            };
        }).sort((a, b) => b.completed - a.completed).slice(0, 5);

        const topEmployeesList = employeePerformance.map(emp => {
            const fullName = emp.name && emp.surname ?
                `${emp.name} ${emp.surname}` :
                (emp.name || emp.ceo_name || 'Adsız');
            return `<li>${fullName} (${emp.department_name || emp.departmentName || '-'}) - ${emp.completed} tamamlanan tapşırıq</li>`;
        }).join('');

        // Top companies
        const companies = this.data.companies || [];
        const companyPerformance = companies.map(comp => {
            const compTasks = tasks.filter(t => t.company_id === comp.id);
            return {
                ...comp,
                completed: compTasks.filter(t => t.status === 'completed').length,
                total: compTasks.length
            };
        }).sort((a, b) => b.completed - a.completed).slice(0, 5);

        const topCompaniesList = companyPerformance.map(comp =>
            `<li>${comp.company_name || comp.name || 'Adsız'} - ${comp.completed} tamamlanan tapşırıq</li>`
        ).join('');

        return `
            <div class="full-report">
                <div class="report-period">
                    <i class="fas fa-calendar-alt"></i>
                    <strong>Hesabat dövrü:</strong> ${startDate} - ${endDate}
                </div>
                
                <div class="report-summary-cards">
                    <div class="summary-card">
                        <div class="summary-card-label">Ümumi tapşırıqlar</div>
                        <div class="summary-card-value">${stats.total}</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-card-label">Tamamlanan</div>
                        <div class="summary-card-value">${stats.completed}</div>
                        <small>${stats.completedPercentage}%</small>
                    </div>
                    <div class="summary-card">
                        <div class="summary-card-label">Gözləmədə</div>
                        <div class="summary-card-value">${stats.pending}</div>
                        <small>${stats.pendingPercentage}%</small>
                    </div>
                    <div class="summary-card">
                        <div class="summary-card-label">Müddəti keçən</div>
                        <div class="summary-card-value">${stats.overdue}</div>
                        <small>${stats.overduePercentage}%</small>
                    </div>
                </div>
                
                <div class="report-section">
                    <h4><i class="fas fa-chart-line"></i> Əsas göstəricilər</h4>
                    <div class="key-metrics">
                        <div class="metric-item">
                            <span class="metric-label">Orta icra müddəti:</span>
                            <span class="metric-value">${stats.avgCompletionTime} gün</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Məhsuldarlıq dərəcəsi:</span>
                            <span class="metric-value">${stats.productivityRate}%</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Vaxtında tamamlanma:</span>
                            <span class="metric-value">${stats.ontimeRate}%</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Aktiv işçilər:</span>
                            <span class="metric-value">${stats.activeUsers}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Ümumi gəlir:</span>
                            <span class="metric-value">${this.utils.formatMoney(stats.totalRevenue)}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Xalis mənfəət:</span>
                            <span class="metric-value">${this.utils.formatMoney(stats.totalProfit)}</span>
                        </div>
                    </div>
                </div>
                
                <h4><i class="fas fa-building"></i> Şirkətlər üzrə statistika</h4>
                ${this.generateCompanyDetailTable(true)}
                
                <h4><i class="fas fa-users"></i> İşçilər üzrə statistika</h4>
                ${this.generateEmployeeDetailTable(true)}
                
                <div class="report-grid">
                    <div class="report-grid-item">
                        <h4><i class="fas fa-star"></i> Ən aktiv işçilər</h4>
                        <ol class="top-list">
                            ${topEmployeesList || '<li>Məlumat yoxdur</li>'}
                        </ol>
                    </div>
                    
                    <div class="report-grid-item">
                        <h4><i class="fas fa-building"></i> Ən aktiv şirkətlər</h4>
                        <ol class="top-list">
                            ${topCompaniesList || '<li>Məlumat yoxdur</li>'}
                        </ol>
                    </div>
                </div>

                <h4><i class="fas fa-handshake"></i> Partner statistikası</h4>
                ${this.generatePartnerDetailTable(true)}

                <h4><i class="fas fa-chart-pie"></i> Maliyyə hesabatı</h4>
                ${this.generateFinancialTable()}
            </div>
        `;
    }

    generateCompanyDetailContent(reportData, company) {
        let content = '<div class="company-detail">';
        content += `<h3>${company.company_name || company.name || 'Şirkət'}</h3>`;
        content += `<p>Kod: ${company.company_code || company.code || '-'}</p>`;

        if (reportData.tasks && reportData.tasks.length > 0) {
            content += '<h4>Tapşırıqlar</h4>';
            content += '<table class="detail-table"><thead><tr><th>Tapşırıq</th><th>Status</th><th>Tarix</th></tr></thead><tbody>';
            reportData.tasks.slice(0, 10).forEach(task => {
                content += `<tr><td>${task.task_title || '-'}</td><td>${task.status || '-'}</td><td>${task.created_at ? this.utils.formatDate(task.created_at) : '-'}</td></tr>`;
            });
            content += '</tbody></table>';
        } else {
            content += '<p>Tapşırıq yoxdur</p>';
        }

        content += '</div>';
        return content;
    }

        // ... bütün kod eyni qalır ...

    generateEmployeeDetailContent(reportData, employee) {
        let content = '<div class="employee-detail">';
        const fullName = employee.name && employee.surname ?
            `${employee.name} ${employee.surname}` :
            (employee.name || employee.ceo_name || 'İşçi');

        content += `<h3>${fullName}</h3>`;
        content += `<p>Vəzifə: ${employee.position || '-'} | Şöbə: ${employee.department_name || '-'}</p>`;

        if (reportData.tasks && reportData.tasks.length > 0) {
            content += '<h4>Tapşırıqlar</h4>';
            content += '<table class="detail-table"><thead><tr><th>Tapşırıq</th><th>Status</th><th>Tarix</th></tr></thead><tbody>';
            reportData.tasks.slice(0, 10).forEach(task => {
                content += `<tr><td>${task.task_title || '-'}</td><td>${task.status || '-'}</td><td>${task.created_at ? this.utils.formatDate(task.created_at) : '-'}</td></tr>`;
            });
            content += '</tbody></table>';
        } else {
            content += '<p>Tapşırıq yoxdur</p>';
        }

        content += '</div>';
        return content;
    }
}

// Global modula əlavə et - DÜZGÜN AD!
window.ReportModules = window.ReportModules || {};
window.ReportModules.ModalManager = ReportModalManager;  // DÜZƏLDİ: ReportModalManager