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
                        [point.coords[0], point.coords[1]]
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
                        NAME: 'Survey_Area',
                        AREA_HA: parseFloat(((this.calculator.currentArea || 0) / 10000).toFixed(4)),
                        PERIMETER_M: parseFloat(document.getElementById('perimeter')?.textContent?.replace(/[^\d.]/g, '') || '0'),
                        UTM_ZONE: this.getUTMZone() + 'N',
                        DATE: new Date().toISOString().split('T')[0]
                    },
                    geometry: { type: 'Polygon', coordinates: [coords] }
                }];
            }
            
            const metadata = {
                generator: 'FieldCalc v3.0 - Geodetic Survey Calculator',
                author: 'Illia Usachov',
                organization: 'The Halo Trust',
                created: new Date().toISOString(),
                purpose: 'Land survey data for GIS applications',
                coordinate_system: 'WGS84 Geographic (EPSG:4326)',
                utm_zone: this.getUTMZone() + 'N',
                site_name: 'Survey_Site',
                file_type: 'GeoJSON FeatureCollection',
                software_version: '3.0.0',
                license: 'Survey data for professional use only'
            };
            
            const pointsJSON = {
                type: 'FeatureCollection',
                name: siteName + '_survey_points',
                metadata: metadata,
                crs: { type: 'name', properties: { name: 'EPSG:4326' } },
                features: pointFeatures
            };
            
            const polygonJSON = {
                type: 'FeatureCollection',
                name: siteName + '_survey_polygon',
                metadata: metadata,
                crs: { type: 'name', properties: { name: 'EPSG:4326' } },
                features: polygonFeatures
            };
            
            const combinedJSON = {
                type: 'FeatureCollection',
                name: siteName + '_survey_complete',
                metadata: metadata,
                crs: { type: 'name', properties: { name: 'EPSG:4326' } },
                features: [...pointFeatures, ...polygonFeatures]
            };
            
            // Завантажуємо повний набір
            this.downloadSingleGeoJSON(combinedJSON, 'survey_complete_geodata.geojson');
            
        } catch (error) {
            console.error('GeoJSON Export error:', error);
            this.calculator.showError('❌ Помилка експорту GeoJSON: ' + error.message);
        }
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
            a.download = 'survey_geopackage_create.sql';
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
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
            
            const safeType = this.sanitizeSQL(point.type);
            sql += `INSERT INTO points (name, type, utm_x, utm_y, utm_zone, geom) VALUES (\n`;
            sql += `  '${safeType}', '${safeType}', ${Math.round(point.coords[0])}, ${Math.round(point.coords[1])}, '${this.getUTMZone()}N',\n`;
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
            sql += `  'Survey_Area', ${((this.calculator.currentArea || 0) / 10000).toFixed(4)}, `;
            sql += `${parseFloat(document.getElementById('perimeter')?.textContent?.replace(/[^\d.]/g, '') || '0')}, `;
            sql += `'${this.getUTMZone()}N', '${new Date().toISOString().split('T')[0]}',\n`;
            sql += `  ST_GeomFromText('POLYGON((${coords}, ${firstLatLng[0]} ${firstLatLng[1]}))', 4326)\n`;
            sql += `);\n`;
        }
        
        return sql;
    }
    

    
    getPRJContent(utmZone) {
        return this.getWGS84ProjectionString();
    }
    
    getWGS84ProjectionString() {
        const zone = this.getUTMZone();
        return `PROJCS["WGS_1984_UTM_Zone_${zone}N",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",${(parseInt(zone) - 1) * 6 - 177}],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]`;
    }
    
    sanitizeSQL(input) {
        return String(input || '').replace(/'/g, "''");
    }
    
    sanitizeHTML(input) {
        return String(input || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }
    
    transformCoordinates(coords) {
        return this.calculator.currentProjection && window.proj4 ? 
            proj4(this.calculator.currentProjection, 'EPSG:4326', coords) :
            [coords[0], coords[1]];
    }
    
    sortPolygonPoints(points) {
        return points.sort((a, b) => {
            if (a.type === 'SP') return -1;
            if (b.type === 'SP') return 1;
            const aNum = parseInt(a.type.replace('TP', '')) || 0;
            const bNum = parseInt(b.type.replace('TP', '')) || 0;
            return aNum - bNum;
        });
    }
    
    extractCoordinates(coords) {
        const xs = [];
        const ys = [];
        coords.forEach(c => {
            xs.push(c[0]);
            ys.push(c[1]);
        });
        return { xs, ys };
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
• geodata_markers.geojson - всі точки (LM, BM, SP, TP)
• geodata_area.geojson - полігон земельної ділянки
• geodata_full.geojson - точки + полігон (комбінований)
• README.txt - ця інструкція

📊 ДАНІ ПРОЕКТУ:
• Назва: ${this.sanitizeHTML(siteName)}
• Площа: ${((this.calculator.currentArea || 0) / 10000).toFixed(4)} га
• UTM зона: ${utmZone}N
• Дата: ${new Date().toLocaleDateString('uk-UA')}
• Координатна система: WGS84 (EPSG:4326)

🔧 ЗАВАНТАЖЕННЯ В ARCGIS PRO:
1. Розпакуйте архів
2. Відкрийте ArcGIS Pro
3. Map → Add Data → оберіть .geojson файли
4. Координатна система WGS84 визначиться автоматично
5. Точки та полігон з'являться на карті

🔧 ЗАВАНТАЖЕННЯ В QGIS:
1. Розпакуйте архів
2. Відкрийте QGIS
3. Layer → Add Layer → Add Vector Layer
4. Оберіть .geojson файли
5. Натисніть Add

📐 ВИКОРИСТАННЯ ФАЙЛІВ:
• geodata_markers.geojson - для роботи з окремими точками
• geodata_area.geojson - для аналізу площі та периметру
• geodata_full.geojson - для комплексного аналізу

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
            const pointFeatures = points.map(point => {
                const latLng = this.calculator.currentProjection && window.proj4 ? 
                    proj4(this.calculator.currentProjection, 'EPSG:4326', point.coords) : 
                    [point.coords[0], point.coords[1]];
                
                return {
                    type: 'Feature',
                    properties: {
                        NAME: point.type,
                        TYPE: point.type,
                        UTM_X: Math.round(point.coords[0]),
                        UTM_Y: Math.round(point.coords[1]),
                        LAT: latLng ? parseFloat(latLng[1].toFixed(6)) : null,
                        LON: latLng ? parseFloat(latLng[0].toFixed(6)) : null,
                        ZONE: this.getUTMZone() + 'N'
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: latLng || [point.coords[0], point.coords[1]]
                    }
                };
            });
            
            const pointsJSON = {
                type: 'FeatureCollection',
                crs: {
                    type: 'name',
                    properties: {
                        name: 'urn:ogc:def:crs:EPSG::4326'
                    }
                },
                features: pointFeatures
            };
            
            this.downloadSingleGeoJSON(pointsJSON, 'survey_points_geodata.geojson');
            
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
                        NAME: 'Survey_Area',
                        AREA_HA: parseFloat(((this.calculator.currentArea || 0) / 10000).toFixed(4)),
                        PERIMETER_M: parseFloat(document.getElementById('perimeter')?.textContent?.replace(/[^\d.]/g, '') || '0'),
                        UTM_ZONE: this.getUTMZone() + 'N',
                        DATE: new Date().toISOString().split('T')[0]
                    },
                    geometry: { type: 'Polygon', coordinates: [coords] }
                }];
            }
            
            const metadata = {
                generator: 'FieldCalc v3.0 - Geodetic Survey Calculator',
                author: 'Illia Usachov',
                created: new Date().toISOString(),
                purpose: 'Survey polygon data for GIS applications',
                coordinate_system: 'WGS84 Geographic (EPSG:4326)'
            };
            
            const polygonJSON = {
                type: 'FeatureCollection',
                name: 'Survey_Polygon',
                metadata: metadata,
                crs: { type: 'name', properties: { name: 'EPSG:4326' } },
                features: polygonFeatures
            };
            
            this.downloadSingleGeoJSON(polygonJSON, 'survey_area_geodata.geojson');
            
        } catch (error) {
            console.error('GeoJSON Polygon Export error:', error);
            this.calculator.showError('❌ Помилка експорту GeoJSON полігону: ' + error.message);
        }
    }
    
    async downloadSingleGeoJSON(geoJSONData, filename) {
        const blob = new Blob([JSON.stringify(geoJSONData, null, 2)], { 
            type: 'application/geo+json;charset=utf-8' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.type = 'application/octet-stream';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        this.calculator.showNotification('✅ GeoJSON файл створено!');
    }
    
    exportShapefile(points, siteName) {
        this.calculator.showNotification('📁 Створюємо Shapefile...');
        
        try {
            // Створюємо GeoJSON для конвертації
            const pointFeatures = points.map(point => {
                const latLng = this.calculator.currentProjection && window.proj4 ? 
                    proj4(this.calculator.currentProjection, 'EPSG:4326', point.coords) : 
                    [point.coords[0], point.coords[1]];
                
                return {
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
                        coordinates: latLng
                    }
                };
            });
            
            const geoJSON = {
                type: 'FeatureCollection',
                crs: {
                    type: 'name',
                    properties: {
                        name: 'urn:ogc:def:crs:EPSG::4326'
                    }
                },
                features: pointFeatures
            };
            
            // Залишаємо для сумісності
            this.calculator.showNotification('❌ Shapefile експорт відключено. Використовуйте окремі файли.');
            
        } catch (error) {
            console.error('Shapefile Export error:', error);
            this.calculator.showError('❌ Помилка експорту Shapefile: ' + error.message);
        }
    }
    
    exportSHP(points, siteName) {
        try {
            this.pointFeatures = this.createPointFeatures(points);
            console.log('Features prepared:', this.pointFeatures.length);
            
            // Перевіряємо валідність координат
            this.pointFeatures.forEach((f, i) => {
                const x = f.geometry.coordinates[0];
                const y = f.geometry.coordinates[1];
                if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
                    console.error(`Invalid coordinates at index ${i}:`, x, y);
                }
            });
            
            this.calculator.showNotification('✅ Готово до експорту! Натисніть кнопки по одній');
        } catch (error) {
            console.error('SHP prepare error:', error);
            this.calculator.showError('❌ Помилка підготовки: ' + error.message);
        }
    }
    
    exportSHPFile() {
        if (!this.pointFeatures) {
            this.calculator.showError('Немає даних для експорту');
            return;
        }
        this.downloadFile(this.createSHPContent(this.pointFeatures), 'SurveyPoints.shp', 'application/octet-stream');
        this.calculator.showNotification('✅ SHP файл створено!');
    }
    
    exportDBFFile() {
        if (!this.pointFeatures) {
            this.calculator.showError('Немає даних для експорту');
            return;
        }
        this.downloadFile(this.createDBFContent(this.pointFeatures), 'SurveyPoints.dbf', 'application/octet-stream');
        this.calculator.showNotification('✅ DBF файл створено! Помістіть в одну папку з SHP!');
    }
    
    exportSHXFile() {
        if (!this.pointFeatures) {
            this.calculator.showError('Немає даних для експорту');
            return;
        }
        this.downloadFile(this.createSHXContent(this.pointFeatures), 'SurveyPoints.shx', 'application/octet-stream');
        this.calculator.showNotification('✅ SHX файл створено! Помістіть в одну папку з SHP!');
    }
    
    exportPRJFile() {
        this.downloadFile(new TextEncoder().encode(this.getWGS84ProjectionString()), 'SurveyPoints.prj', 'text/plain');
        this.calculator.showNotification('✅ PRJ файл створено! Помістіть в одну папку з SHP!');
    }
    
    exportAllSHPFiles() {
        if (!this.pointFeatures) {
            this.calculator.showError('Немає даних для експорту');
            return;
        }
        
        const files = [
            {content: this.createSHPContent(this.pointFeatures), name: 'survey_points_geometry.shp', type: 'application/octet-stream'},
            {content: this.createDBFContent(this.pointFeatures), name: 'survey_points_attributes.dbf', type: 'application/octet-stream'},
            {content: this.createSHXContent(this.pointFeatures), name: 'survey_points_index.shx', type: 'application/octet-stream'},
            {content: this.getWGS84ProjectionString(), name: 'survey_points_projection.prj', type: 'text/plain'}
        ];
        
        let downloaded = 0;
        files.forEach(file => {
            if (this.downloadWithConfirm(file.content, file.name, file.type)) {
                downloaded++;
            }
        });
        
        this.calculator.showNotification(`✅ Завантажено ${downloaded} з ${files.length} файлів`);
    }
    
    async exportSHPPolygon(points, siteName) {
        const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
        if (polygonPoints.length < 3) {
            this.calculator.showError('Недостатньо точок для полігону');
            return;
        }
        
        try {
            const polygonFeature = this.createPolygonFeature(polygonPoints, siteName);
            
            this.calculator.showNotification('📁 Завантажую полігон 1/4...');
            this.downloadWithConfirm(this.createPolygonSHP([polygonFeature]), 'survey_area_geometry.shp', 'application/octet-stream');
            this.downloadWithConfirm(this.createPolygonDBF([polygonFeature]), 'survey_area_attributes.dbf', 'application/octet-stream');
            this.downloadWithConfirm(this.createPolygonSHX([polygonFeature]), 'survey_area_index.shx', 'application/octet-stream');
            this.downloadWithConfirm(this.getWGS84ProjectionString(), 'survey_area_projection.prj', 'text/plain');
            
            this.calculator.showNotification('✅ Полігон SHP створено!');
        } catch (error) {
            console.error('Polygon export error:', error);
            this.calculator.showError('❌ Помилка експорту полігону: ' + error.message);
        }
    }
    
    exportSHPStyle(siteName) {
        const stylxContent = this.createSTYLXStyle();
        this.downloadWithConfirm(stylxContent, 'SurveyPoints.stylx', 'application/octet-stream');
        this.calculator.showNotification('✅ STYLX файл для ArcGIS Pro створено!');
    }
    
    exportPRJ(siteName) {
        const prjContent = this.getWGS84ProjectionString();
        this.downloadWithConfirm(prjContent, 'survey_projection.prj', 'text/plain');
        this.calculator.showNotification('✅ PRJ файл створено!');
    }
    
    exportSHX(points, siteName) {
        const pointFeatures = this.createPointFeatures(points);
        const shxContent = this.createSHXContent(pointFeatures);
        this.downloadWithConfirm(shxContent, 'survey_index.shx', 'application/octet-stream');
        this.calculator.showNotification('✅ SHX файл створено!');
    }
    
    exportDBF(points, siteName) {
        const pointFeatures = this.createPointFeatures(points);
        const dbfContent = this.createDBFContent(pointFeatures);
        this.downloadWithConfirm(dbfContent, 'survey_attributes.dbf', 'application/octet-stream');
        this.calculator.showNotification('✅ DBF файл створено!');
    }
    
    createPointFeatures(points) {
        return points.map(point => {
            console.log(`Point ${point.type}: UTM(${point.coords[0]}, ${point.coords[1]})`);
            
            return {
                type: 'Feature',
                properties: {
                    NAME: point.type,
                    TYPE: point.type,
                    SYMBOL: this.getSymbolName(point.type),
                    SIZE: this.getSymbolSize(point.type),
                    COLOR: 'White_Black',
                    UTM_X: Math.round(point.coords[0]),
                    UTM_Y: Math.round(point.coords[1]),
                    UTM_ZONE: this.getUTMZone() + 'N'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [point.coords[0], point.coords[1]]
                }
            };
        });
    }
    
    getSymbolName(type) {
        const symbols = {
            'LM': 'Triangle 3',
            'BM': 'Square 4', 
            'SP': 'Circle 4',
            'TP1': 'Circle 4', 'TP2': 'Circle 4', 'TP3': 'Circle 4', 'TP4': 'Circle 4', 'TP5': 'Circle 4'
        };
        return symbols[type] || (type.startsWith('TP') ? 'Circle 4' : 'Circle 4');
    }
    
    getSymbolSize(type) {
        const sizes = {
            'LM': 12,
            'BM': 10,
            'SP': 14
        };
        return sizes[type] || (type.startsWith('TP') ? 7 : 8);
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    createShapefilePackage(features) {
        const baseName = 'SurveyPoints';
        
        return [
            {
                name: `${baseName}.shp`,
                content: this.createSHPContent(features),
                type: 'application/octet-stream'
            },
            {
                name: `${baseName}.dbf`,
                content: this.createDBFContent(features),
                type: 'application/octet-stream'
            },
            {
                name: `${baseName}.shx`,
                content: this.createSHXContent(features),
                type: 'application/octet-stream'
            },
            {
                name: `${baseName}.prj`,
                content: new TextEncoder().encode(this.getWGS84ProjectionString()),
                type: 'text/plain'
            }
        ];
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    
    downloadWithConfirm(content, filename, mimeType) {
        this.downloadFile(content, filename, mimeType);
        return true;
    }
    
    createPolygonFeature(points, siteName) {
        const sortedPoints = points.sort((a, b) => {
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
            type: 'Feature',
            properties: {
                NAME: 'Survey_Area',
                AREA_HA: parseFloat(((this.calculator.currentArea || 0) / 10000).toFixed(4))
            },
            geometry: {
                type: 'Polygon',
                coordinates: [coords]
            }
        };
    }
    
    createPolygonSHP(features) {
        const coords = features[0].geometry.coordinates[0];
        const headerSize = 100;
        const recordHeaderSize = 8;
        const polygonDataSize = 4 + 32 + 4 + 4 + 4; // shape type + bbox + parts count + points count + part index
        const maxPoints = Math.max(100, coords.length + 10); // Мінімум 100 точок або +10 до поточної кількості
        const pointsSize = maxPoints * 16;
        const totalRecordSize = recordHeaderSize + polygonDataSize + pointsSize;
        const totalSize = headerSize + totalRecordSize;
        
        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);
        
        // SHP Header
        view.setInt32(0, 9994, false);
        view.setInt32(24, totalSize / 2, false);
        view.setInt32(28, 1000, true);
        view.setInt32(32, 5, true); // Shape type: Polygon
        
        // Record
        let offset = headerSize;
        view.setInt32(offset, 1, false); // Record number
        view.setInt32(offset + 4, (totalRecordSize - recordHeaderSize) / 2, false); // Content length
        view.setInt32(offset + 8, 5, true); // Shape type: Polygon
        
        // Bounding box
        const xs = coords.map(c => c[0]);
        const ys = coords.map(c => c[1]);
        view.setFloat64(offset + 12, Math.min(...xs), true);
        view.setFloat64(offset + 20, Math.min(...ys), true);
        view.setFloat64(offset + 28, Math.max(...xs), true);
        view.setFloat64(offset + 36, Math.max(...ys), true);
        
        view.setInt32(offset + 44, 1, true); // Number of parts
        view.setInt32(offset + 48, coords.length, true); // Number of points
        view.setInt32(offset + 52, 0, true); // Part start index
        
        // Points
        offset += 56;
        coords.forEach((coord, i) => {
            if (offset + 16 <= totalSize) {
                view.setFloat64(offset, coord[0], true);
                view.setFloat64(offset + 8, coord[1], true);
                offset += 16;
            } else {
                console.error(`Skipping point ${i} - buffer overflow`);
            }
        });
        
        return buffer;
    }
    
    createPolygonDBF(features) {
        const headerLength = 65; // 32 + 32 + 1
        const recordLength = 21; // 1 + 10 + 10
        const buffer = new ArrayBuffer(headerLength + recordLength);
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);
        
        // DBF Header
        view.setUint8(0, 3);
        view.setUint32(4, 1, true);
        view.setUint16(8, headerLength, true);
        view.setUint16(10, recordLength, true);
        
        // NAME field
        let offset = 32;
        'NAME      '.split('').forEach((c, i) => bytes[offset + i] = c.charCodeAt(0));
        bytes[offset + 11] = 67; // 'C'
        view.setUint8(offset + 16, 10);
        
        // AREA_HA field
        offset += 32;
        'AREA_HA   '.split('').forEach((c, i) => bytes[offset + i] = c.charCodeAt(0));
        bytes[offset + 11] = 78; // 'N'
        view.setUint8(offset + 16, 10);
        view.setUint8(offset + 17, 4);
        
        bytes[headerLength - 1] = 0x0D;
        
        // Record
        offset = headerLength;
        bytes[offset] = 32;
        if (!features || features.length === 0) return new ArrayBuffer(0);
        const name = 'SURVEY_ARE'.padEnd(10).substring(0, 10);
        const area = (features[0].properties?.AREA_HA || 0).toFixed(4).padStart(10);
        name.split('').forEach((c, i) => bytes[offset + 1 + i] = c.charCodeAt(0));
        area.split('').forEach((c, i) => bytes[offset + 11 + i] = c.charCodeAt(0));
        
        return buffer;
    }
    
    createPolygonSHX(features) {
        const coords = features[0].geometry.coordinates[0];
        const recordSize = 8 + 44 + coords.length * 16;
        
        const buffer = new ArrayBuffer(108);
        const view = new DataView(buffer);
        
        view.setInt32(0, 9994, false);
        view.setInt32(24, 54, false);
        view.setInt32(28, 1000, true);
        view.setInt32(32, 5, true);
        
        view.setInt32(100, 50, false); // Offset in 16-bit words
        view.setInt32(104, (recordSize - 8) / 2, false); // Content length in 16-bit words
        
        return buffer;
    }
    
    createSTYLXStyle() {
        // STYLX - це ZIP архів з XML файлами
        const styleXML = `<?xml version="1.0" encoding="UTF-8"?>
<CIMStyleFile xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns="http://www.esri.com/schemas/ArcGIS/2.9.0/ArcGIS.exe">
  <CIMVersion>2.9.0</CIMVersion>
  <StyleItems>
    <CIMStyleItem>
      <Name>SP_Symbol</Name>
      <Category>Survey Points</Category>
      <Key>SP</Key>
      <ItemType>Symbol</ItemType>
      <Item xsi:type="CIMPointSymbol">
        <SymbolLayers>
          <CIMCharacterMarker>
            <Enable>true</Enable>
            <Size>14</Size>
            <CharacterIndex>34</CharacterIndex>
            <FontFamilyName>ESRI Default Marker</FontFamilyName>
            <Symbol>
              <CIMPolygonSymbol>
                <SymbolLayers>
                  <CIMSolidStroke>
                    <Enable>true</Enable>
                    <Width>2</Width>
                    <Color>
                      <Values>0 0 0 255</Values>
                    </Color>
                  </CIMSolidStroke>
                  <CIMSolidFill>
                    <Enable>true</Enable>
                    <Color>
                      <Values>220 38 38 255</Values>
                    </Color>
                  </CIMSolidFill>
                </SymbolLayers>
              </CIMPolygonSymbol>
            </Symbol>
          </CIMCharacterMarker>
        </SymbolLayers>
      </Item>
    </CIMStyleItem>
    <CIMStyleItem>
      <Name>TP_Symbol</Name>
      <Category>Survey Points</Category>
      <Key>TP</Key>
      <ItemType>Symbol</ItemType>
      <Item xsi:type="CIMPointSymbol">
        <SymbolLayers>
          <CIMCharacterMarker>
            <Enable>true</Enable>
            <Size>8</Size>
            <CharacterIndex>34</CharacterIndex>
            <FontFamilyName>ESRI Default Marker</FontFamilyName>
            <Symbol>
              <CIMPolygonSymbol>
                <SymbolLayers>
                  <CIMSolidStroke>
                    <Enable>true</Enable>
                    <Width>2</Width>
                    <Color>
                      <Values>0 0 0 255</Values>
                    </Color>
                  </CIMSolidStroke>
                  <CIMSolidFill>
                    <Enable>true</Enable>
                    <Color>
                      <Values>220 38 38 255</Values>
                    </Color>
                  </CIMSolidFill>
                </SymbolLayers>
              </CIMPolygonSymbol>
            </Symbol>
          </CIMCharacterMarker>
        </SymbolLayers>
      </Item>
    </CIMStyleItem>
    <CIMStyleItem>
      <Name>BM_Symbol</Name>
      <Category>Survey Points</Category>
      <Key>BM</Key>
      <ItemType>Symbol</ItemType>
      <Item xsi:type="CIMPointSymbol">
        <SymbolLayers>
          <CIMCharacterMarker>
            <Enable>true</Enable>
            <Size>10</Size>
            <CharacterIndex>35</CharacterIndex>
            <FontFamilyName>ESRI Default Marker</FontFamilyName>
            <Symbol>
              <CIMPolygonSymbol>
                <SymbolLayers>
                  <CIMSolidStroke>
                    <Enable>true</Enable>
                    <Width>2</Width>
                    <Color>
                      <Values>0 0 0 255</Values>
                    </Color>
                  </CIMSolidStroke>
                  <CIMSolidFill>
                    <Enable>true</Enable>
                    <Color>
                      <Values>220 38 38 255</Values>
                    </Color>
                  </CIMSolidFill>
                </SymbolLayers>
              </CIMPolygonSymbol>
            </Symbol>
          </CIMCharacterMarker>
        </SymbolLayers>
      </Item>
    </CIMStyleItem>
    <CIMStyleItem>
      <Name>LM_Symbol</Name>
      <Category>Survey Points</Category>
      <Key>LM</Key>
      <ItemType>Symbol</ItemType>
      <Item xsi:type="CIMPointSymbol">
        <SymbolLayers>
          <CIMCharacterMarker>
            <Enable>true</Enable>
            <Size>12</Size>
            <CharacterIndex>33</CharacterIndex>
            <FontFamilyName>ESRI Default Marker</FontFamilyName>
            <Symbol>
              <CIMPolygonSymbol>
                <SymbolLayers>
                  <CIMSolidStroke>
                    <Enable>true</Enable>
                    <Width>2</Width>
                    <Color>
                      <Values>0 0 0 255</Values>
                    </Color>
                  </CIMSolidStroke>
                  <CIMSolidFill>
                    <Enable>true</Enable>
                    <Color>
                      <Values>220 38 38 255</Values>
                    </Color>
                  </CIMSolidFill>
                </SymbolLayers>
              </CIMPolygonSymbol>
            </Symbol>
          </CIMCharacterMarker>
        </SymbolLayers>
      </Item>
    </CIMStyleItem>
  </StyleItems>
</CIMStyleFile>`;
        
        // Створюємо простий XML як STYLX (ArcGIS Pro розпізнає)
        return new TextEncoder().encode(styleXML);
    }
    
    createLYRXStyle() {
        return JSON.stringify({
            "type": "CIMLayerDocument",
            "version": "2.9.0",
            "build": 32739,
            "layers": [{
                "type": "CIMFeatureLayer",
                "name": "Survey Points",
                "uRI": "CIMPATH=survey_points.xml",
                "sourceModifiedTime": {
                    "type": "TimeInstant"
                },
                "useSourceMetadata": true,
                "description": "Survey points from FieldCalc",
                "layerElevation": {
                    "type": "CIMLayerElevationSurface",
                    "mapElevationID": "{B5DCAF65-4C8C-4B8B-9C6F-5F3E6F4A8B2D}"
                },
                "expanded": true,
                "layerType": "Operational",
                "showLegends": true,
                "visibility": true,
                "displayCacheType": "Permanent",
                "maxDisplayCacheAge": 5,
                "showPopups": true,
                "serviceLayerID": -1,
                "refreshRate": -1,
                "refreshRateUnit": "esriTimeUnitsSeconds",
                "blendingMode": "Alpha",
                "allowDrapingOnIntegratedMesh": true,
                "autoGenerateFeatureTemplates": true,
                "featureTable": {
                    "type": "CIMFeatureTable",
                    "displayField": "NAME",
                    "editable": true,
                    "dataConnection": {
                        "type": "CIMStandardDataConnection",
                        "workspaceConnectionString": "DATABASE=.\\survey_points_geometry.shp",
                        "workspaceFactory": "Shapefile",
                        "dataset": "survey_points_geometry",
                        "datasetType": "esriDTFeatureClass"
                    },
                    "studyAreaSpatialRel": "esriSpatialRelUndefined",
                    "searchOrder": "esriSearchOrderSpatial"
                },
                "htmlPopupEnabled": true,
                "selectable": true,
                "featureCacheSelectionColor": {
                    "type": "CIMRGBColor",
                    "values": [0, 255, 255, 100]
                },
                "labelClasses": [{
                    "type": "CIMLabelClass",
                    "expression": "[NAME]",
                    "expressionEngine": "VBScript",
                    "featuresToLabel": "AllVisibleFeatures",
                    "maplexLabelPlacementProperties": {
                        "type": "CIMMaplexLabelPlacementProperties",
                        "featureType": "Point",
                        "avoidPolygonHoles": true,
                        "canOverrunFeature": true,
                        "canPlaceLabelOutsidePolygon": true,
                        "canRemoveOverlappingLabel": true,
                        "canStackLabel": true,
                        "connectionType": "Unambiguous",
                        "constrainOffset": "NoConstraint",
                        "contourAlignmentType": "Page",
                        "contourLadderType": "Straight",
                        "contourMaximumAngle": 90,
                        "enableConnection": true,
                        "featureWeight": 0,
                        "fontHeightReductionLimit": 4,
                        "fontHeightReductionStep": 0.5,
                        "fontWidthReductionLimit": 90,
                        "fontWidthReductionStep": 5,
                        "graticuleAlignmentType": "Straight",
                        "keyNumberGroupName": "Default",
                        "labelBuffer": 15,
                        "labelLargestPolygon": true,
                        "labelPriority": -1,
                        "labelStackingProperties": {
                            "type": "CIMMaplexLabelStackingProperties",
                            "stackAlignment": "ChooseBest",
                            "maximumNumberOfLines": 3,
                            "minimumNumberOfCharsPerLine": 3,
                            "maximumNumberOfCharsPerLine": 24,
                            "separators": [{
                                "type": "CIMMaplexStackingSeparator",
                                "separator": " ",
                                "splitAfter": true
                            }]
                        },
                        "lineFeatureType": "General",
                        "linePlacementMethod": "OffsetCurvedFromLine",
                        "maximumLabelOverrun": 80,
                        "maximumLabelOverrunUnit": "Point",
                        "minimumFeatureSizeUnit": "Map",
                        "multiPartOption": "OneLabelPerPart",
                        "offsetAlongLineProperties": {
                            "type": "CIMMaplexOffsetAlongLineProperties",
                            "placementMethod": "BestPositionAlongLine",
                            "labelAnchorPoint": "CenterOfLabel",
                            "distanceUnit": "Percentage",
                            "useLineDirection": true
                        },
                        "pointExternalZonePriorities": {
                            "type": "CIMMaplexExternalZonePriorities",
                            "aboveLeft": 4,
                            "aboveCenter": 2,
                            "aboveRight": 1,
                            "centerRight": 3,
                            "belowRight": 5,
                            "belowCenter": 7,
                            "belowLeft": 8,
                            "centerLeft": 6
                        },
                        "pointPlacementMethod": "AroundPoint",
                        "polygonAnchorPointType": "GeometricCenter",
                        "polygonBoundaryWeight": 0,
                        "polygonExternalZones": {
                            "type": "CIMMaplexExternalZonePriorities",
                            "aboveLeft": 4,
                            "aboveCenter": 2,
                            "aboveRight": 1,
                            "centerRight": 3,
                            "belowRight": 5,
                            "belowCenter": 7,
                            "belowLeft": 8,
                            "centerLeft": 6
                        },
                        "polygonFeatureType": "General",
                        "polygonInternalZones": {
                            "type": "CIMMaplexInternalZonePriorities",
                            "center": 1
                        },
                        "polygonPlacementMethod": "HorizontalInPolygon",
                        "primaryOffset": 1,
                        "primaryOffsetUnit": "Point",
                        "removeExtraWhiteSpace": true,
                        "repetitionIntervalUnit": "Map",
                        "rotationProperties": {
                            "type": "CIMMaplexRotationProperties",
                            "rotationType": "Arithmetic",
                            "alignmentType": "Straight"
                        },
                        "secondaryOffset": 100,
                        "strategyPriorities": {
                            "type": "CIMMaplexStrategyPriorities",
                            "stacking": 1,
                            "overrun": 2,
                            "fontCompression": 3,
                            "fontReduction": 4,
                            "abbreviation": 5
                        },
                        "thinningDistanceUnit": "Point",
                        "truncationMarkerCharacter": ".",
                        "truncationMinimumLength": 1,
                        "truncationPreferredCharacters": "aeiou"
                    },
                    "name": "Class 1",
                    "priority": -1,
                    "standardLabelPlacementProperties": {
                        "type": "CIMStandardLabelPlacementProperties",
                        "featureType": "Line",
                        "featureWeight": "Low",
                        "labelWeight": "High",
                        "numLabelsOption": "OneLabelPerName",
                        "lineLabelPosition": {
                            "type": "CIMStandardLineLabelPosition",
                            "above": true,
                            "inLine": true,
                            "parallel": true
                        },
                        "lineLabelPriorities": {
                            "type": "CIMStandardLineLabelPriorities",
                            "aboveStart": 3,
                            "aboveAlong": 3,
                            "aboveEnd": 3,
                            "centerStart": 3,
                            "centerAlong": 4,
                            "centerEnd": 3,
                            "belowStart": 3,
                            "belowAlong": 3,
                            "belowEnd": 3
                        },
                        "pointPlacementMethod": "AroundPoint",
                        "pointPlacementPriorities": {
                            "type": "CIMStandardPointPlacementPriorities",
                            "aboveLeft": 2,
                            "aboveCenter": 1,
                            "aboveRight": 2,
                            "centerLeft": 3,
                            "centerRight": 2,
                            "belowLeft": 3,
                            "belowCenter": 4,
                            "belowRight": 3
                        },
                        "rotationType": "Arithmetic",
                        "polygonPlacementMethod": "AlwaysHorizontal"
                    },
                    "textSymbol": {
                        "type": "CIMTextSymbol",
                        "blockProgression": "TTB",
                        "depth3D": 1,
                        "extrapolateBaselines": true,
                        "fontEffects": "Normal",
                        "fontEncoding": "Unicode",
                        "fontFamilyName": "Arial",
                        "fontStyleName": "Bold",
                        "fontType": "Unspecified",
                        "haloSize": 1,
                        "height": 10,
                        "hinting": "Default",
                        "horizontalAlignment": "Left",
                        "kerning": true,
                        "letterWidth": 100,
                        "ligatures": true,
                        "lineGapType": "ExtraLeading",
                        "symbol": {
                            "type": "CIMPolygonSymbol",
                            "symbolLayers": [{
                                "type": "CIMSolidFill",
                                "enable": true,
                                "color": {
                                    "type": "CIMRGBColor",
                                    "values": [0, 0, 0, 100]
                                }
                            }]
                        },
                        "textCase": "Normal",
                        "textDirection": "LTR",
                        "verticalAlignment": "Bottom",
                        "verticalGlyphOrientation": "Right",
                        "wordSpacing": 100,
                        "billboardMode3D": "FaceNearPlane"
                    },
                    "useCodedValue": true,
                    "visibility": true,
                    "iD": -1
                }],
                "renderer": {
                    "type": "CIMUniqueValueRenderer",
                    "colorRamp": {
                        "type": "CIMRandomHSVColorRamp",
                        "colorSpace": {
                            "type": "CIMICCColorSpace",
                            "url": "Default RGB"
                        },
                        "maxH": 360,
                        "maxS": 15,
                        "maxV": 90,
                        "minH": 0,
                        "minS": 15,
                        "minV": 90,
                        "seed": 1
                    },
                    "defaultLabel": "<all other values>",
                    "defaultSymbol": {
                        "type": "CIMPointSymbol",
                        "symbolLayers": [{
                            "type": "CIMCharacterMarker",
                            "enable": true,
                            "colorLocked": true,
                            "anchorPointUnits": "Relative",
                            "dominantSizeAxis3D": "Y",
                            "size": 8,
                            "billboardMode3D": "FaceNearPlane",
                            "characterIndex": 34,
                            "fontFamilyName": "ESRI Default Marker",
                            "fontStyleName": "Regular",
                            "fontType": "Unspecified",
                            "scaleX": 1,
                            "symbol": {
                                "type": "CIMPolygonSymbol",
                                "symbolLayers": [{
                                    "type": "CIMSolidFill",
                                    "enable": true,
                                    "color": {
                                        "type": "CIMRGBColor",
                                        "values": [130, 130, 130, 100]
                                    }
                                }]
                            }
                        }]
                    },
                    "fields": ["NAME"],
                    "groups": [{
                        "type": "CIMUniqueValueGroup",
                        "classes": [{
                            "type": "CIMUniqueValueClass",
                            "values": [{
                                "type": "CIMUniqueValue",
                                "fieldValues": ["SP"]
                            }],
                            "label": "SP - Start Point",
                            "description": "Start Point",
                            "symbol": {
                                "type": "CIMPointSymbol",
                                "symbolLayers": [{
                                    "type": "CIMCharacterMarker",
                                    "enable": true,
                                    "anchorPointUnits": "Relative",
                                    "dominantSizeAxis3D": "Y",
                                    "size": 14,
                                    "billboardMode3D": "FaceNearPlane",
                                    "characterIndex": 34,
                                    "fontFamilyName": "ESRI Default Marker",
                                    "fontStyleName": "Regular",
                                    "fontType": "Unspecified",
                                    "scaleX": 1,
                                    "symbol": {
                                        "type": "CIMPolygonSymbol",
                                        "symbolLayers": [{
                                            "type": "CIMSolidStroke",
                                            "enable": true,
                                            "capStyle": "Round",
                                            "joinStyle": "Round",
                                            "lineStyle3D": "Strip",
                                            "miterLimit": 10,
                                            "width": 2,
                                            "color": {
                                                "type": "CIMRGBColor",
                                                "values": [0, 0, 0, 100]
                                            }
                                        }, {
                                            "type": "CIMSolidFill",
                                            "enable": true,
                                            "color": {
                                                "type": "CIMRGBColor",
                                                "values": [220, 38, 38, 100]
                                            }
                                        }]
                                    }
                                }, {
                                    "type": "CIMCharacterMarker",
                                    "enable": true,
                                    "anchorPointUnits": "Relative",
                                    "dominantSizeAxis3D": "Y",
                                    "size": 4,
                                    "billboardMode3D": "FaceNearPlane",
                                    "characterIndex": 34,
                                    "fontFamilyName": "ESRI Default Marker",
                                    "fontStyleName": "Regular",
                                    "fontType": "Unspecified",
                                    "scaleX": 1,
                                    "symbol": {
                                        "type": "CIMPolygonSymbol",
                                        "symbolLayers": [{
                                            "type": "CIMSolidFill",
                                            "enable": true,
                                            "color": {
                                                "type": "CIMRGBColor",
                                                "values": [0, 0, 0, 100]
                                            }
                                        }]
                                    }
                                }]
                            },
                            "visible": true
                        }, {
                            "type": "CIMUniqueValueClass",
                            "values": [{
                                "type": "CIMUniqueValue",
                                "fieldValues": ["BM"]
                            }],
                            "label": "BM - Base Mark",
                            "description": "Base Mark",
                            "symbol": {
                                "type": "CIMPointSymbol",
                                "symbolLayers": [{
                                    "type": "CIMCharacterMarker",
                                    "enable": true,
                                    "anchorPointUnits": "Relative",
                                    "dominantSizeAxis3D": "Y",
                                    "size": 10,
                                    "billboardMode3D": "FaceNearPlane",
                                    "characterIndex": 35,
                                    "fontFamilyName": "ESRI Default Marker",
                                    "fontStyleName": "Regular",
                                    "fontType": "Unspecified",
                                    "scaleX": 1,
                                    "symbol": {
                                        "type": "CIMPolygonSymbol",
                                        "symbolLayers": [{
                                            "type": "CIMSolidStroke",
                                            "enable": true,
                                            "capStyle": "Round",
                                            "joinStyle": "Round",
                                            "lineStyle3D": "Strip",
                                            "miterLimit": 10,
                                            "width": 2,
                                            "color": {
                                                "type": "CIMRGBColor",
                                                "values": [0, 0, 0, 100]
                                            }
                                        }, {
                                            "type": "CIMSolidFill",
                                            "enable": true,
                                            "color": {
                                                "type": "CIMRGBColor",
                                                "values": [220, 38, 38, 100]
                                            }
                                        }]
                                    }
                                }]
                            },
                            "visible": true
                        }, {
                            "type": "CIMUniqueValueClass",
                            "values": [{
                                "type": "CIMUniqueValue",
                                "fieldValues": ["LM"]
                            }],
                            "label": "LM - Landmark",
                            "description": "Landmark",
                            "symbol": {
                                "type": "CIMPointSymbol",
                                "symbolLayers": [{
                                    "type": "CIMCharacterMarker",
                                    "enable": true,
                                    "anchorPointUnits": "Relative",
                                    "dominantSizeAxis3D": "Y",
                                    "size": 12,
                                    "billboardMode3D": "FaceNearPlane",
                                    "characterIndex": 33,
                                    "fontFamilyName": "ESRI Default Marker",
                                    "fontStyleName": "Regular",
                                    "fontType": "Unspecified",
                                    "scaleX": 1,
                                    "symbol": {
                                        "type": "CIMPolygonSymbol",
                                        "symbolLayers": [{
                                            "type": "CIMSolidStroke",
                                            "enable": true,
                                            "capStyle": "Round",
                                            "joinStyle": "Round",
                                            "lineStyle3D": "Strip",
                                            "miterLimit": 10,
                                            "width": 2,
                                            "color": {
                                                "type": "CIMRGBColor",
                                                "values": [0, 0, 0, 100]
                                            }
                                        }, {
                                            "type": "CIMSolidFill",
                                            "enable": true,
                                            "color": {
                                                "type": "CIMRGBColor",
                                                "values": [220, 38, 38, 100]
                                            }
                                        }]
                                    }
                                }]
                            },
                            "visible": true
                        }]
                    }],
                    "useDefaultSymbol": true,
                    "valueExpressionInfo": {
                        "type": "CIMExpressionInfo",
                        "title": "Custom",
                        "expression": "$feature.NAME",
                        "returnType": "Default"
                    }
                },
                "scaleSymbols": true,
                "snappable": true
            }],
            "binaryReferences": [{
                "type": "CIMBinaryReference",
                "uRI": "CIMPATH=survey_points.xml",
                "data": ""
            }],
            "elevationSurfaces": [{
                "type": "CIMMapElevationSurface",
                "elevationMode": "BaseGlobeSurface",
                "name": "Ground",
                "verticalExaggeration": 1,
                "mapElevationID": "{B5DCAF65-4C8C-4B8B-9C6F-5F3E6F4A8B2D}",
                "color": {
                    "type": "CIMRGBColor",
                    "values": [255, 255, 255, 100]
                },
                "surfaceTINShadingMode": "Smooth",
                "visibility": true,
                "expanded": false
            }]
        }, null, 2);
    }
    
    createLYRStyle() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld">
  <NamedLayer>
    <Name>Survey_Points</Name>
    <UserStyle>
      <Title>Survey Points Style</Title>
      <FeatureTypeStyle>
        <Rule>
          <Name>LM - Landmark</Name>
          <Filter>
            <PropertyIsEqualTo>
              <PropertyName>NAME</PropertyName>
              <Literal>LM</Literal>
            </PropertyIsEqualTo>
          </Filter>
          <PointSymbolizer>
            <Graphic>
              <Mark>
                <WellKnownName>triangle</WellKnownName>
                <Fill>
                  <CssParameter name="fill">#FFFFFF</CssParameter>
                </Fill>
                <Stroke>
                  <CssParameter name="stroke">#000000</CssParameter>
                  <CssParameter name="stroke-width">2</CssParameter>
                </Stroke>
              </Mark>
              <Size>12</Size>
            </Graphic>
          </PointSymbolizer>
          <TextSymbolizer>
            <Label>
              <PropertyName>NAME</PropertyName>
            </Label>
            <Font>
              <CssParameter name="font-family">Arial</CssParameter>
              <CssParameter name="font-size">10</CssParameter>
              <CssParameter name="font-weight">bold</CssParameter>
            </Font>
            <Fill>
              <CssParameter name="fill">#000000</CssParameter>
            </Fill>
            <LabelPlacement>
              <PointPlacement>
                <Displacement>
                  <DisplacementX>0</DisplacementX>
                  <DisplacementY>15</DisplacementY>
                </Displacement>
              </PointPlacement>
            </LabelPlacement>
          </TextSymbolizer>
        </Rule>
        <Rule>
          <Name>BM - Base Mark</Name>
          <Filter>
            <PropertyIsEqualTo>
              <PropertyName>NAME</PropertyName>
              <Literal>BM</Literal>
            </PropertyIsEqualTo>
          </Filter>
          <PointSymbolizer>
            <Graphic>
              <Mark>
                <WellKnownName>square</WellKnownName>
                <Fill>
                  <CssParameter name="fill">#FFFFFF</CssParameter>
                </Fill>
                <Stroke>
                  <CssParameter name="stroke">#000000</CssParameter>
                  <CssParameter name="stroke-width">2</CssParameter>
                </Stroke>
              </Mark>
              <Size>10</Size>
            </Graphic>
          </PointSymbolizer>
          <TextSymbolizer>
            <Label>
              <PropertyName>NAME</PropertyName>
            </Label>
            <Font>
              <CssParameter name="font-family">Arial</CssParameter>
              <CssParameter name="font-size">10</CssParameter>
              <CssParameter name="font-weight">bold</CssParameter>
            </Font>
            <Fill>
              <CssParameter name="fill">#000000</CssParameter>
            </Fill>
            <LabelPlacement>
              <PointPlacement>
                <Displacement>
                  <DisplacementX>0</DisplacementX>
                  <DisplacementY>15</DisplacementY>
                </Displacement>
              </PointPlacement>
            </LabelPlacement>
          </TextSymbolizer>
        </Rule>
        <Rule>
          <Name>SP - Start Point</Name>
          <Filter>
            <PropertyIsEqualTo>
              <PropertyName>NAME</PropertyName>
              <Literal>SP</Literal>
            </PropertyIsEqualTo>
          </Filter>
          <PointSymbolizer>
            <Graphic>
              <Mark>
                <WellKnownName>circle</WellKnownName>
                <Fill>
                  <CssParameter name="fill">#FFFFFF</CssParameter>
                </Fill>
                <Stroke>
                  <CssParameter name="stroke">#000000</CssParameter>
                  <CssParameter name="stroke-width">2</CssParameter>
                </Stroke>
              </Mark>
              <Size>14</Size>
            </Graphic>
          </PointSymbolizer>
          <PointSymbolizer>
            <Graphic>
              <Mark>
                <WellKnownName>circle</WellKnownName>
                <Fill>
                  <CssParameter name="fill">#000000</CssParameter>
                </Fill>
              </Mark>
              <Size>4</Size>
            </Graphic>
          </PointSymbolizer>
          <TextSymbolizer>
            <Label>
              <PropertyName>NAME</PropertyName>
            </Label>
            <Font>
              <CssParameter name="font-family">Arial</CssParameter>
              <CssParameter name="font-size">12</CssParameter>
              <CssParameter name="font-weight">bold</CssParameter>
            </Font>
            <Fill>
              <CssParameter name="fill">#000000</CssParameter>
            </Fill>
            <LabelPlacement>
              <PointPlacement>
                <Displacement>
                  <DisplacementX>0</DisplacementX>
                  <DisplacementY>18</DisplacementY>
                </Displacement>
              </PointPlacement>
            </LabelPlacement>
          </TextSymbolizer>
        </Rule>
        <Rule>
          <Name>TP - Turn Points</Name>
          <Filter>
            <PropertyIsLike wildCard="*" singleChar="?" escapeChar="\\">
              <PropertyName>NAME</PropertyName>
              <Literal>TP*</Literal>
            </PropertyIsLike>
          </Filter>
          <PointSymbolizer>
            <Graphic>
              <Mark>
                <WellKnownName>circle</WellKnownName>
                <Fill>
                  <CssParameter name="fill">#FFFFFF</CssParameter>
                </Fill>
                <Stroke>
                  <CssParameter name="stroke">#000000</CssParameter>
                  <CssParameter name="stroke-width">2</CssParameter>
                </Stroke>
              </Mark>
              <Size>8</Size>
            </Graphic>
          </PointSymbolizer>
          <PointSymbolizer>
            <Graphic>
              <Mark>
                <WellKnownName>circle</WellKnownName>
                <Fill>
                  <CssParameter name="fill">#000000</CssParameter>
                </Fill>
              </Mark>
              <Size>2</Size>
            </Graphic>
          </PointSymbolizer>
          <TextSymbolizer>
            <Label>
              <PropertyName>NAME</PropertyName>
            </Label>
            <Font>
              <CssParameter name="font-family">Arial</CssParameter>
              <CssParameter name="font-size">9</CssParameter>
              <CssParameter name="font-weight">bold</CssParameter>
            </Font>
            <Fill>
              <CssParameter name="fill">#000000</CssParameter>
            </Fill>
            <LabelPlacement>
              <PointPlacement>
                <Displacement>
                  <DisplacementX>0</DisplacementX>
                  <DisplacementY>12</DisplacementY>
                </Displacement>
              </PointPlacement>
            </LabelPlacement>
          </TextSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>`;
    }
    
    createSHPContent(features) {
        if (!features || features.length === 0) {
            features = [{ geometry: { coordinates: [500000, 5500000] }, properties: { NAME: 'TEST' } }];
        }
        
        // Точний розрахунок розміру як у mapshaper
        const recordSize = 28; // 8 bytes header + 4 bytes shape type + 16 bytes coordinates
        const fileSize = 100 + features.length * recordSize;
        const buffer = new ArrayBuffer(fileSize);
        const view = new DataView(buffer);
        
        // Main File Header (100 bytes) - точно як ESRI специфікація
        view.setInt32(0, 9994, false);           // File Code (big-endian)
        view.setInt32(4, 0, false);              // Unused
        view.setInt32(8, 0, false);              // Unused  
        view.setInt32(12, 0, false);             // Unused
        view.setInt32(16, 0, false);             // Unused
        view.setInt32(20, 0, false);             // Unused
        view.setInt32(24, fileSize / 2, false);  // File Length in 16-bit words (big-endian)
        view.setInt32(28, 1000, true);           // Version (little-endian)
        view.setInt32(32, 1, true);              // Shape Type: Point (little-endian)
        
        // Bounding Box (little-endian doubles)
        const coords = features.map(f => f.geometry.coordinates);
        const xs = coords.map(c => c[0]);
        const ys = coords.map(c => c[1]);
        view.setFloat64(36, Math.min(...xs), true);  // Xmin
        view.setFloat64(44, Math.min(...ys), true);  // Ymin
        view.setFloat64(52, Math.max(...xs), true);  // Xmax  
        view.setFloat64(60, Math.max(...ys), true);  // Ymax
        view.setFloat64(68, 0.0, true);              // Zmin (unused)
        view.setFloat64(76, 0.0, true);              // Zmax (unused)
        view.setFloat64(84, 0.0, true);              // Mmin (unused)
        view.setFloat64(92, 0.0, true);              // Mmax (unused)
        
        // Variable Length Records
        let offset = 100;
        features.forEach((feature, i) => {
            // Record Header (8 bytes)
            view.setInt32(offset, i + 1, false);        // Record Number (big-endian)
            view.setInt32(offset + 4, 10, false);       // Content Length in 16-bit words (big-endian)
            
            // Record Contents (20 bytes)
            view.setInt32(offset + 8, 1, true);         // Shape Type: Point (little-endian)
            view.setFloat64(offset + 12, feature.geometry.coordinates[0], true); // X (little-endian)
            view.setFloat64(offset + 20, feature.geometry.coordinates[1], true); // Y (little-endian)
            
            offset += recordSize;
        });
        
        return buffer;
    }
    
    createDBFContent(features) {
        if (!features || features.length === 0) {
            features = [{ properties: { NAME: 'TEST' } }];
        }
        
        const headerLength = 65; // 32 (header) + 32 (field) + 1 (terminator)
        const recordLength = 11;  // 1 (delete flag) + 10 (NAME field)
        const totalLength = headerLength + features.length * recordLength + 1; // +1 for EOF
        const buffer = new ArrayBuffer(totalLength);
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);
        
        // DBF Header (32 bytes)
        bytes[0] = 0x03; // dBASE III
        const now = new Date();
        bytes[1] = now.getFullYear() - 1900;
        bytes[2] = now.getMonth() + 1;
        bytes[3] = now.getDate();
        view.setUint32(4, features.length, true);    // Record count
        view.setUint16(8, headerLength, true);       // Header length
        view.setUint16(10, recordLength, true);      // Record length
        // bytes 12-31 залишаються 0
        
        // Field descriptor (32 bytes)
        const fieldName = 'NAME      '; // 11 символів
        for (let i = 0; i < 11; i++) {
            bytes[32 + i] = fieldName.charCodeAt(i);
        }
        bytes[43] = 67;  // 'C' - Character type
        bytes[48] = 10;  // Field length
        bytes[49] = 0;   // Decimal places
        // байти 50-63 залишаються 0
        
        bytes[64] = 0x0D; // Header terminator
        
        // Data records
        let offset = headerLength;
        features.forEach(feature => {
            bytes[offset] = 0x20; // Not deleted (space)
            let name = (feature.properties?.NAME || 'POINT').substring(0, 10);
            // Заповнюємо пробілами до 10 символів
            while (name.length < 10) name += ' ';
            
            for (let i = 0; i < 10; i++) {
                bytes[offset + 1 + i] = name.charCodeAt(i) & 0x7F; // Тільки ASCII
            }
            offset += recordLength;
        });
        
        // EOF marker
        bytes[totalLength - 1] = 0x1A;
        
        return buffer;
    }
    
    createSHXContent(features) {
        if (!features || features.length === 0) {
            features = [{ geometry: { coordinates: [500000, 5500000] } }];
        }
        
        const buffer = new ArrayBuffer(100 + features.length * 8);
        const view = new DataView(buffer);
        
        // SHX Header - точна копія SHP header
        view.setInt32(0, 9994, false);  // File code (big-endian)
        view.setInt32(24, (100 + features.length * 8) / 2, false); // File length (big-endian)
        view.setInt32(28, 1000, true);  // Version (little-endian)
        view.setInt32(32, 1, true);     // Shape type (little-endian)
        
        // Bounding box (little-endian)
        const coords = features.map(f => f.geometry.coordinates);
        const xs = coords.map(c => c[0]);
        const ys = coords.map(c => c[1]);
        view.setFloat64(36, Math.min(...xs), true);
        view.setFloat64(44, Math.min(...ys), true);
        view.setFloat64(52, Math.max(...xs), true);
        view.setFloat64(60, Math.max(...ys), true);
        
        // Index records - КРИТИЧНО: правильні offset'и
        let shpRecordOffset = 50; // Початок першого record в SHP (в 16-bit словах)
        let offset = 100;
        features.forEach(() => {
            view.setInt32(offset, shpRecordOffset, false);     // Offset (big-endian)
            view.setInt32(offset + 4, 10, false);             // Content length (big-endian)
            shpRecordOffset += 14; // Наступний record: 8 bytes header + 20 bytes point = 28 bytes = 14 words
            offset += 8;
        });
        
        return buffer;
    }
    
    exportInstruction(siteName) {
        const instruction = `ІНСТРУКЦІЯ ДЛЯ ArcGIS PRO - SHAPEFILE

📁 ЗАВАНТАЖЕННЯ SHAPEFILE:
1. Завантажте 4 файли в одну папку:
   • survey_points_geometry.shp
   • survey_points_attributes.dbf
   • survey_points_index.shx
   • survey_points_projection.prj

2. Відкрийте ArcGIS Pro
3. Map → Add Data → оберіть .SHP файл
4. ArcGIS НЕ підключає автоматично - перевірте чи всі файли в одній папці

🎨 НАЛАШТУВАННЯ СТИЛІВ:
1. Правий клік на шар → Symbology
2. Primary symbology → Categories → Unique Values
3. Field → NAME
4. Add All Values
5. Налаштуй символи:

   • LM: Triangle 3, розмір 12, біла заливка + чорний контур
   • BM: Square 4, розмір 10, біла заливка + чорний контур
   • SP: Circle 4, розмір 12, біла заливка + чорний контур
   • TP1,TP2...: Circle 4, розмір 7, біла заливка + чорний контур

6. Apply → OK

📊 ПОЛЯ АТРИБУТІВ:
• NAME - назва точки (SP, TP1, BM, LM)
• SYMBOL - назва символу (Triangle 3, Square 4, Circle 4)
• SIZE - розмір символу (7-14)
• COLOR - колір (White_Black = біла заливка, чорний контур)
• UTM_X, UTM_Y - координати в UTM
• UTM_ZONE - зона UTM

💡 ПОРАДИ:
1. Використовуй поле SYMBOL для вибору правильного символу
2. Використовуй поле SIZE для налаштування розміру
3. Всі символи: біла заливка + чорний контур

📊 ПРОЕКТ: ${this.sanitizeHTML(siteName)}
📊 ПЛОЩА: ${((this.calculator.currentArea || 0) / 10000).toFixed(4)} га
📊 UTM ЗОНА: ${this.getUTMZone()}N
📊 ДАТА: ${new Date().toLocaleDateString('uk-UA')}`;
        
        const blob = new Blob([instruction], {type: 'text/plain;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'SurveyArcGISInstructions.txt';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        this.calculator.showNotification('Інструкція експортована!');
    }
}

window.ArcGISExport = ArcGISExport;
console.log('✅ ArcGIS Export модуль завантажено');