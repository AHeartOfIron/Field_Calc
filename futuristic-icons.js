// Футуристичні іконки
class FuturisticIcons {
    static getFullscreenIcon(isFullscreen) {
        if (isFullscreen) {
            return `<svg width="16" height="16" viewBox="0 0 16 16">
                <path d="M2 2h4v2H4v2H2V2zm8 0h4v4h-2V4h-2V2zM4 10H2v4h4v-2H4v-2zm8 0v2h-2v2h4v-4h-2z" 
                      fill="currentColor" stroke="none"/>
                <circle cx="8" cy="8" r="1" fill="currentColor"/>
            </svg>`;
        } else {
            return `<svg width="16" height="16" viewBox="0 0 16 16">
                <path d="M6 2H2v4h2V4h2V2zm4 0v2h2v2h2V2h-4zM4 10H2v4h4v-2H4v-2zm8 0v2h-2v2h4v-4h-2z" 
                      fill="currentColor" stroke="none"/>
                <rect x="6" y="6" width="4" height="4" fill="none" stroke="currentColor" stroke-width="1"/>
            </svg>`;
        }
    }
    
    static getSidebarIcon(isOpen) {
        if (isOpen) {
            return `<svg width="16" height="16" viewBox="0 0 16 16">
                <path d="M12 3L8 8l4 5V3z" fill="currentColor"/>
                <rect x="2" y="4" width="1" height="8" fill="currentColor"/>
                <rect x="4" y="5" width="1" height="6" fill="currentColor"/>
            </svg>`;
        } else {
            return `<svg width="16" height="16" viewBox="0 0 16 16">
                <path d="M4 3l4 5-4 5V3z" fill="currentColor"/>
                <rect x="13" y="4" width="1" height="8" fill="currentColor"/>
                <rect x="11" y="5" width="1" height="6" fill="currentColor"/>
            </svg>`;
        }
    }
}

window.FuturisticIcons = FuturisticIcons;