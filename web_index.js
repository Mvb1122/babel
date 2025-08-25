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

let chunkLength = 0.3 * 1000; // half second per check. (1000ms/s)

// Use an accumulator system to decide whether we should be listening or not.
let CurrentMessage = null;
async function AudioLoop() {
    do {
        // Start a new recording so we can analyze it.
        const chunkRecording = new Recorder();
        await chunkRecording.start();
        await new Promise(res => {
            setTimeout(async () => {
                // Stop recording after a chunkLength of time.
                const data = await chunkRecording.stop();

                // Send it to server for analysis.
                    // Send blob as a base64 string.
                const Buffer = await data.data.arrayBuffer();
                const b64 = ArrayBufferToBase64(Buffer);
                /**
                 * @type {{{time: number, vad: number, snr: number, c50: number}}}
                 */
                const analysisResult = await postJSON("./Post_Modules/IsTurnOver.js", b64, false, data.mime)
                let avgVad = 0;
                for (let i = 0; i < Object.keys(analysisResult).length - 1; i++) {
                    const part = analysisResult[i]; 
                    avgVad += part.vad;
                }
                avgVad /= Object.keys(analysisResult).length;

                console.log("Average VAD: " + avgVad);

                if (avgVad <= 0.3 && CurrentMessage != null) { // 0 is perfect done.
                    CurrentMessage.stop();
                    CurrentMessage = null;
                    document.getElementById("Header").innerText = StatusOffSymbol;
                }

                else if (avgVad >= 0.3 && CurrentMessage == null) { // 1 means still speaking.
                    CurrentMessage = new AutoMessage();
                    document.getElementById("Header").innerText = StatusOnSymbol;
                }

                // Set confidence and average meters.
                document.getElementById("ConfidenceDisplayInner").style.width = `calc(${avgVad} * ${maxConfidenceWidth})`;

                res();
            }, chunkLength);
        })
    } while (true);
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