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

/** Tasty stolen code :3 
 * @returns {Promise<number>} 0-100 representing volume.
 * @see https://stackoverflow.com/questions/33322681/checking-microphone-volume-in-javascript
*/
export function GetAverageVolume() {
    return new Promise((resolve, reject) => {
        navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        })
            .then(function(stream) {
                const audioContext = new AudioContext();
                const analyser = audioContext.createAnalyser();
                const microphone = audioContext.createMediaStreamSource(stream);
                const scriptProcessor = audioContext.createScriptProcessor(16384, 1, 1);
            
                analyser.smoothingTimeConstant = 0.8;
                analyser.fftSize = 1024;
            
                microphone.connect(analyser);
                analyser.connect(scriptProcessor);
                scriptProcessor.connect(audioContext.destination);
                scriptProcessor.onaudioprocess = function() {
                    const array = new Uint8Array(analyser.frequencyBinCount);
                    analyser.getByteFrequencyData(array);
                    const arraySum = array.reduce((a, value) => a + value, 0);
                    const average = arraySum / array.length;
                    
                    // Stop tracking because we got our number.
                    stream.getTracks().forEach(track => {
                        track.stop();
                    });

                    resolve(Math.round(average));
                };
            })
            .catch(function(err) {
                /* handle the error */
                console.error(err);
                reject(err);
            });
    })
}

export function blobToBase64(blob) {
    return new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}