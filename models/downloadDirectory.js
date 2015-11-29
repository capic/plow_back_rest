/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function(sequelize, DataTypes) {
  var DownloadDirectory = sequelize.define('DownloadDirectory', {
    path: DataTypes.STRING
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'download_directory',
    classMethods: {
      associate: function(models) {
        DownloadDirectory.hasMany(models.Download, {foreignKey: 'directory_id', as:'download_directory'})
        DownloadDirectory.hasMany(models.Download, {foreignKey: 'to_move_directory_id', as:'to_move_download_directory'})
      }
    }
  });

  return DownloadDirectory;
};