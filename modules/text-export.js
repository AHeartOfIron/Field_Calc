class TextExport {
    constructor(calculator) {
        this.calculator = calculator;
    }

    exportTXT(points, siteName) {
        let txt = `Таблиця даних для ділянки: ${siteName}\\n`;
        txt += '='.repeat(60) + '\\n\\n';
        
        const rows = document.querySelectorAll('.points-table tr');
        const headers = ['Від', 'До', 'Азимут (Магн.)', 'Азимут (Іст.)', 'Відстань (м)', 'UTM X', 'UTM Y'];
        
        txt += headers.map(h => h.padEnd(15)).join(' | ') + '\\n';
        txt += '-'.repeat(headers.length * 18) + '\\n';
        
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            const row = [];
            
            for (let j = 0; j < 7; j++) {
                const cell = cells[j];
                const input = cell?.querySelector('input');
                let value = input ? input.value : (cell?.textContent?.trim() || '');
                if (value === '-' || value === '') value = '';
                row.push(value.toString().padEnd(15));
            }
            
            txt += row.join(' | ') + '\\n';
        }
        
        const blob = new Blob([txt], {type: 'text/plain;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${siteName}.txt`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        this.calculator.showNotification('TXT експортовано');
    }
}

window.TextExport = TextExport;