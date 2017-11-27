const fs = require('fs'),
    nodeUtil = require('util'),
    util = require('./util');

const invocationArchive = [];

function getReply(route, targetPath) {
    const response = {};
    response.code = nodeUtil.isNullOrUndefined(route.code) ? 200 : route.code;
    const replyWithString = getReplyWith(route);
    response.contentType = util.getContentType(replyWithString);
    response.body = fs.readFileSync(targetPath + '/' + replyWithString, {encoding: "UTF-8"});

    recordInvocation(route);

    return response;
}

function getReplyWith(route) {
    if('string' === typeof route.reply_with) {
        return route.reply_with;
    }

    const entries = route.reply_with;
    const count = getInvocationCount(route);

    if(count < entries.length) {
        return entries[count];
    } else {
        return entries[entries.length - 1];
    }
}

function getInvocationCount(route) {
    const routeEntry = getRouteEntry(route);

    if(routeEntry.length === 0) {
        return 0;
    }

    if(routeEntry.length > 1) {
        throw Error(['Illegal invocation archive on route ', JSON.stringify(route)].join(''));
    }

    return routeEntry[0].hits;
}

function getRouteEntry(route) {
    return invocationArchive.filter(function(item) {
        return item.route === route;
    });
}

function recordInvocation(route) {
    const existing = getRouteEntry(route);
    if(existing.length === 0) {
        invocationArchive.push({
           route : route,
           hits : 1
        });
    } else {
        existing[0].hits = existing[0].hits + 1;
    }
}

function reset() {
    invocationArchive.splice(0, invocationArchive.length);
}

module.exports.getReply = getReply;
module.exports.reset = reset;