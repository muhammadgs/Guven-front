class NotificationsService {
    constructor() {
        this.bellBtn = document.getElementById('notificationBellBtn');
        this.dropdown = null;
        this.isOpen = false;
        this.activeTab = 'all'; // all, personal, news

        // Data loaded from API
        this.notifications = [];

        this.init();
    }

    async loadNotifications() {
        if (!window.apiService) return;
        try {
            const res = await window.apiService.getNotifications({ limit: 50 });
            const notifs = res?.notifications || res?.data || (Array.isArray(res) ? res : []);
            this.notifications = notifs.map(n => ({
                id: n.id,
                type: this.mapBackendTypeToFrontend(n.notification_type || n.type),
                title: n.title,
                message: n.message,
                date: new Date(n.created_at || n.date),
                isRead: n.is_read || n.isRead || false
            }));
            this.renderList();
        } catch (e) {
            console.error('Bildirişləri yükləmək mümkün olmadı', e);
        }
    }

    mapBackendTypeToFrontend(backendType) {
        if (!backendType) return 'news';
        const t = backendType.toLowerCase();
        if (t.includes('task') || t.includes('protocol') || t.includes('personal') || t.includes('assigned')) return 'personal';
        if (t.includes('comment') || t.includes('note')) return 'note';
        return 'news';
    }

    init() {
        if (!this.bellBtn) {
            console.warn('Notification bell button not found!');
            return;
        }

        this.createDropdown();
        this.bindEvents();
        
        // Initial fetch
        this.updateRedDot();
        this.loadNotifications();
    }

    createDropdown() {
        // Dropdown container
        this.dropdown = document.createElement('div');
        this.dropdown.id = 'notificationDropdownPanel';
        this.dropdown.className = 'absolute top-20 right-8 w-[380px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col border border-gray-100 transition-all duration-300 opacity-0 pointer-events-none transform -translate-y-4';
        this.dropdown.style.zIndex = '9999';

        // Header
        const header = document.createElement('div');
        header.className = 'px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-2xl';
        header.innerHTML = `
            <h3 class="text-lg font-bold text-gray-800">Bildirişlər</h3>
            <button id="markAllReadBtn" class="text-sm font-medium text-brand-blue hover:text-blue-700 transition-colors">Hamısını oxunmuş et</button>
        `;

        // Tabs
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'flex items-center px-4 py-3 gap-2 border-b border-gray-100 bg-white';
        
        const tabs = [
            { id: 'all', label: 'Hamısı' },
            { id: 'personal', label: 'Şəxsi' },
            { id: 'news', label: 'Xəbərlər' }
        ];

        tabs.forEach(tab => {
            const btn = document.createElement('button');
            btn.className = `px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${this.activeTab === tab.id ? 'bg-brand-blue text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`;
            btn.textContent = tab.label;
            btn.dataset.tab = tab.id;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.switchTab(tab.id, btn);
            });
            tabsContainer.appendChild(btn);
        });

        // List Container
        this.listContainer = document.createElement('div');
        this.listContainer.className = 'max-h-[400px] overflow-y-auto custom-scrollbar bg-white rounded-b-2xl';
        
        // Custom scrollbar style inline for compatibility
        const style = document.createElement('style');
        style.innerHTML = `
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-bottom-right-radius: 1rem; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
        `;
        document.head.appendChild(style);

        this.dropdown.appendChild(header);
        this.dropdown.appendChild(tabsContainer);
        this.dropdown.appendChild(this.listContainer);

        // Prevent clicks inside dropdown from closing it
        this.dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Append to parent of bell (which is `<main class="relative">`)
        this.bellBtn.parentNode.appendChild(this.dropdown);

        // Initial render
        this.renderList();
    }

    bindEvents() {
        // Toggle Dropdown
        this.bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.bellBtn.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Mark all read
        const markAllReadBtn = this.dropdown.querySelector('#markAllReadBtn');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (window.apiService) {
                    try {
                        await window.apiService.markAllNotificationsAsRead();
                    } catch (err) {
                        console.error('Hamısını oxunmuş etməkdə xəta:', err);
                    }
                }
                this.notifications.forEach(n => n.isRead = true);
                this.renderList();
                this.updateRedDot();
            });
        }
    }

    toggleDropdown() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.dropdown.classList.remove('opacity-0', 'pointer-events-none', '-translate-y-4');
            this.dropdown.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
        } else {
            this.closeDropdown();
        }
    }

    closeDropdown() {
        this.isOpen = false;
        this.dropdown.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
        this.dropdown.classList.add('opacity-0', 'pointer-events-none', '-translate-y-4');
    }

    switchTab(tabId, clickedBtn) {
        if (this.activeTab === tabId) return;
        this.activeTab = tabId;

        // Update tab styles
        const tabsContainer = clickedBtn.parentNode;
        const buttons = tabsContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.className = 'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 bg-brand-blue text-white shadow-md';
            } else {
                btn.className = 'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 bg-gray-100 text-gray-600 hover:bg-gray-200';
            }
        });

        // Re-render list
        this.renderList();
    }

    formatDateHeader(date) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
        
        const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
        const dateStr = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;

        if (isToday) return `Bugün, ${dateStr}`;
        if (isYesterday) return `Dünən, ${dateStr}`;
        return dateStr;
    }

    formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    getIconForType(type) {
        switch(type) {
            case 'news': return '<div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600"><i class="fa-solid fa-bullhorn"></i></div>';
            case 'personal': return '<div class="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600"><i class="fa-solid fa-file-signature"></i></div>';
            case 'note': return '<div class="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-600"><i class="fa-solid fa-note-sticky"></i></div>';
            default: return '<div class="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-600"><i class="fa-regular fa-bell"></i></div>';
        }
    }

    addNotification(notifData) {
        const newNotif = {
            id: Date.now(),
            type: notifData.type || 'personal',
            title: notifData.title || 'Yeni Bildiriş',
            message: notifData.message || '',
            date: notifData.date || new Date(),
            isRead: false
        };
        // Add to beginning
        this.notifications.unshift(newNotif);
        
        // Update UI
        this.renderList();
        this.updateRedDot();
    }

    renderList() {
        this.listContainer.innerHTML = '';

        // Filter
        let filtered = this.notifications;
        if (this.activeTab === 'personal') {
            filtered = this.notifications.filter(n => n.type === 'personal' || n.type === 'note');
        } else if (this.activeTab === 'news') {
            filtered = this.notifications.filter(n => n.type === 'news');
        }

        // Sort by date desc
        filtered.sort((a, b) => b.date - a.date);

        if (filtered.length === 0) {
            this.listContainer.innerHTML = `
                <div class="p-8 text-center flex flex-col items-center justify-center text-gray-400">
                    <i class="fa-regular fa-bell-slash text-4xl mb-3 opacity-50"></i>
                    <p class="text-sm">Bildiriş yoxdur</p>
                </div>
            `;
            return;
        }

        // Group by Date
        const grouped = {};
        filtered.forEach(item => {
            const dateHeader = this.formatDateHeader(item.date);
            if (!grouped[dateHeader]) {
                grouped[dateHeader] = [];
            }
            grouped[dateHeader].push(item);
        });

        Object.keys(grouped).forEach(headerStr => {
            // Render Date Header
            const headerEl = document.createElement('div');
            headerEl.className = 'text-[11px] font-bold text-gray-500 bg-gray-50/90 backdrop-blur-sm px-4 py-1.5 sticky top-0 z-10 border-b border-gray-100 uppercase tracking-widest';
            headerEl.textContent = headerStr;
            this.listContainer.appendChild(headerEl);
            
            // Render Items for this Date
            grouped[headerStr].forEach(item => {
                const row = document.createElement('div');
                row.className = `p-4 border-b border-gray-50 flex gap-3 hover:bg-gray-50 transition-colors cursor-pointer relative ${item.isRead ? 'opacity-80' : ''}`;
                
                // Unread dot
                const unreadIndicator = item.isRead ? '' : `<span class="absolute top-4 right-4 h-2 w-2 rounded-full bg-red-500"></span>`;

                row.innerHTML = `
                    ${this.getIconForType(item.type)}
                    <div class="flex-1 pr-4">
                        <h4 class="text-sm font-bold text-gray-800 mb-1 leading-tight">${item.title}</h4>
                        <p class="text-xs text-gray-500 mb-2 leading-relaxed line-clamp-2">${item.message}</p>
                        <span class="text-[11px] font-medium text-brand-blue flex items-center gap-1">
                            <i class="fa-regular fa-clock"></i> ${this.formatTime(item.date)}
                        </span>
                    </div>
                    ${unreadIndicator}
                `;

                // Click to mark read and navigate
                row.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    
                    if (window.apiService && !item.isRead) {
                        try {
                            await window.apiService.markNotificationAsRead(item.id);
                        } catch (err) {
                            console.error('Bildirişi oxunmuş etməkdə xəta:', err);
                        }
                    }

                    item.isRead = true;
                    this.renderList();
                    this.updateRedDot();
                    
                    this.closeDropdown();

                    // Routing
                    if (item.type === 'personal' || item.type === 'note') {
                        const protocolNotesBtn = document.getElementById('protocolNotesBtn');
                        if (protocolNotesBtn) {
                            protocolNotesBtn.click();
                            
                            // Wait a tiny bit for the section to render
                            setTimeout(() => {
                                if (item.type === 'personal') {
                                    document.getElementById('initialProtokolBtn')?.click();
                                } else if (item.type === 'note') {
                                    document.getElementById('initialQeydlerBtn')?.click();
                                }
                            }, 50);
                        }
                    }
                });

                this.listContainer.appendChild(row);
            });
        });
    }

    async updateRedDot() {
        let unreadCount = 0;
        if (window.apiService) {
            try {
                const res = await window.apiService.getUnreadNotificationCount();
                unreadCount = res?.unread_count || 0;
            } catch(e) {
                console.error('Bildiriş sayını gətirməkdə xəta:', e);
                // Fallback to local
                unreadCount = this.notifications.filter(n => !n.isRead).length;
            }
        } else {
            unreadCount = this.notifications.filter(n => !n.isRead).length;
        }

        const badge = this.bellBtn.querySelector('#notificationBadgeCount');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.classList.remove('scale-0');
                badge.classList.add('scale-100');
            } else {
                badge.classList.remove('scale-100');
                badge.classList.add('scale-0');
            }
        }
    }
}

// Initialize directly since the script is injected at the end of the body
setTimeout(() => {
    window.notificationsService = new NotificationsService();
}, 500);
