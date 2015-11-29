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

var move = function (oldDirectory, newDirectory, name, logs, downloadModel, downloadLogsModel, downloadDirectoryModel, callback) {
    var command = 'ssh root@' + downloadServerConfig.address + ' mv ' + oldDirectory + name + ' ' + newDirectory;
    exec(command,
        function(error, stdout, stderr) {
            if (error == null) {
                var param = {
                    directory_id: downloadDirectoryModel.id,
                    download_directory: downloadDirectoryModel,
                    old_directory_id: downloadModel.directory_id,
                    status: downloadStatusConfig.MOVED
                };
                logs += "Moving from " + oldDirectory + " to " + newDirectory + " OK !!!\r\n";
            } else {
                // meme si tout s'est bien passe on peut avoir cette erreur donc on considere que c'est ok
                if (stdout == "ln: failed to create symbolic link `/dev/fd/fd': No such file or directory\n") {
                    var param = {
                        directory_id: downloadDirectoryModel.id,
                        download_directory: downloadDirectoryModel,
                        status: downloadStatusConfig.MOVED
                    };
                    logs += "Moving from " + oldDirectory + " to " + newDirectory + " OK !!!\r\n";
                } else {
                    var param = {
                        status: downloadStatusConfig.ERROR_MOVING,
                        directory_id: downloadModel.old_directory_id,
                        old_directory_id: downloadModel.directory_id
                    };
                    logs += "Moving from " + oldDirectory + " to " + newDirectory + " ERROR !!!\r\n";
                }
            }

            logs += stdout + "\r\n";
            callback(downloadModel, downloadLogsModel, downloadDirectoryModel, param, logs);
        }
    );
};

utils.moveDownload = function (logs, downloadObject, downloadModel, downloadLogsModel, downloadDirectoryModel, callback) {
    var oldDirectory = downloadModel.download_directory.path.replace(/\s/g, "\\\\ ");
    var newDirectory = downloadDirectoryModel.path.replace(/\s/g, "\\\\ ");

    if (downloadObject.from == fromConfig.PYTHON_CLIENT) {
        oldDirectory = downloadModel.old_download_directory.path.replace(/\s/g, "\\\\ ");
        newDirectory = downloadModel.download_directory.path.replace(/\s/g, "\\\\ ");
    }
    var name = downloadModel.name.replace(/\s/g, "\\\\ ");

    // on teste l'existence du fichier
    var command = 'ssh root@' + downloadServerConfig.address + ' test -f "' + oldDirectory + name + '" && echo true || echo false';
    exec(command,
        function(error, stdout, stderr) {
            if (!error) {
                // si le fichier existe
                if (stdout == "true\n") {
                    logs += "File exists\r\n";
                    move(oldDirectory, newDirectory, name, logs, downloadModel, downloadLogsModel, downloadDirectoryModel, callback);
                } else {
                    var param = {
                        status: downloadStatusConfig.ERROR_MOVING,
                        directory_id: downloadModel.old_directory_id,
                        old_directory_id: downloadModel.directory_id
                    };
                    logs += "File does not exist\r\n";
                    logs += stdout + '\r\n';
                    callback(downloadModel, downloadLogsModel, downloadDirectoryModel, param, logs);
                }
            } else {
                if (stdout == "ln: failed to create symbolic link `/dev/fd/fd': No such file or directory\n") {
                    logs += "Error in file exists but the file really exists\r\n";

                    if (data == "true\n") {
                        logs += "File exists\r\n";
                        move(oldDirectory, newDirectory, name, logs, downloadModel, downloadLogsModel, downloadDirectoryModel, callback);
                    } else {
                        var param = {
                            status: downloadStatusConfig.ERROR_MOVING,
                            directory_id: downloadModel.old_directory_id,
                            old_directory_id: downloadModel.directory_id
                        };
                        logs += "File does not exist\r\n";
                        logs += stdout + '\r\n';
                        callback(downloadModel, downloadLogsModel, downloadDirectoryModel, param, logs);
                    }
                } else {
                    var param = {
                        status: downloadStatusConfig.ERROR_MOVING,
                        directory_id: downloadModel.old_directory_id,
                        old_directory_id: downloadModel.directory_id
                    };
                    logs += "File " + oldDirectory + name + " ERROR => file exists check error !!!\r\n";
                    logs += stdout + "\r\n";
                    callback(downloadModel, downloadLogsModel, downloadDirectoryModel, param, logs);
                }
            }
        }
    );
};

utils.moveDownload2 = function(downloadId, directoryId, downloadModel, downloadLogModel, logs, callback) {
    var command = 'ssh root@' + downloadServerConfig.address + ' ' + downloadServerConfig.move_command + ' ' + downloadId + ' ' + directoryId;
    exec(command,
        function(error, stdout, stderr) {
            if (!error) {
                var begin = stdout.indexOf('#');
                var end = stdout.indexOf('#', begin);
                var res = stdout.substring(begin, end);

                var status = downloadStatusConfig.MOVED;
                //var directory_id = directoryId;
                //var old_directory_id= downloadModel.directory_id;

                if (res != "OK") {
                    status = downloadStatusConfig.ERROR_MOVING;
                }

                var param = {
                    status: status
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