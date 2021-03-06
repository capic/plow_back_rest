var models = require('../models');
var express = require('express');
var websocket = require('../websocket');
var router = express.Router();
var config = require("../configuration");
var spawn = require('child_process').spawn;
var utils = require('../common/utils');
var downloadServerConfig = config.get('download_server');
var actionConfig = config.get('action');
var errorConfig = config.get('errors');

/**
 * get the list of download directories
 */
router.get('/',
    function (req, res, next) {
        var callback = function (action) {
            res.json(action);
        };

        var relationsList = [
            {
                model: models.ActionType, as: 'action_type',
                include: [
                    {model: models.ActionTarget, as: 'action_target'}
                ]
            },
            {model: models.ActionStatus, as: 'action_status'},
            {
                model: models.ActionHasProperties, as: 'action_has_properties',
                include: [
                    {model: models.Directory, as: 'directory'},
                    {model: models.Property, as: 'property'}
                ]
            }
        ];

        var queryOptions = utils.urlFiltersParametersTreatment(req.query, relationsList);

        models.Action.findAll(queryOptions).then(callback)
            .catch(
                function (errors) {
                    console.log(errors);
                }
            );
    }
);

router.get('/:id',
    function (req, res, next) {
        models.Action.findById(req.params.id, {
                include: [
                    {
                        model: models.ActionType, as: 'action_type',
                        include: [
                            {model: models.ActionTarget, as: 'action_target'}
                        ]
                    },
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
        if (Object.prototype.hasOwnProperty.call(req.body, 'action')) {
            var action = JSON.parse(req.body.action);

            // on force a 1 pour que le trigger prenne le relais
            action.order = 1;

            models.Action.create(action,
                {
                    include: [
                        {model: models.ActionHasProperties, as: 'action_has_properties'},
                        {model: models.ActionType, as: 'action_type'}
                    ]
                }
            ).then(function (actionModelInserted) {

                models.Action.findById(actionModelInserted.id, {
                        include: [
                            {
                                model: models.ActionType, as: 'action_type',
                                include: [
                                    {model: models.ActionTarget, as: 'action_target'}
                                ]
                            },
                            {model: models.ActionStatus, as: 'action_status'},
                            {
                                model: models.ActionHasProperties, as: 'action_has_properties',
                                include: [
                                    {model: models.Directory, as: 'directory'},
                                    {model: models.Property, as: 'property'}
                                ]
                            }
                        ]
                    }
                ).then(
                    function (actionModel) {
                        if (websocket.connection.isOpen) {
                            switch (actionModel.action_type.action_target_id) {
                                case actionConfig.target.DOWNLOAD:
                                    websocket.session.publish('plow.downloads.download.' + actionModel.download_id + '.actions', [actionModel], {}, {acknowledge: false});
                                    break;
                                case actionConfig.target.PACKAGE:
                                    websocket.session.publish('plow.downloads.package.' + actionModel.download_package_id + '.actions', [actionModel], {}, {acknowledge: false});
                                    break;
                            }
                        }
                        res.json(actionModel);
                    }
                );

            });
        }
    }
);

router.put('/:id',
    function (req, res) {
        if (Object.prototype.hasOwnProperty.call(req.body, 'action')) {
            var actionObject = JSON.parse(req.body.action);

            models.ActionHasProperties.bulkCreate(actionObject.action_has_properties,
                {
                    updateOnDuplicate: ['property_value']
                }
            ).then(
                function () {
                    models.Action.update(actionObject,
                        {
                            where: {id: req.params.id},
                            include: [
                                {model: models.ActionHasProperties, as: 'action_has_properties'}
                            ],
                            fields: [
                                'lifecycle_update_date',
                                'action_status_id'
                            ]
                        }
                    ).then(
                        function (modified) {
                            if (modified.length == 1) {
                                if (websocket.connection.isOpen) {
                                    models.Action.findById(req.params.id, {
                                            include: [
                                                {
                                                    model: models.ActionType, as: 'action_type',
                                                    include: [
                                                        {model: models.ActionTarget, as: 'action_target'}
                                                    ]
                                                },
                                                {model: models.ActionStatus, as: 'action_status'},
                                                {
                                                    model: models.ActionHasProperties, as: 'action_has_properties',
                                                    include: [
                                                        {model: models.Directory, as: 'directory'},
                                                        {model: models.Property, as: 'property'}
                                                    ]
                                                }
                                            ]
                                        }
                                    ).then(
                                        function (actionModel) {
                                            if (websocket.connection.isOpen) {
                                                switch (actionModel.action_type.action_target_id) {
                                                    case actionConfig.target.DOWNLOAD:
                                                        websocket.session.publish('plow.downloads.download.' + actionModel.download_id + '.actions', [actionModel], {}, {acknowledge: false});
                                                        break;
                                                    case actionConfig.target.PACKAGE:
                                                        websocket.session.publish('plow.downloads.package.' + actionModel.download_package_id + '.actions', [actionModel], {}, {acknowledge: false});
                                                        break;
                                                }
                                            }

                                        }
                                    );
                                }
                            }
                        }
                    );
                }
            );

            res.end();
        }
    }
);

router.delete('/:id',
    function (req, res) {
        models.Action.destroy({where: {id: req.params.id}})
            .then(function (ret) {
                    res.json({'return': ret == 1});
                }
            );
    }
);

router.post('/execute',
    function (req, res) {
        //ex: {"object_id": 1, "action_id": 1, "action_target_id": 1}
        var actionToExecute = JSON.parse(JSON.stringify(req.body));
        var tabActionsToExecute = [];
        tabActionsToExecute.push(actionToExecute);

            utils.executeActions(tabActionsToExecute);

        res.end();
    }
);

router.post('/executeAll',
    function(req, res) {
        // [{object_id: 1, action_id: 1, target_id: 1}, ...]
        var actionObjectsList = JSON.parse(JSON.stringify(req.body));

        utils.executeActions(actionObjectsList);

        res.end();
    }
);

module.exports = router;
