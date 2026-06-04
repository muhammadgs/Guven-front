// raport/reportService.js
// Məlumat emalı, statistikalar və trend hesablamaları

/**
 * Report Data Service
 * API-dən gələn raw məlumatları emal edir və statistikaları hesablayır
 */

class ReportDataService {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Raw məlumatlardan statistikaları hesabla
     */
    processStatistics(data) {
        const tasks = data.detailed_tasks || data.tasks || [];
        const now = new Date();

        // Əsas statistikalar
        const completed = tasks.filter(t => t.status === 'completed');
        const pending = tasks.filter(t => t.status === 'pending');
        const inProgress = tasks.filter(t => t.status === 'in_progress');
        const overdue = tasks.filter(t =>
            t.status === 'overdue' ||
            (t.due_date && new Date(t.due_date) < now && t.status !== 'completed')
        );

        // Maliyyə
        let totalRevenue = 0, totalCost = 0;
        completed.forEach(task => {
            if (task.is_billable) {
                totalRevenue += (task.billing_rate || 0) * (task.actual_hours || 0);
            }
            totalCost += (task.actual_hours || 0) * 50; // saatlıq xərc
        });

        // Ortalama tamamlama müddəti
        let avgCompletionDays = 0;
        if (completed.length > 0) {
            const totalDays = completed.reduce((sum, task) => {
                if (task.created_at && task.completed_date) {
                    const start = new Date(task.created_at);
                    const end = new Date(task.completed_date);
                    return sum + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
                }
                return sum;
            }, 0);
            avgCompletionDays = Math.round(totalDays / completed.length);
        }

        // Vaxtında tamamlama faizi
        const onTimeCount = completed.filter(task =>
            task.due_date && new Date(task.completed_date) <= new Date(task.due_date)
        ).length;
        const onTimeRate = completed.length ? Math.round((onTimeCount / completed.length) * 100) : 0;

        return {
            // Ümumi
            total: tasks.length,
            completed: completed.length,
            pending: pending.length,
            inProgress: inProgress.length,
            overdue: overdue.length,

            // Faizlər
            completedPercent: tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0,
            pendingPercent: tasks.length ? Math.round((pending.length / tasks.length) * 100) : 0,
            overduePercent: tasks.length ? Math.round((overdue.length / tasks.length) * 100) : 0,
            inProgressPercent: tasks.length ? Math.round((inProgress.length / tasks.length) * 100) : 0,

            // Maliyyə
            totalRevenue,
            totalCost,
            totalProfit: totalRevenue - totalCost,
            profitMargin: totalRevenue ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 100) : 0,

            // Performans
            avgCompletionDays,
            onTimeRate,
            productivityRate: tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0,

            // Aktivlik
            activeEmployees: new Set(tasks.map(t => t.assigned_to).filter(id => id)).size,
            activeCompanies: new Set(tasks.map(t => t.company_id).filter(id => id)).size
        };
    }

    /**
     * Trend hesablamaları (əvvəlki dövr ilə müqayisə)
     */
    async calculateTrends(currentStats, previousStats) {
        const calcTrend = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        return {
            total: calcTrend(currentStats.total, previousStats.total),
            completed: calcTrend(currentStats.completed, previousStats.completed),
            pending: calcTrend(currentStats.pending, previousStats.pending),
            overdue: calcTrend(currentStats.overdue, previousStats.overdue),
            revenue: calcTrend(currentStats.totalRevenue, previousStats.totalRevenue),
            productivity: calcTrend(currentStats.productivityRate, previousStats.productivityRate)
        };
    }

    /**
     * Şirkətlər üzrə statistikalar
     */
    processCompanyStats(companies, tasks) {
        if (!companies?.length) return [];

        const taskCountByCompany = {};
        const completedCountByCompany = {};

        tasks.forEach(task => {
            if (task.company_id) {
                taskCountByCompany[task.company_id] = (taskCountByCompany[task.company_id] || 0) + 1;
                if (task.status === 'completed') {
                    completedCountByCompany[task.company_id] = (completedCountByCompany[task.company_id] || 0) + 1;
                }
            }
        });

        return companies.map(company => ({
            ...company,
            taskCount: taskCountByCompany[company.id] || 0,
            completedCount: completedCountByCompany[company.id] || 0,
            completedPercent: taskCountByCompany[company.id]
                ? Math.round((completedCountByCompany[company.id] / taskCountByCompany[company.id]) * 100)
                : 0
        })).sort((a, b) => b.taskCount - a.taskCount);
    }

    /**
     * İşçilər üzrə statistikalar
     */
    processEmployeeStats(employees, tasks) {
        if (!employees?.length) return [];

        const stats = employees.map(emp => {
            const empTasks = tasks.filter(t => t.assigned_to === emp.id);
            const completed = empTasks.filter(t => t.status === 'completed').length;
            const pending = empTasks.filter(t => t.status === 'pending').length;
            const overdue = empTasks.filter(t => t.status === 'overdue').length;

            return {
                ...emp,
                fullName: emp.name && emp.surname ? `${emp.name} ${emp.surname}` : (emp.name || emp.ceo_name || 'Adsız'),
                taskCount: empTasks.length,
                completedCount: completed,
                pendingCount: pending,
                overdueCount: overdue,
                completedPercent: empTasks.length ? Math.round((completed / empTasks.length) * 100) : 0,
                avgCompletionDays: this._calculateEmployeeAvgDays(empTasks)
            };
        });

        return stats.sort((a, b) => b.completedCount - a.completedCount);
    }

    _calculateEmployeeAvgDays(tasks) {
        const completed = tasks.filter(t => t.status === 'completed' && t.created_at && t.completed_date);
        if (!completed.length) return 0;

        const totalDays = completed.reduce((sum, task) => {
            const days = (new Date(task.completed_date) - new Date(task.created_at)) / (1000 * 60 * 60 * 24);
            return sum + Math.max(0, days);
        }, 0);

        return Math.round(totalDays / completed.length);
    }

    /**
     * Aylıq trend məlumatlarını chart üçün formatla
     */
    formatMonthlyTrend(monthlyData) {
        const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];

        const completed = new Array(12).fill(0);
        const pending = new Array(12).fill(0);
        const overdue = new Array(12).fill(0);
        const total = new Array(12).fill(0);

        monthlyData.forEach(item => {
            const idx = item.month - 1;
            if (idx >= 0 && idx < 12) {
                completed[idx] = item.completed_tasks || 0;
                pending[idx] = item.pending_tasks || 0;
                overdue[idx] = item.overdue_tasks || 0;
                total[idx] = item.total_tasks || 0;
            }
        });

        return { months, completed, pending, overdue, total };
    }

    /**
     * Search filter tətbiq et
     */
    filterBySearch(items, searchTerm, searchFields) {
        if (!searchTerm) return items;
        const term = searchTerm.toLowerCase();
        return items.filter(item => {
            return searchFields.some(field => {
                const value = this._getNestedValue(item, field);
                return value && String(value).toLowerCase().includes(term);
            });
        });
    }

    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Cache idarəsi
     */
    setCache(key, data, ttl = 5 * 60 * 1000) { // default 5 dəqiqə
        this.cache.set(key, {
            data,
            expires: Date.now() + ttl
        });
    }

    getCache(key) {
        const cached = this.cache.get(key);
        if (cached && cached.expires > Date.now()) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    clearCache() {
        this.cache.clear();
    }
}

// Singleton instance
window.ReportDataService = new ReportDataService();