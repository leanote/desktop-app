var Datastore = require('nedb');
var path = require('path');
var Evt = require('evt');
var dbClient = require('db_client');

// 数据库初始化
// var dbPath = require('nw.gui').App.dataPath + '/nedb';
// var dbPath = Evt.getBasePath() + '/Users/life/Library/Application Support/Leanote' + '/nedb';
// nedb2 为了port
var dbPath = Evt.getDBPath();
// console.error(dbPath);

// test
if(dbPath.length < 6) {
	var dbPath = '/Users/life/Library/Application Support/Leanote' + '/nedb2';
}

// console.log(dbPath);
// g, 表全局环境
var db = {

    // 为全部用户共有的表初始化
    initGlobal: function () {
        var me = this;
        var dbNames = ['users', 'g'];
        this.initIt(me, dbNames);
    },

    // 为特定用户初始化自己的表
    initDBForUser: function (userId, curUser) {
        var me = this;
        var dbNames = ['notebooks', 'notes', 'tags', /*'images',*/ 'attachs', 'noteHistories'];
        this.initIt(me, dbNames, userId);

        // init dbClient -> main db
        var baseDBPath = dbPath;
        if (userId) {
            baseDBPath += '/' + userId;
        }
        dbClient.init(curUser, baseDBPath);
    },

    // 过时
    init: function () {
        var me = this;
        var dbNames = ['users', 'notebooks', 'notes', 'tags', /*'images',*/ 'attachs', 'noteHistories', 'g'];
        this.initIt(me, dbNames);
    },

    // 过时
    initForLogin: function () {
        var me = this;
        // var dbNames = ['users'];
        var dbNames = ['users', 'notebooks', 'notes', 'tags', 'noteHistories'];
        this.initIt(me, dbNames);
    },

    // map, 最后的db设到map里
    // forceAutoload 是否强制加载
    initIt: function (map, dbNames, userId, forceAutoload) {
        var me = this;
        for(var i in dbNames) {
            var name = dbNames[i];

            if (!userId) {
                userId = '';
            }
            var baseDBPath = dbPath;
            if (userId) {
                baseDBPath += '/' + userId;
            }

            var dbFilepath = path.join(baseDBPath, name + '.db');
            // console.log(dbFilepath);
            (function (name) {
                // 这部分非常慢!, 会卡界面
                var autoload = forceAutoload || name != 'noteHistories';
                map[name] = new Datastore({ filename: dbFilepath, autoload: autoload, onload: function () {
                    console.log(userId + '/' + name + ' is loaded');
                }});
            })(name);
        }
        console.log('db inited');
    }
};

// 加载DB, 为noteHistories
Datastore.prototype.loadDB = function(callback) {
    var me = this;
    if (this.__loaded) {
        callback(me.__loadedSuccess);
    } else {
        this.loadDatabase(function (err) {
            me.__loaded = true;
            console.log(err);
            me.__loadedSuccess = !err;
            callback(me.__loadedSuccess);
        });
    }
};


module.exports = db; 
