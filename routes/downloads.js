var models = require('../models');
var express = require('express');
var router = express.Router();
var fs = require('fs');
var websocket = require('../websocket');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var lineReader = require('line-reader');
var utils = require("../common/utils");
var config = require("../configuration");
var downloadServerConfig = config.get('download_server');
var downloadStatusConfig = config.get('download_status');
var fromConfig = config.get('from');
var errorConfig = config.get('errors');



/**
 * get the list of download status
 */
router.get('/status',
    function (req, res, next) {
        models.DownloadStatus.findAll()
            .then(function (downloadStatusModel) {
                    res.json(downloadStatusModel);
                }
            );
    }
);

/**
 * get the list of downloads
 */
router.get('/',
    function (req, res, next) {
        var callback = function (downloadsModel) {
            res.json(downloadsModel);
        };

        var relationsList = [
            { model: models.DownloadStatus, as: 'download_status' },
            { model: models.DownloadPackage, as: 'download_package' },
            { model: models.DownloadHost, as: 'download_host' },
            {model: models.DownloadPriority, as: 'download_priority'},
            { model: models.Directory, as: 'directory' }
        ];

        var queryOptions = utils.urlFiltersParametersTreatment(req.query, relationsList);

        models.Download.findAll(queryOptions).then(callback);
    }
);

router.get('/next2', function(req, res) {
    // on recupere la liste des hebergeur pour savoir combien on accepte de telechargements simultanes
    models.DownloadHost.findAll().then(function(downloadHostModelList) {
        var downloadToStartList = [];
        var cpt = 0;

        downloadHostModelList.forEach(function(downloadHostModel) {
            //on verifie le nombre de telechargement en cours pour l'hebergeur
            models.Download.count({where: {status: 2, host_id: downloadHostModel.id} })
                .then(function(c) {
                    var nbre = downloadHostModel.simultaneous_downloads - c;

                    if (nbre > 0) {
                        models.Download.findAll(
                            {
                                where: {status: 1, host_id: downloadHostModel.id},
                                limit: nbre,
                                include: [
                                    { model: models.DownloadStatus, as: 'download_status' },
                                    {
                                        model: models.DownloadPackage, as: 'download_package'
                                    }, {
                                        model: models.DownloadHost, as: 'download_host'
                                    },
                                    {
                                        model: models.Directory,
                                        as: 'directory'
                                    }]
                            }).then(function (downloadModelList) {
                            if (downloadModelList.length > 0) {
                                downloadToStartList = downloadToStartList.concat(downloadModelList);
                            }

                            if (cpt == downloadHostModelList.length - 1) {
                                res.json(downloadToStartList);
                            }
                            cpt++
                        });
                    } else {
                        cpt++;
                    }

                }
            );




        });
    });
});

/**
 * get the next download
 */
router.get('/next',
    function (req, res) {
        var conditions = {};

        conditions.status = 1;
        if (req.query.file_path) {
            conditions.file_path = req.query.file_path;
        }

        models.Download.max('priority', {where: conditions})
            .then(function (download_priority) {
                    if (download_priority != undefined && download_priority != null && !isNaN(download_priority) && download_priority != 'NaN') {
                        conditions.priority = download_priority;
                        models.Download.min('id', {where: conditions})
                            .then(function (download_id) {
                                    models.Download.find({
                                            where: {id: download_id},
                                            include: [
                                                { model: models.DownloadStatus, as: 'download_status' },
                                                {
                                                    model: models.DownloadPackage, as: 'download_package'
                                                }, {
                                                    model: models.DownloadHost, as: 'download_host'
                                                },
                                                {
                                                    model: models.Directory,
                                                    as: 'directory'
                                                }
                                            ]
                                        })
                                        .then(function (downloadModel3) {
                                                res.json(downloadModel3);
                                            }
                                        );
                                }
                            );
                    } else {
                        res.json({});
                    }
                }
            );
    }
);

/**
 * get a download by id
 */
router.get('/:id',
    function (req, res, next) {
        models.Download.findById(req.params.id, {
                include: [
                    { model: models.DownloadStatus, as: 'download_status' },
                    {model: models.DownloadPackage, as: 'download_package'},
                    {model: models.DownloadHost, as: 'download_host'},
                    {model: models.DownloadPriority, as: 'download_priority'},
                    {model: models.Directory, as: 'directory'}
                ]
            })
            .then(function (downloadModel) {
                    res.json(downloadModel);
                }
            );
    }
);

