/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  router.get('/', controller.home.index);




  /**
   * 用户接口
   */
  router.post('/api/user/WXlogin', controller.user.WX_Login_Register);//微信授权登陆（登陆注册集成）


  /**
   * 题目接口
   */
  router.post('/api/question/getUserDoQuesitonByCode', controller.question.getUserDoQuesitonByCode);//选择城市和工种获取数据
  router.post('/api/question/doneAnswer', controller.question.doneAnswer); //用户点击选项
  router.post('/api/question/getNextQuestion', controller.question.getNextQuestion);//用户点击下一题，获取下一题的题目
  router.post('/api/question/getPreviousQuestion', controller.question.getPreviousQuestion);//用户点击上一题，获取上一题的题目

  /**
   * 模拟考试 
   */
  router.post('/api/exam/gotoExam', controller.exam.gotoExam);//点击模拟考试，获取80道题目
  router.post('/api/exam/doExamAnswer', controller.exam.doExamAnswer);//模拟题点击选项
  router.post('/api/exam/submitExam', controller.exam.submitExam);//提交模拟考试

  /**
   * 工种接口
   */
  router.get('/api/workType/getWorkTypeList', controller.workType.getWorkTypeList); //获取工种列表


  /**
   * 错题接口
   */
  router.post('/api/wrong/getWrongNextQuestion', controller.wrong.getWrongNextQuestion); //获取下一道错题
  router.post('/api/wrong/getWrongPreviousQuestion', controller.wrong.getWrongPreviousQuestion);//获取上一道错题
  router.post('/api/wrong/doWrongAnswer', controller.wrong.doWrongAnswer);  //点击错题选项
  router.post('/api/wrong/deleteWrongQuestion', controller.wrong.deleteWrong);//删除错题记录
  router.post('/api/wrong/deleteAllWrong', controller.wrong.deleteAllWrong);//删除指定工种所有错题

  /**
   * 收藏接口
   */
  router.post('/api/collection/collectQuestion', controller.collection.collectQuestion);//用户收藏题目
  router.post('/api/collection/getNextCollectQuestion', controller.collection.getNextCollectQuestion);//用户获取下一道收藏题目
  router.post('/api/collection/getPreviousQuestion', controller.collection.getPreviousQuestion);//用户获取上一道收藏题目
  router.post('/api/collection/doCollectAnswer', controller.collection.doCollectAnswer);//用户点击收藏题目的选项
  router.post('/api/collection/deleteAllCollect', controller.collection.deleteAllCollect);//用户删除所有收藏题目

};
