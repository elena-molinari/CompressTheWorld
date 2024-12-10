const c = new AudioContext();
let compressor;
let state_comp = false;
let audioPlayer;
let source;
// Per memorizzare le waveform delle tracce selezionate
let waveSurfers = {};
// Per memorizzare le tracce selezionate
const selectedTracks = new Set(); 
// Parametri di default per il compressore
let df_th = -50;
let df_knee = 40;
let df_ratio = 12;
let df_att = 0.003;
let df_rel = 0.25; 
let isFirstClick = true;
let intervalId;

//Creo un unico compressore! una sola volta.
createCompressor();  

 analyser = c.createAnalyser();
 /* Imposta le proprietà dell'analizzatore */
 analyser.fftSize = 256;  // Imposta la dimensione dell'FFT
 let bufferLength = analyser.frequencyBinCount;  // Ottieni il numero di bins di frequenza
 let dataArray = new Uint8Array(bufferLength);  // Array per memorizzare i dati di frequenza




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
       //eliminando correttamente l'istanza precedente o sovrascrivi la stessa.
        waveSurfers[containerId].destroy(); // Distruggi l'istanza precedente
        delete waveSurfers[containerId]; // Rimuovi l'istanza dalla memoria
    }

    fileURL.controls = true //in modo da poter controllare la traccia dalla waverform

    const container = document.getElementById(containerId);
    const waveSurfer = WaveSurfer.create({
        container: container,
        waveColor: 'violet',
        progressColor: 'purple',
        height: 75,
        url: fileURL,
        dragToSeek: true,
        media: audioPlayer,
    });

    source = c.createMediaElementSource(audioPlayer);
    out = c.createGain();
    
    compOnOff(state_comp);
    

    // Associa l'istanza WaveSurfer al contenitore
    waveSurfers[containerId] = waveSurfer;
}

// Aggiorna il gain MakeUP in base al controllo manuale
function updateMakeUpGain() {
    if (isFirstClick) {
         // Salva il gain originale prima di applicare il Make-Up Gain
        originalGain = out.gain.value;

        // Leggi la riduzione attuale del compressore
        const reduction = compressor.reduction; // In dB, valore negativo

        // Calcola il Make-Up Gain per compensare la riduzione
        const makeupGain = -reduction / 10; // Converti da dB a scala lineare
        //console.log(makeupGain)
        // Applica il Make-Up Gain al nodo GainNode (out)
        out.gain.setValueAtTime((originalGain + makeupGain), c.currentTime);
        
        isFirstClick = false;
        }
}

function resetMakeUpGain() {
    out.gain.setValueAtTime(originalGain, c.currentTime);
    //console.log("Make-Up Gain resettato al volume originale.");
}


function selectTrack(containerId) {
    // Apri una nuova finestra
    const newWindow = window.open("", "_blank");

    // Lista dei file audio ospitati
    const tracks = [
        { name: "Buzz Buzz", url: "https://elena-molinari.github.io/CompressTheWorld/SelectAudio/buzz-buzz-95806.mp3" },
    ];

    // Genera il contenuto HTML
    let htmlContent = `
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
                .track-item {
                    margin: 15px 0;
                    font-size: 18px;
                    color: #555;
                }
                .track-item:hover {
                    color: #007BFF;
                }
            </style>
        </head>
        <body>
            <h1>Select Track</h1>
            <div id="track-list">
    `;

    // Aggiungi ogni traccia alla lista (solo titolo)
    tracks.forEach(track => {
        htmlContent += `
            <div class="track-item" onclick>
                <strong>${track.name}</strong>
            </div>
        `;
    });

    // Chiudi il contenuto HTML
    htmlContent += `
            </div>
        </body>
        </html>
    `;

    // Scrivi il contenuto nella nuova finestra
    newWindow.document.write(htmlContent);
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
        out.connect(analyser); //Connetto il compressore all'output
        analyser.connect(c.destination);

        
        // Attiva il VU meter basato sulla riduzione del compressore
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(function() {
            let reduction1 = compressor.reduction;  // Ottieni la riduzione in dB

            // Se il valore di riduzione è positivo (compressore non sta riducendo), lo impostiamo a 0
            if (reduction1 > 0) reduction1 = 0;

            // Mappa la riduzione (in dB) ad una rotazione (in gradi)
            // La riduzione in dB va da 0 (senza riduzione) a -80 dB (max riduzione), quindi mappiamo questo a un range di gradi.
            let rotation = Math.max(-reduction1 * 2, 0);  // Mappa la riduzione in dB (a valore negativo) a gradi
            rotation = Math.min(rotation, 180);  // Limita la rotazione a 180 gradi (max valore della rotazione del needle)

            let needle = document.getElementById("VUmeter").getElementsByClassName('needle')[0];
            needle.style.transform = "rotate(" + (rotation + 20) + "deg)"; // Aggiunge un offset per evitare che l'ago si fermi a 0 gradi
        }, 50);

        
    } else {
        analyser.disconnect();
        out.disconnect();
        compressor.disconnect(); // Scollego il compressore
        source.connect(c.destination); // Collego l'oscillatore
        // Disabilita il VU meter (smette di essere aggiornato)
        clearInterval(intervalId); // Pulisce l'intervallo che aggiorna il VU meter
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


// Funzioni di aggiornamento
function updateThreshold(df_th) {
    compressor.threshold.setValueAtTime(df_th, c.currentTime);
    resetMakeUpGain();
    isFirstClick = true;
}

function updateRatio(df_ratio) {
    compressor.ratio.setValueAtTime(df_ratio, c.currentTime);
    resetMakeUpGain();
    isFirstClick = true;
}

function updateKnee(df_knee) {
    compressor.knee.setValueAtTime(df_knee, c.currentTime);
    resetMakeUpGain();
    isFirstClick = true;
}

function updateAtt(df_att) {
    compressor.attack.setValueAtTime(df_att, c.currentTime);
    resetMakeUpGain();
    isFirstClick = true;
}

function updateRel(df_rel) {
    compressor.release.setValueAtTime(df_rel, c.currentTime);
    resetMakeUpGain();
    isFirstClick = true;
}

function toggle_comp() {
    state_comp = !state_comp;
    compOnOff(state_comp);
    const button = document.getElementById("toggle_comp");
    button.textContent = state_comp ? "Compression On" : "Compression Off";
}

