// raport/components/MonthlyChart.js
// Aylıq trend qrafiki komponenti

class MonthlyChart {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            height: 300,
            onClick: null,
            ...options
        };
        this.data = [];
        this.chart = null;
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="monthly-chart-container" style="height: ${this.options.height}px">
                <canvas id="monthly-chart-canvas"></canvas>
            </div>
            <div class="chart-legend">
                <span class="legend-item"><span class="legend-color completed"></span> Tamamlanan</span>
                <span class="legend-item"><span class="legend-color pending"></span> Gözləmədə</span>
                <span class="legend-item"><span class="legend-color overdue"></span> Müddəti keçən</span>
            </div>
        `;
    }

    setData(monthlyData) {
        this.data = monthlyData;
        this.updateChart();
    }

    updateChart() {
        const canvas = document.getElementById('monthly-chart-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (this.chart) this.chart.destroy();

        const formatted = ReportDataService.formatMonthlyTrend(this.data);

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: formatted.months,
                datasets: [
                    { label: 'Tamamlanan', data: formatted.completed, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 3, tension: 0.4, fill: true },
                    { label: 'Gözləmədə', data: formatted.pending, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 3, tension: 0.4, fill: true },
                    { label: 'Müddəti keçən', data: formatted.overdue, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 3, tension: 0.4, fill: true }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false }
                },
                onClick: (event, activeElements) => {
                    if (this.options.onClick && activeElements.length) {
                        const datasetIndex = activeElements[0].datasetIndex;
                        const dataIndex = activeElements[0].index;
                        this.options.onClick(datasetIndex, dataIndex, this.data[dataIndex]);
                    }
                }
            }
        });
    }
}

window.MonthlyChart = MonthlyChart;