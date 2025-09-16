console.log('🔧 Завантажуємо клас SRIDCalculator...');

// Основний клас калькулятора полігонів
class SRIDCalculator {
    constructor() {
        console.log('🚀 Ініціалізація SRIDCalculator...');
        
        // Основні властивості
        this.map = null;                    // Об'єкт карти Leaflet
        this.currentProjection = '';        // Поточна проекція координат
        this.markers = [];                  // Масив маркерів на карті
        this.polygon = null;                // Полігон на карті
        this.pointCount = 3;                // Кількість точок повороту
        this.currentArea = 0;               // Поточна площа
        this.measureMode = false;           // Режим вимірювання
        this.measureMarkers = [];           // Маркери для вимірювання
        this.autoMagneticDeclination = true; // Автоматичне магнітне схилення
        this.autoUTMZone = true; // Автоматичне визначення UTM зони
        this.blinkingMarker = null;         // Маркер що мигає
        this.magneticHelper = null;         // Помічник магнітного схилення
        
        this.init(); // Запускаємо ініціалізацію
        
        // Додаємо клавіатурні скорочення та оновлюємо магнітне схилення
        setTimeout(() => {
            if (this.autoMagneticDeclination) {
                this.updateMagneticDeclination();
            }
        }, 1000);
    }

    // Основна ініціалізація
    init() {
        console.log('🔧 Ініціалізуємо SRIDCalculator...');
        
        // Послідовність ініціалізації
        this.initUTMZones();    // Налаштування UTM зон
        this.initMap();         // Створення карти
        this.generateTable();   // Генерація таблиці точок
        this.bindEvents();      // Прив'язка обробників подій
        
        // Ініціалізація модулів (якщо доступні)
        if (window.MapManager) {
            this.mapManager = new MapManager(this);
            console.log('✅ Менеджер карти ініціалізовано');
        }
        
        if (window.CalculationsModule) {
            this.calculationsModule = new CalculationsModule(this);
            console.log('✅ CalculationsModule initialized');
        }
        
        if (window.UIHelpers) {
            this.uiHelpers = new UIHelpers(this);
            console.log('✅ UIHelpers initialized');
        }
        
        if (window.ExportModule) {
            this.exportModule = new ExportModule(this);
            console.log('✅ ExportModule initialized');
        }
        
        if (window.ImportModule) {
            this.importModule = new ImportModule(this);
            console.log('✅ ImportModule initialized');
        }
        
        if (window.BasicMethods) {
            this.basicMethods = new BasicMethods(this);
            console.log('✅ BasicMethods initialized');
        }
        
        if (window.MagneticDeclinationHelper) {
            this.magneticHelper = new MagneticDeclinationHelper();
            console.log('✅ MagneticDeclinationHelper initialized');
        }
        
        if (window.KMLExport) {
            this.kmlExport = new KMLExport(this);
            console.log('✅ KMLExport initialized');
        }
        
        if (window.QGISExport) {
            this.qgisExport = new QGISExport(this);
            console.log('✅ QGISExport initialized');
        }
        
        if (window.ArcGISExport) {
            this.arcgisExport = new ArcGISExport(this);
            console.log('✅ ArcGISExport initialized');
        }
        
        if (window.SHPExport) {
            this.shpExport = new SHPExport(this);
            console.log('✅ SHPExport initialized');
        }
        
        if (window.ExcelExport) {
            this.excelExport = new ExcelExport(this);
            console.log('✅ ExcelExport initialized');
        }
        
        if (window.TextExport) {
            this.textExport = new TextExport(this);
            console.log('✅ TextExport initialized');
        }
        
        if (window.PDFExport) {
            this.pdfExport = new PDFExport(this);
            console.log('✅ PDFExport initialized');
        }
        
        if (window.PNGExport) {
            this.pngExport = new PNGExport(this);
            console.log('✅ PNGExport initialized');
        }
        
        if (window.PolygonSyncPlugin) {
            this.polygonSync = new PolygonSyncPlugin(this);
            console.log('✅ PolygonSyncPlugin initialized');
        }
        
        // CoordinatePlugin відключено - створював плашку знизу
        // if (window.CoordinatePlugin) {
        //     this.coordinatePlugin = new CoordinatePlugin(this);
        //     console.log('✅ CoordinatePlugin initialized');
        // }
    }

    initUTMZones() {
        const select = document.getElementById('utmZone');
        for (let zone = 1; zone <= 60; zone++) {
            const option = document.createElement('option');
            option.value = `utm${zone}`;
            option.textContent = `UTM Zone ${zone}N`;
            select.appendChild(option);
        }
        
        // Запит геолокації при ініціалізації
        setTimeout(() => this.requestUserLocation(), 1000);
    }
    
