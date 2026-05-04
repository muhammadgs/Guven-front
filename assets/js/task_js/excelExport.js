// excelExport.js - TAM FONKSİYONAL VERSİYA
console.log('📊 Excel Export Modulu yükləndi');

const ExcelExport = {
    // ==================== ARXİV EXPORT ====================
    exportArchiveToExcel: function(archiveData, options = {}) {
        try {
            console.log(`📊 Arşiv Excel export başladı: ${archiveData.length} qeyd`);
            
            if (typeof XLSX === 'undefined') {
                throw new Error('XLSX kitabxanası yüklənməyib');
            }

            if (!archiveData || archiveData.length === 0) {
                throw new Error('Arşiv verisi yoxdur');
            }

            // Excel verisini hazırla
            const excelData = this.prepareArchiveExcelData(archiveData);
            
            // Workbook yarat
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);
            
            // Sütun genişliklərini tənzimlə
            const colWidths = [
                { wch: 5 },   // №
                { wch: 10 },  // Arşiv ID
                { wch: 15 },  // Original Task ID
                { wch: 15 },  // Task Kodu
                { wch: 30 },  // Başlıq
                { wch: 40 },  // Açıqlama
                { wch: 20 },  // Şirkət
                { wch: 20 },  // Yaradan
                { wch: 20 },  // İcra Edən
                { wch: 15 },  // Status
                { wch: 20 },  // Arşiv Səbəbi
                { wch: 20 },  // Arxivləyən
                { wch: 20 },  // Yaradılma
                { wch: 15 },  // Son Tarix
                { wch: 20 },  // Tamamlanma
                { wch: 20 },  // Arxivlənmə
                { wch: 15 },  // Müddət
                { wch: 15 },  // Saatlıq
                { wch: 15 },  // Ümumi
                { wch: 30 }   // Qeydlər
            ];
            
            ws['!cols'] = colWidths;
            
            // Sayfa əlavə et
            XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Arşiv Verileri');
            
            // Fayl adını yarat
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const filename = options.filename || `task_archive_${date}.xlsx`;
            
            // Faylı yadda saxla
            XLSX.writeFile(wb, filename);
            
            console.log(`✅ Excel faylı yaradıldı: ${filename}`);
            return filename;
            
        } catch (error) {
            console.error('❌ Excel export xətası:', error);
            throw error;
        }
    },

    // ==================== TASK EXPORT ====================
    exportTasksToExcel: function(tasks, options = {}) {
        try {
            console.log(`📊 Task Excel export başladı: ${tasks.length} task`);
            
            if (typeof XLSX === 'undefined') {
                throw new Error('XLSX kitabxanası yüklənməyib');
            }

            if (!tasks || tasks.length === 0) {
                throw new Error('Task verisi yoxdur');
            }

            // Excel verisini hazırla
            const excelData = this.prepareTaskExcelData(tasks);
            
            // Workbook yarat
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);
            
            // Sütun genişliklərini tənzimlə
            const colWidths = [
                { wch: 5 },   // №
                { wch: 10 },  // Task ID
                { wch: 30 },  // Başlıq
                { wch: 40 },  // Açıqlama
                { wch: 20 },  // Şirkət
                { wch: 20 },  // Yaradan
                { wch: 20 },  // İcra Edən
                { wch: 15 },  // Status
                { wch: 20 },  // Yaradılma
                { wch: 15 },  // Son Tarix
                { wch: 20 },  // Tamamlanma
                { wch: 15 },  // Müddət
                { wch: 15 },  // Saatlıq
                { wch: 15 },  // Ümumi
                { wch: 30 }   // Qeydlər
            ];
            
            ws['!cols'] = colWidths;
            
            // Sayfa əlavə et
            XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Tasklar');
            
            // Fayl adını yarat
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const filename = options.filename || `tasks_${date}.xlsx`;
            
            // Faylı yadda saxla
            XLSX.writeFile(wb, filename);
            
            console.log(`✅ Excel faylı yaradıldı: ${filename}`);
            return filename;
            
        } catch (error) {
            console.error('❌ Task Excel export xətası:', error);
            throw error;
        }
    },

    // ==================== DATA PREPARATION ====================
    prepareArchiveExcelData: function(archiveData) {
        return archiveData.map((record, index) => {
            // Formatla tarixlər
            const formatDate = (dateString) => {
                if (!dateString) return '-';
                try {
                    const date = new Date(dateString);
                    return date.toLocaleDateString('az-AZ');
                } catch (e) {
                    return dateString;
                }
            };

            // Maaş hesabla
            const calculateSalary = () => {
                const hourlyRate = record.hourly_rate || record.billing_rate || 0;
                const durationMinutes = record.duration_minutes || 
                                      (record.estimated_hours ? record.estimated_hours * 60 : 0) || 0;
                
                if (!hourlyRate || !durationMinutes) return '0.00';
                const hours = durationMinutes / 60;
                const salary = hours * parseFloat(hourlyRate);
                return salary.toFixed(2);
            };

            return {
                '№': index + 1,
                'Arxiv ID': record.id || '-',
                'Original Task ID': record.original_task_id || '-',
                'Task Kodu': record.task_code || '-',
                'Başlıq': record.task_title || '-',
                'Açıqlama': record.task_description || '-',
                'Şirkət': record.company_name || '-',
                'Yaradan': record.created_by_name || '-',
                'İcra Edən': record.assigned_to_name || '-',
                'Status': this.getStatusText(record.status),
                'Arxiv Səbəbi': record.archive_reason || 'Tamamlandı',
                'Arxivləyən': record.archived_by_name || '-',
                'Yaradılma Tarixi': formatDate(record.created_at),
                'Son Tarix': formatDate(record.due_date),
                'Tamamlanma Tarixi': formatDate(record.completed_date),
                'Arxivlənmə Tarixi': formatDate(record.archived_at || record.created_at),
                'Müddət (dəq)': record.duration_minutes || (record.estimated_hours ? record.estimated_hours * 60 : 0) || 0,
                'Saatlıq Qiymət': parseFloat(record.hourly_rate || record.billing_rate || 0).toFixed(2) + ' ₼',
                'Ümumi Məbləğ': calculateSalary() + ' ₼',
                'Qeydlər': record.notes || '-'
            };
        });
    },

    prepareTaskExcelData: function(tasks) {
        return tasks.map((task, index) => {
            // Formatla tarixlər
            const formatDate = (dateString) => {
                if (!dateString) return '-';
                try {
                    const date = new Date(dateString);
                    return date.toLocaleDateString('az-AZ');
                } catch (e) {
                    return dateString;
                }
            };

            // Maaş hesabla
            const calculateSalary = () => {
                const hourlyRate = task.hourly_rate || task.billing_rate || 0;
                const durationMinutes = task.duration_minutes || 
                                      (task.estimated_hours ? task.estimated_hours * 60 : 0) || 0;
                
                if (!hourlyRate || !durationMinutes) return '0.00';
                const hours = durationMinutes / 60;
                const salary = hours * parseFloat(hourlyRate);
                return salary.toFixed(2);
            };

            return {
                '№': index + 1,
                'Task ID': task.id || '-',
                'Başlıq': task.task_title || task.title || '-',
                'Açıqlama': task.task_description || task.description || '-',
                'Şirkət': task.company_name || '-',
                'Yaradan': task.created_by_name || task.creator_name || '-',
                'İcra Edən': task.assigned_to_name || task.executor_name || '-',
                'Status': this.getStatusText(task.status),
                'Yaradılma Tarixi': formatDate(task.created_at),
                'Son Tarix': formatDate(task.due_date || task.due_at),
                'Tamamlanma Tarixi': formatDate(task.completed_date || task.completed_at),
                'Müddət (dəq)': task.duration_minutes || (task.estimated_hours ? task.estimated_hours * 60 : 0) || 0,
                'Saatlıq Qiymət': parseFloat(task.hourly_rate || task.billing_rate || 0).toFixed(2) + ' ₼',
                'Ümumi Məbləğ': calculateSalary() + ' ₼',
                'Qeydlər': task.notes || '-'
            };
        });
    },

    // ==================== HELPER FUNCTIONS ====================
    getStatusText: function(status) {
        const statusMap = {
            'pending': 'Gözləyir',
            'in_progress': 'İşlənir',
            'completed': 'Tamamlandı',
            'overdue': 'Vaxtı keçib',
            'cancelled': 'Ləğv edildi',
            'archived': 'Arxivləndi',
            'rejected': 'Rədd edildi'
        };
        return statusMap[status] || status;
    },

    // ==================== CSV EXPORT (FALLBACK) ====================
    exportToCSV: function(data, filename = 'export.csv') {
        try {
            console.log(`📊 CSV export başladı: ${data.length} qeyd`);
            
            if (!data || data.length === 0) {
                throw new Error('Export verisi yoxdur');
            }

            const csvContent = this.convertToCSV(data);
            this.downloadFile(csvContent, filename, 'text/csv');
            
            console.log(`✅ CSV faylı yaradıldı: ${filename}`);
            return filename;
            
        } catch (error) {
            console.error('❌ CSV export xətası:', error);
            throw error;
        }
    },

    convertToCSV: function(data) {
        if (!data || data.length === 0) return '';
        
        // Başlıqları götür
        const headers = Object.keys(data[0]);
        
        // CSV sətirləri
        const rows = data.map(row => {
            return headers.map(header => {
                let value = row[header] !== undefined ? row[header] : '';
                value = String(value);
                
                // Əgər vergül, dırnaq və ya yeni sətir varsa, escape et
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    },

    downloadFile: function(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }
};

// Global export
if (typeof window !== 'undefined') {
    window.ExcelExport = ExcelExport;
    console.log('✅ ExcelExport modulu global olaraq hazırdır');
}

// Test funksiyası
window.testExcelExport = function() {
    console.log('🧪 ExcelExport test edilir...');
    console.log('ExcelExport modulu:', typeof window.ExcelExport);
    console.log('Funksiyalar:', Object.keys(window.ExcelExport || {}));
    
    if (typeof XLSX !== 'undefined') {
        console.log('✅ XLSX kitabxanası yüklüdür');
    } else {
        console.error('❌ XLSX kitabxanası yüklü deyil');
    }
};