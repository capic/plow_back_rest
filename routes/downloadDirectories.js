var express = require('express');
var router = express.Router();

/**
 * get the list of download directories
 */
router.get('/',
  function (req, res, next) {
    var callback = function (downloadDirectories) {
      res.json(downloadDirectories);
    };

    var params = {};
    for (prop in req.query) {
      params[prop] = req.query[prop];
    }

    if (Object.keys(params).length !== 0) {
      models.DownloadDirectory.findAll({
        where: params
      }).then(callback);
    } else {
      models.DownloadDirectory.findAll().then(callback);
    }
  }
);

/**
 * get a download by id
 */
router.get('/:id',
  function (req, res, next) {
    models.DownloadDirectory.findById(req.params.id)
      .then(function (downloadDirectoryModel) {
        res.json(downloadDirectoryModel);
      }
    );
  }
);

/**
 * add a new download
 */
router.post('/',
  function (req, res) {
    models.DownloadDirectory.create(JSON.parse(JSON.stringify(req.body)))
      .then(function (downloadDirectoryModel) {
        res.json(downloadDirectoryModel);
      }
    );
  }
);

/**
 * delete a download by id
 */
router.delete('/:id',
  function (req, res) {
    models.DownloadDirectory.destroy({where: {id: req.params.id}})
      .then(function (ret) {
        res.json({'return': ret == 1});
      }
    );
  }
);

module.exports = router;
