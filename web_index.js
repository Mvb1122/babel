import Recorder from './Recorder.js'
import { GetAverageVolume } from './Helpers.js'
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

let avgAudio = 1e-63;
let MinCheckTime = 0.17;

// Use an accumulator system to decide whether we should be listening or not.
let confidence = 1.0; // 1 = 100% confident, 0 = 0% confident.
async function AudioLoop() {
    let CurrentMessage = null;
    do {
        let vol = GetAverageVolume();
        await new Promise(res => {
            setTimeout(async () => {
                vol = await vol;
                if (CurrentMessage != null) {
                    avgAudio += (vol + avgAudio * 2) / 3 // Decrease the effect that a single moment has.
                    avgAudio /= 2;
                } else {
                    avgAudio += (vol + avgAudio * 5) / 6 // Decrease the effect that a single moment has.
                    avgAudio /= 2;
                }
                
                if (vol > avgAudio && CurrentMessage == null && confidence < 1) confidence += 0.4;
                else if (vol > avgAudio && CurrentMessage != null && confidence < 1) confidence += 0.06;
                else if (vol < avgAudio && confidence > 0) confidence -= 0.045;
                
                console.log({avg: avgAudio, vol: vol, confidence: confidence});
                
                if (confidence < 0.4 && CurrentMessage != null) {
                    CurrentMessage.stop();
                    CurrentMessage = null;
                    document.getElementById("Header").innerText = StatusOffSymbol;
                }

                else if (confidence > 0.4 && CurrentMessage == null) { // || (vol == 0 && 0 == avgAudio)
                    CurrentMessage = new AutoMessage();
                    document.getElementById("Header").innerText = StatusOnSymbol;
                }

                // Set confidence meter.
                document.getElementById("ConfidenceDisplayInner").style.width = `calc(${confidence} * ${maxConfidenceWidth})`;

                res();
            }, MinCheckTime * 2);
        })
    } while (true);
}
// AudioLoop();

let time = performance.now()
GetAverageVolume().then(v => {
    MinCheckTime = ((performance.now() - time) / 1000).toFixed(2)
    avgAudio = v;
    console.log(`Time for single GetAvgAudio(): ${MinCheckTime}\nVolume:${v}`);
    
    document.getElementById("StartButton").onclick = AudioLoop;
    document.getElementById("Header").innerText += " Ready!";
})