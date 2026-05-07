// ============================================================
// SUPER COLUMN MANAGER - BÜTÜN CƏDVƏLLƏR ÜÇÜN
// Həm resize, həm drag & drop - Partnyor stilində
// ============================================================

console.log('🚀 SUPER COLUMN MANAGER - BÜTÜN CƏDVƏLLƏR ÜÇÜN');

// ==================== KONFİQURASİYA ====================
const SUPER_CONFIG = {
    // Bütün cədvəl seçiciləri
    tableSelectors: [
        '#activeTableSection table.excel-table',
        '#activeTableSection table.data-table',
        '#partnerTableSection table.excel-table',
        '#partnerTasksTable',
        '#partnerTableSection table.data-table',
        '#externalTableSection table.excel-table',
        '#externalTableSection table.data-table',
        '#archiveTableSection table.excel-table',
        '#archiveTableSection table.data-table',
        '#newTableSection table.excel-table',
        '#newTableSection table.data-table',
        'table.excel-table',
        'table.data-table'
    ],

    // Resizer görünüşü - Partnyor stilində
    resizerStyle: {
        width: '16px',
        lineWidth: '4px',
        color: '#3b82f6',
        hoverColor: '#2563eb',
        activeColor: '#1d4ed8'
    },

    // Sütun limitləri
    limits: {
        minWidth: 40,
        maxWidth: 600
    }
};

// ==================== ƏSAS FUNKSİYA ====================
function initializeAllTables() {
    console.log('✨ BÜTÜN CƏDVƏLLƏR HAZIRLANIR...');

    // Hər seçici üçün cədvəlləri tap
    SUPER_CONFIG.tableSelectors.forEach(selector => {
        const tables = document.querySelectorAll(selector);

        tables.forEach(table => {
            if (!table.classList.contains('super-ready')) {
                makeTableSuper(table);
            }
        });
    });

    // Dinamik cədvəlləri izlə
    observeNewTables();

    console.log('✅ BÜTÜN CƏDVƏLLƏR HAZIRDIR');
}

// ==================== CƏDVƏLİ HAZIRLA ====================
function makeTableSuper(table) {
    console.log(`📊 Cədvəl hazırlanır:`, table.id || 'adsız cədvəl');

    table.classList.add('super-ready');
    table.classList.add('super-table');

    // 1. Sütun ölçüsü dəyişdirmə (resize)
    setupResizeForTable(table);

    // 2. Sütun yerini dəyişdirmə (drag & drop)
    setupDragDropForTable(table);

    // 3. Yadda saxlanmış parametrləri yüklə
    loadTableSettings(table);
}

// ==================== 1. SÜTUN ÖLÇÜSÜ DƏYİŞDİRMƏ ====================
function setupResizeForTable(table) {
    const headers = table.querySelectorAll('th');

    headers.forEach((header, colIndex) => {
        // Resizer elementi
        let resizer = header.querySelector('.super-resizer');

        if (!resizer) {
            resizer = createResizerElement();
            header.style.position = 'relative';
            header.appendChild(resizer);
        }

        // Resize event-ləri
        setupResizeEvents(resizer, header, colIndex, table);
    });
}

