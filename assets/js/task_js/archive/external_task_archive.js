// external_task_archive.js - Tam versiya

const ExternalTaskArchive = {

    /**
     * External arxiv tasklarını yükləyir
     */
    loadExternalArchiveTasks: async function(page = 1, limit = 20) {
        try {
            console.log(`📁 External arxiv tasklar yüklənir (səhifə ${page})...`);

            const internalTab = document.getElementById('internalArchiveTab');
            const externalTab = document.getElementById('externalArchiveTab');
            const partnerTab = document.getElementById('partnerArchiveTab');


            if (internalTab) internalTab.classList.remove('active');
            if (partnerTab) partnerTab.classList.remove('active');
            if (externalTab) externalTab.classList.add('active');

            this.showLoading('External arxiv tasklar yüklənir...');

            const queryParams = new URLSearchParams({
                page: page,
                limit: limit
            });

            const endpoint = `/task-archive/external?${queryParams.toString()}`;
            console.log(`📡 Endpoint: ${endpoint}`);

            const response = await makeApiRequest(endpoint, 'GET');
            console.log('📦 External arxiv cavabı:', response);

            let archiveTasks = [];
            let total = 0;
            let totalPages = 1;

            if (response && !response.error) {
                if (response.items && Array.isArray(response.items)) {
                    archiveTasks = response.items;
                    total = response.total || archiveTasks.length;
                    totalPages = response.pages || Math.ceil(total / limit);
                } else if (response.data && Array.isArray(response.data)) {
                    archiveTasks = response.data;
                    total = archiveTasks.length;
                    totalPages = Math.ceil(total / limit);
                } else if (Array.isArray(response)) {
                    archiveTasks = response;
                    total = archiveTasks.length;
                    totalPages = Math.ceil(total / limit);
                }
            }

            console.log(`✅ ${archiveTasks.length} external arxiv task tapıldı`);

            await this.renderExternalArchiveTasks(archiveTasks, page, total, totalPages);
            await this.updateArchiveCounts();
            this.hideLoading();

            return { tasks: archiveTasks, total, totalPages };

        } catch (error) {
            console.error('❌ External arxiv yükləmə xətası:', error);
            this.hideLoading();
            this.showExternalArchiveEmpty();
            return { tasks: [], total: 0, totalPages: 1 };
        }
    },

    /**
     * External arxiv tasklarını cədvəldə göstərir
     */
    renderExternalArchiveTasks: async function(tasks, page, total, totalPages) {
        const tbody = document.getElementById('archiveTableBody');
        if (!tbody) {
            console.error('❌ archiveTableBody tapılmadı!');
            return;
        }

        if (!tasks || tasks.length === 0) {
            this.showExternalArchiveEmpty();
            return;
        }

        try {
            let html = '';
            const startIndex = (page - 1) * 20;

            for (let i = 0; i < tasks.length; i++) {
                const task = tasks[i];
                const rowHTML = this.createExternalArchiveRowHTML(task, i, page, startIndex);
                html += rowHTML;
            }

            tbody.innerHTML = html;
            console.log('✅ External arxiv cədvəli yeniləndi');
            this.updateExternalArchivePagination(page, total, totalPages);

        } catch (error) {
            console.error('❌ External arxiv render xətası:', error);
            this.showExternalArchiveEmpty();
        }
    },

    /**
     * External arxiv taskı üçün HTML sətri yaradır
     */
    createExternalArchiveRowHTML: function(task, index, page, startIndex) {
        const serialNumber = startIndex + index + 1;
        const hourlyRate = task.hourly_rate || task.billing_rate || 0;
        const durationMinutes = task.duration_minutes ||
            (task.estimated_hours ? task.estimated_hours * 60 : 0) ||
            (task.actual_hours ? task.actual_hours * 60 : 0) || 0;
        const calculatedSalary = this.calculateSalary(hourlyRate, durationMinutes);

        // Şirkət adı - ID yox, AD!
        let sourceCompanyName = task.company_name || '-';
        let targetCompanyName = task.target_company_name || '-';

        let displayCompanyName = sourceCompanyName;
        if (targetCompanyName !== '-') {
            displayCompanyName = `${sourceCompanyName} → ${targetCompanyName}`;
        }

        const creatorName = task.creator_name || task.created_by_name || '-';
        const executorName = task.assigned_to_name || task.executor_name || 'Təyin edilməyib';
        const departmentName = task.department_name || '-';
        const workTypeName = task.work_type_name || '-';
        const description = task.task_description || task.description || '';

        // Deadline kontrolu
        const now = new Date();
        const dueDate = task.due_date ? new Date(task.due_date) : null;
        const isOverdue = dueDate && dueDate < now && task.status !== 'completed';
        const dueDateClass = isOverdue ? 'text-danger fw-bold overdue-date' : '';
        const dueDateIcon = isOverdue ? '<i class="fa-solid fa-exclamation-triangle ms-1" title="Bu taskın vaxtı keçib!"></i>' : '';

        // Status badge
        let statusText = '';
        let statusClass = '';

        if (task.status === 'completed') {
            statusText = 'Tamamlandı';
            statusClass = 'status-completed';
        } else if (task.status === 'rejected' || task.status === 'cancelled') {
            statusText = 'Ləğv edildi';
            statusClass = 'status-rejected';
        } else {
            statusText = task.status || 'Bilinmir';
            statusClass = 'status-pending';
        }

        const statusBadgeHTML = `<span class="status-badge ${statusClass}">${statusText}</span>`;

        // Fayl sütunu
        let fileColumnHTML = '-';
        if (task.attachments && task.attachments.length > 0) {
            let attachments = task.attachments;
            if (typeof attachments === 'string') {
                try { attachments = JSON.parse(attachments); } catch (e) {}
            }
            if (Array.isArray(attachments) && attachments.length > 0) {
                fileColumnHTML = `
                    <div class="file-indicator" onclick="ExternalTaskArchive.showTaskFiles(${task.id})" style="cursor: pointer;" title="${attachments.length} fayl">
                        <i class="fas fa-paperclip"></i>
                        <span>${attachments.length}</span>
                    </div>
                `;
            }
        }

        const archivedDate = task.archived_at || task.archived_date || '-';

        const detailsButton = `
            <button class="btn btn-sm btn-secondary" onclick="ExternalTaskArchive.viewArchiveTaskDetails(${task.id})" title="Detallara bax">
                <i class="fa-solid fa-eye"></i>
            </button>
        `;

        return `
            <tr data-archive-id="${task.id}" data-task-id="${task.original_task_id}" class="archive-task-row external-archive-row">
                <td class="text-center">${serialNumber}</td>
                <td>${this.formatDate(task.created_at)}</td>
                <td>
                    <div class="company-name-cell">
                        <i class="fas fa-exchange-alt text-info me-1"></i>
                        ${this.escapeHtml(displayCompanyName)}
                    </div>
                </td>
                <td>${this.escapeHtml(creatorName)}</td>
                <td>${this.escapeHtml(executorName)}</td>
                <td class="actions-col">
                    <div class="action-buttons">
                        ${detailsButton}
                    </div>
                </td>
                <td>${this.escapeHtml(workTypeName)}</td>
                <td class="description-col">
                    <div class="description-container">
                        ${description.length > 100 ? 
                            `<span title="${this.escapeHtml(description)}">${this.truncateText(description, 100)}</span>` : 
                            this.escapeHtml(description) || '-'
                        }
                    </div>
                </td>
                <td class="file-col">${fileColumnHTML}</td>
                <td class="${dueDateClass}">${this.formatDate(task.due_date)} ${dueDateIcon}</td>
                <td>${statusBadgeHTML}</td>
                <td>${this.formatDate(task.completed_date)}</td>
                <td>${this.formatDate(archivedDate)}</td>
                <td class="text-right">${durationMinutes}</td>
                <td class="text-right">${this.escapeHtml(departmentName)}</td>
            </tr>
        `;
    },

    /**
     * External arxiv pagination-ını yeniləyir
     */
    updateExternalArchivePagination: function(currentPage, total, totalPages) {
        const pagination = document.getElementById('archivePagination');
        const showing = document.getElementById('archiveShowing');
        const pageNumbers = document.getElementById('archivePageNumbers');

        if (!pagination || !showing || !pageNumbers) return;

        if (total === 0) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';

        const pageSize = 20;
        const start = (currentPage - 1) * pageSize + 1;
        const end = Math.min(currentPage * pageSize, total);
        showing.textContent = `Göstərilir: ${start}-${end} / ${total} (External arxiv)`;

        let numbersHTML = '';

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                numbersHTML += `<button class="pagination-number ${i === currentPage ? 'active' : ''}" 
                                    onclick="ExternalTaskArchive.loadExternalArchiveTasks(${i})">${i}</button>`;
            }
        } else {
            numbersHTML += `<button class="pagination-number ${1 === currentPage ? 'active' : ''}" 
                                onclick="ExternalTaskArchive.loadExternalArchiveTasks(1)">1</button>`;

            if (currentPage > 3) {
                numbersHTML += '<span class="pagination-ellipsis">...</span>';
            }

            let startPage = Math.max(2, currentPage - 1);
            let endPage = Math.min(totalPages - 1, currentPage + 1);

            for (let i = startPage; i <= endPage; i++) {
                numbersHTML += `<button class="pagination-number ${i === currentPage ? 'active' : ''}" 
                                    onclick="ExternalTaskArchive.loadExternalArchiveTasks(${i})">${i}</button>`;
            }

            if (currentPage < totalPages - 2) {
                numbersHTML += '<span class="pagination-ellipsis">...</span>';
            }

            numbersHTML += `<button class="pagination-number ${totalPages === currentPage ? 'active' : ''}" 
                                onclick="ExternalTaskArchive.loadExternalArchiveTasks(${totalPages})">${totalPages}</button>`;
        }

        pageNumbers.innerHTML = numbersHTML;

        const firstBtn = document.getElementById('archiveFirstPage');
        const prevBtn = document.getElementById('archivePrevPage');
        const nextBtn = document.getElementById('archiveNextPage');
        const lastBtn = document.getElementById('archiveLastPage');

        if (firstBtn) {
            firstBtn.disabled = currentPage === 1;
            firstBtn.onclick = () => this.loadExternalArchiveTasks(1);
        }
        if (prevBtn) {
            prevBtn.disabled = currentPage === 1;
            prevBtn.onclick = () => this.loadExternalArchiveTasks(currentPage - 1);
        }
        if (nextBtn) {
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.onclick = () => this.loadExternalArchiveTasks(currentPage + 1);
        }
        if (lastBtn) {
            lastBtn.disabled = currentPage === totalPages;
            lastBtn.onclick = () => this.loadExternalArchiveTasks(totalPages);
        }
    },

    /**
     * Arxiv saylarını yeniləyir
     */
    updateArchiveCounts: async function() {
        try {
            const externalResponse = await makeApiRequest('/task-archive/external?page=1&limit=1', 'GET');
            let externalCount = 0;
            if (externalResponse && !externalResponse.error) {
                externalCount = externalResponse.total || 0;
            }

            const externalCountSpan = document.getElementById('externalArchiveCount');
            if (externalCountSpan) externalCountSpan.textContent = externalCount;

        } catch (error) {
            console.error('❌ Arxiv sayları yüklənərkən xəta:', error);
        }
    },

    /**
     * External arxiv boş vəziyyət göstərir
     */
    showExternalArchiveEmpty: function() {
        const tbody = document.getElementById('archiveTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="17" class="empty-state">
                        <i class="fas fa-globe fa-3x mb-3" style="color: #94a3b8;"></i>
                        <h3>External Arxiv İşləri</h3>
                        <p>Hazırda external arxivdə heç bir iş yoxdur.</p>
                        <p class="empty-hint">Tamamlanmış external işlər avtomatik olaraq buraya arxivlənir.</p>
                        <button class="primary-btn btn-sm" onclick="ExternalTaskArchive.loadExternalArchiveTasks(1)">
                            <i class="fas fa-sync-alt"></i> Yenidən yüklə
                        </button>
                    </td>
                </tr>
            `;
        }

        const pagination = document.getElementById('archivePagination');
        if (pagination) pagination.style.display = 'none';
    },

    /**
     * Arxiv task detallarını göstərir
     */
    viewArchiveTaskDetails: async function(archiveId) {
        console.log(`📋 External arxiv task detalları: ${archiveId}`);

        if (window.ArchiveTasks && typeof window.ArchiveTasks.viewArchiveTaskDetails === 'function') {
            window.ArchiveTasks.viewArchiveTaskDetails(archiveId);
        } else {
            alert(`Arxiv ID: ${archiveId} detalları göstərilir`);
        }
    },

    /**
     * Task fayllarını göstərir
     */
    showTaskFiles: function(taskId) {
        console.log(`📁 Task files: ${taskId}`);
        alert(`Task ID: ${taskId} faylları göstərilir`);
    },

    /**
     * Yükləmə göstəricisi
     */
    showLoading: function(message = 'Yüklənir...') {
        let overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loader">
                        <div></div>
                        <div></div>
                    </div>
                    <p class="loading-text">${message}</p>
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            const textEl = overlay.querySelector('.loading-text');
            if (textEl) textEl.textContent = message;
            overlay.style.display = 'flex';
        }
    },

    /**
     * Yükləmə göstəricisini gizlət
     */
    hideLoading: function() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },

    /**
     * Tarixi formatla
     */
    formatDate: function(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleDateString('az-AZ');
        } catch (e) {
            return dateString;
        }
    },

    /**
     * Maaş hesabla
     */
    calculateSalary: function(hourlyRate, durationMinutes) {
        if (!hourlyRate || !durationMinutes) return '0.00';
        const hours = durationMinutes / 60;
        const salary = hours * parseFloat(hourlyRate);
        return salary.toFixed(2);
    },

    /**
     * Mətni qısalt
     */
    truncateText: function(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return this.escapeHtml(text);
        return this.escapeHtml(text.substring(0, maxLength)) + '...';
    },

    /**
     * HTML-dən qoru
     */
    escapeHtml: function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Global export
if (typeof window !== 'undefined') {
    window.ExternalTaskArchive = ExternalTaskArchive;
    console.log('✅ ExternalTaskArchive yükləndi');
}