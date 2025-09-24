class ImportModule {
    constructor(calculator) {
        this.calculator = calculator;
    }

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const currentSiteName = document.getElementById('siteName').value.trim();
        if (!currentSiteName) {
            const fileName = file.name.replace(/\.[^/.]+$/, '');
            document.getElementById('siteName').value = fileName;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                let points = [];
                
                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(content);
                    points = data.points || [];
                } else if (file.name.endsWith('.kml') || file.name.endsWith('.kmz')) {
                    const namedPoints = this.extractNamedPoints(content);
                    if (namedPoints.length > 0) {
                        this.loadNamedPoints(namedPoints, file.name);
                        return;
                    }
                    
                    const parser = new DOMParser();
                    const kml = parser.parseFromString(content, 'text/xml');
                    const pointCoords = kml.querySelectorAll('Point coordinates');
                    
                    pointCoords.forEach(coord => {
                        const coordText = coord.textContent.trim();
                        const coordPairs = coordText.split(/[\s\n\r]+/).filter(p => p.length > 0);
                        
                        coordPairs.forEach(pair => {
                            if (pair.includes(',')) {
                                const parts = pair.split(',');
                                const lng = parseFloat(parts[0]);
                                const lat = parseFloat(parts[1]);
                                
                                if (!isNaN(lng) && !isNaN(lat)) {
                                    if (this.calculator.currentProjection) {
                                        const projected = proj4('EPSG:4326', this.calculator.currentProjection, [lng, lat]);
                                        points.push(projected);
                                    } else {
                                        points.push([lng, lat]);
                                    }
                                }
                            }
                        });
                    });
                } else if (file.name.endsWith('.csv')) {
                    const lines = content.split('\n');
                    lines.slice(1).forEach(line => {
                        const [name, bearing, trueBearing, distance, x, y] = line.split(',');
                        if (x && y && !isNaN(x) && !isNaN(y)) {
                            points.push([parseFloat(x), parseFloat(y)]);
                        }
                    });
                }
                
                if (points.length > 0) {
                    const neededPoints = points.length - 3;
                    if (neededPoints !== this.calculator.pointCount && neededPoints > 0) {
                        this.calculator.pointCount = neededPoints;
                        document.getElementById('pointCount').value = neededPoints;
                        this.calculator.generateTable();
                    }
                    
                    const inputs = ['lm', 'bm', 'sp', ...Array.from({length: this.calculator.pointCount}, (_, j) => `tp${j+1}`)];
                    inputs.forEach((input, i) => {
                        const xInput = document.getElementById(`${input}_x`);
                        const yInput = document.getElementById(`${input}_y`);
                        if (xInput && yInput) {
                            if (points[i]) {
                                xInput.value = Math.round(points[i][0]);
                                yInput.value = Math.round(points[i][1]);
                            } else {
                                xInput.value = 0;
                                yInput.value = 0;
                            }
                        }
                    });
                    setTimeout(() => {
                        this.calculator.autoCalculate();
                        this.calculator.calculate();
                    }, 200);
                } else {
                    this.calculator.showError('Координати не знайдено');
                }
            } catch (err) {
                this.calculator.showError('Помилка імпорту: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    extractNamedPoints(content) {
        const parser = new DOMParser();
        const kml = parser.parseFromString(content, 'text/xml');
        const placemarks = kml.querySelectorAll('Placemark');
        const namedPoints = [];
        
        placemarks.forEach(placemark => {
            const name = placemark.querySelector('name');
            const point = placemark.querySelector('Point coordinates');
            
            if (name && point && name.textContent.match(/^(LM|BM|SP|TP\d+)$/i)) {
                const coords = point.textContent.trim().split(',');
                const lng = parseFloat(coords[0]);
                const lat = parseFloat(coords[1]);
                
                if (!isNaN(lng) && !isNaN(lat)) {
                    namedPoints.push({
                        name: name.textContent.toUpperCase(),
                        coords: [lng, lat]
                    });
                }
            }
        });
        
        return namedPoints;
    }

    loadNamedPoints(namedPoints, fileName) {
        const siteName = document.getElementById('siteName').value.trim();
        if (!siteName) {
            document.getElementById('siteName').value = fileName.replace(/\.[^/.]+$/, '');
        }
        
        // Сортуємо точки по часовій стрілці
        const originalOrder = namedPoints.map(p => p.name).join('-');
        namedPoints = this.sortPointsClockwise(namedPoints);
        const newOrder = namedPoints.map(p => p.name).join('-');
        
        if (originalOrder !== newOrder) {
            console.log(`Порядок точок відкориговано: ${originalOrder} → ${newOrder}`);
        }
        
        if (namedPoints.length > 0) {
            const firstPoint = namedPoints[0].coords;
            if (Math.abs(firstPoint[0]) <= 180) {
                const zone = Math.floor((firstPoint[0] + 180) / 6) + 1;
                this.setUTMZone(zone);
            }
        }
        
        ['lm', 'bm', 'sp', ...Array.from({length: 20}, (_, i) => `tp${i+1}`)].forEach(type => {
            const xInput = document.getElementById(`${type}_x`);
            const yInput = document.getElementById(`${type}_y`);
            if (xInput) xInput.value = '';
            if (yInput) yInput.value = '';
        });
        
        namedPoints.forEach(point => {
            const type = point.name.toLowerCase();
            const xInput = document.getElementById(`${type}_x`);
            const yInput = document.getElementById(`${type}_y`);
            
            if (xInput && yInput) {
                let coords = point.coords;
                
                if (this.calculator.currentProjection && Math.abs(coords[0]) <= 180) {
                    coords = proj4('EPSG:4326', this.calculator.currentProjection, coords);
                }
                
                xInput.value = Math.round(coords[0]);
                yInput.value = Math.round(coords[1]);
            }
        });
        
        const tpCount = namedPoints.filter(p => p.name.startsWith('TP')).length;
        if (tpCount > 0 && tpCount !== this.calculator.pointCount) {
            this.calculator.pointCount = tpCount;
            document.getElementById('pointCount').value = tpCount;
            this.calculator.generateTable();
            
            setTimeout(() => {
                namedPoints.forEach(point => {
                    const type = point.name.toLowerCase();
                    const xInput = document.getElementById(`${type}_x`);
                    const yInput = document.getElementById(`${type}_y`);
                    
                    if (xInput && yInput) {
                        let coords = point.coords;
                        if (this.calculator.currentProjection && Math.abs(coords[0]) <= 180) {
                            coords = proj4('EPSG:4326', this.calculator.currentProjection, coords);
                        }
                        xInput.value = Math.round(coords[0]);
                        yInput.value = Math.round(coords[1]);
                    }
                });
                
                this.calculator.autoCalculate();
                this.calculator.calculate();
            }, 100);
        } else {
            setTimeout(() => {
                this.calculator.autoCalculate();
                this.calculator.calculate();
            }, 100);
        }
        
        let message = `Завантажено ${namedPoints.length} точок`;
        if (originalOrder !== newOrder) {
            message += ' (порядок відкориговано по часовій стрілці)';
        }
        const tpCountImport = namedPoints.filter(p => p.name.startsWith('TP')).length;
        if (tpCountImport > 200) {
            message += ` (обмежено до 200 TP точок)`;
        }
        this.calculator.showNotification(message);
    }

    sortPointsClockwise(points) {
        if (points.length < 3) return points;
        
        // Видаляємо дублікати (точки ближче 1м)
        points = this.removeDuplicatePoints(points);
        
        // Знаходимо SP точку
        let spIndex = points.findIndex(p => p.name === 'SP');
        if (spIndex === -1) {
            spIndex = 0;
            points[0].name = 'SP';
        }
        
        const spPoint = points[spIndex];
        const tpPoints = points.filter((p, i) => i !== spIndex && p.name.startsWith('TP'));
        const otherPoints = points.filter(p => !p.name.startsWith('TP') && p.name !== 'SP');
        
        if (tpPoints.length === 0) return points;
        
        // Обмежуємо кількість TP точок до 200
        const limitedTpPoints = tpPoints.slice(0, 200);
        
        // Обчислюємо центр та сортуємо
        const centerX = limitedTpPoints.reduce((sum, p) => sum + p.coords[0], spPoint.coords[0]) / (limitedTpPoints.length + 1);
        const centerY = limitedTpPoints.reduce((sum, p) => sum + p.coords[1], spPoint.coords[1]) / (limitedTpPoints.length + 1);
        const spAngle = Math.atan2(spPoint.coords[1] - centerY, spPoint.coords[0] - centerX);
        
        limitedTpPoints.sort((a, b) => {
            const angleA = Math.atan2(a.coords[1] - centerY, a.coords[0] - centerX);
            const angleB = Math.atan2(b.coords[1] - centerY, b.coords[0] - centerX);
            let normalizedA = angleA - spAngle;
            let normalizedB = angleB - spAngle;
            if (normalizedA < 0) normalizedA += 2 * Math.PI;
            if (normalizedB < 0) normalizedB += 2 * Math.PI;
            return normalizedB - normalizedA;
        });
        
        limitedTpPoints.forEach((point, index) => {
            point.name = `TP${index + 1}`;
        });
        
        return [spPoint, ...limitedTpPoints, ...otherPoints];
    }
    
    removeDuplicatePoints(points) {
        const filtered = [];
        
        points.forEach(point => {
            const isDuplicate = filtered.some(existing => 
                point.coords[0] === existing.coords[0] && point.coords[1] === existing.coords[1]
            );
            if (!isDuplicate) filtered.push(point);
        });
        
        return filtered;
    }
    
    setUTMZone(zone) {
        const utmSelect = document.getElementById('utmZone');
        utmSelect.value = `utm${zone}`;
        this.calculator.currentProjection = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
        
        const declinations = { 35: 5.5, 36: 7.0, 37: 8.5, 38: 10.0, 39: 11.5 };
        const declination = declinations[zone] || 7.0;
        document.getElementById('magneticDeclination').value = declination;
    }
}

window.ImportModule = ImportModule;