// Resizer elementi yarat
function createResizerElement() {
    const resizer = document.createElement('div');
    resizer.className = 'super-resizer';

    const line = document.createElement('div');
    line.className = 'resizer-line';

    resizer.style.cssText = `
        position: absolute;
        top: 0;
        right: -8px;
        width: ${SUPER_CONFIG.resizerStyle.width};
        height: 100%;
        cursor: col-resize;
        z-index: 1000;
        background: transparent;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    line.style.cssText = `
        width: ${SUPER_CONFIG.resizerStyle.lineWidth};
        height: 60%;
        background: rgba(59, 130, 246, 0.4);
        border-radius: 4px;
        transition: all 0.2s ease;
        box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
    `;

    resizer.appendChild(line);

    // Hover effekti
    resizer.addEventListener('mouseenter', () => {
        if (!resizer.classList.contains('active')) {
            line.style.background = SUPER_CONFIG.resizerStyle.color;
            line.style.width = '6px';
            line.style.height = '80%';
            line.style.boxShadow = `0 0 15px ${SUPER_CONFIG.resizerStyle.color}`;
        }
    });

    resizer.addEventListener('mouseleave', () => {
        if (!resizer.classList.contains('active')) {
            line.style.background = 'rgba(59, 130, 246, 0.4)';
            line.style.width = SUPER_CONFIG.resizerStyle.lineWidth;
            line.style.height = '60%';
            line.style.boxShadow = '0 0 5px rgba(59, 130, 246, 0.3)';
        }
    });

    return resizer;
}

// Resize event-ləri
function setupResizeEvents(resizer, header, colIndex, table) {
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    let line = resizer.querySelector('.resizer-line');

    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        isResizing = true;
        startX = e.clientX;
        startWidth = header.offsetWidth;

        resizer.classList.add('active');
        table.classList.add('is-resizing');
        document.body.style.cursor = 'col-resize';
        document.body.classList.add('global-resizing');

        if (line) {
            line.style.background = SUPER_CONFIG.resizerStyle.activeColor;
            line.style.width = '8px';
            line.style.height = '90%';
            line.style.boxShadow = `0 0 20px ${SUPER_CONFIG.resizerStyle.activeColor}`;
        }

        document.addEventListener('mousemove', onResize);
        document.addEventListener('mouseup', stopResize);
    });

    const onResize = (e) => {
        if (!isResizing) return;

        const dx = e.clientX - startX;
        let newWidth = startWidth + dx;

        // Limitlər
        if (newWidth < SUPER_CONFIG.limits.minWidth) newWidth = SUPER_CONFIG.limits.minWidth;
        if (newWidth > SUPER_CONFIG.limits.maxWidth) newWidth = SUPER_CONFIG.limits.maxWidth;

        // Sütun genişliyini tətbiq et
        applyWidthToColumn(table, colIndex, newWidth);
    };

    const stopResize = () => {
        isResizing = false;

        resizer.classList.remove('active');
        table.classList.remove('is-resizing');
        document.body.style.cursor = '';
        document.body.classList.remove('global-resizing');

        if (line) {
            line.style.background = 'rgba(59, 130, 246, 0.4)';
            line.style.width = SUPER_CONFIG.resizerStyle.lineWidth;
            line.style.height = '60%';
            line.style.boxShadow = '0 0 5px rgba(59, 130, 246, 0.3)';
        }

        // Yadda saxla
        saveTableSettings(table);

        document.removeEventListener('mousemove', onResize);
        document.removeEventListener('mouseup', stopResize);
    };
}

// Sütun genişliyini tətbiq et
function applyWidthToColumn(table, colIndex, width) {
    const allRows = table.querySelectorAll('thead tr, tbody tr, tfoot tr');

    allRows.forEach(row => {
        if (row.cells && row.cells[colIndex]) {
            const cell = row.cells[colIndex];
            cell.style.width = width + 'px';
            cell.style.minWidth = width + 'px';
            cell.style.maxWidth = width + 'px';
            cell.style.overflow = 'hidden';
            cell.style.textOverflow = 'ellipsis';
            cell.style.whiteSpace = 'nowrap';
        }
    });
}

// ==================== 2. SÜTUN YERİ DƏYİŞDİRMƏ ====================
function setupDragDropForTable(table) {
    const headers = Array.from(table.querySelectorAll('th'));

    headers.forEach((header, index) => {
        header.setAttribute('draggable', 'true');
        header.dataset.originalIndex = index;

        // Drag başlayanda
        header.addEventListener('dragstart', (e) => {
            if (table.classList.contains('is-resizing')) {
                e.preventDefault();
                return;
            }

            e.dataTransfer.setData('text/plain', index);
            e.dataTransfer.effectAllowed = 'move';

            header.classList.add('dragging');

            // Drag preview
            createDragPreview(header, e);
        });

        // Drag üzərində
        header.addEventListener('dragover', (e) => {
            e.preventDefault();

            const draggingHeader = table.querySelector('th.dragging');
            if (draggingHeader && draggingHeader !== header) {
                e.dataTransfer.dropEffect = 'move';
                showDropPosition(table, parseInt(draggingHeader.dataset.originalIndex), index);
            }
        });

        // Drag daxil olanda
        header.addEventListener('dragenter', (e) => {
            e.preventDefault();
            if (!header.classList.contains('dragging')) {
                header.classList.add('drag-over');
            }
        });

        // Drag çıxanda
        header.addEventListener('dragleave', (e) => {
            header.classList.remove('drag-over');
        });

        // Buraxılan zaman
        header.addEventListener('drop', (e) => {
            e.preventDefault();

            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = index;

            if (fromIndex === toIndex) {
                removeDropIndicators(table);
                return;
            }

            // Sütunları yerini dəyiş
            reorderColumns(table, fromIndex, toIndex);

            removeDropIndicators(table);
            headers.forEach(h => h.classList.remove('drag-over', 'dragging'));
        });

        // Drag bitəndə
        header.addEventListener('dragend', () => {
            header.classList.remove('dragging');
            removeDropIndicators(table);
        });
    });

    // Cədvəlin özündə drag olmasın
    table.addEventListener('dragover', (e) => e.preventDefault());
    table.addEventListener('drop', (e) => e.preventDefault());
}

// Drag preview yarat
function createDragPreview(header, e) {
    const preview = document.createElement('div');
    preview.textContent = header.innerText.trim();
    preview.style.cssText = `
        position: fixed;
        top: -1000px;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        color: white;
        padding: 10px 20px;
        border-radius: 30px;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
        border: 2px solid white;
        z-index: 10000;
    `;
    document.body.appendChild(preview);
    e.dataTransfer.setDragImage(preview, 40, 20);
    setTimeout(() => preview.remove(), 0);
}

// Drop pozisiyasını göstər
function showDropPosition(table, fromIndex, toIndex) {
    removeDropIndicators(table);

    const headers = table.querySelectorAll('th');
    if (toIndex >= headers.length) return;

    const targetHeader = headers[toIndex];
    const rect = targetHeader.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();

    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator';
    indicator.style.cssText = `
        position: absolute;
        top: 0;
        width: 5px;
        height: ${table.offsetHeight}px;
        background: linear-gradient(180deg, #3b82f6, #8b5cf6);
        box-shadow: 0 0 15px #3b82f6;
        z-index: 9999;
        pointer-events: none;
        border-radius: 3px;
        animation: dropPulse 1s infinite;
    `;

    if (toIndex > fromIndex) {
        indicator.style.left = (rect.right - tableRect.left - 2) + 'px';
    } else {
        indicator.style.left = (rect.left - tableRect.left - 2) + 'px';
    }

    indicator.style.top = '0px';

    table.style.position = 'relative';
    table.appendChild(indicator);
}

// Indicator-u təmizlə
function removeDropIndicators(table) {
    table.querySelectorAll('.drop-indicator').forEach(el => el.remove());
}

// Sütunları yenidən sırala
function reorderColumns(table, fromIndex, toIndex) {
    console.log(`🔄 Sütun ${fromIndex} -> ${toIndex}`);

    // Bütün sətirlər
    const allRows = table.querySelectorAll('thead tr, tbody tr, tfoot tr');

    // Genişlikləri yadda saxla
    const widths = [];
    const headers = table.querySelectorAll('th');
    headers.forEach(h => widths.push(h.style.width || h.offsetWidth + 'px'));

    // Hər sətirdə sütunları yenidən sırala
    allRows.forEach(row => {
        const cells = Array.from(row.children);

        if (cells.length > Math.max(fromIndex, toIndex)) {
            const fromCell = cells[fromIndex];
            const toCell = cells[toIndex];

            if (fromCell && toCell) {
                if (toIndex > fromIndex) {
                    toCell.insertAdjacentElement('afterend', fromCell);
                } else {
                    toCell.insertAdjacentElement('beforebegin', fromCell);
                }
            }
        }
    });

    // Genişlikləri yenidən tətbiq et
    setTimeout(() => {
        const newHeaders = table.querySelectorAll('th');
        newHeaders.forEach((h, i) => {
            if (widths[i]) {
                applyWidthToColumn(table, i, parseFloat(widths[i]));
            }
        });

        // Yadda saxla
        saveTableSettings(table);
        showNotification('Sütunların yeri dəyişdirildi', 'success');
    }, 50);
}

// ==================== 3. YADDAŞA SAXLAMA ====================
function saveTableSettings(table) {
    const tableId = getTableId(table);
    const settings = {
        widths: {},
        order: [],
        timestamp: Date.now()
    };

    const headers = table.querySelectorAll('th');

    headers.forEach((header, index) => {
        // Genişlik
        settings.widths[index] = header.style.width || header.offsetWidth + 'px';

        // Sıralama (başlıq mətninə görə)
        settings.order.push(header.innerText.trim());
    });

    try {
        localStorage.setItem(`super_settings_${tableId}`, JSON.stringify(settings));
        console.log(`💾 Yadda saxlandı: ${tableId}`);
    } catch (e) {
        console.warn('LocalStorage xətası:', e);
    }
}

function loadTableSettings(table) {
    const tableId = getTableId(table);

    try {
        const saved = localStorage.getItem(`super_settings_${tableId}`);

        if (saved) {
            const settings = JSON.parse(saved);
            console.log(`📂 Yüklənir: ${tableId}`);

            // Genişlikləri tətbiq et
            Object.keys(settings.widths).forEach(index => {
                const width = settings.widths[index];
                applyWidthToColumn(table, parseInt(index), parseFloat(width));
            });
        }
    } catch (e) {
        console.warn('Yükləmə xətası:', e);
    }
}

function getTableId(table) {
    if (table.id) {
        return table.id;
    }

    let tableType = 'unknown';

    if (table.closest('#activeTableSection')) tableType = 'active';
    else if (table.closest('#partnerTableSection') || table.id === 'partnerTasksTable') tableType = 'partner';
    else if (table.closest('#externalTableSection')) tableType = 'external';
    else if (table.closest('#archiveTableSection')) tableType = 'archive';
    else if (table.closest('#newTableSection')) tableType = 'new';

    const uniqueId = `${tableType}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    table.id = uniqueId;

    return uniqueId;
}

// ==================== 4. DİNAMİK İZLƏMƏ ====================
function observeNewTables() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.tagName === 'TABLE') {
                        if (!node.classList.contains('super-ready')) {
                            makeTableSuper(node);
                        }
                    }

                    const tables = node.querySelectorAll ? node.querySelectorAll('table') : [];
                    tables.forEach(table => {
                        if (!table.classList.contains('super-ready')) {
                            makeTableSuper(table);
                        }
                    });
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// ==================== 5. SIFIRLAMA DÜYMƏSİ ====================
function addResetButton() {
    const columnsBtn = document.getElementById('activeColumnsBtn');

    if (columnsBtn) {
        const resetBtn = document.createElement('button');
        resetBtn.className = 'table-action-btn';
        resetBtn.id = 'superResetBtn';
        resetBtn.title = 'Sütunları sıfırla';
        resetBtn.innerHTML = '<i class="fas fa-undo-alt"></i>';

        resetBtn.style.marginLeft = '5px';

        resetBtn.addEventListener('click', showResetMenu);

        columnsBtn.parentNode.insertBefore(resetBtn, columnsBtn.nextSibling);
    }
}

