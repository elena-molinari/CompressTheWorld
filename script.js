const c = new AudioContext();
let compressor;
let state_comp = false;
let audioSources = {};
// Store the selected waveforms 
let waveSurfers = {};
// Store the selected tracks
let selectedTracks = new Set(); 
// Default parameters of the compressor
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


//Create a single compressor!
createCompressor();  

analyser = c.createAnalyser();

/* Set the properties of the analyzer for the VU meter */
analyser.fftSize = 256;  // Set the dimension of the FFT
let bufferLength = analyser.frequencyBinCount;  // Get the number of frequency bins
let dataArray = new Uint8Array(bufferLength);  // Array to store frequency data

// Function to select or deselect a track
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

// Global function for Pause
function pauseTracks() {
    selectedTracks.forEach((containerId) => {
        if (waveSurfers[containerId]) {
            waveSurfers[containerId].pause();
            isPlaying = false; // Aggiorna lo stato
            console.log("isPlaying = false")
        }
    });
}

// Add an event listener for the space key
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

// Global function to rewind tracks
function backTracks() {
    selectedTracks.forEach((containerId) => {
        if (waveSurfers[containerId]) {
            waveSurfers[containerId].skip(-60);
        }
    });
   
}

// Function to restore default values of knobs
function resetKnobs() {
    // Imposta i valori di default per ogni knob
    $('#th_knob').val(-50).trigger('change');
    $('#ratio_knob').val(12).trigger('change');
    $('#knee_knob').val(40).trigger('change');
    $('#att_knob').val(0.003).trigger('change');
    $('#rel_knob').val(0.25).trigger('change');
    
    // Rimuovi i valori dal localStorage
    localStorage.removeItem('threshold');
    localStorage.removeItem('ratio');
    localStorage.removeItem('knee');
    localStorage.removeItem('attack');
    localStorage.removeItem('release');
}

// Add an event listener to reset button
$('#resetKnobsButton').on('click', function() {
    resetKnobs(); // Ripristina i valori di default
});


