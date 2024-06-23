const DEBUG = false;
const fs = require('fs');
const http = require('http');

const mimeTypes = {
    "txt": "text/plain",
    "html": "text/html",
    "gif": "image/gif",
    "ico": "image/x-icon",
    "json": "application/json",
    "mp3": "audio/mpeg",
    "mp4": "video/mp4",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "pdf": "application/pdf",
    "svg": "image/svg+xml",
    "wav": "audio/wav",
    "css": "text/css",
    "php": "text/html", // Note: php is declared as html content because the MTGA game dev website uses it as HTML for some reason.
    "avif": "image/avif",
    "webm": "video/webm",
    "js": "text/javascript"
}

const getMime = (s) => {
    for (const p in mimeTypes) {
        if (s.endsWith(p)) return mimeTypes[p];
    }
    return getMime("txt");
}

/**
 * Loads a file from the cache, or adds it to the cache if needed.
 * @param {String} url The path to read from, as relative to index.js
 * @returns {Buffer} The file
 */
function GetFileFromCache(url) {
    return fs.readFileSync(url);
}

// Returns the size of a file in Megabytes.
function GetFileSizeInMegabytes(url) {
    return fs.statSync(url).size / (1024*1024);
}

// Removes a JS object from the start of the string if it's there.
function RemovePrependedObject(string) {
    if (string.startsWith("{") && string.includes("}")) {
        string = string.substring(string.indexOf("}") + 1);
    }
    return string;
}

const DisallowedPatterns = [/\/\.git/]

/**
 * Checks if a path is okay to share.
 * @param {String} path The path to safety check.
 */
function PathIsSafe(path) {
    for (let i = 0; i < DisallowedPatterns.length; i++) {
        const Matches = path.match(DisallowedPatterns[i]);
        if (Matches != undefined) return false;
    }

    // Last check, if it's a .js file, look to see if it starts with a JSON object declaring a safety thing.
    if (path.includes(".js") && path.includes("/modules/")) {
        let data = String(GetFileFromCache(path));
        if (data.includes("{") && data.includes("}"))
            try {
                const json = JSON.parse(data.substring(0, data.indexOf("}") + 1));
                if (json.readable == false) return false;
            } catch (e) {
                // Nothing, continue and return true.
                if (e && DEBUG)
                    console.log(e);
            }
    }

    return true;
}

/**
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 * @returns {Promise<http.ServerResponse>}
 */
