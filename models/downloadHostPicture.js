/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function(sequelize, DataTypes) {
  var DownloadHostPicture = sequelize.define('DownloadHostPicture', {
    picture: DataTypes.BLOB
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'download_host_picture'
  });

  return DownloadHostPicture;
};