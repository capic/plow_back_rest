/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function(sequelize, DataTypes) {
  var DownloadStatus = sequelize.define('downloadStatus', {
    name: DataTypes.STRING,
    ord: DataTypes.INTEGER
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'download_status'/*,
    classMethods: {
      associate: function(models) {
        DownloadStatus.hasMany(models.download)
      }
    }*/
  });

  return DownloadStatus;
};