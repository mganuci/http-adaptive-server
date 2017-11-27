var fs = require('fs'),
    nodeUtils = require('util');


function argCountIsValid() {
    return process.argv.length === 5 || process.argv.length === 6;
}

function portIsValid(port) {
    var asInt = parseInt(port);

    if(isNaN(asInt)) {
        console.log("Invalid port provided");
        return false;
    }

    if(port < 0 || port > 65535) {
        console.log("Illegal port provided");
        return false;
    }

    return true;
}

function argumentIsValid(path) {
    if(!pathExists(path)) {
        return false;;
    }

    if(!pathExists(path + "/config.json")) {
        console.log("Could not find config.json file");
        return false;
    }

    return true;
}


function configIsValid(path, cfg) {

    if(cfg.https !== undefined) {
        if(cfg.https.pfx !== undefined) {
            if(!pathExists(path + "/" + cfg.https.pfx)) {
                console.log("https.pfx needs to point to an existing file");
                return false;
            }
        }

        if(cfg.https.key !== undefined) {
            if(!pathExists(path + "/" + cfg.https.key)) {
                console.log("https.key needs to point to an existing file");
                return false;
            }

            if(cfg.https.cert !== undefined) {
                if(!pathExists(path + "/" + cfg.https.cert)) {
                    console.log("https.cert needs to point to an existing file");
                    return false;
                }
            }
        }

        if(cfg.https.pfx === undefined && cfg.https.key === undefined) {
            console.log("Invalid https configuration. Either https.pfx or https.key are required in the configuration.");
            return false;
        }
    }

    return(validateRouteResponseFiles(path, cfg));
}



function pathExists(path) {

    try {
        fs.accessSync(path, fs.F_OK);
        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
}

function validateRouteResponseFiles(path, cfg) {
    try {
        cfg.routes.forEach(function (route) {

            if('string' === typeof route.reply_with) {
                validateSingleStringReply(path, route.matching, route.reply_with);
            }

            if(nodeUtils.isArray(route.reply_with)) {
                route.reply_with.forEach(function(entry) {
                    validateSingleStringReply(path, route.matching, entry);
                });
            }
        });
    } catch(err) {
        return false;
    }

    return true;
}

function validateSingleStringReply(path, matching, replyWith) {
    if (!pathExists(path + "/" + replyWith)) {
        console.log("Could not find reply file for route " + matching);
        throw ("Could not find reply file for route " + matching);
    }
}


module.exports.argCountIsValid = argCountIsValid;
module.exports.argumentFolderIsValid = argumentIsValid;
module.exports.configIsValid = configIsValid;
module.exports.portIsValid = portIsValid;