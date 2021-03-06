/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function(sequelize, DataTypes) {
  var ActionType = sequelize.define('ActionType', {
    name: DataTypes.STRING,
    translation_key: DataTypes.STRING
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'action_type',
    classMethods: {
      associate: function(models) {
        ActionType.hasMany(models.Action, {foreignKey: 'action_type_id', as: 'action'});
        ActionType.belongsTo(models.ActionTarget, {
          foreignKey: 'action_target_id',
          as: 'action_target'
        });
        ActionType.hasMany(models.ActionTypeHasProperty, {foreignKey: 'action_type_id', as: 'action_type_has_property'});
      }
    }
  });

  return ActionType;
};