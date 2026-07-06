// raport/components/DataTable.js
// Təkrar istifadə olunan data cədvəli komponenti (pagination, search ilə)

class DataTable {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            columns: [],
            data: [],
            pageSize: 10,
            searchable: true,
            sortable: true,
            onRowClick: null,
            ...options
        };
        this.currentPage = 1;
        this.searchTerm = '';
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.filteredData = [];
        this.render();
    }

    setData(data) {
        this.options.data = data;
        this.currentPage = 1;
        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.options.data];

        // Search
        if (this.searchTerm && this.options.searchable) {
            filtered = filtered.filter(row => {
                return Object.values(row).some(value =>
                    String(value).toLowerCase().includes(this.searchTerm.toLowerCase())
                );
            });
        }

        // Sort
        if (this.sortColumn && this.options.sortable) {
            filtered.sort((a, b) => {
                let aVal = a[this.sortColumn];
                let bVal = b[this.sortColumn];
                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();
                if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        this.filteredData = filtered;
        this.renderTable();
        this.renderPagination();
    }

    render() {
        this.container.innerHTML = `
            ${this.options.searchable ? `
                <div class="datatable-search">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="Axtar..." id="datatable-search-${this.container.id}" class="datatable-search-input">
                </div>
            ` : ''}
            <div class="datatable-wrapper">
                <table class="datatable">
                    <thead>
                        <tr>
                            ${this.options.columns.map(col => `
                                <th data-column="${col.field}" class="${this.options.sortable ? 'sortable' : ''}">
                                    ${col.label}
                                    ${this.options.sortable ? '<i class="fas fa-sort"></i>' : ''}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody id="datatable-body-${this.container.id}">
                        <tr><td colspan="${this.options.columns.length}" class="datatable-loading">Yüklənir...</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="datatable-pagination" id="datatable-pagination-${this.container.id}"></div>
        `;

        // Bind search
        if (this.options.searchable) {
            const searchInput = document.getElementById(`datatable-search-${this.container.id}`);
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
            });
        }

        // Bind sort
        if (this.options.sortable) {
            this.container.querySelectorAll('th.sortable').forEach(th => {
                th.addEventListener('click', () => {
                    const column = th.dataset.column;
                    if (this.sortColumn === column) {
                        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        this.sortColumn = column;
                        this.sortDirection = 'asc';
                    }
                    this.applyFilters();
                });
            });
        }

        this.applyFilters();
    }

    renderTable() {
        const tbody = document.getElementById(`datatable-body-${this.container.id}`);
        const start = (this.currentPage - 1) * this.options.pageSize;
        const end = start + this.options.pageSize;
        const pageData = this.filteredData.slice(start, end);

        if (pageData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${this.options.columns.length}" class="datatable-empty">Məlumat yoxdur</td></tr>`;
            return;
        }

        tbody.innerHTML = pageData.map(row => `
            <tr ${this.options.onRowClick ? 'style="cursor:pointer"' : ''}>
                ${this.options.columns.map(col => `
                    <td>${this.formatCell(row[col.field], col.type)}</td>
                `).join('')}
            </tr>
        `).join('');

        if (this.options.onRowClick) {
            tbody.querySelectorAll('tr').forEach((row, idx) => {
                row.addEventListener('click', () => {
                    const actualIndex = start + idx;
                    this.options.onRowClick(this.filteredData[actualIndex]);
                });
            });
        }
    }

    formatCell(value, type = 'text') {
        if (value === undefined || value === null) return '-';
        switch(type) {
            case 'money': return ReportUtils.formatMoney(value);
            case 'date': return ReportUtils.formatDate(value);
            case 'status': return `<span class="badge ${ReportUtils.getStatusClass(value)}">${ReportUtils.getStatusLabel(value)}</span>`;
            case 'priority': return `<span class="priority-badge ${value}">${ReportUtils.getPriorityLabel(value)}</span>`;
            default: return ReportUtils.escapeHtml(String(value));
        }
    }

    renderPagination() {
        const paginationEl = document.getElementById(`datatable-pagination-${this.container.id}`);
        const totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);

        if (totalPages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }

        let html = '<div class="pagination">';
        html += `<button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} data-page="prev">«</button>`;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<span class="pagination-dots">...</span>';
            }
        }

        html += `<button class="pagination-btn" ${this.currentPage === totalPages ? 'disabled' : ''} data-page="next">»</button>`;
        html += '</div>';

        paginationEl.innerHTML = html;

        paginationEl.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                if (page === 'prev') this.currentPage--;
                else if (page === 'next') this.currentPage++;
                else this.currentPage = parseInt(page);
                this.renderTable();
                this.renderPagination();
            });
        });
    }
}

window.DataTable = DataTable;