class ExcelExport {
    constructor(calculator) {
        this.calculator = calculator;
    }

    exportCSV(points, siteName) {
        let csv = '"Від\\nFrom";"До\\nTo";"Азимут (Магнітний)\\nMagnetic bearing";"Азимут (Істинний)\\nTrue bearing";"Відстань (м)\\nDistance";"Long/UTM X";"Lat/UTM Y"\\n';
        
        const rows = document.querySelectorAll('.points-table tr');
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            const row = [];
            
            for (let j = 0; j < 7; j++) {
                const cell = cells[j];
                const input = cell?.querySelector('input');
                let value = input ? input.value : (cell?.textContent?.trim() || '');
                
                if (value === '-' || value === '') value = '';
                if (!isNaN(value) && value !== '') {
                    value = value.toString().replace('.', ',');
                }
                row.push(value);
            }
            csv += row.join(';') + '\\n';
        }
        
        const BOM = '\\uFEFF';
        const blob = new Blob([BOM + csv], {type: 'text/csv;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${siteName}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        this.calculator.showNotification('CSV експортовано (формат Excel)');
    }

    exportTSV(points, siteName) {
        let tsv = 'Від\\tДо\\tАзимут (Магнітний)\\tАзимут (Істинний)\\tВідстань (м)\\tLong/UTM X\\tLat/UTM Y\\n';
        
        const rows = document.querySelectorAll('.points-table tr');
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            const row = [];
            
            for (let j = 0; j < 7; j++) {
                const cell = cells[j];
                const input = cell?.querySelector('input');
                let value = input ? input.value : (cell?.textContent?.trim() || '');
                if (value === '-' || value === '') value = '';
                row.push(value);
            }
            
            tsv += row.join('\\t') + '\\n';
        }
        
        const blob = new Blob([tsv], {type: 'text/tab-separated-values;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${siteName}.tsv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        this.calculator.showNotification('TSV експортовано');
    }
}

window.ExcelExport = ExcelExport;