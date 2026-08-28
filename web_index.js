import Recorder from './Recorder.js'
import { GetAverageVolume, ArrayBufferToBase64, postJSON } from './Helpers.js'
import AutoMessage from './AutoMessage.js';

export async function Test() {
    console.log("Starting self test!")
    
    const Prevolume = await GetAverageVolume();
    console.log(Prevolume)
    if (Prevolume == 0) alert("Check your microphone! I don't hear anything! Maybe click on the screen?");

    const recording = new Recorder();

    await recording.start();

    setTimeout(async () => {
        const result = await recording.stop();
        
        console.log(result);

        if (result.data.size > 0) console.log("Audio can be recorded!");
        else alert("Something went wrong with recording audio...")
        console.log("Test over!");
    }, 5000);
}

// Test().then(() => AudioLoop());

document.getElementById("TestButton").onclick = Test;

// Define the emoji symbols for recording being on/off
const StatusOnSymbol = '🟢'
const StatusOffSymbol = '🔴'

const rootStyles = window.getComputedStyle(document.documentElement);
const maxConfidenceWidth = rootStyles.getPropertyValue('--max-confidence-width');

const chunkLength = 0.2 * 1000; // quarter second per check. (1000ms/s)
const recordingLength = 8 * 1000; // 8 seconds ideal length.
const numRecordings = recordingLength / chunkLength;
const limit = 0.7;

// Use an accumulator system to decide whether we should be listening or not.
let CurrentMessage = null;
async function AudioLoop() {
    // Each time we go around, start a new recording and stop the oldest one.
    const recordings = [];
    function getRec() {
        return recordings.splice(0, 1)[0]; // Remove the first element and return it.
    }

    async function startNewRec() {
        const chunkRecording = new Recorder(); 
        await chunkRecording.start();
        recordings.push(chunkRecording);
    }

    for (let i = 0; i < numRecordings; i++) startNewRec(); // Start up recordings to start.
    
    let wait = false;
    setInterval(async () => {
        if (wait) return; // Skip while another interval is still processing. 
        wait = true;

        const recording = getRec();
        // Get a recording *and* start a new one.
        const data = await recording.stop();
        startNewRec();

        // Send it to server for analysis.
            // Send blob as a base64 string.
        const Buffer = await data.data.arrayBuffer();
        const b64 = ArrayBufferToBase64(Buffer);

        /**
         * @type {{successful: boolean, prediction: number, probability: number}}
         */
        const analysisResult = await postJSON("./Post_Modules/IsTurnOver.js", b64, false, data.mime);
        
        let avgVad = 1 - analysisResult.probability; // New Smart Turn V3 model says 1 = turn over. This system is built for 0 is over.

        console.log("Average VAD: " + avgVad);

        // 0 is perfect done.
        if (avgVad <= limit && CurrentMessage != null) {
            CurrentMessage.stop();
            CurrentMessage = null;
            document.getElementById("Header").innerText = StatusOffSymbol;
        }

        else if (avgVad >= limit && CurrentMessage == null) { // 1 means still speaking.
            CurrentMessage = new AutoMessage();
            document.getElementById("Header").innerText = StatusOnSymbol;
        }

        // Set confidence and average meters.
        document.getElementById("ConfidenceDisplayInner").style.width = `calc(${avgVad} * ${maxConfidenceWidth})`;

        wait = false;
    }, chunkLength);
}
// AudioLoop();

let MinCheckTime = 0;
let time = performance.now()
GetAverageVolume().then(v => {
    MinCheckTime = ((performance.now() - time) / 1000).toFixed(2)
    let avgAudio = v;
    console.log(`Time for single GetAvgAudio(): ${MinCheckTime}\nVolume:${v}`);
    
    document.getElementById("StartButton").onclick = AudioLoop;
    document.getElementById("Header").innerText += " Ready!";
})

// Start new message whenever z key is hit.
document.addEventListener('keypress', (event) => {
  if (event.key == "z") {
    CurrentMessage.stop();
    CurrentMessage = new AutoMessage();
  }
});