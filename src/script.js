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
let currentTime1

createCompressor();  //devo creare un unico compressore! una sola volta.
//Quando chiami createCompressor(), crei un nuovo oggetto DynamicsCompressorNode tramite c.createDynamicsCompressor(). Questo nodo è un componente che vive all'interno del grafo di elaborazione audio di AudioContext
// se metto questa riga all'interno del main ogni volta che richiamo la funzione creo un nuovo nodo completamente separato dal precedente.
// Quindi commetto due errore:
// 1)Stai solo creando un nuovo compressore, ma non ricolleghi l'oscillatore al nuovo compressore.
//  2)Se il compressore precedente è ancora connesso, potresti accumulare nodi inutilizzati nel grafo audio, causando un comportamento inatteso e un consumo di risorse non necessario.
//In breve: il compressore è un oggetto che deve essere creato una volta e riutilizzato, evitando duplicazioni.


function main() {
        play_track();
    }


    function play_track() {
        audioPlayer.play(currentTime1);
       
    
    }


    function suspend() {
        audioPlayer.pause();
        
    }






/*  finestra    */ 



function uploadTrack() {
    const fileInput = document.getElementById("audioFileInput");
    audioPlayer = document.getElementById("audioPlayer");
    fileInput.click();

    fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const fileURL = URL.createObjectURL(file);
            audioPlayer.src = fileURL;
            initWaveSurfer();
            

            // Connetti l'audio al compressore e al grafo audio
            
            
            
            source = c.createMediaElementSource(audioPlayer);
            source.connect(compressor);
            compressor.connect(c.destination);
            
            waveSurfer.load(audioPlayer.src);
            sync()
            
        } else {
            alert("Nessun file audio selezionato!");
        }
    });
}

function initWaveSurfer() {
    waveSurfer = WaveSurfer.create({
        container: '#waveform-container',
        waveColor: 'violet',
        progressColor: 'purple',
        backend: 'MediaElement',
        height: 200,
    });
}
function sync() {
    // Sincronizza WaveSurfer con il source audio del grafo AudioContext
    
    /*
    waveSurfer.on('play', () => {
        c.resume(); // Assicura che l'AudioContext sia attivo
        audioPlayer.play(); // Usa audioPlayer come sorgente effettiva di playback
    });

    waveSurfer.on('pause', () => {
        audioPlayer.pause(); // Pausa la riproduzione tramite audioPlayer
    });
    */

    waveSurfer.on('seek', (progress) => {
        audioPlayer.currentTime = progress * audioPlayer.duration; // Allinea il tempo
    });

    // Mantieni sincronizzata la forma d'onda con il tempo corrente dell'audio
    audioPlayer.addEventListener('timeupdate', () => {
         currentTime1 = audioPlayer.currentTime / audioPlayer.duration;
        waveSurfer.seekTo(currentTime1);
    });
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
        source.disconnect(); //sconnetto l'oscillatore dall'output
        source.connect(compressor); //connetto l'oscillatore al compressore
        compressor.connect(c.destination); //connetto il compressore all'output
       
    }
    else
    {
        compressor.disconnect() //scollego il compressore
        source.connect(c.destination); //collego l'oscillatore
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

