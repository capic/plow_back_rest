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
    tableName: 'action_type',
    classMethods: {
      associate: function(models) {
        ActionType.hasMany(models.ActionTypeIsComposedByProperty, {foreignKey: 'action_type_id', as: 'action_type_is_composed_by_property'});
      }
    }
  });

  return ActionType;
};