/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var Property = sequelize.define('Property', {
        name: DataTypes.STRING
    }, {
        freezeTableName: true,
        createdAt: false,
        updatedAt: false,
        tableName: 'download_action_property',
        classMethods: {
            associate: function (models) {
                Property.hasMany(models.DownloadActionHistory, {as: 'download_action_history', foreignKey: 'property_id'});
            }
        }
    });

    return Property;
};