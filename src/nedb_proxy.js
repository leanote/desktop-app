var ipc = require('electron').ipcRenderer;

function Find(dbProxy, dbname, query) {
    this.query = query;
    this.dbProxy = dbProxy;
    this.dbname = dbname;
}
Find.prototype.sort = function (sorter) {
    this.sorter = sorter;
    return this;
}

Find.prototype.exec = function (callback) {
    var params = {
        query: this.query,
        sorter: this.sorter
    };
    this.dbProxy.send(params, callback, 'find');
};

//==========

function DBProxy(dbname) {
    this.dbname = dbname;
};

var token = 0;
var token2Callback = {};

DBProxy.prototype.send = function(params, callback, method) {
    var m = {
        token: ++token,
        method: method,
        dbname: this.dbname,
        // 转为json字符串, 如果{[a], [a]}, 在main接收后变成了 {[a], [null]}, 对象引用问题
        params: params ? JSON.stringify(params) : ''
    }
    token2Callback[token] = callback;
    ipc.send('db-exec', m);
};

// NB.find({UserId: userId, $or: [{LocalIsDelete : { $exists : false }}, {LocalIsDelete: false}] }, function(err, notebooks) {
// Notes.find(query).sort({'UpdatedTime': -1}).exec(function(err, notes) {
DBProxy.prototype.find = function (params, callback) {
    if (callback) {
        // console.log('client');
        // console.log(params);
        this.send({query: params}, callback, 'find');
    }
    else {
        return new Find(this, this.dbname, params);
    }
};
DBProxy.prototype.findOne = function (params, callback) {
    this.send(params, callback, 'findOne');
};
DBProxy.prototype.count = function (params, callback) {
    this.send(params, callback, 'count');
};
DBProxy.prototype.insert = function (params, callback) {
    this.send(params, callback, 'insert');
};
DBProxy.prototype.update = function (query, sets, options, callback) {
    if (typeof options == 'function') {
        callback = options;
        options = {};
    }
    if (!options) {
        options = {};
    }
    var params = {
        query: query,
        sets: sets,
        options: options
    };
    this.send(params, callback, 'update');
};
DBProxy.prototype.remove = function (params, callback) {
    this.send(params, callback, 'remove');
};

// m = {token: , err : , ret: }
ipc.on('db-exec-ret', function(event, m) {
    var token = m.token;
    var callback = token2Callback[token];
    delete token2Callback[token];
    // console.log('clent 接收到消息');
    // console.log(m);
    // console.log('--------------');
    if(m.ret && typeof m.ret == 'string') {
        m.ret = JSON.parse(m.ret);
    }
    callback && callback(m.err, m.ret);
});

module.exports = DBProxy;
