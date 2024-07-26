const { Service } = require('egg');


class CollectionService extends Service {

    /**
     * 检查用户是否收藏了这题
     * @param {*} userId 
     * @param {*} questionId 
     * @returns 
     */
    async checkQuestionCollection(userId, questionId) {
        const { ctx } = this;

        let collectionInfo = await ctx.model.Collection.findOne({
            where: {
                user_id: userId,
                question_id: questionId
            }
        })
        if (collectionInfo == null) {
            return 0;
        } else {
            let isCollected = collectionInfo.is_collect;
            return isCollected;
        }

    }


    /**
     * 获取收藏第一道题
     * @param {*} userId 
     * @param {*} code 
     * @returns 
     */
    async getFirstColection(userId, code) {
        const { ctx } = this;

        // 查找用户已收藏的第一道题
        let fc = await ctx.model.Collection.findOne({
            where: {
                user_id: userId,
                is_collect: 1,
                type_code: code,
                user_progress: 1
            },
            raw: true
        });
        if (fc == null) {
            return null;
        }


        let qc = await ctx.model.Question.findOne({
            attributes: ['id', 'question_text', 'question_type', 'special_work_type_code'],
            where: { id: fc.question_id },
            raw: true,
            include: [{
                model: ctx.model.Option,
                as: 'options',
                attributes: ['option_text'],
                required: false// 使用 required: false 来确保即使没有匹配的选项，也会返回结果
            }]
        });

        const collectTotal = await ctx.model.Collection.count({
            where: {
                user_id: userId,
                is_collect: 1,
                type_code: code
            }
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

        let firstCollection = {
            id: fc.question_id,
            type_code: fc.type_code,
            user_progress: fc.user_progress,
            question_text: qc.question_text,
            options_option_text: qc.options_option_text,
            question_type: qc.question_type,
            collectTotal: collectTotal
        }
        return firstCollection;
    }
 


}

module.exports = CollectionService;