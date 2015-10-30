var models = require('../models');
var express = require('express');
var router = express.Router();
var websocket = require('../websocket');
var exec = require('child_process').exec;
var config = require("../configuration");
var downloadServerConfig = config.get('download_server');
var downloadStatusConfig = config.get('download_status');

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
        include: [{model: models.DownloadPackage, as: 'download_package'}]
      }).then(callback);
    } else {
      models.Download.findAll({
        include: [{
          model: models.DownloadPackage,
          as: 'download_package'
        }]
      }).then(callback);
    }
  }
);

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
        if (download_priority != undefined && download_priority != null && download_priority != NaN) {
          conditions.priority = download_priority;
          models.Download.min('id', {where: conditions})
            .then(function (download_id) {
              models.Download.find({
                where: {id: download_id},
                include: [{model: models.DownloadPackage, as: 'download_package'}]
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
    models.Download.findById(req.params.id)
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
    models.Download.create(JSON.parse(JSON.stringify(req.body)), {
      include: [{
        model: models.DownloadPackage,
        as: 'download_package'
      }]
    })
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
    models.Download.update(downloadObject, {
      where: {id: req.params.id},
      include: [{model: models.DownloadPackage, as: 'download_package'}]
    })
      .then(function () {
        models.Download.findById(req.params.id)
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
    models.Download.destroy({where: {id: req.params.id}})
      .then(function (ret) {
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
    var downloadObject = JSON.parse(JSON.stringify(req.body));

    models.Download.findById(downloadObject.id).then(
      function (downloadModel) {
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

router.post('/move',
  function (req, res) {
    var downloadObject = JSON.parse(JSON.stringify(req.body));

    // on recupère le download sur lequel on fait le traitement
    models.Download.findById(downloadObject.id)
      .then(function (downloadModel) {
        // fonction de traitement
        var treatment = function (downloadModelList) {
          var i = 0;

          // on parcourt la liste des downloads
          downloadModelList.forEach(
            function (downloadModelListElement) {
              var downloadLogsObject = {};

              if (downloadModelListElement.status == downloadStatusConfig.FINISHED || downloadModelListElement.status == downloadStatusConfig.MOVED || downloadModelListElement.status == downloadStatusConfig.ERROR_MOVING) {
                downloadLogsObject.id = downloadObject.id;
                downloadLogsObject.logs = "Moving action ...";
                models.DownloadLogs.update(downloadLogsObject, {
                  where: {id: downloadLogsObject.id}
                });

                downloadModelListElement.updateAttributes({status: downloadStatusConfig.MOVING})
                  .then(function () {
                    var oldDirectory = downloadModelListElement.directory.replace(/\s/g, "\\\\ ");
                    var newDirectory = downloadModelListElement.directory.replace(/\s/g, "\\\\ ");
                    var name = downloadModelListElement.name.replace(/\s/g, "\\\\ ");
                    var command = 'ssh root@' + downloadServerConfig.address + ' mv ' + oldDirectory + name + ' ' + newDirectory;
                    exec(command,
                      function (error, stdout, stderr) {
                        var directory = downloadObject.directory;
                        var status = downloadStatusConfig.ERROR_MOVING;
                        downloadLogsObject.logs = "Moving to " + directory + " OK !!!";

                        if (!error) {
                          directory = downloadModelListElement.directory;
                          status = downloadStatusConfig.MOVED;
                          downloadLogsObject.logs = "Moving to " + directory + " ERROR !!!";
                        }

                        downloadModelListElement.updateAttributes({directory: directory, status: status})
                          .then(function () {
                            downloadLogsObject.id = downloadObject.id;

                            models.DownloadLogs.update(downloadLogsObject, {
                              where: {id: downloadLogsObject.id}
                            });

                            // on ne renvoit le model que quand on a fini le traitement
                            if (i == downloadModelList.length - 1) {
                              res.json(downloadModel);
                            }
                          }
                        );
                      }
                    );
                  }
                )
              } else {
                downloadModelListElement.updateAttributes({directory: downloadObject.directory})
                  .then(function () {
                    downloadLogsObject.id = downloadObject.id;
                    downloadLogsObject.logs = "No moving just update the directory";
                    models.DownloadLogs.update(downloadLogsObject, {
                      where: {id: downloadLogsObject.id}
                    });

                    if (i == downloadModelList.length - 1) {
                      res.json(downloadModel);
                    }
                  }
                );
              }
              i++;
            }
          );
        };

        if (downloadObject.withPackage == true) {
          models.Download.findAll({where: {'package_id': downloadModel.package_id}})
            .then(function (list) {
              treatment(list);
            }
          );
        } else {
          treatment([downloadModel]);
        }
      }
    );
  }
);

router.post('/unrar',
  function (req, res) {
    var downloadObject = JSON.parse(JSON.stringify(req.body));

    var command = 'ssh root@' + downloadServerConfig.address + ' ' + downloadServerConfig.unrar_command + ' ' + downloadObject.id;
    var child = exec(command);

    child.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
    });
    child.stderr.on('data', function (data) {
      console.log('stdout: ' + data);
    });
    child.on('close', function (code) {
      console.log('closing code: ' + code);
    });
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
        models.DownloadLogs.findById(req.params.id)
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
    models.DownloadLogs.destroy({where: {id: req.params.id}})
      .then(function (ret) {
        res.json({'return': ret == 1});
      }
    );
  }
);

router.post('/package',
  function (req, res) {
    var downloadObject = JSON.parse(JSON.stringify(req.body));

    models.DownloadPackage.findOrCreate({where: {name: downloadObject.name}, defaults: downloadObject})
      .spread(function (downloadPackageModel, created) {
        res.json(downloadPackageModel.get({plain: true}));
      }
    );
  }
);

router.get('/file/exists/:id',
  function (req, res) {
    models.Download.findById(req.params.id)
      .then(function (downloadModel) {
        var command = 'ssh root@' + downloadServerConfig.address + ' test -f "' + downloadModel.directory + downloadModel.name + '" && echo true || echo false';
        exec(command,
          function (error, stdout, stderr) {
            if (error) {
              res.json({'return': false});
            } else {
              res.json({'return': stdout == 'true'});
            }
          }
        );
      }
    );
  }
);

module.exports = router;
