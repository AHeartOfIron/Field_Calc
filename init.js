// Простий ініціалізатор з перевіркою дублювання
document.addEventListener('DOMContentLoaded', function() {
    // Перевіряємо чи вже є калькулятор
    if (window.calculator) {
        console.log('⚠️ Calculator already exists, skipping...');
        return;
    }
    
    setTimeout(() => {
        if (!window.calculator) {
            console.log('🚀 Creating new calculator...');
            window.calculator = new SRIDCalculator();
        } else {
            console.log('⚠️ Calculator already created during timeout');
        }
    }, 100);
});