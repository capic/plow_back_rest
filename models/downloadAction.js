/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var DownloadAction = sequelize.define('DownloadAction', {
        property_value: DataTypes.STRING
    }, {
        freezeTableName: true,
        createdAt: false,
        updatedAt: false,
        tableName: 'download_action',
        classMethods: {
            associate: function (models) {
                DownloadAction.hasMany(models.DownloadActionHistory, {as: 'download_action_history', foreignKey: 'download_action_id'});
                DownloadAction.belongsTo(models.Action, {
                    foreignKey: 'action_id',
                    as: 'action'
                });
                DownloadAction.belongsTo(models.Property, {
                    foreignKey: 'property_id',
                    as: 'property'
                });
            }
        }
    });

    return DownloadAction;
};