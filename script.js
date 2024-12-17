const c = new AudioContext();
let compressor;
let state_comp = false;
let audioSources = {};
// Per memorizzare le waveform delle tracce selezionate
let waveSurfers = {};
// Per memorizzare le tracce selezionate
let selectedTracks = new Set(); 
// Parametri di default per il compressore
let df_th = -50;
let df_knee = 40;
let df_ratio = 12;
let df_att = 0.003;
let df_rel = 0.25; 
let currentValue;
let isFirstClick = true;
let intervalId;
let originalGain;
// Variabile per tenere traccia dello stato di riproduzione
let isPlaying = false;

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
    const toggle = document.getElementById("toggle_comp");//questo è il bottone compressor on/off
    if (selectedTracks.has(containerId)) {
        selectedTracks.delete(containerId);
        button.classList.remove("selected"); // Svuota il pallino
        waveSurfers[containerId].pause();
    } else {
        selectedTracks.add(containerId);
        button.classList.add("selected"); // Riempie il pallino
        //compOnOff(true);
        //toggle.textContent = "Compression On";
    }
}

function playTracks() {
    selectedTracks.forEach((containerId) => {
        if (waveSurfers[containerId]) {
            waveSurfers[containerId].play();
            isPlaying = true; // Aggiorna lo stato
            console.log("isPlaying = true")
        }
    });
};

// Funzione globale per Pause
function pauseTracks() {
    selectedTracks.forEach((containerId) => {
        if (waveSurfers[containerId]) {
            waveSurfers[containerId].pause();
            isPlaying = false; // Aggiorna lo stato
            console.log("isPlaying = false")
        }
    });
}

// Aggiungi un listener per il tasto spazio
document.addEventListener("keydown", function(event) {
    // Verifica se il tasto premuto è la barra spaziatrice
    if (event.code === "Space") {
        event.preventDefault(); // Previene lo scrolling della pagina quando si preme la barra spaziatrice
        if (isPlaying) {
            pauseTracks(); // Ferma le tracce
            console.log("stoppato grazie alla space bar");
        } else {
            playTracks(); // Avvia le tracce
            console.log("avviato grazie alla space bar");
        }
    }
});
// Funzione globale per reset tracce
function backTracks() {
    selectedTracks.forEach((containerId) => {
        if (waveSurfers[containerId]) {
            waveSurfers[containerId].skip(-60);
        }
    });
   
}

// Carica una nuova traccia
function uploadTrack(fileInputId, audioPlayerId, containerId) {
    let fileInput = document.getElementById(fileInputId);
    let audioPlayer = document.getElementById(audioPlayerId);

    fileInput.click();

    fileInput.addEventListener("change", (event) => {
        let file = event.target.files[0];
        if (file) {   
            let fileURL = URL.createObjectURL(file);
           
            //resettare audioPlayer
            if (audioPlayer.src){
                audioPlayer.pause();
                audioPlayer.src="";
                audioPlayer.load();
                audioPlayer.currentTime = 0;
                console.log("entra")
            }

            audioPlayer.src = fileURL;
            audioPlayer.load();

            initWaveSurfer(containerId, fileURL);
            
        } else {
            alert("Nessun file audio selezionato!");
        }
    }, {once : true});    
}

