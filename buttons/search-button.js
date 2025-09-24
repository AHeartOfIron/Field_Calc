class SearchButton {
    constructor(calculator) {
        this.calculator = calculator;
    }
    
    create(container, buttonStyle) {
        const searchBtn = L.DomUtil.create('button', '', container);
        searchBtn.innerHTML = '🔍';
        searchBtn.title = 'Пошук місця';
        searchBtn.style.cssText = buttonStyle;
        
        L.DomEvent.disableClickPropagation(searchBtn);
        L.DomEvent.on(searchBtn, 'click', (e) => {
            L.DomEvent.stopPropagation(e);
            this.calculator.showSearchMenu();
        });
        
        return searchBtn;
    }
}

window.SearchButton = SearchButton;