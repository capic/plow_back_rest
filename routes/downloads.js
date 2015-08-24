var express = require('express');
var router = express.Router();

router.get('/status',
    function (req, res, next) {
        var db = req.db;
        db.query('select id, name from download_status order by ord',
            function (err, rows) {
                db.end();
                if (!err)
                    res.json(rows);
                else
                    console.log('Error while performing Query.');
            }
        );
    }
);

/* GET downloads listing. */
router.get('/',
    function (req, res, next) {
        var db = req.db;
        db.query('select * from download order by id',
            function (err, rows) {
                db.end();
                if (!err)
                    res.json(rows);
                else
                    console.log('Error while performing Query.');
            }
        );
    }
);

router.get('/:id',
    function (req, res, next) {
        var db = req.db;
        var id = req.params.id;
        db.query('select * from download where id=?', [id],
            function (err, rows) {
                db.end();
                if (!err)
                    res.json(rows);
                else
                    console.log('Error while performing Query.');
            }
        );
    }
);

router.post('/',
    function (req, res) {
        var db = req.db;
        var down = JSON.parse(JSON.stringify(req.body));

        db.query('insert into download set ?', down,
            function(err, rows) {
                if (err) {
                    res.send(err);
                } else {
                    down.id = rows.insertId;
                    res.json(down);
                }
            }
        )
    }
);

router.put('/:id',
    function(req, res) {
        var db = req.db;
        var id = req.params.id;
        var down = JSON.parse(JSON.stringify(req.body));

        db.query('update download set ? where id = ?', [down, id],
            function(err, rows) {
                if (err) {
                    res.send(err);
                } else {
                    res.json(down);
                }
            }
        );
    }
);

router.delete('/:id',
    function(req, res) {
        var db = req.db;
        var id = req.params.id;

        db.query('delete from download where id = ?', id,
            function(err) {
                if (err) {
                    status = false;
                } else {
                    status = true;
                }

                res.json(status);
            }
        );
    }
);

module.exports = router;
