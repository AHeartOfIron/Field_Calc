class LayersButton {
    constructor(calculator) {
        this.calculator = calculator;
    }
    
    create(container, buttonStyle) {
        const layersBtn = L.DomUtil.create('button', '', container);
        layersBtn.innerHTML = '🗺️';
        layersBtn.title = 'Базові карти';
        layersBtn.style.cssText = buttonStyle;
        
        L.DomEvent.disableClickPropagation(layersBtn);
        L.DomEvent.on(layersBtn, 'click', (e) => {
            L.DomEvent.stopPropagation(e);
            this.calculator.showLayersMenu();
        });
        
        return layersBtn;
    }
}

window.LayersButton = LayersButton;