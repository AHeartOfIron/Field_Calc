class PNGExport {
    constructor(calculator) {
        this.calculator = calculator;
    }

    async exportPDF(points, siteName) {
        try {
            this.calculator.showNotification('📄 Створюємо PDF...');
            
            if (!window.jspdf) {
                this.calculator.showError('Потрібна бібліотека jsPDF');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('landscape', 'mm', 'a4');
            
            await this.addMapPageToPDF(pdf, points, siteName);
            pdf.addPage();
            await this.addDataPageToPDF(pdf, points, siteName);
            
            pdf.save(`${siteName}_report.pdf`);
            this.calculator.showNotification('✅ PDF звіт створено');
            
        } catch (error) {
            console.error('PDF export error:', error);
            this.calculator.showError('❌ Помилка створення PDF');
        }
    }
    
    async addMapPageToPDF(pdf, points, siteName) {
        const mapContainer = document.createElement('div');
        mapContainer.style.cssText = 'width: 1600px; height: 1200px; position: absolute; top: -9999px; left: -9999px; background: #fff;';
        mapContainer.innerHTML = '<div id="pdf-map" style="width: 100%; height: 100%;"></div>';
        document.body.appendChild(mapContainer);
        
        const pdfMap = L.map('pdf-map', { 
            zoomControl: false,
            attributionControl: false 
        }).setView([50.4, 30.5], 10);
        
        let currentTileLayer = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        this.calculator.map.eachLayer(layer => {
            if (layer._url) currentTileLayer = layer._url;
        });
        
        const isGoogle = currentTileLayer.includes('google.com');
        const tileLayer = isGoogle ? 
            L.tileLayer(currentTileLayer, { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }) :
            L.tileLayer(currentTileLayer);
        tileLayer.addTo(pdfMap);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const exportMarkers = [];
        if (this.calculator.convertedPoints) {
            this.calculator.convertedPoints.forEach(point => {
                if (point.latLng) {
                    const marker = L.marker(point.latLng, {
                        icon: window.MarkerDesign ? window.MarkerDesign.getMarkerIcon(point) : L.divIcon({
                            html: '<div style="width:24px;height:24px;background:#dc2626;border:4px solid #000;border-radius:50%;"></div>',
                            className: 'custom-marker',
                            iconSize: [24, 24],
                            iconAnchor: [12, 12]
                        })
                    }).addTo(pdfMap);
                    
                    marker.bindTooltip(point.type, { 
                        permanent: true, 
                        direction: 'top',
                        offset: [0, -30],
                        style: 'font-size: 20px; font-weight: bold;'
                    });
                    exportMarkers.push(marker);
                }
            });
            
            const polygonPoints = this.calculator.convertedPoints.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
            if (polygonPoints.length >= 2) {
                const sortedPoints = polygonPoints.sort((a, b) => {
                    if (a.type === 'SP') return -1;
                    if (b.type === 'SP') return 1;
                    const aNum = parseInt(a.type.replace('TP', '')) || 0;
                    const bNum = parseInt(b.type.replace('TP', '')) || 0;
                    return aNum - bNum;
                });
                
                // Малюємо лінії між точками (SP-TP1-TP2..-SP)
                for (let i = 0; i < sortedPoints.length; i++) {
                    const currentPoint = sortedPoints[i];
                    const nextPoint = sortedPoints[(i + 1) % sortedPoints.length];
                    
                    L.polyline([currentPoint.latLng, nextPoint.latLng], {
                        color: '#dc2626',
                        weight: 4,
                        opacity: 1
                    }).addTo(pdfMap);
                }
            }
        }
        
        if (exportMarkers.length > 0) {
            const group = new L.featureGroup(exportMarkers);
            pdfMap.fitBounds(group.getBounds(), { padding: [30, 30] });
            
            // Збільшуємо масштаб для кращої видимості
            const currentZoom = pdfMap.getZoom();
            pdfMap.setZoom(Math.min(currentZoom + 1, 18));
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const canvas = await html2canvas(mapContainer, {
            useCORS: true,
            scale: 3,
            backgroundColor: '#ffffff',
            dpi: 300
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        pdf.setFontSize(20);
        pdf.text('Карта земельної ділянки', 148, 15, { align: 'center' });
        pdf.text(siteName, 148, 25, { align: 'center' });
        pdf.addImage(imgData, 'PNG', 10, 35, 277, 170);
        
        pdfMap.remove();
        document.body.removeChild(mapContainer);
    }
    
    async addDataPageToPDF(pdf, points, siteName) {
        // Заголовок з полями
        pdf.setFontSize(16);
        pdf.text('Звіт по земельній ділянці', 148, 15, { align: 'center' });
        
        let yPos = 30;
        pdf.setFontSize(12);
        
        // Поля для заповнення
        pdf.text('IMSMA ID: ___________________', 20, yPos);
        pdf.text('Внутрішній ID: ___________________', 100, yPos);
        pdf.text('Автор: ___________________', 180, yPos);
        yPos += 15;
        
        pdf.text(`Назва завдання: ${siteName}`, 20, yPos);
        yPos += 20;
        
        pdf.setFontSize(14);
        pdf.text('Координати точок:', 20, yPos);
        yPos += 12;
        
        pdf.setFontSize(10);
        points.forEach(point => {
            pdf.text(`${point.type}: X=${Math.round(point.coords[0])}, Y=${Math.round(point.coords[1])}`, 25, yPos);
            yPos += 8;
        });
        
        yPos += 15;
        
        const areaUnit = document.getElementById('areaUnit')?.value || 'ha';
        let areaText = '';
        if (this.calculator.currentArea) {
            switch(areaUnit) {
                case 'ha': areaText = (this.calculator.currentArea / 10000).toFixed(4) + ' га'; break;
                case 'km2': areaText = (this.calculator.currentArea / 1000000).toFixed(6) + ' км²'; break;
                default: areaText = this.calculator.currentArea.toFixed(2) + ' м²';
            }
        }
        
        pdf.setFontSize(14);
        pdf.text('Результати розрахунків:', 20, yPos);
        yPos += 12;
        pdf.setFontSize(10);
        pdf.text(`Площа: ${areaText}`, 25, yPos);
        yPos += 8;
        pdf.text(`Периметр: ${document.getElementById('perimeter')?.textContent || '-'}`, 25, yPos);
        yPos += 8;
        pdf.text(`Похибка замикання: ${document.getElementById('closureError')?.textContent || '-'}`, 25, yPos);
        yPos += 8;
        pdf.text(`UTM зона: ${this.calculator.getUTMZone()}N`, 25, yPos);
        yPos += 8;
        pdf.text(`Магнітне схилення: ${document.getElementById('magneticDeclination')?.value || '7'}°`, 25, yPos);
        
        pdf.setFontSize(8);
        pdf.text(`Дата створення: ${new Date().toLocaleDateString('uk-UA')}`, 20, 190);
        pdf.text('© 2025 Illia Usachov | Ідея: The Halo Trust', 20, 200);
    }
    
    async exportPNG(points, siteName) {
        try {
            this.calculator.showNotification('📸 Створюємо 4K PNG карту...');
            
            let currentTileLayer = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            this.calculator.map.eachLayer(layer => {
                if (layer._url) currentTileLayer = layer._url;
            });
            
            const areaUnit = document.getElementById('areaUnit')?.value || 'ha';
            let areaText = '';
            if (this.calculator.currentArea) {
                switch(areaUnit) {
                    case 'ha': areaText = (this.calculator.currentArea / 10000).toFixed(4) + ' га'; break;
                    case 'km2': areaText = (this.calculator.currentArea / 1000000).toFixed(6) + ' км²'; break;
                    default: areaText = this.calculator.currentArea.toFixed(2) + ' м²';
                }
            }
            
            const exportContainer = document.createElement('div');
            exportContainer.style.cssText = 'width: 3840px; height: 2160px; position: absolute; top: -9999px; left: -9999px; background: #fff; font-family: Arial, sans-serif;'
            
            const magneticDeclination = document.getElementById('magneticDeclination')?.value || '7';
            
            exportContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; background: #f0f0f0; border-bottom: 2px solid #333;">
                    <h2 style="margin: 0 0 15px 0; color: #333; font-size: 48px;">Схематична карта</h2>
                    <div style="display: flex; justify-content: space-between; font-size: 28px; color: #333; margin-top: 10px;">
                        <div><strong>IMSMA ID:</strong> <input type="text" style="border: 2px solid #333; padding: 8px; width: 250px; text-align: center; font-size: 24px;"></div>
                        <div><strong>Внутрішній ID:</strong> <input type="text" style="border: 2px solid #333; padding: 8px; width: 250px; text-align: center; font-size: 24px;"></div>
                        <div><strong>Назва завдання:</strong> <span style="font-weight: bold; color: #8B0000;">${siteName}</span></div>
                        <div><strong>Автор:</strong> <input type="text" style="border: 2px solid #333; padding: 8px; width: 250px; text-align: center; font-size: 24px;"></div>
                    </div>
                </div>
                <div style="display: flex; gap: 30px; padding: 30px; background: #fff;">
                    <div id="export-map" style="width: 2600px; height: 1800px; border: 2px solid #333; position: relative;"></div>
                    <div style="width: 1000px; font-size: 36px;">
                        <div style="margin-bottom: 30px;">
                            <h4 style="margin: 0 0 15px 0; color: #333; font-size: 40px;">Координати</h4>
                            <table style="width: 100%; border-collapse: collapse; font-size: 32px;">
                                <tr style="background: #e0e0e0;">
                                    <th style="border-bottom: 3px solid #333; padding: 8px; color: #333; width: 25%; text-align: center;">Точка</th>
                                    <th style="border-bottom: 3px solid #333; padding: 8px; color: #333; width: 37.5%; text-align: center;">UTM X</th>
                                    <th style="border-bottom: 3px solid #333; padding: 8px; color: #333; width: 37.5%; text-align: center;">UTM Y</th>
                                </tr>
                                ${points.map(p => `
                                    <tr>
                                        <td style="border-bottom: 2px solid #ddd; padding: 6px; font-weight: bold; color: #333; width: 25%; text-align: center;">${p.type}</td>
                                        <td style="border-bottom: 2px solid #ddd; padding: 6px; color: #333; width: 37.5%; text-align: center;">${Math.round(p.coords[0])}</td>
                                        <td style="border-bottom: 2px solid #ddd; padding: 6px; color: #333; width: 37.5%; text-align: center;">${Math.round(p.coords[1])}</td>
                                    </tr>
                                `).join('')}
                            </table>
                        </div>
                        <div style="margin-bottom: 30px;">
                            <h4 style="margin: 0 0 15px 0; color: #333; font-size: 40px;">Азимути</h4>
                            <table style="width: 100%; border-collapse: collapse; font-size: 32px;">
                                <tr style="background: #e0e0e0;">
                                    <th style="border-bottom: 3px solid #333; padding: 8px; color: #333; width: 25%; text-align: center;">Від-До</th>
                                    <th style="border-bottom: 3px solid #333; padding: 8px; color: #333; width: 25%; text-align: center;">Магн.</th>
                                    <th style="border-bottom: 3px solid #333; padding: 8px; color: #333; width: 25%; text-align: center;">Іст.</th>
                                    <th style="border-bottom: 3px solid #333; padding: 8px; color: #333; width: 25%; text-align: center;">Відст.</th>
                                </tr>
                                ${this.getTableRows()}
                            </table>
                        </div>
                        <div>
                            <h4 style="margin: 0 0 15px 0; color: #333; font-size: 40px;">Легенда</h4>
                            <div style="font-size: 32px; line-height: 1.5;">
                                <div style="margin: 10px 0;"><svg width="24" height="24" viewBox="0 0 16 16" style="margin-right: 12px; vertical-align: middle;"><circle cx="8" cy="8" r="6" fill="#fff" stroke="#000" stroke-width="2"/><circle cx="8" cy="8" r="2" fill="#000"/></svg>SP — Початкова точка земельної ділянки</div>
                                <div style="margin: 10px 0;"><svg width="20" height="20" viewBox="0 0 12 12" style="margin-right: 12px; vertical-align: middle;"><circle cx="6" cy="6" r="4" fill="#fff" stroke="#000" stroke-width="2"/><circle cx="6" cy="6" r="1.5" fill="#000"/></svg>TP1, TP2... — Точки повороту земельної ділянки</div>
                                <div style="margin: 10px 0;"><svg width="24" height="24" viewBox="0 0 16 16" style="margin-right: 12px; vertical-align: middle;"><rect x="2" y="2" width="12" height="12" fill="#fff" stroke="#000" stroke-width="2"/><rect x="6" y="6" width="4" height="4" fill="#000"/></svg>BM — Базова точка (опорна геодезична)</div>
                                <div style="margin: 10px 0;"><svg width="28" height="28" viewBox="0 0 20 20" style="margin-right: 12px; vertical-align: middle;"><polygon points="10,3 17,15 3,15" fill="#fff" stroke="#000" stroke-width="2"/></svg>LM — Орієнтирна точка (видимий орієнтир)</div>
                                <div style="margin: 10px 0;"><span style="display: inline-block; width: 48px; height: 6px; background: #dc2626; margin-right: 12px; vertical-align: middle;"></span>— Межі земельної ділянки</div>
                                <div style="margin-top: 20px; border-top: 3px solid #ddd; padding-top: 15px; font-size: 28px; color: #666;">
                                    Додаткові позначення:
                                    ${Array.from({length: 6}, () => `<div style="margin: 8px 0; height: 30px; border-bottom: 2px dotted #ccc;"></div>`).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="text-align: center; padding: 15px; background: #f0f0f0; border-top: 2px solid #333; color: #333; font-size: 28px;">
                    <strong>Площа: ${areaText}</strong> | Зона: ${this.calculator.getUTMZone()}N | Магн. схил.: ${magneticDeclination}° | ${new Date().toLocaleDateString('uk-UA')}
                </div>
            `;
            
            document.body.appendChild(exportContainer);
            
            const exportMap = L.map('export-map', { 
                zoomControl: false,
                attributionControl: false 
            }).setView([50.4, 30.5], 10);
            
            const isGoogle = currentTileLayer.includes('google.com');
            const tileLayer = isGoogle ? 
                L.tileLayer(currentTileLayer, { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }) :
                L.tileLayer(currentTileLayer);
            tileLayer.addTo(exportMap);
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const exportMarkers = [];
            
            if (this.calculator.convertedPoints && this.calculator.convertedPoints.length > 0) {
                this.calculator.convertedPoints.forEach(point => {
                    if (point.latLng) {
                        const marker = L.marker(point.latLng, {
                            icon: window.MarkerDesign ? window.MarkerDesign.getMarkerIcon(point) : L.divIcon({
                                html: '<div style="width:32px;height:32px;background:#dc2626;border:6px solid #000;border-radius:50%;"></div>',
                                className: 'custom-marker',
                                iconSize: [32, 32],
                                iconAnchor: [16, 16]
                            })
                        }).addTo(exportMap);
                        
                        marker.bindTooltip(point.type, { 
                            permanent: true, 
                            direction: 'top',
                            offset: [0, -40],
                            className: 'marker-tooltip-4k',
                            style: 'font-size: 24px; font-weight: bold; padding: 8px 12px;'
                        });
                        exportMarkers.push(marker);
                    }
                });
                
                const polygonPoints = this.calculator.convertedPoints.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
                if (polygonPoints.length >= 2) {
                    const sortedPoints = polygonPoints.sort((a, b) => {
                        if (a.type === 'SP') return -1;
                        if (b.type === 'SP') return 1;
                        const aNum = parseInt(a.type.replace('TP', '')) || 0;
                        const bNum = parseInt(b.type.replace('TP', '')) || 0;
                        return aNum - bNum;
                    });
                    
                    // Малюємо лінії між точками (SP-TP1-TP2..-SP)
                    for (let i = 0; i < sortedPoints.length; i++) {
                        const currentPoint = sortedPoints[i];
                        const nextPoint = sortedPoints[(i + 1) % sortedPoints.length];
                        
                        L.polyline([currentPoint.latLng, nextPoint.latLng], {
                            color: '#dc2626',
                            weight: 6,
                            opacity: 1
                        }).addTo(exportMap);
                    }
                }
            }
            
            const lmPoint = points.find(p => p.type === 'LM');
            if (lmPoint && this.calculator.convertedPoints) {
                const lmConverted = this.calculator.convertedPoints.find(p => p.type === 'LM');
                if (lmConverted && lmConverted.latLng) {
                    setTimeout(() => this.addLMToMainMap(exportContainer, lmConverted, currentTileLayer, isGoogle), 1000);
                }
            }
            
            if (exportMarkers.length > 0) {
                const group = new L.featureGroup(exportMarkers);
                exportMap.fitBounds(group.getBounds(), { padding: [30, 30] });
                
                // Збільшуємо масштаб для кращої видимості
                const currentZoom = exportMap.getZoom();
                exportMap.setZoom(Math.min(currentZoom + 1, 18));
            }
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const canvas = await html2canvas(exportContainer, {
                useCORS: true,
                allowTaint: false,
                scale: 1,
                backgroundColor: '#ffffff',
                logging: false,
                width: 3840,
                height: 2160,
                dpi: 300
            });
            
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${siteName}_4K_map.png`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 100);
                
                this.calculator.showNotification('✅ 4K PNG карта збережена');
            }, 'image/png', 1.0);
            
            setTimeout(() => {
                exportMap.remove();
                document.body.removeChild(exportContainer);
            }, 4000);
            
        } catch (error) {
            console.error('PNG export error:', error);
            this.calculator.showError('❌ Помилка створення PNG: ' + error.message);
        }
    }
    
    async addLMToMainMap(mainContainer, lmPoint, tileLayerUrl, isGoogle) {
        try {
            const lmContainer = document.createElement('div');
            lmContainer.style.cssText = 'position: absolute; bottom: 30px; right: 30px; width: 300px; height: 300px; border: 4px solid #333; background: #fff; z-index: 1000;';
            lmContainer.innerHTML = '<div id="lm-mini-map" style="width: 100%; height: 100%;"></div>';
            
            const mapDiv = mainContainer.querySelector('#export-map');
            mapDiv.appendChild(lmContainer);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const lmMap = L.map('lm-mini-map', { 
                zoomControl: false,
                attributionControl: false,
                dragging: false,
                touchZoom: false,
                scrollWheelZoom: false,
                doubleClickZoom: false
            }).setView(lmPoint.latLng, 17);
            
            const tileLayer = isGoogle ? 
                L.tileLayer(tileLayerUrl, { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }) :
                L.tileLayer(tileLayerUrl);
            tileLayer.addTo(lmMap);
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            L.marker(lmPoint.latLng, {
                icon: window.MarkerDesign ? window.MarkerDesign.getMarkerIcon({type: 'LM'}) : L.divIcon({
                    html: '<div style="width:16px;height:16px;background:#dc2626;border:3px solid #000;border-radius:50%;"></div>',
                    className: 'custom-marker',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                })
            }).addTo(lmMap);
            
            const lmLabel = document.createElement('div');
            lmLabel.style.cssText = 'position: absolute; top: 5px; left: 5px; background: rgba(0,0,0,0.8); color: white; padding: 4px 8px; font-size: 18px; font-weight: bold; border-radius: 4px;';
            lmLabel.textContent = 'LM детально';
            lmContainer.appendChild(lmLabel);
            
        } catch (error) {
            console.error('LM mini map error:', error);
        }
    }
    
    getTableRows() {
        const rows = document.querySelectorAll('.points-table tr');
        let html = '';
        
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            if (cells.length >= 5) {
                const from = cells[0]?.textContent?.trim() || '';
                const to = cells[1]?.textContent?.trim() || '';
                const magBearing = cells[2]?.textContent?.trim() || '-';
                const trueBearing = cells[3]?.textContent?.trim() || '-';
                const distance = cells[4]?.textContent?.trim() || '-';
                
                html += `
                    <tr>
                        <td style="border-bottom: 2px solid #ddd; padding: 6px; font-weight: bold; color: #333; width: 25%; text-align: center;">${from}-${to}</td>
                        <td style="border-bottom: 2px solid #ddd; padding: 6px; color: #333; width: 25%; text-align: center;">${magBearing}</td>
                        <td style="border-bottom: 2px solid #ddd; padding: 6px; color: #333; width: 25%; text-align: center;">${trueBearing}</td>
                        <td style="border-bottom: 2px solid #ddd; padding: 6px; color: #333; width: 25%; text-align: center;">${distance}</td>
                    </tr>
                `;
            }
        }
        
        return html;
    }
}

window.PNGExport = PNGExport;
window.PDFExport = PNGExport;