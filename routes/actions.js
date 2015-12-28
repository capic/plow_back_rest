var models = require('../models');
var express = require('express');
var websocket = require('../websocket');
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
                    {model: models.ActionStatus, as: 'action_status'},
                    {
                        model: models.ActionHasProperties, as: 'action_has_properties',
                        include: [
                            {model: models.Directory, as: 'directory'},
                            {model: models.Property, as: 'property'}
                        ]
                    }
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
                    {model: models.ActionStatus, as: 'action_status'},
                    {
                        model: models.ActionHasProperties, as: 'action_has_properties',
                        include: [
                            {model: models.Directory, as: 'directory'},
                            {model: models.Property, as: 'property'}
                        ]
                    }
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

router.get('/:id',
    function (req, res, next) {
        models.Action.findById(req.params.id, {
                include: [
                    {model: models.ActionType, as: 'action_type'},
                    {model: models.ActionStatus, as: 'action_status'},
                    {
                        model: models.ActionHasProperties, as: 'action_has_properties',
                        include: [
                            {model: models.Directory, as: 'directory'},
                            {model: models.Property, as: 'property'}
                        ]
                    }
                ]
            })
            .then(function (actionModel) {
                    res.json(actionModel);
                }
            );
    }
);


router.post('/',
    function (req, res) {
        if (req.body.hasOwnProperty('action')) {
            var action = JSON.parse(req.body.action);

            models.Action.create(action,
                {
                    include: [
                        {model: models.ActionHasProperties, as: 'action_has_properties'}
                    ]
                }
            ).then(function (actionModel) {
                    res.json(actionModel);
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

            if (listActions.length > 0) {
                models.Action.max('num', {
                    where: {
                        download_id: listActions[0].download_id,
                        action_type_id: listActions[0].action_type_id
                    }
                }).then(function (num) {//TODO utiliser un hook
                    if (isNaN(num) || num === undefined || num === null) {
                        num = 0;
                    }

                    var listActionsTransformed = [];
                    listActions.forEach(function (actionToTransform) {
                        actionToTransform.num = num + 1;
                        listActionsTransformed.push(actionToTransform);
                    });

                    models.Action.bulkCreate(listActionsTransformed)
                        .then(function (actionModel) {
                            models.Action.findAll({
                                where: {
                                    download_id: actionModel.download_id,
                                    action_type_id: actionModel.action_type_id,
                                    num: num
                                }
                            }).then(function (actionsFoundModel) {
                                res.json(actionsFoundModel);
                            });
                        });

                }).catch(
                    function (errors) {
                        console.log(errors);
                    }
                );
            }
        } else {
            //TODO: erreur
        }
    }
);

router.put('/:id',
    function (req, res) {
        if (req.body.hasOwnProperty('action')) {
            var actionObject = JSON.parse(req.body.action);

            models.Action.upsert(actionObject
            ).then(
                function (modified) {
                    if (modified) {
                        if (websocket.connection.isOpen) {
                            websocket.session.publish('plow.downloads.download.' + actionObject.download_id + '.action.' + actionObject.action_type_id, [actionObject], {}, {acknowledge: false});
                        }
                    }
                }
            );


            res.end();
        }
    }
);

router.put('/:downloadId/:actionTypeId/:propertyId/:num',
    function (req, res) {
        if (req.body.hasOwnProperty('action')) {
            var actionObject = JSON.parse(req.body.action);

            models.Action.update(actionObject, {
                    where: {
                        download_id: req.params.downloadId,
                        action_type_id: req.params.actionTypeId,
                        property_id: req.params.propertyId,
                        num: req.params.num
                    }
                }
                )
                .then(function () {
                        models.Action.findOne(
                            {
                                where: {
                                    download_id: req.params.downloadId,
                                    action_type_id: req.params.actionTypeId,
                                    property_id: req.params.propertyId,
                                    num: req.params.num
                                }
                            }
                        ).then(function (actionModel) {
                                res.json(actionModel);
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
