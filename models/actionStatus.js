/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function(sequelize, DataTypes) {
  var ActionStatus = sequelize.define('ActionStatus', {
    name: DataTypes.STRING,
    translation_key: DataTypes.STRING
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'action_status',
    classMethods: {
      associate: function(models) {
        ActionStatus.hasMany(models.Action, {foreignKey: 'action_status_id'});
      }
    }
  });

  return ActionStatus;
};