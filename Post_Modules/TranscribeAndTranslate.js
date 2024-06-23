/* Params: 
    data: Blob;
    mime: string;
*/

const fp = require('fs/promises');
const { Transcribe } = require('./VoiceV2');

const response = {
    successful: false
}

if (data) {
    // Convert data back from being a base64 string.
    // const ActualData = data.substr(data.indexOf(',')+1);
    /*
    const byteCharacters = atob(data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    */
    /* 
    const blob = new Blob([Buffer.from(data, 'base64')], {type: 'audio/webm;codecs=opus'});
    console.log("reached");
    console.log(blob);
    */

    const Path = `./Temp/${Math.floor(Math.random() * 1000)}.opus`;
    return fp.writeFile(Path, Buffer.from(data, 'base64'))
        .then(() => {
            // Transcribe it.
            Transcribe(Path).then(v => {
                Object.keys(v).forEach(key => {
                    response[key] = v[key];
                })
                
                if (!DEBUG) fp.unlink(Path);

                response.successful = true;
                res.statusCode = 200;
                res.setHeader("Content-Type", getMime("json"));
                res.end(JSON.stringify(response));
            })
        })
} else {
    response.successful = false;
    response.reason = "No path passed!";
}

res.statusCode = 200;
res.setHeader("Content-Type", getMime("json"));
res.end(JSON.stringify(response));