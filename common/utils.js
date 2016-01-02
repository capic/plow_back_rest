/**
 * Created by Vincent on 13/11/2015.
 */
var models = require('../models');
var exec = require('child_process').exec;
var config = require("../configuration");
var downloadServerConfig = config.get('download_server');

var utils = {};

utils.moveDownload2 = function(downloadId, action_id) {
    var command = 'ssh root@' + downloadServerConfig.address + ' ' + downloadServerConfig.move_command + ' ' + downloadId + ' ' + action_id;
    var execMove = exec(command);
    execMove.stdout.on('data',
        function(data) {
        }
    );
    execMove.stdout.on('data',
        function(data) {

        }
    );
};

utils.insertOrUpdateLog = function(id, downLogsObject, websocket, res) {
    models.sequelize.query('INSERT INTO download_logs (id, logs) ' +
        'VALUES (:id, :logs) ON DUPLICATE KEY UPDATE id=:id, logs=concat(ifnull(logs,""), :logs)',
        {
            replacements: {
                id: id,
                logs: downLogsObject.logs
            },
            type: models.sequelize.QueryTypes.UPSERT
        }).then(function () {
            models.DownloadLogs.findById(id)
                .then(function (downloadLogsModel) {
                    if (websocket.connection.isOpen) {
                        websocket.session.publish('plow.downloads.logs.' + downloadLogsModel.id, [downloadLogsModel], {}, {acknowledge: false});
                    }

                    if (res) {
                        res.json(downloadLogsModel)
                    }
                }
            );
        });
};

utils.urlFiltersParametersTreatment = function(queryParameters) {
    var tabQuery = [];
    var params = {};
    for (var prop in queryParameters) {
        var tabOperator = prop.split("$");
        if (tabOperator.length > 1) {
            var tabOperatorNum = tabOperator[1].split("µ");
            if (tabOperatorNum[0] == "or") {
                var p = {};
                p[tabOperator[0]] = queryParameters[prop];

                if (tabQuery.hasOwnProperty(tabOperatorNum[1])) {
                    tabQuery[tabOperatorNum[1]]['$or'].push(p);
                } else {
                    var op = {};
                    op['$or'] = new Array();
                    op['$or'].push(p);
                    tabQuery[tabOperatorNum[1]] = op;
                }
            }
        } else {
            params[prop] = queryParameters[prop];
        }
    }

    tabQuery.forEach(function(el){
        var k = Object.keys(el);
        params[k[0]] = el[k[0]];
    });

    return params;
};

module.exports = utils;