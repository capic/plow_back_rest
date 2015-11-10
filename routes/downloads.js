var models = require('../models');
var express = require('express');
var router = express.Router();
var websocket = require('../websocket');
var exec = require('child_process').exec;
var config = require("../configuration");
var downloadServerConfig = config.get('download_server');
var downloadStatusConfig = config.get('download_status');
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
        include: [{model: models.DownloadPackage, as: 'download_package'}, {
          model: models.DownloadDirectory,
          as: 'download_directory'
        }]
      }).then(callback);
    } else {
      models.Download.findAll({
        include: [{
          model: models.DownloadPackage,
          as: 'download_package'
        }, {
          model: models.DownloadDirectory,
          as: 'download_directory'
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
                include: [{model: models.DownloadPackage, as: 'download_package'}, {
                  model: models.DownloadDirectory,
                  as: 'download_directory'
                }]
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
        {model: models.DownloadDirectory, as: 'download_directory'}
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
    models.Download.create(JSON.parse(JSON.stringify(req.body)), {
      include: [{
        model: models.DownloadPackage,
        as: 'download_package'
      }, {
        model: models.DownloadDirectory,
        as: 'download_directory'
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
    var downloadObject = JSON.parse(JSON.stringify(req.body));
    models.Download.update(downloadObject, {
      where: {id: req.params.id},
      include: [
        {model: models.DownloadPackage, as: 'download_package'},
        {model: models.DownloadDirectory, as: 'download_directory'}
      ]
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
        if (websocket.connection.isOpen) {
          models.Download.findAll({
            include: [{model: models.DownloadPackage, as: 'download_package'}, {
              model: models.DownloadDirectory,
              as: 'download_directory'
            }]
          }).then(function(downloadsModel) {
            websocket.session.publish('plow.downloads.downloads', [downloadsModel], {}, {acknowledge: false, exclude: [req.params.wampId]});
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
  function (req, res, next) {
    var downloadObject = JSON.parse(JSON.stringify(req.body));

    // on recupere le download sur lequel on fait le traitement
    models.Download.findById(downloadObject.id, {
      include: [{model: models.DownloadPackage, as: 'download_package'}, {
        model: models.DownloadDirectory,
        as: 'download_directory'
      }]
    })
      .then(function (downloadModel) {
        // fonction de traitement
        var treatment = function (downloadModelList) {
          var i = 0;
          var listDownloadReturned = [];
          var listErrors = [];

          var updateInfos = function (downloadModelListElement, downloadLogsModel, downloadDirectoryModel, param, message) {
            // on met à jour le download avec le nouveau directory et le nouveau status
            downloadModelListElement.updateAttributes(param)
              .then(function () {
                var element = downloadModelListElement;

                // on met a jour les logs du download
                downloadLogsModel.updateAttributes({logs: downloadLogsModel.logs + message});

                listDownloadReturned.push(downloadModelListElement);
                // on ne renvoit le model que quand on a fini le traitement
                if (i == downloadModelList.length - 1) {
                  if (listErrors.length > 0) {
                    return next(listErrors);
                  } else {
                    res.json(listDownloadReturned);
                  }
                }
                i++;
              }
            )
          };

          // on parcourt la liste des downloads
          downloadModelList.forEach(
            function (downloadModelListElement) {
              if (downloadModelListElement.directory_id != downloadObject.directory_id) {
                var logs = "";
                models.DownloadLogs.findById(downloadObject.id)
                  .then(function (downloadLogsModel) {
                    if (downloadModelListElement.status == downloadStatusConfig.FINISHED || downloadModelListElement.status == downloadStatusConfig.MOVED || downloadModelListElement.status == downloadStatusConfig.ERROR_MOVING) {
                      logs = "Moving action ...";

                      downloadModelListElement.updateAttributes({status: downloadStatusConfig.MOVING})
                        .then(function () {
                          models.DownloadDirectory.findById(downloadObject.directory_id)
                            .then(function (downloadDirectoryModel) {
                              var oldDirectory = downloadModelListElement.download_directory.path.replace(/\s/g, "\\\\ ");
                              var newDirectory = downloadDirectoryModel.path.replace(/\s/g, "\\\\ ");
                              var name = downloadModelListElement.name.replace(/\s/g, "\\\\ ");

                              // on teste l'existence du fichier
                              var command = 'ssh root@' + downloadServerConfig.address + ' test -f "' + oldDirectory + name + '" && echo true || echo false';
                              var execFileExists = exec(command);

                              // pas d'erreur
                              execFileExists.stdout.on('data', function (data) {
                                // si le fichier existe
                                if (data == "true\n") {
                                  // on deplace le fichier
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
                                      updateInfos(downloadModelListElement, downloadLogsModel, downloadDirectoryModel, param, logs);
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
                                      updateInfos(downloadModelListElement, downloadLogsModel, downloadDirectoryModel, param, logs);
                                    }
                                  );
                                } else {
                                  // on met à jour le download  le nouveau status
                                  downloadModelListElement.updateAttributes({status: downloadStatusConfig.ERROR_MOVING})
                                    .then(function () {
                                      var param = {status: downloadStatusConfig.ERROR_MOVING};
                                      logs += "Moving to " + newDirectory + " ERROR => file does not exist !!!\r\n";
                                      updateInfos(downloadModelListElement, downloadLogsModel, downloadDirectoryModel, param, logs);

                                    }
                                  );
                                }

                                execFileExists.stderr.on('data',
                                  function (data) {
                                    var error = new Error(res.__(errorConfig.download.fileExists.message));
                                    error.status = errorConfig.download.fileExists.code;

                                    var param = {status: downloadStatusConfig.ERROR_MOVING};
                                    logs += "Moving to " + newDirectory + " ERROR => file exists check error !!!\r\n";
                                    logs += data + "\r\n";
                                    updateInfos(downloadModelListElement, downloadLogsModel, downloadDirectoryModel, param, logs);
                                  }
                                );
                              });
                            }
                          );
                        }
                      )
                    } else {
                      models.DownloadDirectory.findById(downloadObject.directory_id)
                        .then(function (downloadDirectoryModel) {

                          downloadModelListElement.updateAttributes({
                            directory_id: downloadDirectoryModel.id,
                            download_directory: downloadDirectoryModel
                          })
                            .then(function () {
                              // a ce moment les logs ne sont peut etre pas creee en bdd
                              if (downloadLogsModel != null) {
                                logs = "No moving just update the directory\r\n";
                                downloadLogsModel.updateAttributes({logs: logs});
                              }

                              listDownloadReturned.push(downloadModelListElement);
                              if (i == downloadModelList.length - 1) {
                                if (listErrors.length > 0) {
                                  return next(listErrors);
                                } else {
                                  res.json(listDownloadReturned);
                                }
                              }
                              i++;
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
        };

        if (downloadObject.withPackage == true) {
          models.Download.findAll({
            where: {'package_id': downloadModel.package_id},
            include: [{model: models.DownloadPackage, as: 'download_package'}, {
              model: models.DownloadDirectory,
              as: 'download_directory'
            }]
          })
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
  function (req, res, next) {
    models.Download.findById(req.params.id, {
      include: [{model: models.DownloadPackage, as: 'download_package'}, {
        model: models.DownloadDirectory,
        as: 'download_directory'
      }]
    })
      .then(function (downloadModel) {
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
      }
    );
  }
);

router.post('/reset',
  function (req, res, next) {
    var downloadObject = JSON.parse(JSON.stringify(req.body));

    models.Download.findById(downloadObject.id,
      {
        include: [
          {model: models.DownloadPackage, as: 'download_package'},
          {model: models.DownloadDirectory, as: 'download_directory'}
        ]
      })
      .then(function (downloadModel) {
        downloadModel.updateAttributes({status: downloadStatusConfig.WAITING})
          .then(function () {
            if (downloadObject.deleteFile) {
              var directory = downloadModel.download_directory.path.replace(/\s/g, "\\\\ ");
              var name = downloadModel.name.replace(/\s/g, "\\\\ ");

              // on teste l'existence du fichier
              var command = 'ssh root@' + downloadServerConfig.address + ' rm "' + directory + name + '"';
              var execDeleteFile = exec(command);

              execDeleteFile.stdout.on('data', function (data) {
                console.log(data);
              });

              execDeleteFile.stderr.on('data', function (data) {
                console.log(data);
              });
            }

            if (websocket.connection.isOpen) {
              websocket.session.publish('plow.downloads.downloads', [downloadModel], {}, {acknowledge: false, exclude: [downloadObject.wampId]});
              websocket.session.publish('plow.downloads.download.' + downloadModel.id, [downloadModel], {}, {acknowledge: false, exclude: [downloadObject.wampId]});
            }

            res.json(downloadModel);
          }
        );
      }
    );
  }
);

module.exports = router;
