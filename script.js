// --- STATO GLOBALE DELL'APPLICAZIONE ---
let tutteLeRicette = []; // Contiene gli oggetti completi di tutte le ricette iniettate via JSON
let currentTab = 'tutte'; // Stato della scheda attiva: 'tutte' (Archivio), 'frigo' (Svuota-Frigo), 'preferiti'
let activeRecipe = null; // Memorizza la ricetta attualmente visualizzata nella vista di dettaglio
let currentPortions = 4; // Contatore dinamico per il ricalcolo delle proporzioni degli ingredienti
let preferiti = JSON.parse(localStorage.getItem('ricette_preferite')) || []; // Sincronizzazione persistente dei preferiti locale

// --- INIZIALIZZAZIONE ASINCRONA DEL DATABASE ---
// DOMContentLoaded assicura che l'HTML sia pronto prima di eseguire le chiamate Fetch
window.addEventListener('DOMContentLoaded', async () => {
    try {
         // Carica il file indice posizionato nella cartella radice del progetto (lista-ricette.json)
        const responseIndice = await fetch('lista-ricette.json');
        const indiceRicette = await responseIndice.json();
        
        // Esegue il caricamento parallelo (Promise.all) di tutti i singoli file JSON delle ricette
        const caricamenti = indiceRicette.map(ricettaInfo => 
            fetch(ricettaInfo.file).then(res => res.json())
        );
        tutteLeRicette = await Promise.all(caricamenti);
        
         // Genera la lista dei checkbox univoci nell'HTML e avvia il primo rendering dei dati
        generaCheckboxFrigo();
        filtraRicette();

        // --- FIX AVVIO FRECCIA FILTRI SMARTPHONE ---
        // Verifichiamo se l'utente è su mobile all'apertura del sito
        const isMobile = window.innerWidth <= 768;
        const arrow = document.getElementById('toggle-arrow');
        const sidebar = document.getElementById('sidebar-filters');
        
        if (arrow && sidebar) {
            if (isMobile) {
                sidebar.classList.add('collapsed'); // Forza la chiusura della barra su mobile per non coprire i piatti
                arrow.innerText = "▼ FILTRI";
            } else {
                sidebar.classList.remove('collapsed'); // Mantiene la barra aperta su schermi PC grandi
                arrow.innerText = "◀";
            }
        }
        // -------------------------------------------

    } catch (error) {
        console.error("Errore nel caricamento del database ricette:", error);
    }
});

// --- GESTIONE INTERFACCIA SIDEBAR (COLLAPSE/EXPAND) ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar-filters');
    const arrow = document.getElementById('toggle-arrow');
    sidebar.classList.toggle('collapsed');
    
    // Controlla se l'utente è su smartphone o PC per decidere la direzione della freccia
    const isMobile = window.innerWidth <= 768;
    
    if (sidebar.classList.contains('collapsed')) {
        arrow.innerText = isMobile ? "▼ FILTRI" : "▶";
    } else {
        arrow.innerText = isMobile ? "▲ NASCONDI FILTRI" : "◀";
    }
}

// --- COMMUTAZIONE DELLE SCHEDE (TAB NAVIGATION) ---
function switchTab(tabName) {
    currentTab = tabName;

     // Aggiorna lo stato grafico dei pulsanti della navbar superiore
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    const frigoFilters = document.getElementById('frigo-ingredients-group');
    const frigoSummaryBox = document.getElementById('frigo-summary-box');

    document.getElementById('sidebar-filters').classList.remove('collapsed');
    
    const isMobile = window.innerWidth <= 768;
    document.getElementById('toggle-arrow').innerText = isMobile ? "▲ NASCONDI FILTRI" : "◀";

    if(tabName === 'frigo') {
        // Mostriamo il gruppo frigo in AGGIUNTA ai filtri standard, che rimangono visibili
        frigoFilters.classList.remove('hidden');
        frigoSummaryBox.classList.remove('hidden');
    } else {
        // Nascondiamo il frigo se siamo in altre schede
        frigoFilters.classList.add('hidden');
        frigoSummaryBox.classList.add('hidden');
    }
    filtraRicette();
}

