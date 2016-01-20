/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var Property = sequelize.define('Property', {
        name: DataTypes.STRING,
        translation_key: DataTypes.STRING
    }, {
        freezeTableName: true,
        createdAt: false,
        updatedAt: false,
        tableName: 'property',
        classMethods: {
            associate: function (models) {
                Property.hasMany(models.ActionHasProperties, {foreignKey: 'property_id', as: 'action_has_properties'});
                Property.hasMany(models.ActionTypeHasProperty, {foreignKey: 'property_id', as: 'action_type_has_property'});
                Property.belongsTo(models.PropertyType, {foreignKey: 'property_type_id', as: 'property_type'});
            }
        }
    });

    return Property;
};