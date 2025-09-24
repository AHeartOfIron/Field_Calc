// Глобальні функції для роботи з бібліотеками
console.log('🔧 Завантажуємо функції для роботи з бібліотеками...');

// Перезавантаження окремої бібліотеки
window.reloadLibrary = async function(key, button) {
    if (!window.libraryLoader) return;
    
    const originalText = button.textContent;
    button.textContent = 'Завантажуємо...';
    button.disabled = true;
    
    try {
        const success = await window.libraryLoader.reloadLibrary(key);
        
        if (success) {
            button.textContent = '✅ Завантажено';
            setTimeout(() => {
                button.textContent = 'Перезавантажити';
                button.disabled = false;
            }, 2000);
        } else {
            button.textContent = '❌ Помилка';
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 2000);
        }
    } catch (error) {
        console.error('Помилка перезавантаження:', error);
        button.textContent = '❌ Помилка';
        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 2000);
    }
};

// Перезавантаження всіх бібліотек
window.reloadAllLibraries = async function() {
    if (!window.libraryLoader) return;
    
    console.log('🔄 Перезавантажуємо всі бібліотеки...');
    
    try {
        await window.libraryLoader.loadAll();
        alert('✅ Всі бібліотеки перезавантажено!');
        
        // Оновлюємо налаштування якщо відкриті
        if (window.calculator) {
            window.calculator.showSettings();
        }
    } catch (error) {
        console.error('Помилка перезавантаження всіх бібліотек:', error);
        alert('❌ Помилка перезавантаження бібліотек');
    }
};

// Перевірка статусу бібліотек
window.checkLibrariesStatus = function() {
    if (!window.libraryLoader) return;
    
    const status = window.libraryLoader.getStatus();
    const loaded = Object.values(status).filter(lib => lib.loaded).length;
    const total = Object.keys(status).length;
    
    alert(`📊 Статус бібліотек:\nЗавантажено: ${loaded}/${total}\n\nДеталі в консолі браузера (F12)`);
    console.table(status);
};

// Функція для пошуку місць (заглушка)
window.searchLocation = function() {
    const query = prompt('🔍 Введіть назву місця для пошуку:');
    if (!query) return;
    
    // Тут можна додати реальний пошук через API
    alert(`Пошук "${query}" поки що недоступний.\nВ майбутніх версіях буде додано інтеграцію з картографічними сервісами.`);
};

console.log('✅ Функції для роботи з бібліотеками завантажено');