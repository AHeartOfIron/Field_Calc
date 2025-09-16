class ArcGISExport {
    constructor(calculator) {
        this.calculator = calculator;
    }

    exportGeoJSON(points, siteName) {
        this.calculator.showNotification('📄 Створюємо GeoJSON...');
        
        try {
            const pointFeatures = points.map(point => ({
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
                        [point.coords[1], point.coords[0]] // lat, lng для GeoJSON
                }
            }));
            
            const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
            let polygonFeatures = [];
            
            if (polygonPoints.length >= 3) {
                const sortedPoints = polygonPoints.sort((a, b) => {
                    if (a.type === 'SP') return -1;
                    if (b.type === 'SP') return 1;
                    const aNum = parseInt(a.type.replace('TP', '')) || 0;
                    const bNum = parseInt(b.type.replace('TP', '')) || 0;
                    return aNum - bNum;
                });
                
                const coords = sortedPoints.map(p => 
                    this.calculator.currentProjection ? 
                        proj4(this.calculator.currentProjection, 'EPSG:4326', p.coords) :
                        [p.coords[0], p.coords[1]]
                );
                coords.push(coords[0]);
                
                polygonFeatures = [{
                    type: 'Feature',
                    properties: {
                        NAME: siteName,
                        AREA_HA: parseFloat(((this.calculator.currentArea || 0) / 10000).toFixed(4)),
                        PERIMETER_M: parseFloat(document.getElementById('perimeter')?.textContent?.replace(/[^\d.]/g, '') || '0'),
                        UTM_ZONE: this.getUTMZone() + 'N',
                        DATE: new Date().toISOString().split('T')[0]
                    },
                    geometry: { type: 'Polygon', coordinates: [coords] }
                }];
            }
            
            const pointsGeoJSON = {
                type: 'FeatureCollection',
                crs: { type: 'name', properties: { name: 'EPSG:4326' } },
                features: pointFeatures
            };
            
            const polygonGeoJSON = {
                type: 'FeatureCollection', 
                crs: { type: 'name', properties: { name: 'EPSG:4326' } },
                features: polygonFeatures
            };
            
            const combinedGeoJSON = {
                type: 'FeatureCollection',
                crs: { type: 'name', properties: { name: 'EPSG:4326' } },
                features: [...pointFeatures, ...polygonFeatures]
            };
            
            this.downloadGeoJSONZip(pointsGeoJSON, polygonGeoJSON, combinedGeoJSON, siteName);
            
        } catch (error) {
            console.error('GeoJSON Export error:', error);
            this.calculator.showError('❌ Помилка експорту GeoJSON: ' + error.message);
        }
    }
    
    async downloadGeoJSONZip(pointsGeoJSON, polygonGeoJSON, combinedGeoJSON, siteName) {
        if (!window.JSZip) {
            this.calculator.showError('❌ JSZip не завантажено');
            return;
        }
        
        const zip = new JSZip();
        const now = new Date();
        
        zip.file('points.json', JSON.stringify(pointsGeoJSON, null, 2));
        zip.file('polygon.json', JSON.stringify(polygonGeoJSON, null, 2));
        zip.file('combined.json', JSON.stringify(combinedGeoJSON, null, 2));
        zip.file('README.txt', this.getDetailedInstructions(siteName, this.getUTMZone()));
        
        const content = await zip.generateAsync({
            type: 'blob',
            comment: `ArcGIS export from FieldCalc\nSite: ${siteName}\nDate: ${now.toISOString()}\n© 2025 Illia Usachov`,
            platform: 'DOS',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
        
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${siteName}_ArcGIS.zip`;
        a.type = 'application/octet-stream';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        this.calculator.showNotification('✅ ArcGIS архів створено!');
    }
    
    exportGeoPackage(points, siteName) {
        this.calculator.showNotification('📦 Створюємо GeoPackage...');
        
        try {
            // Створюємо SQL для GeoPackage
            const gpkgSQL = this.generateGeoPackageSQL(points, siteName);
            
            const blob = new Blob([gpkgSQL], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${siteName}_create.sql`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            this.calculator.showNotification('✅ SQL для GeoPackage створено! Використайте QGIS для створення .gpkg');
            
        } catch (error) {
            console.error('GeoPackage Export error:', error);
            this.calculator.showError('❌ Помилка експорту GeoPackage: ' + error.message);
        }
    }
    
    generateGeoPackageSQL(points, siteName) {
        let sql = `-- SQL для створення GeoPackage в QGIS\n`;
        sql += `-- 1. Створіть нову базу даних GeoPackage\n`;
        sql += `-- 2. Виконайте цей SQL в Database Manager\n\n`;
        
        // Таблиця точок
        sql += `CREATE TABLE points (\n`;
        sql += `  id INTEGER PRIMARY KEY AUTOINCREMENT,\n`;
        sql += `  name TEXT,\n`;
        sql += `  type TEXT,\n`;
        sql += `  utm_x REAL,\n`;
        sql += `  utm_y REAL,\n`;
        sql += `  utm_zone TEXT,\n`;
        sql += `  geom GEOMETRY(POINT, 4326)\n`;
        sql += `);\n\n`;
        
        // Вставка точок
        points.forEach(point => {
            const latLng = this.calculator.currentProjection ? 
                proj4(this.calculator.currentProjection, 'EPSG:4326', point.coords) :
                [point.coords[0], point.coords[1]];
            
            sql += `INSERT INTO points (name, type, utm_x, utm_y, utm_zone, geom) VALUES (\n`;
            sql += `  '${point.type}', '${point.type}', ${Math.round(point.coords[0])}, ${Math.round(point.coords[1])}, '${this.getUTMZone()}N',\n`;
            sql += `  ST_GeomFromText('POINT(${latLng[0]} ${latLng[1]})', 4326)\n`;
            sql += `);\n`;
        });
        
        // Таблиця полігону
        const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
        if (polygonPoints.length >= 3) {
            sql += `\nCREATE TABLE polygon (\n`;
            sql += `  id INTEGER PRIMARY KEY AUTOINCREMENT,\n`;
            sql += `  name TEXT,\n`;
            sql += `  area_ha REAL,\n`;
            sql += `  perimeter_m REAL,\n`;
            sql += `  utm_zone TEXT,\n`;
            sql += `  date_created TEXT,\n`;
            sql += `  geom GEOMETRY(POLYGON, 4326)\n`;
            sql += `);\n\n`;
            
            const sortedPoints = polygonPoints.sort((a, b) => {
                if (a.type === 'SP') return -1;
                if (b.type === 'SP') return 1;
                const aNum = parseInt(a.type.replace('TP', '')) || 0;
                const bNum = parseInt(b.type.replace('TP', '')) || 0;
                return aNum - bNum;
            });
            
            const coords = sortedPoints.map(p => {
                const latLng = this.calculator.currentProjection ? 
                    proj4(this.calculator.currentProjection, 'EPSG:4326', p.coords) :
                    [p.coords[0], p.coords[1]];
                return `${latLng[0]} ${latLng[1]}`;
            }).join(', ');
            
            const firstCoord = sortedPoints[0];
            const firstLatLng = this.calculator.currentProjection ? 
                proj4(this.calculator.currentProjection, 'EPSG:4326', firstCoord.coords) :
                [firstCoord.coords[0], firstCoord.coords[1]];
            
            sql += `INSERT INTO polygon (name, area_ha, perimeter_m, utm_zone, date_created, geom) VALUES (\n`;
            sql += `  '${siteName}', ${((this.calculator.currentArea || 0) / 10000).toFixed(4)}, `;
            sql += `${parseFloat(document.getElementById('perimeter')?.textContent?.replace(/[^\d.]/g, '') || '0')}, `;
            sql += `'${this.getUTMZone()}N', '${new Date().toISOString().split('T')[0]}',\n`;
            sql += `  ST_GeomFromText('POLYGON((${coords}, ${firstLatLng[0]} ${firstLatLng[1]}))', 4326)\n`;
            sql += `);\n`;
        }
        
        return sql;
    }
    
    async exportSHPFromGeoJSON(points, siteName) {
        this.calculator.showNotification('🗄️ Конвертуємо GeoJSON у SHP...');
        
        try {
            // Створюємо GeoJSON дані
            const pointFeatures = points.map(point => ({
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
                        [point.coords[1], point.coords[0]]
                }
            }));
            
            const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
            let polygonFeatures = [];
            
            if (polygonPoints.length >= 3) {
                const sortedPoints = polygonPoints.sort((a, b) => {
                    if (a.type === 'SP') return -1;
                    if (b.type === 'SP') return 1;
                    const aNum = parseInt(a.type.replace('TP', '')) || 0;
                    const bNum = parseInt(b.type.replace('TP', '')) || 0;
                    return aNum - bNum;
                });
                
                const coords = sortedPoints.map(p => 
                    this.calculator.currentProjection ? 
                        proj4(this.calculator.currentProjection, 'EPSG:4326', p.coords) :
                        [p.coords[0], p.coords[1]]
                );
                coords.push(coords[0]);
                
                polygonFeatures = [{
                    type: 'Feature',
                    properties: {
                        NAME: siteName,
                        AREA_HA: parseFloat(((this.calculator.currentArea || 0) / 10000).toFixed(4)),
                        PERIMETER_M: parseFloat(document.getElementById('perimeter')?.textContent?.replace(/[^\d.]/g, '') || '0'),
                        UTM_ZONE: this.getUTMZone() + 'N',
                        DATE: new Date().toISOString().split('T')[0]
                    },
                    geometry: { type: 'Polygon', coordinates: [coords] }
                }];
            }
            
            // Використовуємо SHPExport модуль для створення SHP
            if (this.calculator.shpExport) {
                this.calculator.shpExport.exportSHP(points, siteName);
            } else {
                // Fallback - створюємо архів з GeoJSON
                this.downloadGeoJSONZip(
                    { type: 'FeatureCollection', features: pointFeatures },
                    { type: 'FeatureCollection', features: polygonFeatures },
                    { type: 'FeatureCollection', features: [...pointFeatures, ...polygonFeatures] },
                    siteName
                );
            }
            
        } catch (error) {
            console.error('SHP Export error:', error);
            this.calculator.showError('❌ Помилка експорту SHP: ' + error.message);
        }
    }
    
    getPRJContent(utmZone) {
        return `GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]`;
    }
    
    getArcGISStyle() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<FeatureLayer>
  <Renderer>
    <UniqueValueRenderer fieldName="TYPE">
      <Symbol name="LM" type="SimpleMarkerSymbol">
        <Color>220,38,38</Color>
        <Style>Triangle</Style>
        <Size>8</Size>
      </Symbol>
      <Symbol name="BM" type="SimpleMarkerSymbol">
        <Color>220,38,38</Color>
        <Style>Square</Style>
        <Size>6</Size>
      </Symbol>
      <Symbol name="SP" type="SimpleMarkerSymbol">
        <Color>220,38,38</Color>
        <Style>Circle</Style>
        <Size>8</Size>
      </Symbol>
      <Symbol name="TP" type="SimpleMarkerSymbol">
        <Color>220,38,38</Color>
        <Style>Circle</Style>
        <Size>6</Size>
      </Symbol>
    </UniqueValueRenderer>
  </Renderer>
