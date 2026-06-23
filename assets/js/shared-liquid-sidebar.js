(function () {
    function initLiquidSidebar() {
        const sidebar = document.getElementById('mainSidebar');
        const menu = document.getElementById('sidebarMenu') || document.querySelector('.gf-sidebar-menu');
        if (!sidebar || !menu || menu.dataset.liquidSidebarReady === 'true') return;
        menu.dataset.liquidSidebarReady = 'true';

        const getItems = () => Array.from(menu.querySelectorAll('a.sidebar-link'));

        function activeItem() {
            return menu.querySelector('a.sidebar-link.active, a.sidebar-link.bg-brand-soft.text-brand-blue') || getItems()[0];
        }

        function moveIndicator(item) {
            if (!item) return;
            const menuRect = menu.getBoundingClientRect();
            const itemRect = item.getBoundingClientRect();
            const expanded = sidebar.matches(':hover');
            const size = Math.min(60, itemRect.height || 60);

            if (expanded) {
                menu.style.setProperty('--indicator-left', '12px');
                menu.style.setProperty('--indicator-top', `${itemRect.top - menuRect.top}px`);
                menu.style.setProperty('--indicator-width', `${Math.max(itemRect.width, menuRect.width - 24)}px`);
                menu.style.setProperty('--indicator-height', `${itemRect.height || 60}px`);
                menu.style.setProperty('--indicator-radius', '28px');
            } else {
                menu.style.setProperty('--indicator-left', `${itemRect.left - menuRect.left + (itemRect.width - size) / 2}px`);
                menu.style.setProperty('--indicator-top', `${itemRect.top - menuRect.top + (itemRect.height - size) / 2}px`);
                menu.style.setProperty('--indicator-width', `${size}px`);
                menu.style.setProperty('--indicator-height', `${size}px`);
                menu.style.setProperty('--indicator-radius', '999px');
            }
            menu.style.setProperty('--indicator-opacity', '1');
        }

        function markActive(item) {
            if (!item) return;
            getItems().forEach(link => link.classList.remove('active'));
            item.classList.add('active');
            window.requestAnimationFrame(() => moveIndicator(item));
        }

        menu.addEventListener('pointerover', event => {
            const item = event.target.closest('a.sidebar-link');
            if (item && menu.contains(item) && sidebar.matches(':hover')) moveIndicator(item);
        });

        menu.addEventListener('pointerleave', () => moveIndicator(activeItem()));
        menu.addEventListener('click', event => {
            const item = event.target.closest('a.sidebar-link');
            if (item && menu.contains(item)) markActive(item);
        }, true);

        sidebar.addEventListener('mouseenter', () => window.requestAnimationFrame(() => moveIndicator(activeItem())));
        sidebar.addEventListener('mouseleave', () => window.requestAnimationFrame(() => moveIndicator(activeItem())));
        window.addEventListener('resize', () => moveIndicator(activeItem()));

        const observer = new MutationObserver(() => moveIndicator(activeItem()));
        getItems().forEach(item => observer.observe(item, { attributes: true, attributeFilter: ['class'] }));
        setTimeout(() => moveIndicator(activeItem()), 80);
        setTimeout(() => moveIndicator(activeItem()), 600);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLiquidSidebar);
    } else {
        initLiquidSidebar();
    }
})();
