const { Controller } = require('egg');

class QuestionController extends Controller {

    //选择城市和工种获取数据
    async getUserDoQuesitonByCode() {
        const { ctx } = this;
        const { userId, province, code } = ctx.request.body;
        let user = await this.service.user.findUserByUserId(userId);
        if (!user) {
            ctx.body = {
                success: false,
                message: '获取失败，账号是否有登陆'
            }
            return;
        }
        if (!province) {
            ctx.body = {
                success: false,
                message: '获取失败，未设置地区'
            }
            return;
        }
        if (!code) {
            ctx.body = {
                success: false,
                message: '获取失败，未设置工种编号'
            }
            return;
        }

        await ctx.model.User.update({ province }, {
            where: { id: userId }
        });

        //用户最后一道题的记录
        const lastRecord = await this.service.record.findLastRecord(userId, code);

        //返回错题第一道题，方便获取下一道错题
        const wrongQuestion = await this.service.wrong.getWrongQuestion(userId, code);

        //返回收藏第一道题
        const collectQuestion = await this.service.collection.getFirstColection(userId, code);

        let wrongTotal = await ctx.model.Wrong.count({
            where: {
                user_id: userId,
                type_code: code
            }
        })

        // let collectTotal = await ctx.model.Collection.count({
        //     where: {
        //         user_id: userId
        //     }
        // })

        //题库的数量
        const total = await ctx.model.Question.count({
            where: {
                special_work_type_code: code
            }
        })

        // 新用户或没有做题记录的处理
        if (!lastRecord) {
            //查找指定的code最小id的题目,表示首题
            let fistQuestion = await this.service.question.findFirstQuestion(code);
            fistQuestion.isCollected = 0;
            ctx.body = {
                success: true,
                message: '题库选择成功',
                data: {
                    progress: 1, //进度为1
                    fistQuestion: fistQuestion,
                    wrongQuestion: wrongQuestion,
                    total: total,
                    wrongTotal: 0,
                    collectTotal: 0
                }
            };
            return;
        }



        //用户的做题进度
        const progress = lastRecord.recordProgress;

        // 查询用户是否收藏了最后一道题
        const isQuestionCollected = await this.service.collection.checkQuestionCollection(userId, lastRecord.id);

        //获取首页平均成绩
        const averageScore = await this.service.exam.getAverageScore(userId);

        console.log(averageScore);
        // 将收藏信息添加到 lastRecord 对象中
        lastRecord.isCollected = isQuestionCollected;

        ctx.body = {
            success: true,
            message: '题库选择成功',
            data: {
                fistQuestion: lastRecord,
                wrongQuestion: wrongQuestion,
                collectQuestion: collectQuestion,
                progress: progress,
                total: total,
                wrongTotal: wrongTotal,
                averageScore: averageScore
            }
        };
    }
 
    //用户点击选项
    async doneAnswer() {
        const { ctx } = this;
        const { userId, answer, questionId } = ctx.request.body;
        let row = await this.service.question.doneAnswer(userId, answer, questionId);

        ctx.body = {
            row
        }
    }

    //用户点击下一题，获取下一题的题目
    async getNextQuestion() {
        const { ctx } = this;
        const { questionId, userId } = ctx.request.body;
        let nextQuestion = await this.service.question.getNextQuestion(userId, questionId);

        let nextQuestionId = parseInt(questionId) + 1;

        let collect = await this.service.collection.checkQuestionCollection(userId, nextQuestionId);

        nextQuestion.isCollected = collect;

        if (nextQuestion) {
            ctx.body = {
                success: true,
                message: '获取成功！',
                nextQuestion
            }
        } else {
            ctx.body = {
                success: false,
                message: '没有下一题了！',
            }
        }

    }

    //用户点击上一题，获取上一题的题目
    async getPreviousQuestion() {
        const { ctx } = this;
        const { questionId, userId } = ctx.request.body;

        let previousQuestion = await this.service.question.getPreviousQuestion(userId, questionId);

        let previousQuestionId = parseInt(questionId) - 1;

        let collect = await this.service.collection.checkQuestionCollection(userId, previousQuestionId);

        previousQuestion.isCollected = collect;

        if (previousQuestion) {
            ctx.body = {
                success: true,
                message: '获取成功！',
                previousQuestion
            }
        } else {
            ctx.body = {
                success: false,
                message: '没有上一题了！',
            }
        }
    }



}

module.exports = QuestionController;
