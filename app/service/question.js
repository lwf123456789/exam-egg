const { Service } = require('egg');


class QuestionService extends Service {

    /**
     * 获取第一道题
     * @param {工种编号} code 
     * @returns 
     */
    async findFirstQuestion(code) {
        const { ctx } = this;
        //查找指定的type最小id的题目,表示首题
        let fistQuestion = await ctx.model.Question.findOne({
            attributes: ['id', 'question_text', 'question_type', 'special_work_type_code'],
            include: [{
                model: ctx.model.Option,
                as: 'options',
                attributes: ['option_text']
            }],
            where: {
                special_work_type_code: code
            },
            raw: true, //返回存粹数据
            order: [['id', 'ASC']],
            limit: 1
        })

        return fistQuestion;

    }
 
    /**
     * 用户点击选项
     * @param {*} userId 
     * @param {*} answer 
     * @param {*} questionId 
     * @returns 
     */
    async doneAnswer(userId, answer, questionId) {
        const { ctx } = this;
        let question = await ctx.model.Question.findOne({
            attributes: ['correct_answer', 'question_type', 'special_work_type_code', 'question_text'],
            include: [{
                model: ctx.model.Option,
                as: 'options',
                attributes: ['option_text']
            }],
            where: {
                id: questionId
            },
            raw: true
        })

        // 确保问题存在
        if (!question) {
            // 处理问题不存在的情况
            return { success: false, message: "题目不存在" };
        }

        //是否存在该记录，如果存在，那么不需要再次创建数据
        let ifRecord = await ctx.model.Record.findOne({
            where: {
                user_id: userId,
                question_id: questionId
            }
        })

        let qid = parseInt(questionId) - 1;

        let rINFO = await ctx.model.Record.findOne({
            attributes: ['user_progress'],
            where: {
                user_id: userId,
                question_id: qid,
                type_code: question.special_work_type_code
            },
            raw: true
        });
        // 查询当前题目ID在错题表中的上一题
        const wINFO = await ctx.model.Wrong.findOne({
            attributes: ['user_progress'],
            where: {
                user_id: userId,
                question_id: {
                    [ctx.model.Sequelize.Op.lt]: questionId, // 查找ID小于当前题目ID的记录
                },
                type_code: question.special_work_type_code
            },
            order: [['question_id', 'DESC']], // 按题目ID降序排序
            raw: true
        });

        let wprogress;
        if (!wINFO) {
            // 如果没有找到记录，设置默认进度为1
            wprogress = 1;
        } else {
            // 如果找到了记录，将进度自增1
            wprogress = wINFO.user_progress + 1;
        }

        console.log(wINFO);

        let uprogress;

        // 如果没有找到上一题的记录，说明用户可能刚开始做题，或者这是他们第一次遇到这个题目
        if (!rINFO) {
            uprogress = 1; // 这是他们的第一个进度点
        } else {
            // 如果找到了记录，当前题的进度是上一题进度 + 1
            uprogress = rINFO.user_progress + 1;
        }


        //是否存在错误记录，如果存在，那么不需要重复创建数据
        let ifWrong = await ctx.model.Wrong.findOne({
            where: {
                user_id: userId,
                question_id: questionId
            }
        })

        const isCorrect = compareAnswers(answer, question.correct_answer);
        // 检查答案是否正确
        // const isCorrect = question.correct_answer === answer;
        let done_time = new Date();
        // 基于答案是否正确，进行相应的数据库操作
        if (isCorrect) {
            // 记录到记录表，答案正确
            if (!ifRecord) {
                await ctx.model.Record.create({
                    user_id: userId,
                    question_id: questionId,
                    user_answer: answer,
                    is_correct: true,
                    done_time,
                    type_code: question.special_work_type_code,
                    question_type: question.question_type,
                    user_progress: uprogress
                })
            } else {
                await ctx.model.Record.update(
                    { user_answer: answer, is_correct: true, done_time },
                    { where: { user_id: userId, question_id: questionId } }
                )
            }
        } else {
            // 记录到错题表和记录表，答案错误 
            let wrong_time = new Date();
            if (!ifWrong) {
                await ctx.model.Wrong.create({
                    user_id: userId,
                    question_id: questionId,
                    correct_answer: question.correct_answer,
                    type_code: question.special_work_type_code,
                    question_type: question.question_type,
                    question_text: question.question_text,
                    question_option: question['options.option_text'],
                    wrong_time,
                    user_progress: wprogress
                })
            }
            if (!ifRecord) {
                await ctx.model.Record.create({
                    user_id: userId,
                    question_id: questionId,
                    user_answer: answer,
                    is_correct: false,
                    done_time,
                    type_code: question.special_work_type_code,
                    question_type: question.question_type,
                    user_progress: uprogress
                })
            } else {
                await ctx.model.Record.update(
                    { user_answer: answer, is_correct: false, done_time },
                    { where: { user_id: userId, question_id: questionId } }
                )
            }
        }
        return {
            isCorrect: isCorrect,
            correctAnswer: question.correct_answer,
            questionType: question.question_type
        };

 
    }


