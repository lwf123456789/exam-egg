const { Controller } = require('egg');
const { literal } = require('sequelize'); 
class CollectionController extends Controller {
    //用户收藏题目 
    async collectQuestion() {
        const { ctx } = this;
        const { userId, questionId } = ctx.request.body;

        // 检查题目是否存在
        const questionExists = await ctx.model.Question.findOne({
            where: {
                id: questionId
            }
        });
        if (!questionExists) {
            ctx.body = { success: false, message: '题目不存在' };
            return;
        }

        // 检查收藏记录是否存在
        const collection = await ctx.model.Collection.findOne({
            where: {
                user_id: userId,
                question_id: questionId
            }
        });

        if (collection) {
            if (collection.is_collect === 1) {

                // 取消收藏
                await collection.update({ is_collect: 0 });

                // 只更新取消的那一道题的 user_progress 为 0
                await ctx.model.Collection.update(
                    { user_progress: 0 },
                    { where: { user_id: userId, question_id: questionId } }
                );

                // 重新排序已经收藏的题目的 user_progress
                const orderedCollections = await ctx.model.Collection.findAll({
                    where: { user_id: userId, is_collect: 1 },
                    order: [['user_progress', 'DESC']]
                });

                let newProgress = 1;
                for (const orderedCollection of orderedCollections) {
                    await orderedCollection.update({ user_progress: newProgress });
                    newProgress++;
                }
                // 查询上一道已经收藏的题目
                const previousCollection = await ctx.model.Collection.findOne({
                    attributes: ['question_id', 'user_progress'],
                    where: {
                        user_id: userId,
                        is_collect: 1,
                        user_progress: {
                            [ctx.model.Sequelize.Op.lt]: collection.user_progress // 小于当前题目user_progress
                        }
                    },
                    order: [['user_progress', 'DESC']],
                    raw: true,
                    limit: 1
                });
                if (previousCollection) {
                    let qc = await ctx.model.Question.findOne({
                        attributes: ['id', 'question_text', 'question_type', 'special_work_type_code'],
                        where: { id: previousCollection.question_id },
                        raw: true,
                        include: [{
                            model: ctx.model.Option,
                            as: 'options',
                            attributes: ['option_text'],
                            required: false// 使用 required: false 来确保即使没有匹配的选项，也会返回结果
                        }]
                    });

                    // 直接将数组赋值给 options_option_text 字段
                    qc.options_option_text = qc['options.option_text'];


                    // 检查 options_option_text 是否为空或不存在
                    if (qc.options_option_text && qc.options_option_text.trim() !== '') {
                        // 替换单引号为双引号
                        let optionsText = qc.options_option_text.replace(/'/g, '"');

                        try {
                            // 解析字符串为数组
                            let optionsArray = JSON.parse(optionsText);
                            qc.options_option_text = optionsArray;
                        } catch (error) {
                            console.error("解析错误：", error);
                            // 在解析错误的情况下，可以选择设置为空数组或保持原始格式
                            qc.options_option_text = [];
                        }
                    } else {
                        // 如果 options_option_text 为空，则直接设置为空数组
                        qc.options_option_text = [];
                    }

                    // 删除原始的 'options.option_text' 字段
                    delete qc['options.option_text'];
                    qc.user_progress = previousCollection.user_progress;

                    let wrongTotal = await ctx.model.Collection.count({
                        where: {
                            user_id: userId,
                            is_collect: 1
                        }
                    })
                    qc.collectTotal = wrongTotal;
                    ctx.body = { success: true, message: '取消收藏成功', isCollect: false, previousCollectInfo: qc };
                } else {
                    // 查询下一道已经收藏的题目
                    const nextCollection = await ctx.model.Collection.findOne({
                        attributes: ['question_id', 'user_progress'],
                        where: {
                            user_id: userId,
                            is_collect: 1,
                            user_progress: {
                                [ctx.model.Sequelize.Op.gt]: collection.user_progress // 大于当前题目user_progress
                            }
                        },
                        order: [['user_progress', 'ASC']],
                        raw: true,
                        limit: 1
                    });
                    let bc = await ctx.model.Question.findOne({
                        attributes: ['id', 'question_text', 'question_type', 'special_work_type_code'],
                        where: { id: nextCollection.question_id },
                        raw: true,
                        include: [{
                            model: ctx.model.Option,
                            as: 'options',
                            attributes: ['option_text'],
                            required: false// 使用 required: false 来确保即使没有匹配的选项，也会返回结果
                        }]
                    });

                    // 直接将数组赋值给 options_option_text 字段
                    bc.options_option_text = bc['options.option_text'];


                    // 检查 options_option_text 是否为空或不存在
                    if (bc.options_option_text && bc.options_option_text.trim() !== '') {
                        // 替换单引号为双引号
                        let optionsText = bc.options_option_text.replace(/'/g, '"');

                        try {
                            // 解析字符串为数组
                            let optionsArray = JSON.parse(optionsText);
                            bc.options_option_text = optionsArray;
                        } catch (error) {
                            console.error("解析错误：", error);
                            // 在解析错误的情况下，可以选择设置为空数组或保持原始格式
                            bc.options_option_text = [];
                        }
                    } else {
                        // 如果 options_option_text 为空，则直接设置为空数组
                        bc.options_option_text = [];
                    }

                    // 删除原始的 'options.option_text' 字段
                    delete bc['options.option_text'];
                    bc.user_progress = previousCollection.user_progress;
                    let wrongTotal2 = await ctx.model.Collection.count({
                        where: {
                            user_id: userId,
                            is_collect: 1
                        }
                    })
                    bc.collectTotal = wrongTotal2;
                    ctx.body = { success: true, message: '取消收藏成功2', isCollect: false, previousCollectInfo: bc };
                }
            } else {
                // 重新收藏
                const maxProgress = await ctx.model.Collection.max('user_progress', { where: { user_id: userId } }) || 0;
                await collection.update({ is_collect: 1, user_progress: maxProgress + 1 });

                ctx.body = { success: true, message: '收藏成功', isCollect: true };
            }
        } else {
            // 新收藏
            const maxProgress = await ctx.model.Collection.max('user_progress', { where: { user_id: userId } }) || 0;
            await ctx.model.Collection.create({
                user_id: userId,
                question_id: questionId,
                is_collect: 1,
                type_code: questionExists.special_work_type_code,
                user_progress: maxProgress + 1,
                created_time: new Date()
            });

            ctx.body = { success: true, message: '收藏成功', isCollect: true };
        }
    }

    //获取下一道收藏题目
    async getNextCollectQuestion() {
        const { ctx } = this;
        const { userId, questionId } = ctx.request.body;

        // 查找当前题目的 user_progress
        const currentCollection = await ctx.model.Collection.findOne({
            where: {
                user_id: userId,
                question_id: questionId,
                is_collect: 1
            },
            raw: true
        });

        if (currentCollection) {
            const currentProgress = currentCollection.user_progress;

            // 查找下一道题目的 user_progress
            const nextCollection = await ctx.model.Collection.findOne({
                where: {
                    user_id: userId,
                    is_collect: 1,
                    user_progress: currentProgress + 1
                },
                raw: true
            });


            if (nextCollection) {
                const nextQuestion = await ctx.model.Question.findOne({
                    attributes: ['id', 'question_text', 'question_type', 'special_work_type_code'],
                    where: { id: nextCollection.question_id },
                    raw: true,
                    include: [{
                        model: ctx.model.Option,
                        as: 'options',
                        attributes: ['option_text'],
                        required: false
                    }]
                });

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

                // 组装下一道题目的信息
                const nextCollectQuestion = {
                    id: nextQuestion.id,
                    type_code: nextCollection.type_code,
                    user_progress: nextCollection.user_progress,
                    question_text: nextQuestion.question_text,
                    options_option_text: nextQuestion.options_option_text,
                    question_type: nextQuestion.question_type
                };

                ctx.body = { success: true, message: '获取下一道收藏题目成功', nextCollectQuestion };
            } else {
                ctx.body = { success: false, message: '没有下一道收藏题目' };
            }
        } else {
            ctx.body = { success: false, message: '当前题目不在收藏列表中' };
        }
    }

    //获取上一道收藏题目
    async getPreviousQuestion() {
        const { ctx } = this;
        const { userId, questionId } = ctx.request.body;

        const currentCollection = await ctx.model.Collection.findOne({
            where: {
                user_id: userId,
                question_id: questionId,
                is_collect: 1
            },
            raw: true
        });

        if (currentCollection) {
            const currentProgress = currentCollection.user_progress;

            const previousCollection = await ctx.model.Collection.findOne({
                where: {
                    user_id: userId,
                    is_collect: 1,
                    user_progress: currentProgress - 1
                },
                raw: true
            });

            if (previousCollection) {
                const previousQuestion = await ctx.model.Question.findOne({
                    attributes: ['id', 'question_text', 'question_type', 'special_work_type_code'],
                    where: { id: previousCollection.question_id },
                    raw: true,
                    include: [{
                        model: ctx.model.Option,
                        as: 'options',
                        attributes: ['option_text'],
                        required: false
                    }]
                });

                // 直接将数组赋值给 options_option_text 字段
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

                const previousCollectQuestion = {
                    id: previousQuestion.id,
                    type_code: previousCollection.type_code,
                    user_progress: previousCollection.user_progress,
                    question_text: previousQuestion.question_text,
                    options_option_text: previousQuestion.options_option_text,
                    question_type: previousQuestion.question_type
                };

                ctx.body = { success: true, message: '获取上一道收藏题目成功', previousCollectQuestion };
            } else {
                ctx.body = { success: false, message: '没有上一道收藏题目' };
            }
        } else {
            ctx.body = { success: false, message: '当前题目不在收藏列表中' };
        }
    }

    //点击收藏题目的选项
    async doCollectAnswer() {
        const { ctx } = this;
        const { userId, questionId, answer } = ctx.request.body;
        const question = await ctx.model.Question.findOne({
            attributes: ['correct_answer', 'question_type'],
            where: { id: questionId },
            raw: true
        });

        if (question) {
            const isCorrect = answer === question.correct_answer;

            ctx.body = {
                isCorrect: isCorrect,
                correctAnswer: question.correct_answer,
                questionType: question.question_type
            };
        } else {
            ctx.body = { success: false, message: '题目不存在' };
        }
    }

    //删除所有收藏题目
    async deleteAllCollect() {
        const { ctx } = this;
        const { userId } = ctx.request.body;
        // 删除指定用户和工种类型的所有错题记录
        await ctx.model.Collection.destroy({
            where: {
                user_id: userId
            }
        });

        ctx.body = { success: true, message: '删除成功' };
    }
}

module.exports = CollectionController;