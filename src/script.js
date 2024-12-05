const c = new AudioContext();
let compressor;
let state_comp = false;
let df_th = -50;
let df_knee = 40;
let df_ratio = 12;
let df_att = 0.003;
let df_rel = 0.25; 
let audioPlayer;
let source;
let waveSurfer;

createCompressor();  //devo creare un unico compressore! una sola volta.

function play() {
    play_track();
}

function play_track() {
    waveSurfer.play();
}

function suspend() {
    waveSurfer.pause()
}

// Carica una nuova traccia
function uploadTrack() {
    const fileInput = document.getElementById("audioFileInput");
    audioPlayer = document.getElementById("audioPlayer");
    fileInput.click();

    fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const fileURL = URL.createObjectURL(file);
            audioPlayer.src = fileURL;

            initWaveSurfer(fileURL);
        } else {
            alert("Nessun file audio selezionato!");
        }
    });
}

// Inizializza WaveSurfer con il file audio
function initWaveSurfer(fileURL) {
    if (waveSurfer) {
        waveSurfer.destroy(); // Distruggi l'istanza precedente, se esiste
    }

    fileURL.controls = true //in modo da poter controllare la traccia dalla waverform

    waveSurfer = WaveSurfer.create({
        container: '#waveform-container',
        waveColor: 'violet',
        progressColor: 'purple',
        height: 200,
        url: fileURL,
        dragToSeek: true,
        media: audioPlayer,
    });

    source = c.createMediaElementSource(audioPlayer);
    source.connect(compressor);
    compressor.connect(c.destination);

    waveSurfer.on('click', (progress) => {
        waveSurfer.play()
      })
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




/*  compressore   */

function compOnOff(state_comp) {
    if (state_comp) {
        source.disconnect(); // Sconnetto l'oscillatore dall'output
        source.connect(compressor); // Connetto l'oscillatore al compressore
        compressor.connect(c.destination); // Connetto il compressore all'output
    } else {
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
}

function updateRatio(df_ratio) {
    compressor.ratio.setValueAtTime(df_ratio, c.currentTime);
}

function updateKnee(df_knee) {
    compressor.knee.setValueAtTime(df_knee, c.currentTime);
}

function updateAtt(df_att) {
    compressor.attack.setValueAtTime(df_att, c.currentTime);
}

function updateRel(df_rel) {
    compressor.release.setValueAtTime(df_rel, c.currentTime);
}

function toggle_comp() {
    state_comp = !state_comp;
    compOnOff(state_comp);
    const button = document.getElementById("toggle_comp");
    button.textContent = state_comp ? "Compression On" : "Compression Off";
}


