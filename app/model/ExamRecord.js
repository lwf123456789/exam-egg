
module.exports = app => {
    const { STRING, INTEGER, DATE } = app.Sequelize;
 
    const ExamRecord = app.model.define('tb_user_exam_records', {
        id: {
            type: INTEGER,
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
        }, 
        exam_id: {
            type: INTEGER,
            references: {
                model: 'tb_exams',
                key: 'id',
            },
        },
        user_id: {
            type: INTEGER,
            references: {
                model: 'tb_users',
                key: 'id',
            },
        },
        question_id: {
            type: INTEGER,
            references: {
                model: 'tb_questions',
                key: 'id',
            },
        },
        user_answer: {
            type: STRING(100)
        },
        question_type: {
            type: STRING(100)
        },
        is_correct: {
            type: INTEGER(1)
        },
        answer_time: {
            type: DATE
        }
    }, {
        timestamps: false
    });


    return ExamRecord;
};