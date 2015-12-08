/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var Download = sequelize.define('Download', {
            name: DataTypes.STRING,
            package_id: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            link: DataTypes.STRING(512),
            size_file: {
                type: DataTypes.INTEGER,
                set: function (val) {
                    var size_file = this.getDataValue('size_file');
                    if (size_file == null || size_file == 0) {
                        this.setDataValue('size_file', val);
                    } else {
                        this.setDataValue('size_file', size_file);
                    }
                }
            },
            size_part: DataTypes.INTEGER,
            size_file_downloaded: DataTypes.INTEGER,
            size_part_downloaded: DataTypes.INTEGER,
            status: DataTypes.INTEGER,
            progress_part: DataTypes.INTEGER,
            average_speed: DataTypes.INTEGER,
            current_speed: DataTypes.INTEGER,
            time_spent: DataTypes.INTEGER,
            time_left: DataTypes.INTEGER,
            pid_plowdown: DataTypes.INTEGER,
            pid_curl: DataTypes.INTEGER,
            pid_python: DataTypes.INTEGER,
            file_path: DataTypes.STRING(2048),
            priority: DataTypes.INTEGER,
            theorical_start_datetime: DataTypes.DATE,
            lifecycle_insert_date: DataTypes.DATE,
            lifecycle_update_date: DataTypes.DATE
        },
        {
            freezeTableName: true,
            tableName: 'download',
            createdAt: false,
            updatedAt: false,
            getterMethods: {
                progress_file: function () {
                    var progress = 0;
                    if (this.size_file > 0) {
                        progress = parseInt((this.size_file_downloaded * 100) / this.size_file);
                    }
                    return progress
                }
            },
            classMethods: {
                associate: function (models) {
                    Download.belongsTo(models.DownloadPackage, {
                        foreignKey: 'package_id',
                        as: 'download_package'
                    });
                    Download.belongsTo(models.DownloadDirectory, {
                        foreignKey: 'directory_id',
                        as: 'download_directory'
                    });
                    Download.belongsTo(models.DownloadDirectory, {
                        foreignKey: 'to_move_directory_id',
                        as: 'to_move_download_directory'
                    });
                    Download.belongsTo(models.DownloadHost, {
                        foreignKey: 'host_id',
                        as: 'download_host'
                    });
                    Download.hasMany(models.DownloadActionHistory, {foreignKey: 'download_id'});
                }
            }
        });

    return Download;
};