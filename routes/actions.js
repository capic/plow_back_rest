var models = require('../models');
var express = require('express');
var websocket = require('../websocket');
var router = express.Router();
var config = require("../configuration");
var exec = require('child_process').exec;
var downloadServerConfig = config.get('download_server');
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

router.put('/:id',
    function (req, res) {
        if (req.body.hasOwnProperty('action')) {
            var actionObject = JSON.parse(req.body.action);

            models.ActionHasProperties.bulkCreate(actionObject.action_has_properties,
                {
                    updateOnDuplicate: ['property_value']
                }
            ).then(
                function() {
                    models.Action.update(actionObject,
                        {
                            where: {id: req.params.id},
                            include: [
                                {model: models.ActionHasProperties, as: 'action_has_properties'}
                            ]
                        }
                    ).then(
                        function (modified) {
                            if (modified) {
                                if (websocket.connection.isOpen) {
                                    websocket.session.publish('plow.downloads.download.' + actionObject.download_id + '.action.' + actionObject.id, [actionObject], {}, {acknowledge: false});
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

router.post('/execute',
    function (req, res) {
        //ex: {"download_id": 1, "action_id": 1}
        var actionToExecute = JSON.parse(JSON.stringify(req.body));

        var command = 'ssh root@' + downloadServerConfig.address + ' ' + downloadServerConfig.action_command + ' ' + actionToExecute.download_id + ' ' + actionToExecute.action_id;
        var execMove = exec(command);
        execMove.stdout.on('data',
            function(data) {
            }
        );
        execMove.stdout.on('data',
            function(data) {

            }
        );
    }
);

module.exports = router;
