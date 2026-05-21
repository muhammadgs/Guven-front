// raport/components/StatCard.js
// Təkrar istifadə olunan statistik kart komponenti

class StatCard {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            icon: 'fas fa-chart-simple',
            label: 'Statistika',
            color: '#3b82f6',
            onClick: null,
            ...options
        };
        this.value = 0;
        this.subValue = null;
        this.trend = null;
        this.render();
    }

    setValue(value, subValue = null) {
        this.value = value;
        this.subValue = subValue;
        this.update();
    }

    setTrend(value, isPositive = true) {
        this.trend = { value, isPositive };
        this.update();
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="stat-card" style="border-left-color: ${this.options.color}">
                <div class="stat-card-icon" style="background: ${this.options.color}20; color: ${this.options.color}">
                    <i class="${this.options.icon}"></i>
                </div>
                <div class="stat-card-content">
                    <div class="stat-card-label">${this.options.label}</div>
                    <div class="stat-card-value" id="stat-card-value-${this.container.id}">0</div>
                    <div class="stat-card-sub" id="stat-card-sub-${this.container.id}"></div>
                    <div class="stat-card-trend" id="stat-card-trend-${this.container.id}"></div>
                </div>
            </div>
        `;

        if (this.options.onClick) {
            this.container.querySelector('.stat-card').addEventListener('click', this.options.onClick);
        }
    }

    update() {
        const valueEl = document.getElementById(`stat-card-value-${this.container.id}`);
        const subEl = document.getElementById(`stat-card-sub-${this.container.id}`);
        const trendEl = document.getElementById(`stat-card-trend-${this.container.id}`);

        if (valueEl) valueEl.textContent = this.value;
        if (subEl && this.subValue) subEl.textContent = this.subValue;

        if (trendEl && this.trend) {
            trendEl.innerHTML = `
                <i class="fas fa-arrow-${this.trend.isPositive ? 'up' : 'down'}"></i>
                <span class="${this.trend.isPositive ? 'positive' : 'negative'}">${Math.abs(this.trend.value)}%</span>
            `;
        }
    }
}

window.StatCard = StatCard;