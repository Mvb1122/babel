import { blobToBase64, postJSON } from "./Helpers.js";
import Recorder from "./Recorder.js"
import Message from "./Message.js"

function ArrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/**
 * @param {Number} ms 
 * @returns {Promise}
 */
function waitMS(ms) {
    return new Promise(res => setTimeout(() => {
        res();
    }, ms));
}

export default class AutoMessage {
    #Recorder
    constructor() {
        this.#Recorder = new Recorder();
        this.#Recorder.start();
    }

    async stop() {
        await waitMS(300);

        const data = await this.#Recorder.stop();

        // Send blob as a base64 string.
        const Buffer = await data.data.arrayBuffer();
        const b64 = ArrayBufferToBase64(Buffer);

        /*
        // await blobToBase64(data.data);
        const array = [];
        const view = new DataView(await data.data.arrayBuffer())
        
        for (let i = 0; i < view.byteLength; i++) array.push(view.getInt8(i));
        
        data.data = array;
        */

        const v = await postJSON("./Post_Modules/TranscribeAndTranslate.js", b64, false, data.mime)

        // Passively aggressively make english text smaller.
        /*
        if (v.source == 'en') {
            v.Translation = v.text
            v.text = null;
        }
        */

        const message = new Message({
            Time: undefined,
            User: v.user,
            Language: v.source,
            Content: v.text,
            Translation: v.translation,
        });

        // Put new messages at the start.
        document.getElementById("List").innerHTML = message.GetHTML().outerHTML + document.getElementById("List").innerHTML;
    }
}