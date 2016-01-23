var models = require('../models');
var express = require('express');
var router = express.Router();
var config = require("../configuration");
var errorConfig = config.get('errors');

/**
 * get the list of download directories
 */
router.get('/',
    function (req, res, next) {
        var callback = function (downloadHostPictures) {
            var list = [];
            downloadHostPictures.forEach(function(host) {
                list.push(
                    {
                        id: host.id,
                        picture: new Buffer(host.picture).toString('base64')
                    }
                );
            });

            res.json(list);
        };

        var params = {};
        for (prop in req.query) {
            params[prop] = req.query[prop];
        }

        if (Object.keys(params).length !== 0) {
            models.DownloadHostPicture.findAll({
                where: params
            }).then(callback);
        } else {
            models.DownloadHostPicture.findAll().then(callback);
        }
    }
);

/**
 * get a download by id
 */
router.get('/:id',
    function (req, res, next) {
        models.DownloadHostPicture.findById(req.params.id)
            .then(function (downloadHostPictureModel) {
                res.json({
                    id: downloadHostPictureModel.id,
                    picture: new Buffer(downloadHostPictureModel.picture).toString('base64')
                });
            }
        );
    }
);

module.exports = router;
