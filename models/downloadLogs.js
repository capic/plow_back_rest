/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function(sequelize, DataTypes) {
  var DownloadLogs = sequelize.define('downloadLogs', {
    logs: DataTypes.STRING
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'download_logs'/*,
    classMethods: {
      associate: function(models) {
        DownloadStatus.hasMany(models.download)
      }
    }*/
  });

  return DownloadLogs;
};