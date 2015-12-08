/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function(sequelize, DataTypes) {
  var DownloadActionStatus = sequelize.define('DownloadActionStatus', {
    name: DataTypes.STRING
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'download_action_status',
    classMethods: {
      associate: function(models) {
        DownloadActionStatus.hasMany(models.DownloadActionHistory, {foreignKey: 'download_action_status_id', as:'download_action_status'});
      }
    }
  });

  return DownloadActionStatus;
};