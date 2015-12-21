/**
 * Created by Vincent on 13/11/2015.
 */
var models = require('../models');
var exec = require('child_process').exec;
var config = require("../configuration");
var downloadServerConfig = config.get('download_server');

var utils = {};

utils.moveDownload2 = function(downloadId, num) {
    var command = 'ssh root@' + downloadServerConfig.address + ' ' + downloadServerConfig.move_command + ' ' + downloadId + ' ' + num;
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

module.exports = utils;