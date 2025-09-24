// Патч для shp-write щоб працювати з JSZip 3.0
(function() {
    // Перевіряємо чи завантажений shpwrite
    if (typeof window.shpwrite !== 'undefined' && window.shpwrite.zip) {
        const originalZip = window.shpwrite.zip;
        
        // Замінюємо метод zip на асинхронний
        window.shpwrite.zip = function(geojson) {
            return new Promise((resolve, reject) => {
                try {
                    // Викликаємо оригінальний метод
                    const result = originalZip.call(this, geojson);
                    
                    // Якщо результат вже є проміс
                    if (result && typeof result.then === 'function') {
                        result.then(resolve).catch(reject);
                    } else {
                        // Якщо результат синхронний
                        resolve(result);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        };
        
        console.log('✅ shpwrite.zip patched for async support');
    }
    
    // Патч для JSZip generate метод
    if (window.JSZip && window.JSZip.prototype && !window.JSZip.prototype.generate) {
        window.JSZip.prototype.generate = function(options) {
            options = options || {};
            const type = options.type || 'base64';
            
            // Повертаємо проміс який резолвиться синхронно для сумісності
            return this.generateAsync({type: type});
        };
        
        console.log('✅ JSZip.generate method added for compatibility');
    }
})();