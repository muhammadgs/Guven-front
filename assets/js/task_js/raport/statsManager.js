// ========================================
// REPORT MANAGER - statsManager.js
// STATİSTİKALAR VƏ DATA PROCESSING
// ========================================
// raport/statsManager.js
class StatsManager {
    constructor(manager) {
        this.manager = manager;
        this.stats = manager.stats;
        this.data = manager.data;
        this.elements = manager.elements;
        this.searchFilters = manager.searchFilters;
        this.utils = manager.utils;
    }

    processData() {
        const tasks = this.data.tasks;
        const general = this.data.general || this.calculateGeneralStats();
        const trends = this.data.trends || {};
        const financial = this.data.financial || {};

        const stats = {
            total: general.total_tasks || 0,
            completed: general.completed_tasks || 0,
            pending: general.pending_tasks || 0,
            in_progress: general.in_progress_tasks || 0,
            overdue: general.overdue_tasks || 0,
            // Placeholder-ready fields for future report API metrics.
            refused: general.refused_tasks || 0,
            cancelled: general.cancelled_tasks || 0,
            approvalPending: general.approval_pending_tasks || 0,
            totalTrend: trends.total_tasks || 0,
            completedTrend: trends.completed_tasks || 0,
            pendingTrend: trends.pending_tasks || 0,
            overdueTrend: trends.overdue_tasks || 0,
            refusedTrend: trends.refused_tasks || 0,
            cancelledTrend: trends.cancelled_tasks || 0,
            approvalPendingTrend: trends.approval_pending_tasks || 0,
            inProgressTrend: trends.in_progress_tasks || 0,
            totalRevenue: financial.total_revenue || 0,
            totalCost: financial.total_cost || 0,
            totalProfit: financial.total_profit || 0
        };

        stats.completedPercentage = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
        stats.pendingPercentage = stats.total ? Math.round((stats.pending / stats.total) * 100) : 0;
        stats.overduePercentage = stats.total ? Math.round((stats.overdue / stats.total) * 100) : 0;
        stats.refusedPercentage = stats.total ? Math.round((stats.refused / stats.total) * 100) : 0;
        stats.cancelledPercentage = stats.total ? Math.round((stats.cancelled / stats.total) * 100) : 0;
        stats.approvalPendingPercentage = stats.total ? Math.round((stats.approvalPending / stats.total) * 100) : 0;
        stats.inProgressPercentage = stats.total ? Math.round((stats.in_progress / stats.total) * 100) : 0;

        // Average completion time
        const completedTasks = tasks.filter(t => t.completed_date);
        if (completedTasks.length > 0) {
            const totalDays = completedTasks.reduce((sum, task) => {
                const start = new Date(task.created_at);
                const end = new Date(task.completed_date);
                return sum + Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
            }, 0);
            stats.avgCompletionTime = Math.round(totalDays / completedTasks.length);
        } else {
            stats.avgCompletionTime = 0;
        }

        // On-time rate
        const ontimeCompleted = completedTasks.filter(t =>
            t.completed_date && t.due_date && new Date(t.completed_date) <= new Date(t.due_date)
        ).length;
        stats.ontimeRate = completedTasks.length ? Math.round((ontimeCompleted / completedTasks.length) * 100) : 0;

        // Productivity rate
        stats.productivityRate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

        // Active users (last 30 days)
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        const activeUsers = new Set(
            tasks
                .filter(t => new Date(t.created_at) >= last30Days)
                .map(t => t.assigned_to)
                .filter(id => id)
        );
        stats.activeUsers = activeUsers.size;

        return stats;
    }

    calculateGeneralStats() {
        const tasks = this.data.tasks || [];
        const now = new Date();

        return {
            total_tasks: tasks.length,
            completed_tasks: tasks.filter(t => t.status === 'completed').length,
            pending_tasks: tasks.filter(t => t.status === 'pending').length,
            in_progress_tasks: tasks.filter(t => t.status === 'in_progress').length,
            overdue_tasks: tasks.filter(t =>
                t.status === 'overdue' ||
                (t.due_date && new Date(t.due_date) < now && t.status !== 'completed')
            ).length,
            refused_tasks: 0,
            cancelled_tasks: 0,
            approval_pending_tasks: 0,
            active_employees: new Set(tasks.map(t => t.assigned_to).filter(id => id)).size,
            active_companies: new Set(tasks.map(t => t.company_id).filter(id => id)).size
        };
    }

    async calculateTrends() {
        const daysDiff = Math.ceil((this.manager.dateRange.end - this.manager.dateRange.start) / (1000 * 60 * 60 * 24));
        const previousStart = new Date(this.manager.dateRange.start);
        previousStart.setDate(previousStart.getDate() - daysDiff);
        const previousEnd = new Date(this.manager.dateRange.start);

        const previousRange = { start: previousStart, end: previousEnd };
        const previousTasks = await this.manager.api.fetchTasks(previousRange, this.manager.filters);

        const currentCount = this.data.tasks.length;
        const previousCount = previousTasks.length;

        const calcTrend = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        return {
            total_tasks: calcTrend(currentCount, previousCount),
            completed_tasks: calcTrend(
                this.data.tasks.filter(t => t.status === 'completed').length,
                previousTasks.filter(t => t.status === 'completed').length
            ),
            pending_tasks: calcTrend(
                this.data.tasks.filter(t => t.status === 'pending').length,
                previousTasks.filter(t => t.status === 'pending').length
            ),
            overdue_tasks: calcTrend(
                this.data.tasks.filter(t => t.status === 'overdue').length,
                previousTasks.filter(t => t.status === 'overdue').length
            ),
            in_progress_tasks: calcTrend(
                this.data.tasks.filter(t => t.status === 'in_progress').length,
                previousTasks.filter(t => t.status === 'in_progress').length
            ),
            refused_tasks: 0,
            cancelled_tasks: 0,
            approval_pending_tasks: 0,
            revenue: calcTrend(this.data.financial?.total_revenue || 0, 0),
            productivity: calcTrend(
                (this.data.tasks.filter(t => t.status === 'completed').length / (currentCount || 1)) * 100,
                (previousTasks.filter(t => t.status === 'completed').length / (previousCount || 1)) * 100
            )
        };
    }

