// column-filter.js - DÜZƏLİŞ 2: Çoxlu seçim (multi-select) + HTML-də aktiv filtr badge
(function() {
    'use strict';

    console.log('🔍 MULTI-SELECT COLUMN FILTER yüklənir...');

    // ==================== KONFİQURASİYA ====================
    const CONFIG = {
        tables: [
            {
                id: '#activeTableSection',
                name: 'active',
                columns: ['Tarix', 'Şirkət', 'Kim tərəfindən', 'İcra edən', 'İşin növü', 'Son müddət', 'Status', 'Şöbə']
            },
            {
                id: '#partnerTableSection',
                name: 'partner',
                columns: ['Tarix', 'Şirkət', 'Kim tərəfindən', 'İcraçı', 'İş növü', 'Status', 'Son müddət', 'Şöbə']
            },
            {
                id: '#externalTableSection',
                name: 'external',
                columns: ['Tarix', 'Şirkət', 'Kim tərəfindən', 'İcra edən', 'İşin növü', 'Status', 'Son müddət']
            },
            {
                id: '#archiveTableSection',
                name: 'archive',
                columns: ['Tarix', 'Şirkət', 'Kim tərəfindən', 'İcra edən', 'Şöbə', 'İşin növü', 'Status', 'Son müddət']
            }
        ]
    };

    // filterValues[tableName][columnName] = Set of selected values (multi-select)
    const filterValues = {};
    const tableInstances = new Map();

    // ==================== CSS ƏLAVƏ ET ====================
    const style = document.createElement('style');
    style.id = 'multi-filter-styles';
    style.textContent = `
        .filter-dropdown-btn {
            position: absolute;
            top: 50%;
            right: 5px;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            padding: 4px 7px;
            border-radius: 4px;
            font-size: 11px;
            z-index: 100;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 3px;
        }
        .filter-dropdown-btn:hover { background: #f1f5f9 !important; }
        .filter-dropdown-btn.has-filter {
            color: #fff !important;
            background: #ef4444 !important;
            border-radius: 12px;
            font-weight: 700;
            font-size: 11px;
            padding: 3px 8px;
        }
        .filter-dropdown-btn.has-filter .filter-icon { display: none; }

        .filter-dropdown {
            font-family: inherit;
            animation: filterFadeIn 0.18s ease;
        }
        .filter-dropdown::-webkit-scrollbar { width: 5px; }
        .filter-dropdown::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .filter-dropdown::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

        .filter-dropdown-item {
            display: flex;
            align-items: center;
            padding: 7px 12px;
            cursor: pointer;
            transition: background 0.15s;
            font-size: 13px;
            gap: 8px;
        }
        .filter-dropdown-item:hover { background: #f1f5f9; }
        .filter-dropdown-item.is-selected {
            background: #eff6ff;
        }
        .filter-dropdown-item .item-check {
            width: 16px;
            height: 16px;
            border: 1.5px solid #cbd5e1;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: all 0.15s;
        }
        .filter-dropdown-item.is-selected .item-check {
            background: #3b82f6;
            border-color: #3b82f6;
        }
        .filter-dropdown-item.is-selected .item-check::after {
            content: '';
            width: 8px;
            height: 5px;
            border-left: 2px solid white;
            border-bottom: 2px solid white;
            transform: rotate(-45deg) translateY(-1px);
            display: block;
        }
        .filter-dropdown-item .item-text {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .filter-dropdown-item.all-item {
            border-bottom: 1px solid #e2e8f0;
            margin-bottom: 2px;
            font-weight: 500;
            color: #374151;
        }

        /* Aktiv filtr badge-i - cədvəl başlığında */
        .active-filters-bar {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
            padding: 6px 14px;
            background: #fef2f2;
            border-bottom: 1px solid #fecaca;
            border-top: 1px solid #fecaca;
        }
        .active-filters-bar .filter-bar-label {
            font-size: 12px;
            font-weight: 600;
            color: #dc2626;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .active-filters-bar .filter-chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #fee2e2;
            border: 1px solid #fca5a5;
            color: #b91c1c;
            border-radius: 20px;
            padding: 2px 8px 2px 10px;
            font-size: 11px;
            font-weight: 500;
        }
        .active-filters-bar .filter-chip .chip-col {
            font-weight: 700;
            margin-right: 2px;
        }
        .active-filters-bar .filter-chip .chip-val {
            opacity: 0.85;
        }
        .active-filters-bar .filter-chip .chip-remove {
            background: none;
            border: none;
            cursor: pointer;
            color: #b91c1c;
            font-size: 13px;
            padding: 0 0 0 4px;
            line-height: 1;
            display: flex;
            align-items: center;
        }
        .active-filters-bar .filter-chip .chip-remove:hover { color: #7f1d1d; }
        .active-filters-bar .clear-all-btn {
            margin-left: auto;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 3px 10px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .active-filters-bar .clear-all-btn:hover { background: #dc2626; }

        .no-filter-results td {
            text-align: center;
            padding: 40px;
            color: #94a3b8;
        }

        @keyframes filterFadeIn {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Hər cədvəl th-si üçün */
        #activeTableSection th,
        #partnerTableSection th,
        #externalTableSection th,
        #archiveTableSection th {
            position: relative;
            padding-right: 28px !important;
        }
    `;
    document.head.appendChild(style);

    // ==================== İLKLƏŞDİRMƏ ====================
    function initialize() {
        CONFIG.tables.forEach(tc => setupTableFilter(tc));
        observeNewTables();
    }

    function setupTableFilter(tableConfig) {
        const section = document.querySelector(tableConfig.id);
        if (!section) { setTimeout(() => setupTableFilter(tableConfig), 1200); return; }

        const table = section.querySelector('table');
        if (!table) { setTimeout(() => setupTableFilter(tableConfig), 1200); return; }

        if (!filterValues[tableConfig.name]) filterValues[tableConfig.name] = {};
        loadFilterValues(tableConfig.name);

        createFilterButtons(table, section, tableConfig);
        observeTableChanges(table, section, tableConfig.name);
        setTimeout(() => applyFilters(table, section, tableConfig.name), 400);

        tableInstances.set(tableConfig.name, { table, section, config: tableConfig });
    }

    // ==================== FİLTR DÜYMƏLƏRİ ========================
    function createFilterButtons(table, section, tableConfig) {
        const headers = table.querySelectorAll('thead th');

        headers.forEach((header, index) => {
            const headerSpan = header.querySelector('.table-header-cell span') || header.querySelector('span');
            let headerText = headerSpan ? headerSpan.innerText.trim() : header.innerText.trim();

            if (headerText === 'S/S' || headerText === '№' || !tableConfig.columns.includes(headerText)) return;

            const old = header.querySelector('.filter-dropdown-btn');
            if (old) old.remove();

            const btn = document.createElement('button');
            btn.className = 'filter-dropdown-btn';
            btn.dataset.column = headerText;
            btn.dataset.index = index;
            btn.dataset.table = tableConfig.name;
            btn.title = `${headerText} üzrə filtr`;

            updateButtonState(btn, tableConfig.name, headerText);

            btn.addEventListener('click', e => {
                e.stopPropagation();
                toggleDropdown(header, headerText, index, btn, table, section, tableConfig.name);
            });

            header.style.position = 'relative';
            header.appendChild(btn);
        });
    }

    // Düymə görünüşünü yenilə: seçilmiş say varsa qırmızı badge, yoxdursa boz ox
    function updateButtonState(btn, tableName, columnName) {
        const selected = filterValues[tableName]?.[columnName];
        const count = selected ? selected.size : 0;

        if (count > 0) {
            btn.className = 'filter-dropdown-btn has-filter';
            btn.innerHTML = `${count}`;
            btn.title = `${columnName}: ${count} seçim aktiv`;
        } else {
            btn.className = 'filter-dropdown-btn';
            btn.innerHTML = `<span class="filter-icon">&#x25BE;</span>`;
            btn.title = `${columnName} üzrə filtr`;
        }
    }

    // ==================== DROPDOWN ========================
    let openDropdown = null;

    function closeAllDropdowns() {
        if (openDropdown) {
            openDropdown.remove();
            openDropdown = null;
        }
    }

    document.addEventListener('click', e => {
        if (!e.target.closest('.filter-dropdown') && !e.target.closest('.filter-dropdown-btn')) {
            closeAllDropdowns();
        }
    });

    function toggleDropdown(header, columnName, colIndex, btn, table, section, storageKey) {
        if (openDropdown) {
            closeAllDropdowns();
            return;
        }
        showDropdown(header, columnName, colIndex, btn, table, section, storageKey);
    }

    function showDropdown(header, columnName, colIndex, btn, table, section, storageKey) {
        closeAllDropdowns();

        const values = getUniqueValuesFromColumn(table, colIndex);
        if (!values.length) return;

        const dropdown = document.createElement('div');
        dropdown.className = 'filter-dropdown';

        const btnRect = btn.getBoundingClientRect();
        Object.assign(dropdown.style, {
            position: 'fixed',
            top: (btnRect.bottom + 5) + 'px',
            left: Math.min(btnRect.left, window.innerWidth - 260) + 'px',
            minWidth: '240px',
            maxWidth: '320px',
            maxHeight: '360px',
            overflowY: 'auto',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            zIndex: '10000',
            padding: '6px 0'
        });

        // Axtarış
        const searchWrap = document.createElement('div');
        searchWrap.style.cssText = 'padding:6px 8px;border-bottom:1px solid #f1f5f9;';
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Axtar...';
        searchInput.style.cssText = 'width:100%;padding:5px 9px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;box-sizing:border-box;outline:none;';
        searchWrap.appendChild(searchInput);
        dropdown.appendChild(searchWrap);

        // "Hamısı" elementi
        const allItem = createItem('Hamısı', columnName, '__all__', storageKey, btn, table, section, dropdown);
        allItem.classList.add('all-item');
        dropdown.appendChild(allItem);

        // Dəyərlər
        const itemsWrap = document.createElement('div');
        values.forEach(val => {
            if (val && val.trim()) {
                itemsWrap.appendChild(createItem(val, columnName, val, storageKey, btn, table, section, dropdown));
            }
        });
        dropdown.appendChild(itemsWrap);

        // Tətbiq/Sıfırla alt panel
        const footer = document.createElement('div');
        footer.style.cssText = 'display:flex;gap:6px;padding:6px 8px;border-top:1px solid #f1f5f9;';

        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Tətbiq et';
        applyBtn.style.cssText = 'flex:1;background:#3b82f6;color:#fff;border:none;border-radius:6px;padding:5px;font-size:12px;font-weight:600;cursor:pointer;';
        applyBtn.onclick = () => {
            saveFilterValues();
            applyFilters(table, section, storageKey);
            updateAllButtonsInSection(section, storageKey);
            updateActiveFiltersBar(section, storageKey, table);
            closeAllDropdowns();
        };

        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Sıfırla';
        clearBtn.style.cssText = 'background:#f1f5f9;color:#475569;border:none;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;';
        clearBtn.onclick = () => {
            if (filterValues[storageKey]) delete filterValues[storageKey][columnName];
            saveFilterValues();
            applyFilters(table, section, storageKey);
            updateAllButtonsInSection(section, storageKey);
            updateActiveFiltersBar(section, storageKey, table);
            closeAllDropdowns();
        };

        footer.appendChild(applyBtn);
        footer.appendChild(clearBtn);
        dropdown.appendChild(footer);

        // Axtarış məntiqi
        searchInput.addEventListener('input', e => {
            const q = e.target.value.toLowerCase();
            itemsWrap.querySelectorAll('.filter-dropdown-item').forEach(item => {
                item.style.display = item.querySelector('.item-text').textContent.toLowerCase().includes(q) ? '' : 'none';
            });
        });

        document.body.appendChild(dropdown);
        openDropdown = dropdown;
        searchInput.focus();
    }

    function createItem(text, columnName, value, storageKey, btn, table, section, dropdown) {
        const item = document.createElement('div');
        item.className = 'filter-dropdown-item';
        if (value === '__all__') item.classList.add('all-item');

        const selected = filterValues[storageKey]?.[columnName];
        const isAll = value === '__all__';
        const isSelected = !isAll && selected && selected.has(value);
        const isAllSelected = isAll && (!selected || selected.size === 0);

        if (isSelected || isAllSelected) item.classList.add('is-selected');

        const check = document.createElement('div');
        check.className = 'item-check';

        const textSpan = document.createElement('span');
        textSpan.className = 'item-text';
        textSpan.textContent = text;

        item.appendChild(check);
        item.appendChild(textSpan);

        item.addEventListener('click', e => {
            e.stopPropagation();

            if (!filterValues[storageKey]) filterValues[storageKey] = {};

            if (isAll) {
                // Hamısı seçilib - filtri sil
                delete filterValues[storageKey][columnName];
                // Bütün itemləri deselect et
                dropdown.querySelectorAll('.filter-dropdown-item').forEach(i => i.classList.remove('is-selected'));
                item.classList.add('is-selected');
            } else {
                // Ayrı dəyər seçimi
                if (!filterValues[storageKey][columnName]) {
                    filterValues[storageKey][columnName] = new Set();
                }

                const set = filterValues[storageKey][columnName];

                if (set.has(value)) {
                    set.delete(value);
                    item.classList.remove('is-selected');
                    if (set.size === 0) {
                        delete filterValues[storageKey][columnName];
                        // "Hamısı" seçilmiş göstər
                        const allEl = dropdown.querySelector('.all-item');
                        if (allEl) allEl.classList.add('is-selected');
                    }
                } else {
                    set.add(value);
                    item.classList.add('is-selected');
                    // "Hamısı"-nı deselect et
                    const allEl = dropdown.querySelector('.all-item');
                    if (allEl) allEl.classList.remove('is-selected');
                }
            }

            // Düymə vəziyyətini dərhal yenilə
            updateButtonState(btn, storageKey, columnName);
        });

        return item;
    }

    // ==================== FİLTR TƏTBİQ ET ========================
    function applyFilters(table, section, storageKey) {
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const rows = Array.from(tbody.querySelectorAll('tr')).filter(row =>
            !row.classList.contains('loading-row') &&
            !row.classList.contains('empty-row') &&
            !row.classList.contains('no-filter-results') &&
            row.cells.length > 0
        );

        if (!rows.length) return;

        const activeFilters = filterValues[storageKey] || {};
        let visibleCount = 0;

        rows.forEach(row => {
            let showRow = true;

            for (const [column, selectedSet] of Object.entries(activeFilters)) {
                if (!selectedSet || selectedSet.size === 0) continue;

                const colIndex = getColumnIndex(table, column);
                if (colIndex === -1) continue;

                const cell = row.cells[colIndex];
                if (!cell) { showRow = false; break; }

                const cellText = cell.innerText.trim();
                if (!selectedSet.has(cellText)) { showRow = false; break; }
            }

            row.style.display = showRow ? '' : 'none';
            if (showRow) visibleCount++;
        });

        // Nəticə yoxdursa mesaj
        const hasFilters = Object.values(activeFilters).some(s => s && s.size > 0);
        if (visibleCount === 0 && rows.length > 0 && hasFilters) {
            showNoResultsMessage(tbody, table);
        } else {
            removeNoResultsMessage(tbody);
        }
    }

    // ==================== AKTİV FİLTR PANEL (HTML-DƏ) ========================
    function updateActiveFiltersBar(section, storageKey, table) {
        // Köhnə bar-ı sil
        const old = section.querySelector('.active-filters-bar');
        if (old) old.remove();

        const activeFilters = filterValues[storageKey] || {};
        const hasFilters = Object.values(activeFilters).some(s => s && s.size > 0);

        if (!hasFilters) return;

        const bar = document.createElement('div');
        bar.className = 'active-filters-bar';

        const label = document.createElement('span');
        label.className = 'filter-bar-label';
        label.innerHTML = `<i class="fas fa-filter"></i> Aktiv filtrlər:`;
        bar.appendChild(label);

        // Hər aktiv filtr üçün chip-lər
        for (const [column, selectedSet] of Object.entries(activeFilters)) {
            if (!selectedSet || selectedSet.size === 0) continue;

            const vals = Array.from(selectedSet);

            if (vals.length === 1) {
                // Tək seçim - bir chip
                bar.appendChild(createChip(column, vals[0], storageKey, section, table));
            } else {
                // Çoxlu seçim - qruplanmış chip
                bar.appendChild(createMultiChip(column, vals, storageKey, section, table));
            }
        }

        // Hamısını sil düyməsi
        const clearAll = document.createElement('button');
        clearAll.className = 'clear-all-btn';
        clearAll.innerHTML = `<i class="fas fa-times"></i> Hamısını sil`;
        clearAll.onclick = () => {
            filterValues[storageKey] = {};
            saveFilterValues();
            applyFilters(table, section, storageKey);
            updateAllButtonsInSection(section, storageKey);
            updateActiveFiltersBar(section, storageKey, table);
        };
        bar.appendChild(clearAll);

        // Cədvəlin table-wrapper-dan əvvəl göstər
        const tableWrapper = section.querySelector('.table-wrapper');
        if (tableWrapper) {
            section.insertBefore(bar, tableWrapper);
        } else {
            section.appendChild(bar);
        }
    }

    function createChip(column, value, storageKey, section, table) {
        const chip = document.createElement('span');
        chip.className = 'filter-chip';
        chip.innerHTML = `<span class="chip-col">${column}:</span><span class="chip-val">${value}</span>`;

        const remove = document.createElement('button');
        remove.className = 'chip-remove';
        remove.innerHTML = '&times;';
        remove.title = 'Bu filtri sil';
        remove.onclick = () => {
            if (filterValues[storageKey]?.[column]) {
                filterValues[storageKey][column].delete(value);
                if (filterValues[storageKey][column].size === 0) {
                    delete filterValues[storageKey][column];
                }
            }
            saveFilterValues();
            applyFilters(table, section, storageKey);
            updateAllButtonsInSection(section, storageKey);
            updateActiveFiltersBar(section, storageKey, table);
        };
        chip.appendChild(remove);
        return chip;
    }

    function createMultiChip(column, values, storageKey, section, table) {
        const chip = document.createElement('span');
        chip.className = 'filter-chip';

        const preview = values.slice(0, 2).join(', ') + (values.length > 2 ? ` +${values.length - 2}` : '');
        chip.innerHTML = `<span class="chip-col">${column}:</span><span class="chip-val">${preview}</span>`;
        chip.title = values.join(', ');

        const remove = document.createElement('button');
        remove.className = 'chip-remove';
        remove.innerHTML = '&times;';
        remove.title = 'Bu filtri tamamilə sil';
        remove.onclick = () => {
            if (filterValues[storageKey]) delete filterValues[storageKey][column];
            saveFilterValues();
            applyFilters(table, section, storageKey);
            updateAllButtonsInSection(section, storageKey);
            updateActiveFiltersBar(section, storageKey, table);
        };
        chip.appendChild(remove);
        return chip;
    }

    // ==================== KÖMƏKÇI FUNKSİYALAR ========================

    function updateAllButtonsInSection(section, storageKey) {
        section.querySelectorAll('.filter-dropdown-btn').forEach(btn => {
            updateButtonState(btn, storageKey, btn.dataset.column);
        });
    }

    function getUniqueValuesFromColumn(table, colIndex) {
        const tbody = table.querySelector('tbody');
        if (!tbody) return [];

        const valueSet = new Set();

        tbody.querySelectorAll('tr').forEach(row => {
            if (row.classList.contains('loading-row') ||
                row.classList.contains('empty-row') ||
                row.classList.contains('no-filter-results')) return;

            const cell = row.cells[colIndex];
            if (!cell) return;

            const val = cell.innerText.trim();
            if (val && val !== '-' && val !== '—') valueSet.add(val);
        });

        return Array.from(valueSet).sort((a, b) => {
            if (a.includes('.') && b.includes('.')) {
                const da = a.split('.').reverse().join('-');
                const db = b.split('.').reverse().join('-');
                return new Date(db) - new Date(da);
            }
            return a.localeCompare(b, 'az');
        });
    }

    function getColumnIndex(table, columnName) {
        const headers = table.querySelectorAll('thead th');
        for (let i = 0; i < headers.length; i++) {
            const span = headers[i].querySelector('.table-header-cell span') || headers[i].querySelector('span');
            const text = span ? span.innerText.trim() : headers[i].innerText.trim();
            if (text === columnName) return i;
        }
        return -1;
    }

    function showNoResultsMessage(tbody, table) {
        if (tbody.querySelector('.no-filter-results')) return;
        const row = document.createElement('tr');
        row.className = 'no-filter-results';
        const td = document.createElement('td');
        td.colSpan = table.querySelectorAll('thead th').length;
        td.innerHTML = `
            <div style="text-align:center;padding:40px;color:#94a3b8;">
                <i class="fas fa-filter" style="font-size:28px;margin-bottom:12px;display:block;color:#fca5a5;"></i>
                <div style="font-size:15px;font-weight:500;color:#6b7280;margin-bottom:4px;">Nəticə tapılmadı</div>
                <div style="font-size:12px;">Seçilmiş filtrlərə uyğun sətir yoxdur</div>
            </div>`;
        row.appendChild(td);
        tbody.appendChild(row);
    }

    function removeNoResultsMessage(tbody) {
        tbody.querySelector('.no-filter-results')?.remove();
    }

    // Yaddaşa saxlama - Set-ləri Array-ə çevir
    function saveFilterValues() {
        try {
            const toSave = {};
            for (const [table, cols] of Object.entries(filterValues)) {
                toSave[table] = {};
                for (const [col, set] of Object.entries(cols)) {
                    if (set instanceof Set && set.size > 0) {
                        toSave[table][col] = Array.from(set);
                    }
                }
            }
            localStorage.setItem('super_column_filters_v2', JSON.stringify(toSave));
        } catch(e) {}
    }

    function loadFilterValues(tableName) {
        try {
            const saved = localStorage.getItem('super_column_filters_v2');
            if (!saved) return;
            const all = JSON.parse(saved);
            if (!all[tableName]) return;
            for (const [col, arr] of Object.entries(all[tableName])) {
                if (!filterValues[tableName]) filterValues[tableName] = {};
                filterValues[tableName][col] = new Set(arr);
            }
        } catch(e) {}
    }

    function observeTableChanges(table, section, storageKey) {
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const obs = new MutationObserver(() => {
            setTimeout(() => {
                applyFilters(table, section, storageKey);
                updateAllButtonsInSection(section, storageKey);
                updateActiveFiltersBar(section, storageKey, table);
            }, 120);
        });

        obs.observe(tbody, { childList: true, subtree: true });
    }

    function observeNewTables() {
        const obs = new MutationObserver(() => {
            CONFIG.tables.forEach(tc => {
                const section = document.querySelector(tc.id);
                if (section && !tableInstances.has(tc.name)) {
                    const table = section.querySelector('table');
                    if (table) setupTableFilter(tc);
                }
            });
        });
        obs.observe(document.body, { childList: true, subtree: true });
    }

    // ==================== İŞƏ SAL ========================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initialize, 600));
    } else {
        setTimeout(initialize, 600);
    }

    // Cədvəl render olduqda filtri yenidən tətbiq et
    window.addEventListener('tableRendered', e => {
        const { tableType } = e.detail || {};
        if (tableType && tableInstances.has(tableType)) {
            const inst = tableInstances.get(tableType);
            setTimeout(() => {
                applyFilters(inst.table, inst.section, tableType);
                updateAllButtonsInSection(inst.section, tableType);
                updateActiveFiltersBar(inst.section, tableType, inst.table);
            }, 200);
        }
    });

    console.log('✅ MULTI-SELECT COLUMN FILTER hazırdır!');

})();