/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function(sequelize, DataTypes) {
  var PropertyType = sequelize.define('PropertyType', {
    name: DataTypes.STRING
  }, {
    freezeTableName: true,
    createdAt: false,
    updatedAt: false,
    tableName: 'action_type',
    classMethods: {
      associate: function(models) {
        PropertyType.hasMany(models.Property, {foreignKey: 'property_type_id', as: 'property'});
      }
    }
  });

  return PropertyType;
};