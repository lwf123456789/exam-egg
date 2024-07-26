
module.exports = app => {
    const { STRING, INTEGER, FLOAT, DATE } = app.Sequelize;
 
    const Exam = app.model.define('tb_exams', {
        id: { 
            type: INTEGER,
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
        },
        user_id: {
            type: INTEGER,
            references: {
                model: 'tb_users',
                key: 'id',
            },
        },
        type_code: {
            type: STRING(100)
        },
        total_questions: {
            type: INTEGER
        },
        status: {
            type: STRING(20)
        },
        total_score: {
            type: FLOAT
        },
        user_score: {
            type: FLOAT
        },
        start_time: {
            type: DATE
        },
        end_time: {
            type: DATE
        },
    }, {
        timestamps: false
    });


    return Exam;
};