function showResetMenu() {
    const oldMenu = document.querySelector('.reset-menu');
    if (oldMenu) oldMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'reset-menu';
    menu.style.cssText = `
        position: fixed;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        padding: 16px;
        min-width: 220px;
        z-index: 10000;
        border: 1px solid #e5e7eb;
        animation: menuFadeIn 0.2s ease;
    `;

    const btn = document.getElementById('superResetBtn');
    const rect = btn.getBoundingClientRect();

    menu.style.top = rect.bottom + 5 + 'px';
    menu.style.left = rect.left + 'px';

    menu.innerHTML = `
        <button id="resetAllTablesBtn" style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #1f2937;">
        </button>
        
    `;

    document.body.appendChild(menu);

    document.getElementById('resetAllTablesBtn').addEventListener('click', () => {
        resetAllTables();
        menu.remove();
    });

    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && e.target.id !== 'superResetBtn') {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

function resetAllTables() {
    // LocalStorage-dan sütun parametrlərini sil
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('super_settings_')) {
            localStorage.removeItem(key);
        }
    });

    // SessionStorage-dan task cache-lərini sil
    Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('tc_')) {
            sessionStorage.removeItem(key);
        }
    });

    showNotification('Yenilənir...', 'info');

    // Filtrləri sıfırla
    if (window.taskManager) {
        window.taskManager.currentFilters = {};
        window.taskManager.currentFilterTable = 'active';
    }

    const filterBadge = document.getElementById('filterBadge');
    if (filterBadge) filterBadge.style.display = 'none';

    const filterForm = document.getElementById('filterForm');
    if (filterForm) {
        filterForm.reset();
        const activeRadio = document.querySelector('input[name="filter_table"][value="active"]');
        if (activeRadio) activeRadio.checked = true;
    }

    // Active cədvəlini API-dən yenilə
    setTimeout(async () => {
        try {
            // Token-dan userId al
            const token = localStorage.getItem('guven_token');
            let userId = null;
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    userId = payload.user_id || payload.sub;
                } catch(e) {}
            }
            userId = userId || window.taskManager?.userData?.userId;

            if (!userId) {
                showNotification('İstifadəçi tapılmadı', 'error');
                return;
            }

            const activeStatuses = 'pending,in_progress,overdue,pending_approval,waiting,paused,approval_overdue';
            const endpoint = `/tasks/detailed?page=1&limit=100&status=${activeStatuses}&assigned_to=${userId}`;

            const response = await makeApiRequest(endpoint, 'GET');

            let tasks = [];
            if (Array.isArray(response)) {
                tasks = response;
            } else if (response?.data && Array.isArray(response.data)) {
                tasks = response.data;
            } else if (response?.items && Array.isArray(response.items)) {
                tasks = response.items;
            }

            // Cədvəli yenilə
            if (window.TableManager && window.ActiveRowCreator) {
                window.TableManager.renderTasksTable('active', tasks, false, 1);
            }

            // Sayları yenilə
            const count = tasks.length;
            const countEl = document.getElementById('countActive');
            const totalEl = document.getElementById('activeTableTotalCount');
            if (countEl) countEl.textContent = count;
            if (totalEl) totalEl.textContent = count;

            // Pagination sıfırla
            if (window.taskManager?.pagination?.active) {
                window.taskManager.pagination.active.page = 1;
                window.taskManager.pagination.active.total = count;
                window.taskManager.pagination.active.totalPages = Math.ceil(count / 20) || 1;
                window.taskManager.updatePaginationUI('active');
            }

            showNotification(`✅ Cədvəl yeniləndi (${count} task)`, 'success');

        } catch(e) {
            console.error('❌ Reset xətası:', e);
            showNotification('Xəta baş verdi', 'error');
        }
    }, 100);
}

