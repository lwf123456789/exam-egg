
module.exports = app => {
    const { STRING, INTEGER, DATE, TEXT } = app.Sequelize;

    const Wrong = app.model.define('tb_wrong_lists', {
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
            type: STRING(100)
        },
        correct_answer: {
            type: STRING(100)
        },
        question_type: {
            type: STRING(100)
        },
        question_text: {
            type: STRING(255)
        },
        question_option: {
            type: TEXT
        },
        wrong_time: {
            type: DATE
        },
        user_progress: {
            type: INTEGER(11)
        }
    }, {
        timestamps: false
    });
 

    return Wrong;
};