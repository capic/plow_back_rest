/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function(sequelize, DataTypes) {
  var DownloadPriority = sequelize.define('DownloadPriority', {
    translation_key: DataTypes.STRING
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'download_priority',
    classMethods: {
      associate: function(models) {
        DownloadPriority.hasMany(models.Download, {foreignKey: 'priority', as:'download_priority'})
      }
    }
  });

  return DownloadPriority;
};