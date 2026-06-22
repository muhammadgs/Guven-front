// raport/components/FilterBar.js
// Filter paneli komponenti

class FilterBar {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            filters: [
                { name: 'company_id', label: 'Şirkət', type: 'select', options: [] },
                { name: 'department_id', label: 'Şöbə', type: 'select', options: [] },
                { name: 'status', label: 'Status', type: 'select', options: [
                    { value: '', label: 'Hamısı' },
                    { value: 'pending', label: 'Gözləmədə' },
                    { value: 'in_progress', label: 'İcra edilir' },
                    { value: 'completed', label: 'Tamamlanıb' },
                    { value: 'overdue', label: 'Müddəti keçib' }
                ] },
                { name: 'priority', label: 'Prioritet', type: 'select', options: [
                    { value: '', label: 'Hamısı' },
                    { value: 'low', label: 'Aşağı' },
                    { value: 'medium', label: 'Orta' },
                    { value: 'high', label: 'Yüksək' },
                    { value: 'critical', label: 'Kritik' }
                ] },
                { name: 'payment_status', label: 'Ödəniş Statusu', type: 'select', options: [
                    { value: '', label: 'Hamısı' },
                    { value: 'pending', label: 'Gözləyir' },
                    { value: 'paid', label: 'Ödənilib' },
                    { value: 'partial', label: 'Qismən' }
                ] }
            ],
            onFilterChange: null,
            ...options
        };
        this.values = {};
        this.render();
    }

    async render() {
        this.container.innerHTML = `
            <div class="filter-bar">
                <div class="filter-row">
                    ${this.options.filters.map(filter => `
                        <div class="filter-group">
                            <label>${filter.label}</label>
                            <${filter.type === 'select' ? 'select' : 'input'} 
                                id="filter-${filter.name}" 
                                class="filter-input"
                                ${filter.type === 'select' ? '' : `type="${filter.type}"`}
                            >
                                ${filter.type === 'select' ? filter.options.map(opt => `
                                    <option value="${opt.value}">${opt.label}</option>
                                `).join('') : ''}
                            </${filter.type === 'select' ? 'select' : 'input'}>
                        </div>
                    `).join('')}
                    <div class="filter-actions">
                        <button class="filter-apply-btn" id="filter-apply">Tətbiq et</button>
                        <button class="filter-reset-btn" id="filter-reset">Sıfırla</button>
                    </div>
                </div>
            </div>
        `;

        // Populate dynamic selects
        const companyFilter = this.container.querySelector('#filter-company_id');
        const departmentFilter = this.container.querySelector('#filter-department_id');

        if (companyFilter && this.options.companies) {
            companyFilter.innerHTML = '<option value="">Hamısı</option>' +
                this.options.companies.map(c => `<option value="${c.id}">${c.company_name}</option>`).join('');
        }

        if (departmentFilter && this.options.departments) {
            departmentFilter.innerHTML = '<option value="">Hamısı</option>' +
                this.options.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        }

        // Bind events
        this.container.querySelector('#filter-apply').addEventListener('click', () => {
            this.options.filters.forEach(filter => {
                const el = this.container.querySelector(`#filter-${filter.name}`);
                if (el) this.values[filter.name] = el.value;
            });
            if (this.options.onFilterChange) this.options.onFilterChange(this.values);
        });

        this.container.querySelector('#filter-reset').addEventListener('click', () => {
            this.options.filters.forEach(filter => {
                const el = this.container.querySelector(`#filter-${filter.name}`);
                if (el) el.value = '';
                this.values[filter.name] = '';
            });
            if (this.options.onFilterChange) this.options.onFilterChange(this.values);
        });
    }

    setCompanies(companies) {
        this.options.companies = companies;
        const companyFilter = this.container?.querySelector('#filter-company_id');
        if (companyFilter) {
            companyFilter.innerHTML = '<option value="">Hamısı</option>' +
                companies.map(c => `<option value="${c.id}">${c.company_name}</option>`).join('');
        }
    }

    setDepartments(departments) {
        this.options.departments = departments;
        const deptFilter = this.container?.querySelector('#filter-department_id');
        if (deptFilter) {
            deptFilter.innerHTML = '<option value="">Hamısı</option>' +
                departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        }
    }

    getValues() {
        return { ...this.values };
    }
}

window.FilterBar = FilterBar;