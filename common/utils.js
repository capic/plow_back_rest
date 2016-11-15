/**
 * Created by Vincent on 13/11/2015.
 */
var models = require('../models');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var config = require("../configuration");
var downloadServerConfig = config.get('download_server');

var utils = {};

var sequelizeParameterTreatment = function(prop, queryParameters, queryOptions) {
    if (prop == "_limit") {
        queryOptions['limit'] = parseInt(queryParameters[prop], 10);
    } else if (prop == "_offset") {
        queryOptions['offset'] = parseInt(queryParameters[prop], 10);
    }
};

var queryParameterTreatment = function (prop, queryParameters, elValue, relationsList, tabQuery, params) {
    var tabOperator = prop.split("$");
    if (tabOperator.length > 1) {
        var tabOperatorNum = tabOperator[1].split("µ");
        if (tabOperatorNum[0] == "or") {
            var p = {};
            p[tabOperator[0]] = elValue;

            if (Object.prototype.hasOwnProperty.call(tabQuery, tabOperatorNum[1])) {
                tabQuery[tabOperatorNum[1]]['$or'].push(p);
            } else {
                var op = {};
                op['$or'] = [];
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
};

var includeTreatment = function (queryParameters, prop, elValue, relationsList) {
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

var parameterTypeTreatment = function (param) {
    var ret = null;

    if (param == 'true' || param == 'false') {
        ret = (param === 'true');
    } else {
        ret = param;
    }

    return ret;
};

var updateDownloadStatusModel = function(res, downloadModel, status, wampId) {
    downloadModel.updateAttributes({
        status: status
    })
        .then(function () {
            if (websocket.connection.isOpen) {
                websocket.session.publish('plow.downloads.downloads', [],
                    {target: 'download', action: 'update', downloads: [downloadModel]},
                    {
                        acknowledge: false,
                        exclude: [wampId]
                    }
                );
                websocket.session.publish('plow.downloads.download.' + downloadModel.id, [],
                    {target: 'download', action: 'updateDownload', downloads: [downloadModel]},
                    {
                        acknowledge: false,
                        exclude: [wampId]
                    }
                );
            }

            res.json(downloadModel);
        });
};


utils.deleteDownload = function(res, websocket, wampId, downloadsIdList) {
    var downloadIdResultList = [];
    downloadsIdList.forEach(function(id) {
        models.Download.destroy({where: {id: id}})
            .then(function (ret) {
                    models.Download.findAll({
                        include: [{model: models.DownloadPackage, as: 'download_package'}]
                    }).then(function (downloadsModel) {
                        console.log("websocket.connection.isOpen " + websocket.connection.isOpen);
                        if (websocket.connection.isOpen) {
                            websocket.session.publish('plow.downloads.downloads', [],
                                {target: 'download', action: 'delete', data: [id]}
                            );

                            //websocket.session.publish('plow.downloads.download.' + downloadModel.id, [downloadModel], {}, {acknowledge: false, exclude: [req.params.wampId]});
                        }
                    });

                    downloadIdResultList = {id: id, result: ret};
                }
            );
    });

    res.json({'return': downloadIdResultList});
};

utils.moveDownload2 = function (downloadId, action_id) {
    var command = 'ssh root@' + downloadServerConfig.address + ' ' + downloadServerConfig.move_command + ' ' + downloadId + ' ' + action_id;
    var execMove = exec(command);
    execMove.stdout.on('data',
        function (data) {
        }
    );
    execMove.stdout.on('data',
        function (data) {

        }
    );
};

utils.insertOrUpdateLog = function (id, downLogsObject, res) {
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
                        websocket.session.publish('plow.downloads.logs.' + downloadLogsModel.id, [],
                            {target: 'downloadLog', action: 'add', data: [downloadLogsModel]},
                            {acknowledge: false});
                    }

                    if (res) {
                        res.json(downloadLogsModel)
                    }
                }
            );
    });
};

utils.urlFiltersParametersTreatment = function (queryParameters, relationsList) {
    var tabQuery = [];
    var params = {};
    var queryOptions = {};

    for (var prop in queryParameters) {
        var elValue = parameterTypeTreatment(queryParameters[prop]);
        if (elValue != null) {
            if (prop.startsWith("_")) {
                sequelizeParameterTreatment(prop, queryParameters, queryOptions);
            } else {
                queryParameterTreatment(prop, queryParameters, elValue, relationsList, tabQuery, params);
            }
        }
    }

    tabQuery.forEach(function (el) {
        var k = Object.keys(el);
        params[k[0]] = el[k[0]];
    });

    queryOptions['where'] = params;
    queryOptions['include'] = relationsList;

    return queryOptions;
};

utils.executeActionAndUpdateDownloadStatus = function(res, downloadObject, status, action){
    models.Download.findById(downloadObject.id,
        {
            include: [
                {model: models.DownloadPackage, as: 'download_package'}
            ]
        })
        .then(function (downloadModel) {
            if (action != null) {
                var command = 'ssh root@' + downloadServerConfig.address + ' ' + action + ' ' + downloadObject.id;
                var execAction = exec(command);
                execAction.stdout.on('data', function (data) {
                    updateDownloadStatusModel(res, downloadModel, status, downloadObject.wampId);
                });
                execAction.stderr.on('data', function (data) {
                    console.log('stdout: ' + data);
                });
                execAction.on('close', function (code) {
                    console.log('closing code: ' + code);
                });
            } else {
                updateDownloadStatusModel(res, downloadModel, status, downloadObject.wampId);
            }

        });
};

utils.stopCurrentDownloads = function() {
    try {
        var execAction = spawn('ssh', ['root@' + downloadServerConfig.address,
            downloadServerConfig.stop_current_downloads]);

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

utils.executeActions = function (actionsList) {
    try {
        var json = JSON.stringify(actionsList);
        var execAction = spawn('ssh', ['root@' + downloadServerConfig.address,
            downloadServerConfig.action_command, "'" + json + "'"]);

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