var models = require('../models');
var express = require('express');
var websocket = require('../websocket');
var router = express.Router();
var config = require("../configuration");
var spawn = require('child_process').spawn;
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

        var tabQuery = [];
        var params = {};
        for (var prop in req.query) {
            var tabOperator = prop.split("$");
            if (tabOperator.length > 0) {
                var tabOperatorNum = tabOperator[1].split("£");
                if (tabOperatorNum[0] == "or") {
                    var p = {};
                    p[tabOperator[0]] = req.query[prop];

                    if (tabQuery.hasOwnProperty(tabOperatorNum[1])) {
                        var a = tabQuery[tabOperatorNum[1]];
                        a.push(p);
                    } else {
                        var op = {};
                        op['$or'] = new Array();
                        op['$or'].push(p);
                        tabQuery[tabOperatorNum[1]] = op;
                    }
                }
            } else {
                params[prop] = req.query[prop];
            }
        }

       /* tabQuery.forEach(function(el){
            params
        });*/

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
                                        }
                                    ).then(
                                        function (actionModel) {
                                            websocket.session.publish('plow.downloads.download.' + actionModel.download_id + '.action.' + actionModel.id, [actionModel], {}, {acknowledge: false});
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
    function(req, res) {
        models.Action.destroy({where: {id: req.params.id}})
            .then(function (ret) {
                    res.json({'return': ret == 1});
                }
            );
    }
);

router.post('/execute',
    function (req, res) {
        //ex: {"download_id": 1, "action_id": 1}
        var actionToExecute = JSON.parse(JSON.stringify(req.body));

        try {
            // var command = 'ssh root@' + downloadServerConfig.address + ' ' + downloadServerConfig.action_command + ' ' + actionToExecute.download_id + ' ' + actionToExecute.action_id;
            var execAction = spawn('ssh', ['root@' + downloadServerConfig.address, downloadServerConfig.action_command, actionToExecute.download_id, actionToExecute.action_id]);
            //var execAction = exec(command);
            execAction.stdout.on('data',
                function (data) {
                    console.log(data.toString());
                }
            );
            execAction.stderr.on('data',
                function (data) {
                    console.log(data.toString());
                }
            );
            execAction.on('error', function (err) {
                console.log('Failed to start child process.' + err);
            });
            execAction.on('close', function (code) {
                console.log('child process exited with code ' + code);
            });
        } catch (ex) {
            console.log(ex);
        }

        res.end();
    }
);

module.exports = router;
