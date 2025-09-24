// Плагін синхронізації полігону з точками
class PolygonSyncPlugin {
    constructor(calculator) {
        this.calculator = calculator;
        this.isUpdating = false;
    }

    // Синхронізація полігону з маркерами
    syncPolygonWithMarkers() {
        if (this.isUpdating || !this.calculator.polygon) return;
        
        const polygonMarkers = this.calculator.markers.filter(m => 
            m.pointType === 'SP' || m.pointType.startsWith('TP')
        );
        
        if (polygonMarkers.length >= 3) {
            // Сортуємо маркери: SP першим, потім TP1, TP2...
            polygonMarkers.sort((a, b) => {
                if (a.pointType === 'SP') return -1;
                if (b.pointType === 'SP') return 1;
                const aNum = parseInt(a.pointType.replace('TP', '')) || 0;
                const bNum = parseInt(b.pointType.replace('TP', '')) || 0;
                return aNum - bNum;
            });
            
            const newLatLngs = polygonMarkers.map(m => m.getLatLng());
            this.calculator.polygon.setLatLngs(newLatLngs);
        }
    }

    // Оновлення таблиці при переміщенні маркера
    updateTableFromMarker(marker, newLatLng) {
        if (this.isUpdating) return;
        this.isUpdating = true;

        try {
            let utmCoords;
            if (window.proj4 && this.calculator.currentProjection) {
                utmCoords = proj4('EPSG:4326', this.calculator.currentProjection, [newLatLng.lng, newLatLng.lat]);
            } else {
                // Fallback конвертація
                const zone = parseInt(this.calculator.getUTMZone()) || 36;
                const centralMeridian = (zone - 1) * 6 - 180 + 3;
                const x = (newLatLng.lng - centralMeridian) * 111320 * Math.cos(newLatLng.lat * Math.PI / 180) + 500000;
                const y = (newLatLng.lat - 50.4) * 111320 + 5500000;
                utmCoords = [x, y];
            }

            // Оновлюємо таблицю
            this.calculator.updateTableCoordinates(marker.pointType, utmCoords);
            
            // Оновлюємо збережені координати маркера
            marker.utmCoords = utmCoords;
            
            // Синхронізуємо полігон
            this.syncPolygonWithMarkers();
            
            // Оновлюємо розрахунки
            setTimeout(() => {
                this.calculator.autoCalculate();
                const points = this.calculator.getPoints();
                const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP')).map(p => p.coords);
                if (polygonPoints.length >= 3) {
                    this.calculator.calculateResults(polygonPoints);
                }
            }, 50);

        } catch (error) {
            console.error('Update error:', error);
        } finally {
            this.isUpdating = false;
        }
    }

    // Прив'язка обробників до маркерів
    bindMarkerEvents(marker) {
        marker.on('dragend', (e) => {
            const newLatLng = e.target.getLatLng();
            this.updateTableFromMarker(marker, newLatLng);
            this.calculator.showNotification(`Точка ${marker.pointType} переміщена`);
        });
    }
}

window.PolygonSyncPlugin = PolygonSyncPlugin;