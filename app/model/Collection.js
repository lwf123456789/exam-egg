
module.exports = app => {
    const { INTEGER, DATE, STRING } = app.Sequelize;
 
    const Collection = app.model.define('tb_collections', {
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
        is_collect: {
            type: INTEGER(1)
        },
        type_code: {
            type: STRING(100)
        },
        user_progress: {
            type: INTEGER(11)
        },
        created_time: {
            type: DATE
        }
    }, {
        timestamps: false
    });

    return Collection;
};