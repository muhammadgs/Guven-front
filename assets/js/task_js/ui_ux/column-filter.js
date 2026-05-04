// ============================================================
// SUPER COLUMN FILTER - BÜTÜN CƏDVƏLLƏR ÜÇÜN DROPDOWN FİLTR
// ============================================================

(function() {
    'use strict';

    console.log('🔍 SUPER COLUMN FILTER yüklənir...');

    // ==================== KONFİQURASİYA ====================
    const CONFIG = {
        tables: [
            {
                id: '#activeTableSection',
                name: 'active',
                columns: ['Tarix', 'Şirkət', 'Kim tərəfindən', 'İcra edən','İşin növü', 'Son müddət', 'Status', 'Şöbə']
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
        ],
        storagePrefix: 'super_filter_'
    };

    // ==================== DƏYİŞƏNLƏR ====================
    const filterValues = {};
    const tableInstances = new Map();

    // ==================== İLKLƏŞDİRMƏ ====================
    function initialize() {
        console.log('🚀 Bütün cədvəllər üçün filtr hazırlanır...');

        CONFIG.tables.forEach(tableConfig => {
            setupTableFilter(tableConfig);
        });

        observeNewTables();
        addGlobalClearButton();
    }

    // ==================== CƏDVƏL FİLTRİ QUR ====================
    function setupTableFilter(tableConfig) {
        const section = document.querySelector(tableConfig.id);
        if (!section) {
            setTimeout(() => setupTableFilter(tableConfig), 1000);
            return;
        }

        const table = section.querySelector('table');
        if (!table) {
            setTimeout(() => setupTableFilter(tableConfig), 1000);
            return;
        }

        console.log(`📊 ${tableConfig.name} cədvəli üçün filtr qurulur...`);

        // Filter dəyərlərini yüklə
        loadFilterValues(tableConfig.name);

        // Filter düymələrini yarat
        createFilterButtons(table, section, tableConfig);

        // Cədvəl dəyişikliklərini izlə
        observeTableChanges(table, section, tableConfig.name);

        // İlkin filtrləmə
        setTimeout(() => applyFilters(table, section, tableConfig.name), 300);

        tableInstances.set(tableConfig.name, {
            table,
            section,
            config: tableConfig
        });
    }

    // ==================== FİLTR DÜYMƏLƏRİ YARAT ====================
    function createFilterButtons(table, section, tableConfig) {
        const headers = table.querySelectorAll('thead th');
        const storageKey = tableConfig.name;

        headers.forEach((header, index) => {
            // Başlıq mətnini tap
            const headerSpan = header.querySelector('span');
            const headerDiv = header.querySelector('.table-header-cell span');
            let headerText = '';

            if (headerSpan) headerText = headerSpan.innerText.trim();
            else if (headerDiv) headerText = headerDiv.innerText.trim();
            else headerText = header.innerText.trim();

            // S/S sütununu keç
            if (headerText === 'S/S' || headerText === '№' || headerText === 'S/S' || headerText.includes('S/S')) {
                return;
            }

            // Əgər bu sütun filtr listində varsa
            if (tableConfig.columns.includes(headerText)) {

                // Köhnə düymə varsa sil
                const oldBtn = header.querySelector('.filter-dropdown-btn');
                if (oldBtn) oldBtn.remove();

                // Dropdown button yarat
                const filterBtn = document.createElement('button');
                filterBtn.className = 'filter-dropdown-btn';
                filterBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
                filterBtn.title = `${headerText} üzrə filtr`;
                filterBtn.dataset.column = headerText;
                filterBtn.dataset.index = index;
                filterBtn.dataset.table = storageKey;

                filterBtn.style.cssText = `
                    position: absolute;
                    top: 50%;
                    right: 5px;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 5px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    z-index: 100;
                    transition: all 0.2s;
                `;

                // Aktiv filtr varsa rənglə
                if (filterValues[storageKey] && filterValues[storageKey][headerText]) {
                    filterBtn.style.color = '#3b82f6';
                    filterBtn.style.background = '#eff6ff';
                }

                filterBtn.addEventListener('mouseenter', () => {
                    filterBtn.style.background = '#f1f5f9';
                });

                filterBtn.addEventListener('mouseleave', () => {
                    if (!filterValues[storageKey] || !filterValues[storageKey][headerText]) {
                        filterBtn.style.background = 'none';
                    } else {
                        filterBtn.style.background = '#eff6ff';
                    }
                });

                filterBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showDropdown(header, headerText, index, filterBtn, table, section, storageKey);
                });

                header.style.position = 'relative';
                header.appendChild(filterBtn);
            }
        });
    }

    // ==================== DROPDOWN GÖSTƏR ====================
    function showDropdown(header, columnName, colIndex, btn, table, section, storageKey) {
        // Köhnə dropdown-i sil
        const oldDropdown = document.querySelector('.filter-dropdown');
        if (oldDropdown) oldDropdown.remove();

        // Sütundakı bütün unikal dəyərləri topla
        const values = getUniqueValuesFromColumn(table, colIndex);

        if (values.length === 0) {
            return;
        }

        // Dropdown yarat
        const dropdown = document.createElement('div');
        dropdown.className = 'filter-dropdown';

        const btnRect = btn.getBoundingClientRect();

        dropdown.style.cssText = `
            position: fixed;
            top: ${btnRect.bottom + window.scrollY + 5}px;
            left: ${btnRect.left + window.scrollX}px;
            min-width: 220px;
            max-width: 300px;
            max-height: 350px;
            overflow-y: auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            border: 1px solid #e2e8f0;
            z-index: 10000;
            padding: 6px 0;
            font-family: inherit;
        `;

        // Axtarış inputu
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '🔍 Axtar...';
        searchInput.style.cssText = `
            width: calc(100% - 16px);
            margin: 8px;
            padding: 6px 10px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 12px;
            box-sizing: border-box;
        `;

        searchInput.addEventListener('input', (e) => {
            const searchText = e.target.value.toLowerCase();
            const items = dropdown.querySelectorAll('.filter-item:not(.all-item)');

            items.forEach(item => {
                const text = item.querySelector('.item-text').textContent.toLowerCase();
                if (text.includes(searchText)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });

        dropdown.appendChild(searchInput);

        // "Hamısı" seçimi
        const allItem = createDropdownItem('Hamısı', columnName, '', values.length, btn, table, section, storageKey);
        allItem.classList.add('all-item');
        dropdown.appendChild(allItem);

        // Ayırıcı
        const divider = document.createElement('div');
        divider.style.cssText = 'height:1px;background:#e2e8f0;margin:4px 0;';
        dropdown.appendChild(divider);

        // Unikal dəyərlər
        values.forEach(value => {
            if (value && value.trim() !== '') {
                const item = createDropdownItem(value, columnName, value, null, btn, table, section, storageKey);
                dropdown.appendChild(item);
            }
        });

        document.body.appendChild(dropdown);

        // Dropdown-dan kənara klikləyəndə bağla
        setTimeout(() => {
            function closeDropdown(e) {
                if (!dropdown.contains(e.target) && !e.target.closest('.filter-dropdown-btn')) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            }
            document.addEventListener('click', closeDropdown);
        }, 100);
    }

    // ==================== DROPDOWN İTEM YARAT ====================
    function createDropdownItem(text, columnName, value, totalCount, btn, table, section, storageKey) {
        const item = document.createElement('div');
        item.className = 'filter-dropdown-item filter-item';

        item.style.cssText = `
            display: flex;
            align-items: center;
            padding: 8px 12px;
            cursor: pointer;
            transition: background 0.2s;
            font-size: 13px;
        `;

        // Aktiv filtr yoxlaması
        const isActive = filterValues[storageKey] && filterValues[storageKey][columnName] === value;

        if (isActive) {
            item.style.background = '#eff6ff';
        }

        // İkon
        const icon = document.createElement('i');
        icon.className = 'fas ' + (isActive ? 'fa-check-circle' : 'fa-circle');
        icon.style.cssText = `
            width: 16px;
            margin-right: 10px;
            color: ${isActive ? '#3b82f6' : '#cbd5e1'};
            font-size: 14px;
        `;

        // Mətn
        const textSpan = document.createElement('span');
        textSpan.className = 'item-text';
        textSpan.textContent = text;
        textSpan.style.flex = '1';
        textSpan.style.overflow = 'hidden';
        textSpan.style.textOverflow = 'ellipsis';
        textSpan.style.whiteSpace = 'nowrap';

        // Say (Hamısı üçün)
        if (text === 'Hamısı' && totalCount) {
            const countSpan = document.createElement('span');
            countSpan.textContent = `(${totalCount})`;
            countSpan.style.cssText = `
                margin-left: 8px;
                color: #94a3b8;
                font-size: 11px;
            `;
            textSpan.appendChild(countSpan);
        }

        item.appendChild(icon);
        item.appendChild(textSpan);

        // Klik hadisəsi
        item.addEventListener('click', (e) => {
            e.stopPropagation();

            if (!filterValues[storageKey]) {
                filterValues[storageKey] = {};
            }

            if (text === 'Hamısı') {
                // Filtr sil
                delete filterValues[storageKey][columnName];

                // Düymə rəngini sıfırla
                btn.style.color = '#94a3b8';
                btn.style.background = 'none';

                // Əgər heç filtr qalmadısa, obyekti sil
                if (Object.keys(filterValues[storageKey]).length === 0) {
                    delete filterValues[storageKey];
                }
            } else {
                // Filtr tətbiq et
                filterValues[storageKey][columnName] = value;

                // Düymə rəngini dəyiş
                btn.style.color = '#3b82f6';
                btn.style.background = '#eff6ff';
            }

            saveFilterValues();
            applyFilters(table, section, storageKey);

            // Bütün düymələri yenilə
            updateAllButtons(section, storageKey);

            // Dropdown bağla
            document.querySelector('.filter-dropdown')?.remove();
        });

        item.addEventListener('mouseenter', () => {
            item.style.background = '#f1f5f9';
        });

        item.addEventListener('mouseleave', () => {
            if (!isActive) {
                item.style.background = '';
            }
        });

        return item;
    }

    // ==================== BÜTÜN DÜYMƏLƏRİ YENİLƏ ====================
    function updateAllButtons(section, storageKey) {
        const btns = section.querySelectorAll('.filter-dropdown-btn');

        btns.forEach(btn => {
            const column = btn.dataset.column;

            if (filterValues[storageKey] && filterValues[storageKey][column]) {
                btn.style.color = '#3b82f6';
                btn.style.background = '#eff6ff';
            } else {
                btn.style.color = '#94a3b8';
                btn.style.background = 'none';
            }
        });

        // Aktiv filtr varsa sinif əlavə et
        if (filterValues[storageKey] && Object.keys(filterValues[storageKey]).length > 0) {
            section.classList.add('filter-active');
        } else {
            section.classList.remove('filter-active');
        }
    }

    // ==================== SÜTUNDAKI UNAİKAL DƏYƏRLƏRİ TOPLA ====================
    function getUniqueValuesFromColumn(table, colIndex) {
        const tbody = table.querySelector('tbody');
        if (!tbody) return [];

        const rows = tbody.querySelectorAll('tr');
        if (rows.length === 0) return [];

        const valueSet = new Set();

        rows.forEach(row => {
            if (row.classList.contains('loading-row') ||
                row.classList.contains('empty-row') ||
                row.classList.contains('no-filter-results')) {
                return;
            }

            if (row.cells && row.cells[colIndex]) {
                let value = row.cells[colIndex].innerText.trim();

                if (value && value !== '' && value !== '—' && value !== '-') {
                    valueSet.add(value);
                }
            }
        });

        return Array.from(valueSet).sort((a, b) => {
            // Tarix sıralaması
            if (a.includes('.') && b.includes('.')) {
                const dateA = a.split('.').reverse().join('-');
                const dateB = b.split('.').reverse().join('-');
                return new Date(dateB) - new Date(dateA);
            }
            return a.localeCompare(b, 'az');
        });
    }

    // ==================== FİLTR TƏTBİQ ET ====================
    function applyFilters(table, section, storageKey) {
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => {
            return !row.classList.contains('loading-row') &&
                   !row.classList.contains('empty-row') &&
                   !row.classList.contains('no-filter-results') &&
                   row.cells.length > 0;
        });

        if (rows.length === 0) return;

        const activeFilters = filterValues[storageKey] || {};
        let visibleCount = 0;

        rows.forEach(row => {
            let showRow = true;

            for (let column in activeFilters) {
                const filterValue = activeFilters[column];
                const colIndex = getColumnIndex(table, column);

                if (colIndex === -1) continue;

                const cell = row.cells[colIndex];
                if (!cell) continue;

                const cellText = cell.innerText.trim();

                if (cellText !== filterValue) {
                    showRow = false;
                    break;
                }
            }

            if (showRow) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        // Nəticə yoxdursa mesaj göstər
        if (visibleCount === 0 && rows.length > 0 && Object.keys(activeFilters).length > 0) {
            showNoResultsMessage(tbody, table);
        } else {
            removeNoResultsMessage(tbody);
        }

        // Footer məlumatını yenilə
        updateFooterInfo(section, visibleCount, rows.length, activeFilters);
    }

    // ==================== SÜTUN İNDEKSİ ====================
    function getColumnIndex(table, columnName) {
        const headers = table.querySelectorAll('thead th');

        for (let i = 0; i < headers.length; i++) {
            const headerSpan = headers[i].querySelector('span');
            const headerDiv = headers[i].querySelector('.table-header-cell span');
            let headerText = '';

            if (headerSpan) headerText = headerSpan.innerText.trim();
            else if (headerDiv) headerText = headerDiv.innerText.trim();
            else headerText = headers[i].innerText.trim();

            if (headerText === columnName) {
                return i;
            }
        }
        return -1;
    }

    // ==================== FOOTER MƏLUMATI ====================
    function updateFooterInfo(section, visible, total, activeFilters) {
        const footer = section.querySelector('.table-footer');
        if (!footer) return;

        const oldInfo = footer.querySelector('.filter-info');
        if (oldInfo) oldInfo.remove();

        const info = document.createElement('div');
        info.className = 'filter-info';

        const activeCount = Object.keys(activeFilters).length;

        if (activeCount > 0) {
            let filtersText = '';

            Object.keys(activeFilters).forEach(col => {
                filtersText += `<span style="background:#3b82f6;color:white;padding:2px 8px;border-radius:20px;margin:0 2px;font-size:11px;">${col}: ${activeFilters[col]}</span>`;
            });

            info.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 12px;background:#f8fafc;border-radius:6px;">
                    <span style="font-weight:600;"><i class="fas fa-filter" style="color:#3b82f6;"></i> ${visible} / ${total}</span>
                    <span style="background:#dbeafe;padding:2px 10px;border-radius:20px;font-size:11px;">
                        ${activeCount} filtr
                    </span>
                    <div style="display:flex;gap:4px;flex-wrap:wrap;">
                        ${filtersText}
                    </div>
                </div>
            `;
        }

        footer.appendChild(info);
    }

    // ==================== NƏTİCƏ YOXDUR MESAJI ====================
    function showNoResultsMessage(tbody, table) {
        if (tbody.querySelector('.no-filter-results')) return;

        const messageRow = document.createElement('tr');
        messageRow.className = 'no-filter-results';

        const colspan = table.querySelectorAll('thead th').length;
        const messageCell = document.createElement('td');
        messageCell.colSpan = colspan;
        messageCell.style.cssText = 'text-align:center;padding:40px;color:#94a3b8;';

        messageCell.innerHTML = `
            <i class="fas fa-filter" style="font-size:32px;margin-bottom:15px;display:block;color:#cbd5e1;"></i>
            <h3 style="margin:0;font-weight:500;">Heç bir nəticə tapılmadı</h3>
            <p style="margin:5px 0;font-size:13px;">Seçdiyiniz filtrə uyğun sətir yoxdur</p>
        `;

        messageRow.appendChild(messageCell);
        tbody.appendChild(messageRow);
    }

    function removeNoResultsMessage(tbody) {
        const message = tbody.querySelector('.no-filter-results');
        if (message) message.remove();
    }

    // ==================== YADDAŞA SAXLAMA ====================
    function saveFilterValues() {
        try {
            localStorage.setItem('super_column_filters', JSON.stringify(filterValues));
        } catch (e) {
            console.warn('LocalStorage xətası:', e);
        }
    }

    function loadFilterValues(tableName) {
        try {
            const saved = localStorage.getItem('super_column_filters');
            if (saved) {
                const allFilters = JSON.parse(saved);
                if (allFilters[tableName]) {
                    if (!filterValues[tableName]) {
                        filterValues[tableName] = {};
                    }
                    Object.assign(filterValues[tableName], allFilters[tableName]);
                }
            }
        } catch (e) {
            console.warn('Yükləmə xətası:', e);
        }
    }

    // ==================== CƏDVƏL DƏYİŞİKLİKLƏRİNİ İZLƏ ====================
    function observeTableChanges(table, section, storageKey) {
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const observer = new MutationObserver(() => {
            setTimeout(() => {
                applyFilters(table, section, storageKey);
                updateAllButtons(section, storageKey);
            }, 100);
        });

        observer.observe(tbody, { childList: true, subtree: true });
    }

    // ==================== YENİ CƏDVƏLLƏRİ İZLƏ ====================
    function observeNewTables() {
        const observer = new MutationObserver(() => {
            CONFIG.tables.forEach(tableConfig => {
                const section = document.querySelector(tableConfig.id);
                if (section && !tableInstances.has(tableConfig.name)) {
                    const table = section.querySelector('table');
                    if (table) {
                        setupTableFilter(tableConfig);
                    }
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ==================== GLOBAL TƏMİZLƏMƏ DÜYMƏSİ ====================
    function addGlobalClearButton() {
        // Hər cədvəl üçün təmizləmə düyməsi
        CONFIG.tables.forEach(tableConfig => {
            const section = document.querySelector(tableConfig.id);
            if (!section) return;

            const actionsDiv = section.querySelector('.table-actions');
            if (!actionsDiv) return;

            // Artıq varsa əlavə etmə
            if (section.querySelector('.clear-filters-btn')) return;

            const clearBtn = document.createElement('button');
            clearBtn.className = 'table-action-btn clear-filters-btn';
            clearBtn.title = 'Filtrləri təmizlə';
            clearBtn.innerHTML = '<i class="fas fa-times-circle"></i>';
            clearBtn.style.color = '#ef4444';
            clearBtn.style.marginLeft = '5px';

            clearBtn.addEventListener('click', () => {
                clearTableFilters(tableConfig.name, section);
            });

            actionsDiv.appendChild(clearBtn);
        });
    }

    // ==================== CƏDVƏL FİLTRELƏRİNİ TƏMİZLƏ ====================
    function clearTableFilters(tableName, section) {
        if (filterValues[tableName]) {
            delete filterValues[tableName];
            saveFilterValues();

            const instance = tableInstances.get(tableName);
            if (instance) {
                applyFilters(instance.table, section, tableName);
                updateAllButtons(section, tableName);
            }
        }
    }

    // ==================== İŞƏ SALMA ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initialize, 500);
        });
    } else {
        setTimeout(initialize, 500);
    }

    // ==================== CSS ƏLAVƏ ET ====================
    const style = document.createElement('style');
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
            padding: 5px 8px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 100;
            transition: all 0.2s;
        }
        
        .filter-dropdown-btn:hover {
            background: #f1f5f9 !important;
        }
        
        .filter-dropdown {
            font-family: inherit;
            animation: fadeIn 0.2s ease;
        }
        
        .filter-dropdown::-webkit-scrollbar {
            width: 6px;
        }
        
        .filter-dropdown::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
        }
        
        .filter-dropdown::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
        }
        
        .filter-dropdown-item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            cursor: pointer;
            transition: background 0.2s;
            font-size: 13px;
        }
        
        .filter-dropdown-item:hover {
            background: #f1f5f9;
        }
        
        .filter-active .table-title {
            color: #3b82f6;
        }
        
        .filter-active .table-title i {
            color: #3b82f6;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* Partner cədvəli üçün xüsusi */
        #partnerTableSection th {
            position: relative;
            padding-right: 30px !important;
        }
        
        /* External cədvəli üçün xüsusi */
        #externalTableSection th {
            position: relative;
            padding-right: 30px !important;
        }
        
        /* Archive cədvəli üçün xüsusi */
        #archiveTableSection th {
            position: relative;
            padding-right: 30px !important;
        }
        
        /* Clear button */
        .clear-filters-btn {
            transition: all 0.2s;
        }
        
        .clear-filters-btn:hover {
            background: #fee2e2 !important;
            transform: scale(1.05);
        }
    `;

    document.head.appendChild(style);

    console.log('✅ SUPER COLUMN FILTER hazırdır!');

})();