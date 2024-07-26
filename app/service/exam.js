const { Service } = require('egg');


class ExamService extends Service {

    /**
     * 计算平均成绩
     * @param {*} userId 
     */
    async getAverageScore(userId) {
        const { ctx } = this;
        let result = await ctx.model.Exam.findOne({
            attributes: [
                [ctx.app.Sequelize.fn('AVG', ctx.app.Sequelize.col('user_score')), 'averageScore']
            ],
            where: {
                user_id: userId
            },
            raw: true
        })

        // 检查结果是否为空（即没有找到成绩），如果为空，可以决定返回0或其他逻辑
        if (!result) {
            return 0; // 假设没有成绩时返回0
        }

 
        return result.averageScore;
    }
}
 
module.exports = ExamService;