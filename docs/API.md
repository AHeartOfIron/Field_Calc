# API Документація FieldCalc

## 🏗️ Архітектура

FieldCalc побудований на модульній архітектурі з основним класом `SRIDCalculator`.

### Основний клас

```javascript
// Ініціалізація
const calculator = new SRIDCalculator();

// Доступ до глобального екземпляру
window.calculator
```

## 📊 Основні модулі

### CalculationsModule
Геодезичні розрахунки та математичні операції.

```javascript
// Автоматичний розрахунок
calculator.calculationsModule.autoCalculate();

// Розрахунок площі (Shoelace formula)
const area = calculator.calculationsModule.calculateArea(polygonPoints);

// Розрахунок периметру
const perimeter = calculator.calculationsModule.calculatePerimeter(polygonPoints);

// Похибка замикання
const error = calculator.calculationsModule.calculateClosureError(polygonPoints);
```

### MapManager
Управління картою та візуалізацією.

```javascript
// Створення полігону
calculator.mapManager.drawPolygon(points);

// Додавання маркера
calculator.mapManager.addMarker(latLng, type);

// Оновлення карти
calculator.mapManager.updateMap();
```

### ExportModule
Експорт даних у різні формати.

```javascript
// Експорт CSV
calculator.exportModule.exportCSV(points, siteName);

// Експорт JSON
calculator.exportModule.exportJSON(points, siteName);

// Експорт KML
calculator.kmlExport.exportKML(points, siteName);
```

### ImportModule
Імпорт даних з файлів.

```javascript
// Імпорт KML
calculator.importModule.importKML(file);

// Імпорт JSON
calculator.importModule.importJSON(data);
```

## 🗺️ Координатні системи

### UTM Проекції
```javascript
// Встановлення UTM зони
calculator.currentProjection = '+proj=utm +zone=36 +datum=WGS84 +units=m +no_defs';

// Конвертація координат
if (window.proj4) {
    const latLng = proj4(calculator.currentProjection, 'EPSG:4326', [x, y]);
}
```

### Магнітне схилення
```javascript
// Автоматичне оновлення
calculator.updateMagneticDeclination();

// Отримання схилення для координат
const declination = await calculator.getMagneticDeclination(lat, lng);
```

## 📍 Робота з точками

### Типи точок
- `LM` - Landmark (орієнтир)
- `BM` - Base Mark (базова точка)
- `SP` - Start Point (початкова точка)
- `TP1, TP2...` - Turn Points (точки повороту)

### Структура точки
```javascript
const point = {
    coords: [x, y],        // UTM координати
    type: 'SP',            // Тип точки
    latLng: [lat, lng]     // Географічні координати
};
```

### Методи роботи з точками
```javascript
// Отримання всіх точок
const points = calculator.getPoints();

// Отримання конвертованих точок
const converted = calculator.getConvertedPoints();

// Оновлення координат точки
calculator.updateTableCoordinates('SP', [x, y]);
```

## 🎯 Події та обробники

### Карта
```javascript
// Клік по карті
calculator.map.on('click', (e) => {
    console.log('Clicked:', e.latlng);
});

// Зміна масштабу
calculator.map.on('zoomend', () => {
    calculator.updateMarkersVisibility();
});
```

### Форма
```javascript
// Зміна кількості точок
document.getElementById('pointCount').addEventListener('input', () => {
    calculator.updateTableSize(newCount);
});

// Автоматичний розрахунок при введенні
calculator.bindTableEvents();
```

## 🔧 Утиліти

### Повідомлення
```javascript
// Показати повідомлення
calculator.showNotification('Успішно збережено');

// Показати помилку
calculator.showError('Помилка розрахунку');

// Очистити помилки
calculator.clearError();
```

### Валідація
```javascript
// Перевірка координат
const isValid = !isNaN(x) && !isNaN(y);

// Перевірка проекції
if (!calculator.currentProjection) {
    calculator.showError('Оберіть UTM зону');
}
```

## 📦 Експорт форматів

### GIS формати
```javascript
// QGIS GeoJSON
calculator.qgisExport.exportPoints(points, siteName);
calculator.qgisExport.exportPolygon(points, siteName);

// ArcGIS Shapefile
calculator.arcgisExport.exportSHPPoints(points, siteName);
calculator.arcgisExport.exportSHPPolygon(points, siteName);

// KML варіанти
calculator.kmlExport.exportKML(points, siteName);        // Тільки точки
calculator.kmlExport.exportKMLPolygon(points, siteName); // Тільки полігон
calculator.kmlExport.exportKMLAll(points, siteName);     // Все разом
```

### Табличні формати
```javascript
// Стандартні формати
calculator.exportCSV(points, siteName);
calculator.exportTSV(points, siteName);
calculator.exportJSON(points, siteName);
calculator.exportXML(points, siteName);

// Офісні формати
calculator.exportHTML(points, siteName);
calculator.exportDOC(points, siteName);
calculator.exportODS(points, siteName);
```

## 🎨 Кастомізація

### Стилі маркерів
```javascript
// Використання MarkerDesign
const icon = window.MarkerDesign.getMarkerIcon(point);

// Кастомна іконка
const customIcon = L.divIcon({
    html: '<div class="custom-marker">SP</div>',
    className: 'marker-custom',
    iconSize: [20, 20]
});
```

### Стилі полігону
```javascript
const polygonStyle = {
    color: '#dc2626',
    weight: 3,
    fillColor: '#dc2626',
    fillOpacity: 0.15
};
```

## 🔍 Налагодження

### Логування
```javascript
// Включити детальне логування
console.log('🔧 Debug mode enabled');

// Перевірка стану
console.log('Calculator state:', {
    projection: calculator.currentProjection,
    pointCount: calculator.pointCount,
    markers: calculator.markers.length
});
```

### Перевірка модулів
```javascript
// Статус завантаження модулів
const modules = [
    'calculationsModule',
    'mapManager', 
    'exportModule',
    'importModule'
];

modules.forEach(module => {
    console.log(`${module}:`, calculator[module] ? '✅' : '❌');
});
```

## 🚀 Розширення

### Додавання нового модуля
```javascript
class CustomModule {
    constructor(calculator) {
        this.calculator = calculator;
    }
    
    customMethod() {
        // Ваша логіка
    }
}

// Реєстрація модуля
if (window.CustomModule) {
    calculator.customModule = new CustomModule(calculator);
}
```

### Додавання нового формату експорту
```javascript
calculator.exportCustomFormat = function(points, siteName) {
    // Генерація даних
    const data = this.generateCustomData(points);
    
    // Створення файлу
    const blob = new Blob([data], {type: 'application/custom'});
    const url = URL.createObjectURL(blob);
    
    // Завантаження
    const a = document.createElement('a');
    a.href = url;
    a.download = `${siteName}.custom`;
    a.click();
    
    this.showNotification('✅ Custom формат експортовано');
};
```