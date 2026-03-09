document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('room-form');
    const roomsList = document.getElementById('rooms-list');
    const totalSummary = document.getElementById('total-summary');
    const totalPowerEl = document.getElementById('total-power');
    const totalElementsEl = document.getElementById('total-elements');
    const totalLitersEl = document.getElementById('total-liters');
    const isolationSelect = document.getElementById('isolation');
    const radiatorSelect = document.getElementById('radiator-type');
    const supplyTempSelect = document.getElementById('supply-temp');

    let rooms = [];

    // Recalculate everything if settings change
    isolationSelect.addEventListener('change', updateAllCalculations);
    radiatorSelect.addEventListener('change', updateAllCalculations);
    supplyTempSelect.addEventListener('change', updateAllCalculations);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = Date.now().toString();
        const name = document.getElementById('room-name').value;
        const length = parseFloat(document.getElementById('room-length').value);
        const width = parseFloat(document.getElementById('room-width').value);
        const height = parseFloat(document.getElementById('room-height').value);
        
        const volume = length * width * height;
        
        const room = { id, name, length, width, height, volume };
        rooms.push(room);
        
        form.reset();
        document.getElementById('room-height').value = "2.7"; // reset default height
        document.getElementById('room-name').focus();
        
        renderRooms();
    });

    function calculateRoomNeeds(volume) {
        const coeffMsCube = parseFloat(isolationSelect.value); // W/m³
        let basePowerPerElement = parseFloat(radiatorSelect.value); // W at ΔT 50 (T.mandata = 70°C, T.ritorno = 60°C, T.amb = 20°C -> (70+60)/2 - 20 = 45 -> approssimato a ΔT 50 per scopi commerciali o calcolo semplificato)
        // Per precisione, consideriamo il radiatore nominale dato dal costruttore solitamente a ΔT 50.
        // Se si abbassa o si alza la temperatura dell'impianto, cambia il ΔT e di conseguenza la resa.
        // Fattori correttivi stimati (n = ~1.3 tipico per alluminio):
        // 80°C (ΔT ~60) -> Resa maggiore del ~30% (Resa * 1.3)
        // 70°C (ΔT ~50) -> Resa Nominale (Resa * 1)
        // 60°C (ΔT ~40) -> Resa minore del ~25% (Resa * 0.75)
        // 50°C (ΔT ~30) -> Resa minore del ~50% (Resa * 0.5)
        
        const supplyTemp = supplyTempSelect.value;
        let powerMultiplier = 1;
        
        switch(supplyTemp) {
            case "50": powerMultiplier = 0.50; break;
            case "60": powerMultiplier = 0.75; break;
            case "70": powerMultiplier = 1.00; break;
            case "80": powerMultiplier = 1.30; break;
        }

        const actualPowerPerElement = basePowerPerElement * powerMultiplier;
        
        const powerNeeded = volume * coeffMsCube;
        // Arrotondamento all'intero superiore per gli elementi per garantire la copertura termica
        const elementsNeeded = Math.ceil(powerNeeded / actualPowerPerElement);
        
        let waterPerElement = 0.35; // Default average fallback
        if (radiatorSelect.value === "115") waterPerElement = 0.30;
        else if (radiatorSelect.value === "135") waterPerElement = 0.35;
        else if (radiatorSelect.value === "155") waterPerElement = 0.40;

        const litersNeeded = elementsNeeded * waterPerElement;
        
        return {
            powerNeeded: Math.round(powerNeeded),
            elementsNeeded,
            litersNeeded
        };
    }

    function updateAllCalculations() {
        if (rooms.length > 0) {
            renderRooms();
        }
    }

    function deleteRoom(id) {
        rooms = rooms.filter(r => r.id !== id);
        renderRooms();
    }

    // Expose to window for inline onclick handler
    window.deleteRoom = deleteRoom;

    function renderRooms() {
        if (rooms.length === 0) {
            roomsList.innerHTML = '<div class="empty-state">Nessun ambiente aggiunto. Compila il modulo per iniziare.</div>';
            totalSummary.classList.add('hidden');
            return;
        }

        roomsList.innerHTML = '';
        let globalPower = 0;
        let globalElements = 0;
        let globalLiters = 0;

        rooms.forEach((room) => {
            const { powerNeeded, elementsNeeded, litersNeeded } = calculateRoomNeeds(room.volume);
            
            globalPower += powerNeeded;
            globalElements += elementsNeeded;
            globalLiters += litersNeeded;

            const roomEl = document.createElement('div');
            roomEl.className = 'room-card';
            roomEl.innerHTML = `
                <div class="room-header">
                    <span class="room-title">${room.name}</span>
                    <button class="btn-delete" onclick="deleteRoom('${room.id}')" title="Rimuovi">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
                <div class="room-details">
                    <span>${room.length}x${room.width}x${room.height}m</span>
                    <span>Vol: ${room.volume.toFixed(1)} m³</span>
                </div>
                <div class="room-result">
                    <div style="display:flex; flex-direction:column; gap:0.25rem;">
                        <span>Fabbisogno: <b>${powerNeeded} W</b></span>
                        <span style="font-size:0.85rem; color:var(--text-muted)">Contenuto Acqua: ${litersNeeded.toFixed(1)} L</span>
                    </div>
                    <span class="result-elements">${elementsNeeded} elementi</span>
                </div>
            `;
            roomsList.appendChild(roomEl);
        });

        // Update totals
        totalPowerEl.textContent = `${globalPower} W`;
        totalElementsEl.textContent = globalElements;
        totalLitersEl.textContent = `${globalLiters.toFixed(1)} L`;
        totalSummary.classList.remove('hidden');
    }
});
