const { Controller } = require('egg');
const moment = require('moment');
class ExamController extends Controller {

    //点击模拟考试，获取80道题目
    async gotoExam() {
        const { ctx, app } = this;
        const { userId, code } = ctx.request.body;

        let qInfo = await ctx.model.ExamRecord.findOne({
            attributes: ['question_id'],
            where: {
                user_id: userId
            },
            order: [['id', 'DESC']],
            raw: true,
            limit: 1
        })
        console.log(qInfo);

        const redisClient = app.redis.get('db0');
        const OneRedisKey = `${userId}-${qInfo.question_id}`;

        // 尝试从 Redis 中获取题目数据
        const cachedQuestions = await redisClient.get(OneRedisKey);

        if (cachedQuestions) {
            // 如果缓存中有数据，直接返回缓存的题目数据
            const allQuestions = JSON.parse(cachedQuestions);

            let exam = await ctx.model.Exam.findOne({
                where: {
                    user_id: userId,
                    type_code: code,
                    status: '进行中'
                },
                raw: true
            })

            let examInfo = {
                examId: exam.id,
                total_questions: exam.total_questions,
                status: exam.status,
                start_time: moment(exam.start_time).format('YYYY/MM/DD HH:mm'),
                end_time: moment(exam.end_time).format('YYYY/MM/DD HH:mm')
            }

            let lastRecord = await ctx.model.ExamRecord.findOne({
                attributes: ['question_id'],
                where: {
                    user_id: userId
                },
                order: [['answer_time', 'DESC']],
                limit: 1
            })

            console.log(lastRecord);



            // 返回给前端
            ctx.body = {
                success: true,
                message: "考试开始,这是从redis拿的",
                examInfo: examInfo, // 这里需要实现获取考试信息的函数
                allQuestions
            };
        } else {
            const duration = 60 * 60 * 1000; // 60分钟转换为毫秒
            const startTime = new Date();
            const endTime = new Date(startTime.getTime() + duration);

            let exam = await ctx.model.Exam.create({
                user_id: userId,
                type_code: code,
                status: '进行中',
                start_time: startTime,
                end_time: endTime
            })

            let examInfo = {
                examId: exam.id,
                total_questions: exam.total_questions,
                status: exam.status,
                start_time: moment(exam.start_time).format('YYYY/MM/DD HH:mm'),
                end_time: moment(exam.end_time).format('YYYY/MM/DD HH:mm')
            }


            //判断题30道
            let firstQuestion = await ctx.model.Question.findAll({
                attributes: ['id', 'question_text', 'question_type', 'special_work_type_code'],
                include: [{
                    model: ctx.model.Option,
                    as: 'options',
                    attributes: ['option_text']
                }],
                where: {
                    question_type: '判断题',
                    special_work_type_code: code
                },
                order: ctx.model.Sequelize.literal('rand()'),
                limit: 30,
                raw: true //返回存粹数据
            })

            //单选题30道
            let secondQuestion = await ctx.model.Question.findAll({
                attributes: ['id', 'question_text', 'question_type', 'special_work_type_code'],
                include: [{
                    model: ctx.model.Option,
                    as: 'options',
                    attributes: ['option_text']
                }],
                where: {
                    question_type: '单选题',
                    special_work_type_code: code
                },
                order: ctx.model.Sequelize.literal('rand()'),
                limit: 30,
                raw: true //返回存粹数据
            })

            //多选题20道
            let thirdQuestion = await ctx.model.Question.findAll({
                attributes: ['id', 'question_text', 'question_type', 'special_work_type_code'],
                include: [{
                    model: ctx.model.Option,
                    as: 'options',
                    attributes: ['option_text']
                }],
                where: {
                    question_type: '多选题',
                    special_work_type_code: code
                },
                order: ctx.model.Sequelize.literal('rand()'),
                limit: 20,
                raw: true //返回存粹数据
            })

            // 对每个问题数组应用 parseOptions 函数
            const processedFirstQuestion = firstQuestion.map(parseOptions);
            const processedSecondQuestion = secondQuestion.map(parseOptions);
            const processedThirdQuestion = thirdQuestion.map(parseOptions);

            // 整合所有处理过的题目为一个数组
            let allQuestions = [
                ...processedFirstQuestion,
                ...processedSecondQuestion,
                ...processedThirdQuestion
            ];

            // 给每个题目添加 user_progress
            allQuestions.forEach((question, index) => {
                question.user_progress = index + 1;
                question.recordUserAnswer = '';
                question.recordIsCorrect = '';
            });
            let firstExamQuestion = allQuestions[0]

            const redisClient = app.redis.get('db0');
            // 遍历题目数据，分别存储到 Redis 中，并设置过期时间
            for (const question of allQuestions) {
                const questionId = question.id;  // 请确保你的题目数据中有题目ID字段

                // 构建 Redis 键，形如 "userId-questionId"
                const redisKey = `${userId}-${questionId}`;

                // 将题目数据转为 JSON 字符串并存储到 Redis 中
                await redisClient.set(redisKey, JSON.stringify(question));

                // 设置缓存过期时间为 60 分钟（60 * 60 秒）
                await redisClient.expire(redisKey, 60 * 60);
            }

            // 返回给前端
            ctx.body = {
                success: true,
                message: "考试开始,这是从mysql拿的",
                examInfo: examInfo,
                firstExamQuestion
            };
        }
    }

