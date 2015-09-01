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
            .then(function (downloadStatus) {
                res.json(downloadStatus);
            }
        );
    }
);

/**
 * get the list of downloads
 */
router.get('/',
    function (req, res, next) {
        var callback = function (downloads) {
            websocket.session.publish('plow.downloads.downloads', downloads, {}, {acknowledge: false});
            res.json(downloads);
        };

        if (req.query.link) {
            models.download.findAll({where: {link: req.query.link}}).then(callback);
        } else {
            models.download.findAll().then(callback);
        }
    }
);

/**
 * get a download by id
 */
router.get('/:id',
    function (req, res, next) {
        models.download.findById(req.params.id)
            .then(function (download) {
                res.json(download);
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
            .then(function (downloads) {
                res.json(downloads);
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
            .then(function (downloads) {
                res.json(downloads);
            }
        );
    }
);

/**
* search downloads by status
*/
router.get('/status/:status',
    function (req, res) {
        models.download.findAll({where: {status: req.params.status}})
            .then(function (downloads) {
                res.json(downloads);
            }
        );
    }
);

/**
 * search downloads by link and filePath
 */
router.get('/link/:link/path/:filePath',
    function (req, res) {
        models.download.findAll({where: {link: req.params.link, file_path: req.params.path}})
            .then(function (downloads) {
                res.json(downloads);
            }
        );
    }
);

router.get('/next/path/:filePath',
    function (req, res) {
        sequelize.query('SELECT  download.id, name, package, link, size_file, size_part, size_file_downloaded, ' +
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
                file_path: req.params.filePath
            },
            type: sequelize.QueryTypes.SELECT
        }).then(function(downloads) {
            res.json(downloads);
        });
    }
);

router.get('/next',
    function (req, res) {
        sequelize.query('SELECT  download.id, name, package, link, size_file, size_part, size_file_downloaded, ' +
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
            type: sequelize.QueryTypes.SELECT
        }).then(function(downloads) {
            res.json(downloads);
        });
    }
);

/**
 * add a new download
 */
router.post('/',
    function (req, res) {
        models.download.create(JSON.parse(JSON.stringify(req.body)))
            .then(function (download) {
                //websocket.session.publish ('plow.downloads.downloads', download, {}, { acknowledge: false});
                res.json(download);
            }
        );
    }
);

/**
 * update a download by id
 */
router.put('/:id',
    function (req, res) {
        var down = JSON.parse(JSON.stringify(req.body))

        models.download.update(down, {where: {id: req.params.id}})
            .then(function () {
                down.id = req.params.id;
                res.json(down);
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

//router.post('/priority',
//    function(req, res) {
//        var down = JSON.parse(JSON.stringify(req.body))
//        models.download.update()
//    }
//);

/**
 * refresh the list of downloads
 */
router.get('/refresh',
    function (req, res) {
        models.download.findAll()
            .then(function (downloads) {
                res.json(downloads);
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
            .then(function (download) {
                res.json(download);
            }
        );
    }
);

router.get('/availability/:id',
    function (req, res) {
        models.download.findById(req.params.id)
            .then(function (download) {
                // TODO: utiliser les constantes
                if (download.status != 2 && download.status != 3) {
                    var command = '/usr/bin/plowprobe --printf \'# {"name":"%f","sizeFile":"%s"}\' ' + download.link;
                    exec(command,
                        function (error, stdout, stderr) {
                            if (error) {
                                res.json(false);
                            } else {
                                var downloadName = download.link;
                                var downloadSize = download.size_file;
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

                                download.updateAttributes({
                                    name: downloadName,
                                    size_file: downloadSize,
                                    status: downloadStatus
                                })
                                    .then(function () {
                                        res.json(download);
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

/**
 * get download logs by id
 */
router.get('/logs/:id',
    function (req, res) {
        models.downloadLogs.findById(req.params.id)
            .then(function (downloadLogs) {
                res.json(downloadLogs);
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
            .then(function (downloadLogs) {
                res.json(downloadLogs);
            }
        );
    }
);

/**
 * update a download logs by id
 */
router.put('/logs/:id',
    function (req, res) {
        var downLogs = JSON.parse(JSON.stringify(req.body))

        models.downloadLogs.update(down, {where: {id: req.params.id}})
            .then(function () {
                downLogs.id = req.params.id;
                websocket.session.publish('plow.downloads.download.' + downLogs.id, [downLogs], {}, {acknowledge: false});
                res.json(downLogs);
            }
        );
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