    requestUserLocation() {
        if (!this.autoUTMZone) return;
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Глобальне визначення UTM зони
                    const zoneNumber = Math.floor((lng + 180) / 6) + 1;
                    const zoneLetter = lat >= 0 ? 'N' : 'S';
                    
                    // Встановлюємо зону
                    const select = document.getElementById('utmZone');
                    const zoneValue = `utm${zoneNumber}`;
                    
                    if (select.querySelector(`option[value="${zoneValue}"]`)) {
                        select.value = zoneValue;
                        this.currentProjection = `+proj=utm +zone=${zoneNumber} +datum=WGS84 +units=m +no_defs`;
                        
                        // Оновлюємо магнітне схилення
                        this.updateMagneticDeclinationForCoords(lat, lng);
                        
                        this.showNotification(`Автоматично встановлено UTM зону ${zoneNumber}${zoneLetter}`);
                        
                        // Переміщуємо карту до місцезнаходження
                        this.map.setView([lat, lng], 12);
                    }
                },
                (error) => {
                    console.log('Геолокація недоступна:', error.message);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        }
    }

    initMap() {
        const mapContainer = document.getElementById('map');
        
        // Повне очищення контейнера
        if (mapContainer._leaflet_id) {
            delete mapContainer._leaflet_id;
        }
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        
        // Очищаємо HTML контейнера
        mapContainer.innerHTML = '';
        mapContainer.className = '';
        
        // Перевіряємо чи не створена вже карта
        if (this.map) {
            console.log('⚠️ Map already exists!');
            return;
        }
        
        this.map = L.map('map').setView([50.4, 30.5], 8);
        console.log('🗺️ Map created successfully');
        
        // Перевірка через 5 секунд
        setTimeout(() => {
            console.log('✅ Dragging enabled after 5s:', this.map.dragging.enabled());
            if (!this.map.dragging.enabled()) {
                console.log('⚠️ Перетягування відключено! Включаю...');
                this.map.dragging.enable();
            }
        }, 5000);
        
        console.log('✅ Initial dragging enabled:', this.map.dragging.enabled());

        const baseLayers = {
            'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
            'Google Satellite': L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            }),
            'Google Hybrid': L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            }),
            'Google Streets': L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            }),
            'Esri Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'),
            'CartoDB Dark': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png')
        };

        baseLayers['OpenStreetMap'].addTo(this.map);
        L.control.scale({ imperial: false }).addTo(this.map);
        
        // Переміщуємо кнопки зуму вниз
        setTimeout(() => {
            const zoomControl = document.querySelector('.leaflet-control-zoom');
            if (zoomControl) {
                zoomControl.style.marginTop = '40px';
                L.DomEvent.disableClickPropagation(zoomControl);
            }
            
            // Кнопка розгортання
            const expandBtn = L.control({ position: 'topleft' });
            expandBtn.onAdd = function() {
                const btn = L.DomUtil.create('button', 'expand-menu-btn');
                btn.innerHTML = '☰';
                btn.style.cssText = 'width: 30px; height: 30px; background: #8B0000; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 16px; display: none; margin-bottom: 5px;';
                
                L.DomEvent.disableClickPropagation(btn);
                L.DomEvent.on(btn, 'click', function() {
                    const sidebar = document.getElementById('sidebar');
                    sidebar.classList.remove('hidden');
                    btn.style.display = 'none';
                    setTimeout(() => {
                        if (window.calculator && window.calculator.map) {
                            window.calculator.map.invalidateSize();
                        }
                    }, 300);
                });
                
                return btn;
            };
            expandBtn.addTo(this.map);
            window.expandMenuBtn = expandBtn;
        }, 500);
        
        // Простий кадастровий шар
        window.cadastralLayer = null;
        window.toggleCadastral = () => {
            if (window.cadastralLayer) {
                this.map.removeLayer(window.cadastralLayer);
                window.cadastralLayer = null;
                this.showNotification('Кадастровий шар вимкнено');
            } else {
                window.cadastralLayer = L.tileLayer('https://cdn.kadastr.live/tiles/raster/styles/parcels/{z}/{x}/{y}.png', {
                    attribution: 'Кадастрова карта України',
                    opacity: 0.7,
                    maxZoom: 18
                }).addTo(this.map);
                this.showNotification('Кадастровий шар увімкнено');
            }
        };
        
        // Кнопки на карті
        this.addMapControls();

        // Діагностика перетягування
        this.map.on('dragstart', () => console.log('✅ Drag started'));
        this.map.on('drag', () => console.log('✅ Dragging...'));
        this.map.on('dragend', () => console.log('✅ Drag ended'));
        
        // Перевірка кліків
        this.map.on('click', (e) => {
            console.log('🖱️ Map clicked, dragging enabled:', this.map.dragging.enabled());
        });
        
        this.map.on('mousedown', () => {
            console.log('🖱️ Mouse down, dragging enabled:', this.map.dragging.enabled());
        });
        

    }

    bindEvents() {
        console.log('🔗 Binding events...');
        
        const utmZone = document.getElementById('utmZone');
        if (!utmZone) {
            console.error('❌ utmZone element not found!');
            return;
        }
        
        utmZone.addEventListener('change', (e) => {
            const zone = e.target.value.replace('utm', '');
            if (zone) {
                this.currentProjection = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
                if (this.basicMethods) {
                    this.basicMethods.setMagneticDeclinationForZone(parseInt(zone));
                }
                        // Оновлюємо магнітне схилення по SP координатах
                this.updateMagneticDeclination();
                // Автоматично перераховуємо таблицю при зміні зони
                setTimeout(() => this.autoCalculateIfNeeded(), 200);
                // Оновлюємо UTM сітку
                this.hideUTMGrid();
                setTimeout(() => this.addUTMGrid(), 100);
            }
        });

        document.getElementById('generateTable').addEventListener('click', () => {
            this.pointCount = parseInt(document.getElementById('pointCount').value);
            this.generateTable();
        });

        document.getElementById('calculate').addEventListener('click', () => this.calculate());
        document.getElementById('reset').addEventListener('click', () => this.basicMethods ? this.basicMethods.reset() : this.reset());
        document.getElementById('adjustClosure').addEventListener('click', () => this.basicMethods ? this.basicMethods.diagnoseClosure() : this.diagnoseClosure());
        // Обробник кнопки згортання в toggle.js
        document.getElementById('settingsBtn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.querySelectorAll('[style*="z-index: 10000"]').forEach(el => el.remove());
            this.showSettings();
        });
        document.getElementById('licenseBtn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.querySelectorAll('[style*="z-index: 10000"]').forEach(el => el.remove());
            this.basicMethods ? this.basicMethods.showLicense() : this.showLicense();
        });
        document.getElementById('showHistory').addEventListener('click', () => this.basicMethods ? this.basicMethods.showHistory() : this.showHistory());
        document.getElementById('showImportMenu').addEventListener('click', () => this.showImportMenu());
        document.getElementById('importPolygon').addEventListener('change', (e) => this.importPolygon(e));
        document.getElementById('importTable').addEventListener('change', (e) => this.importTable(e));
        document.getElementById('importShapefile').addEventListener('change', (e) => this.importShapefile(e));
        
        const exportBtn = document.getElementById('showExportMenu');
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.querySelectorAll('[style*="z-index: 10000"]').forEach(el => el.remove());
                this.showExportMenu();
            });
        }
        
        document.getElementById('import').addEventListener('change', (e) => {
            if (this.importModule) {
                this.importModule.importData(e);
            } else {
                this.importData(e);
            }
        });
        document.getElementById('copyTable').addEventListener('click', () => this.copyTable());
        document.getElementById('areaUnit').addEventListener('change', () => this.updateAreaDisplay());
        
        // Обробник зміни магнітного схилення з автоперерахунком
        const magneticDeclinationInput = document.getElementById('magneticDeclination');
        if (magneticDeclinationInput) {
            magneticDeclinationInput.addEventListener('input', () => {
                this.updateCompass();
                clearTimeout(this.magneticDeclinationTimeout);
                this.magneticDeclinationTimeout = setTimeout(() => {
                    this.autoCalculateIfNeeded();
                }, 300);
            });
        }
        

        
        // Обробник автоматичного магнітного схилення
        const autoMagneticCheckbox = document.getElementById('autoMagneticDeclination');
        if (autoMagneticCheckbox) {
            autoMagneticCheckbox.addEventListener('change', (e) => {
                this.autoMagneticDeclination = e.target.checked;
                if (this.autoMagneticDeclination) {
                    this.updateMagneticDeclination();
                }
            });
        }
        
        // Обробник автоматичної UTM зони
        const autoUTMCheckbox = document.getElementById('autoUTMZone');
        if (autoUTMCheckbox) {
            autoUTMCheckbox.addEventListener('change', (e) => {
                this.autoUTMZone = e.target.checked;
                if (this.autoUTMZone) {
                    this.requestUserLocation();
                }
            });
        }
        
        // Автозбереження
        setInterval(() => this.basicMethods ? this.basicMethods.autoSave() : this.autoSave(), 30000);
        
        // Автооновлення магнітного схилення кожні 5 секунд з перерахунком таблиці
        setInterval(async () => {
            if (this.autoMagneticDeclination) {
                const changed = await this.updateMagneticDeclinationSilent();
                if (changed) {
                    this.autoCalculateIfNeeded();
                }
            }
        }, 5000);
        

    }

    generateTable() {
        let html = '<table class="points-table">';
        html += '<tr><th><b>Від</b><br>From</th><th><b>До</b><br>To</th><th><b>Азимут (Магнітний)</b><br>Magnetic bearing</th><th><b>Азимут (Істинний)</b><br>True bearing</th><th><b>Відстань (м)</b><br>Distance</th><th><b>Long/UTM X</b></th><th><b>Lat/UTM Y</b></th><th><b>Дії</b></th></tr>';
        
        html += '<tr data-type="lm" draggable="true"><td>LM</td><td>BM</td><td class="auto">-</td><td class="auto">-</td><td class="auto">-</td><td><input type="number" id="lm_x" step="1"></td><td><input type="number" id="lm_y" step="1"></td><td>⇅ <button class="copy-row-btn" onclick="window.calculator.copyRow(this)">📄</button></td></tr>';
        html += '<tr data-type="bm" draggable="true"><td>BM</td><td>SP</td><td class="auto">-</td><td class="auto">-</td><td class="auto">-</td><td><input type="number" id="bm_x" step="1"></td><td><input type="number" id="bm_y" step="1"></td><td>⇅ <button class="copy-row-btn" onclick="window.calculator.copyRow(this)">📄</button></td></tr>';
        html += '<tr data-type="sp" draggable="true"><td>SP</td><td>TP1</td><td class="auto">-</td><td class="auto">-</td><td class="auto">-</td><td><input type="number" id="sp_x" step="1"></td><td><input type="number" id="sp_y" step="1"></td><td>⇅ <button class="copy-row-btn" onclick="window.calculator.copyRow(this)">📄</button></td></tr>';
        
        for (let i = 1; i <= this.pointCount; i++) {
            const next = i === this.pointCount ? 'SP*' : `TP${i+1}`;
            html += `<tr data-type="tp" data-index="${i}" draggable="true"><td>TP${i}</td><td>${next}</td><td class="auto">-</td><td class="auto">-</td><td class="auto">-</td><td><input type="number" id="tp${i}_x" step="1"></td><td><input type="number" id="tp${i}_y" step="1"></td><td>⇅ <button class="copy-row-btn" onclick="window.calculator.copyRow(this)">📄</button></td></tr>`;
        }
        
        html += '</table>';
        document.getElementById('pointsTable').innerHTML = html;
        this.bindTableEvents();
        this.bindDragEvents();
    }

    bindTableEvents() {
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', () => {
                clearTimeout(this.updateTimeout);
                this.updateTimeout = setTimeout(() => {
                    this.autoCalculate();
                    this.updateMapFromTable();
                    
                    // Автоматично оновлюємо магнітне схилення та UTM зону при зміні SP
                    if (input.id === 'sp_x' || input.id === 'sp_y') {
                        this.updateSPDependentSettings();
                    }
                }, 200);
            });
            
            input.addEventListener('blur', () => {
                this.autoCalculate();
                this.updateMapFromTable();
                
                if (input.id === 'sp_x' || input.id === 'sp_y') {
                    this.updateSPDependentSettings();
                }
            });
        });
    }
    
    bindDragEvents() {
        const draggableRows = document.querySelectorAll('tr[draggable="true"]');
        
        draggableRows.forEach(row => {
            row.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', row.dataset.type + (row.dataset.index || ''));
                row.style.opacity = '0.5';
            });
            
            row.addEventListener('dragend', () => {
                row.style.opacity = '1';
            });
            
            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                row.style.background = 'rgba(139, 0, 0, 0.1)';
            });
            
            row.addEventListener('dragleave', () => {
                row.style.background = '';
            });
            
            row.addEventListener('drop', (e) => {
                e.preventDefault();
                row.style.background = '';
                
                const draggedType = e.dataTransfer.getData('text/plain');
                const targetType = row.dataset.type;
                
                if (draggedType !== targetType) {
                    this.swapRowCoordinates(draggedType, targetType);
                }
            });
        });
    }
    
    swapRowCoordinates(type1, type2) {
        const id1 = type1.startsWith('tp') ? type1 : type1.toLowerCase();
        const id2 = type2.startsWith('tp') ? type2 : type2.toLowerCase();
        
        const x1 = document.getElementById(`${id1}_x`).value;
        const y1 = document.getElementById(`${id1}_y`).value;
        const x2 = document.getElementById(`${id2}_x`).value;
        const y2 = document.getElementById(`${id2}_y`).value;
        
        document.getElementById(`${id1}_x`).value = x2;
        document.getElementById(`${id1}_y`).value = y2;
        document.getElementById(`${id2}_x`).value = x1;
        document.getElementById(`${id2}_y`).value = y1;
        
        this.autoCalculate();
        this.updateMapFromTable();
        this.showNotification(`Поміняно місцями ${type1.toUpperCase()} ↔ ${type2.toUpperCase()}`);
    }
    
    updateMapFromTable() {
        const points = this.getPoints();
        console.log('Points for polygon:', points, 'Projection:', this.currentProjection);
        
        if (points.length > 0 && this.currentProjection) {
            this.drawPolygon(points);
            
            const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP')).map(p => p.coords);
            if (polygonPoints.length >= 3) {
                this.calculateResults(polygonPoints);
            }
        } else if (!this.currentProjection) {
            this.showError('Оберіть систему координат (UTM Zone)');
        }
    }

    calculate() {
        this.autoCalculate();
        
        if (!this.currentProjection) {
            this.showError('Оберіть систему координат');
            return;
        }

        const points = this.getPoints();
        if (points.length < 3) {
            this.showError('Потрібно мінімум 3 точки');
            return;
        }

        this.drawPolygon(points);
        
        const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP')).map(p => p.coords);
        this.calculateResults(polygonPoints);
        this.clearError();
    }

    getPoints() {
        const points = [];
        
        const lmX = parseFloat(document.getElementById('lm_x').value);
        const lmY = parseFloat(document.getElementById('lm_y').value);
        if (!isNaN(lmX) && !isNaN(lmY)) points.push({coords: [lmX, lmY], type: 'LM'});
        
        const bmX = parseFloat(document.getElementById('bm_x').value);
        const bmY = parseFloat(document.getElementById('bm_y').value);
        if (!isNaN(bmX) && !isNaN(bmY)) points.push({coords: [bmX, bmY], type: 'BM'});
        
        const spX = parseFloat(document.getElementById('sp_x').value);
        const spY = parseFloat(document.getElementById('sp_y').value);
        if (!isNaN(spX) && !isNaN(spY)) points.push({coords: [spX, spY], type: 'SP'});

        for (let i = 1; i <= this.pointCount; i++) {
            const x = parseFloat(document.getElementById(`tp${i}_x`).value);
            const y = parseFloat(document.getElementById(`tp${i}_y`).value);
            if (!isNaN(x) && !isNaN(y)) points.push({coords: [x, y], type: `TP${i}`});
        }

        return points;
    }

    showExportMenu() {
        this.syncPolygonWithMarkers(); // Синхронізуємо перед показом меню
        const siteName = document.getElementById('siteName')?.value?.trim() || 'polygon';
        const points = this.getPoints();
        
        if (points.length === 0) {
            this.showError('Немає даних для експорту');
            return;
        }
        
        // Видаляємо старі модальні вікна
        document.querySelectorAll('[style*="z-index: 10000"]').forEach(el => el.remove());
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;';
        
        const content = document.createElement('div');
        content.style.cssText = 'background: #1a1a1a; padding: 30px; border-radius: 8px; border: 1px solid #444; text-align: center; max-width: 450px;';
        
        content.innerHTML = `
            <h3 style="color: #8B0000; margin-bottom: 30px;">📤 Експорт даних</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
                <button id="exportCSVBtn" style="padding: 15px; background: #8B0000; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">📊 CSV</button>
                <button id="exportTSVBtn" style="padding: 15px; background: #8B0000; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">📋 TSV</button>
                <button id="exportTXTBtn" style="padding: 15px; background: #8B0000; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">📄 TXT</button>
                <button id="exportKMLBtn" style="padding: 15px; background: #8B0000; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">🗺️ KML</button>
                <button id="exportQGISBtn" style="padding: 15px; background: #8B0000; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">🗂️ QGIS</button>
                <button id="exportArcGISBtn" style="padding: 15px; background: #8B0000; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">🗃️ ArcGIS</button>
                <button id="exportPNGBtn" style="padding: 15px; background: #8B0000; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">🖼️ PNG</button>

            </div>
            <button id="cancelExportBtn" style="padding: 12px 30px; background: #666; border: none; border-radius: 6px; color: white; cursor: pointer; width: 100%;">❌ Закрити</button>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Обробники подій
        document.getElementById('exportCSVBtn').onclick = () => { 
            this.exportCSV(points, siteName);
            modal.remove(); 
        };
        document.getElementById('exportTSVBtn').onclick = () => { 
            this.exportTSV(points, siteName);
            modal.remove(); 
        };
        document.getElementById('exportTXTBtn').onclick = () => { 
            this.exportTXT(points, siteName);
            modal.remove(); 
        };
        document.getElementById('exportKMLBtn').onclick = () => { 
            this.exportKML(points, siteName);
            modal.remove(); 
        };
        document.getElementById('exportQGISBtn').onclick = () => { 
            modal.remove(); 
            this.showQGISMenu(points, siteName); 
        };
        document.getElementById('exportArcGISBtn').onclick = () => { 
            modal.remove(); 
            this.showArcGISMenu(points, siteName); 
        };
        document.getElementById('exportPNGBtn').onclick = () => { 
            if (this.pngExport) {
                this.pngExport.exportPNG(points, siteName);
            } else {
                this.showNotification('PNG експорт недоступний');
            }
            modal.remove(); 
        };

        document.getElementById('cancelExportBtn').onclick = () => modal.remove();
        
        // Закриття по кліку поза модальним вікном
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        content.onclick = (e) => e.stopPropagation();
    }

    // Делегуємо методи до модулів
    autoCalculate() {
        if (this.calculationsModule) {
            this.calculationsModule.autoCalculate();
        }
    }

    // Автоматичний перерахунок тільки якщо є дані
    autoCalculateIfNeeded() {
        const points = this.getPoints();
        if (points.length >= 3) {
            this.autoCalculate();
        }
    }

    updateAreaDisplay() {
        if (this.calculationsModule) {
            this.calculationsModule.updateAreaDisplay();
        } else {
            const unit = document.getElementById('areaUnit').value;
            const areaElement = document.getElementById('area');
            
            if (!this.currentArea) {
                areaElement.textContent = '0';
                return;
            }
            
            switch(unit) {
                case 'm2':
                    areaElement.textContent = this.currentArea.toFixed(2) + ' м²';
                    break;
                case 'ha':
                    areaElement.textContent = (this.currentArea / 10000).toFixed(4) + ' га';
                    break;
                case 'km2':
                    areaElement.textContent = (this.currentArea / 1000000).toFixed(6) + ' км²';
                    break;
                case 'acres':
                    areaElement.textContent = (this.currentArea / 4047).toFixed(4) + ' акрів';
                    break;
            }
        }
    }

    showError(message) {
        if (this.uiHelpers) {
            this.uiHelpers.showError(message);
        } else {
            console.error(message);
        }
    }

    showNotification(message) {
        if (this.uiHelpers) {
            this.uiHelpers.showNotification(message);
        } else {
            console.log(message);
        }
    }

    clearError() {
        if (this.uiHelpers) {
            this.uiHelpers.clearError();
        }
    }

    copyRow(button) {
        if (this.uiHelpers) {
            this.uiHelpers.copyRow(button);
        }
    }

    copyTable() {
        if (this.uiHelpers) {
            this.uiHelpers.copyTable();
        }
    }

    // Fallback методи
    reset() {
        document.querySelectorAll('input[type="number"]').forEach(input => input.value = '');
        document.getElementById('siteName').value = '';
        if (this.polygon) this.map.removeLayer(this.polygon);
        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];
        this.currentArea = 0;
        document.getElementById('area').textContent = '0';
        document.getElementById('perimeter').textContent = '0';
        document.getElementById('closureError').textContent = '0';
        this.showNotification('Дані очищено');
    }

    drawPolygon(points) {
        if (this.polygon) this.map.removeLayer(this.polygon);
        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];

        if (points.length < 1 || !this.currentProjection) {
            if (!this.currentProjection) {
                this.showError('Оберіть систему координат (UTM Zone)');
            }
            return;
        }

        try {
            // Конвертуємо всі точки в lat/lng з правильною прив'язкою
            const convertedPoints = [];
            
            points.forEach((point) => {
                if (!point.coords || point.coords.length < 2) return;
                
                let latLng;
                try {
                    if (window.proj4 && this.currentProjection) {
                                // Правильна конвертація UTM -> WGS84
                        const converted = proj4(this.currentProjection, 'EPSG:4326', [point.coords[0], point.coords[1]]);
                        latLng = [converted[1], converted[0]]; // lat, lng
                        console.log(`✅ ${point.type}: UTM(${point.coords[0]}, ${point.coords[1]}) -> LatLng(${converted[1]}, ${converted[0]})`);
                    } else {
                        // Покращений fallback для UTM координат України
                        const zone = parseInt(this.getUTMZone()) || 36;
                        const centralMeridian = (zone - 1) * 6 - 180 + 3;
                        
                        // Fallback конвертація - перевіряємо чи це вже lat/lng
                        if (point.coords[0] > -180 && point.coords[0] < 180 && point.coords[1] > -90 && point.coords[1] < 90) {
                            // Це вже lat/lng
                            latLng = [point.coords[1], point.coords[0]];
                        } else {
                            // UTM координати
                            const x = point.coords[0];
                            const y = point.coords[1];
                            const lat = ((y - 5500000) / 111320) + 50.4;
                            const lng = ((x - 500000) / (111320 * Math.cos(lat * Math.PI / 180))) + centralMeridian;
                            latLng = [lat, lng];
                        }
                        console.log(`⚠️ ${point.type}: Fallback UTM(${point.coords[0]}, ${point.coords[1]}) -> LatLng(${latLng[0]}, ${latLng[1]})`);
                    }
                } catch (e) {
                    console.warn('Conversion error for:', point.type, e);
                    return;
                }
                
                if (latLng && !isNaN(latLng[0]) && !isNaN(latLng[1])) {
                    convertedPoints.push({
                        ...point,
                        latLng: latLng,
                        utmCoords: [point.coords[0], point.coords[1]] // Зберігаємо оригінальні UTM
                    });
                }
            });
            
            // Зберігаємо координати для подальшого використання
            this.convertedPoints = convertedPoints;
            
            // Створюємо полігон ПІСЛЯ створення всіх маркерів
            const polygonMarkers = [];
            
            // Малюємо маркери точно на координатах
            convertedPoints.forEach((point, index) => {
                // Використовуємо MarkerDesign для створення кастомних іконок
                const marker = L.marker(point.latLng, {
                    icon: window.MarkerDesign ? window.MarkerDesign.getMarkerIcon(point) : L.divIcon({
                        html: '<div style="width:12px;height:12px;background:#dc2626;border:2px solid #000;border-radius:50%;"></div>',
                        className: 'custom-marker',
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    }),
                    draggable: true
                }).addTo(this.map);
                
                // Додаємо підпис
                marker.bindTooltip(point.type, {
                    permanent: true,
                    direction: 'top',
                    offset: [0, -15],
                    className: 'marker-tooltip-small'
                });
                
                // Зберігаємо дані точки в маркері
                marker.pointType = point.type;
                marker.pointIndex = index;
                marker.utmCoords = point.utmCoords;
                
                        // Прив'язка обробників для синхронізації з таблицею
                marker.on('dragend', () => {
                    const newLatLng = marker.getLatLng();
                    let utmCoords;
                    
                    try {
                        if (window.proj4 && this.currentProjection) {
                            utmCoords = proj4('EPSG:4326', this.currentProjection, [newLatLng.lng, newLatLng.lat]);
                        } else {
                            const zone = parseInt(this.getUTMZone()) || 36;
                            const centralMeridian = (zone - 1) * 6 - 180 + 3;
                            const x = ((newLatLng.lng - centralMeridian) / (111320 * Math.cos(newLatLng.lat * Math.PI / 180))) * 111320 + 500000;
                            const y = (newLatLng.lat - 50.4) * 111320 + 5500000;
                            utmCoords = [x, y];
                        }
                        
                        // Оновлюємо таблицю
                        const inputPrefix = point.type.toLowerCase();
                        const xInput = document.getElementById(`${inputPrefix}_x`);
                        const yInput = document.getElementById(`${inputPrefix}_y`);
                        
                        if (xInput && yInput) {
                            xInput.value = Math.round(utmCoords[0]);
                            yInput.value = Math.round(utmCoords[1]);
                        }
                        
                        // Оновлюємо полігон миттєво
                        if (this.polygon) {
                            const newCoords = this.markers
                                .filter(m => m.pointType === 'SP' || m.pointType.startsWith('TP'))
                                .sort((a, b) => {
                                    if (a.pointType === 'SP') return -1;
                                    if (b.pointType === 'SP') return 1;
                                    const aNum = parseInt(a.pointType.replace('TP', '')) || 0;
                                    const bNum = parseInt(b.pointType.replace('TP', '')) || 0;
                                    return aNum - bNum;
                                })
                                .map(m => m.getLatLng());
                            this.polygon.setLatLngs(newCoords);
                        }
                        
                    } catch (e) {
                        console.error('Error updating coordinates:', e);
                    }
                });
                
                marker.bindPopup(`
                    <div style="font-family: Arial; min-width: 200px;">
                        <h4 style="margin: 0 0 10px 0; color: #8B0000;">${point.type}</h4>
                        <div><strong>Координати UTM:</strong></div>
                        <div>X: ${point.utmCoords[0].toFixed(2)}</div>
                        <div>Y: ${point.utmCoords[1].toFixed(2)}</div>
                        <div><strong>Lat/Lng:</strong></div>
                        <div>Lat: ${point.latLng[0].toFixed(6)}</div>
                        <div>Lng: ${point.latLng[1].toFixed(6)}</div>
                    </div>
                `);
                
                this.markers.push(marker);
                
                // Збираємо маркери для полігону (тільки SP та TP)
                if (point.type === 'SP' || point.type.startsWith('TP')) {
                    polygonMarkers.push(marker);
                }
            });
            
            // Створюємо полігон тільки з SP та TP
            if (polygonMarkers.length >= 3) {
                // Сортуємо маркери: SP перший, потім TP1, TP2...
                polygonMarkers.sort((a, b) => {
                    if (a.pointType === 'SP') return -1;
                    if (b.pointType === 'SP') return 1;
                    const aNum = parseInt(a.pointType.replace('TP', '')) || 0;
                    const bNum = parseInt(b.pointType.replace('TP', '')) || 0;
                    return aNum - bNum;
                });
                
                // Створюємо полігон точно по координатах маркерів
                const polygonLatLngs = [];
                polygonMarkers.forEach(m => {
                    const pos = m.getLatLng();
                    polygonLatLngs.push([pos.lat, pos.lng]);
                    console.log(`📍 ${m.pointType}: ${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`);
                });
                
                // Примусово синхронізуємо полігон з маркерами
                this.polygon = L.polygon(polygonLatLngs, {
                    color: '#dc2626',
                    weight: 3,
                    fillColor: '#dc2626',
                    fillOpacity: 0.15
                }).addTo(this.map);
                
                // Обробник синхронізації при переміщенні маркерів
                polygonMarkers.forEach(marker => {
                    marker.on('drag', () => {
                        const newCoords = polygonMarkers.map(m => m.getLatLng());
                        this.polygon.setLatLngs(newCoords);
                    });
                });
                
                console.log('✅ Полігон синхронізовано з', polygonMarkers.length, 'маркерами');
            }
            
            // Приближаємо до всіх об'єктів
            const allObjects = [...this.markers];
            if (this.polygon) allObjects.push(this.polygon);
            
            if (allObjects.length > 0) {
                const group = new L.featureGroup(allObjects);
                this.map.fitBounds(group.getBounds().pad(0.1));
            }
            
            console.log(`✅ Відображено: ${this.markers.length} маркерів, полігон: ${this.polygon ? 'так' : 'ні'}`);
            
        } catch (error) {
            console.error('Помилка відображення:', error);
            console.error('Поточна проекція:', this.currentProjection);
            console.error('Координати точок:', points.map(p => `${p.type}: ${p.coords[0]}, ${p.coords[1]}`));
            this.showError('Помилка відображення на карті');
        }
    }

    getMarkerHtml(type) {
        return '<div style="width:12px;height:12px;background:#dc2626;border:2px solid #000;border-radius:50%;"></div>';
    }

    calculateResults(polygonPoints) {
        if (polygonPoints.length < 3) return;
        
        try {
            // Використовуємо shoelace formula для UTM координат
            let area = 0;
            let perimeter = 0;
            
            for (let i = 0; i < polygonPoints.length; i++) {
                const j = (i + 1) % polygonPoints.length;
                
                // Площа
                area += polygonPoints[i][0] * polygonPoints[j][1];
                area -= polygonPoints[j][0] * polygonPoints[i][1];
                
                // Периметр
                const dx = polygonPoints[j][0] - polygonPoints[i][0];
                const dy = polygonPoints[j][1] - polygonPoints[i][1];
                perimeter += Math.sqrt(dx * dx + dy * dy);
            }
            
            this.currentArea = Math.abs(area) / 2;
            
            this.updateAreaDisplay();
            document.getElementById('perimeter').textContent = perimeter.toFixed(1) + ' м';
            
            const closureError = this.calculateClosureError(polygonPoints);
            document.getElementById('closureError').textContent = closureError.toFixed(3) + ' %';
            
        } catch (error) {
            console.error('Calculation error:', error);
            this.showError('Помилка розрахунків');
        }
    }

    calculateClosureError(polygonPoints) {
        if (polygonPoints.length < 3) return 0;
        
        let sumX = 0, sumY = 0;
        for (let i = 0; i < polygonPoints.length; i++) {
            const j = (i + 1) % polygonPoints.length;
            const dx = polygonPoints[j][0] - polygonPoints[i][0];
            const dy = polygonPoints[j][1] - polygonPoints[i][1];
            sumX += dx;
            sumY += dy;
        }
        
        const closureDistance = Math.sqrt(sumX * sumX + sumY * sumY);
        let totalPerimeter = 0;
        for (let i = 0; i < polygonPoints.length; i++) {
            const j = (i + 1) % polygonPoints.length;
            const dx = polygonPoints[j][0] - polygonPoints[i][0];
            const dy = polygonPoints[j][1] - polygonPoints[i][1];
            totalPerimeter += Math.sqrt(dx * dx + dy * dy);
        }
        
        return totalPerimeter > 0 ? (closureDistance / totalPerimeter) * 100 : 0;
    }

    onMapClick(e) {
        // Просто логуємо клік
        console.log('🖱️ Map clicked at:', e.latlng);
    }

    updateMarkersVisibility() {
        const zoom = this.map.getZoom();
        
        this.markers.forEach(marker => {
            if (zoom < 12) { // ~3км
                marker.setOpacity(0);
                if (marker.getTooltip()) marker.closeTooltip();
            } else if (zoom < 14) { // ~2км
                marker.setOpacity(1);
                if (marker.getTooltip()) marker.closeTooltip();
            } else {
                marker.setOpacity(1);
                if (marker.getTooltip()) marker.openTooltip();
            }
        });
        
        // Анімована точка по центру при віддаленні
        if (zoom < 12 && this.polygon && !this.centerMarker) {
            const center = this.polygon.getBounds().getCenter();
            this.centerMarker = L.circleMarker(center, {
                radius: 8,
                fillColor: '#dc2626',
                color: '#000',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(this.map);
            
            // Анімація пульсації
            let growing = true;
            this.centerAnimation = setInterval(() => {
                const currentRadius = this.centerMarker.getRadius();
                if (growing) {
                    this.centerMarker.setRadius(currentRadius + 1);
                    if (currentRadius >= 12) growing = false;
                } else {
                    this.centerMarker.setRadius(currentRadius - 1);
                    if (currentRadius <= 6) growing = true;
                }
            }, 200);
        } else if (zoom >= 12 && this.centerMarker) {
            this.map.removeLayer(this.centerMarker);
            this.centerMarker = null;
            if (this.centerAnimation) {
                clearInterval(this.centerAnimation);
                this.centerAnimation = null;
            }
        }
    }



    showHistory() {
        console.log('Fallback showHistory');
    }

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                
                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(content);
                    this.processJSONImport(data);
                } else if (file.name.endsWith('.kml')) {
                    const parser = new DOMParser();
                    const kml = parser.parseFromString(content, 'text/xml');
                    this.importKMLPoints(kml, false); // false = тільки точки
                }
            } catch (err) {
                this.showError('Помилка імпорту: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    autoSave() {
        // Fallback автозбереження
        const siteName = document.getElementById('siteName')?.value?.trim();
        if (siteName && this.basicMethods) {
            this.basicMethods.autoSave();
        }
    }

    loadAutoSave() {
        // Fallback завантаження - нічого не робимо
    }

    showSettings() {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;';
        
        const content = document.createElement('div');
        content.style.cssText = 'background: #1a1a1a; padding: 30px; border-radius: 8px; border: 1px solid #444; max-width: 800px; max-height: 80vh; overflow-y: auto;';
        
        const status = window.libraryLoader ? window.libraryLoader.getStatus() : {};
        
        let librariesHtml = '';
        Object.keys(status).forEach(key => {
            const lib = status[key];
            const statusIcon = lib.loaded ? '✅' : '❌';
            const statusText = lib.loaded ? 'Завантажено' : 'Не завантажено';
            const buttonText = lib.loaded ? 'Перезавантажити' : 'Завантажити';
            
            librariesHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin: 5px 0; background: #2a2a2a; border-radius: 5px;">
                    <div>
                        <span style="margin-right: 10px;">${statusIcon}</span>
                        <strong style="color: #fff;">${lib.name}</strong>
                        <div style="font-size: 12px; color: #888;">${statusText}</div>
                    </div>
                    <button onclick="window.reloadLibrary('${key}', this)" style="padding: 5px 15px; background: #8B0000; border: none; border-radius: 4px; color: white; cursor: pointer;">${buttonText}</button>
                </div>
            `;
        });
        
        content.innerHTML = `
            <h3 style="color: #8B0000; margin-bottom: 20px; text-align: center;">⚙️ Налаштування бібліотек</h3>
            <div style="margin-bottom: 20px;">
                <h4 style="color: #fff; margin-bottom: 15px;">Статус бібліотек:</h4>
                ${librariesHtml}
            </div>
            <div style="text-align: center; margin: 20px 0;">
                <button onclick="window.reloadAllLibraries()" style="padding: 10px 20px; background: #4CAF50; border: none; border-radius: 6px; color: white; cursor: pointer; margin-right: 10px;">🔄 Перезавантажити всі</button>
                <button onclick="window.checkLibrariesStatus()" style="padding: 10px 20px; background: #2196F3; border: none; border-radius: 6px; color: white; cursor: pointer;">🔍 Перевірити статус</button>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="padding: 12px 25px; background: #666; border: none; border-radius: 6px; color: white; cursor: pointer; width: 100%;">✕ Закрити</button>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    showImportMenu() {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;';
        
        const content = document.createElement('div');
        content.style.cssText = 'background: #1a1a1a; padding: 30px; border-radius: 8px; border: 1px solid #444; text-align: center;';
        
        content.innerHTML = `
            <h3 style="color: #dc2626; margin-bottom: 20px;">Оберіть тип імпорту</h3>
            <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
                <button onclick="document.getElementById('import').click(); this.parentElement.parentElement.parentElement.remove();" style="padding: 15px; background: #dc2626; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    📍 Імпорт точок KML
                </button>
                <button onclick="document.getElementById('importPolygon').click(); this.parentElement.parentElement.parentElement.remove();" style="padding: 15px; background: #dc2626; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    🔺 Імпорт полігону KML
                </button>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="padding: 10px 20px; background: #666; border: none; border-radius: 4px; color: white; cursor: pointer;">Скасувати</button>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    importPolygon(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                const parser = new DOMParser();
                const kml = parser.parseFromString(content, 'text/xml');
                
                // Шукаємо полігон
                const polygons = kml.querySelectorAll('Polygon coordinates');
                if (polygons.length > 0) {
                    this.importKMLPolygon(polygons[0], file.name);
                } else {
                    // Немає полігону - шукаємо точки
                    const points = kml.querySelectorAll('Point coordinates');
                    if (points.length >= 3) {
                        this.importKMLPoints(kml, true); // true = створити полігон
                    } else {
                        this.showError('Не знайдено полігон або достатньо точок');
                    }
                }
            } catch (error) {
                this.showError('Помилка імпорту: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    importTable(e) {
        this.showNotification('Імпорт таблиці...');
    }

    importKMLPoints(kml, createPolygon = false) {
        const placemarks = kml.querySelectorAll('Placemark');
        const foundPoints = [];
        
        placemarks.forEach(placemark => {
            const name = placemark.querySelector('name')?.textContent?.trim() || '';
            const coords = placemark.querySelector('Point coordinates')?.textContent?.trim();
            
            if (coords) {
                const parts = coords.split(',');
                if (parts.length >= 2) {
                    const lng = parseFloat(parts[0]);
                    const lat = parseFloat(parts[1]);
                    if (!isNaN(lng) && !isNaN(lat)) {
                        let utmCoords;
                        if (this.currentProjection && window.proj4) {
                            utmCoords = proj4('EPSG:4326', this.currentProjection, [lng, lat]);
                        } else {
                            utmCoords = [lng, lat];
                        }
                        foundPoints.push({ name, coords: utmCoords });
                    }
                }
            }
        });
        
        if (foundPoints.length === 0) {
            this.showError('Не знайдено точок у KML');
            return;
        }
        
        // Пробуємо розпізнати типи точок
        const pointTypes = this.recognizePointTypes(foundPoints);
        
        if (createPolygon && pointTypes.length >= 3) {
            this.askForSPPoint(pointTypes);
        } else {
            this.assignPointsToTable(pointTypes);
        }
    }
    
    recognizePointTypes(points) {
        const recognized = [];
        const knownTypes = ['SP', 'TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'BM', 'LM', 'СП', 'ТП1', 'ТП2', 'БМ', 'ЛМ'];
        
        points.forEach(point => {
            let type = null;
            const name = point.name.toUpperCase();
            
            // Пряме співпадіння
            if (knownTypes.includes(name)) {
                type = name.startsWith('ТП') ? name.replace('ТП', 'TP') : 
                      name === 'СП' ? 'SP' : 
                      name === 'БМ' ? 'BM' : 
                      name === 'ЛМ' ? 'LM' : name;
            } else {
                // Пошук по частині назви (англ, укр, рус)
                if (name.includes('SP') || name.includes('START') || name.includes('СП') || name.includes('ПОЧАТК') || name.includes('НАЧАЛЬ')) type = 'SP';
                else if (name.includes('BM') || name.includes('BASE') || name.includes('БМ') || name.includes('БАЗОВ') || name.includes('ОПОРН')) type = 'BM';
                else if (name.includes('LM') || name.includes('LANDMARK') || name.includes('ЛМ') || name.includes('ОРІЄНТИР') || name.includes('ОРИЕНТИР')) type = 'LM';
                else if (name.includes('TP') || name.includes('TURN') || name.includes('ТП') || name.includes('ПОВОРОТ') || name.includes('ТОЧКА')) {
                    const num = name.match(/\d+/);
                    type = num ? `TP${num[0]}` : 'TP1';
                }
            }
            
            recognized.push({ ...point, type: type || `Point_${recognized.length + 1}` });
        });
        
        return recognized;
    }
    
    askForSPPoint(points) {
        const spPoint = points.find(p => p.type === 'SP');
        if (spPoint) {
            this.assignPointsToTable(points);
            return;
        }
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;';
        
        const content = document.createElement('div');
        content.style.cssText = 'background: #1a1a1a; padding: 20px; border-radius: 8px; border: 1px solid #444; max-width: 800px; display: flex; gap: 20px;';
        
        let html = `
            <div style="flex: 1;">
                <h3 style="color: #8B0000; margin-bottom: 20px;">Оберіть початкову точку (SP):</h3>
                <div style="margin-bottom: 20px;">`;
        
        points.forEach((point, i) => {
            html += `<button onclick="window.calculator.setSPPoint(${i})" style="display: block; width: 100%; padding: 10px; margin: 5px 0; background: #8B0000; border: none; border-radius: 4px; color: white; cursor: pointer;">${point.name}</button>`;
        });
        
        html += `</div>
                <button onclick="this.parentElement.parentElement.remove()" style="display: block; width: 100%; padding: 10px; background: #666; border: none; border-radius: 4px; color: white; cursor: pointer;">Скасувати</button>
            </div>
            <div style="flex: 1;">
                <div id="preview-map" style="width: 350px; height: 300px; border: 2px solid #444; border-radius: 6px;"></div>
            </div>
        `;
        
        content.innerHTML = html;
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        setTimeout(() => this.createPreviewMap(points), 100);
        this.tempPoints = points;
    }
    
    setSPPoint(index) {
        if (this.tempPoints) {
            this.tempPoints[index].type = 'SP';
            // Перенумеровуємо інші точки
            let tpIndex = 1;
            this.tempPoints.forEach((point, i) => {
                if (i !== index && !['BM', 'LM'].includes(point.type)) {
                    point.type = `TP${tpIndex++}`;
                }
            });
            
            this.assignPointsToTable(this.tempPoints);
            document.querySelectorAll('[style*="z-index: 10000"]').forEach(el => el.remove());
            if (this.previewMap) {
                this.previewMap.remove();
                this.previewMap = null;
            }
            this.tempPoints = null;
        }
    }
    
    createPreviewMap(points) {
        try {
            this.previewMap = L.map('preview-map').setView([50.4, 30.5], 10);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.previewMap);
            
            const markers = [];
            points.forEach((point, i) => {
                if (this.currentProjection && window.proj4) {
                    const latLng = proj4(this.currentProjection, 'EPSG:4326', point.coords);
                    const marker = L.marker([latLng[1], latLng[0]], {
                        icon: L.divIcon({
                            html: `<div style="background: #dc2626; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 10px; border: 2px solid #000;">${i + 1}</div>`,
                            className: 'preview-marker',
                            iconSize: [24, 24],
                            iconAnchor: [12, 12]
                        })
                    }).addTo(this.previewMap);
                    
                    marker.bindTooltip(`${i + 1}: ${point.name}`, { permanent: true, direction: 'top' });
                    markers.push(marker);
                }
            });
            
            if (markers.length > 0) {
                const group = new L.featureGroup(markers);
                this.previewMap.fitBounds(group.getBounds(), { padding: [20, 20] });
                
                // Малюємо полігон
                if (points.length >= 3) {
                    const polygonLatLngs = points.map(p => {
                        const latLng = proj4(this.currentProjection, 'EPSG:4326', p.coords);
                        return [latLng[1], latLng[0]];
                    });
                    
                    L.polygon(polygonLatLngs, {
                        color: '#dc2626',
                        weight: 2,
                        fillColor: '#dc2626',
                        fillOpacity: 0.1
                    }).addTo(this.previewMap);
                }
            }
        } catch (error) {
            console.error('Preview map error:', error);
        }
    }
    
    assignPointsToTable(points) {
        // Оновлюємо кількість точок
        const tpPoints = points.filter(p => p.type.startsWith('TP')).length;
        if (tpPoints > 0 && tpPoints !== this.pointCount) {
            this.pointCount = tpPoints;
            document.getElementById('pointCount').value = tpPoints;
            this.generateTable();
        }
        
        setTimeout(() => {
            points.forEach(point => {
                const type = point.type.toLowerCase();
                const xInput = document.getElementById(`${type}_x`);
                const yInput = document.getElementById(`${type}_y`);
                if (xInput && yInput) {
                    xInput.value = Math.round(point.coords[0]);
                    yInput.value = Math.round(point.coords[1]);
                }
            });
            
            this.autoCalculate();
            this.calculate();
            setTimeout(() => this.goToSP(), 300);
            
            this.showNotification(`Завантажено ${points.length} точок`);
        }, 100);
    }
    
    importKMLPolygon(polygonCoords, fileName) {
        const coordText = polygonCoords.textContent.trim();
        const coordPairs = coordText.split(/[\s\n\r]+/).filter(pair => pair.trim());
        const points = [];
        
        coordPairs.forEach(pair => {
            const parts = pair.split(',');
            if (parts.length >= 2) {
                const lng = parseFloat(parts[0]);
                const lat = parseFloat(parts[1]);
                if (!isNaN(lng) && !isNaN(lat)) {
                    let utmCoords;
                    if (this.currentProjection && window.proj4) {
                        utmCoords = proj4('EPSG:4326', this.currentProjection, [lng, lat]);
                    } else {
                        utmCoords = [lng, lat];
                    }
                    points.push({ coords: utmCoords, name: `Point_${points.length + 1}` });
                }
            }
        });
        
        // Видаляємо останню точку якщо вона дублює першу (замикання полігону)
        if (points.length > 3) {
            const first = points[0].coords;
            const last = points[points.length - 1].coords;
            const distance = Math.sqrt(Math.pow(first[0] - last[0], 2) + Math.pow(first[1] - last[1], 2));
            if (distance < 1) { // Менше 1 метра
                points.pop();
            }
        }
        
        if (points.length >= 3) {
            this.askForSPPoint(points);
        } else {
            this.showError('Недостатньо точок у полігоні');
        }
    }
    
    processJSONImport(data) {
        const points = data.points || [];
        if (points.length === 0) {
            this.showError('Немає даних для імпорту');
            return;
        }
        
        const neededPoints = points.length - 3;
        if (neededPoints > 0 && neededPoints !== this.pointCount) {
            this.pointCount = neededPoints;
            document.getElementById('pointCount').value = neededPoints;
            this.generateTable();
        }
        
        const inputs = ['lm', 'bm', 'sp', ...Array.from({length: this.pointCount}, (_, j) => `tp${j+1}`)];
        inputs.forEach((input, i) => {
            const xInput = document.getElementById(`${input}_x`);
            const yInput = document.getElementById(`${input}_y`);
            if (xInput && yInput && points[i]) {
                xInput.value = Math.round(points[i][0]);
                yInput.value = Math.round(points[i][1]);
            }
        });
        
        setTimeout(() => {
            this.autoCalculate();
            this.calculate();
            setTimeout(() => this.goToSP(), 300);
            this.showNotification(`Завантажено ${points.length} точок`);
        }, 200);
    }
    
    importShapefile(e) {
        this.showNotification('Імпорт Shapefile...');
    }

    diagnoseClosure() {
        this.showNotification('Діагностика замикання...');
    }

    // Методи toggleSidebar перенесені в окремий модуль simple-toggle.js

    showLicense() {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;';
        
        const content = document.createElement('div');
        content.style.cssText = 'background: #1a1a1a; padding: 30px; border-radius: 8px; border: 1px solid #444; max-width: 700px; max-height: 80vh; overflow-y: auto;';
        
        content.innerHTML = `
            <h3 style="color: #8B0000; margin-bottom: 20px; text-align: center;">📄 Ліцензія користування</h3>
            <div style="color: #ccc; line-height: 1.6; text-align: left;">
                <h4 style="color: #8B0000;">Умови використання FieldCalc</h4>
                <p><strong>1. Призначення:</strong><br>
                Цей калькулятор створено для геодезичних розрахунків, визначення площ та периметрів земельних ділянок.</p>
                
                <p><strong>2. Відповідальність:</strong><br>
                • Використовуйте програму на власний ризик<br>
                • Обов'язково перевіряйте результати додатковими методами<br>
                • Автор не несе відповідальності за помилки в розрахунках</p>
                
                <p><strong>3. Точність:</strong><br>
                • Програма використовує стандартні геодезичні формули<br>
                • Рекомендується перевірка професійним геодезистом<br>
                • Похибка може виникати через округлення координат</p>
                
                <p><strong>4. Використання даних:</strong><br>
                • Всі розрахунки виконуються локально в браузері<br>
                • Координати не передаються на сервер<br>
                • Дані зберігаються тільки в локальному сховищі браузера</p>
                
                <p><strong>5. Авторські права:</strong><br>
                • Автор: Illia Usachov<br>
                • Ідея: The Halo Trust<br>
                • Контакт: +380 98 008 84 15</p>
                
                <p style="margin-top: 20px; padding: 15px; background: #2a2a2a; border-radius: 5px;">
                <strong>⚠️ ВАЖЛИВО:</strong> Цей інструмент призначений для попередніх розрахунків. 
                Для офіційних документів обов'язково звертайтесь до ліцензованих геодезистів.
                </p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="padding: 12px 25px; background: #8B0000; border: none; border-radius: 6px; color: white; cursor: pointer; width: 100%; margin-top: 20px;">Прийняти та закрити</button>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    loadProject(index, isAutoSave = false) {
        if (this.basicMethods) {
            this.basicMethods.loadProject(index, isAutoSave);
        }
    }

    deleteProject(index) {
        if (this.basicMethods) {
            this.basicMethods.deleteProject(index);
        }
    }

    exportCSV(points, siteName) {
        let csv = 'Від,До,Азимут (Магнітний),Азимут (Істинний),Відстань (м),UTM X,UTM Y\n';
        
        const rows = document.querySelectorAll('.points-table tr');
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            const row = [];
            
            for (let j = 0; j < 7; j++) {
                const cell = cells[j];
                const input = cell?.querySelector('input');
                let value = input ? input.value : (cell?.textContent?.trim() || '');
                if (value === '-' || value === '') value = '';
                row.push(`"${value}"`);
            }
            
            csv += row.join(',') + '\n';
        }
        
        const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${siteName}.csv`;
        a.type = 'application/octet-stream';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        this.showNotification('✅ CSV експортовано');
    }
    
    exportTSV(points, siteName) {
        let tsv = 'Від\tДо\tАзимут (Магнітний)\tАзимут (Істинний)\tВідстань (м)\tUTM X\tUTM Y\n';
        
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
            
            tsv += row.join('\t') + '\n';
        }
        
        const blob = new Blob([tsv], {type: 'text/tab-separated-values;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${siteName}.tsv`;
        a.type = 'application/octet-stream';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        this.showNotification('✅ TSV експортовано');
    }

    exportTXT(points, siteName) {
        let txt = `Таблиця даних для ділянки: ${siteName}\n`;
        txt += '='.repeat(60) + '\n\n';
        
        const rows = document.querySelectorAll('.points-table tr');
        const headers = ['Від', 'До', 'Азимут (Магн.)', 'Азимут (Іст.)', 'Відстань (м)', 'UTM X', 'UTM Y'];
        
        txt += headers.map(h => h.padEnd(15)).join(' | ') + '\n';
        txt += '-'.repeat(headers.length * 18) + '\n';
        
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            const row = [];
            
            for (let j = 0; j < 7; j++) {
                const cell = cells[j];
                const input = cell?.querySelector('input');
                let value = input ? input.value : (cell?.textContent?.trim() || '');
                if (value === '-' || value === '') value = '';
                row.push(value.toString().padEnd(15));
            }
            
            txt += row.join(' | ') + '\n';
        }
        
        const blob = new Blob([txt], {type: 'text/plain;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${siteName}.txt`;
        a.type = 'application/octet-stream';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        this.showNotification('✅ TXT експортовано');
    }
    
    exportKML(points, siteName) {
        if (!points || points.length === 0) {
            this.showError('Немає точок для експорту');
            return;
        }
        
        let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
<name>${siteName}</name>
<description>Експорт з SRID калькулятора</description>
`;
        
        // Додаємо точки
        points.forEach(point => {
            if (point.coords && this.currentProjection) {
                try {
                    let latLng;
                    if (window.proj4) {
                        latLng = proj4(this.currentProjection, 'EPSG:4326', [point.coords[0], point.coords[1]]);
                    } else {
                        const zone = parseInt(this.getUTMZone()) || 36;
                        const centralMeridian = (zone - 1) * 6 - 180 + 3;
                        const lat = ((point.coords[1] - 5500000) / 111320) + 50.4;
                        const lng = ((point.coords[0] - 500000) / (111320 * Math.cos(lat * Math.PI / 180))) + centralMeridian;
                        latLng = [lng, lat];
                    }
                    
                    kml += `
<Placemark>
<name>${point.type}</name>
<description>UTM: ${point.coords[0].toFixed(2)}, ${point.coords[1].toFixed(2)}</description>
<Point>
<coordinates>${latLng[0]},${latLng[1]},0</coordinates>
</Point>
</Placemark>`;
                } catch (e) {
                    console.warn('KML export error for point:', point.type, e);
                }
            }
        });
        
        kml += '\n</Document>\n</kml>';
        
        const blob = new Blob([kml], {type: 'application/vnd.google-earth.kml+xml;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${siteName}.kml`;
        a.type = 'application/octet-stream';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        this.showNotification('✅ KML експортовано');
    }

    showKMLMenu(points, siteName) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;';
        
        const content = document.createElement('div');
        content.style.cssText = 'background: #1a1a1a; padding: 30px; border-radius: 8px; border: 1px solid #444; text-align: center; max-width: 400px;';
        
        content.innerHTML = `
            <h3 style="color: #8B0000; margin-bottom: 25px;">🗺️ KML Експорт</h3>
            <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 30px;">
                <button id="exportKMLPointsBtn" style="padding: 18px; background: #8B0000; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">📍 Точки</button>
                <button id="exportKMLPolygonBtn" style="padding: 18px; background: #8B0000; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">🔺 Полігон</button>
                <button id="exportKMLAllBtn" style="padding: 18px; background: #8B0000; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">📍🔺 Точки та Полігон</button>
            </div>
            <button id="closeKMLBtn" style="padding: 16px; background: #666; border: none; border-radius: 8px; color: white; cursor: pointer; width: 100%;">✕ Закрити</button>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        document.getElementById('exportKMLPointsBtn').onclick = () => { this.kmlExport.exportKML(points.filter(p => p.type !== 'polygon'), siteName + '_points'); modal.remove(); };
        document.getElementById('exportKMLPolygonBtn').onclick = () => { this.kmlExport.exportKML(points.filter(p => p.type === 'SP' || p.type.startsWith('TP')), siteName + '_polygon'); modal.remove(); };
        document.getElementById('exportKMLAllBtn').onclick = () => { this.kmlExport.exportKML(points, siteName); modal.remove(); };
        document.getElementById('closeKMLBtn').onclick = () => modal.remove();
    }

    showQGISMenu(points, siteName) {
        if (!this.currentProjection) {
            this.showError('Оберіть систему координат перед експортом');
            return;
        }
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;';
        
        const content = document.createElement('div');
        content.style.cssText = 'background: #1a1a1a; padding: 30px; border-radius: 8px; border: 1px solid #444; text-align: center; max-width: 500px;';
        
        content.innerHTML = `
            <h3 style="color: #8B0000; margin-bottom: 30px;">🗺️ QGIS Пакет</h3>
            <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 30px;">
                <button id="exportQGISPointsBtn" style="padding: 15px; background: #8B0000; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">📍 Точки (geojson)</button>
                <button id="exportQGISPolygonBtn" style="padding: 15px; background: #8B0000; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">🔺 Полігон (geojson)</button>

                <button id="exportQGISStylesBtn" style="padding: 15px; background: #8B0000; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">🎨 Стилі точок (.qml)</button>
                <button id="exportQGISInstructionBtn" style="padding: 15px; background: #8B0000; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">📄 Інструкція</button>
            </div>
            <button id="closeQGISBtn" style="padding: 18px; background: #666; border: none; border-radius: 10px; color: white; cursor: pointer; width: 100%;">✕ Закрити</button>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        document.getElementById('exportQGISPointsBtn').onclick = () => { this.qgisExport.exportPoints(points, siteName); modal.remove(); };
        document.getElementById('exportQGISPolygonBtn').onclick = () => { 
            console.log('Експорт полігону, точок:', points.length);
            this.qgisExport.exportPolygon(points, siteName); 
            modal.remove(); 
        };

        document.getElementById('exportQGISStylesBtn').onclick = () => { this.qgisExport.exportStyles(siteName); modal.remove(); };
        document.getElementById('exportQGISInstructionBtn').onclick = () => { this.qgisExport.exportInstruction(siteName); modal.remove(); };
        document.getElementById('closeQGISBtn').onclick = () => modal.remove();
    }

    showArcGISMenu(points, siteName) {
        if (!this.currentProjection) {
            this.showError('Оберіть систему координат перед експортом');
            return;
        }
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;';
        
        const content = document.createElement('div');
        content.style.cssText = 'background: #1a1a1a; padding: 30px; border-radius: 8px; border: 1px solid #444; text-align: center; max-width: 500px;';
        
        content.innerHTML = `
            <h3 style="color: #8B0000; margin-bottom: 25px;">🗃️ ArcGIS Експорт</h3>
            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 30px;">
                <button id="exportSHPBtn" style="padding: 18px; background: #8B0000; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; font-size: 16px;">🗄️ Shapefile</button>
                <button id="exportGeoJSONPointsBtn" style="padding: 12px; background: #8B0000; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">📄 Geojson (points)</button>
                <button id="exportGeoJSONPolygonBtn" style="padding: 12px; background: #8B0000; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">📄 Geojson (polygon)</button>
                <button id="exportGeoPackageBtn" style="padding: 12px; background: #8B0000; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">📦 GeoPackage SQL</button>
                <div style="border-top: 1px solid #444; margin: 10px 0; padding-top: 15px;">
                    <button id="exportArcGISInstructionBtn" style="padding: 12px; background: #666; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600; width: 100%;">📄 Інструкція</button>
                </div>
            </div>
            <button id="closeArcGISBtn" style="padding: 15px; background: #444; border: none; border-radius: 8px; color: white; cursor: pointer; width: 100%;">✕ Закрити</button>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        document.getElementById('exportSHPBtn').onclick = () => { 
            if (this.shpExport) {
                this.shpExport.exportSHP(points, siteName); 
            } else if (this.arcgisExport) {
                this.arcgisExport.exportSHPFromGeoJSON(points, siteName);
            } else {
                this.showNotification('❌ SHP експорт недоступний');
            }
            modal.remove(); 
        };
        document.getElementById('exportGeoJSONPointsBtn').onclick = () => { 
            this.arcgisExport.exportGeoJSONPoints(points, siteName); 
            modal.remove(); 
        };
        document.getElementById('exportGeoJSONPolygonBtn').onclick = () => { 
            this.arcgisExport.exportGeoJSONPolygon(points, siteName); 
            modal.remove(); 
        };
        document.getElementById('exportGeoPackageBtn').onclick = () => { 
            this.arcgisExport.exportGeoPackage(points, siteName); 
            modal.remove(); 
        };
        document.getElementById('exportArcGISInstructionBtn').onclick = () => { 
            this.arcgisExport.exportInstruction(siteName); 
            modal.remove(); 
        };
        document.getElementById('closeArcGISBtn').onclick = () => modal.remove();
    }

    getUTMZone() {
        const utmSelect = document.getElementById('utmZone');
        const value = utmSelect.value;
        return value ? value.replace('utm', '') : '36';
    }
    
    // Отримання збережених координат
    getConvertedPoints() {
        return this.convertedPoints || [];
    }
    
    // Отримання координат полігону
    getPolygonCoordinates() {
        if (!this.convertedPoints) return [];
        return this.convertedPoints
            .filter(p => p.type === 'SP' || p.type.startsWith('TP'))
            .map(p => p.latLng);
    }
    
    // Оновлення координат в таблиці
    updateTableCoordinates(pointType, utmCoords) {
        const inputPrefix = pointType.toLowerCase();
        const xInput = document.getElementById(`${inputPrefix}_x`);
        const yInput = document.getElementById(`${inputPrefix}_y`);
        
        if (xInput && yInput) {
            xInput.value = Math.round(utmCoords[0]);
            yInput.value = Math.round(utmCoords[1]);
        }
    }
    
    // Оновлення полігону з маркерів
    updatePolygonFromMarkers() {
        if (!this.polygon || !this.markers) return;
        
        const polygonMarkers = this.markers.filter(m => m.pointType === 'SP' || m.pointType.startsWith('TP'));
        if (polygonMarkers.length >= 3) {
            polygonMarkers.sort((a, b) => {
                if (a.pointType === 'SP') return -1;
                if (b.pointType === 'SP') return 1;
                const aNum = parseInt(a.pointType.replace('TP', '')) || 0;
                const bNum = parseInt(b.pointType.replace('TP', '')) || 0;
                return aNum - bNum;
            });
            
            const polygonLatLngs = polygonMarkers.map(m => m.getLatLng());
            this.polygon.setLatLngs(polygonLatLngs);
            console.log('✅ Полігон синхронізовано з маркерами');
        }
    }
    
    // Примусова синхронізація перед експортом
    syncPolygonWithMarkers() {
        this.updatePolygonFromMarkers();
    }
    
    // Оновлення полігону
    updatePolygon() {
        if (!this.polygon || !this.convertedPoints) return;
        
        const polygonPoints = this.convertedPoints.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
        if (polygonPoints.length >= 3) {
            const polygonLatLngs = polygonPoints.map(p => p.latLng);
            this.polygon.setLatLngs(polygonLatLngs);
        }
    }

    addMapControls() {
        // Горизонтальний ряд кнопок замість сітки
        const buttonStyle = 'width: 32px; height: 32px; font-size: 14px; border: 1px solid #8B0000; background: linear-gradient(145deg, #1a1a1a, #2a2a2a); color: #8B0000; cursor: pointer; border-radius: 4px; box-shadow: 0 1px 4px rgba(139, 0, 0, 0.3); transition: all 0.2s ease; margin: 0 2px;';
        const calculator = this;
        
        // Створюємо контейнер для горизонтального ряду
        const rowControl = L.Control.extend({
            onAdd: function(map) {
                const container = L.DomUtil.create('div', 'map-controls-row');
                container.style.cssText = 'display: flex; flex-direction: row; gap: 3px; background: rgba(26, 26, 26, 0.9); padding: 5px; border-radius: 6px; border: 1px solid #444;';
                
                // Правильна ізоляція подій - НЕ блокуємо перетягування
                L.DomEvent.disableClickPropagation(container);
                
                // Створюємо кнопки
                const searchBtn = L.DomUtil.create('button', '', container);
                searchBtn.innerHTML = '🔍';
                searchBtn.title = 'Пошук';
                searchBtn.style.cssText = buttonStyle;
                L.DomEvent.disableClickPropagation(searchBtn);
                L.DomEvent.on(searchBtn, 'click', () => calculator.showSearchMenu());
                
                const fullscreenBtn = L.DomUtil.create('button', '', container);
                fullscreenBtn.innerHTML = '⛶';
                fullscreenBtn.title = 'Повний екран';
                fullscreenBtn.style.cssText = buttonStyle;
                L.DomEvent.disableClickPropagation(fullscreenBtn);
                L.DomEvent.on(fullscreenBtn, 'click', () => calculator.toggleFullscreen());
                
                const cadastralBtn = L.DomUtil.create('button', '', container);
                cadastralBtn.innerHTML = '🏠';
                cadastralBtn.title = 'Кадастр';
                cadastralBtn.style.cssText = buttonStyle;
                L.DomEvent.disableClickPropagation(cadastralBtn);
                L.DomEvent.on(cadastralBtn, 'click', () => window.toggleCadastral());
                
                const layersBtn = L.DomUtil.create('button', '', container);
                layersBtn.innerHTML = '🗺️';
                layersBtn.title = 'Шари';
                layersBtn.style.cssText = buttonStyle;
                L.DomEvent.disableClickPropagation(layersBtn);
                L.DomEvent.on(layersBtn, 'click', () => calculator.showLayersMenu());
                
                const spBtn = L.DomUtil.create('button', '', container);
                spBtn.innerHTML = '📍';
                spBtn.title = 'До SP';
                spBtn.style.cssText = buttonStyle;
                L.DomEvent.disableClickPropagation(spBtn);
                L.DomEvent.on(spBtn, 'click', () => calculator.goToSP());
                
                return container;
            }
        });
        
        new rowControl({ position: 'topright' }).addTo(this.map);
        
        // Кнопка розгортання (над зумом)
        const expandControl = L.Control.extend({
            onAdd: function(map) {
                const btn = L.DomUtil.create('button', 'expand-btn');
                btn.innerHTML = '☰';
                btn.style.cssText = 'width: 30px; height: 30px; background: #8B0000; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 16px; display: none;';
                btn.onclick = function() {
                    const sidebar = document.getElementById('sidebar');
                    sidebar.classList.remove('hidden');
                    btn.style.display = 'none';
                    if (window.calculator && window.calculator.map) {
                        setTimeout(() => window.calculator.map.invalidateSize(), 300);
                    }
                };
                return btn;
            }
        });
        
        this.expandControl = new expandControl({ position: 'topleft' });
        this.expandControl.addTo(this.map);
        
        // Магнітна сітка
        this.addMagneticGrid();
        
        // UTM сітка
        this.addUTMGrid();
    }


    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                const btn = document.getElementById('fullscreenBtn');
                btn.innerHTML = '⛶';
                btn.classList.add('active');
                this.map.invalidateSize();
            });
        } else {
            document.exitFullscreen().then(() => {
                const btn = document.getElementById('fullscreenBtn');
                btn.innerHTML = '⛶';
                btn.classList.remove('active');
                this.map.invalidateSize();
            });
        }
    }
    
    // Додавання UTM сітки з малозамітними лініями
    addUTMGrid() {
        this.map.on('zoomend moveend', () => {
            if (this.map.getZoom() > 14) {
                this.showUTMGrid();
            } else {
                this.hideUTMGrid();
            }
        });
    }
    
    showUTMGrid() {
        if (this.utmGridLayer || !this.currentProjection) return;
        
        try {
            this.utmGridLayer = L.layerGroup();
            const bounds = this.map.getBounds();
            
            // Конвертуємо межі в UTM
            let sw, ne;
            if (window.proj4) {
                sw = proj4('EPSG:4326', this.currentProjection, [bounds.getWest(), bounds.getSouth()]);
                ne = proj4('EPSG:4326', this.currentProjection, [bounds.getEast(), bounds.getNorth()]);
            } else {
                // Fallback для випадку без proj4
                const zone = parseInt(this.getUTMZone()) || 36;
                const centralMeridian = (zone - 1) * 6 - 180 + 3;
                
                sw = [
                    (bounds.getWest() - centralMeridian) * 111320 * Math.cos(bounds.getSouth() * Math.PI / 180) + 500000,
                    (bounds.getSouth() - 50.4) * 111320 + 5500000
                ];
                ne = [
                    (bounds.getEast() - centralMeridian) * 111320 * Math.cos(bounds.getNorth() * Math.PI / 180) + 500000,
                    (bounds.getNorth() - 50.4) * 111320 + 5500000
                ];
            }
            
            const zoom = this.map.getZoom();
            let step = 100; // Базовий крок 100м
            
            // Адаптивний крок залежно від масштабу
            if (zoom > 18) step = 10;
            else if (zoom > 16) step = 50;
            else if (zoom > 15) step = 100;
            else step = 200;
            
            const startX = Math.floor(sw[0] / step) * step;
            const endX = Math.ceil(ne[0] / step) * step;
            const startY = Math.floor(sw[1] / step) * step;
            const endY = Math.ceil(ne[1] / step) * step;
            
            // Обмежуємо кількість ліній для продуктивності
            const maxLines = 50;
            const xLines = Math.min(maxLines, Math.ceil((endX - startX) / step));
            const yLines = Math.min(maxLines, Math.ceil((endY - startY) / step));
            
            const xStep = (endX - startX) / xLines;
            const yStep = (endY - startY) / yLines;
            
            // Вертикальні лінії (малозамітні)
            for (let i = 0; i <= xLines; i++) {
                const x = startX + i * xStep;
                const line = [];
                
                for (let y = startY; y <= endY; y += step * 2) {
                    try {
                        let latLng;
                        if (window.proj4) {
                            latLng = proj4(this.currentProjection, 'EPSG:4326', [x, y]);
                        } else {
                            const zone = parseInt(this.getUTMZone()) || 36;
                            const centralMeridian = (zone - 1) * 6 - 180 + 3;
                            const lat = ((y - 5500000) / 111320) + 50.4;
                            const lng = ((x - 500000) / (111320 * Math.cos(lat * Math.PI / 180))) + centralMeridian;
                            latLng = [lng, lat];
                        }
                        line.push([latLng[1], latLng[0]]);
                    } catch (e) {
                        continue;
                    }
                }
                
                if (line.length > 1) {
                    L.polyline(line, { 
                        color: '#888', 
                        weight: 0.3, 
                        opacity: 0.15,
                        interactive: false,
                        dashArray: '2,4'
                    }).addTo(this.utmGridLayer);
                }
            }
            
            // Горизонтальні лінії (малозамітні)
            for (let i = 0; i <= yLines; i++) {
                const y = startY + i * yStep;
                const line = [];
                
                for (let x = startX; x <= endX; x += step * 2) {
                    try {
                        let latLng;
                        if (window.proj4) {
                            latLng = proj4(this.currentProjection, 'EPSG:4326', [x, y]);
                        } else {
                            const zone = parseInt(this.getUTMZone()) || 36;
                            const centralMeridian = (zone - 1) * 6 - 180 + 3;
                            const lat = ((y - 5500000) / 111320) + 50.4;
                            const lng = ((x - 500000) / (111320 * Math.cos(lat * Math.PI / 180))) + centralMeridian;
                            latLng = [lng, lat];
                        }
                        line.push([latLng[1], latLng[0]]);
                    } catch (e) {
                        continue;
                    }
                }
                
                if (line.length > 1) {
                    L.polyline(line, { 
                        color: '#888', 
                        weight: 0.3, 
                        opacity: 0.15,
                        interactive: false,
                        dashArray: '2,4'
                    }).addTo(this.utmGridLayer);
                }
            }
            
            this.utmGridLayer.addTo(this.map);
            
        } catch (error) {
            console.warn('UTM Grid error:', error);
        }
    }
    
    hideUTMGrid() {
        if (this.utmGridLayer) {
            this.map.removeLayer(this.utmGridLayer);
            this.utmGridLayer = null;
        }
    }
    
    // Отримання магнітного схилення через покращений модуль
    async getMagneticDeclination(lat, lng) {
        if (this.magneticHelper) {
            try {
                const declination = await this.magneticHelper.getDeclination(lat, lng);
                
                // Валідуємо результат
                if (this.magneticHelper.validateDeclination(declination, lat, lng)) {
                    return declination;
                } else {
                    console.warn('Невалідне магнітне схилення:', declination);
                    return this.getFallbackDeclination(lat, lng);
                }
            } catch (error) {
                console.error('Помилка MagneticDeclinationHelper:', error);
                return this.getFallbackDeclination(lat, lng);
            }
        } else {
            return this.getFallbackDeclination(lat, lng);
        }
    }
    
    // Резервний розрахунок магнітного схилення
    getFallbackDeclination(lat, lng) {
        const zone = parseInt(this.getUTMZone()) || 36;
        const ukraineDeclinations = {
            34: 4.2, 35: 5.8, 36: 7.2, 37: 8.6, 38: 10.1, 39: 11.3, 40: 12.5
        };
        
        let baseDeclination = ukraineDeclinations[zone] || 7.2;
        const latCorrection = (lat - 49) * 0.3;
        const lngCorrection = (lng - 32) * 0.15;
        
        return Math.round((baseDeclination + latCorrection + lngCorrection) * 10) / 10;
    }
    
    // Оновлення магнітного схилення по зоні (тільки якщо немає SP координат)
    updateMagneticDeclinationFromZone(zone) {
        // Перевіряємо чи є SP координати
        const spX = parseFloat(document.getElementById('sp_x')?.value);
        const spY = parseFloat(document.getElementById('sp_y')?.value);
        
        if (spX && spY && this.currentProjection) {
            // Якщо є SP координати - використовуємо їх
            this.updateMagneticDeclination();
            return;
        }
        
        // Інакше використовуємо зону як fallback
        const ukraineDeclinations = {
            34: 4.2, 35: 5.8, 36: 7.2, 37: 8.6, 38: 10.1, 39: 11.3, 40: 12.5
        };
        
        const declination = ukraineDeclinations[zone] || 7.2;
        const input = document.getElementById('magneticDeclination');
        if (input && this.autoMagneticDeclination) {
            input.value = declination.toFixed(1);
            this.updateCompass();
        }
    }
    
    // Клавіатурні скорочення (вимкнено)
    addKeyboardRotation() {
        // Повертання карти вимкнено
    }
    
    addFuturisticCompass() {
        const compassControl = L.Control.extend({
            onAdd: function(map) {
                const div = L.DomUtil.create('div', 'futuristic-compass');
                div.innerHTML = `
                    <div class="compass-outer">
                        <div class="compass-inner" id="compassInner">
                            <div class="compass-ring"></div>
                            <div class="compass-needle true-north" id="trueNorth">▲</div>
                            <div class="compass-needle magnetic-north" id="magneticNorth">▲</div>
                            <div class="compass-center"></div>
                            <div class="compass-degrees" id="compassDegrees">0°</div>
                        </div>
                        <div class="compass-drag-area" id="compassDragArea"></div>
                    </div>
                `;
                return div;
            }
        });
        
        this.compassControl = new compassControl({ position: 'topright' });
        this.compassControl.addTo(this.map);
        
        // Додаємо обробники перетягування
        setTimeout(() => this.initCompassDrag(), 100);
        
        // Оновлюємо компас
        this.updateCompass();
        
        // Обробник повороту карти
        this.map.on('rotate', () => this.updateCompass());
    }
    
    initCompassDrag() {
        const dragArea = document.getElementById('compassDragArea');
        const compass = document.querySelector('.futuristic-compass');
        if (!dragArea || !compass) return;
        
        let isDragging = false;
        let startAngle = 0;
        let currentBearing = 0;
        
        const getAngle = (e) => {
            const rect = compass.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            return Math.atan2(e.clientX - centerX, e.clientY - centerY) * 180 / Math.PI;
        };
        
        dragArea.addEventListener('mousedown', (e) => {
            isDragging = true;
            startAngle = getAngle(e);
            currentBearing = this.map.getBearing ? this.map.getBearing() : 0;
            dragArea.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const newAngle = getAngle(e);
            const deltaAngle = newAngle - startAngle;
            const newBearing = (currentBearing - deltaAngle + 360) % 360;
            if (this.map.setBearing) this.map.setBearing(newBearing);
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            dragArea.style.cursor = 'grab';
        });
        
        // Подвійний клік для скидання
        dragArea.addEventListener('dblclick', () => {
            if (this.map.setBearing) {
                this.map.setBearing(0);
                this.showNotification('Карта повернута на північ');
            }
        });
    }
    
    updateCompass() {
        const compassInner = document.getElementById('compassInner');
        const trueNorth = document.getElementById('trueNorth');
        const magneticNorth = document.getElementById('magneticNorth');
        const degrees = document.getElementById('compassDegrees');
        
        if (!compassInner) return;
        
        const declination = parseFloat(document.getElementById('magneticDeclination')?.value || 7);
        const mapBearing = this.map.getBearing ? this.map.getBearing() : 0;
        
        // Поворот компасу
        compassInner.style.transform = `rotate(${-mapBearing}deg)`;
        
        // Позиція магнітного півночі (відносно істинного)
        if (magneticNorth) {
            magneticNorth.style.transform = `translate(-50%, -50%) rotate(${-declination}deg)`;
        }
        
        // Оновлення градусів
        if (degrees) {
            degrees.textContent = `${Math.round(mapBearing)}°`;
        }
    }
    
    addNorthArrow() {
        const NorthControl = L.Control.extend({
            onAdd: function(map) {
                const div = L.DomUtil.create('div', 'leaflet-control-north');
                div.innerHTML = '<div class="north-arrow" id="northArrow">▲<span>N</span></div>';
                return div;
            }
        });
        
        this.northControl = new NorthControl({ position: 'topright' });
        this.northControl.addTo(this.map);
        
        this.map.on('rotate', () => {
            const bearing = this.map.getBearing();
            const arrow = document.getElementById('northArrow');
            if (arrow) arrow.style.transform = `rotate(${-bearing}deg)`;
        });
    }
    
    addMagneticGrid() {
        this.magneticGridLayer = L.layerGroup();
        
        // Горизонтальні лінії магнітного схилення
        for (let lat = 44; lat <= 53; lat += 2) {
            const line = [];
            for (let lng = 22; lng <= 41; lng += 0.5) {
                line.push([lat, lng]);
            }
            L.polyline(line, {
                color: '#00ffff',
                weight: 0.5,
                opacity: 0.1,
                interactive: false,
                dashArray: '1,3'
            }).addTo(this.magneticGridLayer);
        }
        
        // Вертикальні лінії
        for (let lng = 22; lng <= 41; lng += 3) {
            const line = [];
            for (let lat = 44; lat <= 53; lat += 0.5) {
                line.push([lat, lng]);
            }
            L.polyline(line, {
                color: '#00ffff',
                weight: 0.5,
                opacity: 0.1,
                interactive: false,
                dashArray: '1,3'
            }).addTo(this.magneticGridLayer);
        }
        
        this.magneticGridLayer.addTo(this.map);
    }
    
    showSearchMenu() {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;';
        
        const content = document.createElement('div');
        content.style.cssText = 'background: #1a1a1a; padding: 30px; border-radius: 8px; border: 1px solid #444; max-width: 400px; width: 90%;';
        
        content.innerHTML = `
            <h3 style="color: #8B0000; margin-bottom: 20px; text-align: center;">🔍 Пошук місця</h3>
            <div style="margin-bottom: 20px;">
                <label style="color: #ccc; display: block; margin-bottom: 8px;">Введіть назву місця для пошуку:</label>
                <input type="text" id="searchInput" placeholder="Наприклад: Київ, Львів, Одеса..." style="width: 100%; padding: 12px; background: rgba(255,255,255,0.1); border: 1px solid #444; border-radius: 6px; color: #fff; font-size: 14px;">
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="searchBtn" style="flex: 1; padding: 12px; background: #8B0000; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">🔍 Пошук</button>
                <button onclick="this.parentElement.parentElement.remove()" style="flex: 1; padding: 12px; background: #666; border: none; border-radius: 6px; color: white; cursor: pointer;">Скасувати</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        const performSearch = () => {
            const query = searchInput.value.trim();
            if (!query) return;
            
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ua&limit=1`)
                .then(response => response.json())
                .then(data => {
                    if (data && data.length > 0) {
                        const result = data[0];
                        const lat = parseFloat(result.lat);
                        const lng = parseFloat(result.lon);
                        this.map.setView([lat, lng], 12);
                        this.showNotification(`Знайдено: ${result.display_name}`);
                    } else {
                        this.showNotification('Місце не знайдено');
                    }
                })
                .catch(() => {
                    this.showNotification('Помилка пошуку');
                });
            
            modal.remove();
        };
        
        searchBtn.onclick = performSearch;
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
        
        setTimeout(() => searchInput.focus(), 100);
    }
    
    showLayersMenu() {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;';
        
        const content = document.createElement('div');
        content.style.cssText = 'background: #1a1a1a; padding: 30px; border-radius: 8px; border: 1px solid #444; max-width: 400px;';
        
        const layers = {
            'OpenStreetMap': 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'Google Satellite': 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
            'Google Hybrid': 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
            'Google Streets': 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
            'Esri Satellite': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            'CartoDB Dark': 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        };
        
        let layersHtml = '<h3 style="color: #8B0000; margin-bottom: 20px; text-align: center;">🗺️ Базові карти</h3>';
        Object.keys(layers).forEach(name => {
            layersHtml += `<button onclick="window.calculator.switchLayer('${name}', '${layers[name]}'); this.parentElement.parentElement.remove();" style="display: block; width: 100%; padding: 12px; margin: 8px 0; background: #8B0000; border: none; border-radius: 6px; color: white; cursor: pointer;">${name}</button>`;
        });
        layersHtml += '<button onclick="this.parentElement.parentElement.remove()" style="display: block; width: 100%; padding: 12px; margin: 15px 0 0 0; background: #666; border: none; border-radius: 6px; color: white; cursor: pointer;">Закрити</button>';
        
        content.innerHTML = layersHtml;
        modal.appendChild(content);
        document.body.appendChild(modal);
    }
    
    switchLayer(name, url) {
        this.map.eachLayer(layer => {
            if (layer._url) this.map.removeLayer(layer);
        });
        
        const newLayer = name.includes('Google') ? 
            L.tileLayer(url, { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }) :
            L.tileLayer(url);
        
        newLayer.addTo(this.map);
        this.showNotification(`Базова карта: ${name}`);
    }
    
    // Перехід до точки SP
    goToSP() {
        const spX = parseFloat(document.getElementById('sp_x')?.value);
        const spY = parseFloat(document.getElementById('sp_y')?.value);
        
        if (!spX || !spY) {
            this.showNotification('Введіть координати SP');
            return;
        }
        
        if (!this.currentProjection) {
            this.showNotification('Оберіть UTM зону');
            return;
        }
        
        try {
            let latLng;
            if (window.proj4) {
                latLng = proj4(this.currentProjection, 'EPSG:4326', [spX, spY]);
            } else {
                const zone = parseInt(this.getUTMZone()) || 36;
                const centralMeridian = (zone - 1) * 6 - 180 + 3;
                const lat = ((spY - 5500000) / 111320) + 50.4;
                const lng = ((spX - 500000) / (111320 * Math.cos(lat * Math.PI / 180))) + centralMeridian;
                latLng = [lng, lat];
            }
            
            this.map.setView([latLng[1], latLng[0]], 16);
            this.showNotification(`Перехід до SP: ${spX}, ${spY}`);
            
        } catch (error) {
            this.showNotification('Помилка конвертації координат');
        }
    }
    
    // Оновлення всіх налаштувань по SP координатах
    updateSPDependentSettings() {
        const spX = parseFloat(document.getElementById('sp_x')?.value);
        const spY = parseFloat(document.getElementById('sp_y')?.value);
        
        if (!spX || !spY) return;
        
        // Оновлюємо UTM зону
        if (this.autoUTMZone) {
            this.updateUTMZoneFromCoords(spX, spY);
        }
        
        // Оновлюємо магнітне схилення
        if (this.autoMagneticDeclination) {
            this.updateMagneticDeclination();
        }
    }
    
    // Оновлення UTM зони по координатах
    updateUTMZoneFromCoords(x, y) {
        try {
            let lat, lng;
            
            // Перевіряємо чи це вже lat/lng
            if (x > -180 && x < 180 && y > -90 && y < 90) {
                lng = x;
                lat = y;
            } else {
                // Конвертуємо з UTM
                if (this.currentProjection && window.proj4) {
                    const converted = proj4(this.currentProjection, 'EPSG:4326', [x, y]);
                    lng = converted[0];
                    lat = converted[1];
                } else {
                    // Fallback для України
                    const zone = parseInt(this.getUTMZone()) || 36;
                    const centralMeridian = (zone - 1) * 6 - 180 + 3;
                    lat = ((y - 5500000) / 111320) + 50.4;
                    lng = ((x - 500000) / (111320 * Math.cos(lat * Math.PI / 180))) + centralMeridian;
                }
            }
            
            // Визначаємо правильну UTM зону
            const correctZone = Math.floor((lng + 180) / 6) + 1;
            const currentZone = parseInt(this.getUTMZone()) || 36;
            
            if (correctZone !== currentZone && correctZone >= 34 && correctZone <= 38) {
                const select = document.getElementById('utmZone');
                const newValue = `utm${correctZone}`;
                
                if (select.querySelector(`option[value="${newValue}"]`)) {
                    select.value = newValue;
                    this.currentProjection = `+proj=utm +zone=${correctZone} +datum=WGS84 +units=m +no_defs`;
                    this.showNotification(`Авто: UTM зона ${correctZone}N`);
                }
            }
            
        } catch (error) {
            console.error('UTM zone update error:', error);
        }
    }
    
    // Автоматичне оновлення магнітного схилення по SP координатах
    async updateMagneticDeclination() {
        if (!this.autoMagneticDeclination) return;
        
        const spX = parseFloat(document.getElementById('sp_x')?.value);
        const spY = parseFloat(document.getElementById('sp_y')?.value);
        
        // Пріоритет: SP координати > центр карти
        if (spX && spY && this.currentProjection) {
            try {
                let latLng;
                if (window.proj4) {
                    latLng = proj4(this.currentProjection, 'EPSG:4326', [spX, spY]);
                } else {
                    // Покращена fallback конвертація для України
                    const zone = parseInt(this.getUTMZone()) || 36;
                    const centralMeridian = (zone - 1) * 6 - 180 + 3;
                    const lat = ((spY - 5500000) / 111320) + 50.4;
                    const lng = ((spX - 500000) / (111320 * Math.cos(lat * Math.PI / 180))) + centralMeridian;
                    latLng = [lng, lat];
                }
                
                await this.updateMagneticDeclinationForCoords(latLng[1], latLng[0]);
                
            } catch (error) {
                console.error('Помилка конвертації SP координат:', error);
                // Fallback на центр карти
                const center = this.map.getCenter();
                await this.updateMagneticDeclinationForCoords(center.lat, center.lng);
            }
        } else {
            // Використовуємо центр карти якщо немає SP координат
            const center = this.map.getCenter();
            await this.updateMagneticDeclinationForCoords(center.lat, center.lng);
        }
    }
    
    // Тихе оновлення магнітного схилення без повідомлень
    async updateMagneticDeclinationSilent() {
        const spX = parseFloat(document.getElementById('sp_x')?.value);
        const spY = parseFloat(document.getElementById('sp_y')?.value);
        
        if (!spX || !spY || !this.currentProjection) return;
        
        try {
            let latLng;
            if (window.proj4) {
                latLng = proj4(this.currentProjection, 'EPSG:4326', [spX, spY]);
            } else {
                const zone = parseInt(this.getUTMZone()) || 36;
                const centralMeridian = (zone - 1) * 6 - 180 + 3;
                const lat = ((spY - 5500000) / 111320) + 50.4;
                const lng = ((spX - 500000) / (111320 * Math.cos(lat * Math.PI / 180))) + centralMeridian;
                latLng = [lng, lat];
            }
            
            const declination = await this.getMagneticDeclination(latLng[1], latLng[0]);
            const input = document.getElementById('magneticDeclination');
            
            if (input && declination !== null && !isNaN(declination)) {
                const oldValue = parseFloat(input.value) || 0;
                const rounded = Math.round(declination * 10) / 10;
                
                // Перераховуємо таблицю тільки при зміні схилення
                if (Math.abs(oldValue - rounded) > 0.05) {
                    input.value = rounded;
                    input.placeholder = `Авто: ${rounded}°`;
                    this.updateCompass();
                    return true; // Повертаємо true якщо була зміна
                }
            }
        } catch (error) {
            console.error('Silent magnetic declination update error:', error);
        }
        return false;
    }
    
    // Оновлення магнітного схилення для конкретних координат
    async updateMagneticDeclinationForCoords(lat, lng) {
        try {
            const declination = await this.getMagneticDeclination(lat, lng);
            const input = document.getElementById('magneticDeclination');
            
            if (input && declination !== null && !isNaN(declination)) {
                const oldValue = parseFloat(input.value) || 0;
                const rounded = Math.round(declination * 10) / 10;
                
                input.value = rounded;
                input.placeholder = `Авто: ${rounded}° (точне: ${declination.toFixed(6)}°)`;
                
                // Оновлюємо компас при зміні значення
                if (Math.abs(oldValue - rounded) > 0.05) {
                    this.updateCompass();
                    
                    // Показуємо повідомлення тільки при значних змінах
                    if (Math.abs(oldValue - rounded) > 0.5) {
                        this.showNotification(`Магнітне схилення оновлено: ${rounded}° (по SP координатах)`);
                    }
                }
            }
        } catch (error) {
            console.error('Помилка оновлення магнітного схилення:', error);
            // Fallback на зону UTM
            const zone = parseInt(this.getUTMZone()) || 36;
            this.updateMagneticDeclinationFromZone(zone);
        }
    }
}

console.log('✅ SRIDCalculator core completed');
window.SRIDCalculator = SRIDCalculator;
