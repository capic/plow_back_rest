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
    var callback = function (downloadHosts) {
      res.json(downloadHosts);
    };

    var params = {};
    for (prop in req.query) {
      params[prop] = req.query[prop];
    }

    if (Object.keys(params).length !== 0) {
      models.DownloadHost.findAll({
        where: params
      }).then(callback);
    } else {
      models.DownloadHost.findAll().then(callback);
    }
  }
);

/**
 * get a download by id
 */
router.get('/:id',
  function (req, res, next) {
    models.DownloadHost.findById(req.params.id)
      .then(function (downloadHostModel) {
        res.json(downloadHostModel);
      }
    );
  }
);

/**
 * add a new download
 */
router.post('/',
  function (req, res) {
    var downloadHostObject = JSON.parse(JSON.stringify(req.body));

    models.DownloadHost.findOrCreate({where: {name: downloadHostObject.name}, defaults: downloadHostObject})
      .spread(function (downloadHostModel, created) {
        res.json(downloadHostModel.get({plain: true}));
      }
    );
  }
);

module.exports = router;
