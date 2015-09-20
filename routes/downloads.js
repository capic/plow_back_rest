var models = require('../models');
var express = require('express');
var router = express.Router();
var websocket = require('../websocket');
var exec = require('child_process').exec;

/**
 * get the list of download status
 */
router.get('/status',
    function (req, res, next) {
        models.downloadStatus.findAll()
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
            models.download.findAll({where: params}).then(callback);
        } else {
            models.download.findAll().then(callback);
        }
    }
);

/**
 * get the next download
 */
router.get('/next',
    function (req, res) {
        if (req.query.file_path) {
            models.sequelize.query('SELECT  download.id, name, package, link, size_file, size_part, size_file_downloaded, ' +
                'size_part_downloaded, status, progress_part, average_speed, current_speed, time_spent, ' +
                'time_left, pid_plowdown, pid_curl, pid_python, file_path, priority, theorical_start_datetime,' +
                'lifecycle_insert_date, lifecycle_update_date ' +
                ' FROM download ' +
                ' WHERE status = :status and file_path = :file_path and priority = ' +
                '   (SELECT MAX(priority) ' +
                '   FROM download ' +
                '   where status = :status and file_path = :file_path)' +
                ' HAVING MIN(id)', {
                replacements: {
                    status: 1,
                    file_path: req.query.file_path
                },
                type: models.sequelize.QueryTypes.SELECT
            }).then(function (downloadsModel) {
                res.json(downloadsModel);
            });
        } else {
            models.sequelize.query('SELECT  download.id, name, package, link, size_file, size_part, size_file_downloaded, ' +
                'size_part_downloaded, status, progress_part, average_speed, current_speed, time_spent, ' +
                'time_left, pid_plowdown, pid_curl, pid_python, file_path, priority, theorical_start_datetime,' +
                'lifecycle_insert_date, lifecycle_update_date ' +
                ' FROM download ' +
                ' WHERE status = :status and priority = ' +
                '   (SELECT MAX(priority) ' +
                '   FROM download ' +
                '   where status = :status)' +
                ' HAVING MIN(id)', {
                replacements: {
                    status: 1
                },
                type: models.sequelize.QueryTypes.SELECT
            }).then(function (downloadsModel) {
                res.json(downloadsModel);
            });
        }
    }
);

/**
 * get a download by id
 */
router.get('/:id',
    function (req, res, next) {
        models.download.findById(req.params.id)
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
        models.download.findAll({where: {name: {$like: '%' + req.params.name + '%'}}})
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
        models.download.findAll({where: {link: req.params.link}})
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
        models.download.create(JSON.parse(JSON.stringify(req.body)))
            .then(function (downloadModel) {
                if (websocket.connection.isOpen) {
                    websocket.session.publish('plow.downloads.downloads', [downloadModel], {}, {acknowledge: false});
                }

                res.json(downloadModel);
            }
        );
    }
);

/**
 * update a download by id
 */
router.put('/:id',
    function (req, res) {
        var downloadObject = JSON.parse(JSON.stringify(req.body));
        models.download.update(downloadObject, {where: {id: req.params.id}})
            .then(function () {
                models.download.findById(req.params.id)
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
    }
);

/**
 * delete a download by id
 */
router.delete('/:id',
    function (req, res) {
        models.download.destroy({where: {id: req.params.id}})
            .then(function (ret) {
                res.json(ret == 1);
            }
        );
    }
);

/**
 * update the priority
 */
router.post('/priority',
    function(req, res) {
        var downloadObject = JSON.parse(JSON.stringify(req.body));

        models.download.findById(downloadObject.id).then(
            function(downloadModel) {
                downloadModel.updateAttributes({
                    priority: downloadObject.priority
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
        models.download.findAll()
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
        models.download.findById(req.params.id)
            .then(function (downloadModel) {
                res.json(downloadModel);
            }
        );
    }
);

router.get('/availability/:id',
    function (req, res) {
        models.download.findById(req.params.id)
            .then(function (downloadModel) {
                // TODO: utiliser les constantes
                if (downloadModel.status != 2 && downloadModel.status != 3) {
                    var command = '/usr/bin/plowprobe --printf \'# {"name":"%f","sizeFile":"%s"}\' ' + downloadModel.link;
                    exec(command,
                        function (error, stdout, stderr) {
                            if (error) {
                                res.json(false);
                            } else {
                                var downloadName = downloadModel.link;
                                var downloadSize = downloadModel.size_file;
                                var downloadStatus = 4; // TODO: utiliser une constante

                                if (stdout.substring(0, 1) == '#') {
                                    stdout = stdout.replace('# ', '');
                                    var infos = JSON.parse(stdout);
                                    if (infos.name != "") {
                                        downloadName = infos.name;
                                    }
                                    if (infos.size != undefined && infos.size != "") {
                                        downloadSize = infos.size;
                                    }

                                    downloadStatus = 1; // TODO: utiliser une constante
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

router.post('/move',
    function(req, res) {
        var downloadObject = JSON.parse(JSON.stringify(req.body));

        models.download.findById(downloadObject.id)
            .then(function(downloadModel) {
                // TODO: utiliser les constantes
                if (downloadModel.status == 3) {
                    var command = 'ssh root@192.168.1.200 cp ' + downloadModel.directory.replace(" ", "\ ")  + ' ' + downloadObject.directory.replace(" ", "\ ");
                    exec(command,
                        function(error, stdout, stderr) {
                            if (error) {
                                res.json(false);
                            } else {
                                downloadModel.updateAttributes({directory: downloadObject.directory})
                                    .then(function () {
                                        res.json(downloadModel);
                                    }
                                );
                            }
                        }
                    );
                } else {
                    downloadModel.updateAttributes({directory: downloadObject.directory})
                        .then(function () {
                            res.json(downloadModel);
                        }
                    );
                }
            }
        );
    }
);

/**
 * get download logs by id
 */
router.get('/logs/:id',
    function (req, res) {
        models.downloadLogs.findById(req.params.id)
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
        models.downloadLogs.create(JSON.parse(JSON.stringify(req.body)))
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
        var downLogsObject = JSON.parse(JSON.stringify(req.body))

        models.sequelize.query('INSERT INTO download_logs (id, logs) ' +
            'VALUES (:id, :logs) ON DUPLICATE KEY UPDATE id=:id, logs=concat(ifnull(logs,""), :logs)',
            {
                replacements: {
                    id: downLogsObject.id,
                    logs: downLogsObject.logs
                },
                type: models.sequelize.QueryTypes.UPSERT
            }).then(function () {
                models.downloadLogs.findById(req.params.id)
                    .then(function (downloadLogsModel) {
                        if (websocket.connection.isOpen) {
                            websocket.session.publish('plow.downloads.logs.' + downloadLogsModel.id, [downloadLogsModel], {}, {acknowledge: false});
                        }
                        res.json(downloadLogsModel);
                    }
                );
            });
    }
);

/**
 * delete a download logs by id
 */
router.delete('/logs/:id',
    function (req, res) {
        models.downloadLogs.destroy({where: {id: req.params.id}})
            .then(function (ret) {
                res.json(ret == 1);
            }
        );
    }
);

module.exports = router;