// ==================== 6. NOTIFICATION ====================
function showNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = 'super-notification';
    notif.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 500;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notif);

    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 2000);
}

// ==================== 7. CSS STİLLƏRİ ====================
const style = document.createElement('style');
style.textContent = `
    /* Ümumi stillər */
    .super-table th {
        position: relative;
        user-select: none;
        transition: none !important;
    }
    
    /* Resizer stilləri - Partnyor stilində */
    .super-resizer {
        position: absolute;
        top: 0;
        right: -8px;
        width: 16px;
        height: 100%;
        cursor: col-resize;
        z-index: 1000;
        background: transparent;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .super-resizer .resizer-line {
        width: 4px;
        height: 60%;
        background: rgba(59, 130, 246, 0.4);
        border-radius: 4px;
        transition: all 0.2s ease;
        box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
    }
    
    .super-resizer:hover .resizer-line {
        background: #3b82f6 !important;
        width: 6px !important;
        height: 80% !important;
        box-shadow: 0 0 15px #3b82f6 !important;
    }
    
    .super-resizer.active .resizer-line {
        background: #1d4ed8 !important;
        width: 8px !important;
        height: 90% !important;
        box-shadow: 0 0 20px #1d4ed8 !important;
    }
    
    /* Drag & Drop stilləri */
    .super-table th[draggable="true"] {
        cursor: grab;
    }
    
    .super-table th[draggable="true"]:active {
        cursor: grabbing;
    }
    
    .super-table th.dragging {
        opacity: 0.6;
        background: #e2e8f0 !important;
        border: 2px dashed #3b82f6;
        transform: scale(1.02);
        box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        z-index: 10000;
    }
    
    .super-table th.drag-over {
        background: #dbeafe !important;
        border-left: 3px solid #3b82f6;
        border-right: 3px solid #3b82f6;
    }
    
    /* Drop indicator */
    .drop-indicator {
        animation: dropPulse 1s infinite;
    }
    
    @keyframes dropPulse {
        0%, 100% { opacity: 0.8; transform: scaleY(1); }
        50% { opacity: 0.4; transform: scaleY(1.1); }
    }
    
    /* Resize zamanı */
    .is-resizing {
        cursor: col-resize;
    }
    
    .is-resizing * {
        cursor: col-resize !important;
        user-select: none !important;
    }
    
    .global-resizing {
        cursor: col-resize !important;
    }
    
    .global-resizing * {
        cursor: col-resize !important;
        user-select: none !important;
    }
    
    /* Cədvəl hüceyrələri */
    .super-table td,
    .super-table th {
        transition: none !important;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    
    /* Animasiyalar */
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes menuFadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;

document.head.appendChild(style);

// ==================== 8. GLOBAL OBYEKT ====================
window.SuperColumns = {
    refresh: () => {
        initializeAllTables();
        showNotification('Bütün cədvəllər yeniləndi', 'success');
    },

    resetAll: () => {
        if (confirm('Bütün sütun parametrlərini sıfırlamaq istədiyinizə əminsiniz?')) {
            resetAllTables();
        }
    },

    saveAll: () => {
        const tables = document.querySelectorAll('.super-ready');
        tables.forEach(table => saveTableSettings(table));
        showNotification('Bütün parametrlər yadda saxlandı', 'success');
    }
};

// ==================== 9. İŞƏ SALMA ====================
function initialize() {
    console.log('🚀 SUPER COLUMN MANAGER başladılır...');

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                initializeAllTables();
                addResetButton();
            }, 300);
        });
    } else {
        setTimeout(() => {
            initializeAllTables();
            addResetButton();
        }, 300);
    }

    window.addEventListener('load', () => {
        setTimeout(initializeAllTables, 500);
    });
}

// Başlat
initialize();

console.log('✅ SUPER COLUMN MANAGER - BÜTÜN CƏDVƏLLƏR HAZIRDIR!');