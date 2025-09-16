// Клас для дизайну маркерів на карті
class MarkerDesign {
    // Отримання HTML коду для маркера
    static getMarkerHtml(point, allPoints = []) {
        const colors = this.getPointColors();
        
        switch(point.type) {
            case 'LM': // Орієнтир (трикутник)
                return `<svg width="20" height="20" viewBox="0 0 20 20">
                    <polygon points="10,3 17,15 3,15" fill="#fff" stroke="#000" stroke-width="2"/>
                </svg>`;
                
            case 'BM': // Базова точка (квадрат)
                return `<svg width="16" height="16" viewBox="0 0 16 16">
                    <rect x="2" y="2" width="12" height="12" fill="#fff" stroke="#000" stroke-width="2"/>
                    <rect x="6" y="6" width="4" height="4" fill="#000"/>
                </svg>`;
                
            case 'SP': // Початкова точка (коло)
                return `<svg width="16" height="16" viewBox="0 0 16 16">
                    <circle cx="8" cy="8" r="6" fill="#fff" stroke="#000" stroke-width="2"/>
                    <circle cx="8" cy="8" r="2" fill="#000"/>
                </svg>`;
                
            default: // Точки повороту (коло)
                return `<svg width="12" height="12" viewBox="0 0 12 12">
                    <circle cx="6" cy="6" r="4" fill="#fff" stroke="#000" stroke-width="2"/>
                    <circle cx="6" cy="6" r="1.5" fill="#000"/>
                </svg>`;
        }
    }
    
    // Кольорова схема для різних типів точок
    static getPointColors() {
        return {
            LM: '#dc2626',   // Червоний - орієнтир
            BM: '#1f2937',   // Темно-сірий - базова точка
            SP: '#059669',   // Зелений - початкова точка
            TP: '#2563eb'    // Синій - точки повороту
        };
    }

    // Створення іконки маркера для Leaflet
    static getMarkerIcon(point, allPoints = []) {
        const markerHtml = this.getMarkerHtml(point, allPoints);
        const colors = this.getPointColors();
        
        // Отримуємо колір для підпису
        const labelColor = colors[point.type] || colors.TP;
        
        return L.divIcon({
            html: markerHtml,
            className: 'custom-marker-enhanced',
            iconSize: point.type === 'LM' ? [20, 20] : point.type === 'BM' ? [16, 16] : point.type === 'SP' ? [16, 16] : [12, 12],
            iconAnchor: point.type === 'LM' ? [10, 10] : point.type === 'BM' ? [8, 8] : point.type === 'SP' ? [8, 8] : [6, 6]
        });
    }

    // Стиль для полігону
    static getPolygonStyle() {
        return {
            color: '#059669',        // Зелений контур
            weight: 3,               // Товщина лінії
            fillColor: '#10b981',    // Світло-зелена заливка
            fillOpacity: 0.2,        // Прозорість заливки
            dashArray: '5, 5',       // Пунктирна лінія
            opacity: 0.8             // Прозорість контуру
        };
    }
    
    // Стиль для виділеного полігону
    static getHighlightedPolygonStyle() {
        return {
            color: '#dc2626',        // Червоний контур
            weight: 4,               // Товща лінія
            fillColor: '#ef4444',    // Червона заливка
            fillOpacity: 0.3,        // Більша насиченість
            dashArray: null,         // Суцільна лінія
            opacity: 1               // Повна непрозорість
        };
    }
}

// Робимо клас доступним глобально
window.MarkerDesign = MarkerDesign;
console.log('✅ Модуль дизайну маркерів завантажено');