/**
 * search downloads by name
 */
router.get('/name/:name',
    function (req, res) {
        models.Download.findAll({where: {name: {$like: '%' + req.params.name + '%'}}})
            .then(function (downloadsModel) {
                    res.json(downloadsModel);
                }
            );
    }
);

/**
 * search downloads by link
 */
router.get('/link/:link',
    function (req, res) {
        models.Download.findAll({where: {link: req.params.link}})
            .then(function (downloadsModel) {
                    res.json(downloadsModel);
                }
            );
    }
);


/**
 * add a new download
 */
router.post('/',
    function (req, res) {
        if (Object.prototype.hasOwnProperty.call(req.body, 'download')) {
            var downloadObject = JSON.parse(req.body.download);
            models.Download.findOrCreate({where: downloadObject})
                .spread(function (downloadModel) {
                        if (websocket.connection.isOpen) {
                            websocket.session.publish('plow.downloads.downloads', [],
                                {target: 'download', action: 'add', data: [downloadModel]}, {acknowledge: false});
                        }
                        res.json(downloadModel);
                    }
                );
        } else {
            var error = new Error(res.__(errorConfig.downloads.addDownload.badJson.message, req.params.id, req.body));
            error.status = errorConfig.downloads.addDownload.code;

            return next(error);
        }
    }
);

router.post('/remove',
    function (req, res, next) {
        var body = JSON.parse(JSON.stringify(req.body))

        utils.deleteDownload(websocket, body.wampId, body.listId)
            .then(function(downloadIdResultList) {
                res.json({'return': downloadIdResultList});
            });
    }
);

/**
 * update a download by id
 */
router.put('/:id',
    function (req, res) {
        if (Object.prototype.hasOwnProperty.call(req.body, 'download')) {
            var downloadObject = JSON.parse(req.body.download);
            var update = true;

            if (Object.prototype.hasOwnProperty.call(req.body, 'update')) {
                console.log("update from python: " + JSON.parse(req.body.update));
                update = JSON.parse(req.body.update);
            }

            if (!update) {
                console.log("No update !!!!");
                models.Download.findById(req.params.id,
                    {
                        include: [
                            { model: models.DownloadStatus, as: 'download_status' },
                            {model: models.DownloadPackage, as: 'download_package'},
                            {model: models.DownloadHost, as: 'download_host'},
                            {model: models.Directory, as: 'directory'},
                            {model: models.DownloadPriority, as: 'download_priority'}
                        ]
                    })
                    .then(function (downloadModel) {
                        downloadObject.download_package = downloadModel.download_package;
                        downloadObject.download_host = downloadModel.download_host;
                        downloadObject.directory = downloadModel.directory;
                        downloadObject.progress_file = parseInt((downloadObject.size_file_downloaded * 100) / downloadObject.size_file);
                        downloadObject.download_priority = downloadModel.download_priority;

                        websocket.session.publish('plow.downloads.downloads', [],
                            {target: 'download', action: 'update', data: [downloadObject]}, {acknowledge: false});
                        websocket.session.publish('plow.downloads.download.' + downloadObject.id, [],
                            {target: 'download', action: 'update', data: [downloadObject]}, {acknowledge: false});

                        res.json(downloadObject);
                    });

            } else {
                console.log("update !!!!");
                models.Download.update(downloadObject, {
                        where: {id: req.params.id}
                    }
                )
                    .then(function () {
                            models.Download.findById(req.params.id,
                                {
                                    include: [
                                        { model: models.DownloadStatus, as: 'download_status' },
                                        {model: models.DownloadPackage, as: 'download_package'},
                                        {model: models.DownloadHost, as: 'download_host'},
                                        {model: models.Directory, as: 'directory'},
                                        {model: models.DownloadPriority, as: 'download_priority'}
                                    ]
                                })
                                .then(function (downloadModel) {
                                        if (websocket.connection.isOpen) {
                                            if (downloadModel) {
                                                websocket.session.publish('plow.downloads.downloads', [],
                                                    {target: 'download', action: 'update', data: [downloadModel]}, {acknowledge: false});
                                                websocket.session.publish('plow.downloads.download.' + downloadObject.id, [],
                                                        {target: 'download', action: 'update', data: [downloadModel]}, {acknowledge: false});
                                            }
                                        }
                                        res.json(downloadModel);
                                    }
                                );
                        }
                    );
            }
        }
        else {
            var error = new Error(res.__(errorConfig.downloads.updateDownload.badJson.message, req.params.id, req.body));
            error.status = errorConfig.downloads.updateDownload.code;

            return next(error);
        }
    }
);

