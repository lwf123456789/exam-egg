const { Controller } = require('egg');
const crypto = require('crypto');
class UserController extends Controller {

  
    //微信授权登陆（登陆注册集成）
    async WX_Login_Register() {
        const { ctx } = this;
        const { code, iv, encryptedData, nickname, avatar, province } = ctx.request.body;
        // 使用 code 获取 session_key 和 openid
        const sessionData = await this.service.user.getSessionKey(code);
        if (!sessionData.session_key) {
            ctx.body = { success: false, message: '获取 session_key 失败' };
            return;
        }

        // 解密 encryptedData

        const decryptedData = decryptData(encryptedData, sessionData.session_key, iv);
        if (!decryptedData) {
            ctx.body = { success: false, message: '解密数据失败' };
            return;
        }

        let userInfo = await this.service.user.findUserByOpenId(sessionData.openid);
        if (!userInfo) {
            userInfo = await this.service.user.createUser(sessionData.openid, nickname, avatar, decryptedData.phoneNumber, province);
        }
        
        if (userInfo) {
            ctx.body = {
                success: true,
                message: '登陆成功!',
                data:{
                    userInfo
                }
            };
        } else {
            ctx.body = {
                success: false,
                message: '登陆失败!'
            }
        }

    }
}

function decryptData(encryptedData, sessionKey, iv) {
    try {
        // 基于微信的加密数据和算法进行解密
        const decodedSessionKey = Buffer.from(sessionKey, 'base64');
        const decodedEncryptedData = Buffer.from(encryptedData, 'base64');
        const decodedIv = Buffer.from(iv, 'base64');

        // 使用aes-128-cbc解密算法
        const decipher = crypto.createDecipheriv('aes-128-cbc', decodedSessionKey, decodedIv);
        decipher.setAutoPadding(true);

        let decoded = decipher.update(decodedEncryptedData, 'binary', 'utf8');
        decoded += decipher.final('utf8');

        const decryptedData = JSON.parse(decoded);

        return decryptedData;
    } catch (error) {
        console.error('Decrypt error:', error);
        return null;
    }
}

module.exports = UserController;
