module.exports.getContentType = contentType;
module.exports.createCallFromRequest = getCall;
module.exports.getFilter = getFilterQuery;
module.exports.search = searchArray;
module.exports.getBody = getBody;
module.exports.createServer = createServer;
module.exports.httpCall = httpCall;
module.exports.printUsage = printUsage;

var path = require('path'),
    url = require('url'),
    fs = require('fs'),
    http = require('http'),
    https = require('https');


function getBody(request) {

    return new Promise(function(resolve, reject) {
        var body = [];
        request.on('error', function(err) {
            console.error(err);
            reject(err);
        }).on('data', function(chunk) {
            body.push(chunk);
        }).on('end', function() {
            body = Buffer.concat(body).toString();
            resolve(body);
        });
    });
}

function contentType(replyWith) {
    var decomposed = path.parse(replyWith);
    if(decomposed.ext === ".json") {
        return "application/json";
    }

    if(decomposed.ext === ".xml") {
        return "application/xml";
    }

    return "text";
}

function getCall(request) {
    return {
        when : Date.now(),
        method : request.method,
        url : request.url,
        headers : request.headers
    };
}

function getFilterQuery(body) {
    try {
        var bodyAsJson = JSON.parse(body);
        if (bodyAsJson.filter !== undefined) {
            var filter = bodyAsJson.filter;

            if(filter.path !== undefined && filter.value !== undefined) {
                return filter;
            }
        }
    } catch(err) {
        // Not suitable body perhaps, no filter then
    }
}



function searchArray(array, path, value) {
    var result = [];

    for (var index in array) {
        if (array.hasOwnProperty(index)) {
            var elm = array[index];
            var elemSearch = composePath(elm, path);
            if (elemSearch && elemSearch.toString() === value) {
                result.push(elm);
            }
        }

    }
    return result;
}

function composePath(element, path) {
    if (!path) {
        return element;
    }
    if (path instanceof Array) {
        var compose = element;
        for (var index in path) {
            if (path.hasOwnProperty(index) && compose) {
                compose = compose[path[index]];
            }
        }
        return compose;
    } else {
        return element[path];
    }
}

function createServer(path, cfg, requestHandlerFn) {
    if(cfg.https === undefined) {
        return http.createServer(requestHandlerFn);
    }

    var options = {};

    if(cfg.https.passphrase !== undefined) {
        options.passphrase = cfg.https.passphrase;
    }

    if(cfg.https.pfx) {
        options.pfx = fs.readFileSync(path + "/" + cfg.https.pfx);
        return https.createServer(options, requestHandlerFn);
    }

    if(cfg.https.key !== undefined) {
        options.key = fs.readFileSync(path + "/" + cfg.https.key);
        options.cert = fs.readFileSync(path + "/" + cfg.https.cert);

        return https.createServer(options, requestHandlerFn);
    }

    throw Error("Invalid https setup in config.json file");
}

function httpCall(callbackUrl) {
    var url = require('url');

    try {
        var parsed = url.parse(callbackUrl);

        var options = {
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname
        };

        var http = require('http');

        if(parsed.protocol === 'https:') {
            options.rejectUnauthorized = false;
            http = require('https');
        }

        var request = http.request(options);

        request.on('error', function(err) {
            //console.log(err);
            console.log("Callback url not available " + callbackUrl);
        });

        request.end();
        console.log("Done calling back at " + callbackUrl);
    } catch(err) {
        console.log(err);
        // no biggie
    }
}

function printUsage() {
    //
    // Example of invocation:
    // node adaptive.js Jenkins 8081 ./config-folders/jenkins
    //
    console.log("Usage: node adaptive.js impersonating port config_folder [callbackURL]");
    console.log("Where");
    console.log("impersonating - a text describing the name of the server it replaces (GIT, Jenkins, Artifactor)");
    console.log("port - the port to start the adaptive server on");
    console.log("config-folder contains route file responses and config.json");
    console.log("callbackURL optional URL which can be invoked by the adaptive when is fully up and running");
}