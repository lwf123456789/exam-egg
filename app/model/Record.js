
module.exports = app => {
    const { STRING, INTEGER, DATE } = app.Sequelize;

    const Record = app.model.define('tb_records', {
        id: {
            type: INTEGER(11),
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
        },
        user_id: {
            type: INTEGER(11),
            references: {
                model: 'tb_users',
                key: 'id',
            }
        },
        question_id: {
            type: INTEGER(11),
            references: {
                model: 'tb_questions',
                key: 'id',
            } 
        },
        type_code: {
            type: STRING(100),
            references: {
                model: 'tb_work_types',
                key: 'type_code',
            }
        },
        question_type :{
            type: STRING(100)
        },
        user_answer: {
            type: STRING(255)
        },
        is_correct: {
            type: INTEGER(1)
        },
        done_time: {
            type: DATE
        },
        user_progress: {
            type: INTEGER(11)
        }
    }, {
        timestamps: false
    });

    // 建立关联
    // Orders.associate = function () {
    //     app.model.Orders.belongsTo(app.model.Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
    // };

    return Record;
};