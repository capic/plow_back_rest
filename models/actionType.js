/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function(sequelize, DataTypes) {
  var ActionType = sequelize.define('ActionType', {
    name: DataTypes.STRING
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'action_status',
    classMethods: {
      associate: function(models) {
        ActionType.hasMany(models.Action, {foreignKey: 'action_type_id'});
        ActionType.hasMany(models.ActionIsComposedByProperty, {foreignKey: 'action_type_id'});
      }
    }
  });

  return ActionType;
};