// Inizializza WaveSurfer con il file audio
function initWaveSurfer(containerId, fileURL) {

    //appena uploado la traccia il pallino viene attivato subito
    const button = document.getElementById(`selectBtn_${containerId}`);
    selectedTracks.add(containerId);
    button.classList.add("selected");


    if (waveSurfers[containerId]) {
        console.log("distrugge forma d'onda prec")
       //eliminando correttamente l'istanza precedente o sovrascrivi la stessa.
        waveSurfers[containerId].destroy(); // Distruggi l'istanza precedente
        delete waveSurfers[containerId]; // Rimuovi l'istanza dalla memoria
    }

    if (audioSources[containerId]) {
        audioSources[containerId].disconnect();
        delete audioSources[containerId];
        console.log("distrugge audioplayer precedente")
    }

    // Rimuovi il vecchio elemento audio, se esiste
    const oldAudioPlayer = document.getElementById(`audio_${containerId}`);
    if (oldAudioPlayer) {
        oldAudioPlayer.pause(); // Assicurati che l'audio sia fermo
        oldAudioPlayer.src = ""; // Svuota la sorgente
        oldAudioPlayer.load(); // Reset del player
        oldAudioPlayer.remove(); // Rimuovi dal DOM
        console.log("Elemento audio precedente rimosso.");
    }

    // Crea un nuovo elemento audio
    let audioPlayer = document.createElement('audio');
    audioPlayer.id = `audio_${containerId}`;
    audioPlayer.src = fileURL;
    audioPlayer.controls = true; // Opzionale, per controllare manualmente la riproduzione
    document.body.appendChild(audioPlayer);

    // Creo forma d'onda
    let container = document.getElementById(containerId);
    const waveSurfer = WaveSurfer.create({
        container: container,
        waveColor: 'violet',
        progressColor: 'purple',
        height: 98,
        url: fileURL,
        dragToSeek: true,
        media: audioPlayer,
    });

    audioSources[containerId] = c.createMediaElementSource(audioPlayer);
    out = c.createGain();
    
    compOnOff(state_comp,  containerId);
    
    // Associa l'istanza WaveSurfer al contenitore
    waveSurfers[containerId] = waveSurfer  
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

function selectTrack(containerId, audioPlayerId) {
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
                ul {
                    list-style-type: none;
                    padding: 0;
                }
                li {
                    background: #fff;
                    margin: 10px 0;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                li a {
                    text-decoration: none;
                    color: #007BFF;
                }
                li a:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <h1>Select Track</h1>
            <ul id="track-list">
                <li>Loading tracks...</li>
            </ul>
            <script>
                function displayTracks() {
                    console.log("Displaying tracks...");

                    // Array di link delle tracce audio
                    const tracks = [
                        { name: "Lucy Dacus 1", url: "https://polimi365-my.sharepoint.com/:u:/g/personal/10992455_polimi_it/ESss-zpNySFKmmeh89i9INEBaBtwLxpFdrpHp8AM5zynhQ"},
                        { name: "Lucy Dacus 2", url: "https://polimi365-my.sharepoint.com/:u:/g/personal/10992455_polimi_it/EW-4bSdpfOBAhGpYN3rDjuABAZOShnY2cJFmzRI0yglA2g"},
                    ];

                    const trackList = document.getElementById("track-list");
                    trackList.innerHTML = ""; // Pulisci i contenuti

                    if (tracks.length === 0) {
                        console.log("No tracks provided.");
                        trackList.innerHTML = "<li>No tracks found</li>";
                    } else {
                        tracks.forEach(track => {
                            console.log("Adding track:", track.name);
                            const li = document.createElement("li");
                            const link = document.createElement("a");
                            link.href = "javascript:void(0)"; // Prevent default navigation
                            link.dataset.url = track.url;
                            link.textContent = track.name;
                            link.onclick = (event) => {
                                event.preventDefault();
                                if (window.opener && typeof window.opener.initWaveSurfer === "function") {
                                    window.opener.initWaveSurfer('${containerId}', track.url, window.opener.document.getElementById('${audioPlayerId}'));
                                    window.close(); // Close the window after selection
                                } else {
                                    console.error("initWaveSurfer not found in the parent window.");
                                }
                            };
                            li.appendChild(link);
                            trackList.appendChild(li);
                        });
                    }
                }

                // Mostra le tracce al caricamento della pagina
                displayTracks();
            </script>
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

function compOnOff(state, containerId) {
    if (state) {
        audioSources[containerId].disconnect(); // Sconnetto l'oscillatore dall'outputù
        analyser.disconnect();
        out.disconnect();
        compressor.disconnect();
        audioSources[containerId].connect(compressor); // Connetto l'oscillatore al compressore
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
        audioSources[containerId].disconnect();
        analyser.disconnect();
        out.disconnect();
        compressor.disconnect(); // Scollego il compressore
        audioSources[containerId].connect(c.destination); // Collego l'oscillatore
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



async function downloadTracks() {
    if (selectedTracks.size === 0) {
        alert("Nessuna traccia selezionata!");
        return;
    }

    // Calcola la durata più lunga tra le tracce selezionate
    const durations = await Promise.all(
        Array.from(selectedTracks).map(async (containerId) => {
            const audioElement = document.getElementById(`audio_${containerId}`);
            return audioElement ? getAudioDuration(audioElement.src) : 0;
        })
    );
    const maxDuration = Math.max(...durations);

    if (maxDuration === 0) {
        alert("Non è stato possibile determinare la durata delle tracce!");
        return;
    }

    // Chiedi all'utente il nome del file
    const fileName = prompt("Inserisci il nome del file da scaricare:", "mixed_compressed_audio.wav");
    if (!fileName) return;

    // Configura OfflineAudioContext per mixaggio
    const sampleRate = c.sampleRate;
    const offlineContext = new OfflineAudioContext(2, sampleRate * maxDuration, sampleRate);

    // Crea il compressore con i parametri aggiornati
    let compressor = offlineContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(df_th, offlineContext.currentTime);
    compressor.knee.setValueAtTime(df_knee, offlineContext.currentTime);
    compressor.ratio.setValueAtTime(df_ratio, offlineContext.currentTime);
    compressor.attack.setValueAtTime(df_att, offlineContext.currentTime);
    compressor.release.setValueAtTime(df_rel, offlineContext.currentTime);

    // Carica e mixa le tracce selezionate
    const promises = [];
    selectedTracks.forEach((containerId) => {
        const audioElement = document.getElementById(`audio_${containerId}`);
        if (audioElement && audioElement.src) {
            promises.push(loadAndMixTrack(audioElement.src, offlineContext));
        }
    });

    const sources = await Promise.all(promises);

    // Connetti le sorgenti al compressore
    sources.forEach((source) => {
        source.connect(compressor);
    });
    compressor.connect(offlineContext.destination);

    // Renderizza l'audio offline
    const renderedBuffer = await offlineContext.startRendering();

    // Converti il buffer renderizzato in un Blob audio .wav
    const wavBlob = bufferToWave(renderedBuffer, renderedBuffer.length);

    // Scarica il file audio risultante
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.wav') ? fileName : `${fileName}.wav`;
    a.click();
    URL.revokeObjectURL(url); // Libera l'URL creato
}

// Funzione per ottenere la durata di un file audio
async function getAudioDuration(audioSrc) {
    const audio = new Audio(audioSrc);
    return new Promise((resolve) => {
        audio.addEventListener('loadedmetadata', () => resolve(audio.duration));
    });
}

// Funzione per caricare una traccia e mixarla nel contesto offline
async function loadAndMixTrack(audioSrc, offlineContext) {
    const response = await fetch(audioSrc);
    const arrayBuffer = await response.arrayBuffer();
    const decodedBuffer = await offlineContext.decodeAudioData(arrayBuffer);

    const bufferSource = offlineContext.createBufferSource();
    bufferSource.buffer = decodedBuffer;
    bufferSource.start(0);

    return bufferSource;
}

// Funzione per convertire il buffer audio in formato .wav
function bufferToWave(abuffer, len) {
    const numOfChan = abuffer.numberOfChannels;
    const length = len * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i, sample, offset = 0;
    let pos = 0;

    const setUint16 = (data) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data) => { view.setUint32(pos, data, true); pos += 4; };

    // RIFF chunk descriptor
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // File length - 8
    setUint32(0x45564157); // "WAVE"

    // FMT sub-chunk
    setUint32(0x20746D66); // "fmt "
    setUint32(16); // Subchunk1Size
    setUint16(1); // AudioFormat
    setUint16(numOfChan); // NumChannels
    setUint32(abuffer.sampleRate); // SampleRate
    setUint32(abuffer.sampleRate * 2 * numOfChan); // ByteRate
    setUint16(numOfChan * 2); // BlockAlign
    setUint16(16); // BitsPerSample

    // Data sub-chunk
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4); // Subchunk2Size

    for (i = 0; i < numOfChan; i++) {
        channels.push(abuffer.getChannelData(i));
    }

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([buffer], { type: 'audio/wav' });
}



/* KNOBS*/
// Knob per Threshold
$('#th_knob').knob({
    min: -100,
    max: 0,
    step: 1,
    fgColor:"#483D8B",
    bgColor:"#C0C0C0",
    cursor: 8,
    angleOffset:-125,
    angleArc:250,
    width: '100%',
    height: '100%',
    rotation: 'clockwise',
    release: function (v) {
        updateThreshold(v);
    }
})

// Knob per Ratio
$('#ratio_knob').knob({
    min: 1,
    max: 20,
    step: 1,
    fgColor:"#483D8B",
    bgColor:"#C0C0C0",
    cursor: 8,
    angleOffset:-125,
    angleArc:250,
    width: '100%',
    height: '100%',
    rotation: 'clockwise',
    release: function (v) {
        updateRatio(v);
    }
});

// Knob per Knee
$('#knee_knob').knob({
    min: 0,
    max: 40,
    step: 5,
    fgColor:"#483D8B",
    bgColor:"#C0C0C0",
    cursor: 8,
    angleOffset:-125,
    angleArc:250,
    width: '100%',
    height: '100%',
    rotation: 'clockwise',
    release: function (v) {
        updateKnee(v);
    }
});

// Knob per Attack
$('#att_knob').knob({
    min: 0.003,
    max: 1,
    step: 0.01,
    fgColor:"#483D8B",
    bgColor:"#C0C0C0",
    cursor: 8,
    angleOffset:-125,
    angleArc:250,
    width: '100%',
    height: '100%',
    rotation: 'clockwise',
    release: function (v) {
        updateAtt(v);
    }
});

// Knob per Release
$('#rel_knob').knob({
    min: 0.25,
    max: 1,
    step: 0.01,
    fgColor:"#483D8B",
    bgColor:"#C0C0C0",
    cursor: 8,
    angleOffset:-125,
    angleArc:250,
    width: '100%',
    height: '100%',
    rotation: 'clockwise',
    release: function (v) {
        updateRel(v);
    }
});


// Funzioni di aggiornamento
function updateThreshold(df_th) {
    if (!isFirstClick) {
        resetMakeUpGain();
        isFirstClick = true;
        }
    compressor.threshold.setValueAtTime(df_th, c.currentTime);
}

function updateRatio(df_ratio) {
    if (!isFirstClick) {
        resetMakeUpGain();
        isFirstClick = true;
        }
    compressor.ratio.setValueAtTime(df_ratio, c.currentTime);
}

function updateKnee(df_knee) {
    if (!isFirstClick) {
        resetMakeUpGain();
        isFirstClick = true;
        }
    compressor.knee.setValueAtTime(df_knee, c.currentTime);
}

function updateAtt(df_att) {
    if (!isFirstClick) {
        resetMakeUpGain();
        isFirstClick = true;
        }
    compressor.attack.setValueAtTime(df_att, c.currentTime);
}

function updateRel(df_rel) {
    if (!isFirstClick) {
        resetMakeUpGain();
        isFirstClick = true;
        }
    compressor.release.setValueAtTime(df_rel, c.currentTime);
}

function toggle_comp() {
    state_comp = !state_comp;
    const button = document.getElementById("toggle_comp");
    button.textContent = state_comp ? "Compression On" : "Compression Off";
    selectedTracks.forEach((containerId) => {
    compOnOff(state_comp, containerId); });
    
}