/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function(sequelize, DataTypes) {
  var DownloadAction = sequelize.define('DownloadAction', {
    name: DataTypes.STRING
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'download_action',
    classMethods: {
      associate: function(models) {
        DownloadAction.hasMany(models.Download)
      }
    }
  });

  return DownloadAction;
};