
module.exports = app => {
    const { STRING, INTEGER } = app.Sequelize;

    const Option = app.model.define('tb_options', {
        id: {
            type: INTEGER,
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
        }, 
        question_id: {
            type: INTEGER,
            references: {
                model: 'tb_questions',
                key: 'id',
            },
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
            type: STRING(20)
        }
    }, {
        timestamps: false
    });

    // 建立关联
    // Orders.associate = function () {
    //     app.model.Orders.belongsTo(app.model.Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
    // };

    return Option;
};