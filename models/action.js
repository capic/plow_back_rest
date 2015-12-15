/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var Action = sequelize.define('Action', {
        lifecycle_insert_date: DataTypes.DATE,
        lifecycle_update_date: DataTypes.DATE
    }, {
        freezeTableName: true,
        createdAt: false,
        updatedAt: false,
        tableName: 'action',
        classMethods: {
            associate: function (models) {
                Action.belongsTo(models.ActionTypeIsComposedByProperty, {
                    foreignKey: 'action_type_id',
                    as: 'action_type'
                });
                Action.belongsTo(models.ActionStatus, {
                    foreignKey: 'action_status_id',
                    as: 'action_status'
                });
                Action.belongsTo(models.Download, {
                    foreignKey: 'download_id',
                    as: 'download'
                });
            }
        }
    });

    return Action;
};