/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var DownloadActionComposedByProperties = sequelize.define('DownloadActionComposedByProperties', {
        download_action_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        download_action_property_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        property_value: DataTypes.STRING
    }, {
        freezeTableName: true,
        createdAt: false,
        updatedAt: false,
        tableName: 'download_action_composed_by_download_action_properties',
        classMethods: {
            associate: function (models) {
                DownloadActionComposedByProperties.belongsTo(models.DownloadAction, {
                    foreignKey: 'download_action_id',
                    as: 'download_action'
                });
                DownloadActionComposedByProperties.belongsTo(models.DownloadActionProperty, {
                    foreignKey: 'download_action_property_id',
                    as: 'download_action_property'
                });
            }
        }
    });

    return DownloadActionComposedByProperties;
};