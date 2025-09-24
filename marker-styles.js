// Стилі маркерів для точок
class MarkerStyles {
    static getMarkerHtml(type) {
        switch(type) {
            case 'LM':
                return `<svg width="16" height="16" viewBox="0 0 16 16">
                    <polygon points="8,2 14,13 2,13" 
                             fill="#dc2626" 
                             stroke="#000" 
                             stroke-width="1.5"/>
                    <polygon points="8,5 11,10 5,10" 
                             fill="none" 
                             stroke="#000" 
                             stroke-width="1"/>
                </svg>`;
                
            case 'BM':
                return `<svg width="18" height="18" viewBox="0 0 18 18">
                    <rect x="3" y="3" width="12" height="12" 
                          fill="#dc2626" 
                          stroke="#000" 
                          stroke-width="1.5"/>
                    <rect x="7" y="7" width="4" height="4" 
                          fill="#000"/>
                </svg>`;
                
            case 'SP':
                return `<svg width="12" height="12" viewBox="0 0 12 12">
                    <circle cx="6" cy="6" r="5" 
                            fill="#dc2626" 
                            stroke="#000" 
                            stroke-width="1.5"/>
                    <circle cx="6" cy="6" r="2" 
                            fill="#000"/>
                </svg>`;
                
            default: // TP точки
                return `<svg width="10" height="10" viewBox="0 0 10 10">
                    <circle cx="5" cy="5" r="4" 
                            fill="#dc2626" 
                            stroke="#000" 
                            stroke-width="1.5"/>
                </svg>`;
        }
    }
    
    static getMarkerIcon(point) {
        const html = this.getMarkerHtml(point.type);
        let size, anchor;
        
        switch(point.type) {
            case 'LM': 
                size = [16, 16]; 
                anchor = [8, 8]; // Прив'язка до центру фігури
                break;
            case 'BM': 
                size = [18, 18]; 
                anchor = [9, 9]; // Прив'язка до центру фігури
                break;
            case 'SP': 
                size = [12, 12]; 
                anchor = [6, 6]; // Прив'язка до центру фігури
                break;
            default: 
                size = [10, 10]; 
                anchor = [5, 5]; // Прив'язка до центру фігури
                break;
        }
        
        return L.divIcon({
            html: html + `<div class="marker-label">${point.type}</div>`,
            className: 'custom-marker',
            iconSize: size,
            iconAnchor: anchor,
            popupAnchor: [0, 0]
        });
    }
}

window.MarkerStyles = MarkerStyles;