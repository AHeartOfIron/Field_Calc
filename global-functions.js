// Глобальні функції для HTML
console.log('🔧 Global functions loading...');

window.showTooltip = function(element, content) {
    console.log('💡 showTooltip called:', element, content);
    // Видаляємо попередні тултіпи
    const existingTooltips = document.querySelectorAll('.custom-tooltip');
    existingTooltips.forEach(tooltip => tooltip.remove());
    
    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    tooltip.innerHTML = content;
    tooltip.style.cssText = `
        position: absolute;
        background: #1a1a1a;
        color: white;
        padding: 15px;
        border-radius: 8px;
        border: 1px solid #8B0000;
        max-width: 350px;
        z-index: 10000;
        font-size: 13px;
        line-height: 1.4;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = (rect.left + window.scrollX) + 'px';
    tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
    
    // Перевіряємо чи тултіп не виходить за межі екрану
    const tooltipRect = tooltip.getBoundingClientRect();
    if (tooltipRect.right > window.innerWidth) {
        tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
    }
    if (tooltipRect.bottom > window.innerHeight) {
        tooltip.style.top = (rect.top + window.scrollY - tooltipRect.height - 5) + 'px';
    }
    
    // Закриваємо тултіп при кліку поза ним
    setTimeout(() => {
        document.addEventListener('click', function closeTooltip(e) {
            if (!tooltip.contains(e.target) && e.target !== element) {
                tooltip.remove();
                document.removeEventListener('click', closeTooltip);
            }
        });
    }, 100);
};

// Ініціалізація відключена - використовуємо init.js
// console.log('🚀 DOM Content Loaded event listener added');

console.log('🔧 Global functions loaded successfully');