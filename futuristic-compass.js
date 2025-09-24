// Простий компас з Leaflet.Rotate
class FuturisticCompass {
    constructor(calculator) {
        this.calculator = calculator;
    }

    init() {
        // Використовуємо вбудований компас з leaflet-rotate
        if (this.calculator.map.rotateControl) {
            this.calculator.map.rotateControl.remove();
        }
        
        // Додаємо власний компас
        const compassControl = L.Control.extend({
            onAdd: function(map) {
                const div = L.DomUtil.create('div', 'custom-compass');
                div.innerHTML = `
                    <div class="compass-face">
                        <div class="compass-needle" id="compassNeedle">▲</div>
                        <div class="compass-text" id="compassText">N</div>
                    </div>
                `;
                
                // Перетягування
                let isDragging = false;
                let startAngle = 0;
                let currentBearing = 0;
                
                div.addEventListener('mousedown', (e) => {
                    isDragging = true;
                    const rect = div.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    startAngle = Math.atan2(e.clientX - centerX, e.clientY - centerY) * 180 / Math.PI;
                    currentBearing = map.getBearing();
                    e.preventDefault();
                });
                
                document.addEventListener('mousemove', (e) => {
                    if (!isDragging) return;
                    const rect = div.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const newAngle = Math.atan2(e.clientX - centerX, e.clientY - centerY) * 180 / Math.PI;
                    const deltaAngle = newAngle - startAngle;
                    map.setBearing(currentBearing + deltaAngle);
                });
                
                document.addEventListener('mouseup', () => {
                    isDragging = false;
                });
                
                // Подвійний клік для скидання
                div.addEventListener('dblclick', () => {
                    map.setBearing(0);
                });
                
                return div;
            }
        });
        
        this.compassControl = new compassControl({ position: 'topright' });
        this.compassControl.addTo(this.calculator.map);
        
        // Оновлення при повороті
        this.calculator.map.on('rotate', () => this.update());
        this.update();
    }

    update() {
        const needle = document.getElementById('compassNeedle');
        const text = document.getElementById('compassText');
        
        if (needle && text) {
            const bearing = this.calculator.map.getBearing();
            needle.style.transform = `rotate(${-bearing}deg)`;
            text.textContent = Math.round(bearing) + '°';
        }
    }
}

window.FuturisticCompass = FuturisticCompass;