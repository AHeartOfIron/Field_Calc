class CalculationsModule {
    constructor(calculator) {
        this.calculator = calculator;
    }

    autoCalculate() {
        const points = this.calculator.getPoints();
        if (points.length < 3) return;

        const rows = document.querySelectorAll('.points-table tr');
        
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            const fromType = cells[0]?.textContent?.trim();
            let toType = cells[1]?.textContent?.trim();
            
            // Якщо це остання точка і вона йде до SP*, знаходимо SP
            if (toType === 'SP*') {
                toType = 'SP';
            }
            
            const fromPoint = points.find(p => p.type === fromType);
            const toPoint = points.find(p => p.type === toType);
            
            if (fromPoint && toPoint) {
                const dx = toPoint.coords[0] - fromPoint.coords[0];
                const dy = toPoint.coords[1] - fromPoint.coords[1];
                const distance = Math.sqrt(dx * dx + dy * dy);
                const bearing = Math.atan2(dx, dy) * 180 / Math.PI;
                const normalizedBearing = bearing < 0 ? bearing + 360 : bearing;
                
                const magneticDeclination = parseFloat(document.getElementById('magneticDeclination').value) || 0;
                // Істинний азимут = Магнітний азимут + Схилення (для позитивного схилення)
                const magneticBearing = normalizedBearing - magneticDeclination;
                const finalMagneticBearing = magneticBearing < 0 ? magneticBearing + 360 : magneticBearing;
                
                if (cells[2]) cells[2].textContent = finalMagneticBearing.toFixed(1) + '°';
                if (cells[3]) cells[3].textContent = normalizedBearing.toFixed(1) + '°';
                if (cells[4]) cells[4].textContent = distance.toFixed(1);
            }
        }
    }

    calculateResults(polygonPoints) {
        if (polygonPoints.length < 3) return;
        
        let area = 0;
        for (let i = 0; i < polygonPoints.length; i++) {
            const j = (i + 1) % polygonPoints.length;
            area += polygonPoints[i][0] * polygonPoints[j][1];
            area -= polygonPoints[j][0] * polygonPoints[i][1];
        }
        area = Math.abs(area) / 2;
        this.calculator.currentArea = area;
        
        let perimeter = 0;
        for (let i = 0; i < polygonPoints.length; i++) {
            const j = (i + 1) % polygonPoints.length;
            const dx = polygonPoints[j][0] - polygonPoints[i][0];
            const dy = polygonPoints[j][1] - polygonPoints[i][1];
            perimeter += Math.sqrt(dx * dx + dy * dy);
        }
        
        this.updateAreaDisplay();
        document.getElementById('perimeter').textContent = perimeter.toFixed(1) + ' м';
        
        const closureError = this.calculateClosureError(polygonPoints);
        document.getElementById('closureError').textContent = closureError.toFixed(3) + ' %';
    }

    calculateClosureError(polygonPoints) {
        if (polygonPoints.length < 3) return 0;
        
        let sumX = 0, sumY = 0;
        for (let i = 0; i < polygonPoints.length; i++) {
            const j = (i + 1) % polygonPoints.length;
            const dx = polygonPoints[j][0] - polygonPoints[i][0];
            const dy = polygonPoints[j][1] - polygonPoints[i][1];
            sumX += dx;
            sumY += dy;
        }
        
        const closureDistance = Math.sqrt(sumX * sumX + sumY * sumY);
        let totalPerimeter = 0;
        for (let i = 0; i < polygonPoints.length; i++) {
            const j = (i + 1) % polygonPoints.length;
            const dx = polygonPoints[j][0] - polygonPoints[i][0];
            const dy = polygonPoints[j][1] - polygonPoints[i][1];
            totalPerimeter += Math.sqrt(dx * dx + dy * dy);
        }
        
        return totalPerimeter > 0 ? (closureDistance / totalPerimeter) * 100 : 0;
    }

    updateAreaDisplay() {
        const unit = document.getElementById('areaUnit').value;
        const areaElement = document.getElementById('area');
        
        if (!this.calculator.currentArea) {
            areaElement.textContent = '0';
            return;
        }
        
        switch(unit) {
            case 'm2':
                areaElement.textContent = this.calculator.currentArea.toFixed(2) + ' м²';
                break;
            case 'ha':
                areaElement.textContent = (this.calculator.currentArea / 10000).toFixed(4) + ' га';
                break;
            case 'km2':
                areaElement.textContent = (this.calculator.currentArea / 1000000).toFixed(6) + ' км²';
                break;
            case 'acres':
                areaElement.textContent = (this.calculator.currentArea / 4047).toFixed(4) + ' акрів';
                break;
        }
    }
}

window.CalculationsModule = CalculationsModule;