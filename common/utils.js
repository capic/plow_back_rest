/**
 * Created by Vincent on 13/11/2015.
 */
var models = require('../models');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
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

utils.urlFiltersParametersTreatment = function(queryParameters, relationsList) {
    var tabQuery = [];
    var params = {};
    for (var prop in queryParameters) {
        var elValue = parameterTypeTreatment(queryParameters[prop]);
        if (elValue != null) {
            var tabOperator = prop.split("$");
            if (tabOperator.length > 1) {
                var tabOperatorNum = tabOperator[1].split("µ");
                if (tabOperatorNum[0] == "or") {
                    var p = {};
                    p[tabOperator[0]] = elValue;

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
                if (prop.indexOf('.') > -1) {
                    includeTreatment(queryParameters, prop, elValue, relationsList);
                } else {
                    params[prop] = elValue;
                }
            }
        }
    }

    tabQuery.forEach(function(el){
        var k = Object.keys(el);
        params[k[0]] = el[k[0]];
    });

    return params;
};

var includeTreatment = function(queryParameters, prop, elValue, relationsList) {
    var found = false;
    var i = 0;
    while (i < relationsList.length && !found) {
        var tabRelations = prop.split('.');

        if (Array.isArray(relationsList[i])) {
            return includeTreatment(queryParameters, prop, elValue, relationsList[i]);
        } else {
            if (relationsList[i].as == tabRelations[0]) {
                found = true;
                var whereObject = {};
                whereObject[tabRelations[1]] = elValue;
                relationsList[i].where = whereObject;
            }
        }
        i++;
    }
};

var parameterTypeTreatment = function(param) {
    var ret = null;

    if (param == 'true' || param == 'false') {
        ret = (param === 'true');
    }

    return ret;
};

utils.executeAction = function(objectId, actionId, actionTargetId) {
    try {
        var execAction = spawn('ssh', ['root@' + downloadServerConfig.address, downloadServerConfig.action_command, objectId, actionId, actionTargetId]);

        execAction.stdout.on('data',
            function (data) {
                console.log(data.toString());
            }
        );
        execAction.stderr.on('data',
            function (data) {
                console.log(data.toString());
            }
        );
        execAction.on('error', function (err) {
            //console.log('Failed to start child process.' + err);
        });
        execAction.on('close', function (code) {
            //console.log('child process exited with code ' + code);
        });
    } catch (ex) {
        console.log(ex);
    }
};

module.exports = utils;