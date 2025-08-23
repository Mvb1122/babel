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

export function blobToBase64(blob) {
    return new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

// Make it so the volume tracker is started after clicking. 
document.addEventListener('click', async () => {
    if (scriptProcessor == null) {
        await setupVolumeTrackerStream();
        console.log("Audio tracker setup.")
    }
})