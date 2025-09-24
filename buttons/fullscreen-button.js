class FullscreenButton {
    constructor(calculator) {
        this.calculator = calculator;
    }
    
    create(container, buttonStyle) {
        const fullscreenBtn = L.DomUtil.create('button', '', container);
        fullscreenBtn.id = 'fullscreenBtn';
        fullscreenBtn.innerHTML = '⛶';
        fullscreenBtn.title = 'Повноекранний режим';
        fullscreenBtn.style.cssText = buttonStyle;
        
        L.DomEvent.disableClickPropagation(fullscreenBtn);
        L.DomEvent.on(fullscreenBtn, 'click', (e) => {
            L.DomEvent.stopPropagation(e);
            this.calculator.toggleFullscreen();
        });
        
        return fullscreenBtn;
    }
}

window.FullscreenButton = FullscreenButton;