/**
 * delete a download by id
 */
router.delete('/:id',
    function (req, res) {
        console.log(req.params);
        console.log(req.body);
        utils.deleteDownload(websocket, req.params.wampId, [req.params.id])
            .then(function(downloadIdResultList) {
                res.json({'return': downloadIdResultList});
            });
    }
);

router.post('/finished',
    function(req, res) {
        models.Download.findAll({
            include: [
                { model: models.DownloadStatus, as: 'download_status' },
                {model: models.DownloadPackage, as: 'download_package'},
                {model: models.DownloadHost, as: 'download_host'},
                {model: models.Directory, as: 'directory'}
            ],
            where: {status: downloadStatusConfig.FINISHED}})
        .then(function (downloadsModel) {
            if (downloadsModel.length > 0) {
                var ids =[];
                downloadsModel.forEach(function(downloadModel) {
                    ids.push(downloadModel.id);
                });
                utils.deleteDownload(websocket, JSON.parse(JSON.stringify(req.body)).wampId, ids)
                    .then(function(downloadIdResultList) {
                        res.json({'return': downloadIdResultList});
                    });
            } else {
                res.json({'return': []});
            }
        });
    }
);

/**
 * update the priority
 */
router.post('/priority',
    function (req, res) {
        var dataObject = JSON.parse(JSON.stringify(req.body));

        models.Download.findById(dataObject.id).then(
            function (downloadModel) {
                downloadModel.updateAttributes({
                    priority: dataObject.priority
                }).then(function () {
                        res.json(downloadModel);
                    }
                );
            }
        );
    }
);

/**
 * refresh the list of downloads
 */
router.get('/refresh',
    function (req, res) {
        models.Download.findAll()
            .then(function (downloadsModel) {
                    res.json(downloadsModel);
                }
            );
    }
);

/**
 * refresh a download by id
 */
router.get('/refresh/:id',
    function (req, res) {
        models.Download.findById(req.params.id)
            .then(function (downloadModel) {
                    res.json(downloadModel);
                }
            );
    }
);

/**
 * test the availability
 */
router.get('/availability/:id',
    function (req, res) {
        models.Download.findById(req.params.id, {include: [{model: models.DownloadPackage, as: 'download_package'}]})
            .then(function (downloadModel) {
                    if (downloadModel.status != downloadStatusConfig.IN_PROGRESS && downloadModel.status != downloadStatusConfig.FINISHED) {
                        var command = 'ssh root@' + downloadServerConfig.address + ' /usr/bin/plowprobe --printf \'"\'"\'# {"name":"%f","sizeFile":"%s"}\'"\'"\' ' + downloadModel.link;
                        exec(command,
                            function (error, stdout, stderr) {
                                if (error) {
                                    res.json(false);
                                } else {
                                    var downloadName = downloadModel.link;
                                    var downloadSize = downloadModel.size_file;
                                    var downloadStatus = downloadStatusConfig.ERROR;

                                    if (stdout.substring(0, 1) == '#') {
                                        stdout = stdout.replace('# ', '');
                                        var infos = JSON.parse(stdout);
                                        if (infos.name != "") {
                                            downloadName = infos.name;
                                        }
                                        if (infos.size != undefined && infos.size != "") {
                                            downloadSize = infos.size;
                                        }

                                        downloadStatus = downloadStatusConfig.WAITING;
                                    }

                                    downloadModel.updateAttributes({
                                            name: downloadName,
                                            size_file: downloadSize,
                                            status: downloadStatus
                                        })
                                        .then(function () {
                                                res.json(downloadModel);
                                            }
                                        );
                                }
                            }
                        );
                    }
                }
            );
    }
);

