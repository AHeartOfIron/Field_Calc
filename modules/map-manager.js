class MapManager {
    constructor(calculator) {
        this.calculator = calculator;
    }

    drawPolygon(points) {
        if (this.calculator.polygon) this.calculator.map.removeLayer(this.calculator.polygon);
        this.calculator.markers.forEach(m => this.calculator.map.removeLayer(m));
        this.calculator.markers = [];

        if (points.length < 3 || !this.calculator.currentProjection) {
            if (!this.calculator.currentProjection) {
                this.calculator.showError('Оберіть систему координат');
            }
            return;
        }

        try {
            const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
            if (polygonPoints.length >= 3) {
                const polygonLatLngs = polygonPoints.map(p => {
                    const converted = proj4(this.calculator.currentProjection, 'EPSG:4326', p.coords);
                    return [converted[1], converted[0]];
                });
                
                this.calculator.polygon = L.polygon(polygonLatLngs, MarkerDesign.getPolygonStyle()).addTo(this.calculator.map);
            }
            
            points.forEach((point) => {
                const converted = proj4(this.calculator.currentProjection, 'EPSG:4326', point.coords);
                const latLng = [converted[1], converted[0]];
                
                const marker = L.marker(latLng, {
                    icon: MarkerDesign.getMarkerIcon(point, points),
                    draggable: true
                }).addTo(this.calculator.map);
                
                marker.on('dragend', () => this.onMarkerDrag(marker, point.type));
                this.calculator.markers.push(marker);
            });
            
            if (this.calculator.polygon) {
                this.calculator.map.fitBounds(this.calculator.polygon.getBounds().pad(0.1));
            }
        } catch (error) {
            console.error('Polygon drawing error:', error);
            this.calculator.showError('Помилка відображення полігону');
        }
    }



    onMarkerDrag(marker, pointType) {
        const newLatLng = marker.getLatLng();
        
        if (!this.calculator.currentProjection) return;
        
        const projected = proj4('EPSG:4326', this.calculator.currentProjection, [newLatLng.lng, newLatLng.lat]);
        
        const xInput = document.getElementById(`${pointType.toLowerCase()}_x`);
        const yInput = document.getElementById(`${pointType.toLowerCase()}_y`);
        
        if (xInput && yInput) {
            xInput.value = Math.round(projected[0]);
            yInput.value = Math.round(projected[1]);
            
            setTimeout(() => {
                this.calculator.autoCalculate();
                this.calculator.calculate();
            }, 100);
            
            this.calculator.showNotification(`Точка ${pointType} переміщена`);
        }
    }

    onMapClick(e) {
        if (!this.calculator.currentProjection) return;
        const projected = proj4('EPSG:4326', this.calculator.currentProjection, [e.latlng.lng, e.latlng.lat]);
        console.log(`Clicked: ${Math.round(projected[0])}, ${Math.round(projected[1])}`);
    }

    updateMarkersVisibility() {
        const zoom = this.calculator.map.getZoom();
        
        if (zoom < 6) {
            this.calculator.markers.forEach(marker => {
                if (marker.setOpacity) marker.setOpacity(0);
            });
            if (this.calculator.polygon) this.calculator.polygon.setStyle({opacity: 0, fillOpacity: 0});
        } else {
            this.calculator.markers.forEach(marker => {
                if (marker.setOpacity) marker.setOpacity(1);
            });
            if (this.calculator.polygon) this.calculator.polygon.setStyle({opacity: 1, fillOpacity: 0.2});
        }
    }
}

window.MapManager = MapManager;