/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function(sequelize, DataTypes) {
  var ApplicationConfiguration = sequelize.define('ApplicationConfiguration', {
      id_application: {
          type: DataTypes.INTEGER,
          primaryKey: true
      },
      download_activated: DataTypes.BOOLEAN,
      api_log_database_level: DataTypes.INTEGER,
      python_log_level: DataTypes.INTEGER,
      python_log_format: DataTypes.STRING,
      python_log_console_level: DataTypes.INTEGER,
      notification_address: DataTypes.STRING,
      lifecycle_insert_date: DataTypes.DATE,
      lifecycle_update_date: DataTypes.DATE
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'application_configuration',
    classMethods: {
        associate: function (models) {
            ApplicationConfiguration.belongsTo(models.Directory, {
                foreignKey: 'python_log_directory_id',
                as: 'python_log_directory'
            });
            ApplicationConfiguration.belongsTo(models.Directory, {
                foreignKey: 'python_directory_download_temp_id',
                as: 'python_directory_download_temp'
            });
            ApplicationConfiguration.belongsTo(models.Directory, {
                foreignKey: 'python_directory_download_text_id',
                as: 'python_directory_download_text'
            });
            ApplicationConfiguration.belongsTo(models.Directory, {
                foreignKey: 'python_directory_download_id',
                as: 'python_directory_download'
            });
        }
    }
  });

  return ApplicationConfiguration;
};