module.exports.append = appendCall;
module.exports.query = queryCalls;
module.exports.all = allCalls;
module.exports.reset = resetCalls;

var util = require('./util');

var calls = [];

function appendCall(request, fullBody) {
    var clientCall = util.createCallFromRequest(request);
    clientCall.body = fullBody;
    calls.push(clientCall);
}

function allCalls() {
    return calls.slice(0);
}

function resetCalls() {
    calls = [];
}

function queryCalls(filterPath, filterValue) {
    return util.search(calls, filterPath, filterValue);
}

