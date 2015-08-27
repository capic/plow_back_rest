/**
 * Created by Vincent on 24/08/2015.
 */
function Download(){}

Download.prototype.findAllStatus = function(req, res) {
  req.db.query('select id, name from download_status order by ord',
      function (err, rows) {
        if (!err)
          res.json(rows);
        else
          console.log('Error while performing Query.');
      }
  );
};

Download.prototype.findAll = function(req, res) {
  req.db.query('select * from download order by id',
    function (err, rows) {
      if (!err)
        return res.json(rows);
      else
        console.log('Error while performing Query.');
    }
  );
};

Download.prototype.findById = function(req, res) {
  var id = req.params.id;

  req.db.query('select * from download where id=?', [id],
      function (err, rows) {
        if (!err)
          res.json(rows);
        else
          console.log('Error while performing Query.');
      }
  );
};

Download.prototype.save = function(req, res) {
  var down = JSON.parse(JSON.stringify(req.body));

  req.db.query('insert into download set ?', down,
      function (err, rows) {
        if (err) {
          res.send(err);
        } else {
          down.id = rows.insertId;
          res.json(down);
        }
      }
  );
};

Download.prototype.modify = function(req, res) {
  var id = req.params.id;
  var down = JSON.parse(JSON.stringify(req.body));

  req.db.query('update download set ? where id = ?', [down, id],
      function (err, rows) {
        if (err) {
          res.send(err);
        } else {
          res.json(down);
        }
      }
  );
};

Download.prototype.delete = function(req, res) {
  var id = req.params.id;

  req.db.query('delete from download where id = ?', id,
      function (err) {
        var status = (err === null);

        res.json(status);
      }
  );
};

module.exports = Download;