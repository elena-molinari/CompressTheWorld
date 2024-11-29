const c = new AudioContext();
let oscillator; // Variabile per memorizzare l'oscillatore
let compressor;
let state_comp = false;
let df_th = -50;
let df_knee = 40;
let df_ratio = 12;
let df_att = 0.003;
let df_rel = 0.25; 

createCompressor();  //devo creare un unico compressore! una sola volta.
//Quando chiami createCompressor(), crei un nuovo oggetto DynamicsCompressorNode tramite c.createDynamicsCompressor(). Questo nodo è un componente che vive all'interno del grafo di elaborazione audio di AudioContext
// se metto questa riga all'interno del main ogni volta che richiamo la funzione creo un nuovo nodo completamente separato dal precedente.
// Quindi commetto due errore:
// 1)Stai solo creando un nuovo compressore, ma non ricolleghi l'oscillatore al nuovo compressore.
//  2)Se il compressore precedente è ancora connesso, potresti accumulare nodi inutilizzati nel grafo audio, causando un comportamento inatteso e un consumo di risorse non necessario.
//In breve: il compressore è un oggetto che deve essere creato una volta e riutilizzato, evitando duplicazioni.

function main() {
    c.resume(); // Assicurati che l'AudioContext sia attivo
    if (!oscillator) {
        // Crea un nuovo oscillatore
        oscillator = c.createOscillator();
        oscillator.connect(c.destination);
        
        compOnOff(state_comp);
        oscillator.start(); // Avvia l'oscillatore
    }
}


/*
function compOn() {
    state_comp = true; // Imposta lo stato del compressore su "attivo"
    compOnOff(state_comp); // Applica la modifica
}

// Funzione per disattivare la compressione
function compOff() {
    state_comp = false; // Imposta lo stato del compressore su "disattivo"
    compOnOff(state_comp); // Applica la modifica
}

*/


function compOnOff(state_comp) {
    if (state_comp) {
        oscillator.disconnect(); //sconnetto l'oscillatore dall'output
        oscillator.connect(compressor); //connetto l'oscillatore al compressore
        compressor.connect(c.destination); //connetto il compressore all'output
       
    }
    else
    {
        compressor.disconnect() //scollego il compressore
        oscillator.connect(c.destination); //collego l'oscillatore
    }
}

function createCompressor() {
    compressor = c.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(df_th, c.currentTime );  // Imposta la soglia
    compressor.knee.setValueAtTime(df_knee, c.currentTime );       // Imposta il knee
    compressor.ratio.setValueAtTime(df_ratio, c.currentTime);      // Imposta il rapporto di compressione
    compressor.attack.setValueAtTime(df_att, c.currentTime);  // Imposta l'attacco
    compressor.release.setValueAtTime(df_rel, c.currentTime); // Imposta il rilascio
}

function updateThreshold(df_th){
    compressor.threshold.setValueAtTime(df_th, c.currentTime);
}

function updateRatio(df_ratio) {
    compressor.ratio.setValueAtTime(df_ratio, c.currentTime);
}

function updateKnee(df_knee) {
    compressor.knee.setValueAtTime(df_knee, c.currentTime);
}

function updateAtt(df_att){
    compressor.attack.setValueAtTime(df_att, c.currentTime);
}

function updateRel(df_rel){
    compressor.release.setValueAtTime(df_rel, c.currentTime);
}

function suspend() {
    if (oscillator) {
        oscillator.stop(); // Ferma l'oscillatore
        oscillator.disconnect(); // Disconnetti dall'AudioContext
        oscillator = null; // Resetta il riferimento
    }
}


function toggle_comp(){
    //Queste mi cambiano la funzionalità
    state_comp = !state_comp;
    compOnOff(state_comp);

    //cambiamo il layout
    const button = document.getElementById("toggle_comp");  //la costante 'button' è il botton di id=toggle_comp
    if (state_comp) {
        button.textContent = "Compression On";  // Se il compressore è attivo
    } else {
        button.textContent = "Compression Off";  // Se il compressore è disattivo
    }
}


function toggleDropdown() {
    const dropdown = document.getElementById("dropdownContent");
    // Alterna tra visibile e nascosto
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

// Opzionale: Chiudi la tendina quando si clicca al di fuori
window.onclick = function(event) {
    if (!event.target.matches('.dropdown-btn')) {
        const dropdown = document.getElementById("dropdownContent");
        if (dropdown.style.display === "block") {
            dropdown.style.display = "none";
        }
    }
};
