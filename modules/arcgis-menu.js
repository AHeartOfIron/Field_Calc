class ArcGISMenu {
    constructor(arcgisExport) {
        this.arcgisExport = arcgisExport;
    }

    createMenu() {
        const menuHTML = `
            <div class="arcgis-menu-overlay" id="arcgisMenuOverlay">
                <div class="arcgis-menu-container">
                    <div class="arcgis-menu-header">
                        <h3>📊 ArcGIS Export</h3>
                        <button class="arcgis-menu-close" onclick="closeArcGISMenu()">×</button>
                    </div>
                    
                    <div class="arcgis-menu-content">
                        <div class="arcgis-section">
                            <h4>🗺️ Shapefile Files</h4>
                            <div class="arcgis-buttons">
                                <button onclick="arcgisMenu.exportSHP()" class="arcgis-btn">📐 Точки SHP</button>
                                <button onclick="arcgisMenu.exportDBF()" class="arcgis-btn">📋 DBF</button>
                                <button onclick="arcgisMenu.exportSHX()" class="arcgis-btn">🔍 SHX</button>
                                <button onclick="arcgisMenu.exportPRJ()" class="arcgis-btn">🌍 PRJ</button>
                                <button onclick="arcgisMenu.exportInstructions()" class="arcgis-btn">📖 Instructions</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const menuCSS = `
            <style>
            .arcgis-menu-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
            }

            .arcgis-menu-container {
                background: #1a1a1a;
                border-radius: 8px;
                border: 1px solid #444;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }



            .arcgis-menu-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 30px;
                border-bottom: 1px solid #444;
            }

            .arcgis-menu-header h3 {
                color: #8B0000;
                margin: 0;
                font-size: 20px;
                font-weight: 600;
            }

            .arcgis-menu-close {
                background: #666;
                border: none;
                color: white;
                font-size: 18px;
                width: 30px;
                height: 30px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .arcgis-menu-close:hover {
                background: #777;
                transform: scale(1.1);
            }

            .arcgis-menu-content {
                padding: 30px;
            }

            .arcgis-section {
                margin-bottom: 25px;
            }

            .arcgis-section h4 {
                color: #8B0000;
                margin: 0 0 15px 0;
                font-size: 16px;
                font-weight: 600;
            }

            .arcgis-buttons {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }

            .arcgis-btn {
                background: #8B0000;
                border: none;
                color: white;
                padding: 15px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                text-align: center;
            }

            .arcgis-btn:hover {
                background: #a00000;
            }

            .arcgis-btn.primary {
                background: #8B0000;
                font-size: 16px;
                padding: 18px;
            }

            .arcgis-btn.primary:hover {
                background: #a00000;
            }

            @media (max-width: 600px) {
                .arcgis-menu-container {
                    margin: 20px;
                    width: calc(100% - 40px);
                }
                
                .arcgis-buttons {
                    grid-template-columns: 1fr;
                }
            }
            </style>
        `;

        // Додаємо CSS
        if (!document.getElementById('arcgis-menu-styles')) {
            const styleElement = document.createElement('div');
            styleElement.id = 'arcgis-menu-styles';
            styleElement.innerHTML = menuCSS;
            document.head.appendChild(styleElement);
        }

        // Додаємо HTML
        const menuElement = document.createElement('div');
        menuElement.innerHTML = menuHTML;
        document.body.appendChild(menuElement);

        return menuElement;
    }

    show(points, siteName) {
        this.points = points;
        this.siteName = siteName;
        
        // Підготовка даних
        this.arcgisExport.exportSHP(points, siteName);
        
        this.createMenu();
    }

    hide() {
        const overlay = document.getElementById('arcgisMenuOverlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // Методи експорту
    exportPoints() {
        if (this.arcgisExport.exportAllSHPFiles) {
            this.arcgisExport.exportAllSHPFiles();
        } else {
            // Fallback - експортуємо файли по одному
            this.arcgisExport.exportSHPFile();
        }
    }

    exportSHP() {
        console.log('exportSHP called', this.arcgisExport);
        this.arcgisExport.exportSHPFile();
    }

    exportDBF() {
        this.arcgisExport.exportDBFFile();
    }

    exportSHX() {
        this.arcgisExport.exportSHXFile();
    }

    exportPRJ() {
        this.arcgisExport.exportPRJFile();
    }

    exportGeoJSONPoints() {
        this.arcgisExport.exportGeoJSONPoints(this.points, this.siteName);
    }

    exportGeoJSONPolygon() {
        this.arcgisExport.exportGeoJSONPolygon(this.points, this.siteName);
    }

    exportGeoJSON() {
        this.arcgisExport.exportGeoJSON(this.points, this.siteName);
    }

    exportGeoPackage() {
        this.arcgisExport.exportGeoPackage(this.points, this.siteName);
    }

    exportStyles() {
        this.arcgisExport.exportSHPStyle(this.siteName);
    }

    exportInstructions() {
        this.arcgisExport.exportInstruction(this.siteName);
    }
}

// Глобальні функції
let arcgisMenu;

function showArcGISMenu(points, siteName) {
    if (!window.calculator || !window.calculator.arcgisExport) {
        alert('ArcGIS Export не завантажено');
        return;
    }
    
    arcgisMenu = new ArcGISMenu(window.calculator.arcgisExport);
    arcgisMenu.show(points, siteName);
}

function closeArcGISMenu() {
    if (arcgisMenu) {
        arcgisMenu.hide();
    }
}

// Закриття по кліку поза меню
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('arcgis-menu-overlay')) {
        closeArcGISMenu();
    }
});

window.ArcGISMenu = ArcGISMenu;
console.log('✅ ArcGIS Menu завантажено');