function resetFiltriStandard() {
    document.getElementById('filter-category').value = "";
    document.getElementById('filter-time-range').value = "all";
    document.getElementById('filter-difficulty').value = "";
    filtraRicette();
}

function resetFiltriFrigo() {
    document.getElementById('frigo-search').value = "";
    document.querySelectorAll('#frigo-checkboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
    filtraCheckboxFrigo();
    aggiornaSvuotaFrigo();
}

function generaCheckboxFrigo() {
    const container = document.getElementById('frigo-checkboxes');
    const tuttiIngredienti = [];
    tutteLeRicette.forEach(r => r.ingredients.forEach(i => {
        if(!tuttiIngredienti.includes(i.name)) tuttiIngredienti.push(i.name);
    }));
    tuttiIngredienti.sort();

    container.innerHTML = tuttiIngredienti.map(ingr => `
        <label class="frigo-label"><input type="checkbox" value="${ingr}" onchange="aggiornaSvuotaFrigo()"> ${ingr}</label>
    `).join('');
}

function filtraCheckboxFrigo() {
    const query = document.getElementById('frigo-search').value.toLowerCase();
    document.querySelectorAll('.frigo-label').forEach(label => {
        const nomeIngr = label.innerText.toLowerCase();
        label.classList.toggle('hidden', !nomeIngr.includes(query));
    });
}

function aggiornaSvuotaFrigo() {
    const checkboxSelezionati = Array.from(document.querySelectorAll('#frigo-checkboxes input:checked')).map(cb => cb.value);
    const summaryContainer = document.getElementById('frigo-summary-tags');
    
    if(checkboxSelezionati.length === 0) {
        summaryContainer.innerHTML = '<span class="placeholder-text">Nessun ingrediente selezionato</span>';
    } else {
        summaryContainer.innerHTML = checkboxSelezionati.map(ingr => `<span class="tag">${ingr}</span>`).join('');
    }
    filtraRicette();
}

function filtraRicette() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const catFiltro = document.getElementById('filter-category').value;
    const timeRange = document.getElementById('filter-time-range').value;
    const diffFiltro = document.getElementById('filter-difficulty').value;
    
    const checkboxSelezionati = Array.from(document.querySelectorAll('#frigo-checkboxes input:checked'))
                                     .map(cb => cb.value.toLowerCase().trim());

    const risultati = tutteLeRicette.filter(ricetta => {
        // 1. FILTRO DELLA BARRA DI RICERCA (Sempre attivo)
        const corrispondeQuery = ricetta.title.toLowerCase().includes(query) || 
                                 ricetta.ingredients.some(i => i.name.toLowerCase().includes(query));
        if (!corrispondeQuery) return false;

        // 2. FILTRO TAB PREFERITI (Esclude i filtri standard se attivo)
        if (currentTab === 'preferiti') {
            return preferiti.includes(ricetta.id);
        }
        
        // 3. FILTRO INGREDIENTI FRIGO (Attivo solo se siamo nella tab frigo)
        if (currentTab === 'frigo') {
            // Se l'utente è nella tab frigo ma non ha ancora selezionato caselle, non mostriamo nulla
            if (checkboxSelezionati.length === 0) return false;
            
            // Verifica se la ricetta contiene almeno uno degli ingredienti del frigo
            const contieneIngredienteFrigo = checkboxSelezionati.some(ingrSelezionato => {
                return ricetta.ingredients.some(ingrRicetta => {
                    const nomeRicetta = ingrRicetta.name.toLowerCase().trim();
                    return nomeRicetta.includes(ingrSelezionato) || ingrSelezionato.includes(nomeRicetta);
                });
            });

            // Se la ricetta non ha gli ingredienti del frigo cercati, la scartiamo subito
            if (!contieneIngredienteFrigo) return false;
        }

        // 4. FILTRI STANDARD (Ora attivi SIA su "Archivio" SIA su "Svuota-Frigo")
        const corrispondeCat = catFiltro === "" || ricetta.category === catFiltro;
        const corrispondeDiff = diffFiltro === "" || ricetta.difficulty === diffFiltro;

        let corrispondeTempo = true;
        if (timeRange === 'veloce') corrispondeTempo = ricetta.time <= 15;
        else if (timeRange === 'medio') corrispondeTempo = ricetta.time > 15 && ricetta.time <= 45;
        else if (timeRange === 'lungo') corrispondeTempo = ricetta.time > 45;

        // La ricetta deve superare TUTTI i controlli dei menu a discesa
        return corrispondeCat && corrispondeDiff && corrispondeTempo;
    });

    renderizzaGruppiCategoria(risultati);
}

