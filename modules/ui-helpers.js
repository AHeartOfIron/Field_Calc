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
        // Зсуваємо існуючі повідомлення вниз
        const existingNotifications = document.querySelectorAll('.notification-message');
        existingNotifications.forEach((notif, index) => {
            notif.style.top = `${20 + (index + 1) * 70}px`;
        });
        
        const notification = document.createElement('div');
        notification.className = 'notification-message';
        notification.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 10001;
            background: white; color: black; padding: 15px 25px;
            border: 3px solid #22c55e; border-radius: 8px; font-weight: 600; 
            box-shadow: 0 8px 25px rgba(34, 197, 94, 0.3);
            animation: slideDown 0.4s ease;
        `;
        notification.textContent = message;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideDown 0.3s ease reverse';
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