    //模拟题点击选项
    async doExamAnswer() {
        const { ctx, app } = this;
        const { userId, questionId, type, examId, answer } = ctx.request.body;

        //查询考试结束时间，对比一下是否考生超时
        let exam = await ctx.model.Exam.findOne({
            attributes: ['end_time'],
            where: {
                user_id: userId,
                id: examId
            }
        })

        if (!exam) {
            ctx.body = { success: false, message: '考试信息不存在' };
            return;
        }

        // 对比当前时间和考试结束时间
        const currentTime = new Date();
        const endTime = new Date(exam.end_time);

        if (currentTime > endTime) {
            // 考试时间已过
            ctx.body = { success: false, message: '考试已经结束！无法做题' };
            return;
        }


        //从question表拿到正确答案
        let correctAnswer = await ctx.model.Question.findOne({
            where: { id: questionId }
        });


        if (!correctAnswer) {
            ctx.body = { success: false, message: '题目不存在' };
            return;
        }

        //拿到选项，用于创建错题
        let optionInfo = await ctx.model.Option.findOne({
            attributes: ['option_text'],
            where: {
                question_id: questionId
            },
            raw: true
        })
        console.log(optionInfo);

        //校验用户答案 
        let ifAnswer = correctAnswer.correct_answer === answer;


        await ctx.model.ExamRecord.create({
            user_id: userId,
            exam_id: examId,
            question_id: questionId,
            question_type: type,
            user_answer: answer,
            is_correct: ifAnswer,
            answer_time: new Date()
        })

        // 从 Redis 中获取题目数据
        const redisClient = app.redis.get('db0');
        const redisKey = `${userId}-${questionId}`;
        const cachedQuestion = await redisClient.get(redisKey);
        // 解析 Redis 中的题目数据
        const questionData = JSON.parse(cachedQuestion);

        // 更新用户选项和是否正确的信息
        questionData.recordUserAnswer = answer;
        questionData.recordIsCorrect = correctAnswer.correct_answer;

        // 将更新后的题目数据重新存储到 Redis 中
        await redisClient.set(redisKey, JSON.stringify(questionData));
        // 设置缓存过期时间为 60 分钟（60 * 60 秒）
        await redisClient.expire(redisKey, 60 * 60);
        //返回是否正确和正确答案
        ctx.body = {
            isCorrect: ifAnswer,
            recordUserAnswer: answer,
            correctAnswer: correctAnswer.correct_answer
        }
    }

    //提交模拟考试
    async submitExam() {
        const { ctx } = this;
        const { userId, examId } = ctx.request.body;

        // 确保考试和用户ID都提供了
        if (!userId || !examId) {
            ctx.body = { success: false, message: "缺少必要的考试或用户信息。" };
            return;
        }

        const exam = await ctx.model.Exam.findOne({
            where: { id: examId }
        });

        if (!exam) {
            ctx.body = { success: false, message: "考试不存在" };
            return;
        }

        const currentTime = new Date();
        if (currentTime > exam.end_time) {
            ctx.body = { success: false, message: "考试已结束" };
            return;
        }

        try {
            // 查询此次考试的所有正确答题记录
            const correctAnswers = await ctx.model.ExamRecord.findAll({
                where: {
                    user_id: userId,
                    exam_id: examId,
                    is_correct: true
                },
                attributes: ['question_type']
            });


            if (!correctAnswers || correctAnswers.length === 0) {
                ctx.body = { success: true, message: "无答题记录或未答对任何题目", score: 0 };
                return;
            }

            // 计算总分
            let score = 0;
            correctAnswers.forEach(answer => {
                switch (answer.question_type) {
                    case '判断题':
                    case '单选题':
                        score += 1; // 判断题和单选题每题1分
                        break;
                    case '多选题':
                        score += 2; // 多选题每题2分
                        break;
                    default:
                        // 可以处理其他题型
                        break;
                }
            });

            // 可以选择更新考试记录中的分数
            await ctx.model.Exam.update(
                { user_score: score, status: '已完成' },
                { where: { id: examId, user_id: userId } }
            );

            ctx.body = { success: true, message: "成绩计算成功", score: score };

        } catch (error) {
            console.error("成绩计算时发生错误:", error);
            ctx.body = { success: false, message: "成绩计算时发生错误" };
        }


    }


}

//处理格式和类型
function parseOptions(question) {
    if (question['options.option_text'] && question['options.option_text'].trim() !== '') {
        let optionsText = question['options.option_text'].replace(/'/g, '"');
        try {
            let optionsArray = JSON.parse(optionsText);
            question.options_option_text = optionsArray;
        } catch (error) {
            console.error("解析错误：", error);
            question.options_option_text = [];
        }
    } else {
        question.options_option_text = [];
    }
    delete question['options.option_text'];
    return question;
}


module.exports = ExamController;
