// raport/hooks/useReportData.js
// React-like data management hook

class ReportDataHook {
    constructor() {
        this.state = {
            data: null,
            loading: false,
            error: null,
            lastUpdate: null
        };
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.listeners.forEach(listener => listener(this.state));
    }

    async fetchData(dateRange, options = {}) {
        this.setState({ loading: true, error: null });

        try {
            const results = await ReportApiService.loadAllData(dateRange, options);
            this.setState({
                data: results,
                loading: false,
                lastUpdate: new Date()
            });
            return results;
        } catch (error) {
            this.setState({ loading: false, error: error.message });
            throw error;
        }
    }

    getStats() {
        if (!this.state.data?.full) return null;
        return ReportDataService.processStatistics(this.state.data.full);
    }

    getCompanyStats() {
        if (!this.state.data?.companies || !this.state.data?.full?.detailed_tasks) return [];
        return ReportDataService.processCompanyStats(
            this.state.data.companies,
            this.state.data.full.detailed_tasks
        );
    }

    getEmployeeStats() {
        if (!this.state.data?.employees || !this.state.data?.full?.detailed_tasks) return [];
        return ReportDataService.processEmployeeStats(
            this.state.data.employees,
            this.state.data.full.detailed_tasks
        );
    }
}

window.ReportDataHook = ReportDataHook;