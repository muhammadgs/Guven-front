// column-filter.js - CASCADING FILTERS (bir-birinə bağlı filtr siyahıları)
(function() {
    'use strict';

    console.log('🔍 CASCADING MULTI-SELECT COLUMN FILTER yüklənir...');

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
    const ALLOWED_ROW_LIMITS = [20, 50, 100];

    function getTableRowLimit(tableName) {
        const select = document.querySelector(`.task-limit-select[data-table="${tableName}"]`);
        const selectedValue = Number.parseInt(select?.value, 10);
        if (ALLOWED_ROW_LIMITS.includes(selectedValue)) return selectedValue;

        try {
            const savedValue = Number.parseInt(localStorage.getItem(`task_limit_${tableName}`), 10);
            if (ALLOWED_ROW_LIMITS.includes(savedValue)) return savedValue;
        } catch (e) {}

        return 20;
    }

    function normalizeDateFilterValue(value) {
        const text = String(value ?? '').trim().replace(/\s+/g, ' ');
        if (!text) return '';

        // Tarix hüceyrəsi saatı ayrı sətirdə və ya ISO "T" ilə
        // göstərə bilər. Filtr üçün yalnız tarix hissəsi saxlanılır.
        const dateMatch = text.match(/^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})(?=[,\sT]|$)/);
        return dateMatch ? dateMatch[1] : text;
    }

    function normalizeFilterValue(columnName, value) {
        const text = String(value ?? '').trim();
        return columnName === 'Tarix' ? normalizeDateFilterValue(text) : text;
    }

    // Dinamik timer/düymə mətni olan hüceyrələr sabit data-filter-value
    // təqdim edə bilər; qalan sütunlarda görünən mətn fallback olaraq qalır.
    function getCellFilterValue(cell, columnName = null) {
        if (!cell) return '';
        const stableValue = cell.dataset?.filterValue;
        const value = stableValue !== undefined ? stableValue : cell.innerText;
        return normalizeFilterValue(columnName, value);
    }

    function hasActiveColumnFilters(storageKey) {
        return Object.values(filterValues[storageKey] || {}).some(set => set && set.size > 0);
    }

    // ==================== CSS ƏLAVƏ ET ====================
    const style = document.createElement('style');
    style.id = 'multi-filter-styles';
    style.textContent = `
        /* Filtr düyməsi - əsas stil */
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
        
        .filter-dropdown-btn:hover { 
            background: #f1f5f9 !important; 
        }
        
        /* Aktiv filtr düyməsi - MAVİ (sakit rəng) */
        .filter-dropdown-btn.has-filter {
            color: #fff !important;
            background: #3b82f6 !important;
            border-radius: 12px;
            font-weight: 700;
            font-size: 11px;
            padding: 3px 8px;
        }
        
        .filter-dropdown-btn.has-filter .filter-icon { 
            display: none; 
        }

        /* Dropdown menyu */
        .filter-dropdown {
            font-family: inherit;
            animation: filterFadeIn 0.18s ease;
        }
        
        .filter-dropdown::-webkit-scrollbar { 
            width: 5px; 
        }
        
        .filter-dropdown::-webkit-scrollbar-track { 
            background: #f1f5f9; 
            border-radius: 10px; 
        }
        
        .filter-dropdown::-webkit-scrollbar-thumb { 
            background: #cbd5e1; 
            border-radius: 10px; 
        }

        /* Dropdown itemləri */
        .filter-dropdown-item {
            display: flex;
            align-items: center;
            padding: 7px 12px;
            cursor: pointer;
            transition: background 0.15s;
            font-size: 13px;
            gap: 8px;
        }
        
        .filter-dropdown-item:hover { 
            background: #f1f5f9; 
        }
        
        .filter-dropdown-item.is-selected {
            background: #eff6ff;
        }
        
        /* Checkbox stili */
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

        /* Aktiv filtr paneli - MAVİ (sakit rəng) */
        .active-filters-bar {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
            padding: 6px 14px;
            background: #eff6ff;
            border-bottom: 1px solid #bfdbfe;
            border-top: 1px solid #bfdbfe;
        }
        
        .active-filters-bar .filter-bar-label {
            font-size: 12px;
            font-weight: 600;
            color: #2563eb;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        /* Filtr çipləri - MAVİ (sakit rəng) */
        .active-filters-bar .filter-chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #dbeafe;
            border: 1px solid #93c5fd;
            color: #1e40af;
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
            color: #1e40af;
            font-size: 13px;
            padding: 0 0 0 4px;
            line-height: 1;
            display: flex;
            align-items: center;
        }
        
        .active-filters-bar .filter-chip .chip-remove:hover { 
            color: #1e3a8a; 
        }
        
        /* Hamısını sil düyməsi - MAVİ (sakit rəng) */
        .active-filters-bar .clear-all-btn {
            margin-left: auto;
            background: #3b82f6;
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
        
        .active-filters-bar .clear-all-btn:hover { 
            background: #2563eb; 
        }

        /* Nəticə tapılmadı mesajı */
        .no-filter-results td {
            text-align: center;
            padding: 40px;
            color: #94a3b8;
        }
        
        .no-filter-results td i {
            color: #93c5fd !important;
        }

        /* Animasiya */
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

    // ==================== ƏSAS YENİLİK: BAĞLI FİLTR SİYAHISI ====================
    // Aktiv filtrlərə əsasən sütundan unikal dəyərləri qaytarır
    function getFilteredUniqueValuesFromColumn(table, colIndex, storageKey, currentColumn = null) {
        const tbody = table.querySelector('tbody');
        if (!tbody) return [];

        // Bütün aktiv filtrləri topla (cari sütunu ÇIXARIŞ, çünki onun dropdown-ı açıqdır)
        const activeFilters = {};
        const allActive = filterValues[storageKey] || {};

        for (const [col, selectedSet] of Object.entries(allActive)) {
            if (selectedSet && selectedSet.size > 0 && col !== currentColumn) {
                activeFilters[col] = selectedSet;
            }
        }

        const rows = Array.from(tbody.querySelectorAll('tr')).filter(row =>
            !row.classList.contains('loading-row') &&
            !row.classList.contains('empty-row') &&
            !row.classList.contains('no-filter-results') &&
            row.cells.length > 0
        );

        const valueSet = new Set();

        rows.forEach(row => {
            // Əvvəlcə digər aktiv filtrlərə uyğunluğu yoxla
            let matchesOtherFilters = true;

            for (const [col, selectedSet] of Object.entries(activeFilters)) {
                const colIdx = getColumnIndex(table, col);
                if (colIdx === -1) continue;
                const cell = row.cells[colIdx];
                if (!cell) { matchesOtherFilters = false; break; }
                const cellText = getCellFilterValue(cell, col);
                if (!selectedSet.has(cellText)) {
                    matchesOtherFilters = false;
                    break;
                }
            }

            // Əgər digər filtrlərə uyğundursa, bu sütundakı dəyəri əlavə et
            if (matchesOtherFilters) {
                const cell = row.cells[colIndex];
                if (cell) {
                    const val = getCellFilterValue(cell, currentColumn);
                    if (val && val !== '-' && val !== '—') valueSet.add(val);
                }
            }
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

        // BAĞLI FİLTR - cari sütuna görə filtr siyahısını digər aktiv filtrlərə əsasən al
        const values = getFilteredUniqueValuesFromColumn(table, colIndex, storageKey, columnName);
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
        const hasFilters = hasActiveColumnFilters(storageKey);
        const rowLimit = getTableRowLimit(storageKey);
        let visibleCount = 0;

        rows.forEach((row, rowIndex) => {
            let matchesFilters = true;

            for (const [column, selectedSet] of Object.entries(activeFilters)) {
                if (!selectedSet || selectedSet.size === 0) continue;

                const colIndex = getColumnIndex(table, column);
                if (colIndex === -1) continue;

                const cell = row.cells[colIndex];
                if (!cell) { matchesFilters = false; break; }

                const cellText = getCellFilterValue(cell, column);
                if (!selectedSet.has(cellText)) { matchesFilters = false; break; }
            }

            // Filtersiz görünüş seçilmiş 20/50/100 ilə məhdudlaşır.
            // Hər hansı sütun filtri aktivdirsə, bütün master datasetdəki
            // uyğun sətirlər limitdən asılı olmadan göstərilir.
            const showRow = matchesFilters && (hasFilters || rowIndex < rowLimit);
            row.style.display = showRow ? '' : 'none';
            if (showRow) visibleCount++;
        });

        // Nəticə yoxdursa mesaj
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
            localStorage.setItem('super_column_filters_v3', JSON.stringify(toSave));
        } catch(e) {}
    }

    function loadFilterValues(tableName) {
        try {
            const saved = localStorage.getItem('super_column_filters_v3');
            if (!saved) return;
            const all = JSON.parse(saved);
            if (!all[tableName]) return;
            for (const [col, arr] of Object.entries(all[tableName])) {
                if (!filterValues[tableName]) filterValues[tableName] = {};
                filterValues[tableName][col] = new Set(
                    arr.map(value => normalizeFilterValue(col, value)).filter(Boolean)
                );
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

    function refreshTable(tableName) {
        const instance = tableInstances.get(tableName);
        if (!instance) return false;

        applyFilters(instance.table, instance.section, tableName);
        updateAllButtonsInSection(instance.section, tableName);
        updateActiveFiltersBar(instance.section, tableName, instance.table);
        return true;
    }

    function clearTableFilters(tableName) {
        filterValues[tableName] = {};
        saveFilterValues();
        return refreshTable(tableName);
    }

    function clearAllTableFilters() {
        CONFIG.tables.forEach(tableConfig => {
            filterValues[tableConfig.name] = {};
        });
        saveFilterValues();
        CONFIG.tables.forEach(tableConfig => refreshTable(tableConfig.name));
    }

    // Sətir sayı yalnız görünüş state-idir; dataset yenidən fetch edilmədən
    // cari master sətirlərə tətbiq oluna bilər.
    window.addEventListener('taskRowLimitChanged', event => {
        const tableName = event.detail?.tableType;
        if (tableName) refreshTable(tableName);
    });

    window.TaskColumnFilters = {
        refresh: refreshTable,
        hasActiveFilters: hasActiveColumnFilters,
        clear: clearTableFilters,
        clearAll: clearAllTableFilters
    };

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

    console.log('✅ CASCADING MULTI-SELECT COLUMN FILTER hazırdır!');

})();
