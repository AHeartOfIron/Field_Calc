// Простий пошук місць
window.searchLocation = function() {
    const query = prompt('Введіть назву місця для пошуку:');
    if (!query) return;
    
    // Використовуємо Nominatim API
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                
                if (window.calculator && window.calculator.map) {
                    window.calculator.map.setView([lat, lng], 15);
                    window.calculator.showNotification(`Знайдено: ${result.display_name}`);
                }
            } else {
                if (window.calculator) {
                    window.calculator.showNotification('Місце не знайдено');
                }
            }
        })
        .catch(error => {
            console.error('Search error:', error);
            if (window.calculator) {
                window.calculator.showNotification('Помилка пошуку');
            }
        });
};

console.log('✅ Search location loaded');