    /**
     * 用户点击下一题获取下一题数据
     * @param {*} questionId 
     * @param {*} userId 
     * @returns 
     */
    async getNextQuestion(userId, questionId) {
        const { ctx } = this;

        console.log(questionId);

        let nextQuestionId = questionId ? parseInt(questionId) + 1 : 1;
        // 获取下一道题及其选项
        const nextQuestion = await ctx.model.Question.findOne({
            attributes: ['id', 'question_text', 'question_type', 'special_work_type_code', 'correct_answer'],
            where: { id: nextQuestionId },
            include: [{
                model: ctx.model.Option,
                as: 'options',
                attributes: ['option_text']
            }],
            raw: true
        });

        console.log(nextQuestion);

        let recordInfo = await ctx.model.Record.findOne({
            attributes: ['user_answer', 'is_correct'],
            where: {
                user_id: userId,
                type_code: nextQuestion.special_work_type_code,
                question_id: nextQuestionId
            },
            raw: true
        })
        console.log(recordInfo);
        if (recordInfo) {
            if (recordInfo.user_answer == '0') {
                recordInfo.user_answer = 'A'
            }

            if (recordInfo.user_answer == '1') {
                recordInfo.user_answer = 'B'
            }
            nextQuestion.recordUserAnswer = recordInfo.user_answer;
            if (nextQuestion.correct_answer == '0') {
                nextQuestion.correct_answer = 'A'
            }

            if (nextQuestion.correct_answer == '1') {
                nextQuestion.correct_answer = 'B'
            }
        } else {
            delete nextQuestion.correct_answer;
        }




        let recordProgress = await ctx.model.Record.findOne({
            attributes: ['user_progress'],
            where: {
                user_id: userId,
                type_code: nextQuestion.special_work_type_code,
                question_id: questionId
            }
        })

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

    }

    /**
     * 用户点击上一题获取上一题数据
     * @param {*} userId 
     * @param {*} questionId 
     * @returns 
     */
    async getPreviousQuestion(userId, questionId) {
        const { ctx } = this;
        console.log(questionId);
        // 首先，找到用户回答的所有题目的ID，且ID小于当前题目的ID
        const answeredQuestionIds = await ctx.model.Record.findAll({
            where: {
                user_id: userId,
                question_id: {
                    [ctx.app.Sequelize.Op.lt]: questionId
                }
            },
            order: [['question_id', 'DESC']], // 确保按照题目ID降序排列
            attributes: ['question_id'],
            raw: true
        });


        // 如果没有找到之前回答的题目，可能需要处理这种情况（比如返回第一题或错误信息）
        if (!answeredQuestionIds.length) {
            return { error: "没有找到之前的题目记录。" };
        }

        // 获取上一题的ID
        // const previousQuestionId = answeredQuestionIds[0].question_id;
        const previousQuestionId = parseInt(questionId) - 1
        console.log(previousQuestionId);
        let recordInfo = await ctx.model.Record.findOne({
            attributes: ['user_answer', 'is_correct', 'user_progress'],
            where: {
                user_id: userId,
                question_id: previousQuestionId
            },
            raw: true
        })
        console.log(recordInfo);

        // 根据上一题的ID获取题目及其选项
        // const previousQuestion = await getQuestionWithOptions(previousQuestionId);
        const previousQuestion = await ctx.model.Question.findOne({
            attributes: ['id', 'question_text', 'question_type', 'special_work_type_code', 'correct_answer'],
            where: { id: previousQuestionId },
            include: [{
                model: ctx.model.Option,
                as: 'options',
                attributes: ['option_text']
            }],
            raw: true
        });

        if (recordInfo.user_answer == '0') {
            recordInfo.user_answer = 'A'
        }

        if (recordInfo.user_answer == '1') {
            recordInfo.user_answer = 'B'
        }

        if (previousQuestion.correct_answer == '0') {
            previousQuestion.correct_answer = 'A'
        }

        if (previousQuestion.correct_answer == '1') {
            previousQuestion.correct_answer = 'B'
        }

        previousQuestion.options_option_text = previousQuestion['options.option_text'];

        // 检查 options_option_text 是否为空或不存在
        if (previousQuestion.options_option_text && previousQuestion.options_option_text.trim() !== '') {
            // 替换单引号为双引号
            let optionsText = previousQuestion.options_option_text.replace(/'/g, '"');

            try {
                // 解析字符串为数组
                let optionsArray = JSON.parse(optionsText);
                previousQuestion.options_option_text = optionsArray;
            } catch (error) {
                console.error("解析错误：", error);
                // 在解析错误的情况下，可以选择设置为空数组或保持原始格式
                previousQuestion.options_option_text = [];
            }
        } else {
            // 如果 options_option_text 为空，则直接设置为空数组
            previousQuestion.options_option_text = [];
        }

        // 删除原始的 'options.option_text' 字段
        delete previousQuestion['options.option_text'];

        if (!previousQuestion) {
            return { error: "没有找到上一题的详细信息。" };
        }

        let recordProgress = await ctx.model.Record.findOne({
            attributes: ['user_progress'],
            where: {
                user_id: userId,
                type_code: previousQuestion.special_work_type_code,
                question_id: previousQuestionId
            },
            raw: true
        })

        // 计算并添加用户进度信息
        previousQuestion.recordProgress = recordInfo.user_progress;


        // previousQuestion.recordProgress = answeredQuestionIds.length;

        previousQuestion.recordUserAnswer = recordInfo.user_answer;
        previousQuestion.recordIsCorrect = recordInfo.is_correct;

        return previousQuestion;
    }

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


module.exports = QuestionService;