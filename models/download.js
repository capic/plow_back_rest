/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var Download = sequelize.define('download', {
            name: DataTypes.STRING,
            package: DataTypes.STRING,
            link: DataTypes.STRING(512),
            size_file: {
                type: DataTypes.INTEGER,
                set: function(val) {
                    var size_file = this.getDataValue('size_file');
                    if (size_file == null || size_file == 0)
                    {
                        this.setDataValue('size_file', val);
                    } else {
                        this.setDataValue('size_file', size_file);
                    }
                }
            },
            //size_file:DataTypes.INTEGER,
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
            theorical_start_datetime: {
                type: DataTypes.DATE,
                allowNull: true,
                get: function() {
                    var val = this.getDataValue('theorical_start_datetime');
                    if (val != null && val !== '') {
                        var date = new Date(val);
                        return date.getTime();
                    } else {
                        return 0;
                    }
                }
            },
            lifecycle_insert_date: DataTypes.DATE,
            lifecycle_update_date: {type: DataTypes.DATE, allowNull: true}
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