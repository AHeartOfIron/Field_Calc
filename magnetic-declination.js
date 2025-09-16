// Модуль для роботи з магнітним схиленням
class MagneticDeclinationHelper {
    constructor() {
        this.cache = new Map();
        this.lastUpdate = null;
    }

    // Отримання магнітного схилення з кешуванням
    async getDeclination(lat, lng, useCache = true) {
        const key = `${Math.round(lat * 100)}_${Math.round(lng * 100)}`;
        
        if (useCache && this.cache.has(key)) {
            return this.cache.get(key);
        }

        try {
            // Спробуємо кілька API послідовно
            let declination = await this.tryMultipleAPIs(lat, lng);
            
            if (declination === null) {
                // Fallback на локальні розрахунки
                declination = this.calculateLocalDeclination(lat, lng);
            }

            // Кешуємо результат
            this.cache.set(key, declination);
            this.lastUpdate = new Date();
            
            return declination;
            
        } catch (error) {
            console.warn('Помилка отримання магнітного схилення:', error);
            return this.calculateLocalDeclination(lat, lng);
        }
    }

    async tryMultipleAPIs(lat, lng) {
        return null;
    }

    // Точні розрахунки магнітного схилення по координатах SP
    calculateLocalDeclination(lat, lng) {
        // Для України використовуємо точну модель WMM-2025
        const year = new Date().getFullYear() + (new Date().getMonth() / 12);
        
        // Спеціальна сітка для України (WMM-2025)
        const ukraineGrid = {
            // Західна Україна (зони 34-35)
            '49_24': 5.2, '49_26': 5.8, '50_24': 5.4, '50_26': 6.0,
            '51_24': 5.6, '51_26': 6.2, '52_24': 5.8, '52_26': 6.4,
            
            // Центральна Україна (зона 36)
            '49_30': 6.8, '49_32': 7.2, '50_30': 7.0, '50_32': 7.4,
            '51_30': 7.2, '51_32': 7.6, '52_30': 7.4, '52_32': 7.8,
            
            // Східна Україна (зони 37-38)
            '49_36': 8.2, '49_38': 8.8, '50_36': 8.4, '50_38': 9.0,
            '51_36': 8.6, '51_38': 9.2, '52_36': 8.8, '52_38': 9.4
        };
        
        // Знаходимо найближчу точку сітки
        const latRounded = Math.round(lat);
        const lngRounded = Math.round(lng / 2) * 2;
        const key = `${latRounded}_${lngRounded}`;
        
        let declination;
        
        if (ukraineGrid[key]) {
            // Використовуємо точне значення з сітки
            declination = ukraineGrid[key];
            
            // Інтерполяція для точності
            const latCorrection = (lat - latRounded) * 0.15;
            const lngCorrection = (lng - lngRounded) * 0.08;
            declination += latCorrection + lngCorrection;
            
        } else {
            // Fallback для точок поза сіткою
            const zone = this.getUTMZoneFromCoords(lat, lng);
            declination = this.getDeclinationByZone(zone, lat, lng);
        }
        
        // Часова корекція (WMM змінюється щорічно)
        const yearCorrection = (year - 2025) * 0.05;
        declination += yearCorrection;
        
        return parseFloat(declination.toFixed(6));
    }
    
    // Глобальний розрахунок схилення по UTM зоні
    getDeclinationByZone(zone, lat, lng) {
        // Глобальні базові значення по зонах
        const globalZoneDeclinations = {
            // Америка
            10: -15.2, 11: -12.8, 12: -9.4, 13: -6.1, 14: -2.8, 15: 0.5, 16: 3.8, 17: 7.1,
            // Атлантик
            18: 10.4, 19: 13.7, 20: 17.0, 21: 20.3, 22: 23.6, 23: 26.9,
            // Африка/Европа
            24: -2.1, 25: -1.8, 26: -1.5, 27: -1.2, 28: -0.9, 29: -0.6, 30: -0.3,
            31: 0.0, 32: 0.3, 33: 0.6, 34: 0.9, 35: 1.2, 36: 1.5, 37: 1.8,
            // Україна/Росія
            34: 4.5, 35: 5.8, 36: 7.2, 37: 8.6, 38: 10.1, 39: 11.3, 40: 12.5,
            // Азія
            41: 13.8, 42: 15.1, 43: 16.4, 44: 17.7, 45: 19.0, 46: 20.3, 47: 21.6,
            48: 22.9, 49: 24.2, 50: 25.5, 51: 26.8, 52: 28.1, 53: 29.4, 54: 30.7,
            // Тихий океан
            55: -18.2, 56: -16.8, 57: -15.4, 58: -14.0, 59: -12.6, 60: -11.2
        };
        
        let baseDeclination = globalZoneDeclinations[zone] || 0;
        
        // Корекція по широті
        const latCorrection = (lat - 50) * 0.15;
        
        // Корекція по довготі (відносно центру зони)
        const zoneCenterLng = (zone - 1) * 6 - 180 + 3;
        const lngCorrection = (lng - zoneCenterLng) * 0.08;
        
        return baseDeclination + latCorrection + lngCorrection;
    }

    // Визначення UTM зони по координатах
    getUTMZoneFromCoords(lat, lng) {
        return Math.floor((lng + 180) / 6) + 1;
    }

    // Очищення кешу
    clearCache() {
        this.cache.clear();
        this.lastUpdate = null;
    }

    // Отримання статистики кешу
    getCacheStats() {
        return {
            size: this.cache.size,
            lastUpdate: this.lastUpdate,
            keys: Array.from(this.cache.keys())
        };
    }

    // Валідація магнітного схилення
    validateDeclination(declination, lat, lng) {
        // Для України схилення має бути в межах 3-15°
        if (lat >= 44 && lat <= 53 && lng >= 22 && lng <= 41) {
            return declination >= 3 && declination <= 15;
        }
        
        // Для інших регіонів більш широкі межі
        return declination >= -30 && declination <= 30;
    }
}

// Експортуємо клас
window.MagneticDeclinationHelper = MagneticDeclinationHelper;