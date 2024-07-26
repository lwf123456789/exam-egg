// app/schedule/check_exam.js
module.exports = {
    schedule: {
        interval: '15m', // 5分钟间隔
        type: 'all', // 指定所有的 worker 都需要执行
    },
    async task(ctx) {
        console.log('正在自动检测考试系统');
        const exams = await ctx.model.Exam.findAll({
            where: {
                status: '进行中',
                end_time: {
                    [ctx.app.Sequelize.Op.lt]: new Date(), // 查找已经结束但状态未更新的考试
                },
            },
        });
 
        for (const exam of exams) {
            // 查询此次考试的所有答题记录
            const answers = await ctx.model.ExamRecord.findAll({
                where: {
                    exam_id: exam.id,
                    is_correct: true // 只计算正确答案的分数
                },
            });

            // 计算总分
            let score = 0;
            answers.forEach(answer => {
                if (answer.question_type === '判断题' || answer.question_type === '单选题') {
                    score += 1; // 判断题和单选题每题1分
                } else if (answer.question_type === '多选题') {
                    score += 2; // 多选题每题2分
                }
            });

            // 更新考试记录的成绩和状态
            await exam.update({
                user_score: score,
                status: '已完成'
            });

            console.log(`考试 ${exam.id} 处理完成，总分：${score}`);
        }
    }
};
