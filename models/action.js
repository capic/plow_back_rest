/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var Action = sequelize.define('Action', {
        lifecycle_insert_date: DataTypes.DATE,
        lifecycle_update_date: DataTypes.DATE,
        order: DataTypes.INTEGER
    }, {
        freezeTableName: true,
        createdAt: false,
        updatedAt: false,
        tableName: 'action',
        classMethods: {
            associate: function (models) {
                Action.belongsTo(models.Download, {
                    foreignKey: 'download_id',
                    as: 'download'
                });
                Action.belongsTo(models.DownloadPackage, {
                    foreignKey: 'download_package_id',
                    as: 'download_package'
                });
                Action.belongsTo(models.ActionStatus, {
                    foreignKey: 'action_status_id',
                    as: 'action_status'
                });
                Action.belongsTo(models.ActionType, {
                    foreignKey: 'action_type_id',
                    as: 'action_type'
                });
                Action.hasMany(models.ActionHasProperties, {foreignKey: 'action_id', as: 'action_has_properties'});
            }
        }
    });

    return Action;
};