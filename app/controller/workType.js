const { Controller } = require('egg');
class workTypeController extends Controller {
    //获取工种列表
    async getWorkTypeList() {
        const { ctx } = this;
        let workTypeList = await ctx.model.WorkType.findAll();

  
        // 对工种列表进行整合
        // const integratedList = workTypeList.map(item => {
        //     return `${item.type_code}${item.type_name}`;
        // });
        ctx.body = {
            success: true,
            message: '工种列表获取成功',
            workTypeList
        }
    }
}

module.exports = workTypeController;
