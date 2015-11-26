/**
 * Created by Vincent on 13/11/2015.
 */
var exec = require('child_process').exec;
var config = require("../configuration");
var downloadServerConfig = config.get('download_server');
var downloadStatusConfig = config.get('download_status');
var fromConfig = config.get('from');

var utils = {};

var move = function (oldDirectory, newDirectory, name, logs, downloadModel, downloadLogsModel, downloadDirectoryModel, callback) {
    var command = 'ssh root@' + downloadServerConfig.address + ' mv ' + oldDirectory + name + ' ' + newDirectory;
    var execMoveFile = exec(command,
        function(error, stdout, stderr) {
            if (error == null) {
                var param = {
                    directory_id: downloadDirectoryModel.id,
                    download_directory: downloadDirectoryModel,
                    old_download_directory: downloadMode.directory_id,
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

            logs += data + "\r\n";
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
    var execFileExists = exec(command);

    // pas d'erreur
    execFileExists.stdout.on('data',
        function (data) {
            // si le fichier existe
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
                logs += data + '\r\n';
                callback(downloadModel, downloadLogsModel, downloadDirectoryModel, param, logs);
            }
        }
    );

    execFileExists.stderr.on('data',
        function (data) {
            if (data == "ln: failed to create symbolic link `/dev/fd/fd': No such file or directory\n") {
                logs += "Error in file exists but the file really exists\r\n";
                logs += data + "\r\n";
                move(oldDirectory, newDirectory, name, logs, downloadModel, downloadLogsModel, downloadDirectoryModel, callback);
            } else {
                var param = {
                    status: downloadStatusConfig.ERROR_MOVING,
                    directory_id: downloadModel.old_directory_id,
                    old_directory_id: downloadModel.directory_id
                };
                logs += "File " + oldDirectory + name + " ERROR => file exists check error !!!\r\n";
                logs += data + "\r\n";
                callback(downloadModel, downloadLogsModel, downloadDirectoryModel, param, logs);
            }
        }
    );
};

module.exports = utils;