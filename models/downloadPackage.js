/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function(sequelize, DataTypes) {
  var DownloadPackage = sequelize.define('DownloadPackage', {
    name: DataTypes.STRING,
    unrar_progress: DataTypes.INTEGER
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'download_package',
    classMethods: {
      associate: function(models) {
        DownloadPackage.hasMany(models.Download, {foreignKey: 'package_id', as:'download_package'});
        DownloadPackage.hasMany(models.Action, {foreignKey: 'download_package_id'});
      }
    }
  });

  return DownloadPackage;
};