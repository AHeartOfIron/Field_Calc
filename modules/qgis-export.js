class QGISExport {
    constructor(calculator) {
        this.calculator = calculator;
    }

    exportPoints(points, siteName) {
        const pointsOnly = points.filter(p => p.type !== 'polygon');
        this.exportGeoJSON(pointsOnly, siteName + '_points');
    }

    exportPolygon(points, siteName) {
        console.log('Початок exportPolygon, точок:', points.length);
        const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
        console.log('Фільтровані точки полігону:', polygonPoints.length, polygonPoints.map(p => p.type));
        
        if (polygonPoints.length < 3) {
            this.calculator.showError('❌ Потрібно мінімум 3 точки для полігону');
            return;
        }
        
        this.exportPolygonGeoJSON(polygonPoints, siteName + '_polygon');
    }

    exportAll(points, siteName) {
        // Створюємо окремі файли для точок та полігону
        this.exportPoints(points, siteName);
        
        // Створюємо полігон окремо
        const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
        if (polygonPoints.length >= 3) {
            this.exportPolygonGeoJSON(polygonPoints, siteName + '_polygon');
        }
    }
    
    exportPolygonGeoJSON(polygonPoints, fileName) {
        if (!this.calculator.currentProjection) {
            this.calculator.showError('❌ Оберіть систему координат (UTM зону)');
            return;
        }
        
        if (!window.proj4) {
            this.calculator.showError('❌ Proj4 не завантажено');
            return;
        }
        
        if (!polygonPoints || polygonPoints.length < 3) {
            this.calculator.showError('❌ Недостатньо точок для полігону');
            return;
        }
        
        try {
            this.calculator.showNotification('🔺 Створюємо полігон GeoJSON...');
            
            // Сортуємо точки: SP перша, потім TP1, TP2...
            const sortedPoints = polygonPoints.sort((a, b) => {
                if (a.type === 'SP') return -1;
                if (b.type === 'SP') return 1;
                const aNum = parseInt(a.type.replace('TP', '')) || 0;
                const bNum = parseInt(b.type.replace('TP', '')) || 0;
                return aNum - bNum;
            });
            
            const coords = sortedPoints.map(point => {
                const latLng = proj4(this.calculator.currentProjection, 'EPSG:4326', point.coords);
                return [latLng[0], latLng[1]];
            });
            coords.push(coords[0]); // Замикаємо полігон
            
            const polygonFeature = {
                type: 'Feature',
                properties: {
                    NAME: fileName.replace('_polygon', ''),
                    TYPE: 'POLYGON',
                    AREA_HA: parseFloat(((this.calculator.currentArea || 0) / 10000).toFixed(4)),
                    PERIMETER: parseFloat(document.getElementById('perimeter')?.textContent?.replace(/[^\d.]/g, '') || '0'),
                    ZONE: this.calculator.getUTMZone() + 'N'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [coords]
                }
            };
            
            const geojson = {
                type: 'FeatureCollection',
                crs: {
                    type: 'name',
                    properties: {
                        name: 'EPSG:4326'
                    }
                },
                features: [polygonFeature]
            };
            
            const blob = new Blob([JSON.stringify(geojson, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.geojson`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            this.calculator.showNotification('✅ Полігон GeoJSON експортовано!');
            
            // Експортуємо стиль для полігону
            this.exportPolygonStyle(fileName);
            
        } catch (error) {
            console.error('Polygon GeoJSON export error:', error);
            this.calculator.showError('❌ Помилка експорту полігону: ' + error.message);
        }
    }

    exportStyles(siteName) {
        const qmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>
<qgis version="3.28.0">
  <renderer-v2 type="RuleRenderer" symbollevels="0">
    <rules key="rules">
      <rule symbol="0" filter="&quot;TYPE&quot; = 'LM'" label="LM - Орієнтир" key="lm"/>
      <rule symbol="1" filter="&quot;TYPE&quot; = 'BM'" label="BM - Базова" key="bm"/>
      <rule symbol="2" filter="&quot;TYPE&quot; = 'SP'" label="SP - Початкова" key="sp"/>
      <rule symbol="3" filter="&quot;TYPE&quot; LIKE 'TP%'" label="TP - Поворот" key="tp"/>
    </rules>
    <symbols>
      <symbol type="marker" name="0" alpha="1">
        <layer class="SimpleMarker" enabled="1" locked="0">
          <Option type="Map">
            <Option type="QString" name="color" value="255,255,255,255"/>
            <Option type="QString" name="name" value="triangle"/>
            <Option type="QString" name="outline_color" value="0,0,0,255"/>
            <Option type="QString" name="outline_width" value="0.5"/>
            <Option type="QString" name="size" value="4"/>
          </Option>
        </layer>
      </symbol>
      <symbol type="marker" name="1" alpha="1">
        <layer class="SimpleMarker" enabled="1" locked="0">
          <Option type="Map">
            <Option type="QString" name="color" value="255,255,255,255"/>
            <Option type="QString" name="name" value="square"/>
            <Option type="QString" name="outline_color" value="0,0,0,255"/>
            <Option type="QString" name="outline_width" value="0.5"/>
            <Option type="QString" name="size" value="3.5"/>
          </Option>
        </layer>
        <layer class="SimpleMarker" enabled="1" locked="0">
          <Option type="Map">
            <Option type="QString" name="color" value="0,0,0,255"/>
            <Option type="QString" name="name" value="square"/>
            <Option type="QString" name="outline_width" value="0"/>
            <Option type="QString" name="size" value="0.8"/>
          </Option>
        </layer>
      </symbol>
      <symbol type="marker" name="2" alpha="1">
        <layer class="SimpleMarker" enabled="1" locked="0">
          <Option type="Map">
            <Option type="QString" name="color" value="255,255,255,255"/>
            <Option type="QString" name="name" value="circle"/>
            <Option type="QString" name="outline_color" value="0,0,0,255"/>
            <Option type="QString" name="outline_width" value="0.5"/>
            <Option type="QString" name="size" value="3.5"/>
          </Option>
        </layer>
        <layer class="SimpleMarker" enabled="1" locked="0">
          <Option type="Map">
            <Option type="QString" name="color" value="0,0,0,255"/>
            <Option type="QString" name="name" value="circle"/>
            <Option type="QString" name="outline_width" value="0"/>
            <Option type="QString" name="size" value="1"/>
          </Option>
        </layer>
      </symbol>
      <symbol type="marker" name="3" alpha="1">
        <layer class="SimpleMarker" enabled="1" locked="0">
          <Option type="Map">
            <Option type="QString" name="color" value="255,255,255,255"/>
            <Option type="QString" name="name" value="circle"/>
            <Option type="QString" name="outline_color" value="0,0,0,255"/>
            <Option type="QString" name="outline_width" value="0.5"/>
            <Option type="QString" name="size" value="2.5"/>
          </Option>
        </layer>
        <layer class="SimpleMarker" enabled="1" locked="0">
          <Option type="Map">
            <Option type="QString" name="color" value="0,0,0,255"/>
            <Option type="QString" name="name" value="circle"/>
            <Option type="QString" name="outline_width" value="0"/>
            <Option type="QString" name="size" value="0.6"/>
          </Option>
        </layer>
      </symbol>
    </symbols>
  </renderer-v2>
</qgis>`;
        
        const blob = new Blob([qmlContent], {type: 'text/xml'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${siteName}_styles.qml`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        this.calculator.showNotification('QGIS стилі експортовано!');
    }

    exportPolygonStyle(fileName) {
        const qmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>
<qgis version="3.28.0">
  <renderer-v2 type="singleSymbol" symbollevels="0">
    <symbols>
      <symbol type="fill" name="0" alpha="1">
        <layer class="SimpleFill" enabled="1" locked="0">
          <Option type="Map">
            <Option type="QString" name="color" value="220,38,38,60"/>
            <Option type="QString" name="outline_color" value="220,38,38,255"/>
            <Option type="QString" name="outline_width" value="1"/>
            <Option type="QString" name="style" value="solid"/>
          </Option>
        </layer>
      </symbol>
    </symbols>
  </renderer-v2>
</qgis>`;
        
        const blob = new Blob([qmlContent], {type: 'text/xml'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}_style.qml`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    exportInstruction(siteName) {
        const instruction = `ДЕТАЛЬНА ІНСТРУКЦІЯ ДЛЯ QGIS

ПІДГОТОВКА:
1. Завантажте та встановіть QGIS 3.28+ з qgis.org
2. Переконайтесь, що всі файли збережені в одній папці

ЗАВАНТАЖЕННЯ ДАНИХ:
1. Відкрийте QGIS
2. Натисніть Layer > Add Layer > Add Vector Layer
3. Оберіть ваш .geojson файл або просто перетягніть його на карту
4. Натисніть Add

НАЛАШТУВАННЯ СТИЛІВ:
1. Правою кнопкою миші на шар в Layers Panel
2. Оберіть Properties
3. Перейдіть на вкладку Symbology
4. Натисніть Style > Load Style
5. Оберіть ваш .qml файл
6. Натисніть Load Style та OK

НАЛАШТУВАННЯ ПОДПИСІВ:
1. В Symbology оберіть Labels
2. Вмикніть Show labels for this layer
3. Оберіть поле TYPE для подписів
4. Налаштуйте розмір та колір шрифту

НАЛАШТУВАННЯ КООРДИНАТ:
1. Project > Properties > CRS
2. Оберіть вашу UTM зону (наприклад, EPSG:32636 для UTM 36N)
3. Натисніть OK

ДОДАТКОВІ МОЖЛИВОСТІ:
- Вимірювання відстаней: Measure Line tool
- Обчислення площ: Field Calculator
- Експорт в інші формати: ПКМ на шар > Export
- Створення полігону: Vector > Geometry Tools > Points to Path

ПОРАДИ:
- Зберігайте проект як .qgz файл
- Використовуйте Print Layout для створення карт
- Перевірте координати в атрибутах точок`;
        
        const blob = new Blob([instruction], {type: 'text/plain;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${siteName}_QGIS_instruction.txt`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        this.calculator.showNotification('Інструкція QGIS експортована!');
    }

    exportGeoJSON(points, siteName) {
        // Перевірка необхідних умов
        if (!this.calculator.currentProjection) {
            this.calculator.showError('❌ Оберіть систему координат (UTM зону)');
            return;
        }
        
        if (!window.proj4) {
            this.calculator.showError('❌ Proj4 не завантажено. Перевірте налаштування.');
            return;
        }
        
        try {
            this.calculator.showNotification('🗺️ Створюємо GeoJSON...');
            
            const features = points.map(point => {
                const latLng = proj4(this.calculator.currentProjection, 'EPSG:4326', point.coords);
                return {
                    type: 'Feature',
                    properties: {
                        NAME: point.type,
                        TYPE: point.type,
                        UTM_X: Math.round(point.coords[0]),
                        UTM_Y: Math.round(point.coords[1]),
                        LAT: parseFloat(latLng[1].toFixed(6)),
                        LON: parseFloat(latLng[0].toFixed(6)),
                        ZONE: this.calculator.getUTMZone() + 'N'
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [latLng[0], latLng[1]]
                    }
                };
            });
            
            const geojson = {
                type: 'FeatureCollection',
                crs: {
                    type: 'name',
                    properties: {
                        name: 'EPSG:4326'
                    }
                },
                features: features
            };
            
            const blob = new Blob([JSON.stringify(geojson, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${siteName}.geojson`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            this.calculator.showNotification('✅ GeoJSON експортовано!');
            
        } catch (error) {
            console.error('GeoJSON export error:', error);
            this.calculator.showError('❌ Помилка експорту GeoJSON: ' + error.message);
        }
    }
}

window.QGISExport = QGISExport;