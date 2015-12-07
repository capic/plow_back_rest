var models = require('../models');
var express = require('express');
var router = express.Router();
var websocket = require('../websocket');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
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

        var params = {};
        for (prop in req.query) {
            params[prop] = req.query[prop];
        }

        if (Object.keys(params).length !== 0) {
            models.Download.findAll({
                where: params,
                include: [
                    {
                        model: models.DownloadPackage,
                        as: 'download_package'
                    }, {
                        model: models.DownloadDirectory,
                        as: 'download_directory'
                    }, {
                        model: models.DownloadDirectory,
                        as: 'to_move_download_directory'
                    },
                    {
                        model: models.DownloadHost,
                        as: 'download_host'
                    }
                ]
            }).then(callback);
        } else {
            models.Download.findAll({
                include: [{
                    model: models.DownloadPackage,
                    as: 'download_package'
                }, {
                    model: models.DownloadDirectory,
                    as: 'download_directory'
                }, {
                    model: models.DownloadDirectory,
                    as: 'to_move_download_directory'
                }, {
                    model: models.DownloadHost,
                    as: 'download_host'
                }]
            }).then(callback);
        }
    }
)
;

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
                                    {
                                        model: models.DownloadPackage, as: 'download_package'
                                    }, {
                                        model: models.DownloadDirectory, as: 'download_directory'
                                    }, {
                                        model: models.DownloadDirectory,
                                        as: 'to_move_download_directory'
                                    }, {
                                        model: models.DownloadHost, as: 'download_host'
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
                {model: models.DownloadPackage, as: 'download_package'},
                {model: models.DownloadDirectory, as: 'download_directory'},
                {model: models.DownloadDirectory, as: 'to_move_download_directory'},
                {model: models.DownloadHost, as: 'download_host'}
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
        if (req.body.hasOwnProperty('download')) {
            var downloadObject = JSON.parse(req.body.download);
            models.Download.create(downloadObject)
                .then(function (downloadModel) {
                    if (websocket.connection.isOpen) {
                        websocket.session.publish('plow.downloads.downloads', [downloadModel], {}, {acknowledge: false});
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
        var listDownloadId = JSON.parse(JSON.stringify(req.body)).ListId;

        var listDownloadIdDeleted = [];
        var i = 0;
        listDownloadId.forEach(
            function (downloadId) {
                models.Download.destroy({where: {id: downloadId}})
                    .then(function (ret) {
                        if (ret != 1) {
                            var error = new Error(res.__(errorConfig.downloads.deleteDownload.message, downloadId));
                            error.status = errorConfig.downloads.deleteDownload.code;

                            return next(error);
                        } else {
                            listDownloadIdDeleted.push(downloadId);
                        }
                        if (i == listDownloadId.length - 1) {
                            res.json({'listDownloadIdDeleted': listDownloadIdDeleted});
                        }

                        i++;
                    }
                );
            }
        );
    }
);

/**
 * update a download by id
 */
router.put('/:id',
    function (req, res) {
        if (req.body.hasOwnProperty('download')) {
            var downloadObject = JSON.parse(req.body.download);
            models.Download.update(downloadObject, {
                    where: {id: req.params.id}
                }
            )
                .then(function () {
                    models.Download.findById(req.params.id,
                        {
                            include: [
                                {model: models.DownloadPackage, as: 'download_package'},
                                {model: models.DownloadDirectory, as: 'download_directory'},
                                {model: models.DownloadDirectory, as: 'to_move_download_directory'},
                                {model: models.DownloadHost, as: 'download_host'}
                            ]
                        })
                        .then(function (downloadModel) {
                            if (websocket.connection.isOpen) {
                                websocket.session.publish('plow.downloads.downloads', [downloadModel], {}, {acknowledge: false});
                                websocket.session.publish('plow.downloads.download.' + downloadModel.id, [downloadModel], {}, {acknowledge: false});
                            }
                            res.json(downloadModel);
                        }
                    );
                }
            );
        } else {
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
        models.Download.destroy({where: {id: req.params.id}})
            .then(function (ret) {
                if (websocket.connection.isOpen) {
                    models.Download.findAll({
                        include: [{model: models.DownloadPackage, as: 'download_package'}, {
                            model: models.DownloadDirectory,
                            as: 'download_directory'
                        }]
                    }).then(function (downloadsModel) {
                        websocket.session.publish('plow.downloads.downloads', [downloadsModel], {}, {
                            acknowledge: false,
                            exclude: [req.params.wampId]
                        });
                        //websocket.session.publish('plow.downloads.download.' + downloadModel.id, [downloadModel], {}, {acknowledge: false, exclude: [req.params.wampId]});
                    });
                }

                res.json({'return': ret == 1});
            }
        );
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
                {model: models.DownloadPackage, as: 'download_package'},
                {model: models.DownloadDirectory, as: 'download_directory'},
                {model: models.DownloadDirectory, as: 'to_move_download_directory'}
            ]
        })
            .then(function (downloadModel) {
                if (dataObject.from == fromConfig.PYTHON_CLIENT || (dataObject.from == fromConfig.IHM_CLIENT && downloadModel.directory_id != dataObject.directory_id)) {
                    var logs = "";
                    models.DownloadLogs.findById(dataObject.id)
                        .then(function (downloadLogsModel) {
                            if (downloadModel.status == downloadStatusConfig.FINISHED || downloadModel.status == downloadStatusConfig.MOVED || downloadModel.status == downloadStatusConfig.ERROR_MOVING) {
                                logs = "Moving action ...\r\n";

                                downloadModel.updateAttributes({
                                    status: downloadStatusConfig.TREATMENT_IN_PROGRESS
                                })
                                    .then(function () {
                                        var srcDirectoryId = downloadModel.directory_id;
                                        var dstDirectoryId = dataObject.directory_id;

                                        utils.moveDownload2(downloadModel.id, srcDirectoryId, dstDirectoryId);

                                        res.json(downloadModel);
                                    }
                                );
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
                                                        {model: models.DownloadPackage, as: 'download_package'},
                                                        {model: models.DownloadDirectory, as: 'download_directory'},
                                                        {model: models.DownloadDirectory, as: 'to_move_download_directory'}
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

                }
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
router.get('/logs/:id',
    function (req, res) {
        models.DownloadLogs.findById(req.params.id)
            .then(function (downloadLogsModel) {
                res.json(downloadLogsModel);
            }
        );
    }
);

/**
 * add a new download logs
 */
router.post('/',
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
        var dataObject = JSON.parse(JSON.stringify(req.body))

        utils.insertOrUpdateLog(req.params.id, dataObject, websocket, res);
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
        if (req.body.hasOwnProperty('package')) {
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
                            websocket.session.publish('plow.downloads.download.unrar.' + downloadPackageModel.id, [downloadPackageModel], {}, {acknowledge: false});
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
            include: [{model: models.DownloadPackage, as: 'download_package'}, {
                model: models.DownloadDirectory,
                as: 'download_directory'
            }]
        })
            .then(function (downloadModel) {
                if (downloadModel.status > downloadStatusConfig.FINISHED && downloadModel.status != downloadStatusConfig.MOVING) {
                    var directory = downloadModel.download_directory.path.replace(/\s/g, "\\\\ ");
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
                                    var error = new Error(res.__(errorConfig.downloads.fileExists.message, downloadModel.download_directory.path + downloadModel.name));
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
                    {model: models.DownloadPackage, as: 'download_package'},
                    {model: models.DownloadDirectory, as: 'download_directory'}
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
                            websocket.session.publish('plow.downloads.downloads', [downloadModel], {}, {
                                acknowledge: false,
                                exclude: [dataObject.wampId]
                            });
                            websocket.session.publish('plow.downloads.download.' + downloadModel.id, [downloadModel], {}, {
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

router.get('/actions/:downloadId/:downloadActionId',
    function(req, res) {
        models.DownloadActionHistory.findOne({
            where: {download_id: req.params.downloadId, download_action_id: req.params.downloadActionId},
            include: [
                {model: models.DownloadAction, as: 'download_action'}
            ]

        })
            .then(function (downloadAction) {
                res.json(downloadAction)
            }
        );
    }
);

module.exports = router;
