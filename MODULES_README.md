# Модулі SRID Калькулятора

## Структура модулів

### Основні модулі
- **app.js** - Головний клас SRIDCalculator
- **app-end-fix.js** - Фінальні виправлення та ініціалізація

### Модулі експорту
- **modules/excel-export.js** - Експорт в CSV/TSV формати
- **modules/text-export.js** - Експорт в TXT формат
- **modules/pdf-export.js** - Створення PDF звітів
- **modules/png-export.js** - Експорт карти в PNG
- **modules/kml-export.js** - Експорт в KML формат
- **modules/qgis-export.js** - Експорт для QGIS
- **modules/arcgis-export.js** - Експорт для ArcGIS

### Модулі функціональності
- **modules/map-manager.js** - Управління картою
- **modules/calculations-module.js** - Розрахунки
- **modules/ui-helpers.js** - Допоміжні UI функції
- **modules/import-module.js** - Імпорт даних
- **modules/basic-methods.js** - Базові методи
- **modules/marker-design.js** - Дизайн маркерів

### Допоміжні модулі
- **cadastral.js** - Кадастрові ділянки
- **search-location.js** - Пошук місць
- **markers.js** - Маркери карти

## Виправлені проблеми

### ✅ Відображення точок на мапі
- Додано перевірку proj4 бібліотеки
- Покращено fallback для UTM координат
- Виправлено автоматичне відображення при введенні координат

### ✅ Модульна структура експорту
- Розділено експорт на окремі модулі
- Excel експорт (CSV/TSV)
- Текстовий експорт (TXT)
- PDF експорт (звіти та карти)
- PNG експорт (карти)

### ✅ Автоматичне перемальовування
- Точки автоматично відображаються при введенні
- Полігон автоматично оновлюється
- Розрахунки виконуються в реальному часі

## Використання

```javascript
// Ініціалізація відбувається автоматично
// Доступ до калькулятора через window.calculator

// Приклад використання модулів експорту
const points = calculator.getPoints();
const siteName = 'Моя ділянка';

// Excel експорт
const excelExport = new ExcelExport(calculator);
excelExport.exportCSV(points, siteName);

// PDF експорт
const pdfExport = new PDFExport(calculator);
pdfExport.exportPDF(points, siteName);
```

## Налаштування

1. Оберіть UTM зону (автоматично встановлюється 36 для України)
2. Введіть координати точок
3. Точки та полігон відображаються автоматично
4. Використовуйте меню експорту для збереження даних