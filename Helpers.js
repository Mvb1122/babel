/**
 * Posts the data to the given URL.
 * @param {String} URL The URL to post to.
 * @param {Object} data The JSON for the server. DO NOT STRINGIFY BEFOREHAND!
 * @param {boolean | undefined} stringify Whether or not to stringify (to send raw.)
 * @param {string | undefined} type Mime type of the data.
 * @returns {Promise<Object>} The JSON back from the server.
 */
export function postJSON(URL, data, stringify = true, type = 'application/json') {
    return new Promise(async (res, rej) => {
        let request = fetch(URL, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': type,
            },
            method: "POST",
            body: stringify ? JSON.stringify(data) : data,
        })
            
        request.then(async (a) => {
            const text = await a.text();
            // console.log(text)
            try {
                res(JSON.parse(text));
            } catch {
                rej(text);
            }
        });
    })
}

let scriptProcessor = null, stream = null;
// Extract creating audio stream out, to persist it over time.
async function setupVolumeTrackerStream() {
    try {
        stream = navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(await stream);
        scriptProcessor = audioContext.createScriptProcessor(16384, 1, 1);

        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;

        microphone.connect(analyser);
        analyser.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);

        return; // Now scriptProcessor is all setup.
    } catch (err) {
        console.error(err);
        throw err;
    }
}

async function stopVolumeTrackerStream() {
    (await stream).getTracks().forEach(track => {
        track.stop();
    });
}

/** Tasty stolen code :3 
 * @returns {Promise<number>} 0-100 representing volume.
 * @see https://stackoverflow.com/questions/33322681/checking-microphone-volume-in-javascript
*/
export function GetAverageVolume() {
    return new Promise(async (resolve, reject) => {
        if (scriptProcessor == null) await setupVolumeTrackerStream();

        scriptProcessor.onaudioprocess = function() {
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            const arraySum = array.reduce((a, value) => a + value, 0);
            const average = arraySum / array.length;

            resolve(Math.round(average));
        };
    })
}

export function blobToBase64(blob) {
    return new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}