router.post('/moveOne',
    function (req, res, next) {
        var dataObject = JSON.parse(JSON.stringify(req.body));

        // on recupere le download sur lequel on fait le traitement
        models.Download.findById(dataObject.id, {
                include: [
                    {model: models.DownloadPackage, as: 'download_package'}
                ]
            })
            .then(function (downloadModel) {
                    //if (dataObject.from == fromConfig.PYTHON_CLIENT || (dataObject.from == fromConfig.IHM_CLIENT && downloadModel.directory_id != dataObject.directory_id)) {
                        var logs = "";
                        models.DownloadLogs.findById(dataObject.download_id)
                            .then(function (downloadLogsModel) {
                                    if (downloadModel.status == downloadStatusConfig.FINISHED || downloadModel.status == downloadStatusConfig.MOVED || downloadModel.status == downloadStatusConfig.ERROR_MOVING) {
                                        logs = "Moving action ...\r\n";

                                        downloadModel.updateAttributes({
                                                status: downloadStatusConfig.TREATMENT_IN_PROGRESS
                                            })
                                            .then(function () {
                                                    utils.moveDownload2(dataObject.download_id, dataObject.action_id);

                                                    res.json(downloadModel);
                                                });
                                    } else {
                                        models.DownloadDirectory.findById(dataObject.directory_id)
                                            .then(function (downloadDirectoryModel) {

                                                    downloadModel.updateAttributes({
                                                            to_move_directory_id: downloadDirectoryModel.id
                                                        })
                                                        .then(function () {
                                                                // a ce moment les logs ne sont peut etre pas creee en bdd
                                                                if (downloadLogsModel != null) {
                                                                    logs += "No moving just update the directory\r\n";
                                                                    downloadLogsModel.updateAttributes({logs: downloadLogsModel.logs + logs});
                                                                }
                                                                models.Download.findById(dataObject.id, {
                                                                        include: [
                                                                            {model: models.DownloadPackage, as: 'download_package'}
                                                                        ]
                                                                    })
                                                                    .then(function (downloadModelReturned) {
                                                                            res.json(downloadModelReturned);
                                                                        }
                                                                    );
                                                            }
                                                        );
                                                }
                                            );
                                    }
                                }
                            );

                    //}
                }
            );
    }
);

router.post('/unrar',
    function (req, res) {
        var dataObject = JSON.parse(JSON.stringify(req.body));
        var downloadObject = {status: downloadStatusConfig.TREATMENT_IN_PROGRESS};
        models.Download.update(downloadObject, {
                where: {package_id: dataObject.id}
            }
            )
            .then(function () {
                    var command = 'ssh root@' + downloadServerConfig.address + ' ' + downloadServerConfig.unrar_command + ' ' + dataObject.id;
                    var s = spawn('ssh', ['root@' + downloadServerConfig.address, downloadServerConfig.unrar_command, dataObject.id]);
                    /* s.stdout.on('data',
                     function (data) {
                     if (websocket.connection.isOpen) {
                     //websocket.session.publish('plow.downloads.downloads', [downloadModel], {}, {acknowledge: false});
                     websocket.session.publish('plow.downloads.download.unrar.' + dataObject.id, [downloadModel], {}, {acknowledge: false});
                     }
                     }
                     );
                     //s.stderr.on('data', function (data) { console.log(data.toString()) });
                     s.on('exit', function(code) {
                     if (websocket.connection.isOpen) {
                     //websocket.session.publish('plow.downloads.downloads', [downloadModel], {}, {acknowledge: false});
                     websocket.session.publish('plow.downloads.download.unrar.' + dataObject.id, [downloadModel], {}, {acknowledge: false});
                     }
                     if (code != 0) {
                     console.log('Failed: ' + code);
                     }

                     });*/
                }
            );

        res.end();
    }
);

/**
 * get download logs by id
 */
router.get('/logs/:id/:idApplication',
    function (req, res) {
    /*
        models.DownloadLogs.findById(req.params.id)
            .then(function (downloadLogsModel) {
                    res.json(downloadLogsModel);
                }
            );
     */
    models.ApplicationConfiguration.findById(req.params.idApplication,
        {
            include: [
                { model: models.Directory, as: 'python_log_directory' },
                { model: models.Directory, as: 'python_directory_download_temp' },
                { model: models.Directory, as: 'python_directory_download' }
            ]
        })
        .then(function(applicationConfigurationModel) {
            var tabLogs = [];

            utils.getPatternLog(req.params.idApplication)
                .then(function(pattern) {
                    if (typeof pattern != 'undefined' && pattern != null && fs.existsSync('/media/nas/USB_squeeze/squeeze' + applicationConfigurationModel.python_log_directory.path + 'log_download_id_' + req.params.id +'.log')) {
                        lineReader.eachLine('/media/nas/USB_squeeze/squeeze' + applicationConfigurationModel.python_log_directory.path + 'log_download_id_' + req.params.id +'.log', function(line, isLast) {
                            var lineObject = pattern.parseSync(line);

                            if (lineObject != null) {
                                lineObject['levelname'] = lineObject['levelname'].trim();

                                if (lineObject['to_ihm'] == 'true') {
                                    tabLogs.push({id: req.params.id, logs: lineObject['message']});
                                }
                            }

                            // console.log(line);
                            //console.log(pattern.parseSync(line));
                            if (isLast) {
                                res.json(tabLogs);
                            }
                        });
                    } else {
                        res.send();
                    }
                })
                .catch(function(err) {
                    console.log(err);
                    res.send();
                });
        });
    }
);

