
module.exports = app => {
    const { STRING, INTEGER } = app.Sequelize;
 
    const Question = app.model.define('tb_questions', {
        id: {
            type: INTEGER,
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
        },
        question_text: {
            type: STRING(255)
        },
        correct_answer: {
            type: STRING(20)
        },
        correct_answer: {
            type: STRING(20)
        },
        special_work_type_code: {
            type: STRING(100),
            references: {
                model: 'tb_work_types',
                key: 'type_code',
            },
        }
    }, {
        timestamps: false
    });

    //建立关联
    Question.associate = function () {
        app.model.Question.hasMany(app.model.Option, { foreignKey: 'question_id', as: 'options' });
    };


    return Question;
};