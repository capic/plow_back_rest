/**
 * Created by Vincent on 31/08/2015.
 */
var autobahn = require('autobahn');
var config = require("../configuration");

var websocketConfig  = config.get('notification');
var sessionWebsocket = {};

var connection = new  autobahn.Connection({
   url: 'ws://capic.hd.free.fr:8181/ws',
    realm: 'realm1'
});
sessionWebsocket.connection = connection;

connection.onopen = function(session) {
    console.log("Connexion websocket OK");
    sessionWebsocket.session = session;
};

connection.onclose = function(reason, details) {
    console.log("Connexion websocket ferm�e, raison: " + reason + ", details: " + details.reason + " " + details.message);
}

if (websocketConfig.activated && !connection.isOpen) {
    connection.open();
}

module.exports = sessionWebsocket;