// Upload new track
function uploadTrack(fileInputId, audioPlayerId, containerId) {
    let fileInput = document.getElementById(fileInputId);
    let audioPlayer = document.getElementById(audioPlayerId);

    fileInput.click();

    fileInput.addEventListener("change", (event) => {
        let file = event.target.files[0];
        if (file) {   
            let fileURL = URL.createObjectURL(file);
           
            //reset audioPlayer
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

// Initialize WaveSurfer with the audio file
function initWaveSurfer(containerId, fileURL) {
    console.log("entrato in init");
    //as soon as I upload the track the dot is activated immediately
    const button = document.getElementById(`selectBtn_${containerId}`);
    selectedTracks.add(containerId);
    button.classList.add("selected");


    if (waveSurfers[containerId]) {
        console.log("distrugge forma d'onda prec")
       //Correctly delete the previous instance 
        waveSurfers[containerId].destroy(); // Destroy previous instance
        delete waveSurfers[containerId]; // Remove the instance from memory
    }

    if (audioSources[containerId]) {
        audioSources[containerId].disconnect();
        delete audioSources[containerId];
        console.log("distrugge audioplayer precedente")
    }

    // Remove the old audio element, if it exists
    const oldAudioPlayer = document.getElementById(`audio_${containerId}`);
    if (oldAudioPlayer) {
        oldAudioPlayer.pause(); // Make sure the audio is still
        oldAudioPlayer.src = ""; // Empty the source
        oldAudioPlayer.load(); // Reset of player
        oldAudioPlayer.remove(); // Remove from the DOM
        console.log("Elemento audio precedente rimosso.");
    }

    // Create a new audio item
    let audioPlayer = document.createElement('audio');
    audioPlayer.id = `audio_${containerId}`;
    audioPlayer.src = fileURL;
    audioPlayer.style.display = 'none'; // Hides the element
    audioPlayer.controls = true; // Optional, to manually control the playback
    document.body.appendChild(audioPlayer);
    console.log("audioPlayer.src:", audioPlayer.src);
    audioPlayer.addEventListener('loadeddata', () => {
        console.log("File audio caricato correttamente.");
    });
    
    // creation of waveform
    let container = document.getElementById(containerId);
    const waveSurfer = WaveSurfer.create({
        container: container,
        waveColor: '#FFD400',
        progressColor: '#AD1919',
        height: 98,
        url: fileURL,
        dragToSeek: true,
        media: audioPlayer,
    });

    audioSources[containerId] = c.createMediaElementSource(audioPlayer);
    out = c.createGain();
    
    compOnOff(state_comp, containerId);
    
    // Associates the WaveSurfer instance with the container
    waveSurfers[containerId] = waveSurfer  
}


// Update MakeUP gain based on manual control
function updateMakeUpGain() {
    if (isFirstClick) {
         // Save the original gain before applying Make-Up Gain
         originalGain = out.gain.value;

        // Read the current compressor reduction
        const reduction = compressor.reduction; // In dB, negative value

        // Calculate the Make-Up Gain to compensate for the reduction
        const makeupGain = -reduction / 10; // Convert from dB to linear scale
        
        // Applies Make-Up Gain to the GainNode (out)
        out.gain.setValueAtTime((originalGain + makeupGain), c.currentTime);
        
        isFirstClick = false;
    }
}

function resetMakeUpGain() {
    out.gain.setValueAtTime(originalGain, c.currentTime);
}

function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    } else {
        console.error(`Dropdown con ID '${dropdownId}' non trovato.`);
    }
}

function compOnOff(state, containerId) {
    if (state) {
        audioSources[containerId].disconnect(); // I disconnect the oscillator from the output
        analyser.disconnect();
        out.disconnect();
        compressor.disconnect();
        audioSources[containerId].connect(compressor); // I connect the oscillator to the compressor
        compressor.connect(out); // I connect compressor to gain
        out.connect(analyser); //I connect the compressor to the output
        analyser.connect(c.destination);

        
        // Activates VU meter based on compressor reduction
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(function() {
            let reduction1 = compressor.reduction;  // Get the reduction in dB

            // If the reduction value is positive (compressor is not reducing), we set it to 0
            if (reduction1 > 0) reduction1 = 0;

            // Map the reduction (in dB) to a rotation (in degrees).
            // The reduction in dB ranges from 0 (no reduction) to -80 dB (max reduction), so we map this to a range of degrees.
            let rotation = Math.max(-reduction1 * 2, 0);  // Map the reduction in dB (to negative value) to degrees
            rotation = Math.min(rotation, 180);  // Limit rotation to 180 degrees (max value of needle rotation)

            let needle = document.getElementById("VUmeter").getElementsByClassName('needle')[0];
            needle.style.transform = "rotate(" + (rotation + 20) + "deg)"; // Adds an offset to prevent the needle from stopping at 0 degrees
        }, 50);

        
    } else {
        audioSources[containerId].disconnect();
        analyser.disconnect();
        out.disconnect();
        compressor.disconnect(); // I unplug the compressor
        audioSources[containerId].connect(c.destination); // I connect the oscillator
        // Disables the VU meter (stops being updated)
        clearInterval(intervalId); // Cleans up the interval that updates the VU meter
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

// Function to obtain the duration of an audio file
async function getAudioDuration(audioSrc) {
    const audio = new Audio(audioSrc);
    return new Promise((resolve) => {
        audio.addEventListener('loadedmetadata', () => resolve(audio.duration));
    });
}

// Function to upload a track and mix it in the offline context
async function loadAndMixTrack(audioSrc, offlineContext) {
    const response = await fetch(audioSrc);
    const arrayBuffer = await response.arrayBuffer();
    const decodedBuffer = await offlineContext.decodeAudioData(arrayBuffer);

    const bufferSource = offlineContext.createBufferSource();
    bufferSource.buffer = decodedBuffer;
    bufferSource.start(0);

    return bufferSource;
}

// Function to convert audio buffer to .wav format
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
// When the page loads, it checks whether there are any values saved in the localStorage
$(document).ready(function() {
    // Recupera i valori da localStorage e aggiorna i knob
    if (localStorage.getItem('threshold')) {
        $('#th_knob').val(localStorage.getItem('threshold')).trigger('change');
    }

    if (localStorage.getItem('ratio')) {
        $('#ratio_knob').val(localStorage.getItem('ratio')).trigger('change');
    }

    if (localStorage.getItem('knee')) {
        $('#knee_knob').val(localStorage.getItem('knee')).trigger('change');
    }

    if (localStorage.getItem('attack')) {
        $('#att_knob').val(localStorage.getItem('attack')).trigger('change');
    }

    if (localStorage.getItem('release')) {
        $('#rel_knob').val(localStorage.getItem('release')).trigger('change');
    }
});

// Knob per Threshold
$('#th_knob').knob({
    min: -100,
    max: 0,
    step: 1,
    fgColor:"white",
    bgColor:"transparent",
    thickness: 0.35,
    cursor: 6,
    angleOffset:-125,
    angleArc:250,
    width: '100%',
    height: '100%',
    rotation: 'clockwise',
    release: function (v) {
        updateThreshold(v);
        localStorage.setItem('threshold', v);
    }
})

// Knob per Ratio
$('#ratio_knob').knob({
    min: 1,
    max: 20,
    step: 1,
    fgColor:"white",
    bgColor:"transparent",
    cursor: 6,
    angleOffset:-125,
    angleArc:250,
    width: '100%',
    height: '100%',
    rotation: 'clockwise',
    release: function (v) {
        updateRatio(v);
        localStorage.setItem('ratio', v);
    }
});

// Knob per Knee
$('#knee_knob').knob({
    min: 0,
    max: 40,
    step: 5,
    fgColor:"white",
    bgColor:"transparent",
    cursor: 6,
    angleOffset:-125,
    angleArc:250,
    width: '100%',
    height: '100%',
    rotation: 'clockwise',
    release: function (v) {
        updateKnee(v);
        localStorage.setItem('knee', v);
    }
});

// Knob per Attack
$('#att_knob').knob({
    min: 0.003,
    max: 1,
    step: 0.01,
    fgColor:"white",
    bgColor:"transparent",
    cursor: 6,
    angleOffset:-125,
    angleArc:250,
    width: '100%',
    height: '100%',
    rotation: 'clockwise',
    release: function (v) {
        updateAtt(v);
        localStorage.setItem('attack', v);
    }
});

// Knob per Release
$('#rel_knob').knob({
    min: 0.25,
    max: 1,
    step: 0.01,
    fgColor:"white",
    bgColor:"transparent",
    cursor: 6,
    angleOffset:-125,
    angleArc:250,
    width: '100%',
    height: '100%',
    rotation: 'clockwise',
    release: function (v) {
        updateRel(v);
        localStorage.setItem('release', v);
    }
});


// Update functions
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