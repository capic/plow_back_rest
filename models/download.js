/**
 * Created by Vincent on 27/08/2015.
 */
module.exports = function (sequelize, DataTypes) {
    var Download = sequelize.define('download', {
            name: DataTypes.STRING,
            package: DataTypes.STRING,
            link: DataTypes.STRING(512),
            size_file: DataTypes.INTEGER,
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
            //infos_plowdown: DataTypes.TEXT,
            theorical_start_datetime: {type: DataTypes.DATE, allowNull: true},
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