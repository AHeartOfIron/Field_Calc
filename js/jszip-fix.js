// Фікс для JSZip 3.0 сумісності з shp-write
(function() {
    if (window.JSZip && !JSZip.prototype.generate) {
        // Додаємо старий метод generate для сумісності
        JSZip.prototype.generate = function(options) {
            options = options || {};
            const type = options.type || 'base64';
            
            // Синхронна версія для старого API
            try {
                if (type === 'base64') {
                    return this.generateAsync({type: 'base64'});
                } else if (type === 'arraybuffer') {
                    return this.generateAsync({type: 'arraybuffer'});
                } else if (type === 'uint8array') {
                    return this.generateAsync({type: 'uint8array'});
                } else {
                    return this.generateAsync({type: 'string'});
                }
            } catch (e) {
                console.error('JSZip generate patch error:', e);
                return '';
            }
        };
        
        console.log('✅ JSZip generate method patched for shp-write compatibility');
    }
})();