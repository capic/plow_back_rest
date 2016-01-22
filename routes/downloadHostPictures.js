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
            downloadHostPictures.picture = new Buffer(downloadHostPictures.picture.data).toString('base64');
            res.json(downloadHostPictures);
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
                res.writeHead(200, {'Content-Type': 'image/png'});
                res.end(downloadHostPictureModel.picture, 'binary');
            }
        );
    }
);

module.exports = router;
