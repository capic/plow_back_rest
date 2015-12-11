/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var DownloadAction = sequelize.define('DownloadAction', {
        name: DataTypes.STRING
    }, {
        freezeTableName: true,
        createdAt: false,
        updatedAt: false,
        tableName: 'download_action',
        classMethods: {
            associate: function (models) {
                DownloadAction.hasMany(models.DownloadActionHistory, {foreignKey: 'download_action_id'});
                DownloadAction.hasMany(models.DownloadActionComposedByProperties, {as: 'download_action_composed_by_properties', foreignKey: 'download_action_id'})
            }
        }
    });

    return DownloadAction;
};