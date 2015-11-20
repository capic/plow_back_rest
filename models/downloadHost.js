/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function(sequelize, DataTypes) {
  var DownloadHost = sequelize.define('DownloadHost', {
    name: DataTypes.STRING,
    logo: DataTypes.STRING
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'download_directory',
    classMethods: {
      associate: function(models) {
        DownloadHost.hasMany(models.Download, {foreignKey: 'host_id', as:'download_host'})
      }
    }
  });

  return DownloadHost;
};