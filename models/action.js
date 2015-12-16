/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var Action = sequelize.define('Action', {
        download_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
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
        property_value: DataTypes.STRING,
        lifecycle_insert_date: DataTypes.DATE,
        lifecycle_update_date: DataTypes.DATE
    }, {
        freezeTableName: true,
        createdAt: false,
        updatedAt: false,
        tableName: 'action',
        classMethods: {
            associate: function (models) {
                Action.belongsTo(models.ActionStatus, {
                    foreignKey: 'action_status_id',
                    as: 'action_status'
                });
                Action.belongsTo(models.Download, {
                    foreignKey: 'download_id',
                    as: 'download'
                });
                Action.belongsTo(models.ActionType, {
                    foreignKey: 'action_type_id',
                    as: 'action_type'
                });
                Action.belongsTo(models.Property, {
                    foreignKey: 'property_id',
                    as: 'property'
                });
                Action.belongsTo(models.Directory, {
                    foreignKey: 'directory_id',
                    as: 'directory'
                });
            }
        }
    });

    return Action;
};