var Datastore = require('nedb');
var path = require('path');

// 数据库初始化
// var dbPath = require('nw.gui').App.dataPath + '/nedb';
// var dbPath = Evt.getBasePath() + '/Users/life/Library/Application Support/Leanote' + '/nedb';
// nedb2 为了port

var dbPath = ''; // '/Users/life/Library/Application Support/Leanote/nedb55';

// test
// if(dbPath.length < 6) {
    var dbPath = '/Users/life/Library/Application Support/Leanote/nedb55';
// }

// console.log(dbPath);
// g, 表全局环境
var db = {};
var dbNames = ['users', 'notebooks', 'notes', 'tags', 'images', 'attachs', 'noteHistories', 'g'];
for(var i in dbNames) {
    var name = dbNames[i];
    var p = path.join(dbPath, name + '.db');
    (function (name) {
        // 这部分非常慢!, 会卡界面
        db[name] = new Datastore({ filename: p, autoload: true , onload: function () {
            console.log(name + ' -*- is loaded');
        }});
    })(name);
}
module.exports = db;
console.log('db thread inited -----***--------**--------');

// m = {execUN: 序号, method: 'insert, findOne', dbname: 'notes', params: {username: "life"}};
// 如果method是find
// params = {query: {}, sorter: {}};
// 如果是update
// var params = {query: query,sets: sets,options: options};
process.on('message', function(m) {
    if (m.method == 'find') {
        var params = m.params;
        var query = params.query;
        var sorter = params.sorter;
        if (sorter) {
            db[m.dbname].find(query).sort(sorter).exec(function (err, ret) {
                // 返回结果
                process.send({token: m.token, err: err, ret: ret});
            });
            return;
        } else {
            db.params = query;
        }
    }
    else if (m.method == 'update') {
        var params = m.params;
        // console.log('update------------------')
        // console.log(params.options ? '' : '????????????????????????????');
        db[m.dbname].update(params.query, params.sets, params.options, function (err, ret) {
            // 返回结果
            process.send({token: m.token, err: err, ret: ret});
        });
        return;
    }
    // 查询
    db[m.dbname][m.method](db.params, function (err, ret) {
        // 返回结果
        process.send({token: m.token, err: err, ret: ret});
    });
});