</FeatureLayer>`;
    }
    
    getDetailedInstructions(siteName, utmZone) {
        return `📁 GEOJSON АРХІВ ДЛЯ ARCGIS/QGIS

🗂️ ФАЙЛИ В АРХІВІ:
• points.json - всі точки (LM, BM, SP, TP) - перейменуйте на .geojson
• polygon.json - полігон земельної ділянки - перейменуйте на .geojson
• combined.json - точки + полігон (комбінований) - перейменуйте на .geojson
• README.txt - ця інструкція

📊 ДАНІ ПРОЕКТУ:
• Назва: ${siteName}
• Площа: ${((this.calculator.currentArea || 0) / 10000).toFixed(4)} га
• UTM зона: ${utmZone}N
• Дата: ${new Date().toLocaleDateString('uk-UA')}
• Координатна система: WGS84 (EPSG:4326)

🔧 ЗАВАНТАЖЕННЯ В ARCGIS PRO:
1. Розпакуйте архів
2. Перейменуйте .json файли на .geojson
3. Відкрийте ArcGIS Pro
4. Map → Add Data → оберіть .geojson файли
4. Координатна система WGS84 визначиться автоматично
5. Точки та полігон з'являться на карті

🔧 ЗАВАНТАЖЕННЯ В QGIS:
1. Розпакуйте архів
2. Перейменуйте .json файли на .geojson
3. Відкрийте QGIS
4. Layer → Add Layer → Add Vector Layer
5. Оберіть .geojson файли
5. Натисніть Add

