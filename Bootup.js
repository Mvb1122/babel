const { StartServer } = require('.');
const { Preload, PreloadTranscribe, Transcribe } = require('./VoiceV2');
const fs = require('fs');

module.exports = {
    /**
     * @param {boolean} [start=true] Whether to start the server. Should only be enabled for running Babel on it own.
     */
    bootup(start = true) {
        Preload().then(async () => {
            await PreloadTranscribe();
        
            const DemoEnabled = false;
        
            if (!DemoEnabled)  {
                await Transcribe("./Demo_Audio/de.wav");
                console.log("Ready!");
                if (start)
                    await StartServer();
            }
        
            else {
                const DemoAudioPath = "./Demo_Audio/";
                const paths = fs.readdirSync(DemoAudioPath);
                
                for (let j = 0; j < paths.length; j++) {
                    const f = paths[j];
        
                    for (let p = 0; p < 2; p++) {
                        let timeTaken = performance.now();
                        const x = await Transcribe(DemoAudioPath + f);
                        timeTaken = ((performance.now() - timeTaken)/1000).toFixed(2)
                        x.timeTaken = timeTaken;
                        console.log(x)
                    }
                }
            }
        })
    }
}