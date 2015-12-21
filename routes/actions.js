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
        var callback = function (action) {
            res.json(action);
        };

        var params = {};
        for (var prop in req.query) {
            params[prop] = req.query[prop];
        }

        if (Object.keys(params).length !== 0) {
            models.Action.findAll({
                where: params,
                include: [
                    {model: models.ActionType, as: 'action_type'},
                    {model: models.Directory, as: 'directory'},
                    {model: models.Property, as: 'property'},
                    {model: models.ActionStatus, as: 'action_status'}
                ]
            }).then(callback)
                .catch(
                function (errors) {
                    console.log(errors);
                }
            );
        } else {
            models.Action.findAll({
                include: [
                    {model: models.ActionType, as: 'action_type'},
                    {model: models.Directory, as: 'directory'},
                    {model: models.Property, as: 'property'},
                    {model: models.ActionStatus, as: 'action_status'}
                ]
            }).then(callback)
                .catch(
                    function (errors) {
                        console.log(errors);
                    }
                );
        }
    }
);


/**
 * add a new download
 */
router.post('/bulk',
    function (req, res) {
        if (req.body.hasOwnProperty('actions')) {
            var listActions = JSON.parse(req.body.actions);

            models.Action.bulkCreate(listActions)
                .then(function (actionModel) {
                    res.json(actionModel);
                }
            ).catch(
                function (errors) {
                    console.log(errors);
                }
            );
        } else {
            //TODO: erreur
        }
    }
);

router.put('/download/:downloadId/action/:actionId/property/:propertyId',
    function (req, res) {
        if (req.body.hasOwnProperty('downloadActionHistory')) {
            var downloadActionHistoryObject = JSON.parse(req.body.downloadActionHistory);

            models.DownloadActionHistory.update(downloadActionHistoryObject, {
                    where: {
                        download_id: req.params.downloadId,
                        action_id: req.params.actionId,
                        num: req.params.num
                    }
                }
            )
                .then(function () {
                    models.DownloadActionHistory.findOne(
                        {
                            where: {
                                download_id: req.params.downloadId,
                                action_id: req.params.actionId,
                                num: req.params.num
                            },
                            include: [
                                {model: models.DownloadAction, as: 'download_action'},
                                {model: models.DownloadActionStatus, as: 'download_action_status'}
                            ]
                        }
                    ).then(function (downloadActionHistoryModel) {
                            res.json(downloadActionHistoryModel);
                        }
                    );
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
 var error = new Error(res.__(errorConfig.directories.deleteDirectory.message));
 error.status = errorConfig.directories.deleteDirectory.code;
 return next(error);
 }
 });
 }
 );*/

module.exports = router;
