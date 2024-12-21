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
// Inizializza Dropbox con il tuo access token
let access_token = 'sl.u.AFZJf0cuxMHbPaS95wU8I9pig3ke3kZ1qNxTqFb2wqD_RCnuhrGzBycquAegk7eUDGX1Dhw1ghtAejzzi9xPTKJmeq8STjYE3V8UE4jxkqiwbFo7WjTvye98ZBVrGEE8Odt2211SCnLkhkteQ7bUDwqCHoQL56mCbuG2a2GQJSX7ovstRnAPokGJtdC2Za-1aCby9OLFHDbdS3pf67N-RSih7_dyF7lRu6ClJ3eDJyGgGfiemLxBBa0x4xCHy7hvP_qHbbV2_p6Oai9T9aBHlKFyqHWyHz6X6eoTrTb9H_6wZiu8A95u4T3BIGmb-YrQwQgSgo3j9S9neo1LMLSiqlhDhsbbavZAksdjqZvNy7FQUY_fUCP8P7z21lhAORhThJ7YHY0KTxEKQsOq7hrUiPgSNFcCEeJqg-p6NCW66NFbx4l0ayQtcwrLLPy2o1-sSgYbtDu0O8sVyaCE0kMfiFZFqqTDqz5Pzz76ZtyX3BVUZb5Kcq9k4pVp0YavK2F1vbYVubL3ShZdeLx5tFdb2LEaA2bnw999QOPEVIeHNInmqiSxErUEWE_Eo4tIkSlQkUMuyuKHvzPcxCl6kWJSyZMp-9y780Gl-sGsK8X_KffF1mVtFrvIFONE6CnMRijhlP-hDB0llYBQP0uLqrWbzVBUwO2DeawZsHc6weq1gOBsGLM2waa70VZc16CM7uflavtPEA_pqTTppDPeXNn9rE04GsD1CnTvEXh19laC7JvZSK07IilcUVj0rR9fEisJ6W83WEoP1c-Uclx9poo_hy_xuRdCkQrdcMN0ckhzjOL_YVy2AvEGRfHJWilLOspiTcmGI-7D5DsDmEu1GeMnh2g2kOhTswbGwSVXn6FOJUhjXSJt355xiV4irloRzEQQK-ujVsYtbJvzD2fR93kPsjTW4uBkvr_EdP-5FF-kPCug2Rg7Nz-KvOAv7OmLJUQmdBn-ptWKzrpM1tlFYDscfG4O3oo_SMUENfNm7R2jZpB6kl7sagXJC6XyEPAS2dpRzjiF-WLq8G010BpThUdXpFTN8X6pySK1sk5Cq60JbqcYNXKedUaoPC7wMADVbih7Xnnmotf6eOpHWAbz0ECK1qcYzLBBsnNrf6Qrg6KdmupgFvdEgAOvzVi0CF1kbmLuJr6zgTfadwnfGzg6Q8nykZEF3b8ok3jrCf_v6AfBLg_177PDM4sbq7usfmAUDTiKlOlgothZ-NGoRVNsZ1hpVtje5Gv8mokx4sRGzFjoCxmkAb9khpN-Z987-lsv3yJwaCIxOtQqtUhWuTMlbUaMR4_k';
const dropbox = new Dropbox.Dropbox({ accessToken: access_token });


//Creo un unico compressore! una sola volta.
createCompressor();  
// Funzione per verificare se l'access token è valido
function checkAccessToken() {
    dropbox.usersGetCurrentAccount()
        .then(function(response) {
            console.log("Access token valido!", response);
            // Se la richiesta ha successo, l'access token è valido
        })
        .catch(function(error) {
            console.error("Errore: access token non valido o scaduto", error);
            // Se l'access token non è valido, gestisci l'errore
        });
}

// Chiamata alla funzione per verificare l'access token
checkAccessToken();

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
    console.log("entrato in init");
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
    audioPlayer.style.display = 'none'; // Nasconde l'elemento
    audioPlayer.controls = true; // Opzionale, per controllare manualmente la riproduzione
    document.body.appendChild(audioPlayer);
    console.log("audioPlayer.src:", audioPlayer.src);
    audioPlayer.addEventListener('loadeddata', () => {
        console.log("File audio caricato correttamente.");
    });
    
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


