// Простий обробник кнопки згортання
if (!window.toggleInitialized) {
    window.toggleInitialized = true;
    document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('toggleBtn');
    const sidebar = document.getElementById('sidebar');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.add('hidden');
            
            // Показуємо кнопку розгортання
            setTimeout(() => {
                const expandBtn = document.querySelector('.expand-menu-btn');
                if (expandBtn) {
                    expandBtn.style.display = 'block';
                } else if (window.expandMenuBtn) {
                    const btn = window.expandMenuBtn.getContainer().querySelector('button');
                    if (btn) btn.style.display = 'block';
                }
                
                if (window.calculator && window.calculator.map) {
                    window.calculator.map.invalidateSize();
                }
            }, 100);
        });
    }
    });
}