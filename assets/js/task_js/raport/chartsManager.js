// ========================================
// REPORT MANAGER - chartsManager.js
// QRAFİKLƏR (CHART.JS)
// ========================================
// raport/chartsManager.js
class ChartsManager {
    constructor(manager) {
        this.manager = manager;
        this.charts = manager.charts;
        this.stats = manager.stats;
        this.data = manager.data;
    }

    updateCharts() {
        this.updateMonthlyChart();
        this.updatePieChart();
    }

    updateMonthlyChart() {
        const ctx = document.getElementById('monthlyTrendChart')?.getContext('2d');
        if (!ctx) {
            console.warn('⚠️ monthlyTrendChart elementi tapılmadı');
            return;
        }

        if (typeof Chart === 'undefined') {
            console.warn('⚠️ Chart.js yüklənməyib, qrafik göstərilməyəcək');
            return;
        }

        const monthlyData = this.data.monthlyTrend || [];
        const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];

        const datasets = [
            { label: 'Tamamlanan', data: this.getMonthlyData(monthlyData, 'completed_tasks'), color: '#10b981' },
            { label: 'Gözləmədə', data: this.getMonthlyData(monthlyData, 'pending_tasks'), color: '#f59e0b' },
            { label: 'Müddəti keçən', data: this.getMonthlyData(monthlyData, 'overdue_tasks'), color: '#ef4444' }
        ];

        if (this.charts.monthly) this.charts.monthly.destroy();

        try {
            this.charts.monthly = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: datasets.map(d => ({
                        label: d.label,
                        data: d.data,
                        borderColor: d.color,
                        backgroundColor: `${d.color}10`,
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true
                    }))
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });
        } catch (error) {
            console.error('Qrafik yaradılarkən xəta:', error);
        }
    }

    updatePieChart() {
        const ctx = document.getElementById('statusPieChart')?.getContext('2d');
        if (!ctx) {
            console.warn('⚠️ statusPieChart elementi tapılmadı');
            return;
        }

        if (typeof Chart === 'undefined') {
            console.warn('⚠️ Chart.js yüklənməyib, qrafik göstərilməyəcək');
            return;
        }

        if (this.charts.pie) this.charts.pie.destroy();

        try {
            this.charts.pie = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Tamamlanan', 'Gözləmədə', 'İcra edilir', 'Müddəti keçən'],
                    datasets: [{
                        data: [
                            this.stats.completed || 0,
                            this.stats.pending || 0,
                            this.stats.in_progress || 0,
                            this.stats.overdue || 0
                        ],
                        backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        } catch (error) {
            console.error('Pie qrafik yaradılarkən xəta:', error);
        }
    }

    getMonthlyData(monthlyData, field) {
        return Array.from({ length: 12 }, (_, i) => {
            const monthData = monthlyData.find(m => m.month === i + 1);
            return monthData ? monthData[field] || 0 : 0;
        });
    }
}
window.ReportModules = window.ReportModules || {};
window.ReportModules.ChartsManager = ChartsManager;