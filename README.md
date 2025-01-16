# CompressTheWorld - Audio Compressor


## Description

CompressTheWorld is an advanced audio compression system based on the Web Audio API. It allows users to upload, process, and download audio tracks with an intuitive interface and interactive controls. The compressor includes visual tools like a VU meter and rotary knobs to customize every parameter in real-time.

## Key Features

### 1. Dynamic Compression
- Dynamic range control: Threshold, Ratio, Knee, Attack, Release.
- VU Meter: Displays real-time gain reduction.
- Compressor On/Off: Quickly toggle between compressed and uncompressed audio.
### 2. Interactive Controls
- Interactive knobs: Adjust Threshold, Ratio, Knee, Attack, and Release.
- Persistence: Saves settings in localStorage to restore them upon reopening.
- Knob Reset: Resets all parameters to their default values.
### 3. Make-Up Gain
- Automatically compensates for the volume reduction caused by the compressor.
- Reset function to restore the original gain value.
### 4. Track Export
- Export processed tracks as .wav files.
- Includes all compression and gain settings.
### 5. Track Upload and Management
- Supports up to 4 audio tracks.
- Waveform visualization: Each uploaded track is displayed with a graphical representation via WaveSurfer.js.
- Track selector: Visually indicates which tracks are active for compression.
### 6. Playback Control
- Controls for play, pause, and rewind all tracks.
- Support for simultaneous control via the spacebar.



## Usage Instructions

- Upload a Track: Click one of the upload buttons to select an audio file.
- Customize Compression: Use the knobs to adjust compression parameters.
- Activate the Compressor: Press the Compression On/Off button.
- Export the Audio: After applying effects, click Download to save the processed audio file.
- Control Playback: Use the buttons or the spacebar to control the tracks.
