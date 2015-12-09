/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var DownloadActionProperty = sequelize.define('DownloadActionProperty', {
        name: DataTypes.STRING
    }, {
        freezeTableName: true,
        createdAt: false,
        updatedAt: false,
        tableName: 'download_action_property',
        classMethods: {
            associate: function (models) {
                DownloadActionProperty.hasMany(models.DownloadActionHistory, {foreignKey: 'download_action_property_id'});
            }
        }
    });

    return DownloadActionProperty;
};