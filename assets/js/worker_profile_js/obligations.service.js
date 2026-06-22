/**
 * Öhdəliklərin idarə edilməsi üçün xidmət
 */
class ObligationsService {
    constructor(apiService) {
        this.api = apiService;
    }

    /**
     * Bütün öhdəlikləri gətir
     */
    async getAllObligations(companyId) {
        try {
            console.log(`📄 Şirkət öhdəlikləri gətirilir - Şirkət ID: ${companyId}`);

            const response = await this.api.get(`/obligations/company/${companyId}`);

            if (response.success) {
                console.log(`✅ ${response.data.length} öhdəlik gətirildi`);
                return response.data;
            } else {
                throw new Error(response.message || 'Öhdəliklər gətirilərkən xəta baş verdi');
            }
        } catch (error) {
            console.error('❌ Öhdəliklər gətirilərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Tək öhdəliyi gətir
     */
    async getObligationById(obligationId) {
        try {
            const response = await this.api.get(`/obligations/${obligationId}`);
            return response.success ? response.data : null;
        } catch (error) {
            console.error('❌ Öhdəlik gətirilərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Yeni öhdəlik əlavə et
     */
    async addObligation(obligationData) {
        try {
            console.log('➕ Yeni öhdəlik əlavə edilir:', obligationData);

            const response = await this.api.post('/obligations/', obligationData);

            if (response.success) {
                console.log('✅ Öhdəlik uğurla əlavə edildi');
                return response.data;
            } else {
                throw new Error(response.message || 'Öhdəlik əlavə edilərkən xəta baş verdi');
            }
        } catch (error) {
            console.error('❌ Öhdəlik əlavə edilərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Öhdəlik məlumatlarını yenilə
     */
    async updateObligation(obligationId, obligationData) {
        try {
            const response = await this.api.put(`/obligations/${obligationId}`, obligationData);
            return response.success ? response.data : null;
        } catch (error) {
            console.error('❌ Öhdəlik yenilənərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Öhdəlik sil
     */
    async deleteObligation(obligationId) {
        try {
            const response = await this.api.delete(`/obligations/${obligationId}`);
            return response.success;
        } catch (error) {
            console.error('❌ Öhdəlik silinərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Öhdəliyə müraciət et
     */
    async fulfillObligation(obligationId, fulfillmentData) {
        try {
            const response = await this.api.post(`/obligations/${obligationId}/fulfill`, fulfillmentData);
            return response.success;
        } catch (error) {
            console.error('❌ Öhdəliyə müraciət edilərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Öhdəlik statistikasını gətir
     */
    async getObligationStats(companyId) {
        try {
            const response = await this.api.get(`/obligations/${companyId}/stats`);
            return response.success ? response.data : null;
        } catch (error) {
            console.error('❌ Öhdəlik statistikaları gətirilərkən xəta:', error);
            throw error;
        }
    }
}

window.ObligationsService = ObligationsService;