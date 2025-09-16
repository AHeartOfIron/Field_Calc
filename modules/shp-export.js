class SHPExport {
    constructor(calculator) {
        this.calculator = calculator;
    }

    async exportSHP(points, siteName) {
        if (!window.shpwrite) {
            this.calculator.showError('❌ shp-write не завантажено');
            return;
        }

        if (!window.JSZip) {
            this.calculator.showError('❌ JSZip не завантажено');
            return;
        }

        this.calculator.showNotification('🗄️ Створюємо Shapefile архів...');

        try {
            const zip = new JSZip();
            
            // Створюємо точки
            const pointsGeoJSON = this.createPointsGeoJSON(points);
            const pointsShp = await shpwrite.zip(pointsGeoJSON);
            
            // Створюємо полігон
            const polygonGeoJSON = this.createPolygonGeoJSON(points, siteName);
            const polygonShp = await shpwrite.zip(polygonGeoJSON);
            
            // Додаємо файли точок до архіву
            for (const filename in pointsShp.files) {
                const fileData = await pointsShp.files[filename].async('arraybuffer');
                zip.file(`points_${filename}`, fileData);
            }
            
            // Додаємо файли полігону до архіву
            for (const filename in polygonShp.files) {
                const fileData = await polygonShp.files[filename].async('arraybuffer');
                zip.file(`polygon_${filename}`, fileData);
            }
            
            // Додаємо інструкцію
            zip.file('README.txt', this.getInstructions(siteName));
            
            // Створюємо архів з коментарем, датою/часом та DOS атрибутами
            const now = new Date();
            const content = await zip.generateAsync({
                type: 'blob',
                comment: `Shapefile export from FieldCalc\nSite: ${siteName}\nExported: ${now.toLocaleString('uk-UA')}\nUTC: ${now.toISOString()}\nCoordinate System: WGS84\nUTM Zone: ${this.getUTMZone()}N\n© 2025 Illia Usachov`,
                platform: 'DOS',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 },
                dosPermissions: 0o755
            });
            
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${siteName}_Shapefile.zip`;
            a.type = 'application/x-shapefile';
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            this.calculator.showNotification('✅ Shapefile архів створено!');
            
        } catch (error) {
            console.error('SHP Export error:', error);
            this.calculator.showError('❌ Помилка створення Shapefile: ' + error.message);
        }
    }

    createPointsGeoJSON(points) {
        const features = points.map(point => ({
            type: 'Feature',
            properties: {
                NAME: point.type,
                TYPE: point.type,
                UTM_X: Math.round(point.coords[0]),
                UTM_Y: Math.round(point.coords[1]),
                UTM_ZONE: this.getUTMZone() + 'N'
            },
            geometry: {
                type: 'Point',
                coordinates: this.calculator.currentProjection && window.proj4 ? 
                    proj4(this.calculator.currentProjection, 'EPSG:4326', point.coords) :
                    [point.coords[0], point.coords[1]]
            }
        }));

        return {
            type: 'FeatureCollection',
            features: features
        };
    }

    createPolygonGeoJSON(points, siteName) {
        const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
        
        if (polygonPoints.length < 3) {
            return { type: 'FeatureCollection', features: [] };
        }

        const sortedPoints = polygonPoints.sort((a, b) => {
            if (a.type === 'SP') return -1;
            if (b.type === 'SP') return 1;
            const aNum = parseInt(a.type.replace('TP', '')) || 0;
            const bNum = parseInt(b.type.replace('TP', '')) || 0;
            return aNum - bNum;
        });

        const coords = sortedPoints.map(p => 
            this.calculator.currentProjection && window.proj4 ? 
                proj4(this.calculator.currentProjection, 'EPSG:4326', p.coords) :
                [p.coords[0], p.coords[1]]
        );
        coords.push(coords[0]); // Замикаємо полігон

        return {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {
                    NAME: siteName,
                    AREA_HA: parseFloat(((this.calculator.currentArea || 0) / 10000).toFixed(4)),
                    PERIMETER_M: parseFloat(document.getElementById('perimeter')?.textContent?.replace(/[^\d.]/g, '') || '0'),
                    UTM_ZONE: this.getUTMZone() + 'N',
                    DATE: new Date().toISOString().split('T')[0]
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [coords]
                }
            }]
        };
    }

    getUTMZone() {
        const utmSelect = document.getElementById('utmZone');
        const value = utmSelect?.value;
        return value ? value.replace('utm', '') : '36';
    }

    getInstructions(siteName) {
        const now = new Date();
        return `📁 SHAPEFILE АРХІВ ДЛЯ ARCGIS/QGIS

🗂️ ФАЙЛИ В АРХІВІ:
• points_*.shp/dbf/shx/prj - всі точки (LM, BM, SP, TP)
• polygon_*.shp/dbf/shx/prj - полігон земельної ділянки
• README.txt - ця інструкція

📊 ДАНІ ПРОЕКТУ:
• Назва: ${siteName}
• Площа: ${((this.calculator.currentArea || 0) / 10000).toFixed(4)} га
• UTM зона: ${this.getUTMZone()}N
• Дата створення: ${now.toLocaleString('uk-UA')}
• UTC час: ${now.toISOString()}
• Координатна система: WGS84 (EPSG:4326)
• Архів створено: FieldCalc v3.0

🔧 ЗАВАНТАЖЕННЯ В ARCGIS PRO:
1. Розпакуйте архів
2. Відкрийте ArcGIS Pro
3. Map → Add Data → оберіть .shp файли
4. Координатна система визначиться автоматично
5. Перевірте атрибутивну таблицю

🔧 ЗАВАНТАЖЕННЯ В QGIS:
1. Розпакуйте архів
2. Відкрийте QGIS
3. Layer → Add Layer → Add Vector Layer
4. Оберіть .shp файли
5. Натисніть Add

🎯 АТРИБУТИ ТОЧОК:
• NAME - назва точки (SP, TP1, BM, LM)
• TYPE - тип точки
• UTM_X, UTM_Y - координати в UTM
• UTM_ZONE - зона UTM

🎯 АТРИБУТИ ПОЛІГОНУ:
• NAME - назва ділянки
• AREA_HA - площа в гектарах
• PERIMETER_M - периметр в метрах
• UTM_ZONE - зона UTM
• DATE - дата створення

⚙️ ТЕХНІЧНІ ДЕТАЛІ:
• Формат: ESRI Shapefile
• Кодування: UTF-8
• Архів: ZIP з DOS атрибутами
• MIME-тип: application/x-shapefile

💡 ПРИМІТКА:
Shapefile формат підтримується всіма ГІС системами
Координати в WGS84 для максимальної сумісності
Архів містить коментар з метаданими

© 2025 Illia Usachov - FieldCalc`;
    }
}

window.SHPExport = SHPExport;
console.log('✅ SHP Export модуль завантажено');