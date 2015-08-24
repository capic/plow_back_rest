var express = require('express');
var router = express.Router();
var Download = require('../controllers/download');

/**
 * get the list of download status
 */
router.get('/status',
  function (req, res, next) {
    var db = req.db;
    db.query('select id, name from download_status order by ord',
      function (err, rows) {
        if (!err)
          res.json(rows);
        else
          console.log('Error while performing Query.');
      }
    );
  }
);

/**
 * get the list of downloads
 */
router.get('/',
  function (req, res, next) {
    var db = req.db;
    Download.findAll(db, req, res);
    /*db.query('select * from download order by id',
      function (err, rows) {
        if (!err)
          res.json(rows);
        else
          console.log('Error while performing Query.');
      }
    );*/
  }
);

/**
 * get a download by id
 */
router.get('/:id',
  function (req, res, next) {
    var db = req.db;
    var id = req.params.id;
    db.query('select * from download where id=?', [id],
      function (err, rows) {
        if (!err)
          res.json(rows);
        else
          console.log('Error while performing Query.');
      }
    );
  }
);

/**
 * add a new download
 */
router.post('/',
  function (req, res) {
    var db = req.db;
    var down = JSON.parse(JSON.stringify(req.body));

    db.query('insert into download set ?', down,
      function (err, rows) {
        if (err) {
          res.send(err);
        } else {
          down.id = rows.insertId;
          res.json(down);
        }
      }
    );
  }
);

/**
 * update a download by id
 */
router.put('/:id',
  function (req, res) {
    var db = req.db;
    var id = req.params.id;
    var down = JSON.parse(JSON.stringify(req.body));

    db.query('update download set ? where id = ?', [down, id],
      function (err, rows) {
        if (err) {
          res.send(err);
        } else {
          res.json(down);
        }
      }
    );
  }
);

/**
 * delete a download by id
 */
router.delete('/:id',
  function (req, res) {
    var db = req.db;
    var id = req.params.id;

    db.query('delete from download where id = ?', id,
      function (err) {
        var status = (err === null);

        res.json(status);
      }
    );
  }
);

/**
 * refresh the list of downloads
 */
router.get('/refreshDownloads',
  function (req, res) {
    var db = req.db;
    db.query('select * from download order by id',
      function (err, rows) {
        if (!err)
          res.json(rows);
        else
          console.log('Error while performing Query.');
      }
    );
  }
);

module.exports = router;
