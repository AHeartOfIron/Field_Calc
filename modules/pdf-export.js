class PDFExport {
    constructor(calculator) {
        this.calculator = calculator;
    }

    async exportPDF(points, siteName) {
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            
            // Заголовок
            pdf.setFontSize(16);
            pdf.text(`Звіт по ділянці: ${siteName}`, 20, 20);
            
            // Дата
            pdf.setFontSize(10);
            pdf.text(`Дата створення: ${new Date().toLocaleDateString('uk-UA')}`, 20, 30);
            
            // Таблиця точок
            let y = 50;
            pdf.setFontSize(12);
            pdf.text('Координати точок:', 20, y);
            y += 10;
            
            pdf.setFontSize(8);
            const headers = ['Точка', 'UTM X', 'UTM Y', 'Lat', 'Lng'];
            let x = 20;
            headers.forEach(header => {
                pdf.text(header, x, y);
                x += 30;
            });
            y += 10;
            
            points.forEach(point => {
                if (point.coords) {
                    let x = 20;
                    pdf.text(point.type, x, y);
                    x += 30;
                    pdf.text(point.coords[0].toFixed(2), x, y);
                    x += 30;
                    pdf.text(point.coords[1].toFixed(2), x, y);
                    x += 30;
                    
                    // Конвертуємо в lat/lng
                    try {
                        if (window.proj4 && this.calculator.currentProjection) {
                            const converted = proj4(this.calculator.currentProjection, 'EPSG:4326', point.coords);
                            pdf.text(converted[1].toFixed(6), x, y);
                            x += 30;
                            pdf.text(converted[0].toFixed(6), x, y);
                        }
                    } catch (e) {
                        pdf.text('-', x, y);
                        x += 30;
                        pdf.text('-', x, y);
                    }
                    
                    y += 8;
                }
            });
            
            // Результати
            y += 20;
            pdf.setFontSize(12);
            pdf.text('Результати розрахунків:', 20, y);
            y += 15;
            
            pdf.setFontSize(10);
            const area = document.getElementById('area').textContent;
            const perimeter = document.getElementById('perimeter').textContent;
            const closureError = document.getElementById('closureError').textContent;
            
            pdf.text(`Площа: ${area}`, 20, y);
            y += 10;
            pdf.text(`Периметр: ${perimeter}`, 20, y);
            y += 10;
            pdf.text(`Похибка замикання: ${closureError}`, 20, y);
            
            // Зберігаємо
            pdf.save(`${siteName}_report.pdf`);
            this.calculator.showNotification('PDF звіт створено');
            
        } catch (error) {
            console.error('PDF export error:', error);
            this.calculator.showError('Помилка створення PDF');
        }
    }

    async exportMapPDF(points, siteName) {
        try {
            const mapElement = document.getElementById('map');
            const canvas = await html2canvas(mapElement, {
                useCORS: true,
                allowTaint: true,
                scale: 1
            });
            
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('landscape');
            
            // Додаємо карту
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 10, 10, 277, 190);
            
            // Додаємо заголовок
            pdf.setFontSize(16);
            pdf.text(`Карта ділянки: ${siteName}`, 10, 210);
            
            pdf.save(`${siteName}_map.pdf`);
            this.calculator.showNotification('PDF карта створена');
            
        } catch (error) {
            console.error('Map PDF export error:', error);
            this.calculator.showError('Помилка створення PDF карти');
        }
    }
}

window.PDFExport = PDFExport;