class BasicMethods {
    constructor(calculator) {
        this.calculator = calculator;
    }

    reset() {
        document.querySelectorAll('input[type="number"]').forEach(input => input.value = '');
        document.getElementById('siteName').value = '';
        if (this.calculator.polygon) this.calculator.map.removeLayer(this.calculator.polygon);
        this.calculator.markers.forEach(m => this.calculator.map.removeLayer(m));
        this.calculator.markers = [];
        this.calculator.currentArea = 0;
        document.getElementById('area').textContent = '0';
        document.getElementById('perimeter').textContent = '0';
        document.getElementById('closureError').textContent = '0';
        this.calculator.showNotification('Дані очищено');
    }

    showHistory() {
        const saved = JSON.parse(localStorage.getItem('fieldcalc_projects') || '[]');
        const recent = saved.slice(0, 10);
        
        const autoSave = localStorage.getItem('fieldcalc_autosave');
        if (autoSave) {
            try {
                const data = JSON.parse(autoSave);
                const lastSave = new Date(data.timestamp);
                const now = new Date();
                if (now - lastSave < 24 * 60 * 60 * 1000) {
                    recent.unshift({...data, isAutoSave: true});
                }
            } catch (e) {}
        }
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); z-index: 10000; display: flex; align-items: center; justify-content: center;';
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        
        const content = document.createElement('div');
        content.style.cssText = 'background: #1a1a1a; padding: 30px; border-radius: 8px; border: 1px solid #444; max-width: 800px; max-height: 80vh; overflow-y: auto;';
        content.onclick = (e) => e.stopPropagation();
        
        let html = '<h3 style="color: #8B0000; margin-bottom: 15px; text-align: center;">📚 Останні 10 проектів</h3>';
        
