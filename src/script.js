const c = new AudioContext();
let compressor;
let state_comp = false;
let audioPlayer;
let source;
let waveSurfers = {};
// Per memorizzare le tracce selezionate
const selectedTracks = new Set(); 

// Parametri di default per il compressore
let df_th = -50;
let df_knee = 40;
let df_ratio = 12;
let df_att = 0.003;
let df_rel = 0.25; 

// VU Meter setup
let analyser; // Node per analizzare i dati audio
let dataArray; // Array per i livelli audio
let canvas, canvasContext; // Canvas per il VU meter
let animationFrameId;


//Creo un unico compressore! una sola volta.
createCompressor();  

// Funzione per selezionare o deselezionare una traccia
function toggleTrackSelection(containerId) {
    const button = document.getElementById(`selectBtn_${containerId}`);
    if (selectedTracks.has(containerId)) {
        selectedTracks.delete(containerId);
        button.classList.remove("selected"); // Svuota il pallino
    } else {
        selectedTracks.add(containerId);
        button.classList.add("selected"); // Riempie il pallino
    }
}

function playTracks() {
    selectedTracks.forEach((containerId) => {
        if (waveSurfers[containerId]) {
            waveSurfers[containerId].play();
        }
    });
}


// Funzione globale per Pause
function pauseTracks() {
    selectedTracks.forEach((containerId) => {
        if (waveSurfers[containerId]) {
            waveSurfers[containerId].pause();
        }
    });
    stopVuMeter();
}

// Carica una nuova traccia
function uploadTrack(fileInputId, audioPlayerId, containerId) {
    const fileInput = document.getElementById(fileInputId);
    audioPlayer = document.getElementById(audioPlayerId);

    fileInput.click();

    fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const fileURL = URL.createObjectURL(file);
            audioPlayer.src = fileURL;

            initWaveSurfer(containerId, fileURL, audioPlayer);
        } else {
            alert("Nessun file audio selezionato!");
        }
    });
}

// Inizializza WaveSurfer con il file audio
function initWaveSurfer(containerId, fileURL, audioPlayer) {

    if (waveSurfers[containerId]) {
        waveSurfers[containerId].destroy(); // Distruggi l'istanza precedente, se esiste
    }

    fileURL.controls = true //in modo da poter controllare la traccia dalla waverform

    const container = document.getElementById(containerId);
    const waveSurfer = WaveSurfer.create({
        container: container,
        waveColor: 'violet',
        progressColor: 'purple',
        height: 80,
        url: fileURL,
        dragToSeek: true,
        media: audioPlayer,
    });

    source = c.createMediaElementSource(audioPlayer);
    out = c.createGain();
    compOnOff(state_comp);

    // Inizializza il VU meter dopo aver configurato la traccia
    initVuMeter();

    // Associa l'istanza WaveSurfer al contenitore
    waveSurfers[containerId] = waveSurfer;

    waveSurfer.on('click', (progress) => {
        waveSurfer.play()
      })
}

// Aggiorna il gain MakeUP in base al controllo manuale
function updateMakeUpGain() {
    // Salva il gain originale prima di applicare il Make-Up Gain
    originalGain = out.gain.value;

    // Leggi la riduzione attuale del compressore
    const reduction = compressor.reduction; // In dB, valore negativo

    // Calcola il Make-Up Gain per compensare la riduzione
    const makeupGain = -reduction / 10; // Converti da dB a scala lineare
    //console.log(makeupGain)
    // Applica il Make-Up Gain al nodo GainNode (out)
    out.gain.setValueAtTime((originalGain + makeupGain), c.currentTime);
}

function resetMakeUpGain() {
    out.gain.setValueAtTime(originalGain, c.currentTime);
    //console.log("Make-Up Gain resettato al volume originale.");
}


