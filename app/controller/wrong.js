const { Controller } = require('egg');
const { literal } = require('sequelize');

class WrongController extends Controller {
    //获取下一道错题
    async getWrongNextQuestion() {
        const { ctx } = this;
        const { userId, questionId } = ctx.request.body;
        let nextQuestion = await this.service.wrong.getWrongNextQuestion(userId, questionId);
 
        if (nextQuestion) {
            ctx.body = {
                success: true,
                message: '获取成功！',
                nextQuestion
            }
        } else {
            ctx.body = {
                success: false,
                message: '已经没有错题了！'
            }
        }
    }

    //获取上一道错题
    async getWrongPreviousQuestion() {
        const { ctx } = this;
        const { userId, questionId } = ctx.request.body;
        let previousQuestion = await this.service.wrong.getWrongPreviousQuestion(userId, questionId);

        if (previousQuestion) {
            ctx.body = {
                success: true,
                message: '获取成功！',
                previousQuestion
            }
        } else {
            ctx.body = {
                success: false,
                message: '已经没有错题了！'
            }
        }
    }

    //点击错题选项
    async doWrongAnswer() {
        const { ctx } = this;
        const { userId, questionId, answer } = ctx.request.body;
        let answerInfo = await this.service.wrong.doWrongAnswer(userId, questionId, answer);
        if (answerInfo) {
            ctx.body = {
                success: true,
                message: '成功！',
                answer: answerInfo
            }
        } else {
            ctx.body = {
                success: false,
                message: '失败！'
            }
        }
    }

    //删除错题记录
    async deleteWrong() {
        const { ctx } = this;
        const { userId, questionId } = ctx.request.body;

        // 查找指定的错题记录
        const wrongInfo = await ctx.model.Wrong.findOne({
            where: {
                user_id: userId,
                question_id: questionId
            }
        });

        if (!wrongInfo) {
            // 如果没有找到指定的错题记录，返回相应的响应
            ctx.body = { success: false, message: '未找到指定的错题记录' };
            return;
        }

        const userProgress = wrongInfo.user_progress;

        // 查找用户的第一道错题的 user_progress
        const firstWrongRecord = await ctx.model.Wrong.findOne({
            where: { user_id: userId },
            order: [['user_progress', 'ASC']],
            limit: 1,
            raw: true
        });

        // 判断是否删除的是第一道错题
        const isDeletingFirstWrong = firstWrongRecord && firstWrongRecord.user_progress === userProgress;

        // 删除当前错题记录
        await wrongInfo.destroy();

        // 更新后续错题记录的 user_progress，使其递减1
        await ctx.model.Wrong.update(
            { user_progress: literal('user_progress - 1') },
            {
                where: {
                    user_id: userId,
                    user_progress: {
                        [ctx.model.Sequelize.Op.gt]: userProgress
                    }
                }
            }
        );

        let previousWrongInfo;
        if (isDeletingFirstWrong) {
            // 如果删除的是第一道错题，则尝试获取当前最小的 user_progress 对应的下一道错题
            previousWrongInfo = await ctx.model.Wrong.findOne({
                where: { user_id: userId },
                order: [['user_progress', 'ASC']],
                limit: 1,
                raw: true
            });
        } else {
            // 查找更新后的上一道错题
            previousWrongInfo = await ctx.model.Wrong.findOne({
                where: {
                    user_id: userId,
                    user_progress: userProgress - 1
                },
                raw: true
            });
        }

        if (previousWrongInfo) {
            previousWrongInfo.id = previousWrongInfo.question_id;
            delete previousWrongInfo.question_id;
        }

        // 统计错题总数
        const wrongTotal = await ctx.model.Wrong.count({
            where: { user_id: userId }
        });

        previousWrongInfo.wrongTotal = wrongTotal;

        previousWrongInfo = processOptionsText(previousWrongInfo);
        // 返回删除成功的响应和更新后的上一条或下一条错题记录的信息（如果存在）
        ctx.body = {
            success: true,
            message: '错题记录删除成功',
            previousWrongInfo
        };
    }

 
    async deleteAllWrong() {
        const { ctx } = this;
        const { userId, code } = ctx.request.body;
        let allWrong = await this.service.wrong.deleteAllWrong(userId, code);

        ctx.body = { allWrong };
    }
}


/**
    * 处理错题中的选项文本
    * @param {Object} wrongQuestion 错题对象
    * @returns {Object} 处理后的错题对象
    */
function processOptionsText(wrongQuestion) {
    if (!wrongQuestion) return null;

    // 假设选项文本存储在 'question_option' 字段中
    wrongQuestion.options_option_text = wrongQuestion['question_option'];

    // 检查 options_option_text 是否为空或不存在
    if (wrongQuestion.options_option_text && wrongQuestion.options_option_text.trim() !== '') {
        // 替换单引号为双引号
        let optionsText = wrongQuestion.options_option_text.replace(/'/g, '"');

        try {
            // 解析字符串为数组
            let optionsArray = JSON.parse(optionsText);
            wrongQuestion.options_option_text = optionsArray;
        } catch (error) {
            console.error("解析错误：", error);
            // 在解析错误的情况下，可以选择设置为空数组或保持原始格式
            wrongQuestion.options_option_text = [];
        }
    } else {
        // 如果 options_option_text 为空，则直接设置为空数组
        wrongQuestion.options_option_text = [];
    }

    // 删除原始的 'question_option' 字段
    delete wrongQuestion['question_option'];

    return wrongQuestion;
}


module.exports = WrongController;