function renderizzaGruppiCategoria(lista) {
    const container = document.getElementById('results-area');
    if(lista.length === 0) {
        container.innerHTML = "<p style='text-align:center; font-family:var(--font-serif); padding:40px; color:#8d99ae;'>Nessuna ricetta trouvata.</p>";
        return;
    }

    const mappeCategorie = {};
    lista.forEach(ricetta => {
        if(!mappeCategorie[ricetta.category]) mappeCategorie[ricetta.category] = [];
        mappeCategorie[ricetta.category].push(ricetta);
    });

    let htmlRisultati = "";
    const categorieOrdinate = Object.keys(mappeCategorie).sort();

    categorieOrdinate.forEach(cat => {
        const ricetteOrdinate = mappeCategorie[cat].sort((a, b) => a.title.localeCompare(b.title));
        htmlRisultati += `
            <div class="category-block">
                <h2>${cat}</h2>
                <div class="recipes-grid">
                    ${ricetteOrdinate.map(ricetta => {
                        const isFav = preferiti.includes(ricetta.id) ? '❤️' : '🤍';
                        const sottotitoloCard = ricetta.subtitle ? `<p class="card-subtitle">${ricetta.subtitle}</p>` : '';
                        
                        return `
                            <div class="recipe-card" onclick="apriRicetta(${ricetta.id})">
                                <button class="fav-icon" onclick="togglePreferito(event, ${ricetta.id})">${isFav}</button>
                                <h3>${ricetta.title}</h3>
                                ${sottotitoloCard}
                                <div class="card-meta">⏱️ ${formattaTempo(ricetta.time)} | Difficoltà: ${ricetta.difficulty || 'Media'}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });
    container.innerHTML = htmlRisultati;
}

function togglePreferito(event, id) {
    event.stopPropagation();
    if (preferiti.includes(id)) {
        preferiti = preferiti.filter(pId => pId !== id);
    } else {
        preferiti.push(id);
    }
    localStorage.setItem('ricette_preferite', JSON.stringify(preferiti));
    filtraRicette();
}

function togglePreferitoAttuale() {
    if(!activeRecipe) return;
    togglePreferito({ stopPropagation: () => {} }, activeRecipe.id);
    document.getElementById('btn-fav-detail').innerText = preferiti.includes(activeRecipe.id) ? "❤️ Preferito" : "🤍 Aggiungi ai Preferiti";
}

