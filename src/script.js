const c = new AudioContext();
let oscillator; // Variabile per memorizzare l'oscillatore
let compressor;
let state_comp = false;

function main() {
    c.resume(); // Assicurati che l'AudioContext sia attivo
    if (!oscillator) {
        // Crea un nuovo oscillatore
        oscillator = c.createOscillator();
        oscillator.connect(c.destination);
        createCompressor();
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
    compressor.threshold.setValueAtTime(-50, c.currentTime);  // Imposta la soglia
    compressor.knee.setValueAtTime(40, c.currentTime);       // Imposta il knee
    compressor.ratio.setValueAtTime(12, c.currentTime);      // Imposta il rapporto di compressione
    compressor.attack.setValueAtTime(0.003, c.currentTime);  // Imposta l'attacco
    compressor.release.setValueAtTime(0.25, c.currentTime); // Imposta il rilascio
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