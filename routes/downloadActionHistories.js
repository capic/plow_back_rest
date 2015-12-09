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
        var callback = function (downloadActionHistories) {
            res.json(downloadActionHistories);
        };

        var params = {};
        for (prop in req.query) {
            params[prop] = req.query[prop];
        }

        if (Object.keys(params).length !== 0) {
            models.DownloadActionHistory.findAll({
                where: params,
                include: [
                    {model: models.DownloadAction, as: 'download_action'},
                    {model: models.DownloadActionStatus, as: 'download_action_status'}
                ]
            }).then(callback);
        } else {
            models.DownloadActionHistory.findAll().then(callback);
        }
    }
);


/**
 * add a new download
 */
router.post('/',
    function (req, res) {
        if (req.body.hasOwnProperty('downloadActionHistory')) {
            var downloadActionHistoryObject = JSON.parse(req.body.downloadActionHistory);

            models.DownloadActionHistory.create(downloadActionHistoryObject, {raw: true})
                .then(function (downloadActionHistoryCreated) {
                    var a = downloadActionHistoryCreated.reload();
                    models.DownloadActionHistory.findOne(
                        {
                            where: {
                                download_id: downloadActionHistoryCreated.download_id,
                                download_action_id: downloadActionHistoryCreated.download_action_id,
                                num: downloadActionHistoryCreated.num
                            },
                            include: [
                                {model: models.DownloadAction, as: 'download_action'},
                                {model: models.DownloadActionStatus, as: 'download_action_status'}
                            ]
                        }
                    ).then(function(downloadActionHistoryModel) {
                            res.json(downloadActionHistoryModel);
                        }
                    );
                }
            );
        } else {
            //TODO: erreur
        }
    }
);

router.put('/download/:downloadId/downloadAction/:downloadActionId',
    function (req, res) {
        if (req.body.hasOwnProperty('downloadActionHistory')) {
            var downloadActionHistoryObject = JSON.parse(req.body.downloadActionHistory);

            models.DownloadActionHistory.update(downloadActionHistoryObject, {
                    where: {download_id: req.params.download_id, download_action_id: req.params.downloadActionId}
                }
            )
                .then(function () {

                }
            );
        }
    }
);

/*
/!**
 * delete a download by id
 *!/
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
);*/

module.exports = router;