function apriRicetta(id) {
    activeRecipe = tutteLeRicette.find(r => r.id === id);
    if (!activeRecipe) return;
    
    currentPortions = activeRecipe.baseServings || 4;
    
    // Calcoliamo il tempo totale sommando preparazione e cottura in modo dinamico
    const minutiPrep = parseInt(activeRecipe.prepTime) || 0;
    const minutiCook = parseInt(activeRecipe.cookTime) || 0;
    const tempoTotaleCalcolato = minutiPrep + minutiCook;
    
    // Popolamento dei testi principali e metadati
    document.getElementById('det-title').innerText = activeRecipe.title;
    document.getElementById('det-subtitle').innerText = activeRecipe.subtitle || "";
    document.getElementById('det-category').innerText = activeRecipe.category;
    
    // Qui assegniamo i tre tempi formattati correttamente
    document.getElementById('det-total-time').innerText = formattaTempo(tempoTotaleCalcolato);
    document.getElementById('det-prep-time').innerText = formattaTempo(activeRecipe.prepTime);
    document.getElementById('det-cook-time').innerText = formattaTempo(activeRecipe.cookTime);
    
    document.getElementById('det-difficulty').innerText = activeRecipe.difficulty || 'Facile';
    
    // --- GESTIONE DINAMICA NOTE ---
    const blkNotes = document.getElementById('blk-notes');
    const listNotes = document.getElementById('det-notes-list');
    listNotes.innerHTML = "";
    if (activeRecipe.notes && Array.isArray(activeRecipe.notes) && activeRecipe.notes.length > 0) {
        listNotes.innerHTML = activeRecipe.notes.map(nota => `<li>${nota}</li>`).join('');
        blkNotes.classList.remove('hidden');
    } else {
        blkNotes.classList.add('hidden');
    }

    // --- GESTIONE DINAMICA VARIANTI COMPLESSE ---
    const blkVariants = document.getElementById('blk-variants');
    const containerVariants = document.getElementById('det-variants-container');
    containerVariants.innerHTML = "";
    if (activeRecipe.variants && Array.isArray(activeRecipe.variants) && activeRecipe.variants.length > 0) {
        activeRecipe.variants.forEach(v => {
            let ingredientiHTML = "";
            if (v.ingredients && Array.isArray(v.ingredients) && v.ingredients.length > 0) {
                ingredientiHTML = `
                    <ul class="styled-list variant-ingredients">
                        ${v.ingredients.map(ingr => `<li>• ${ingr}</li>`).join('')}
                    </ul>`;
            }
            const varianteBlock = `
                <div class="variant-block">
                    <div class="recipe-storage-subtitle">${v.name}</div>
                    ${ingredientiHTML}
                    <div class="recipe-info-text variant-description">${v.description || ''}</div>
                </div>
            `;
            containerVariants.innerHTML += varianteBlock;
        });
        blkVariants.classList.remove('hidden');
    } else {
        blkVariants.classList.add('hidden');
    }

    // --- GESTIONE DINAMICA CONSERVAZIONE ---
    const blkStorage = document.getElementById('blk-storage');
    const listFrigo = document.getElementById('det-storage-frigo');
    const listFreezer = document.getElementById('det-storage-freezer');
    listFrigo.innerHTML = "";
    listFreezer.innerHTML = "";

    const haFrigo = activeRecipe.storageFrigo && Array.isArray(activeRecipe.storageFrigo) && activeRecipe.storageFrigo.length > 0;
    const haFreezer = activeRecipe.storageFreezer && Array.isArray(activeRecipe.storageFreezer) && activeRecipe.storageFreezer.length > 0;

    if (haFrigo || haFreezer) {
        if (haFrigo) {
            listFrigo.innerHTML = activeRecipe.storageFrigo.map(p => `<li>${p}</li>`).join('');
        } else {
            listFrigo.innerHTML = "<li>Non consigliata.</li>";
        }
        if (haFreezer) {
            listFreezer.innerHTML = activeRecipe.storageFreezer.map(p => `<li>${p}</li>`).join('');
        } else {
            listFreezer.innerHTML = "<li>Non consigliata.</li>";
        }
        blkStorage.classList.remove('hidden');
    } else {
        blkStorage.classList.add('hidden');
    }

    // Gestione pulsante preferiti e porzioni
    document.getElementById('btn-fav-detail').innerText = preferiti.includes(activeRecipe.id) ? "❤️ Preferito" : "🤍 Aggiungi ai Preferiti";
    renderizzaIngredientiEProporzioni();

    // Procedimento passo-passo
    document.getElementById('det-instructions-container').innerHTML = activeRecipe.instructions.map((passo) => `
        <div class="recipe-step-block">
            <div class="recipe-info-text">${passo}</div>
        </div>
    `).join('');

    // Sostituzione schermate visualizzate
    document.getElementById('recipe-detail-view').classList.remove('hidden');
    document.getElementById('main-app-layout').classList.add('hidden');
    
    window.scrollTo(0, 0);
}

function chiudiRicetta() {
    document.getElementById('recipe-detail-view').classList.add('hidden');
    document.getElementById('main-app-layout').classList.remove('hidden');
    activeRecipe = null;
    filtraRicette();
}

function cambiaPorzioni(variazione) {
    if(currentPortions + variazione < 1) return;
    currentPortions += variazione;
    renderizzaIngredientiEProporzioni();
}

