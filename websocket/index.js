/**
 * Created by Vincent on 31/08/2015.
 */
var autobahn = require('autobahn');
var config = require("../configuration");

var websocketConfig  = config.get('notification');
var sessionWebsocket = {};

var connection = new  autobahn.Connection({
   url: websocketConfig.address,
    realm: websocketConfig.realm
});
sessionWebsocket.connection = connection;

connection.onopen = function(session) {
    console.log("Connexion websocket OK");
    sessionWebsocket.session = session;
};

connection.onclose = function(reason, details) {
    console.log("Connexion websocket fermée, raison: " + reason + ", details: " + details.reason + " " + details.message);
};

if (websocketConfig.activated && !connection.isOpen) {
    connection.open();
}

module.exports = sessionWebsocket;