/**
 * Created by Vincent on 31/08/2015.
 */
var autobahn = require('autobahn');

var sessionWebsocket = {};

var websocket = new  autobahn.Connection({
   url: 'ws://capic.hd.free.fr:8181/ws',
    realm: 'realm1'
});

websocket.onopen = function(session) {
    sessionWebsocket.session = session;
};

websocket.open();

module.exports = sessionWebsocket;