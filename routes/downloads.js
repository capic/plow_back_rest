var express = require('express');
var router = express.Router();
var Download = require('../controllers/download');

var download = new Download();

/**
 * get the list of download status
 */
router.get('/status',
  function (req, res, next) {
    download.findAllStatus(req, res);
  }
);

/**
 * get the list of downloads
 */
router.get('/',
  function (req, res, next) {
    download.findAll(req, res);
  }
);

/**
 * get a download by id
 */
router.get('/:id',
  function (req, res, next) {
   download.findById(req, res);
  }
);

/**
 * add a new download
 */
router.post('/',
  function (req, res) {
    download.save(req, res);
  }
);

/**
 * update a download by id
 */
router.put('/:id',
  function (req, res) {
    download.modify(req, res);
  }
);

/**
 * delete a download by id
 */
router.delete('/:id',
  function (req, res) {
    download.delete(req, res);
  }
);

/**
 * refresh the list of downloads
 */
router.get('/refresh',
  function (req, res) {
    download.findAll(req, res);
  }
);

module.exports = router;
