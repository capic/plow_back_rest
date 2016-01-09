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
        var callback = function (actionType) {
            res.json(actionType);
        };

        var params = utils.urlFiltersParametersTreatment(req.query);

        if (Object.keys(params).length !== 0) {
            models.ActionType.findAll({
                where: params,
                include: [
                    {
                        model: models.ActionTypeHasProperty, as: 'action_type_has_property',
                        include: [
                            {model: models.Property, as: 'property'}
                        ]
                    },
                    {model: models.ActionTarget, as: 'action_target'}
                ]
            }).then(callback)
                .catch(
                    function (errors) {
                        console.log(errors);
                    }
                );
        } else {
            models.ActionType.findAll({
                include: [
                    {
                        model: models.ActionTypeHasProperty, as: 'action_type_has_property',
                        include: [
                            {model: models.Property, as: 'property'}
                        ]
                    },
                    {model: models.ActionTarget, as: 'action_target'}
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
        models.ActionType.findById(req.params.id, {
                include: [
                    {
                        model: models.ActionTypeHasProperty, as: 'action_type_has_property',
                        include: [
                            {model: models.Property, as: 'property'}
                        ]
                    },
                    {model: models.ActionTarget, as: 'action_target'}
                ]
            })
            .then(function (actionTypeModel) {
                    res.json(actionTypeModel);
                }
            );
    }
);

module.exports = router;