function selectTrack() {
    // Apri una nuova finestra
    const newWindow = window.open("", "_blank");

    // Aggiungi il contenuto base della nuova pagina
    newWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Select Track</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                h1 {
                    text-align: center;
                    color: #333;
                }
                .placeholder {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 80vh;
                    color: #999;
                    font-size: 18px;
                }
            </style>
        </head>
        <body>
            <h1>Select Track</h1>
            <div class="placeholder">
                <p>This page is under construction. Add tracks dynamically here.</p>
            </div>
        </body>
        </html>
    `);

    // Chiudi il documento per renderlo visibile
    newWindow.document.close();
}

function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    } else {
        console.error(`Dropdown con ID '${dropdownId}' non trovato.`);
    }
}


window.onclick = function (event) {
    // Se il clic non è su un pulsante con classe 'dropdown-btn'
    if (!event.target.matches('.dropdown-btn')) {
        // Trova tutte le tendine visibili e chiudile
        const dropdowns = document.querySelectorAll('.dropdown-content');
        dropdowns.forEach(dropdown => {
            if (dropdown.style.display === "block") {
                dropdown.style.display = "none";
            }
        });
    }
};


/*  compressore   */

function compOnOff(state_comp) {
    if (state_comp) {
        source.disconnect(); // Sconnetto l'oscillatore dall'output
        source.connect(compressor); // Connetto l'oscillatore al compressore
        compressor.connect(out); // Connetto compressore al gain
        out.connect(c.destination); //Connetto il compressore all'output
    } else {
        out.disconnect();
        compressor.disconnect(); // Scollego il compressore
        source.connect(c.destination); // Collego l'oscillatore
    }
}

function createCompressor() {
    if(!compressor){
        compressor = c.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(df_th, c.currentTime);  
        compressor.knee.setValueAtTime(df_knee, c.currentTime);       
        compressor.ratio.setValueAtTime(df_ratio, c.currentTime);     
        compressor.attack.setValueAtTime(df_att, c.currentTime);  
        compressor.release.setValueAtTime(df_rel, c.currentTime);
    }
 }

function updateThreshold(df_th) {
    compressor.threshold.setValueAtTime(df_th, c.currentTime);
    resetMakeUpGain();
}

function updateRatio(df_ratio) {
    compressor.ratio.setValueAtTime(df_ratio, c.currentTime);
    resetMakeUpGain();
}

function updateKnee(df_knee) {
    compressor.knee.setValueAtTime(df_knee, c.currentTime);
    resetMakeUpGain();
}

function updateAtt(df_att) {
    compressor.attack.setValueAtTime(df_att, c.currentTime);
    resetMakeUpGain();
}

function updateRel(df_rel) {
    compressor.release.setValueAtTime(df_rel, c.currentTime);
    resetMakeUpGain();
}

function toggle_comp() {
    state_comp = !state_comp;
    compOnOff(state_comp);
    const button = document.getElementById("toggle_comp");
    button.textContent = state_comp ? "Compression On" : "Compression Off";
}

// Inizializza il VU Meter
function initVuMeter() {
    // Seleziona il canvas
    canvas = document.getElementById('vu-meter');
    canvasContext = canvas.getContext('2d');

    // Crea un analyser node
    analyser = c.createAnalyser();
    analyser.fftSize = 256; // Numero di campioni da analizzare
    const bufferLength = analyser.frequencyBinCount; // Numero di bin (metà di fftSize)
    dataArray = new Uint8Array(bufferLength); // Array per i dati audio

    // Collega l'analyser al compressore
    if (compressor) {
        source.connect(analyser);
        analyser.connect(compressor); // Analizza prima di mandare il segnale al compressore
    } else {
        source.connect(analyser);
        analyser.connect(c.destination); // Collegamento senza compressione
    }

    // Avvia il rendering del VU meter
    renderVuMeter();
}


// Disegna il VU meter
function renderVuMeter() {
    // Pulizia del canvas
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);

    // Ottieni i dati audio
    analyser.getByteTimeDomainData(dataArray);

    // Calcola il livello audio medio
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i] / 128.0 - 1.0; // Normalizza i dati (da 0-255 a -1.0/1.0)
        sum += value * value;
    }
    const rms = Math.sqrt(sum / dataArray.length); // Root Mean Square per il livello audio
    const level = Math.min(rms * 100, 1); // Scala il valore (clamp tra 0 e 1)

    // Disegna il livello sul canvas
    const meterWidth = canvas.width * level; // Larghezza del VU meter
    canvasContext.fillStyle = `rgb(${Math.floor(255 * level)}, ${Math.floor(255 * (1 - level))}, 0)`; // Colore dinamico (verde a rosso)
    canvasContext.fillRect(0, 0, meterWidth, canvas.height);

    // Ricalcolo
    animationFrameId = requestAnimationFrame(renderVuMeter);
}

// Ferma il VU meter
function stopVuMeter() {
    cancelAnimationFrame(animationFrameId);
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
}