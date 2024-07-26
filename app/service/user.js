const { Service } = require('egg');
const axios = require('axios');

class UserService extends Service {

    /**
     * 通过code获取openid 和 session_key
     * @param {*} code 
     * @returns 
     */
    async getSessionKey(code) {
        const appId = this.config.wxlogin.appid;
        const appSecret = this.config.wxlogin.secret;
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;

        const result = await axios.get(url);
        return result.data; // 包含 openid 和 session_key
    }

    /**
     * 创建用户
     * @param {*} open_id 
     * @param {*} nickname 
     * @param {*} avatar 
     * @param {*} phone 
     * @param {*} province 
     * @returns 
     */  
    async createUser(open_id, nickname, avatar, phone, province) {
        const { ctx } = this;
        let create_time = new Date();
        let status = 1;
        // 根据解密后的数据进行用户登录或注册逻辑
        let userInfo = await ctx.model.User.create({
            open_id,
            nickname,
            avatar,
            phone,
            status,
            province,
            create_time
        })
        const user = {
            id: userInfo.id, // 假设有一个唯一标识符 id
            nickname: userInfo.nickname,
            avatar: userInfo.avatar,
            phone: userInfo.phone,
            province: userInfo.province,
            create_time: userInfo.create_time
        };

        return user;
    }

    /**
     * 根据openid查询用户是否已经注册过
     * @param {微信鉴权} open_id 
     * @returns 
     */
    async findUserByOpenId(open_id) {
        const { ctx } = this;
        let user = await ctx.model.User.findOne({
            attributes:['id','nickname','avatar','phone','status','province','create_time'],
            where: {
                open_id
            }
        })
        return user;
    }

    /**
     * 根据用户id查询用户是否存在
     * @param {用户id} id 
     * @returns 
     */
    async findUserByUserId(id) {
        const { ctx } = this;
        let user = await ctx.model.User.findOne({
            where: { id }
        })
        return user;
    }

}

module.exports = UserService;
