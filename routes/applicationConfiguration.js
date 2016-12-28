var models = require('../models');
var express = require('express');
var router = express.Router();
var config = require("../configuration");
var utils = require("../common/utils");
var websocket = require('../websocket');
var downloadStatusConfig = config.get('download_status');
var errorConfig = config.get('errors');


router.get('/',
    function (req, res, next) {
        var callback = function (applicationConfigurations) {
            res.json(applicationConfigurations);
        };

        var relationsList = [
            { model: models.Directory, as: 'python_log_directory' },
            { model: models.Directory, as: 'python_directory_download_temp' },
            { model: models.Directory, as: 'python_directory_download_text' },
            { model: models.Directory, as: 'python_directory_download' }
        ];

        var queryOptions = utils.urlFiltersParametersTreatment(req.query, relationsList);

        models.ApplicationConfiguration.findAll(queryOptions).then(callback);
    }
);

router.get('/:id',
    function (req, res, next) {
        models.ApplicationConfiguration.findById(req.params.id,{
            include: [
                { model: models.Directory, as: 'python_log_directory' },
                { model: models.Directory, as: 'python_directory_download_temp' },
                { model: models.Directory, as: 'python_directory_download_text' },
                { model: models.Directory, as: 'python_directory_download' }
            ]
        })
            .then(function (applicationConfigurationModel) {
                    res.json(applicationConfigurationModel);
                }
            );
    }
);

router.put('/:id',
    function (req, res) {
        var applicationConfigurationObject = JSON.parse(JSON.stringify(req.body));
        models.ApplicationConfiguration.update(applicationConfigurationObject, {
                where: {id_application: req.params.id}
            })
            .then(function () {
                    models.ApplicationConfiguration.findById(req.params.id,
                        {})
                        .then(
                            function (applicationConfigurationdModel) {
                                if (websocket.connection.isOpen) {
                                    websocket.session.publish('plow.application.configuration', [applicationConfigurationdModel], {}, {acknowledge: false});
                                }

                                if (!applicationConfigurationdModel.download_activated) {
                                    // stop current downloads
                                    utils.stopCurrentDownloads();
                                }

                                res.json(applicationConfigurationdModel);
                            }
                        );
                }
            );
    }
);

module.exports = router;
