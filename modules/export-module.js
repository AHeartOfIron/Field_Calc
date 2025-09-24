class ExportModule {
    constructor(calculator) {
        this.calculator = calculator;
    }

    exportCSV(points, siteName) {
        let csv = '"Від\nFrom";"До\nTo";"Азимут (Магнітний)\nMagnetic bearing";"Азимут (Істинний)\nTrue bearing";"Відстань (м)\nDistance";"Long/UTM X";"Lat/UTM Y"\n';
        
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
            csv += row.join(';') + '\n';
        }
        
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csv], {type: 'text/csv;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${siteName}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        this.calculator.showNotification('CSV експортовано');
    }

    exportKML(points, siteName) {
        if (!this.calculator.currentProjection) {
            this.calculator.showError('Оберіть систему координат');
            return;
        }
        
        const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
        
        let kml = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n';
        kml += `<name>${siteName}</name>\n`;
        
        points.forEach(point => {
            const latLng = proj4(this.calculator.currentProjection, 'EPSG:4326', point.coords);
            kml += `<Placemark><name>${point.type}</name><Point><coordinates>${latLng[0]},${latLng[1]},0</coordinates></Point></Placemark>\n`;
        });
        
        if (polygonPoints.length >= 3) {
            kml += '<Placemark><name>Полігон</name><Polygon><outerBoundaryIs><LinearRing><coordinates>\n';
            polygonPoints.forEach(point => {
                const latLng = proj4(this.calculator.currentProjection, 'EPSG:4326', point.coords);
                kml += `${latLng[0]},${latLng[1]},0 `;
            });
            const firstLatLng = proj4(this.calculator.currentProjection, 'EPSG:4326', polygonPoints[0].coords);
            kml += `${firstLatLng[0]},${firstLatLng[1]},0`;
            kml += '\n</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>\n';
        }
        
        kml += '</Document>\n</kml>';
        
        const blob = new Blob([kml], {type: 'application/vnd.google-earth.kml+xml'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${siteName}.kml`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        this.calculator.showNotification('KML експортовано');
    }

    createLocationMap(points, siteName, format) {
        if (!window.html2canvas) {
            this.calculator.showError('html2canvas не завантажено');
            return;
        }
        
        this.calculator.showNotification('Створюємо план...');
        
        const mapElement = document.getElementById('map');
        const controls = mapElement.querySelectorAll('.leaflet-control');
        controls.forEach(control => control.style.display = 'none');
        
        html2canvas(mapElement, {
            width: 800,
            height: 600,
            backgroundColor: 'white',
            useCORS: true,
            allowTaint: true,
            scale: 1
        }).then(canvas => {
            controls.forEach(control => control.style.display = '');
            
            if (format === 'PNG') {
                canvas.toBlob(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${siteName}_план.png`;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 100);
                    this.calculator.showNotification('PNG створено!');
                }, 'image/png');
            } else if (format === 'PDF') {
                if (!window.jspdf) {
                    this.calculator.showError('jsPDF не завантажено');
                    return;
                }
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');
                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
                pdf.save(`${siteName}_план.pdf`);
                this.calculator.showNotification('PDF створено!');
            }
        }).catch(error => {
            controls.forEach(control => control.style.display = '');
            this.calculator.showError('Помилка: ' + error.message);
        });
    }
}

window.ExportModule = ExportModule;