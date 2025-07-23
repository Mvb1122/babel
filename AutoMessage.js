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

/**
 * @type {Map<String, HTMLTableRowElement[]>}
 */
const messagesByUser = new Map()

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

        const el = message.GetHTML();

        // Add to the list by names. 
        if (messagesByUser.has(v.user)) {
            messagesByUser.get(v.user).push(el);
        } else {
            messagesByUser.set(v.user, [el]);
        }

        // Put new messages at the start.
        document.getElementById("List").prepend(el)
        // document.getElementById("List").innerHTML = message.GetHTML().outerHTML + document.getElementById("List").innerHTML;
    }

    static renameUser(old, newName) {
        // Get all messages by the old name. 
        const messages = messagesByUser.get(old);
        if (messagesByUser.delete(old)) {
            // Rename the elements.
            messages.forEach(v => {
                v.innerHTML = v.innerHTML.replaceAll(old, newName);
            });

            // Add to new name.
            if (messagesByUser.has(newName))
                messagesByUser.get(newName).push(messages);
            else 
                messagesByUser.set(newName, messages);
        }
    }
}