/**
 * Vəzifələrin idarə edilməsi üçün xidmət
 */
class PositionsService {
    constructor(apiService) {
        this.api = apiService;
    }

    /**
     * Bütün vəzifələri gətir
     */
    async getAllPositions(companyId) {
        try {
            console.log(`💼 Şirkət vəzifələri gətirilir - Şirkət ID: ${companyId}`);

            const response = await this.api.get(`/positions/company/${companyId}`);

            if (response.success) {
                console.log(`✅ ${response.data.length} vəzifə gətirildi`);
                return response.data;
            } else {
                throw new Error(response.message || 'Vəzifələr gətirilərkən xəta baş verdi');
            }
        } catch (error) {
            console.error('❌ Vəzifələr gətirilərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Şirkət kodu ilə vəzifələri gətir
     */
    async getPositionsByCompanyCode(companyCode) {
        try {
            const response = await this.api.get(`/positions/company-code/${companyCode}`);
            return response.success ? response.data : [];
        } catch (error) {
            console.error('❌ Vəzifələr gətirilərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Yeni vəzifə əlavə et
     */
    async addPosition(positionData) {
        try {
            console.log('➕ Yeni vəzifə əlavə edilir:', positionData);

            const response = await this.api.post('/positions/', positionData);

            if (response.success) {
                console.log('✅ Vəzifə uğurla əlavə edildi');
                return response.data;
            } else {
                throw new Error(response.message || 'Vəzifə əlavə edilərkən xəta baş verdi');
            }
        } catch (error) {
            console.error('❌ Vəzifə əlavə edilərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Vəzifə məlumatlarını yenilə
     */
    async updatePosition(positionId, positionData) {
        try {
            const response = await this.api.put(`/positions/${positionId}`, positionData);
            return response.success ? response.data : null;
        } catch (error) {
            console.error('❌ Vəzifə yenilənərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Vəzifə sil
     */
    async deletePosition(positionId) {
        try {
            const response = await this.api.delete(`/positions/${positionId}`);
            return response.success;
        } catch (error) {
            console.error('❌ Vəzifə silinərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Vəzifənin işçilərini gətir
     */
    async getPositionEmployees(positionId) {
        try {
            const response = await this.api.get(`/positions/${positionId}/employees`);
            return response.success ? response.data : [];
        } catch (error) {
            console.error('❌ Vəzifə işçiləri gətirilərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Vəzifə statistikasını gətir
     */
    async getPositionStats(positionId) {
        try {
            const response = await this.api.get(`/positions/${positionId}/stats`);
            return response.success ? response.data : null;
        } catch (error) {
            console.error('❌ Vəzifə statistikaları gətirilərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Vəzifə iyerarxiyasını gətir
     */
    async getPositionHierarchy(companyId) {
        try {
            const response = await this.api.get(`/positions/hierarchy/${companyId}`);
            return response.success ? response.data : null;
        } catch (error) {
            console.error('❌ Vəzifə iyerarxiyası gətirilərkən xəta:', error);
            throw error;
        }
    }
}

window.PositionsService = PositionsService;