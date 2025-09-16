class UIHelpers {
    constructor(calculator) {
        this.calculator = calculator;
    }

    showError(message) {
        const errorElement = document.getElementById('error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            setTimeout(() => this.clearError(), 5000);
        } else {
            console.error(message);
        }
    }

    clearError() {
        const errorElement = document.getElementById('error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20%; left: 50%; transform: translate(-50%, -50%); z-index: 10001;
            background: #4ade80; color: white; padding: 12px 20px;
            border-radius: 6px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: fadeIn 0.3s ease;
        `;
        notification.textContent = message;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeIn 0.3s ease reverse';
            setTimeout(() => {
                notification.remove();
                style.remove();
            }, 300);
        }, 3000);
    }

    copyRow(button) {
        const row = button.closest('tr');
        const cells = row.querySelectorAll('td');
        const data = [];
        
        for (let i = 0; i < cells.length - 1; i++) {
            const cell = cells[i];
            const input = cell.querySelector('input');
            data.push(input ? input.value : cell.textContent.trim());
        }
        
        navigator.clipboard.writeText(data.join('\t')).then(() => {
            this.showNotification('Рядок скопійовано');
        });
    }

    copyTable() {
        const table = document.querySelector('.points-table');
        if (!table) return;
        
        let text = '';
        const rows = table.querySelectorAll('tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('th, td');
            const rowData = [];
            
            cells.forEach((cell, index) => {
                if (index < cells.length - 1) {
                    const input = cell.querySelector('input');
                    rowData.push(input ? input.value : cell.textContent.trim());
                }
            });
            
            text += rowData.join('\t') + '\n';
        });
        
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('Таблицю скопійовано');
        });
    }

    copyValue(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            const text = element.textContent.replace(/[^\d.,]/g, '');
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Значення скопійовано');
            });
        }
    }
}

window.UIHelpers = UIHelpers;