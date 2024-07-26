const { Service } = require('egg');


class RecordService extends Service {
    /**
     * 获取指定工种第一道题
     * @param {*} userId 
     * @param {*} code 
     * @returns 
     */
    async findLastRecord(userId, code) {
        const { ctx } = this;
        //用户最后一道题的记录
        const lastRecord = await ctx.model.Record.findOne({
            where: {
                user_id: userId,
                type_code: code
            },
            order: [['done_time', 'DESC']],
            limit: 1
        });

        if (lastRecord) {
            let recordProgress = await ctx.model.Record.findOne({
                attributes:['user_progress'],
                where: {
                    user_id: userId,
                    type_code: code,
                    question_id: lastRecord.question_id
                } 
            })
            let nextQuestionId = lastRecord.question_id + 1;
            // 获取下一道题及其选项
            const nextQuestion = await ctx.model.Question.findOne({
                attributes: ['id', 'question_text', 'question_type', 'special_work_type_code'],
                where: { id: nextQuestionId, special_work_type_code: code },
                raw: true,
                include: [{
                    model: ctx.model.Option,
                    as: 'options',
                    attributes: ['option_text'],
                    required: false// 使用 required: false 来确保即使没有匹配的选项，也会返回结果
                }]
            });
            nextQuestion.recordProgress = recordProgress.user_progress + 1;

            // 直接将数组赋值给 options_option_text 字段
            nextQuestion.options_option_text = nextQuestion['options.option_text'];


            // 检查 options_option_text 是否为空或不存在
            if (nextQuestion.options_option_text && nextQuestion.options_option_text.trim() !== '') {
                // 替换单引号为双引号
                let optionsText = nextQuestion.options_option_text.replace(/'/g, '"');

                try {
                    // 解析字符串为数组
                    let optionsArray = JSON.parse(optionsText);
                    nextQuestion.options_option_text = optionsArray;
                } catch (error) {
                    console.error("解析错误：", error);
                    // 在解析错误的情况下，可以选择设置为空数组或保持原始格式
                    nextQuestion.options_option_text = [];
                }
            } else {
                // 如果 options_option_text 为空，则直接设置为空数组
                nextQuestion.options_option_text = [];
            }
 
            // 删除原始的 'options.option_text' 字段
            delete nextQuestion['options.option_text'];

            return nextQuestion;
        } else {
            //找到题目id
            let next = await ctx.model.Question.findOne({
                attributes: ['id'],
                where: {
                    special_work_type_code: code
                },
                order: [['id', 'ASC']],
                limit: 1
            })

            // 获取第一道题及其选项
            const firstQuestion = await ctx.model.Question.findOne({
                attributes: ['id', 'question_text', 'question_type', 'special_work_type_code'],
                where: { id: next.id, special_work_type_code: code },
                raw: true,
                include: [{
                    model: ctx.model.Option,
                    as: 'options',
                    attributes: ['option_text'],
                    required: false// 使用 required: false 来确保即使没有匹配的选项，也会返回结果
                }]
            });
            firstQuestion.recordProgress = 1;
            // 直接将数组赋值给 options_option_text 字段
            firstQuestion.options_option_text = firstQuestion['options.option_text'];


            // 检查 options_option_text 是否为空或不存在
            if (firstQuestion.options_option_text && firstQuestion.options_option_text.trim() !== '') {
                // 替换单引号为双引号
                let optionsText = firstQuestion.options_option_text.replace(/'/g, '"');

                try {
                    // 解析字符串为数组
                    let optionsArray = JSON.parse(optionsText);
                    firstQuestion.options_option_text = optionsArray;
                } catch (error) {
                    console.error("解析错误：", error);
                    // 在解析错误的情况下，可以选择设置为空数组或保持原始格式
                    firstQuestion.options_option_text = [];
                }
            } else {
                // 如果 options_option_text 为空，则直接设置为空数组
                firstQuestion.options_option_text = [];
            }

            // 删除原始的 'options.option_text' 字段
            delete firstQuestion['options.option_text'];

            return firstQuestion;
        }

    }

    /**
     * 获取用户做题进度
     * @param {*} userId 
     * @param {*} code 
     * @returns 
     */
    async recordTotal(userId, code, recordProgress) {
        const { ctx } = this;
        //用户的做题进度
        const progress = await ctx.model.Record.findOne({
            where: {
                user_id: userId,
                type_code: code,
                user_progress: recordProgress
            }
        })

        return progress;
    }


}


module.exports = RecordService;