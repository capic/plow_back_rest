/**
 * Created by Vincent on 24/08/2015.
 */
function Download(){};

Download.prototype.findAll = function(db, req, res) {
  db.query('select * from download order by id',
    function (err, rows) {
      if (!err)
        return res.json(rows);
      else
        console.log('Error while performing Query.');
    }
  );
};