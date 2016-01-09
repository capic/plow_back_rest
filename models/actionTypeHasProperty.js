/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var ActionTypeHasProperty = sequelize.define('ActionTypeHasProperty', {
        action_type_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        property_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        editable: DataTypes.BOOLEAN
    }, {
        freezeTableName: true,
        createdAt: false,
        updatedAt: false,
        tableName: 'action_type_has_properties',
        classMethods: {
            associate: function (models) {
                ActionTypeHasProperty.belongsTo(models.ActionType, {
                    foreignKey: 'action_type_id',
                    as: 'action_type'
                });
                ActionTypeHasProperty.belongsTo(models.Property, {
                    foreignKey: 'property_id',
                    as: 'property'
                });
            }
        }
    });

    return ActionTypeHasProperty;
};