📐 ВИКОРИСТАННЯ ФАЙЛІВ:
• points.json → .geojson - для роботи з окремими точками
• polygon.json → .geojson - для аналізу площі та периметру
• combined.json → .geojson - для комплексного аналізу

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

💡 ПРИМІТКА:
GeoJSON формат підтримується всіма сучасними ГІС
Координати в WGS84 для максимальної сумісності
Полігон створений з правильним порядком точок (SP-TP1-TP2...-SP)`;
    }



    getUTMZone() {
        const utmSelect = document.getElementById('utmZone');
        const value = utmSelect?.value;
        return value ? value.replace('utm', '') : '36';
    }
    
    exportGeoJSONPoints(points, siteName) {
        this.calculator.showNotification('📄 Створюємо GeoJSON точки...');
        
        try {
            const pointFeatures = points.map(point => ({
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
                        [point.coords[1], point.coords[0]]
                }
            }));
            
            const pointsGeoJSON = {
                type: 'FeatureCollection',
                crs: { type: 'name', properties: { name: 'EPSG:4326' } },
                features: pointFeatures
            };
            
            this.downloadSingleGeoJSON(pointsGeoJSON, `${siteName}_points.geojson`);
            
        } catch (error) {
            console.error('GeoJSON Points Export error:', error);
            this.calculator.showError('❌ Помилка експорту GeoJSON точок: ' + error.message);
        }
    }
    
    exportGeoJSONPolygon(points, siteName) {
        this.calculator.showNotification('📄 Створюємо GeoJSON полігон...');
        
        try {
            const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
            let polygonFeatures = [];
            
            if (polygonPoints.length >= 3) {
                const sortedPoints = polygonPoints.sort((a, b) => {
                    if (a.type === 'SP') return -1;
                    if (b.type === 'SP') return 1;
                    const aNum = parseInt(a.type.replace('TP', '')) || 0;
                    const bNum = parseInt(b.type.replace('TP', '')) || 0;
                    return aNum - bNum;
                });
                
                const coords = sortedPoints.map(p => 
                    this.calculator.currentProjection ? 
                        proj4(this.calculator.currentProjection, 'EPSG:4326', p.coords) :
                        [p.coords[0], p.coords[1]]
                );
                coords.push(coords[0]);
                
                polygonFeatures = [{
                    type: 'Feature',
                    properties: {
                        NAME: siteName,
                        AREA_HA: parseFloat(((this.calculator.currentArea || 0) / 10000).toFixed(4)),
                        PERIMETER_M: parseFloat(document.getElementById('perimeter')?.textContent?.replace(/[^\d.]/g, '') || '0'),
                        UTM_ZONE: this.getUTMZone() + 'N',
                        DATE: new Date().toISOString().split('T')[0]
                    },
                    geometry: { type: 'Polygon', coordinates: [coords] }
                }];
            }
            
            const polygonGeoJSON = {
                type: 'FeatureCollection', 
                crs: { type: 'name', properties: { name: 'EPSG:4326' } },
                features: polygonFeatures
            };
            
            this.downloadSingleGeoJSON(polygonGeoJSON, `${siteName}_polygon.geojson`);
            
        } catch (error) {
            console.error('GeoJSON Polygon Export error:', error);
            this.calculator.showError('❌ Помилка експорту GeoJSON полігону: ' + error.message);
        }
    }
    
    async downloadSingleGeoJSON(geoJSON, filename) {
        const blob = new Blob([JSON.stringify(geoJSON, null, 2)], { 
            type: 'application/geo+json;charset=utf-8' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.type = 'application/octet-stream';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        this.calculator.showNotification('✅ GeoJSON файл створено!');
    }
    
    exportInstruction(siteName) {
        const instruction = `ІНСТРУКЦІЯ ДЛЯ ArcGIS PRO/QGIS

