# 🗃️ ArcGIS SHP Експорт з @mapbox/shp-write

## 📋 Огляд

Модуль ArcGIS експорту тепер використовує сучасну бібліотеку **@mapbox/shp-write** для створення справжніх SHP файлів, які можна відкривати безпосередньо в ArcGIS, QGIS та інших ГІС програмах.

## ✨ Нові можливості

### 🔧 Технічні покращення
- ✅ Використання @mapbox/shp-write для створення справжніх SHP файлів
- ✅ Автоматичне створення .shp, .shx, .dbf файлів
- ✅ Правильні .prj файли з проекцією WGS84
- ✅ Сумісність з ArcGIS Pro/Desktop та QGIS
- ✅ Підтримка точок та полігонів одночасно

### 📁 Структура експорту
```
site_name_ArcGIS_SHP.zip
├── points.shp          # Файл точок (геометрія)
├── points.shx          # Індекс точок
├── points.dbf          # Атрибути точок
├── points.prj          # Проекція точок
├── polygon.shp         # Файл полігону (геометрія)
├── polygon.shx         # Індекс полігону
├── polygon.dbf         # Атрибути полігону
├── polygon.prj         # Проекція полігону
├── combined.geojson    # Комбінований GeoJSON
├── combined.prj        # Проекція для GeoJSON
├── UTM_Zone_36N.prj    # UTM проекція для локальних вимірювань
├── points_style.lyr    # Стилі ArcGIS
└── README.txt          # Детальна інструкція
```

## 🎯 Атрибути даних

### Точки (points.shp)
- **NAME** - тип точки (LM, BM, SP, TP1, TP2...)
- **TYPE** - дублікат типу для сумісності
- **UTM_X** - X координата в UTM (округлена)
- **UTM_Y** - Y координата в UTM (округлена)

### Полігон (polygon.shp)
- **NAME** - назва ділянки
- **AREA_HA** - площа в гектарах
- **PERIMETER** - периметр в метрах

## 🗺️ Координатні системи

### WGS84 (основна)
- **Формат**: Географічні координати (широта/довгота)
- **Одиниці**: Градуси
- **Використання**: Максимальна сумісність з різними ГІС
- **EPSG код**: 4326

### UTM (додаткова)
- **Формат**: Проекційні координати
- **Одиниці**: Метри
- **Використання**: Точні локальні вимірювання
- **Зони**: 34N-40N (для України)

## 🚀 Як використовувати

### 1. В FieldCalc
1. Заповніть координати точок
2. Оберіть UTM зону
3. Натисніть "Експорт" → "ArcGIS" → "SHP Архів (ZIP)"
4. Завантажиться ZIP файл з усіма необхідними файлами

### 2. В ArcGIS Pro
1. Розпакуйте ZIP архів
2. Відкрийте ArcGIS Pro
3. Add Data → оберіть .shp файли
4. Координатна система визначиться автоматично з .prj файлів
5. Завантажте points_style.lyr для стилізації

### 3. В QGIS
1. Розпакуйте ZIP архів
2. Відкрийте QGIS
3. Layer → Add Layer → Add Vector Layer
4. Оберіть .shp файли
5. Координатна система визначиться автоматично

## 🔧 Технічні деталі

### Бібліотеки
```html
<!-- CDN версія (основна) -->
<script src="https://unpkg.com/@mapbox/shp-write@0.3.3/shpwrite.js"></script>

<!-- Локальна версія (резервна) -->
<script src="shpwrite.js"></script>
```

### Використання в коді
```javascript
// Створення SHP для точок
const pointsGeoJSON = { type: 'FeatureCollection', features: pointFeatures };
const pointsShpFiles = shpwrite.write([pointsGeoJSON], 'POINT');

// Створення SHP для полігону
const polygonGeoJSON = { type: 'FeatureCollection', features: [polygonFeature] };
const polygonShpFiles = shpwrite.write([polygonGeoJSON], 'POLYGON');

// Додавання до ZIP архіву
Object.keys(pointsShpFiles).forEach(fileName => {
    if (fileName.endsWith('.shp') || fileName.endsWith('.shx') || fileName.endsWith('.dbf')) {
        const newName = fileName.replace(/^\w+/, 'points');
        zip.file(newName, pointsShpFiles[fileName]);
    }
});
```

## 🧪 Тестування

### Автоматичні тести
Додано тестовий модуль `test-arcgis-export.js` який перевіряє:
- ✅ Наявність необхідних бібліотек
- ✅ Створення SHP файлів
- ✅ Правильність атрибутів
- ✅ Функціональність експорту

### Ручне тестування
1. Відкрийте `test-shp-export.html` в браузері
2. Натисніть "Тестувати SHP експорт"
3. Перевірте консоль браузера на помилки
4. Завантажиться тестовий ZIP файл

## 🐛 Усунення проблем

### Помилка "shp-write не завантажено"
```javascript
// Перевірте наявність бібліотеки
if (!window.shpwrite) {
    console.error('shp-write не завантажено');
    // Спробуйте перезавантажити сторінку
}
```

### Помилка "JSZip не завантажено"
```javascript
// Перевірте наявність JSZip
if (!window.JSZip) {
    console.error('JSZip не завантажено');
    // Додайте <script src="https://unpkg.com/jszip@3.10.1/dist/jszip.min.js"></script>
}
```

### Файли не відкриваються в ArcGIS
1. Перевірте, чи є всі файли (.shp, .shx, .dbf, .prj)
2. Переконайтесь, що файли не пошкоджені
3. Спробуйте відкрити combined.geojson як альтернативу

## 📚 Додаткові ресурси

### Документація
- [@mapbox/shp-write](https://github.com/mapbox/shp-write) - офіційна документація
- [Shapefile Format](https://en.wikipedia.org/wiki/Shapefile) - специфікація формату
- [ArcGIS Pro Documentation](https://pro.arcgis.com/en/pro-app/latest/help/data/shapefiles/working-with-shapefiles-in-arcgis-pro.htm)

### Приклади використання
```javascript
// Простий експорт точок
const points = [
    { type: 'Feature', properties: { name: 'Point 1' }, geometry: { type: 'Point', coordinates: [30.5, 50.4] }}
];
const shpFiles = shpwrite.write([{ type: 'FeatureCollection', features: points }], 'POINT');

// Експорт полігону
const polygon = {
    type: 'Feature',
    properties: { name: 'Area 1', area: 1000 },
    geometry: { type: 'Polygon', coordinates: [[[30.5, 50.4], [30.6, 50.4], [30.6, 50.5], [30.5, 50.5], [30.5, 50.4]]] }
};
const polygonShp = shpwrite.write([{ type: 'FeatureCollection', features: [polygon] }], 'POLYGON');
```

## 🎉 Результат

Тепер FieldCalc створює повноцінні SHP файли, які:
- ✅ Відкриваються в ArcGIS Pro/Desktop без помилок
- ✅ Відкриваються в QGIS без додаткових налаштувань
- ✅ Містять правильні атрибути та геометрію
- ✅ Мають коректні координатні системи
- ✅ Включають стилі та документацію

**Автор оновлення**: Система на базі @mapbox/shp-write  
**Дата**: Грудень 2024  
**Версія**: 2.0 (з підтримкою справжніх SHP файлів)