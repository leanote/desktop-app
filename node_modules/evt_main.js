var fs = require('fs');

// main 进程环境
/**
当前端登录后, db.init时, 调用db_client的init
*/

var Evt = {
    defaultUrl: 'https://leanote.com',
    leanoteUrl: 'https://leanote.com',
    // leanoteUrl: 'http://localhost:9000',
    // 
    dataBasePath: '',

    init: function (curUser, dbPath, dataBasePath) {
        this.curUser = curUser;
        this.setHost(curUser.Host);
        this.dataBasePath = dataBasePath;
    },

    setHost: function(host) {
        if(!host) {
            this.leanoteUrl = this.defaultUrl;
        } else {
            this.leanoteUrl = host;
        }
        // leanote服务强制https
        if (this.leanoteUrl === 'http://leanote.com') {
            this.leanoteUrl = 'https://leanote.com';
        }
    },

    getHost: function() {
        return this.leanoteUrl;
    },

    getCurUserId: function () {
        return this.curUser.UserId;
    },

    getToken: function () {
        return this.curUser.Token;
    },

    // 用户的图片路径
    getCurUserImagesPath: function() {
        return this.dataBasePath + '/data/' + this.getCurUserId() + '/images';;
    },
};

module.exports = Evt; 
