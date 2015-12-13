/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var Action = sequelize.define('Action', {
        name: DataTypes.STRING
    }, {
        freezeTableName: true,
        createdAt: false,
        updatedAt: false,
        tableName: 'download_action_composed_by_download_action_properties',
        classMethods: {
            associate: function (models) {
                Action.hasMany(models.DownloadActionHistory, {as: 'download_action_history', foreignKey: 'action_id'});
            }
        }
    });

    return Action;
};