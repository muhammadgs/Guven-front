// worker_profile_js/file_service/file.service.extended.js

// ==================== FAYL PAYLAŞMA FUNKSİYALARI ====================

/**
 * Faylı istifadəçiyə göndər (share)
 */
FileService.prototype.shareFileWithUser = async function(fileUuid, targetUserUuid, permissionLevel = 'view', message = '') {
    try {
        console.log(`📤 Fayl göndərilir: ${fileUuid} -> istifadəçi: ${targetUserUuid}`);

        const token = localStorage.getItem('guven_token');
        if (!token) throw new Error('Token tapılmadı');

        const currentUserUuid = this.getCurrentUserUUID();

        const response = await fetch(`${this.baseUrl}/files/share/user`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                file_uuid: fileUuid,
                shared_with_user_uuid: targetUserUuid,
                permission_level: permissionLevel,
                message: message
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Fayl göndərildi:', result);

        if (window.filesUI?.showNotification) {
            window.filesUI.showNotification('Fayl istifadəçiyə göndərildi', 'success');
        }

        return result;
    } catch (error) {
        console.error('❌ Fayl göndərmə xətası:', error);
        throw error;
    }
};

/**
 * Faylı şirkətlə paylaş
 */
FileService.prototype.shareFileWithCompany = async function(fileUuid, permissionLevel = 'view') {
    try {
        console.log(`🏢 Fayl şirkətlə paylaşılır: ${fileUuid}`);

        const token = localStorage.getItem('guven_token');
        if (!token) throw new Error('Token tapılmadı');

        const companyCode = window.filesUI?.companyCode || 'AZE26003';

        const response = await fetch(`${this.baseUrl}/files/share/company`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                file_uuid: fileUuid,
                company_code: companyCode,
                permission_level: permissionLevel
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Fayl şirkətlə paylaşıldı:', result);

        if (window.filesUI?.showNotification) {
            window.filesUI.showNotification('Fayl şirkətlə paylaşıldı', 'success');
        }

        return result;
    } catch (error) {
        console.error('❌ Şirkətlə paylaşma xətası:', error);
        throw error;
    }
};

/**
 * Çoxlu faylı paylaş
 */
FileService.prototype.shareMultipleFiles = async function(fileUuids, targetType, targetId = null, permissionLevel = 'view', message = '') {
    try {
        console.log(`📤 ${fileUuids.length} fayl paylaşılır:`, { targetType, targetId });

        const results = {
            success: [],
            failed: []
        };

        for (const fileUuid of fileUuids) {
            try {
                if (targetType === 'user') {
                    await this.shareFileWithUser(fileUuid, targetId, permissionLevel, message);
                } else if (targetType === 'company') {
                    await this.shareFileWithCompany(fileUuid, permissionLevel);
                }
                results.success.push(fileUuid);
            } catch (error) {
                results.failed.push({ fileUuid, error: error.message });
            }
        }

        return results;
    } catch (error) {
        console.error('❌ Çoxlu paylaşma xətası:', error);
        throw error;
    }
};

// ==================== QOVLUQ İCAZƏ FUNKSİYALARI ====================

/**
 * Qovluq icazələrini əlavə et
 */
FileService.prototype.grantFolderPermission = async function(folderUuid, targetUserUuid, permissions) {
    try {
        console.log(`📁 Qovluq icazəsi verilir: ${folderUuid} -> istifadəçi: ${targetUserUuid}`);

        const token = localStorage.getItem('guven_token');
        if (!token) throw new Error('Token tapılmadı');

        const grantedByUserUuid = this.getCurrentUserUUID();

        const response = await fetch(`${this.baseUrl}/folders/${folderUuid}/permissions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                user_uuid: targetUserUuid,
                granted_by_user_uuid: grantedByUserUuid,
                permissions: permissions
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Qovluq icazəsi verildi:', result);

        return result;
    } catch (error) {
        console.error('❌ Qovluq icazəsi xətası:', error);
        throw error;
    }
};

/**
 * Qovluq icazələrini yoxla
 */
FileService.prototype.checkFolderPermission = async function(folderUuid) {
    try {
        console.log(`🔍 Qovluq icazələri yoxlanılır: ${folderUuid}`);

        const token = localStorage.getItem('guven_token');
        if (!token) throw new Error('Token tapılmadı');

        const userUuid = this.getCurrentUserUUID();

        const response = await fetch(`${this.baseUrl}/folders/${folderUuid}/permissions/check?user_uuid=${userUuid}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return { can_view: false, can_download: false, can_upload: false };
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('❌ İcazə yoxlama xətası:', error);
        return { can_view: false, can_download: false, can_upload: false };
    }
};

/**
 * Qovluğun bütün icazələrini getir
 */
FileService.prototype.getFolderPermissions = async function(folderUuid) {
    try {
        const token = localStorage.getItem('guven_token');
        if (!token) throw new Error('Token tapılmadı');

        const response = await fetch(`${this.baseUrl}/folders/${folderUuid}/permissions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return [];
        }

        const result = await response.json();
        return result.permissions || [];
    } catch (error) {
        console.error('❌ İcazələri getirmə xətası:', error);
        return [];
    }
};

/**
 * Qovluq icazəsini sil
 */
FileService.prototype.revokeFolderPermission = async function(folderUuid, userUuid) {
    try {
        const token = localStorage.getItem('guven_token');
        if (!token) throw new Error('Token tapılmadı');

        const response = await fetch(`${this.baseUrl}/folders/${folderUuid}/permissions/${userUuid}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ İcazə silindi:', result);
        return result;
    } catch (error) {
        console.error('❌ İcazə silmə xətası:', error);
        throw error;
    }
};

// ==================== FAYL MƏHDUDİYYƏT FUNKSİYALARI ====================

/**
 * Fayl məhdudiyyətləri tətbiq et
 */
FileService.prototype.setFileRestrictions = async function(fileUuid, restrictions) {
    try {
        console.log(`🚫 Fayl məhdudiyyətləri tətbiq edilir: ${fileUuid}`, restrictions);

        const token = localStorage.getItem('guven_token');
        if (!token) throw new Error('Token tapılmadı');

        const restrictedByUserUuid = this.getCurrentUserUUID();

        const response = await fetch(`${this.baseUrl}/files/${fileUuid}/restrictions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                restricted_by_user_uuid: restrictedByUserUuid,
                restrictions: restrictions
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Məhdudiyyətlər tətbiq edildi:', result);

        if (window.filesUI?.showNotification) {
            window.filesUI.showNotification('Məhdudiyyətlər tətbiq edildi', 'success');
        }

        return result;
    } catch (error) {
        console.error('❌ Məhdudiyyət tətbiq etmə xətası:', error);
        throw error;
    }
};

/**
 * Fayl məhdudiyyətlərini getir
 */
FileService.prototype.getFileRestrictions = async function(fileUuid) {
    try {
        const token = localStorage.getItem('guven_token');
        if (!token) throw new Error('Token tapılmadı');

        const response = await fetch(`${this.baseUrl}/files/${fileUuid}/restrictions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return [];
        }

        const result = await response.json();
        return result.restrictions || [];
    } catch (error) {
        console.error('❌ Məhdudiyyətləri getirmə xətası:', error);
        return [];
    }
};

/**
 * Məhdudiyyəti sil
 */
FileService.prototype.removeFileRestriction = async function(restrictionUuid) {
    try {
        const token = localStorage.getItem('guven_token');
        if (!token) throw new Error('Token tapılmadı');

        const response = await fetch(`${this.baseUrl}/files/restrictions/${restrictionUuid}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Məhdudiyyət silindi:', result);
        return result;
    } catch (error) {
        console.error('❌ Məhdudiyyət silmə xətası:', error);
        throw error;
    }
};

// ==================== İCAZƏ YOXLAMA FUNKSİYALARI ====================

/**
 * İstifadəçinin fayl üzərində əməliyyat edə biləcəyini yoxla
 */
FileService.prototype.canUserPerformAction = async function(fileUuid, action) {
    try {
        const token = localStorage.getItem('guven_token');
        if (!token) return false;

        const userUuid = this.getCurrentUserUUID();

        const response = await fetch(
            `${this.baseUrl}/files/${fileUuid}/can-perform?user_uuid=${userUuid}&action=${action}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) return false;

        const result = await response.json();
        return result.allowed || false;
    } catch (error) {
        console.error('❌ Əməliyyat yoxlama xətası:', error);
        return false;
    }
};

/**
 * İstifadəçinin fayl sahibi olub olmadığını yoxla
 */
FileService.prototype.isFileOwner = function(file) {
    try {
        const currentUserUuid = this.getCurrentUserUUID();
        return file.users_uuid === currentUserUuid ||
               file.uploaded_by_user_uuid === currentUserUuid ||
               file.owner_uuid === currentUserUuid;
    } catch {
        return false;
    }
};

/**
 * İstifadəçinin qovluq sahibi olub olmadığını yoxla
 */
FileService.prototype.isFolderOwner = function(folder) {
    try {
        const currentUserUuid = this.getCurrentUserUUID();
        return folder.users_uuid === currentUserUuid;
    } catch {
        return false;
    }
};

// ==================== PAYLAŞILAN FAYLLAR ====================

/**
 * Mənimlə paylaşılan faylları getir
 */
FileService.prototype.getSharedWithMe = async function() {
    try {
        const token = localStorage.getItem('guven_token');
        if (!token) throw new Error('Token tapılmadı');

        const userUuid = this.getCurrentUserUUID();

        const response = await fetch(`${this.baseUrl}/files/shared-with-me?user_uuid=${userUuid}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return { files: [], shares: [] };
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('❌ Paylaşılan faylları getirmə xətası:', error);
        return { files: [], shares: [] };
    }
};

/**
 * Mənim paylaşdığım faylları getir
 */
FileService.prototype.getSharedByMe = async function() {
    try {
        const token = localStorage.getItem('guven_token');
        if (!token) throw new Error('Token tapılmadı');

        const userUuid = this.getCurrentUserUUID();

        const response = await fetch(`${this.baseUrl}/files/shared-by-me?user_uuid=${userUuid}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return { files: [], shares: [] };
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('❌ Paylaşdığım faylları getirmə xətası:', error);
        return { files: [], shares: [] };
    }
};

// ==================== AUTO-INIT ====================

// Auto-initialize əlavə funksiyalar
console.log('✅ FileService extended functions loaded');