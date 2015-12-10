/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var DownloadActionHistory = sequelize.define('DownloadActionHistory', {
        download_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },

        download_action_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        num: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        lifecycle_insert_date: DataTypes.DATE,
        lifecycle_update_date: DataTypes.DATE
    }, {
        freezeTableName: true,
        createdAt: false,
        updatedAt: false,
        tableName: 'download_action_history',
        classMethods: {
            associate: function (models) {
                DownloadActionHistory.belongsTo(models.DownloadActionStatus, {
                    foreignKey: 'download_action_status_id',
                    as: 'download_action_status'
                });
                DownloadActionHistory.belongsTo(models.DownloadAction, {
                    foreignKey: 'download_action_id',
                    as: 'download_action'
                });
                DownloadActionHistory.belongsTo(models.Download, {
                    foreignKey: 'download_id',
                    as: 'download'
                });
            }
        }
    });

    return DownloadActionHistory;
};