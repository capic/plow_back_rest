/**
 * Created by Vincent on 31/08/2015.
 */
var autobahn = require('autobahn');

var sessionWebsocket = {};

var connection = new  autobahn.Connection({
   url: 'ws://capic.hd.free.fr:8181/ws',
    realm: 'realm1'
});
sessionWebsocket.connection = connection;

connection.onopen = function(session) {
    sessionWebsocket.session = session;
};

connection.open();

module.exports = sessionWebsocket;