    updateUI() {
        this.updateSummaryCards();
        this.updateCompanyStats();
        this.updateDepartmentStats();
        this.updateEmployeeStats();
        this.updateTaskTypeStats();
        this.updatePartnerStats();
        this.updateTasksTable();
        this.updatePartnerTasksTable();
        this.updateArchiveTasksTable();
    }

    updateSummaryCards() {
        const stats = this.manager.stats;
        const elements = this.elements;

        if (elements.totalTasks) {
            elements.totalTasks.textContent = stats.total;
            elements.totalProgress.style.width = '100%';
        }

        if (elements.completedTasks) {
            elements.completedTasks.textContent = stats.completed;
            elements.completedPercentage.textContent = `${stats.completedPercentage}%`;
            elements.completedProgress.style.width = `${stats.completedPercentage}%`;
        }

        if (elements.pendingTasks) {
            elements.pendingTasks.textContent = stats.pending;
            elements.pendingPercentage.textContent = `${stats.pendingPercentage}%`;
            elements.pendingProgress.style.width = `${stats.pendingPercentage}%`;
        }

        if (elements.overdueTasks) {
            elements.overdueTasks.textContent = stats.overdue;
            elements.overduePercentage.textContent = `${stats.overduePercentage}%`;
            elements.overdueProgress.style.width = `${stats.overduePercentage}%`;
        }

        if (elements.refusedTasks) {
            elements.refusedTasks.textContent = stats.refused;
            elements.refusedPercentage.textContent = `${stats.refusedPercentage}%`;
            elements.refusedProgress.style.width = `${stats.refusedPercentage}%`;
        }

        if (elements.cancelledTasks) {
            elements.cancelledTasks.textContent = stats.cancelled;
            elements.cancelledPercentage.textContent = `${stats.cancelledPercentage}%`;
            elements.cancelledProgress.style.width = `${stats.cancelledPercentage}%`;
        }

        if (elements.approvalPendingTasks) {
            elements.approvalPendingTasks.textContent = stats.approvalPending;
            elements.approvalPendingPercentage.textContent = `${stats.approvalPendingPercentage}%`;
            elements.approvalPendingProgress.style.width = `${stats.approvalPendingPercentage}%`;
        }

        if (elements.inProgressTasks) {
            elements.inProgressTasks.textContent = stats.in_progress;
            elements.inProgressPercentage.textContent = `${stats.inProgressPercentage}%`;
            elements.inProgressProgress.style.width = `${stats.inProgressPercentage}%`;
        }

        this.updateTrends();
        this.updateMetrics();
    }

    updateTrends() {
        const stats = this.manager.stats;
        const elements = this.elements;

        const trendConfigs = [
            { el: elements.totalTrend, value: stats.totalTrend },
            { el: elements.completedTrend, value: stats.completedTrend },
            { el: elements.pendingTrend, value: stats.pendingTrend },
            { el: elements.overdueTrend, value: stats.overdueTrend, inverse: true },
            { el: elements.refusedTrend, value: stats.refusedTrend, inverse: true },
            { el: elements.cancelledTrend, value: stats.cancelledTrend, inverse: true },
            { el: elements.approvalPendingTrend, value: stats.approvalPendingTrend, inverse: true },
            { el: elements.inProgressTrend, value: stats.inProgressTrend }
        ];

        trendConfigs.forEach(({ el, value, inverse = false }) => {
            if (el) {
                const isPositive = inverse ? value <= 0 : value >= 0;
                el.textContent = `${value > 0 ? '+' : ''}${value}%`;
                el.className = `report-card-trend ${isPositive ? 'positive' : 'negative'}`;
            }
        });
    }

    updateMetrics() {
        const stats = this.manager.stats;
        const elements = this.elements;

        const metricConfigs = [
            { el: elements.avgCompletionTime, value: `${stats.avgCompletionTime} gün` },
            { el: elements.productivityRate, value: `${stats.productivityRate}%` },
            { el: elements.ontimeRate, value: `${stats.ontimeRate}%` },
            { el: elements.activeUsers, value: stats.activeUsers },
            { el: elements.totalRevenue, value: this.utils.formatMoney(stats.totalRevenue) },
            { el: elements.totalProfit, value: this.utils.formatMoney(stats.totalProfit) }
        ];

        metricConfigs.forEach(({ el, value }) => {
            if (el) el.textContent = value;
        });
    }

    // Detailed stats methods...
    updateCompanyStats() { /* ... */ }
    updateDepartmentStats() { /* ... */ }
    updateEmployeeStats() { /* ... */ }
    updateTaskTypeStats() { /* ... */ }
    updatePartnerStats() { /* ... */ }
    updateTasksTable() { /* ... */ }
    updatePartnerTasksTable() { /* ... */ }
    updateArchiveTasksTable() { /* ... */ }
}

window.ReportModules = window.ReportModules || {};
window.ReportModules.StatsManager = StatsManager;