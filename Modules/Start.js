/*
params:
    None.
*/

const VoiceV2 = require("../VoiceV2");
const response = {
    successful: false
}

VoiceV2.Preload().then(v => {return v}).then(v => {
    res.statusCode = 200;
    res.setHeader("Content-Type", getMime("json"));
    res.end(JSON.stringify(response));
});
