/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var DownloadActionHistory = sequelize.define('DownloadActionHistory', {
        percentage: DataTypes.INTEGER,
        time_left: DataTypes.INTEGER,
        lifecycle_insert_date: DataTypes.DATE,
        lifecycle_update_date: DataTypes.DATE
    }, {
        freezeTableName: true,
        createdAt: false,
        updatedAt: false,
        tableName: 'download_action_history'
    });

    return DownloadActionHistory;
};