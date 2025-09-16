class KMLExport {
    constructor(calculator) {
        this.calculator = calculator;
    }

    exportKML(points, siteName) {
        if (!this.calculator.currentProjection) {
            this.calculator.showError('Оберіть систему координат');
            return;
        }
        
        if (points.length === 0) {
            this.calculator.showError('Немає точок для експорту');
            return;
        }
        
        try {
            const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
            
            let kml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            kml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n';
            kml += '<Document>\n';
            kml += `<name>${siteName}</name>\n`;
            
            // Стилі для точок
            kml += '<Style id="LMStyle">\n<IconStyle>\n<Icon>\n<href>http://maps.google.com/mapfiles/kml/shapes/triangle.png</href>\n</Icon>\n<color>ffffffff</color>\n<scale>1.0</scale>\n</IconStyle>\n</Style>\n';
            kml += '<Style id="BMStyle">\n<IconStyle>\n<Icon>\n<href>http://maps.google.com/mapfiles/kml/shapes/placemark_square.png</href>\n</Icon>\n<color>ffffffff</color>\n<scale>1.0</scale>\n</IconStyle>\n</Style>\n';
            kml += '<Style id="SPStyle">\n<IconStyle>\n<Icon>\n<href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>\n</Icon>\n<color>ffffffff</color>\n<scale>1.0</scale>\n</IconStyle>\n</Style>\n';
            kml += '<Style id="TPStyle">\n<IconStyle>\n<Icon>\n<href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>\n</Icon>\n<color>ffffffff</color>\n<scale>0.6</scale>\n</IconStyle>\n</Style>\n';
            
            // Стиль для полігону
            kml += '<Style id="polygonStyle">\n';
            kml += '<LineStyle>\n';
            kml += '<color>ff0000dc</color>\n';
            kml += '<width>2.0</width>\n';
            kml += '</LineStyle>\n';
            kml += '<PolyStyle>\n';
            kml += '<color>660000dc</color>\n'; // 40% прозорість
            kml += '<fill>1</fill>\n';
            kml += '<outline>1</outline>\n';
            kml += '</PolyStyle>\n';
            kml += '</Style>\n';
            
            // Додаємо точки з описами
            points.forEach(point => {
                const latLng = proj4(this.calculator.currentProjection, 'EPSG:4326', point.coords);
                kml += '<Placemark>\n';
                kml += `<name>${point.type}</name>\n`;
                
                let description = `<![CDATA[<b>Type:</b> ${point.type}<br>`;
                if (point.type === 'LM') description += '<b>Description:</b> Landmark - Орієнтир<br>';
                else if (point.type === 'BM') description += '<b>Description:</b> Benchmark - Базова точка<br>';
                else if (point.type === 'SP') description += '<b>Description:</b> Start Point - Початкова точка<br>';
                else description += '<b>Description:</b> Turning Point - Точка повороту<br>';
                description += `<b>UTM Coordinates:</b> ${Math.round(point.coords[0])}, ${Math.round(point.coords[1])}<br>`;
                description += `<b>Lat/Lng:</b> ${latLng[1].toFixed(6)}, ${latLng[0].toFixed(6)}]]>`;
                kml += `<description>${description}</description>\n`;
                
                if (point.type === 'LM') kml += '<styleUrl>#LMStyle</styleUrl>\n';
                else if (point.type === 'BM') kml += '<styleUrl>#BMStyle</styleUrl>\n';
                else if (point.type === 'SP') kml += '<styleUrl>#SPStyle</styleUrl>\n';
                else kml += '<styleUrl>#TPStyle</styleUrl>\n';
                
                kml += '<Point>\n';
                kml += `<coordinates>${latLng[0]},${latLng[1]},0</coordinates>\n`;
                kml += '</Point>\n';
                kml += '</Placemark>\n';
            });
            
            // Додаємо полігон
            if (polygonPoints.length >= 3) {
                kml += '<Placemark>\n';
                kml += '<name>Survey Polygon</name>\n';
                kml += '<styleUrl>#polygonStyle</styleUrl>\n';
                kml += '<Polygon>\n';
                kml += '<outerBoundaryIs>\n';
                kml += '<LinearRing>\n';
                kml += '<coordinates>\n';
                
                polygonPoints.forEach(point => {
                    const latLng = proj4(this.calculator.currentProjection, 'EPSG:4326', point.coords);
                    kml += `${latLng[0]},${latLng[1]},0 `;
                });
                
                const firstLatLng = proj4(this.calculator.currentProjection, 'EPSG:4326', polygonPoints[0].coords);
                kml += `${firstLatLng[0]},${firstLatLng[1]},0`;
                
                kml += '\n</coordinates>\n';
                kml += '</LinearRing>\n';
                kml += '</outerBoundaryIs>\n';
                kml += '</Polygon>\n';
                kml += '</Placemark>\n';
            }
            
            kml += '</Document>\n';
            kml += '</kml>';
            
            const blob = new Blob([kml], {type: 'application/vnd.google-earth.kml+xml'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${siteName}.kml`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            this.calculator.showNotification('KML файл експортовано');
            
        } catch (error) {
            this.calculator.showError('Помилка експорту KML: ' + error.message);
        }
    }
}

window.KMLExport = KMLExport;