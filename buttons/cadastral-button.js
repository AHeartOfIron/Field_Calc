class CadastralButton {
    constructor(calculator) {
        this.calculator = calculator;
    }
    
    create(container, buttonStyle) {
        const cadastralBtn = L.DomUtil.create('button', '', container);
        cadastralBtn.innerHTML = '🏠';
        cadastralBtn.title = 'Кадастрові ділянки';
        cadastralBtn.style.cssText = buttonStyle;
        
        L.DomEvent.disableClickPropagation(cadastralBtn);
        L.DomEvent.on(cadastralBtn, 'click', (e) => {
            L.DomEvent.stopPropagation(e);
            cadastralBtn.classList.toggle('active');
            if (window.toggleCadastral) {
                window.toggleCadastral();
            } else {
                this.calculator.showNotification('Кадастровий модуль недоступний');
            }
        });
        
        return cadastralBtn;
    }
}

window.CadastralButton = CadastralButton;