/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var ActionTypeIsComposedByProperty = sequelize.define('ActionTypeIsComposedByProperty', {
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
        property_value: DataTypes.STRING
    }, {
        freezeTableName: true,
        createdAt: false,
        updatedAt: false,
        tableName: 'action_type_is_composed_by_property',
        classMethods: {
            associate: function (models) {
                ActionTypeIsComposedByProperty.belongsTo(models.Action, {
                    foreignKey: 'action_id',
                    as: 'action'
                });
                ActionTypeIsComposedByProperty.belongsTo(models.ActionType, {
                    foreignKey: 'action_type_id',
                    as: 'action_type'
                });
                ActionTypeIsComposedByProperty.belongsTo(models.Property, {
                    foreignKey: 'property_id',
                    as: 'property'
                });
                ActionTypeIsComposedByProperty.belongsTo(models.Directory, {
                    foreignKey: 'directory_id',
                    as: 'directory'
                });
            }
        }
    });

    return ActionTypeIsComposedByProperty;
};