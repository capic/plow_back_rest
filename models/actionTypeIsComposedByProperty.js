/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var ActionIsComposedByProperty = sequelize.define('ActionIsComposedByProperty', {
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
        tableName: 'action',
        classMethods: {
            associate: function (models) {
                ActionIsComposedByProperty.belongsTo(models.ActionType, {
                    foreignKey: 'action_type_id',
                    as: 'action_type'
                });
                ActionIsComposedByProperty.belongsTo(models.Property, {
                    foreignKey: 'property_id',
                    as: 'property'
                });
                ActionIsComposedByProperty.belongsTo(models.Directory, {
                    foreignKey: 'directory_id',
                    as: 'directory'
                });
            }
        }
    });

    return ActionIsComposedByProperty;
};