📁 GeoJSON ФОРМАТ (рекомендовано):
• Сучасний стандарт для ГІС
• Підтримується ArcGIS Pro, QGIS, Google Earth
• Містить точки та полігон з атрибутами

📦 GeoPackage SQL:
• Для створення .gpkg файлів в QGIS
• Виконайте SQL в Database Manager

🔧 ЗАВАНТАЖЕННЯ В ArcGIS PRO:
1. Відкрийте ArcGIS Pro
2. Map → Add Data → оберіть .geojson файли
3. Координатна система WGS84 визначиться автоматично
4. Точки та полігон з'являться на карті

🔧 ЗАВАНТАЖЕННЯ В QGIS:
1. Відкрийте QGIS
2. Layer → Add Layer → Add Vector Layer
3. Оберіть .geojson файли
4. Натисніть Add

📊 ПРОЕКТ: ${siteName}
📊 ПЛОЩА: ${((this.calculator.currentArea || 0) / 10000).toFixed(4)} га
📊 UTM ЗОНА: ${this.getUTMZone()}N
📊 ДАТА: ${new Date().toLocaleDateString('uk-UA')}

💡 ПОРАДИ:
• Перевірте координатну систему після завантаження
• Використовуйте combined.geojson для повного аналізу
• Полігон містить дані про площу та периметр`;
        
        const blob = new Blob([instruction], {type: 'text/plain;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${siteName}_ArcGIS_instruction.txt`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        this.calculator.showNotification('Інструкція експортована!');
    }
}

window.ArcGISExport = ArcGISExport;
console.log('✅ ArcGIS Export модуль завантажено');