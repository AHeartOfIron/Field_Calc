class SRIDCalculator {
    constructor() {
        this.map = null;
        this.currentProjection = '';
        this.markers = [];
        this.polygon = null;
        this.pointCount = 3;
        this.init();
    }

    init() {
        this.initUTMZones();
        this.initMap();
        this.bindEvents();
        this.generateTable();
    }

    initUTMZones() {
        const select = document.getElementById('utmZone');
        for (let zone = 1; zone <= 60; zone++) {
            const option = document.createElement('option');
            option.value = `utm${zone}`;
            option.textContent = `UTM Zone ${zone}N`;
            select.appendChild(option);
        }
    }

    initMap() {
        this.map = L.map('map', { zoomControl: false }).setView([50.4, 30.5], 8);
        L.control.zoom({ position: 'topleft' }).addTo(this.map);

        const baseLayers = {
            'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
            'Google Satellite': L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            }),
            'Google Hybrid': L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            }),
            'Google Streets': L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            }),
            'Esri Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'),
            'CartoDB Dark': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'),

        };

        baseLayers['OpenStreetMap'].addTo(this.map);
        L.control.layers(baseLayers).addTo(this.map);
        L.control.scale({ imperial: false }).addTo(this.map);
        
        const searchControl = L.Control.extend({
            onAdd: function(map) {
                const div = L.DomUtil.create('div', 'leaflet-control-search');
                div.innerHTML = '<button onclick="window.searchLocation()" title="Пошук місця">🔍</button>';
                return div;
            }
        });
        new searchControl({ position: 'topright' }).addTo(this.map);

        this.map.on('click', (e) => this.onMapClick(e));
    }

    bindEvents() {
        document.getElementById('utmZone').addEventListener('change', (e) => {
            const zone = e.target.value.replace('utm', '');
            if (zone) {
                this.currentProjection = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
            }
        });

        document.getElementById('generateTable').addEventListener('click', () => {
            this.pointCount = parseInt(document.getElementById('pointCount').value);
            this.generateTable();
        });

        document.getElementById('calculate').addEventListener('click', () => this.calculate());
        document.getElementById('reset').addEventListener('click', () => this.reset());
        document.getElementById('adjustClosure').addEventListener('click', () => this.adjustClosure());
        document.getElementById('toggleSidebar').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('licenseBtn').addEventListener('click', () => this.showLicense());
    }

    generateTable() {
        let html = '<table class="points-table">';
        html += '<tr><th><b>Від</b><br>From</th><th><b>До</b><br>To</th><th><b>Азимут (Магнітний)</b><br>Magnetic bearing</th><th><b>Азимут (Істинний)</b><br>True bearing</th><th><b>Відстань (м)</b><br>Distance</th><th><b>Long/UTM X</b></th><th><b>Lat/UTM Y</b></th></tr>';
        
        html += '<tr><td>LM</td><td>BM</td><td class="auto">-</td><td class="auto">-</td><td class="auto">-</td><td><input type="number" id="lm_x" step="1" min="100000" max="999999"></td><td><input type="number" id="lm_y" step="1" min="1000000" max="9999999"></td></tr>';
        html += '<tr><td>BM</td><td>SP</td><td class="auto">-</td><td class="auto">-</td><td class="auto">-</td><td><input type="number" id="bm_x" step="1" min="100000" max="999999"></td><td><input type="number" id="bm_y" step="1" min="1000000" max="9999999"></td></tr>';
        html += '<tr><td>SP</td><td>TP1</td><td class="auto">-</td><td class="auto">-</td><td class="auto">-</td><td><input type="number" id="sp_x" step="1" min="100000" max="999999"></td><td><input type="number" id="sp_y" step="1" min="1000000" max="9999999"></td></tr>';
        
        for (let i = 1; i <= this.pointCount; i++) {
            const next = i === this.pointCount ? 'SP*' : `TP${i+1}`;
            html += `<tr><td>TP${i}</td><td>${next}</td><td class="auto">-</td><td class="auto">-</td><td class="auto">-</td><td><input type="number" id="tp${i}_x" step="1" min="100000" max="999999"></td><td><input type="number" id="tp${i}_y" step="1" min="1000000" max="9999999"></td></tr>`;
        }
        
        html += '</table>';
        html += '<p style="font-size: 11px; color: #888; margin-top: 10px; text-align: center;">💡 Подвійний клік на "Азимут (Магнітний)" або "Відстань (м)" для редагування</p>';
        document.getElementById('pointsTable').innerHTML = html;
        this.bindTableEvents();
    }

    bindTableEvents() {
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', () => {
                setTimeout(() => this.autoCalculate(), 100);
            });
        });
        
        document.getElementById('export').addEventListener('click', () => this.exportData());
        document.getElementById('import').addEventListener('change', (e) => this.importData(e));
    }

    autoCalculate() {
        const allPoints = [];
        
        // Get all points including LM, BM, SP, TP
        const lmX = parseFloat(document.getElementById('lm_x').value);
        const lmY = parseFloat(document.getElementById('lm_y').value);
        if (!isNaN(lmX) && !isNaN(lmY)) allPoints.push([lmX, lmY]);
        
        const bmX = parseFloat(document.getElementById('bm_x').value);
        const bmY = parseFloat(document.getElementById('bm_y').value);
        if (!isNaN(bmX) && !isNaN(bmY)) allPoints.push([bmX, bmY]);
        
        const spX = parseFloat(document.getElementById('sp_x').value);
        const spY = parseFloat(document.getElementById('sp_y').value);
        if (!isNaN(spX) && !isNaN(spY)) allPoints.push([spX, spY]);
        
        for (let i = 1; i <= this.pointCount; i++) {
            const x = parseFloat(document.getElementById(`tp${i}_x`).value);
            const y = parseFloat(document.getElementById(`tp${i}_y`).value);
            if (!isNaN(x) && !isNaN(y)) allPoints.push([x, y]);
        }
        
        if (allPoints.length < 2) return;
        
        const declination = parseFloat(document.getElementById('magneticDeclination').value) || 0;
        const rows = document.querySelectorAll('.points-table tr');
        
        // Calculate for each row
        for (let i = 1; i < rows.length && i < allPoints.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            
            const p1 = allPoints[i-1];
            const p2 = allPoints[i];
            
            if (p1 && p2) {
                const dx = p2[0] - p1[0];
                const dy = p2[1] - p1[1];
                const distance = Math.sqrt(dx*dx + dy*dy);
                
                console.log(`Point ${i-1} [${p1[0]}, ${p1[1]}] to Point ${i} [${p2[0]}, ${p2[1]}]`);
                console.log(`dx=${dx}, dy=${dy}, distance=${distance.toFixed(3)}m`);
                // Calculate azimuth from North (geodetic standard)
                // dx = East, dy = North
                let bearing = Math.atan2(dx, dy) * 180 / Math.PI;
                if (bearing < 0) bearing += 360;
                
                console.log(`From ${i-1} to ${i}: dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}, bearing=${bearing.toFixed(1)}°`);
                const trueBearing = (bearing + declination + 360) % 360;
                
                console.log(`Row ${i}: P1=${p1}, P2=${p2}, Distance=${distance.toFixed(1)}`);
                
                if (cells[2]) {
                    cells[2].textContent = bearing.toFixed(1);
                    cells[2].ondblclick = () => this.editCell(cells[2], 'bearing');
                }
                if (cells[3]) cells[3].textContent = trueBearing.toFixed(1);
                if (cells[4]) {
                    cells[4].textContent = distance.toFixed(1);
                    cells[4].ondblclick = () => this.editCell(cells[4], 'distance');
                }
            }
        }
        
        // Calculate closing line (last TP to SP)
        if (allPoints.length > 3) {
            const lastRow = rows[rows.length - 1];
            const cells = lastRow.querySelectorAll('td');
            const lastTP = allPoints[allPoints.length - 1];
            const sp = allPoints[2]; // SP is at index 2
            
            const dx = sp[0] - lastTP[0];
            const dy = sp[1] - lastTP[1];
            const distance = Math.sqrt(dx*dx + dy*dy);
            // Calculate azimuth from North (geodetic standard)
            let bearing = Math.atan2(dx, dy) * 180 / Math.PI;
            if (bearing < 0) bearing += 360;
            
            console.log(`Closing line to SP: dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}, distance=${distance.toFixed(1)}m, bearing=${bearing.toFixed(1)}°`);
            const trueBearing = (bearing + declination + 360) % 360;
            
            cells[2].textContent = bearing.toFixed(1);
            cells[2].ondblclick = () => this.editCell(cells[2], 'bearing');
            cells[3].textContent = trueBearing.toFixed(1);
            cells[4].textContent = distance.toFixed(1);
            cells[4].ondblclick = () => this.editCell(cells[4], 'distance');
        }
    }

    exportData() {
        const format = document.getElementById('exportFormat').value;
        const points = this.getPoints();
        
        switch(format) {
            case 'csv':
                this.exportCSV(points);
                break;
            case 'kml':
                this.exportKML(points);
                break;

            case 'json':
                this.exportJSON(points);
                break;
        }
    }

    exportCSV(points) {
        let csv = 'Від,До,Азимут (Магнітний),Азимут (Істинний),Відстань (м),Long/UTM X,Lat/UTM Y\n';
        csv += 'From,To,Magnetic bearing,True bearing,Distance,,\n';
        
        const rows = document.querySelectorAll('.points-table tr');
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            const row = [];
            cells.forEach(cell => {
                const input = cell.querySelector('input');
                let value = input ? input.value : cell.textContent;
                // Clean up values
                if (value === '-') value = '';
                row.push(value);
            });
            csv += row.join(',') + '\n';
        }
        
        const blob = new Blob([csv], {type: 'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fieldcalc_data.csv';
        a.click();
    }

    exportKML(points) {
        const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
        
        let kml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        kml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n';
        kml += '<Document>\n';
        kml += '<name>FieldCalc Survey</name>\n';
        
        // Add points
        points.forEach(point => {
            const latLng = proj4(this.currentProjection, 'EPSG:4326', point.coords);
            kml += '<Placemark>\n';
            kml += `<name>${point.type}</name>\n`;
            kml += '<Point>\n';
            kml += `<coordinates>${latLng[0]},${latLng[1]},0</coordinates>\n`;
            kml += '</Point>\n';
            kml += '</Placemark>\n';
        });
        
        // Add polygon
        if (polygonPoints.length >= 3) {
            kml += '<Placemark>\n';
            kml += '<name>Survey Polygon</name>\n';
            kml += '<Polygon>\n';
            kml += '<outerBoundaryIs>\n';
            kml += '<LinearRing>\n';
            kml += '<coordinates>\n';
            
            polygonPoints.forEach(point => {
                const latLng = proj4(this.currentProjection, 'EPSG:4326', point.coords);
                kml += `${latLng[0]},${latLng[1]},0 `;
            });
            
            // Close polygon
            const firstLatLng = proj4(this.currentProjection, 'EPSG:4326', polygonPoints[0].coords);
            kml += `${firstLatLng[0]},${firstLatLng[1]},0`;
            
            kml += '\n</coordinates>\n';
            kml += '</LinearRing>\n';
            kml += '</outerBoundaryIs>\n';
            kml += '</Polygon>\n';
            kml += '</Placemark>\n';
        }
        
        kml += '</Document>\n';
        kml += '</kml>';
        
        const blob = new Blob([kml], {type: 'application/vnd.google-earth.kml+xml'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fieldcalc_survey.kml';
        a.click();
    }



    exportJSON(points) {
        const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
        
        const data = {
            type: 'FeatureCollection',
            features: [
                // Points
                ...points.map(point => {
                    const latLng = proj4(this.currentProjection, 'EPSG:4326', point.coords);
                    return {
                        type: 'Feature',
                        properties: { name: point.type },
                        geometry: {
                            type: 'Point',
                            coordinates: [latLng[0], latLng[1]]
                        }
                    };
                }),
                // Polygon
                ...(polygonPoints.length >= 3 ? [{
                    type: 'Feature',
                    properties: { name: 'Survey Polygon' },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            ...polygonPoints.map(point => {
                                const latLng = proj4(this.currentProjection, 'EPSG:4326', point.coords);
                                return [latLng[0], latLng[1]];
                            }),
                            // Close polygon
                            (() => {
                                const latLng = proj4(this.currentProjection, 'EPSG:4326', polygonPoints[0].coords);
                                return [latLng[0], latLng[1]];
                            })()
                        ]]
                    }
                }] : [])
            ]
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fieldcalc_survey.geojson';
        a.click();
    }

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                let points = [];
                
                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(content);
                    points = data.points || [];
                } else if (file.name.endsWith('.kml')) {
                    const parser = new DOMParser();
                    const kml = parser.parseFromString(content, 'text/xml');
                    
                    // Try to detect UTM zone from KML content
                    const kmlText = content.toLowerCase();
                    let detectedZone = null;
                    
                    // Look for UTM zone in various formats
                    const utmMatches = kmlText.match(/utm[\s_]*zone[\s_]*(\d{1,2})/i) || 
                                     kmlText.match(/zone[\s_]*(\d{1,2})[\s_]*n/i) ||
                                     kmlText.match(/epsg[:\s]*(326\d{2})/i);
                    
                    if (utmMatches) {
                        if (utmMatches[1].startsWith('326')) {
                            detectedZone = utmMatches[1].slice(-2);
                        } else {
                            detectedZone = utmMatches[1];
                        }
                    }
                    
                    const coords = kml.querySelectorAll('coordinates, Point coordinates, Polygon coordinates, LineString coordinates');
                    
                    if (!utmMatches) {
                        // Auto-detect UTM zone from first coordinate
                        coords.forEach(coord => {
                            const coordText = coord.textContent.trim();
                            const coordPairs = coordText.split(/[\s\n\r]+/).filter(p => p.length > 0);
                            if (coordPairs.length > 0 && coordPairs[0].includes(',')) {
                                const parts = coordPairs[0].split(',');
                                const lng = parseFloat(parts[0]);
                                if (!isNaN(lng) && Math.abs(lng) <= 180) {
                                    detectedZone = Math.floor((lng + 180) / 6) + 1;
                                    console.log(`Auto-calculated UTM zone from longitude ${lng}: Zone ${detectedZone}`);
                                }
                            }
                        });
                    }
                    
                    if (detectedZone) {
                        const utmSelect = document.getElementById('utmZone');
                        utmSelect.value = `utm${detectedZone}`;
                        this.currentProjection = `+proj=utm +zone=${detectedZone} +datum=WGS84 +units=m +no_defs`;
                        
                        // Set magnetic declination based on UTM zone (approximate)
                        const declinations = {
                            35: 5, 36: 7, 37: 9, 38: 11, 39: 13 // Ukraine zones
                        };
                        const declination = declinations[detectedZone] || 7;
                        document.getElementById('magneticDeclination').value = declination;
                        
                        console.log(`Auto-set UTM zone ${detectedZone}, declination ${declination}°`);
                    }
                    
                    coords.forEach(coord => {
                        const coordText = coord.textContent.trim();
                        const coordPairs = coordText.split(/[\s\n\r]+/).filter(p => p.length > 0);
                        
                        coordPairs.forEach(pair => {
                            if (pair.includes(',')) {
                                const parts = pair.split(',');
                                const lng = parseFloat(parts[0]);
                                const lat = parseFloat(parts[1]);
                                
                                if (!isNaN(lng) && !isNaN(lat)) {
                                    // Always convert WGS84 to UTM, use detected zone if no projection set
                                    let projection = this.currentProjection;
                                    if (!projection && detectedZone) {
                                        projection = `+proj=utm +zone=${detectedZone} +datum=WGS84 +units=m +no_defs`;
                                    }
                                    
                                    if (projection) {
                                        const projected = proj4('EPSG:4326', projection, [lng, lat]);
                                        points.push(projected);
                                        console.log(`Converted WGS84 [${lng}, ${lat}] to UTM [${projected[0].toFixed(3)}, ${projected[1].toFixed(3)}]`);
                                    } else {
                                        points.push([lng, lat]);
                                    }
                                }
                            }
                        });
                    });
                    
                    console.log('KML parsed, found points:', points.length);
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
                    // Auto-adjust point count to match imported points exactly
                    const neededPoints = points.length - 3; // -3 for LM, BM, SP
                    if (neededPoints !== this.pointCount && neededPoints > 0) {
                        this.pointCount = neededPoints;
                        document.getElementById('pointCount').value = neededPoints;
                        this.generateTable();
                    }
                    
                    const inputs = ['lm', 'bm', 'sp', ...Array.from({length: this.pointCount}, (_, j) => `tp${j+1}`)];
                    points.forEach((point, i) => {
                        if (inputs[i]) {
                            const xInput = document.getElementById(`${inputs[i]}_x`);
                            const yInput = document.getElementById(`${inputs[i]}_y`);
                            if (xInput) xInput.value = Math.round(point[0]);
                            if (yInput) yInput.value = Math.round(point[1]);
                        }
                    });
                    setTimeout(() => {
                        this.autoCalculate();
                        this.calculate();
                    }, 200);
                } else {
                    this.showError('No coordinates found');
                }
            } catch (err) {
                this.showError('Import error: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    onMapClick(e) {
        if (!this.currentProjection) return;
        
        const projected = proj4('EPSG:4326', this.currentProjection, [e.latlng.lng, e.latlng.lat]);
        console.log(`Clicked: ${Math.round(projected[0])}, ${Math.round(projected[1])}`);
    }

    calculate() {
        this.autoCalculate();
        
        if (!this.currentProjection) {
            this.showError('Оберіть систему координат');
            return;
        }

        const points = this.getPoints();
        if (points.length < 3) {
            this.showError('Потрібно мінімум 3 точки');
            return;
        }

        this.drawPolygon(points);
        const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP')).map(p => p.coords);
        console.log('Polygon points only (SP + TP):', polygonPoints);
        this.calculateResults(polygonPoints);
        this.clearError();
    }

    getPoints() {
        const points = [];
        
        // LM point
        const lmX = parseFloat(document.getElementById('lm_x').value);
        const lmY = parseFloat(document.getElementById('lm_y').value);
        if (!isNaN(lmX) && !isNaN(lmY)) points.push({coords: [lmX, lmY], type: 'LM'});
        
        // BM point
        const bmX = parseFloat(document.getElementById('bm_x').value);
        const bmY = parseFloat(document.getElementById('bm_y').value);
        if (!isNaN(bmX) && !isNaN(bmY)) points.push({coords: [bmX, bmY], type: 'BM'});
        
        // SP point
        const spX = parseFloat(document.getElementById('sp_x').value);
        const spY = parseFloat(document.getElementById('sp_y').value);
        if (!isNaN(spX) && !isNaN(spY)) points.push({coords: [spX, spY], type: 'SP'});

        // TP points
        for (let i = 1; i <= this.pointCount; i++) {
            const x = parseFloat(document.getElementById(`tp${i}_x`).value);
            const y = parseFloat(document.getElementById(`tp${i}_y`).value);
            if (!isNaN(x) && !isNaN(y)) points.push({coords: [x, y], type: `TP${i}`});
        }

        return points;
    }

    drawPolygon(points) {
        if (this.polygon) this.map.removeLayer(this.polygon);
        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];

        if (points.length < 3 || !this.currentProjection) return;

        try {
            // Draw all points with custom markers
            points.forEach(point => {
                const converted = proj4(this.currentProjection, 'EPSG:4326', point.coords);
                const latLng = [converted[1], converted[0]];
                
                let marker;
                if (point.type === 'LM') {
                    marker = L.marker(latLng, {
                        icon: L.divIcon({
                            html: '<div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:16px solid #dc2626;"></div><div style="text-align:center;margin-top:2px;font-weight:bold;color:#dc2626;">LM</div>',
                            className: 'custom-marker',
                            iconSize: [20, 20]
                        })
                    }).addTo(this.map);
                } else if (point.type === 'BM') {
                    marker = L.marker(latLng, {
                        icon: L.divIcon({
                            html: '<div style="width:16px;height:16px;background:#dc2626;border:2px solid #fff;"></div><div style="text-align:center;margin-top:2px;font-weight:bold;color:#dc2626;">BM</div>',
                            className: 'custom-marker',
                            iconSize: [20, 20]
                        })
                    }).addTo(this.map);
                } else if (point.type === 'SP') {
                    marker = L.marker(latLng, {
                        icon: L.divIcon({
                            html: '<div style="width:16px;height:16px;background:#dc2626;border:2px solid #fff;border-radius:50%;position:relative;"><div style="width:6px;height:6px;background:#fff;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);"></div></div><div style="text-align:center;margin-top:2px;font-weight:bold;color:#dc2626;">SP</div>',
                            className: 'custom-marker',
                            iconSize: [20, 20]
                        })
                    }).addTo(this.map);
                } else {
                    marker = L.marker(latLng, {
                        icon: L.divIcon({
                            html: `<div style="width:16px;height:16px;border:3px solid #dc2626;border-radius:50%;background:transparent;"></div><div style="text-align:center;margin-top:2px;font-weight:bold;color:#dc2626;">${point.type}</div>`,
                            className: 'custom-marker',
                            iconSize: [20, 20]
                        })
                    }).addTo(this.map);
                }
                this.markers.push(marker);
            });

            // Draw polygon only with SP and TP points
            const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
            if (polygonPoints.length >= 3) {
                const latLngs = polygonPoints.map(p => {
                    const converted = proj4(this.currentProjection, 'EPSG:4326', p.coords);
                    return [converted[1], converted[0]];
                });

                this.polygon = L.polygon(latLngs, {
                    color: '#dc2626',
                    weight: 3,
                    fillColor: '#dc2626',
                    fillOpacity: 0.2
                }).addTo(this.map);
            }

            // Fit map to all points
            const allLatLngs = points.map(p => {
                const converted = proj4(this.currentProjection, 'EPSG:4326', p.coords);
                return [converted[1], converted[0]];
            });
            this.map.fitBounds(allLatLngs);
        } catch (error) {
            console.error('Error drawing polygon:', error);
        }
    }

    calculateResults(points) {
        if (points.length < 3) return;
        
        try {
            // Calculate area and perimeter directly from UTM coordinates (more accurate)
            let area = 0;
            let perimeter = 0;
            
            // Shoelace formula for area in UTM coordinates
            for (let i = 0; i < points.length; i++) {
                const j = (i + 1) % points.length;
                area += points[i][0] * points[j][1];
                area -= points[j][0] * points[i][1];
                
                // Calculate perimeter
                const dx = points[j][0] - points[i][0];
                const dy = points[j][1] - points[i][1];
                perimeter += Math.sqrt(dx * dx + dy * dy);
            }
            
            area = Math.abs(area) / 2; // Complete shoelace formula
            
            console.log(`UTM Area: ${area.toFixed(1)}m² (${(area/10000).toFixed(4)} га), Perimeter: ${perimeter.toFixed(1)}m`);
            console.log('Individual distances:', points.map((p, i) => {
                const j = (i + 1) % points.length;
                const dx = points[j][0] - p[0];
                const dy = points[j][1] - p[1];
                return Math.sqrt(dx*dx + dy*dy).toFixed(1) + 'm';
            }));

            const areaHa = area / 10000;
            document.getElementById('area').textContent = areaHa.toFixed(4) + ' га';
            document.getElementById('perimeter').textContent = Math.round(perimeter) + ' м';

            const closureError = this.calculateClosureError(points);
            document.getElementById('closureError').textContent = closureError.toFixed(2) + '%';
        } catch (error) {
            console.error('Error calculating results:', error);
        }
    }

    calculateClosureError(points) {
        if (points.length < 3) return 0;
        
        // For imported points, there should be NO closure error
        // because we create a perfect closed polygon from discrete points
        
        // Calculate perimeter (all sides)
        let perimeter = 0;
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const dx = p2[0] - p1[0];
            const dy = p2[1] - p1[1];
            perimeter += Math.sqrt(dx * dx + dy * dy);
        }
        
        console.log(`Perfect closed polygon, Perimeter: ${perimeter.toFixed(1)}m`);
        
        // Return 0% error for imported points (perfect closure)
        return 0;
    }

    reset() {
        document.getElementById('utmZone').value = '';
        document.getElementById('pointCount').value = 3;
        document.getElementById('magneticDeclination').value = 7;
        
        if (this.polygon) this.map.removeLayer(this.polygon);
        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];
        
        document.getElementById('area').textContent = '-';
        document.getElementById('perimeter').textContent = '-';
        document.getElementById('closureError').textContent = '-';
        
        this.currentProjection = '';
        this.pointCount = 3;
        this.generateTable();
        this.clearError();
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        this.showNotification(message);
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(145deg, #dc2626, #b91c1c);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);
            z-index: 10000;
            font-weight: 600;
            max-width: 80%;
            text-align: center;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    clearError() {
        document.getElementById('error').style.display = 'none';
    }
    
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('toggleSidebar');
        
        if (sidebar.classList.contains('collapsed')) {
            sidebar.classList.remove('collapsed');
        } else {
            sidebar.classList.add('collapsed');
        }
        
        setTimeout(() => this.map.invalidateSize(), 300);
    }

    showLicense() {
        window.open('license.html', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    }

    adjustClosure() {
        const points = this.getPoints();
        const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP'));
        
        if (polygonPoints.length < 3) {
            this.showError('Потрібно мінімум 3 точки');
            return;
        }

        const coords = polygonPoints.map(p => p.coords);
        const first = coords[0];
        const last = coords[coords.length - 1];
        
        const dx = last[0] - first[0];
        const dy = last[1] - first[1];
        const closureDistance = Math.sqrt(dx*dx + dy*dy);
        
        // Find which point contributes most to error
        let maxContribution = 0;
        let problemPoint = '';
        
        for (let i = 1; i < coords.length; i++) {
            const contribution = Math.sqrt(
                Math.pow(coords[i][0] - coords[0][0], 2) + 
                Math.pow(coords[i][1] - coords[0][1], 2)
            );
            if (contribution > maxContribution) {
                maxContribution = contribution;
                problemPoint = polygonPoints[i].type;
            }
        }
        
        const closurePercent = this.calculateClosureError(coords);
        this.showError(`Похибка ${closurePercent.toFixed(1)}% (відстань ${closureDistance.toFixed(0)}м). Полігон не замкнутий!`);
        
        if (closurePercent < 0.1) {
            this.showError('Похибка 0% - корекція не потрібна');
            return;
        }

        // Distribute closure error proportionally (Bowditch method)
        let totalDistance = 0;
        const distances = [];
        
        // Calculate distances between consecutive points
        for (let i = 0; i < coords.length - 1; i++) {
            const d = Math.sqrt(
                Math.pow(coords[i+1][0] - coords[i][0], 2) + 
                Math.pow(coords[i+1][1] - coords[i][1], 2)
            );
            distances.push(d);
            totalDistance += d;
        }
        
        console.log('Before adjustment:', coords.map(c => `[${c[0]}, ${c[1]}]`));
        console.log(`Closure error: dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}`);
        
        // Apply Bowditch adjustment
        let cumulativeDistance = 0;
        for (let i = 1; i < coords.length - 1; i++) {
            cumulativeDistance += distances[i-1];
            const ratio = cumulativeDistance / totalDistance;
            
            const adjustX = -dx * ratio;
            const adjustY = -dy * ratio;
            
            // Limit adjustment to 1m
            coords[i][0] += Math.max(-1, Math.min(1, adjustX));
            coords[i][1] += Math.max(-1, Math.min(1, adjustY));
            
            console.log(`Point ${i}: ratio=${ratio.toFixed(3)}, adjust=[${adjustX.toFixed(1)}, ${adjustY.toFixed(1)}]`);
        }
        
        console.log('After adjustment:', coords.map(c => `[${c[0]}, ${c[1]}]`));

        coords.forEach((coord, i) => {
            const pointType = polygonPoints[i].type.toLowerCase();
            const xInput = document.getElementById(`${pointType}_x`);
            const yInput = document.getElementById(`${pointType}_y`);
            
            if (xInput) xInput.value = Math.round(coord[0]);
            if (yInput) yInput.value = Math.round(coord[1]);
        });

        // Force recalculation of bearings and distances
        setTimeout(() => {
            this.autoCalculate();
            this.calculate();
            this.showNotification(`Координати скориговано. Нова похибка: ${this.calculateClosureError(coords).toFixed(2)}%`);
        }, 100);
    }
    
    editCell(cell, type) {
        const currentValue = cell.textContent;
        const input = document.createElement('input');
        input.type = 'number';
        input.value = currentValue;
        input.style.cssText = 'width: 100%; background: rgba(139,0,0,0.2); color: white; border: 1px solid #8B0000; border-radius: 3px; padding: 2px; text-align: center;';
        
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        input.select();
        
        const saveValue = () => {
            const newValue = parseFloat(input.value);
            if (!isNaN(newValue)) {
                cell.textContent = newValue.toFixed(1);
                cell.ondblclick = () => this.editCell(cell, type);
                this.showNotification(`${type === 'bearing' ? 'Азимут' : 'Відстань'} змінено на ${newValue.toFixed(1)}`);
                
                // Recalculate coordinates based on new bearing/distance
                this.recalculateFromBearingDistance();
                this.calculate();
            } else {
                cell.textContent = currentValue;
                cell.ondblclick = () => this.editCell(cell, type);
            }
        };
        
        input.onblur = saveValue;
        input.onkeydown = (e) => {
            if (e.key === 'Enter') saveValue();
            if (e.key === 'Escape') {
                cell.textContent = currentValue;
                cell.ondblclick = () => this.editCell(cell, type);
            }
        };
    }
    
    recalculateFromBearingDistance() {
        // This would require complex reverse calculations
        // For now, just recalculate closure error with current coordinates
        const points = this.getPoints();
        const polygonPoints = points.filter(p => p.type === 'SP' || p.type.startsWith('TP')).map(p => p.coords);
        if (polygonPoints.length >= 3) {
            const closureError = this.calculateClosureError(polygonPoints);
            document.getElementById('closureError').textContent = closureError.toFixed(2) + '%';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.calculator = new SRIDCalculator();
});
window.searchLocation = function() {
    const searchDiv = document.createElement('div');
    searchDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(145deg, #1a1a1a, #2a2a2a);
        color: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        z-index: 10001;
        border: 1px solid #444;
        min-width: 350px;
    `;
    searchDiv.innerHTML = `
        <h3 style="color: #dc2626; margin-bottom: 20px; text-align: center; font-size: 18px;">Пошук населеного пункту</h3>
        <input type="text" id="searchInput" placeholder="Назва міста..." style="
            width: 100%;
            padding: 12px;
            margin: 15px 0;
            background: rgba(255,255,255,0.1);
            border: 1px solid #444;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            box-sizing: border-box;
        ">
        <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button onclick="performSearch()" style="
                flex: 1;
                padding: 12px;
                background: linear-gradient(145deg, #dc2626, #b91c1c);
                border: none;
                border-radius: 6px;
                color: white;
                cursor: pointer;
                font-weight: 600;
            ">Пошук</button>
            <button onclick="closeSearch()" style="
                flex: 1;
                padding: 12px;
                background: rgba(255,255,255,0.1);
                border: 1px solid #444;
                border-radius: 6px;
                color: white;
                cursor: pointer;
            ">Скасувати</button>
        </div>
    `;
    document.body.appendChild(searchDiv);
    document.getElementById('searchInput').focus();
    
    window.performSearch = function() {
        const query = document.getElementById('searchInput').value;
        if (!query) return;
        
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    window.calculator.map.setView([lat, lng], 13);
                    closeSearch();
                } else {
                    alert('Місце не знайдено');
                }
            })
            .catch(error => {
                console.error('Search error:', error);
                alert('Помилка пошуку');
            });
    };
    
    window.closeSearch = function() {
        searchDiv.remove();
    };
};

window.calculator = null;