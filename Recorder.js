/** @type {MediaStreamConstraints} */
const AudioConstraints = { audio: true };


export default class Recorder {
    /** @type {[Blob]} */
    #data = [];
    /** @type {MediaStream | null} */
    #stream = null;
    
    /** @type {MediaRecorder | null} */
    #MediaRecorder = null;

    /** Start recording the audio
      * @returns {Promise} - returns a promise that resolves if audio recording successfully started
      */
    start() {
        // Feature Detection
        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
            // Feature is not supported in browser, so return a custom error
            return Promise.reject(new Error('mediaDevices API or getUserMedia method is not supported in this browser.'));
        }
        else {
            // Create an audio stream and set it up for recording.
            const stream = navigator.mediaDevices.getUserMedia(AudioConstraints)
                .then(stream => {
                    // Save the stream.
                    this.#stream = stream;

                    this.#data = []; // Wipe previous blobs.

                    this.#MediaRecorder = new MediaRecorder(stream)

                    // Store audio on slice.
                    this.#MediaRecorder.addEventListener('dataavailable', e => {
                        this.#data.push(e.data);
                    })

                    // Start the actual recording.
                    this.#MediaRecorder.start(30);
                });

            // If something goes wrong, then cry.
            stream.catch(error => {
                alert(`An ${error.name} has occured! Scream at Micah to fix it.`);
            })

            return stream;
        }
    }

    /** Stop the started audio recording
      * @returns {Promise<{data: Blob, mime: string}>} - returns a promise that resolves to the audio as a blob file
      */
    stop() {
        if (this.#MediaRecorder.state == 'inactive') return;
        else return new Promise(res => {
            const mimeType = this.#MediaRecorder.mimeType;
            
            this.#MediaRecorder.addEventListener('stop', () => {
                // Merge all blobs up to this point.
                let sigmaBlob = new Blob(this.#data, {type: mimeType})
                res({
                    data: sigmaBlob,
                    mime: mimeType
                });
            })

            this.#MediaRecorder.stop();
            this.#stopStream();
    
            // Note: I modified the code I was copying here because I won't be performing much in the way of cleanup, since it'll happen automatically when audio level dips.
        });
    }

    #stopStream() {
        // Stop all tracks in the stream.
        this.#stream.getTracks().forEach(track => {
            track.stop();
        });
    }
}