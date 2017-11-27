const responseProvider = require('./response-provider');

const CONTROL_ROUTES = {
        routes : [
            {
                'matching' : /^\/alive$/,
                'handler' : alive,
                'sample' : '/alive',
                'description' : 'URL to check if the server is alive'
            },

            {
                'matching' : /^\/stop$/,
                'handler' : stopServer,
                'sample' : '/stop',
                'description' : 'Stops the Adaptive HTTP Server'
            },

            {
                'matching' : /^\/calls$/,
                'handler' : getCalls,
                'sample' : '/calls',
                'description' : 'Retrieves the REST call history. This call supports filtering by path equal to value.'
            },

            {
                'matching' : /^\/calls\/count$/,
                'handler' : getCallsCount,
                'sample' : '/calls/count',
                'description' : 'Retrieves the number of REST calls since the last reset or from the start'
            },

            {
                'matching' : /^\/calls\/reset$/,
                'handler' : resetCalls,
                'sample' : '/calls/reset',
                'description' : 'Resets the REST call history.'
            }
        ]
};

var util = require('./util'),
    calls = require('./calls');

var impersonating = "N/A";

function stopServer(response) {
    console.log("stopping server");
    response.end("Stopping Server");
    process.exit(0);
}

function alive(response) {
    response.writeHead(200);
    response.end(impersonating);
}

function getCalls(response, body) {
    response.writeHead(200, {'content-type' : 'application/json'});

    var filter = util.getFilter(body);

    if(filter !== undefined) {
        var subset = calls.query(filter.path, filter.value);

        if(subset !== undefined) {
            response.end(JSON.stringify(subset));
            return;
        } else {
            console.log("No matching");
        }
    }

    response.end(JSON.stringify(calls.all()));
}

function getCallsCount(response) {
    response.end(JSON.stringify(calls.all().length));
}

function resetCalls(response) {
    calls.reset();
    responseProvider.reset();
    response.end("Calls were reset");
}

function setInfo(v) {
    impersonating = v;
}

module.exports.control = CONTROL_ROUTES;
module.exports.setAdvertisingInfo = setInfo;