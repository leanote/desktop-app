var Datastore = require('nedb');
var path = require('path');
var Evt = require('evt_main');

var db = {};

// dbPath是用户的dbPath
db.init = function (curUser, dbPath, dataBasePath) {
    var me = this;
    var dbNames = [
        'images', 
        /*
        'users', 'notebooks', 'notes', 'tags', 'attachs', 'noteHistories', 'g'*/
        ];
    for(var i in dbNames) {
        var name = dbNames[i];
        var baseDBPath = dbPath;

        var dbFilepath = path.join(baseDBPath, name + '.db');
        (function (name) {
            var autoload = true;
            db[name] = new Datastore(
                {filename: dbFilepath, autoload: autoload, onload: function () {
                console.log(name + ' is loaded [main]');
            }});
        })(name);
    }

    db._inited = true;

    // 保存起来
    Evt.init(curUser, dbPath, dataBasePath);

    console.log('db inited [main]');
};

/**
 * 执行
 * @param  {[type]}   m        [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
db.exec = function(m, callback) {
    var me = this;
    // console.log('------------------------');
    console.log('main db called');
    // console.log(m);

    if (!this._inited) {
        callback({token: m.token, err: new Error(), ret: false});
        return;
    }

    if (m.params && typeof m.params === 'string') {
        m.params = JSON.parse(m.params);
    }

    if (m.method == 'find') {
        var params = m.params;
        var query = params.query;
        var sorter = params.sorter;
        if (sorter) {
            db[m.dbname].find(query).sort(sorter).exec(function (err, ret) {
                // 返回结果
                callback({token: m.token, err: err, ret: ret});
            });
            return;
        } else {
            m.params = query;
        }
    }
    else if (m.method == 'update') {
        var params = m.params;
        // console.log('update------------------')
        // console.log(params.options ? '' : '????????????????????????????');
        db[m.dbname].update(params.query, params.sets, params.options, function (err, ret) {
            // 返回结果
            callback({token: m.token, err: err, ret: ret});
        });
        return;
    }

    // find 没有sorter
    // insert
    db[m.dbname][m.method](m.params, function (err, ret) {
        // console.log('返回结果');
        // console.log(m);
        // console.log(JSON.stringify(m.params));
        // console.log(err);
        // console.log(ret);
        // 返回结果
        callback({token: m.token, err: err, ret: ret});
    });
};

module.exports = db;
