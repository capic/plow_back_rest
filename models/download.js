/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, Sequelize) {
    var Download = sequelize.define('download', {
            name: Sequelize.STRING,
            package: Sequelize.STRING,
            link: Sequelize.STRING(512),
            size_file: {
                type: Sequelize.INTEGER,
                set: function (val) {
                    var size_file = this.getDataValue('size_file');
                    if (size_file == null || size_file == 0) {
                        this.setDataValue('size_file', val);
                    } else {
                        this.setDataValue('size_file', size_file);
                    }
                }
            },
            size_part: Sequelize.INTEGER,
            size_file_downloaded: Sequelize.INTEGER,
            size_part_downloaded: Sequelize.INTEGER,
            status: Sequelize.INTEGER,
            progress_part: Sequelize.INTEGER,
            average_speed: Sequelize.INTEGER,
            current_speed: Sequelize.INTEGER,
            time_spent: Sequelize.INTEGER,
            time_left: Sequelize.INTEGER,
            pid_plowdown: Sequelize.INTEGER,
            pid_curl: Sequelize.INTEGER,
            pid_python: Sequelize.INTEGER,
            file_path: Sequelize.STRING(2048),
            priority: Sequelize.INTEGER,
            theorical_start_datetime: Sequelize.DATE,
            lifecycle_insert_date: Sequelize.DATE,
            lifecycle_update_date: Sequelize.DATE
        },
        {
            freezeTableName: true,
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
            }
            /*,
             classMethods: {
             associate: function(models) {
             Download.belongsTo(models.downloadStatus, {
             foreignKey: {
             allowNull: false
             }
             });
             }
             }*/
        });

    return Download;
};