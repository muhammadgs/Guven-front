// alembic/task/modalManager.js
const ModalManager = {
    modals: {},

    initializeModals: function() {
        const modalElements = document.querySelectorAll('.modal-backdrop');

        modalElements.forEach(function(modal) {
            const modalId = modal.id;
            this.modals[modalId] = modal;

            // Close on backdrop click
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    this.close(modalId);
                }
            }.bind(this));

            // Close buttons
            const closeBtn = modal.querySelector('.close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', function() {
                    this.close(modalId);
                }.bind(this));
            }
        }.bind(this));
    },

    open: function(modalId) {
        const modal = this.modals[modalId];
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            // Focus first input
            setTimeout(() => {
                const firstInput = modal.querySelector('input, select, textarea');
                if (firstInput) {
                    firstInput.focus();
                }
            }, 100);
        }
    },

    close: function(modalId) {
        const modal = this.modals[modalId];
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';

            // Clear forms if needed
            if (modalId === 'taskModal') {
                const form = document.getElementById('taskForm');
                if (form) {
                    form.reset();
                    delete form.dataset.editingTaskId;
                    document.getElementById('modalTitle').textContent = 'Yeni iş əlavə et';
                }
            } else if (modalId === 'serialRequestModal') {
                const form = document.getElementById('serialRequestForm');
                if (form) {
                    form.reset();
                }
            }
        }
    },



    showError: function(modalId, message) {
        const modal = this.modals[modalId];
        if (!modal) return;

        const errorDiv = modal.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';

            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    },

    showSuccess: function(modalId, message) {
        const modal = this.modals[modalId];
        if (!modal) return;

        const successDiv = modal.querySelector('.success-message');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';

            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 3000);
        }
    }
};

// Əlavə alias metodları
ModalManager.initModals = ModalManager.initializeModals;
ModalManager.init = ModalManager.initializeModals;
ModalManager.openModal = ModalManager.open;