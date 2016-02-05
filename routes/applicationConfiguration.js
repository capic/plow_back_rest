var models = require('../models');
var express = require('express');
var router = express.Router();
var config = require("../configuration");
var downloadStatusConfig = config.get('download_status');
var errorConfig = config.get('errors');


router.get('/',
    function (req, res, next) {
        var callback = function (applicationConfigurations) {
            res.json(applicationConfigurations);
        };

        var params = {};
        for (prop in req.query) {
            params[prop] = req.query[prop];
        }

        if (Object.keys(params).length !== 0) {
            models.ApplicationConfiguration.findAll({
                where: params
            }).then(callback);
        } else {
            models.ApplicationConfiguration.findAll().then(callback);
        }
    }
);

router.get('/:id',
    function (req, res, next) {
        models.ApplicationConfiguration.findById(req.params.id)
            .then(function (applicationConfigurationModel) {
                res.json(applicationConfigurationModel);
            }
        );
    }
);

module.exports = router;
