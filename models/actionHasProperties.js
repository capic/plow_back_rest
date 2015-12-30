/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var ActionHasProperties = sequelize.define('ActionHasProperties', {
        action_id: {
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
        tableName: 'action_has_properties',
        classMethods: {
            associate: function (models) {
                ActionHasProperties.belongsTo(models.Action, {
                    foreignKey: 'action_id',
                    as: 'action',
                    onDelete: 'cascade'
                });
                ActionHasProperties.belongsTo(models.Property, {
                    foreignKey: 'property_id',
                    as: 'property'
                });
                ActionHasProperties.belongsTo(models.Directory, {
                    foreignKey: 'directory_id',
                    as: 'directory'
                });
            }
        }
    });

    return ActionHasProperties;
};