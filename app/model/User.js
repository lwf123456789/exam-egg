'use strict';

module.exports = app => {
    const {
        STRING,INTEGER,DATE
    } = app.Sequelize;
 
    const User = app.model.define('tb_users', {
        id: {
            type: INTEGER(11),
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
        },
        open_id: STRING(255),
        nickname: STRING(255),
        phone: STRING(11),
        status: INTEGER(1),
        province: STRING(20),
        create_time: DATE
    }, {
        timestamps: false, // 不需要默认的 createdAt 和 updatedAt 字段
    });
    

    return User;
};