const requestListener = async function (req, res) {
    if (DEBUG) console.log("\n\nRequest Recieved: " + req.url);
    if (DEBUG) console.log(req.method);
    
    // If this request isn't for the main micahb.dev site, change the localURL to target that site's folder, but only if it exists.
    let host = "";
    if (req.headers.host != null) host = req.headers.host.toString().replace("www", "")
    let localURL = ""; 
    if (!host.includes("micahb.dev")) {
        let hostPath = `./${host}/`;
        if (fs.existsSync(hostPath))
            localURL = hostPath;
    };

    if (req.url.endsWith("/")) req.url += "index.html";


    // If this is an implied index.html request, forward the user to the actual page.
    if (req.url.indexOf(".") == -1 && !req.url.includes("&") && !req.url.endsWith("/")) 
    {
        res.setHeader("Location", req.url + '/');
        res.writeHead(301);
        return res.end();
    }
    if (req.url.startsWith('/'))
        localURL += '.' + req.url;
    else
        localURL += "./" + req.url;

    localURL = unescape(localURL);

    // Split off arguments, if they exist.
    let args = { };
    if (localURL.includes('?')) {
        args = parseQuery(localURL.substring(localURL.indexOf("?")));
        localURL = localURL.substring(0, localURL.indexOf("?"))
    }

    if (localURL.includes('&')) {
        args = parseQuery(localURL.substring(localURL.indexOf("&")));
        localURL = localURL.substring(0, localURL.indexOf("&"))
    }

    // Also, set the CORS policy so the www domain can also access stuff.
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    if (DEBUG) console.log("Request for LocalURL at " + localURL)        
        
        // GETTING:
    if (req.method === "GET") {
        const PathSafe = PathIsSafe(localURL);
        // Generally try to read any given file (that's not a directory), throw 404 if it doesn't work.
        if (fs.existsSync(localURL) && !fs.lstatSync(localURL).isDirectory() && PathSafe) {
            try {
                let mime = getMime(localURL);
                res.setHeader("Content-Type", mime);

                // Always set content size.
                var stats = fs.statSync(localURL)
                var fileSizeInBytes = stats.size;
                res.setHeader("Content-Length", fileSizeInBytes)

                // If this is an AI image file or YBN Note, tell the user's device to cache it; those images don't usually change very often.
                    // (Cache for 1 week.)
                if ((mime.includes("image") && localURL.includes("AI")) || localURL.includes(".excalidraw.json"))
                    res.setHeader("Cache-Control", "max-age=604800")

                // Cache requests for index files. Alternatively, the line to cache files smaller than 10MB is below..
                    // || GetFileSizeInMegabytes(localURL) < 10
                if (localURL.includes("index") || localURL.includes("favicon")) {
                    res.end(GetFileFromCache(localURL));
                } else if (args.compress) {
                    res.EndWithCompression(GetFileFromCache(localURL));
                } else {
                    let s = fs.createReadStream(localURL);
                    s.on('open', function () {
                        res.setHeader('Content-Type', mime);
                        s.pipe(res);
                    });
                }
            } catch (error) {
                res.setHeader("Content-Type", "text/plain");
                res.statusCode = 404;
                res.end("Not found, Local URL: " + localURL + "\nError Code:\n" + error);
            }
        } else {
            if (!PathSafe) {
                res.setHeader("Content-Type", "text/plain");
                res.statusCode = 401;
                res.end("You are not authorized to read local URL: " + localURL);
            } else {
                res.setHeader("Content-Type", "text/plain");
                res.statusCode = 404;
                res.end("Not found, Local URL: " + localURL);
            }
        }

        // POSTING:
    } else if (req.method === "POST") {
        // Asynchronously download data.
        var binary_data = [];
            // This runs asynchronously... 
        req.on('data', function(chunk) {
            binary_data.push(chunk);
        });

        // Ascertain a modules request and process it the better way.
        // Only run this if the file is a .js file and in a post_modules directory.
        if (req.url.toLowerCase().includes("post_modules")) {
            if (DEBUG) console.log(`Post_Modules request for ${localURL}`);
            if (fs.existsSync(localURL))
            {    
                req.on('end', () => {
                    let data; 
                    if (!req.url.includes("Upload.js")) {
                        data = Buffer.concat(binary_data).toString();
                        if (DEBUG) console.log("Input: `" + data + "`");
                    } else {
                        data = Buffer.concat(binary_data);
                    }

                    // Because stuff can sometimes get a bit funky, allow post modules to use async/await.
                        // Also cache them to make stuff go faster.
                    try {
                        const file = RemovePrependedObject(GetFileFromCache(localURL).toString());
                        if (localURL.endsWith(".js")) {
                            eval(`async function f() {${file}} f();`);
                        } else {
                            res.statusCode = 403;
                            res.setHeader("Content-Type", "application/json");
                            return res.end(JSON.stringify({
                                sucessful: false,
                                reason: "You are not authorized to write to this location."
                            }));
                        }
                    } catch (err) {
                        if (DEBUG) console.log(err);
                    }
                })
            } else {
                res.statusCode = 404;
                res.setHeader("Content-Type", "text/plain");
                res.end("Module Not Found!");
            }
        }
        else {
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/plain");
            res.end("Endpoint Not Found!");
        }
    }
};

const host = 'localhost' // require('os').hostname();
const port = 8080;

function StartServer() {
    const server = http.createServer(requestListener);
    server.listen(port, host, () => {
        console.log(`Server is running on http://${host}:${port}`);
    });
}

function parseQuery(queryString) {
    var query = {};
    var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (var i = 0; i < pairs.length; i++) {
        try {
            var pair = pairs[i].split('=');
            query[decodeURIComponent(pair[0])] = DecodeUTF8(pair[1]);
        } catch (error) {
            if (DEBUG) {
                console.log("Pair: [" + pair[0] + "," + pair[1] + "]")
                console.log(error)
            }
        }
    }
    return query;
}

// Efficiently wipe temp directory on boot.
if (!DEBUG) {
    const fp = require('fs/promises');
    fs.readdirSync("./Temp/").forEach(f => fp.unlink(`./Temp/${f}`));
}

const global = {
    decoders: {}
};

module.exports = { GetFileFromCache, GetFileSizeInMegabytes, getMime, DEBUG, global }

// If we're not in debug mode, ignore all errors. 
if (!DEBUG) 
    process.on('uncaughtException', function (err) {
        console.log('Caught exception: ');
        console.log(err);
    });

// Preload on server boot!
const { Preload, PreloadTranscribe, Transcribe } = require('./VoiceV2');
Preload().then(async () => {
    await PreloadTranscribe();

    const DemoEnabled = false;

    if (!DemoEnabled) return Transcribe("./Demo_Audio/de.wav").then(() => {
        StartServer();
        console.log("Ready!");
    });

    const DemoAudioPath = "./Demo_Audio/";
    const paths = fs.readdirSync(DemoAudioPath);
    
    for (let i = 0; i < 10; i++)
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
})