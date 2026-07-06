/**
 * Maaş təyinatı üçün xidmət
 */
class SalaryService {
    constructor(apiService) {
        this.api = apiService;
    }

    /**
     * Şirkətin işçilərinin maaş məlumatlarını gətir
     */
    async getCompanyEmployeesWithSalary(companyId) {
        try {
            console.log(`💰 Şirkət işçilərinin maaş məlumatları gətirilir - Şirkət ID: ${companyId}`);

            // Əvvəlcə işçiləri gətir
            const employeesResponse = await this.api.get(`/employees/company/${companyId}`);

            if (!employeesResponse.success) {
                throw new Error('İşçilər gətirilərkən xəta baş verdi');
            }

            const employees = employeesResponse.data;

            // Hər bir işçi üçün maaş məlumatlarını gətir
            const employeesWithSalary = await Promise.all(
                employees.map(async (employee) => {
                    try {
                        const salaryResponse = await this.api.get(`/salaries/employee/${employee.id}/current`);
                        return {
                            ...employee,
                            salary: salaryResponse.success ? salaryResponse.data : null
                        };
                    } catch (error) {
                        console.error(`İşçi ${employee.id} üçün maaş məlumatları gətirilərkən xəta:`, error);
                        return {
                            ...employee,
                            salary: null
                        };
                    }
                })
            );

            console.log(`✅ ${employeesWithSalary.length} işçinin maaş məlumatları gətirildi`);
            return employeesWithSalary;

        } catch (error) {
            console.error('❌ Maaş məlumatları gətirilərkən xəta:', error);
            throw error;
        }
    }

    /**
     * İşçiyə maaş təyin et
     */
    async assignSalaryToEmployee(employeeId, salaryData) {
        try {
            console.log(`💰 İşçiyə maaş təyin edilir - İşçi ID: ${employeeId}`, salaryData);

            const response = await this.api.post('/salaries/', {
                employee_id: employeeId,
                ...salaryData
            });

            if (response.success) {
                console.log('✅ Maaş uğurla təyin edildi');
                return response.data;
            } else {
                throw new Error(response.message || 'Maaş təyin edilərkən xəta baş verdi');
            }
        } catch (error) {
            console.error('❌ Maaş təyin edilərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Maaş məlumatlarını yenilə
     */
    async updateSalary(salaryId, salaryData) {
        try {
            const response = await this.api.put(`/salaries/${salaryId}`, salaryData);
            return response.success ? response.data : null;
        } catch (error) {
            console.error('❌ Maaş yenilənərkən xəta:', error);
            throw error;
        }
    }

    /**
     * İşçinin maaş tarixçəsini gətir
     */
    async getEmployeeSalaryHistory(employeeId) {
        try {
            const response = await this.api.get(`/salaries/employee/${employeeId}/history`);
            return response.success ? response.data : [];
        } catch (error) {
            console.error('❌ Maaş tarixçəsi gətirilərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Cari ay üçün bütün maaşları gətir
     */
    async getCurrentMonthSalaries(companyId) {
        try {
            const response = await this.api.get(`/salaries/company/${companyId}/current-month`);
            return response.success ? response.data : [];
        } catch (error) {
            console.error('❌ Cari ay maaşları gətirilərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Maaş ödənişini təsdiqlə
     */
    async confirmSalaryPayment(salaryId, paymentData = {}) {
        try {
            const response = await this.api.post(`/salaries/${salaryId}/confirm-payment`, paymentData);
            return response.success;
        } catch (error) {
            console.error('❌ Maaş ödənişi təsdiqlənərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Şirkət maaş statistikasını gətir
     */
    async getCompanySalaryStats(companyId) {
        try {
            const response = await this.api.get(`/salaries/company/${companyId}/stats`);
            return response.success ? response.data : null;
        } catch (error) {
            console.error('❌ Maaş statistikaları gətirilərkən xəta:', error);
            throw error;
        }
    }
}

window.SalaryService = SalaryService;