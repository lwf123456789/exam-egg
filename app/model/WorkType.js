
module.exports = app => {
    const { STRING } = app.Sequelize;

    const WorkType = app.model.define('tb_work_types', {
        type_code: {
            type: STRING(100),
            primaryKey: true,
            allowNull: false
        },
        type_name: {
            type: STRING(100)
        }
    }, {
        timestamps: false
    });
 
    // 建立关联
    // Orders.associate = function () {
    //     app.model.Orders.belongsTo(app.model.Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
    // };

    return WorkType;
};