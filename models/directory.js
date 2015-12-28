/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function(sequelize, DataTypes) {
  var Directory = sequelize.define('Directory', {
    path: DataTypes.STRING
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'directory',
    classMethods: {
      associate: function(models) {
        Directory.hasMany(models.ActionHasProperties, {foreignKey: 'directory_id'});
      }
    }
  });

  return Directory;
};