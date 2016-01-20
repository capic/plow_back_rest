/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function(sequelize, DataTypes) {
  var ActionTarget = sequelize.define('ActionTarget', {
    name: DataTypes.STRING,
    translation_key: DataTypes.STRING
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'action_target',
    classMethods: {
      associate: function(models) {
        ActionTarget.hasMany(models.ActionType, {foreignKey: 'action_target_id'});
      }
    }
  });

  return ActionTarget;
};