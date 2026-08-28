/* Params: 
    data: Blob;
    mime: string;
*/

const fp = require('fs/promises');
const { DetectSpeech } = require('./VoiceV2');

const response = {
    successful: false
}

if (data) {
    const Path = `./Temp/${Math.floor(Math.random() * 1000)}.opus`;
    return fp.writeFile(Path, Buffer.from(data, 'base64'))
        .then(() => {
            // Analyze it.
            DetectSpeech(Path).then(v => {
                try {
                    Object.keys(v).forEach(key => {
                        response[key] = v[key];
                    })
                    
                    if (!DEBUG) fp.unlink(Path);

                    response.successful = true;
                    res.statusCode = 200;
                    res.setHeader("Content-Type", getMime("json"));
                    res.end(JSON.stringify(response));
                } catch (e) {
                    res.statusCode = 500;
                    res.setHeader("Content-Type", getMime("json"));
                    res.end(JSON.stringify({
                        successful: false,
                        reason: "Internal Server Error.",
                        error: e
                    }));

                    console.error(e);
                }
            })
        })
} else {
    response.successful = false;
    response.reason = "No path passed!";
}

res.statusCode = 200;
res.setHeader("Content-Type", getMime("json"));
res.end(JSON.stringify(response));