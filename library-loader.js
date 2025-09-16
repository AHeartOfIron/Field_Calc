// Система автозавантаження бібліотек
console.log('📚 Завантажувач бібліотек запущено...');

class LibraryLoader {
    constructor() {
        this.libraries = {
            proj4: {
                url: 'https://cdn.jsdelivr.net/npm/proj4@2.9.0/dist/proj4.min.js',
                check: () => window.proj4,
                name: 'Proj4.js (Проекції координат)',
                loaded: false
            },
            turf: {
                url: 'https://unpkg.com/@turf/turf@6/turf.min.js',
                check: () => window.turf,
                name: 'Turf.js (Геопросторові розрахунки)',
                loaded: false
            },
            xlsx: {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
                check: () => window.XLSX,
                name: 'XLSX.js (Робота з Excel)',
                loaded: false
            },
            jszip: {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
                check: () => window.JSZip,
                name: 'JSZip (Створення архівів)',
                loaded: false
            },
            html2canvas: {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
                check: () => window.html2canvas,
                name: 'html2canvas (Скріншоти)',
                loaded: false
            },
            jspdf: {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
                check: () => window.jspdf,
                name: 'jsPDF (Створення PDF)',
                loaded: false
            },
            domtoimage: {
                url: 'https://cdn.jsdelivr.net/npm/dom-to-image@2.6.0/dist/dom-to-image.min.js',
                check: () => window.domtoimage,
                name: 'dom-to-image (Конвертація DOM)',
                loaded: false
            },
            shpwrite: {
                url: 'https://unpkg.com/shp-write@0.3.2/shpwrite.js',
                check: () => window.shpwrite,
                name: 'shp-write (Створення SHP)',
                loaded: false
            },
            filesaver: {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
                check: () => window.saveAs,
                name: 'FileSaver.js (Збереження файлів)',
                loaded: false
            }
        };
        
        this.loadedCount = 0;
        this.totalCount = Object.keys(this.libraries).length;
        this.onAllLoaded = null;
    }

    async loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async loadLibrary(key) {
        const lib = this.libraries[key];
        
        if (lib.check()) {
            lib.loaded = true;
            console.log(`✅ ${lib.name} вже завантажено`);
            return true;
        }

        try {
            console.log(`📥 Завантажуємо ${lib.name}...`);
            await this.loadScript(lib.url);
            
            // Перевіряємо чи завантажилось
            if (lib.check()) {
                lib.loaded = true;
                console.log(`✅ ${lib.name} завантажено успішно`);
                return true;
            } else {
                console.warn(`⚠️ ${lib.name} завантажено, але не знайдено в window`);
                return false;
            }
        } catch (error) {
            console.error(`❌ Помилка завантаження ${lib.name}:`, error);
            return false;
        }
    }

    async loadAll() {
        console.log('🚀 Починаємо завантаження всіх бібліотек...');
        
        const promises = Object.keys(this.libraries).map(key => 
            this.loadLibrary(key).then(success => {
                if (success) this.loadedCount++;
                return { key, success };
            })
        );

        const results = await Promise.all(promises);
        
        console.log(`📊 Завантажено ${this.loadedCount}/${this.totalCount} бібліотек`);
        
        if (this.onAllLoaded) {
            this.onAllLoaded(results);
        }
        
        return results;
    }

    getStatus() {
        const status = {};
        Object.keys(this.libraries).forEach(key => {
            const lib = this.libraries[key];
            status[key] = {
                name: lib.name,
                loaded: lib.check() ? true : false
            };
        });
        return status;
    }

    async reloadLibrary(key) {
        if (!this.libraries[key]) return false;
        
        const lib = this.libraries[key];
        lib.loaded = false;
        
        return await this.loadLibrary(key);
    }
}

// Створюємо глобальний завантажувач
window.libraryLoader = new LibraryLoader();

// Автоматично завантажуємо всі бібліотеки
window.libraryLoader.loadAll().then(() => {
    console.log('🎉 Всі бібліотеки завантажено!');
    // Калькулятор створюється в init.js
});

// Функція initializeApp відключена - калькулятор створюється в init.js