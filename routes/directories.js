var models = require('../models');
var express = require('express');
var router = express.Router();
var config = require("../configuration");
var downloadStatusConfig = config.get('download_status');
var errorConfig = config.get('errors');

/**
 * get the list of download directories
 */
router.get('/',
    function (req, res, next) {
        var callback = function (directories) {
            res.json(directories);
        };

        var params = {};
        for (prop in req.query) {
            params[prop] = req.query[prop];
        }

        if (Object.keys(params).length !== 0) {
            models.Directory.findAll({
                where: params
            }).then(callback);
        } else {
            models.Directory.findAll().then(callback);
        }
    }
);

/**
 * get a download by id
 */
router.get('/:id',
    function (req, res, next) {
        models.Directory.findById(req.params.id)
            .then(function (directoryModel) {
                res.json(directoryModel);
            }
        );
    }
);

/**
 * add a new download
 */
router.post('/',
    function (req, res) {
        if (req.body.hasOwnProperty('directory')) {
            var directoryObject = JSON.parse(req.body.directory);

            models.Directory.findOrCreate({
                where: {path: directoryObject.path},
                defaults: directoryObject
            })
                .spread(function (directoryModel, created) {
                    res.json(directoryModel.get({plain: true}));
                }
            );
        } else {
            //TODO: erreur
        }
    }
);

/**
 * delete a download by id
 */
router.delete('/:id',
    function (req, res, next) {
        models.Download.findAndCountAll({
            where: {
                directory_id: req.params.id,
                $or: [{status: downloadStatusConfig.WAITING}, {status: downloadStatusConfig.IN_PROGRESS}]
            }
        })
            .then(function (result) {
                // on supprime le directory seulement si il n'est pas utilise autre part
                if (result.count <= 1) {
                    models.Directory.destroy({where: {id: req.params.id}})
                        .then(function (ret) {
                            res.json({'return': ret == 1});
                        }
                    );
                } else {
                    var error = new Error(res.__(errorConfig.directories.deleteDirectory.message));
                    error.status = errorConfig.directories.deleteDirectory.code;
                    return next(error);
                }
            });
    }
);

module.exports = router;
