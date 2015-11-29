/**
 * Created by Vincent on 13/11/2015.
 */
var models = require('../models');
var exec = require('child_process').exec;
var config = require("../configuration");
var downloadServerConfig = config.get('download_server');
var downloadStatusConfig = config.get('download_status');
var fromConfig = config.get('from');

var utils = {};

utils.moveDownload2 = function(downloadId, srcDirectoryId, destDirectoryId, downloadModel, downloadLogModel, logs, callback) {
    var command = 'ssh root@' + downloadServerConfig.address + ' ' + downloadServerConfig.move_command + ' ' + downloadId + ' ' + srcDirectoryId + ' ' + destDirectoryId;
    exec(command,
        function(error, stdout, stderr) {
            if (!error) {
                var begin = stdout.indexOf('#');
                var end = stdout.indexOf('#', begin + 1);
                var res = stdout.substring(begin + 1, end);

                var status = downloadStatusConfig.MOVED;
                var downloadDirectoryId = destDirectoryId;

                if (res != "OK") {
                    status = downloadStatusConfig.ERROR_MOVING;
                    downloadDirectoryId = srcDirectoryId;
                }

                logs += stdout;

                var param = {
                    status: status,
                    directory_id: downloadDirectoryId,
                    to_move_directory_id: null
                };

                callback(downloadModel, downloadLogModel, param, logs);
            } else {
                logs += stderr;

                var param = {
                    status: downloadStatusConfig.ERROR_MOVING,
                    directory_id: srcDirectoryId,
                    to_move_directory_id: null
                };

                callback(downloadModel, downloadLogModel, param, logs);
            }
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