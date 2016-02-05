/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function(sequelize, DataTypes) {
  var ApplicationConfiguration = sequelize.define('ApplicationConfiguration', {
    download_activated: DataTypes.BOOLEAN
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'application_configuration'
  });

  return ApplicationConfiguration;
};