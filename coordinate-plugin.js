// Плагін для роботи з координатами
console.log('🔧 Завантажуємо плагін координат...');

class CoordinatePlugin {
    constructor(calculator) {
        this.calculator = calculator;
        this.init();
    }
    
    init() {
        // Додаємо контрол координат на карту
        this.addCoordinateControl();
        
        // Додаємо обробник кліку по карті для отримання координат
        this.calculator.map.on('click', (e) => this.onMapClick(e));
        
        // Додаємо обробник руху миші для показу координат
        this.calculator.map.on('mousemove', (e) => this.onMouseMove(e));
    }
    
    addCoordinateControl() {
        const CoordinateControl = L.Control.extend({
            onAdd: function(map) {
                const div = L.DomUtil.create('div', 'coordinate-control');
                div.style.cssText = `
                    background: rgba(255,255,255,0.9); 
                    padding: 5px 10px; 
                    border-radius: 4px; 
                    font-family: monospace; 
                    font-size: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                    min-width: 200px;
                `;
                div.innerHTML = '<div id="coordinate-display">Координати: --</div>';
                return div;
            }
        });
        
        new CoordinateControl({ position: 'bottomleft' }).addTo(this.calculator.map);
    }
    
    onMapClick(e) {
        const latLng = e.latlng;
        
        // Конвертуємо в UTM якщо є проекція
        if (this.calculator.currentProjection && window.proj4) {
            try {
                const utmCoords = proj4('EPSG:4326', this.calculator.currentProjection, [latLng.lng, latLng.lat]);
                
                const popup = L.popup()
                    .setLatLng(latLng)
                    .setContent(`
                        <div style="font-family: Arial; min-width: 250px;">
                            <h4 style="margin: 0 0 10px 0; color: #8B0000;">📍 Координати точки</h4>
                            <div><strong>UTM (зона ${this.calculator.getUTMZone()}N):</strong></div>
                            <div>X: ${Math.round(utmCoords[0])}</div>
                            <div>Y: ${Math.round(utmCoords[1])}</div>
                            <div style="margin-top: 10px;"><strong>Lat/Lng:</strong></div>
                            <div>Lat: ${latLng.lat.toFixed(6)}</div>
                            <div>Lng: ${latLng.lng.toFixed(6)}</div>
                            <div style="margin-top: 10px;">
                                <button onclick="navigator.clipboard.writeText('${Math.round(utmCoords[0])}, ${Math.round(utmCoords[1])}'); window.calculator.showNotification('UTM координати скопійовано')" 
                                        style="padding: 5px 10px; background: #8B0000; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px;">
                                    📋 UTM
                                </button>
                                <button onclick="navigator.clipboard.writeText('${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}'); window.calculator.showNotification('Lat/Lng координати скопійовано')" 
                                        style="padding: 5px 10px; background: #059669; color: white; border: none; border-radius: 3px; cursor: pointer;">
                                    📋 Lat/Lng
                                </button>
                            </div>
                        </div>
                    `)
                    .openOn(this.calculator.map);
                    
            } catch (error) {
                console.error('Coordinate conversion error:', error);
            }
        }
    }
    
    onMouseMove(e) {
        const latLng = e.latlng;
        const display = document.getElementById('coordinate-display');
        
        if (display && this.calculator.currentProjection && window.proj4) {
            try {
                const utmCoords = proj4('EPSG:4326', this.calculator.currentProjection, [latLng.lng, latLng.lat]);
                display.innerHTML = `
                    UTM: ${Math.round(utmCoords[0])}, ${Math.round(utmCoords[1])} | 
                    Lat/Lng: ${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}
                `;
            } catch (error) {
                display.innerHTML = `Lat/Lng: ${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`;
            }
        } else if (display) {
            display.innerHTML = `Lat/Lng: ${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`;
        }
    }
    
    // Додавання точки з карти до таблиці
    addPointFromMap(latLng, pointType) {
        if (!this.calculator.currentProjection || !window.proj4) {
            this.calculator.showError('Оберіть систему координат');
            return;
        }
        
        try {
            const utmCoords = proj4('EPSG:4326', this.calculator.currentProjection, [latLng.lng, latLng.lat]);
            this.calculator.updateTableCoordinates(pointType, utmCoords);
            this.calculator.updateMapFromTable();
            this.calculator.showNotification(`Точка ${pointType} додана з карти`);
        } catch (error) {
            console.error('Add point error:', error);
            this.calculator.showError('Помилка додавання точки');
        }
    }
}

// Робимо плагін доступним глобально
window.CoordinatePlugin = CoordinatePlugin;
console.log('✅ Плагін координат завантажено');