function renderizzaIngredientiEProporzioni() {
    document.getElementById('det-portions').innerText = currentPortions;
    document.getElementById('det-portions-print').innerText = currentPortions;

    const tableContainer = document.getElementById('det-ingredients-table');
    const baseServings = activeRecipe.baseServings || 4;
    let htmlRigheTable = "";

    for (let i = 0; i < activeRecipe.ingredients.length; i += 2) {
        htmlRigheTable += "<tr>";
        
        // --- COLONNA SINISTRA ---
        const ingr1 = activeRecipe.ingredients[i];
        if (ingr1.qty === 0 || ingr1.unit.toLowerCase() === "q.b.") {
            // Se è q.b. stampiamo una stringa editoriale pulita senza numeri
            htmlRigheTable += `<td><div class="ingredient-bullet">${ingr1.name} <em>(${ingr1.unit})</em></div></td>`;
        } else {
            const qty1 = Math.round(((ingr1.qty / baseServings) * currentPortions) * 10) / 10;
            htmlRigheTable += `<td><div class="ingredient-bullet"><strong>${qty1} ${ingr1.unit}</strong> ${ingr1.name}</div></td>`;
        }
        
        // --- COLONNA DESTRA ---
        const ingr2 = activeRecipe.ingredients[i + 1];
        if (ingr2) {
            if (ingr2.qty === 0 || ingr2.unit.toLowerCase() === "q.b.") {
                htmlRigheTable += `<td><div class="ingredient-bullet">${ingr2.name} <em>(${ingr2.unit})</em></div></td>`;
            } else {
                const qty2 = Math.round(((ingr2.qty / baseServings) * currentPortions) * 10) / 10;
                htmlRigheTable += `<td><div class="ingredient-bullet"><strong>${qty2} ${ingr2.unit}</strong> ${ingr2.name}</div></td>`;
            }
        } else {
            htmlRigheTable += "<td></td>"; // Cella vuota protetta per il bilanciamento del layout
        }
        
        htmlRigheTable += "</tr>";
    }

    tableContainer.innerHTML = htmlRigheTable;
}

function condividiRicetta() {
    if (navigator.share) {
        navigator.share({ title: activeRecipe.title, text: `Guarda la mia ricetta per: ${activeRecipe.title}`, url: window.location.href });
    } else {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copiato!");
    }
}

function inviaSpesa() {
    let testo = `*Lista della Spesa: ${activeRecipe.title} (${currentPortions} porzioni)*\n`;
    const baseServings = activeRecipe.baseServings || 4;
    activeRecipe.ingredients.forEach(ingr => {
        const qty = Math.round(((ingr.qty / baseServings) * currentPortions) * 10) / 10;
        testo += `- ${qty} ${ingr.unit} ${ingr.name}\n`;
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(testo)}`, '_blank');
}

function formattaTempo(minuti) {
    if (!minuti || minuti === "---") return "---";
    const numMinuti = parseInt(minuti, 10);
    if (isNaN(numMinuti) || numMinuti === 0) return "---";
    
    if (numMinuti < 60) {
        return `${numMinuti} min`;
    } else {
        const ore = Math.floor(numMinuti / 60);
        const restantiMinuti = numMinuti % 60;
        
        // Determina se usare "ora" o "ore" in base al numero
        const testoOra = (ore === 1) ? "ora" : "ore";
        
        // Se ci sono minuti rimanenti aggiunge "e X min", altrimenti scrive solo il blocco delle ore
        return restantiMinuti > 0 
            ? `${ore} ${testoOra} e ${restantiMinuti} min` 
            : `${ore} ${testoOra}`;
    }
}

// Monitora lo scorrimento della pagina o del contenitore dettagli
window.onscroll = function() {
    gestisciVisualizzazionePulsanteSu();
};

function gestisciVisualizzazionePulsanteSu() {
    const btnTop = document.getElementById('btn-back-to-top');
    if (!btnTop) return;

    // Calcola lo scroll attuale tenendo conto delle diverse risposte dei browser mobile
    const scrollAttuale = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;

    // Se l'utente ha sceso la pagina di oltre 300 pixel, mostra il pulsante
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
        btnTop.classList.remove('hidden');
    } else {
        btnTop.classList.add('hidden');
    }
}

function tornaInAlto() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}