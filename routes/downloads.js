var models  = require('../models');
var express = require('express');
var router = express.Router();
var exec = require('child_process').exec;

/**
 * get the list of download status
 */
router.get('/status',
  function (req, res, next) {
    models.downloadStatus.findAll()
      .then(function(downloadStatus) {
        res.json(downloadStatus);
      }
    );
  }
);

/**
 * get the list of downloads
 */
router.get('/',
  function (req, res, next) {
    models.download.findAll()
      .then(function(downloads) {
        res.json(downloads);
      }
    );
  }
);

/**
 * get a download by id
 */
router.get('/:id',
  function (req, res, next) {
   models.download.findById(req.params.id)
     .then(function(download) {
      res.json(download);
     }
   );
  }
);

/**
 * search downloads by name
 */
router.get('/search/:name',
  function(req, res) {
    models.download.findAll({where: {name: {$like: '%' + req.params.name + '%'}}})
      .then(function(downloads) {
        res.json(downloads);
      }
    );
  }
);

/**
 * add a new download
 */
router.post('/',
  function (req, res) {
    models.download.create(JSON.parse(JSON.stringify(req.body)))
      .then(function(download) {
        res.json(download);
      }
    );
  }
);

/**
 * update a download by id
 */
router.put('/:id',
  function (req, res) {
    var down = JSON.parse(JSON.stringify(req.body))

    models.download.update(down, {where: {id: req.params.id}})
      .then(function() {
        down.id = req.params.id;
        res.json(down);
      }
    );
  }
);

/**
 * delete a download by id
 */
router.delete('/:id',
  function (req, res) {
    models.download.destroy({where: {id: req.params.id}})
      .then(function(ret) {
        res.json(ret == 1);
      }
    );
  }
);

/**
 * refresh the list of downloads
 */
router.get('/refresh',
  function (req, res) {
    models.download.findAll()
      .then(function(downloads) {
        res.json(downloads);
      }
    );
  }
);

/**
 * refresh a download by id
 */
router.get('/refresh/:id',
  function(req, res) {
    models.download.findById(req.params.id)
      .then(function(download) {
        res.json(download);
      }
    );
  }
);

router.get('/availability/:id',
  function(req, res) {
    models.download.findById(req.params.id)
      .then(function(download) {
        // TODO: utiliser les constantes
        if (download.status != 2 && download.status != 3) {
          var command = '/usr/bin/plowprobe --printf \'# {"name":"%f","sizeFile":"%s"}\' ' + download.link;
          exec(command,
            function(error, stdout, stderr) {
              var downloadName = download.link;
              var downloadSize = 0;
              var downloadStatus = 4; // TODO: utiliser une constante

              if (stdout.substring(0 , 1) == '#') {
                stdout = stdout.replace('# ', '');
                var infos = JSON.parse(stdout);
                if (infos.name != "") {
                  downloadName = infos.name;
                }
                if (infos.size != "") {
                  downloadSize = infos.size;
                }

                downloadStatus = 1; // TODO: utiliser une constante
              }

              download.updateAttributes({name: downloadName, size_file: downloadSize, status: downloadStatus})
                .then(function() {
                  res.json(download);
                }
              );
            }
          );
        }
      }
    );
  }
);

router.get('/infos/:id',
  function(req, res) {
    router.get('/:id',
      function (req, res, next) {

      }
    );
  }
);

module.exports = router;