/**
 * add a new download logs
 */
router.post('/logs',
    function (req, res) {
        models.DownloadLogs.create(JSON.parse(JSON.stringify(req.body)))
            .then(function (downloadLogsModel) {
                    res.json(downloadLogsModel);
                }
            );
    }
);

/**
 * update a download logs by id
 */
router.put('/logs/:id',
    function (req, res) {
        var dataObject = JSON.parse(req.body.logs);
        var applicationConfigurationId = JSON.parse(req.body.applicationConfigurationId);

        utils.insertOrUpdateLog(req.params.id, dataObject, applicationConfigurationId, res, JSON.parse(req.body.insert));
    }
);

/**
 * delete a download logs by id
 */
router.delete('/logs/:id',
    function (req, res) {
        models.DownloadLogs.findById(req.params.id)
            .then(function (downloadLogsModel) {
                    downloadLogsModel.updateAttributes({logs: ''})
                        .then(function (downloadLogsModelUpdated) {
                                res.json(downloadLogsModelUpdated);
                            }
                        );
                }
            );
    }
);

router.get('/package/:id',
    function (req, res) {
        models.DownloadPackage.findById(req.params.id)
            .then(function (downloadPackageModel) {
                    res.json(downloadPackageModel);
                }
            );
    }
);

router.post('/package',
    function (req, res) {
        if (Object.prototype.hasOwnProperty.call(req.body, 'package')) {
            var packageObject = JSON.parse(req.body.package);

            models.DownloadPackage.findOrCreate({
                    where: {name: packageObject.name},
                    defaults: packageObject
                })
                .spread(function (downloadPackageModel, created) {
                        res.json(downloadPackageModel.get({plain: true}));
                    }
                );
        } else {
            // TODO: erreur
        }
    }
);

router.post('/package/unrarPercent',
    function (req, res) {
        var dataObject = JSON.parse(JSON.stringify(req.body));

        models.DownloadPackage.findById(dataObject.id)
            .then(function (downloadPackageModel) {
                    downloadPackageModel.updateAttributes({unrar_progress: dataObject.unrar_progress})
                        .then(function () {
                                if (websocket.connection.isOpen) {
                                    //websocket.session.publish('plow.downloads.downloads', [downloadModel], {}, {acknowledge: false});
                                    websocket.session.publish('plow.downloads.download.unrar.' + downloadPackageModel.id, [],
                                        {target: 'package', action: 'unrar', data: [downloadPackageModel]}, {acknowledge: false});
                                }
                                res.json(downloadPackageModel);
                            }
                        );
                }
            );
    }
);

router.get('/file/exists/:id',
    function (req, res, next) {
        models.Download.findById(req.params.id, {
                include: [
                    {
                        model: models.DownloadPackage,
                        as: 'download_package'
                    },                    {
                        model: models.Directory,
                        as: 'directory'
                    }
                ]
            })
            .then(function (downloadModel) {
                    if (downloadModel.status > downloadStatusConfig.FINISHED && downloadModel.status != downloadStatusConfig.MOVING) {
                        var directory = downloadModel.directory.path.replace(/\s/g, "\\\\ ");
                        var name = downloadModel.name.replace(/\s/g, "\\\\ ");
                        var command = 'ssh root@' + downloadServerConfig.address + ' test -f "' + directory + name + '" && echo true || echo false';
                        exec(command,
                            function (error, stdout, stderr) {
                                if (error) {
                                    var error = new Error(res.__(errorConfig.downloads.fileExists.message, downloadModel.download_directory.path + downloadModel.name));
                                    error.status = errorConfig.downloads.fileExists.code;

                                    return next(error);
                                } else {
                                    if (stdout == 'true\n') {
                                        res.json({'return': true});
                                    } else {
                                        var error = new Error(res.__(errorConfig.downloads.fileExists.message, downloadModel.directory.path + downloadModel.name));
                                        error.status = errorConfig.downloads.fileExists.code;

                                        return next(error);
                                    }

                                }
                            }
                        );
                    } else {
                        res.json({'return': true});
                    }
                }
            );
    }
);

