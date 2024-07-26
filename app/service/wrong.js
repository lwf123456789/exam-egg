const { Service } = require('egg');


class WrongService extends Service {

    /**
     * 获取错题记录第一道题
     * @param {*} userId 
     * @returns 
     */
    async getWrongQuestion(userId, code) {
        const { ctx } = this;
        let fistWrong = await ctx.model.Wrong.findOne({
            attributes: ['question_id', 'type_code', 'question_text', 'question_type', 'question_option', 'user_progress'],
            where: {
                user_id: userId,
                type_code: code
            },
            order: [['id', 'ASC']],
            limit: 1,
            raw: true
        })

        let wrongTotal = await ctx.model.Wrong.count({
            where: {
                user_id: userId,
                type_code: code
            }
        })

        if (fistWrong) {
            fistWrong.id = fistWrong.question_id;
            delete fistWrong.question_id;
            fistWrong.wrongTotal = wrongTotal;
            fistWrong = processOptionsText(fistWrong);
        }


        console.log(fistWrong);

        return fistWrong;

    }

    /**
     * 获取下一道错题
     * @param {*} userId 
     * @param {*} questionId 
     */
    async getWrongNextQuestion(userId, questionId) {
        const { ctx } = this;

        // 获取当前错题的工种类型代码
        let typeCode = await ctx.model.Question.findOne({
            attributes: ['special_work_type_code'],
            where: { id: questionId },
            raw: true
        });

        // 检查是否成功获取到工种类型代码
        if (!typeCode || !typeCode.special_work_type_code) {
            return { error: "无法找到当前题目的工种类型代码。" };
        }

        // 获取下一道错题的详细信息
        const wrongQuestion = await ctx.model.Wrong.findOne({
            attributes: ['question_id', 'type_code', 'question_type', 'question_text', 'question_option', 'user_progress'],
            where: {
                user_id: userId,
                type_code: typeCode.special_work_type_code,
                question_id: {
                    [ctx.model.Sequelize.Op.gt]: questionId // 使用大于当前题目ID的条件
                }
            },
            order: [['question_id', 'ASC']], // 按题目ID升序排序
            raw: true
        });

        if (!wrongQuestion) {
            return { error: "找不到下一道错题。" };
        }

        wrongQuestion.id = wrongQuestion.question_id;
        delete wrongQuestion.question_id;

        let wrongInfo = processOptionsText(wrongQuestion);

        return wrongInfo;

    }

    /**
     * 获取上一道错题
     * @param {*} userId 
     * @param {*} questionId 
     */
    async getWrongPreviousQuestion(userId, questionId) {
        const { ctx } = this;

        // 获取当前错题的工种类型代码
        let typeCode = await ctx.model.Question.findOne({
            attributes: ['special_work_type_code'],
            where: { id: questionId },
            raw: true
        });

        // 检查是否成功获取到工种类型代码
        if (!typeCode || !typeCode.special_work_type_code) {
            return { error: "无法找到当前题目的工种类型代码。" };
        }

        // 查找所有用户的错题ID，且ID大于当前题目的ID
        const previousWrongQuestion = await ctx.model.Wrong.findOne({
            attributes: ['question_id', 'type_code', 'question_type', 'question_text', 'question_option', 'user_progress'],
            //小于 (Op.lt) 操作符来查找 ID 小于当前题目 ID 的错题
            where: {
                user_id: userId,
                question_id: {
                    [ctx.app.Sequelize.Op.lt]: questionId
                },
                type_code: typeCode.special_work_type_code
            },
            order: [['question_id', 'DESC']], // 按照题目ID升序排列
            raw: true
        });


        // 如果没有找到上一道错题，可能需要处理这种情况
        if (!previousWrongQuestion) {
            return { error: "没有更多的错题记录。" };
        }

        previousWrongQuestion.id = previousWrongQuestion.question_id;
        delete previousWrongQuestion.question_id;

        let wrongInfo = processOptionsText(previousWrongQuestion);

        return wrongInfo;

    } 

    /**
     * 清空指定工种的所有错题
     * @param {*} userId 
     * @param {*} code 
     */
    async deleteAllWrong(userId, code) {
        const { ctx } = this;
        try {
            // 删除指定用户和工种类型的所有错题记录 
            await ctx.model.Wrong.destroy({
                where: {
                    user_id: userId,
                    type_code: code
                }
            });

            return { success: true, message: '清空成功！' };
        } catch (error) {
            console.error('Error deleting wrong questions:', error);
            return { success: false, message: '清空失败！' };
        }
    }


    /**
     * 用户点击错题选项
     * @param {*} userId 
     * @param {*} questionId 
     */
    async doWrongAnswer(userId, questionId, answer) {
        const { ctx } = this;
        let wrongInfo = await ctx.model.Wrong.findOne({
            attributes: ['question_id', 'correct_answer', 'type_code', 'question_type', 'question_text', 'question_option', 'user_progress'],
            where: {
                user_id: userId,
                question_id: questionId
            },
            raw: true
        })
        let isCorrect = compareAnswers(answer, wrongInfo.correct_answer);


        return {
            isCorrect: isCorrect,
            correctAnswer: wrongInfo.correct_answer,
            questionType: wrongInfo.question_type
        }

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

/**
 * 比较用户答案与正确答案（适用于多选题）
 * @param {string} userAnswer 用户提交的答案
 * @param {string} correctAnswer 正确答案
 * @returns {boolean} 答案是否正确
 */
function compareAnswers(userAnswer, correctAnswer) {
    // 将用户答案分割成字符数组，排序，然后再拼接回字符串
    const sortedUserAnswer = userAnswer.split('').sort().join('');

    return sortedUserAnswer === correctAnswer;
}

module.exports = WrongService;
