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
        var callback = function (downloadDirectories) {
            res.json(downloadDirectories);
        };

        var params = {};
        for (prop in req.query) {
            params[prop] = req.query[prop];
        }

        if (Object.keys(params).length !== 0) {
            models.DownloadDirectory.findAll({
                where: params
            }).then(callback);
        } else {
            models.DownloadDirectory.findAll().then(callback);
        }
    }
);

/**
 * get a download by id
 */
router.get('/:id',
    function (req, res, next) {
        models.DownloadDirectory.findById(req.params.id)
            .then(function (downloadDirectoryModel) {
                res.json(downloadDirectoryModel);
            }
        );
    }
);

/**
 * add a new download
 */
router.post('/',
    function (req, res) {
        var downloadDirectoryObject = JSON.parse(JSON.stringify(req.body));

        models.DownloadDirectory.findOrCreate({
            where: {path: downloadDirectoryObject.path},
            defaults: downloadDirectoryObject
        })
            .spread(function (downloadDirectoryModel, created) {
                res.json(downloadDirectoryModel.get({plain: true}));
            }
        );
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
                    models.DownloadDirectory.destroy({where: {id: req.params.id}})
                        .then(function (ret) {
                            res.json({'return': ret == 1});
                        }
                    );
                } else {
                    var error = new Error(res.__(errorConfig.downloadDirectories.deleteDirectory.message));
                    error.status = errorConfig.downloadDirectories.deleteDirectory.code;
                    return next(error);
                }
            });
    }
);

module.exports = router;
