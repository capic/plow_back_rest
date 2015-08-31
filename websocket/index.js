/**
 * Created by Vincent on 31/08/2015.
 */
var websocket = new  autobahn.Connection({
   url: 'ws://capic.hd.free.fr:8181/ws',
    realm: 'realm1'
});

connection.onopen = function(session) {
    console.log('onopen');
};

connection.open();

module.export = connection;