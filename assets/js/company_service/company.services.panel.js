/**
 * Şirkət detallarındakı "Görüləcək xidmətlər" paneli.
 * Owner və worker profilləri eyni səlahiyyət yoxlaması və UI-dan istifadə edir.
 */
class CompanyServicesPanel {
    constructor(apiService2 = window.apiService2) {
        this.apiService2 = apiService2;
        this.context = null;
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    getItems(response) {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.items)) return response.items;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.data?.items)) return response.data.items;
        return [];
    }

    isExecutor(company) {
        return company?.is_child === true || company?.relationship_type === 'child';
    }

    isCustomer(company) {
        return company?.is_parent === true || company?.relationship_type === 'parent';
    }

    canAddService(context = this.context) {
        const currentCompanyId = context?.getCurrentCompanyId?.();
        return this.isExecutor(context?.company) &&
            Boolean(currentCompanyId) &&
            Boolean(context?.company?.id) &&
            String(currentCompanyId) !== String(context.company.id);
    }

    async getServicesBetween(context = this.context) {
        const currentCompanyId = context?.getCurrentCompanyId?.();
        const viewedCompanyId = context?.company?.id;
        if (!currentCompanyId || !viewedCompanyId) return [];

        this.apiService2 = this.apiService2 || window.apiService2;
        if (!this.apiService2) throw new Error('Company services API servisi tapılmadı');

        const response = await this.apiService2.companyServices.list({
            company_id: currentCompanyId,
            page: 1,
            per_page: 100
        });
        if (response?.success === false) {
            throw new Error(response.error || 'Xidmətlər yüklənmədi');
        }

        return this.getItems(response)
            .filter(item => {
                const creatorId = String(item?.creator_company_id ?? '');
                const partnerId = String(item?.partner_company_id ?? '');
                const currentId = String(currentCompanyId);
                const viewedId = String(viewedCompanyId);
                const hasLegacyContract = Boolean(item?.contract_code);

                if (hasLegacyContract) return false;
                if (this.isExecutor(context.company)) {
                    return creatorId === currentId && partnerId === viewedId;
                }
                if (this.isCustomer(context.company)) {
                    return creatorId === viewedId && partnerId === currentId;
                }
                return false;
            })
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    async render(context) {
        this.context = context;
        const body = document.getElementById(context.containerId || 'cdpBody');
        if (!body) return;

        body.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;font-size:13px;">Xidmətlər yüklənir...</div>';

        let services;
        try {
            services = await this.getServicesBetween(context);
        } catch (error) {
            console.error('Görüləcək xidmətləri yükləmə xətası:', error);
            body.innerHTML = '<div style="color:#991b1b;text-align:center;padding:20px;background:#fef2f2;border-radius:12px;">Xidmətləri yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.</div>';
            return;
        }

        const canAdd = this.canAddService(context);
        const viewOnlyNote = this.isCustomer(context.company)
            ? '<div style="font-size:12px;color:#6b7280;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:9px 12px;"><i class="fa-solid fa-eye" style="margin-right:6px;color:#185FA5;"></i>Bu bölmə sizin üçün yalnız baxış rejimindədir.</div>'
            : '';

        const cards = services.length
            ? services.map(service => {
                const createdAt = service.created_at
                    ? new Date(service.created_at).toLocaleDateString('az-AZ')
                    : '';
                const isActive = service.is_active !== false && service.status !== 'inactive';
                return `
                    <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 5px 16px rgba(15,23,42,.035);">
                        <div style="width:38px;height:38px;border-radius:11px;background:#EAF3FF;color:#185FA5;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fa-solid fa-list-check"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:14px;font-weight:600;color:#111827;word-break:break-word;">${this.escapeHtml(service.service_name || 'Adsız xidmət')}</div>
                            ${createdAt ? `<div style="font-size:11px;color:#9ca3af;margin-top:3px;">Əlavə olunub: ${this.escapeHtml(createdAt)}</div>` : ''}
                        </div>
                        <span style="font-size:11px;padding:4px 10px;border-radius:999px;background:${isActive ? '#DCFCE7' : '#F3F4F6'};color:${isActive ? '#166534' : '#6B7280'};white-space:nowrap;">${isActive ? 'Aktiv' : 'Qeyri-aktiv'}</span>
                    </div>`;
            }).join('')
            : '<div style="text-align:center;padding:38px;color:#9ca3af;background:#f9fafb;border:1px dashed #d1d5db;border-radius:14px;"><i class="fa-solid fa-list-check" style="font-size:30px;margin-bottom:10px;display:block;color:#cbd5e1;"></i>Hələ görüləcək xidmət əlavə edilməyib</div>';

        body.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:18px;flex-wrap:wrap;">
                <div>
                    <h3 style="margin:0 0 5px;font-size:19px;font-weight:700;color:#111827;">Görüləcək xidmətlər</h3>
                    <p style="margin:0;font-size:12px;color:#6b7280;">İcraçı şirkətin bu şirkət üçün görəcəyi və ya gördüyü xidmətlər</p>
                </div>
                ${canAdd ? '<button id="cdpAddCompanyService" type="button" style="padding:10px 16px;background:#185FA5;color:#fff;border:none;border-radius:11px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:7px;"><i class="fa-solid fa-plus"></i>Xidmət əlavə et</button>' : ''}
            </div>
            ${viewOnlyNote ? `<div style="margin-bottom:14px;">${viewOnlyNote}</div>` : ''}
            <div style="display:flex;flex-direction:column;gap:9px;">${cards}</div>`;

        document.getElementById('cdpAddCompanyService')?.addEventListener('click', () => this.openAddModal(context));
    }

    async loadWorkTypes(context = this.context) {
        const currentCompanyId = context?.getCurrentCompanyId?.();
        if (!currentCompanyId) return [];

        let workTypes = [];
        if (typeof window.getWorkTypesWithCache === 'function') {
            workTypes = await window.getWorkTypesWithCache(currentCompanyId);
        } else if (window.apiService) {
            workTypes = this.getItems(await window.apiService.get(`/worktypes/company/${currentCompanyId}`));
        }

        return (Array.isArray(workTypes) ? workTypes : [])
            .filter(workType => workType?.is_active !== false)
            .sort((a, b) => this.getWorkTypeName(a).localeCompare(this.getWorkTypeName(b), 'az'));
    }

    getWorkTypeName(workType) {
        return workType?.work_type_name || workType?.name || workType?.title || `İş növü ${workType?.id ?? ''}`.trim();
    }

    async openAddModal(context = this.context) {
        if (!this.canAddService(context)) return;
        const modal = document.getElementById(context.modalId || 'cdpModal');
        if (!modal) return;

        modal.innerHTML = `
            <div id="companyServiceOverlay" style="position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(2px);padding:16px;">
                <div style="background:#fff;border-radius:16px;width:500px;max-width:100%;box-shadow:0 24px 48px rgba(15,23,42,.18);overflow:hidden;">
                    <div style="padding:19px 22px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="margin:0;font-size:18px;font-weight:700;color:#111827;">Xidmət əlavə et</h3>
                        <button id="closeCompanyServiceModal" type="button" style="background:none;border:none;font-size:23px;color:#6b7280;cursor:pointer;line-height:1;">&times;</button>
                    </div>
                    <div style="padding:22px;">
                        <label for="companyServiceWorkType" style="display:block;margin-bottom:7px;font-size:12px;color:#4b5563;font-weight:600;">İşin növü *</label>
                        <select id="companyServiceWorkType" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:11px;font-size:13px;font-family:inherit;background:#fff;color:#111827;">
                            <option value="">Yüklənir...</option>
                        </select>
                        <div id="companyServiceFormError" style="display:none;color:#b91c1c;font-size:12px;margin-top:8px;"></div>
                    </div>
                    <div style="padding:15px 22px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px;background:#f9fafb;">
                        <button id="cancelCompanyService" type="button" style="padding:10px 16px;background:#fff;border:1px solid #d1d5db;color:#374151;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">Ləğv et</button>
                        <button id="saveCompanyService" type="button" style="padding:10px 18px;background:#185FA5;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">Əlavə et</button>
                    </div>
                </div>
            </div>`;

        const close = () => { modal.innerHTML = ''; };
        document.getElementById('closeCompanyServiceModal')?.addEventListener('click', close);
        document.getElementById('cancelCompanyService')?.addEventListener('click', close);
        document.getElementById('companyServiceOverlay')?.addEventListener('click', event => {
            if (event.target === event.currentTarget) close();
        });

        const select = document.getElementById('companyServiceWorkType');
        try {
            const workTypes = await this.loadWorkTypes(context);
            if (!select) return;
            select.innerHTML = '<option value="">İş növü seçin</option>' + workTypes.map(workType => {
                const id = workType?.id ?? this.getWorkTypeName(workType);
                const name = this.getWorkTypeName(workType);
                return `<option value="${this.escapeHtml(id)}" data-name="${this.escapeHtml(name)}">${this.escapeHtml(name)}</option>`;
            }).join('');
            if (!workTypes.length) select.innerHTML += '<option value="" disabled>Aktiv iş növü tapılmadı</option>';
        } catch (error) {
            console.error('İş növlərini yükləmə xətası:', error);
            if (select) select.innerHTML = '<option value="">İş növləri yüklənmədi</option>';
        }

        document.getElementById('saveCompanyService')?.addEventListener('click', () => this.submit(context));
    }

    async submit(context = this.context) {
        if (!this.canAddService(context)) return;

        const select = document.getElementById('companyServiceWorkType');
        const errorBox = document.getElementById('companyServiceFormError');
        const saveButton = document.getElementById('saveCompanyService');
        const selectedOption = select?.options?.[select.selectedIndex];
        const serviceName = selectedOption?.dataset?.name || '';

        if (!select?.value || !serviceName) {
            if (errorBox) {
                errorBox.textContent = 'İş növü seçilməlidir.';
                errorBox.style.display = 'block';
            }
            return;
        }

        const payload = {
            service_name: serviceName,
            service_type: 'other',
            creator_company_id: Number(context.getCurrentCompanyId()),
            partner_company_id: Number(context.company.id),
            is_active: true,
            status: 'active'
        };

        try {
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.textContent = 'Əlavə olunur...';
            }
            const response = await this.apiService2.companyServices.create(payload);
            if (response?.success === false) throw new Error(response.error || 'Xidmət əlavə edilmədi');

            const modal = document.getElementById(context.modalId || 'cdpModal');
            if (modal) modal.innerHTML = '';
            await this.render(context);
            if (window.Swal) {
                window.Swal.fire({ icon: 'success', title: 'Xidmət əlavə edildi', timer: 1600, showConfirmButton: false });
            }
        } catch (error) {
            console.error('Xidmət əlavə etmə xətası:', error);
            if (errorBox) {
                errorBox.textContent = error.message || 'Xidməti əlavə etmək mümkün olmadı.';
                errorBox.style.display = 'block';
            }
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = 'Əlavə et';
            }
        }
    }
}

window.CompanyServicesPanel = CompanyServicesPanel;
window.companyServicesPanel = window.companyServicesPanel || new CompanyServicesPanel(window.apiService2);
