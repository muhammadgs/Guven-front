// alembic/task/validators.js - TAM VERSİYA
function validateTaskForm(formData) {
    const errors = [];

    if (!formData.company_id || formData.company_id.trim() === '') {
        errors.push('Şirkət seçilməyib');
    }

    if (!formData.executor_user_id || formData.executor_user_id.trim() === '') {
        errors.push('İcra edən seçilməyib');
    }

    if (!formData.department_id || formData.department_id.trim() === '') {
        errors.push('Şöbə seçilməyib');
    }

    if (!formData.task_type_id || formData.task_type_id.trim() === '') {
        errors.push('İş növü seçilməyib');
    }

    
    // Task başlığı validasiyası
    if (!formData.task_title || formData.task_title.trim() === '') {
        errors.push('İş başlığı yazılmayıb');
    } else if (formData.task_title.length > 200) {
        errors.push('İş başlığı 200 simvoldan uzun ola bilməz');
    }

    return errors;
}

// Əlavə validasiya funksiyaları
function validateTaskUpdate(formData) {
    const errors = [];

    if (formData.status && !['pending', 'in_progress', 'completed', 'cancelled'].includes(formData.status)) {
        errors.push('Yanlış status seçimi');
    }

    if (formData.priority && !['low', 'medium', 'high', 'critical'].includes(formData.priority)) {
        errors.push('Yanlış prioritet seçimi');
    }

    return errors;
}

function validateTaskFilter(formData) {
    const errors = [];

    // Tarix validasiyası
    if (formData.created_from && formData.created_to) {
        const fromDate = new Date(formData.created_from);
        const toDate = new Date(formData.created_to);

        if (fromDate > toDate) {
            errors.push('Başlanğıc tarixi bitmə tarixindən böyük ola bilməz');
        }
    }

    return errors;
}

// Eksport et (əgər modul sistemindən istifadə edirsinizsə)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateTaskForm,
        validateTaskUpdate,
        validateTaskFilter
    };
}