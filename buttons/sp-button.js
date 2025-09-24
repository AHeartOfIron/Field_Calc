class SPButton {
    constructor(calculator) {
        this.calculator = calculator;
    }
    
    create(container, buttonStyle) {
        const spBtn = L.DomUtil.create('button', '', container);
        spBtn.innerHTML = '🎯';
        spBtn.title = 'Перейти до точки SP';
        spBtn.style.cssText = buttonStyle;
        
        L.DomEvent.disableClickPropagation(spBtn);
        L.DomEvent.on(spBtn, 'click', (e) => {
            L.DomEvent.stopPropagation(e);
            this.calculator.goToSP();
        });
        
        return spBtn;
    }
}

window.SPButton = SPButton;