// Funzione per ottenere l'URL temporaneo di un file
function getFileUrl(filePath, callback) {
    dropbox.filesGetTemporaryLink({ path: filePath })
        .then(response => {
            console.log("Risposta API Dropbox:", response);
            callback(response.result.link); // Passa l'URL al callback
        })
        .catch(error => {
            console.error("Errore durante il recupero dell'URL:", error);
        });
}

function selectTrack(containerId, audioPlayerId) {
    const files = [
        { name: "Lucy Dacus 1", path: "/Lucy_Dacus_London.mp3" },
        { name: "Lucy Dacus 2", path: "/Lucy_Dacus_NewYork.mp3" }, // Aggiungi altri file qui
    ];

    // Apri una nuova finestra e scrivi il contenuto HTML
    const newWindow = window.open("", "_blank");
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
                // Funzione per visualizzare la lista dei brani
                function displayTracks() {
                    const files = ${JSON.stringify(files)}; // Passa i dati statici

                    const trackList = document.getElementById("track-list");
                    trackList.innerHTML = "";

                    if (files.length === 0) {
                        trackList.innerHTML = "<li>No tracks found</li>";
                    } else {
                        files.forEach(file => {
                            const li = document.createElement("li");
                            const link = document.createElement("a");
                            link.href = "javascript:void(0)";
                            link.textContent = file.name;
                            link.onclick = (event) => {
                                event.preventDefault();
                                // Chiama la funzione getFileUrl per recuperare l'URL al momento della selezione
                                if (window.opener) {
                                    const getFileUrl = window.opener.getFileUrl;
                                    if (typeof getFileUrl === "function") {
                                        getFileUrl(file.path, (url) => {
                                            if (url) {
                                                // Chiama initWaveSurfer nella finestra principale
                                                if (typeof window.opener.initWaveSurfer === "function") {
                                                    window.opener.initWaveSurfer('${containerId}', url);
                                                    window.close();
                                                } else {
                                                    console.error("initWaveSurfer non è disponibile nella finestra principale.");
                                                }
                                            } else {
                                                console.error("Errore nel recupero dell'URL.");
                                            }
                                        });
                                    } else {
                                        console.error("getFileUrl non è definita nella finestra principale.");
                                    }
                                } else {
                                    console.error("Nessuna finestra principale trovata.");
                                }
                            };
                            li.appendChild(link);
                            trackList.appendChild(li);
                        });
                    }
                }

                displayTracks();
            </script>
        </body>
        </html>
    `);
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


/*DOWNLOAD*/
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
    const fileName = prompt("Inserisci il nome del file da scaricare:", "compressed_audio.wav");
    if (!fileName) return;

    // Configura OfflineAudioContext per mixaggio
    const sampleRate = c.sampleRate;
    const offlineContext = new OfflineAudioContext(2, sampleRate * maxDuration, sampleRate);

    // Ottieni i valori attuali dei parametri dai knob
    const thresholdValue = parseFloat(document.getElementById('th_knob').value) || df_th;
    const kneeValue = parseFloat(document.getElementById('knee_knob').value) || df_knee;
    const ratioValue = parseFloat(document.getElementById('ratio_knob').value) || df_ratio;
    const attackValue = parseFloat(document.getElementById('att_knob').value) || df_att;
    const releaseValue = parseFloat(document.getElementById('rel_knob').value) || df_rel;

     // Crea il compressore dinamico e imposta i parametri
     const compressoroff = offlineContext.createDynamicsCompressor();
     compressoroff.threshold.setValueAtTime(thresholdValue, offlineContext.currentTime);
     compressoroff.knee.setValueAtTime(kneeValue, offlineContext.currentTime);
     compressoroff.ratio.setValueAtTime(ratioValue, offlineContext.currentTime);
     compressoroff.attack.setValueAtTime(attackValue, offlineContext.currentTime);
     compressoroff.release.setValueAtTime(releaseValue, offlineContext.currentTime);

     // Configura il nodo di make-up gain offline
    const makeupGainNodeoff = offlineContext.createGain();

    // Ottieni il valore corrente del nodo GainNode (make-up gain) dal contesto in tempo reale
    const currentMakeUpGain = out.gain.value; // Assumi che "out" sia il nodo GainNode originale
    makeupGainNodeoff.gain.setValueAtTime(currentMakeUpGain, offlineContext.currentTime); // Applica il guadagno


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
        source.connect(compressoroff);
    });
    compressoroff.connect(makeupGainNodeoff);
    makeupGainNodeoff.connect(offlineContext.destination); // Connetti alla destinazione


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