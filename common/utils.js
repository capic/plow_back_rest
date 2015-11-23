/**
 * Created by Vincent on 13/11/2015.
 */
var exec = require('child_process').exec;
var config = require("../configuration");
var downloadServerConfig = config.get('download_server');
var downloadStatusConfig = config.get('download_status');

var utils = {};

var move = function (oldDirectory, newDirectory, logs, downloadModel, downloadLogsModel, downloadDirectoryModel, callback) {
    var command = 'ssh root@' + downloadServerConfig.address + ' mv ' + oldDirectory + name + ' ' + newDirectory;
    var execMoveFile = exec(command);

    // pas d'erreur de deplacement
    execMoveFile.stdout.on('data',
        function (data) {
            var param = {
                directory_id: downloadDirectoryModel.id,
                download_directory: downloadDirectoryModel,
                status: downloadStatusConfig.MOVED
            };
            logs += "Moving to " + newDirectory + " OK !!!\r\n";
            logs += data + "\r\n";
            callback(downloadModel, downloadLogsModel, downloadDirectoryModel, param, logs);
        }
    );

    execMoveFile.stderr.on('data',
        function (data) {
            // même si ça s'est bien passé on peut avoir cette erreur donc on considere que c'est ok
            if (data == "ln: failed to create symbolic link `/dev/fd/fd': No such file or directory\n") {
                var param = {
                    directory_id: downloadDirectoryModel.id,
                    download_directory: downloadDirectoryModel,
                    status: downloadStatusConfig.MOVED
                };
                logs += "Moving to " + newDirectory + " OK !!!\r\n";
            } else {
                var param = {status: downloadStatusConfig.ERROR_MOVING};
                logs += "Moving to " + newDirectory + " ERROR !!!\r\n";
            }
            logs += data + "\r\n";
            callback(downloadModel, downloadLogsModel, downloadDirectoryModel, param, logs);
        }
    );
};

utils.moveDownload = function (logs, downloadModel, downloadLogsModel, downloadDirectoryModel, callback) {
    var oldDirectory = downloadModel.download_directory.path.replace(/\s/g, "\\\\ ");
    var newDirectory = downloadDirectoryModel.path.replace(/\s/g, "\\\\ ");
    var name = downloadModel.name.replace(/\s/g, "\\\\ ");

    // on teste l'existence du fichier
    var command = 'ssh root@' + downloadServerConfig.address + ' test -f "' + oldDirectory + name + '" && echo true || echo false';
    var execFileExists = exec(command);

    // pas d'erreur
    execFileExists.stdout.on('data',
        function (data) {
            // si le fichier existe
            if (data == "true\n") {
                move(oldDirectory, newDirectory, logs, downloadModel, downloadLogsModel, downloadDirectoryModel, callback);
            }
        }
    );

    execFileExists.stderr.on('data',
        function (data) {
            if (data == "ln: failed to create symbolic link `/dev/fd/fd': No such file or directory\n") {
                move(oldDirectory, newDirectory, logs, downloadModel, downloadLogsModel, downloadDirectoryModel, callback);
            } else {
                var param = {status: downloadStatusConfig.ERROR_MOVING};
                logs += "Moving to " + newDirectory + " ERROR => file exists check error !!!\r\n";
                logs += data + "\r\n";
                callback(downloadModel, downloadLogsModel, downloadDirectoryModel, param, logs);
            }
        }
    );
};

module.exports = utils;