        if (recent.length === 0) {
            html += '<p style="color: #ccc; text-align: center; padding: 40px;">Немає збережених проектів</p>';
        } else {
            html += '<div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 25px;">';
            recent.forEach((project, i) => {
                const date = new Date(project.timestamp).toLocaleString('uk-UA');
                const label = project.isAutoSave ? '💾 Автозбереження' : '';
                const area = project.results?.area ? (project.results.area/10000).toFixed(2) + ' га' : '-';
                html += `
                    <div style="background: rgba(139, 0, 0, 0.1); border: 1px solid rgba(139, 0, 0, 0.3); border-radius: 6px; padding: 15px;">
                        <div style="margin-bottom: 10px;">
                            <div style="color: #8B0000; font-weight: 600;">${project.siteName}</div>
                            <div style="color: #ccc; font-size: 12px;">${label} ${date} | ${area}</div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="window.calculator.loadProject(${i}, ${project.isAutoSave || false})" style="padding: 6px 12px; background: #8B0000; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 11px;">Завантажити</button>
                            <button onclick="window.calculator.deleteProject(${i})" style="padding: 6px 10px; background: #660000; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 11px;">✕</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        html += '<button onclick="this.parentElement.parentElement.remove()" style="padding: 12px 25px; background: #666; border: none; border-radius: 6px; color: white; cursor: pointer; width: 100%;">Закрити</button>';
        
        content.innerHTML = html;
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    loadProject(index, isAutoSave = false) {
        let project;
        if (isAutoSave) {
            project = JSON.parse(localStorage.getItem('fieldcalc_autosave'));
        } else {
            const saved = JSON.parse(localStorage.getItem('fieldcalc_projects') || '[]');
            project = saved[index];
        }
        if (!project) return;
        
        document.getElementById('siteName').value = project.siteName;
        document.getElementById('utmZone').value = project.utmZone;
        document.getElementById('magneticDeclination').value = project.magneticDeclination;
        
        // Оновлюємо проекцію
        const zone = project.utmZone.replace('utm', '');
        this.calculator.currentProjection = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
        
        if (project.pointCount !== this.calculator.pointCount) {
            document.getElementById('pointCount').value = project.pointCount;
            this.calculator.updateTableSize(project.pointCount);
        }
        
        setTimeout(() => {
            Object.keys(project.points).forEach(type => {
                const coords = project.points[type];
                if (coords && coords.length >= 2) {
                    const xInput = document.getElementById(`${type}_x`);
                    const yInput = document.getElementById(`${type}_y`);
                    if (xInput && yInput) {
                        xInput.value = coords[0];
                        yInput.value = coords[1];
                    }
                }
            });
            
            this.calculator.currentProjection = `+proj=utm +zone=${project.utmZone.replace('utm', '')} +datum=WGS84 +units=m +no_defs`;
            this.calculator.autoCalculate();
            this.calculator.updateMapFromTable();
            
            setTimeout(() => this.calculator.goToSP(), 300);
            
            document.querySelectorAll('[style*="position: fixed"]').forEach(el => {
                if (el.style.zIndex >= 10000) el.remove();
            });
            this.calculator.showNotification(`Проект "${project.siteName}" завантажено!`);
        }, 200);
    }

    deleteProject(index) {
        const saved = JSON.parse(localStorage.getItem('fieldcalc_projects') || '[]');
        if (index < saved.length) {
            saved.splice(index, 1);
            localStorage.setItem('fieldcalc_projects', JSON.stringify(saved));
        }
        const modals = document.querySelectorAll('[style*="position: fixed"][style*="z-index: 10000"]');
        modals.forEach(modal => modal.remove());
        setTimeout(() => this.showHistory(), 100);
    }

    autoSave() {
        const siteName = document.getElementById('siteName').value.trim();
        if (!siteName) return;
        
        const autoSaveData = {
            siteName,
            utmZone: document.getElementById('utmZone').value,
            magneticDeclination: document.getElementById('magneticDeclination').value,
            pointCount: this.calculator.pointCount,
            points: this.getProjectPoints(),
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('fieldcalc_autosave', JSON.stringify(autoSaveData));
    }

    getProjectPoints() {
        const points = {};
        ['lm', 'bm', 'sp'].forEach(type => {
            const x = document.getElementById(`${type}_x`).value;
            const y = document.getElementById(`${type}_y`).value;
            if (x && y) points[type] = [parseFloat(x), parseFloat(y)];
        });
        
        for (let i = 1; i <= this.calculator.pointCount; i++) {
            const x = document.getElementById(`tp${i}_x`).value;
            const y = document.getElementById(`tp${i}_y`).value;
            if (x && y) points[`tp${i}`] = [parseFloat(x), parseFloat(y)];
        }
        
        return points;
    }

    loadAutoSave() {
        // Автопоказ історії відключено - викликається тільки вручну
        console.log('📚 AutoSave check completed');
    }

    setMagneticDeclinationForZone(zone) {
        const declinations = { 35: 5.5, 36: 7.0, 37: 8.5, 38: 10.0, 39: 11.5 };
        const declination = declinations[zone] || 7.0;
        document.getElementById('magneticDeclination').value = declination;
    }

    diagnoseClosure() {
        this.calculator.showNotification('Діагностика замикання...');
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
        }
    }

    showLicense() {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;';
        
        const content = document.createElement('div');
        content.style.cssText = 'background: #1a1a1a; padding: 30px; border-radius: 8px; border: 1px solid #444; max-width: 600px; max-height: 80vh; overflow-y: auto;';
        
        content.innerHTML = `
            <h3 style="color: #8B0000; margin-bottom: 20px;">📄 Ліцензія</h3>
            <p style="color: #ccc; line-height: 1.6;">
                Цей калькулятор створено для геодезичних розрахунків.<br>
                Використовуйте на власний ризик.<br>
                Перевіряйте результати додатковими методами.
            </p>
            <button onclick="this.parentElement.parentElement.remove()" style="padding: 12px 25px; background: #8B0000; border: none; border-radius: 6px; color: white; cursor: pointer; width: 100%; margin-top: 20px;">Закрити</button>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
    }
}

window.BasicMethods = BasicMethods;