router.post('/reset',
    function (req, res, next) {
        var dataObject = JSON.parse(JSON.stringify(req.body));

        models.Download.findById(dataObject.id,
            {
                include: [
                    {model: models.DownloadPackage, as: 'download_package'}
                ]
            })
            .then(function (downloadModel) {
                    downloadModel.updateAttributes({
                            status: downloadStatusConfig.WAITING,
                            size_file_downloaded: 0,
                            size_part_downloaded: 0,
                            progress_part: 0,
                            average_speed: 0,
                            current_speed: 0
                        })
                        .then(function () {
                                var command = 'ssh root@' + downloadServerConfig.address + ' ' + downloadServerConfig.reset_command + ' ' + dataObject.id + ' ' + dataObject.deleteFile;
                                var execReset = exec(command);

                                execReset.stdout.on('data', function (data) {
                                    console.log('stdout: ' + data);
                                });
                                execReset.stderr.on('data', function (data) {
                                    console.log('stdout: ' + data);
                                });
                                execReset.on('close', function (code) {
                                    console.log('closing code: ' + code);
                                });

                                if (websocket.connection.isOpen) {
                                    websocket.session.publish('plow.downloads.downloads', [],
                                        {target: 'dwonload', action: 'reset', data: [downloadModel]}, {
                                        acknowledge: false,
                                        exclude: [dataObject.wampId]
                                    });
                                    websocket.session.publish('plow.downloads.download.' + downloadModel.id, [],
                                        {target: 'download', action: 'reset', data: [downloadModel]}, {
                                        acknowledge: false,
                                        exclude: [dataObject.wampId]
                                    });
                                }

                                res.json(downloadModel);
                            }
                        );
                }
            );
    }
);

router.post('/pause',
    function (req, res, next) {
        var dataObject = JSON.parse(JSON.stringify(req.body));
        utils.executeActionAndUpdateDownloadStatus(dataObject, downloadStatusConfig.PAUSE, downloadServerConfig.stop_download);
    }
);

router.post('/package/files/delete',
    function (req, res, next) {
        var dataObject = JSON.parse(JSON.stringify(req.body));

        var downloadObject = {status: downloadStatusConfig.TREATMENT_IN_PROGRESS};
        models.Download.update(downloadObject, {
                where: {package_id: dataObject.id}
            }
            )
            .then(function () {

                    var command = 'ssh root@' + downloadServerConfig.address + ' ' + downloadServerConfig.delete_package_files + ' ' + dataObject.id;
                    var execDeletePackageFiles = exec(command);

                    execDeletePackageFiles.stdout.on('data', function (data) {
                        console.log('stdout: ' + data);
                    });
                    execDeletePackageFiles.stderr.on('data', function (data) {
                        console.log('stdout: ' + data);
                    });
                    execDeletePackageFiles.on('close', function (code) {
                        console.log('closing code: ' + code);
                    });
                }
            );

        res.end();
    }
);

router.post('/stop',
    function(req, res) {
        var dataObject = JSON.parse(JSON.stringify(req.body));

        var ret = utils.executeActionAndUpdateDownloadStatus(dataObject, downloadStatusConfig.STOP, downloadServerConfig.stop_download);
        res.json(ret);
    }
);

router.post('/start',
    function(req, res) {
        var dataObject = JSON.parse(JSON.stringify(req.body));

        var ret = utils.executeActionAndUpdateDownloadStatus(dataObject, downloadStatusConfig.START, downloadServerConfig.start_download);
        res.json(ret);
    }
);


router.post('/resume',
    function(req, res) {
        var dataObject = JSON.parse(JSON.stringify(req.body));

        utils.executeActionAndUpdateDownloadStatus(res, dataObject, downloadStatusConfig.WAITING, null);
    }
);

module.exports = router;
