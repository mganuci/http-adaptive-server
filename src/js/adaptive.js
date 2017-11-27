/**
 * Simple HTTP file server
 *
 * - needs the following argument sequence
 *    * a string with a name of the server it replaces
 *    * the port to start on
 *    * a folder containing the routes and configuration file
 *    * optional callback URL that will be called once the server fully started
 *
 * - the folder needs to contain a file called config.json. This is where all the configuration is stored.
 * Configuration file contains configured routes
 * - matching is done in the order from top to down. If the url matches one file, then this is used, no further
 * matches are attempted
 * - the configuration file is monitored and reloaded upon change
 * - routes can support sequences of responses. When calling multiple times, the sequence of response will follow the
 * entries defined in reply_with array. The first invocation will respond with the first configured file, the second
 * invocation will provide the second configured file and so on. When reaching the end of the reply_with path only
 * the last reponse will be provided.
 *
 */

const VERSION = "20170424";

var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    url = require('url'),
    util = require('./util'),
    nodeUtil = require('util'),
    admin = require('./control-routes'),
    calls = require('./calls'),
    responseProvider = require('./response-provider'),
    validator = require('./validation');


if(!validator.argCountIsValid()) {
    util.printUsage();
    return false;
}

//
// node adaptive.js Jenkins 8081 ./config-folders/jenkins
//
var impersonating = process.argv[2];
var port = process.argv[3];
var targetPath  = process.argv[4];
var callbackURL = undefined;

if(process.argv.length === 6) {
    callbackURL = process.argv[5];
}

if(!validator.portIsValid(port)) {
    process.exit(1);
}

if(!validateInputs(targetPath)) {
    console.log("Invalid inputs");
    process.exit(1);
}

var cfg = load(targetPath + "/config.json");

addChangeListener(targetPath + "/config.json", function() {
    cfg = load(targetPath + "/config.json");
});


printStartupMessage(impersonating, port, targetPath, cfg);
admin.setAdvertisingInfo(impersonating);


try {
    var server = util.createServer(targetPath, cfg, handleRequest);

    if(!nodeUtil.isNullOrUndefined(callbackURL)) {
        util.httpCall(callbackURL);
    }

} catch(err) {
    console.log(err);
    console.log("Could not create http/https server");
    process.exit(1);
}

server.on('error', function(error) {
    console.log('An error occurred on server ' + error + '. Exiting,');
    process.exit(1);
});

server.listen(port, function () {
    console.log("Server listening on: " + (nodeUtil.isNullOrUndefined(cfg.https) ? "http" : "https") + "://localhost:%s", port);
});

function handleRequest(request, response) {

    var routeTreated = treatControlRoute(request, response);

    // Now try the configure "business" routes
    if (routeTreated === false) {
        var matched = false;

        cfg.routes.forEach(function (route) {

            if (matched) {
                return;
            }

            var re = new RegExp(route.matching);
            if (re.test(request.url)) {

                if(methodMatch(route.method, request.method)) {
                    util.getBody(request).then(function(body) {

                        const reply = responseProvider.getReply(route, targetPath);

                        response.writeHead(reply.code, reply.contentType);
                        response.end(reply.body);

                        // Log the REST call along with fully parsed body for future reference
                        calls.append(request, body);

                    }).catch(function(err) {
                        console.error(err);
                    });

                    // console.log(request.url + " matched " + route.matching);
                    matched = true;

                } else {
                    nodeUtil.debug("Matched by " + request.url + ", skipped by configured method");
                }
            }
        });

        if (matched === false) {
            console.log('No match ' + request.url);
            response.writeHead(404);
            response.end();
        }
    }
}

function methodMatch(configuredMethod, requestMethod) {
    if(nodeUtil.isNullOrUndefined(configuredMethod)) {
        return true;
    }

    return configuredMethod.toLowerCase() === requestMethod.toLowerCase();
}

/**
 * Changing the configuration file will cause it to get reloaded from disk
 * @param file
 * @param callback
 */
function addChangeListener(file, callback) {
    var decomposed = path.parse(file);
    fs.watch(file, function(event, fileName) {
        if(event === 'change' && fileName === decomposed.base) {
            callback();
        }
    });
}

/**
 * Loads the file content from disk
 * @param path
 */
function load(path) {
    return JSON.parse(fs.readFileSync(path));
}

function printStartupMessage(impersonating, port, targetPath, cfg) {

    console.log(["Starting up phony", impersonating, "server", VERSION].join(' '));
    console.log("::: using folder " + targetPath);
    console.log("::: listening on " + port);

    console.log("::: Administration Routes");
    admin.control.routes.forEach(function(route) {
        console.log("  " + route.sample + " - " + route.description);
    });

    console.log("::: Configured Routes");
    cfg.routes.forEach(function(route) {
        if (nodeUtil.isNullOrUndefined(route.reply_with)) {
            console.log(`Warning: Invalid route definition. Expected field reply_with. Route: ${route.matching} will be ignored`);
        } else {
            console.log("  route: "
                + (nodeUtil.isNullOrUndefined(route.method) ? "" : route.method.toUpperCase()) + " "
                + route.matching + " -> " + route.reply_with
                + (nodeUtil.isNullOrUndefined(route.code) ? "" : ", code: " + route.code)
            );
        }
    });

    console.log("");
}

function validateInputs(targetPath) {

    if(!validator.argumentFolderIsValid(targetPath)) {
        return false;
    }

    var localCfg = load(targetPath + "/config.json");


    if(!validator.configIsValid(targetPath, localCfg)) {
        console.log("Configuration is not valid");
        return false;
    }

    return true;
}

function treatControlRoute(request, response) {

    // First try to match against control routes

    var controlRoute = false;
    admin.control.routes.forEach(function (aRoute) {
        if (aRoute.matching.test(request.url)) {

            util.getBody(request).then(function(body) {
                aRoute.handler(response, body);
            }).catch(function(err) {
                console.log(err);
                return;
            });

            controlRoute = true;
        }
    });

    return controlRoute;
}