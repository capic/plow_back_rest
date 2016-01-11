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

        var relationsList = [
            {
                model: models.ActionTypeHasProperty, as: 'action_type_has_property',
                include: [
                    {
                        model: models.Property, as: 'property',
                        include: [
                            {model: models.PropertyType, as: 'property_type'}
                        ]
                    }
                ]
            },
            {model: models.ActionTarget, as: 'action_target'}
        ];

        var params = utils.urlFiltersParametersTreatment(req.query, relationsList);

        if (Object.keys(params).length !== 0) {
            models.ActionType.findAll({
                where: params,
                include: relationsList
            }).then(callback)
                .catch(
                    function (errors) {
                        console.log(errors);
                    }
                );
        } else {
            models.ActionType.findAll({
                include: relationsList
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
                            {
                                model: models.Property, as: 'property',
                                include: [
                                    {model: models.PropertyType, as: 'property_type'}
                                ]
                            }
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
