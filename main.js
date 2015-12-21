var app = require('app');  // Module to control application life.
var BrowserWindow = require('browser-window');  // Module to create native browser window.
var ipc = require('ipc');
var pdfMain = require('pdf_main');

// Report crashes to our server.
require('crash-reporter').start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // if (process.platform != 'darwin')
    app.quit();
});

// 避免可以启动多个app
app.on('open-file', function(e) {
  // console.log('reopen');
  if(mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    openIt();
  }
});

// var appIsReady = false;
app.on('activate-with-no-open-windows', function() { 
  if(mainWindow) {
    mainWindow.show();
  }
  else {
    // 有时, 重启电脑会出现这种情况
    // Cannot create BrowserWindow before app is ready
    // 很可能app.on('ready')还没有出现, 但是ready后肯定有mainWindow了
    // 所以, 这一段注释掉
    // openIt();
  }
});

// DB
var DB = {
  init: function () {
    var me = this;
    var db = require('db_main');

    // 前端发来消息
    // m = {token: token, method: 'insert, findOne', dbname: 'notes', params: {username: "life"}};
    ipc.on('db-exec', function(event, m) {
      // me._token2Sender[m.token] = event.sender;
      db.exec(m, function (ret) {
        // console.log('main called ret:');
        // console.log(ret);
        if (ret && ret.ret) {
          ret.ret = JSON.stringify(ret.ret);
        }
        event.sender.send('db-exec-ret', ret);
      });
    });

    /**
     * 前端发消息过来说可以初始化了
     * @param  {<Event>} event
     * @param  {Object} params {
        curUser: <User> 是当前用户
        dbPath: string 是用户的dbPath
        dataBasePath: string 所有数据的基地址
     * }
     */
    ipc.on('db-init', function (event, params) {
      db.init(params.curUser, params.dbPath, params.dataBasePath);
    });
  }
};

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', openIt);

function openIt() {
  // 数据库
  DB.init();

  // 协议
  var leanoteProtocol = require('leanote_protocol');
  leanoteProtocol.init();


  // Create the browser window.
  mainWindow = new BrowserWindow({
      width: 1050, 
      height: 595, 
      frame: process.platform != 'darwin', 
      transparent: false
    }
  );

  console.log('load: file://' + __dirname + '/note.html');

  // and load the index.html of the app.
  mainWindow.loadUrl('file://' + __dirname + '/note.html');

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  mainWindow.on('focus', function() {
    // ipc.send('focusWindow'); mainProcess没有该方法
    if(mainWindow && mainWindow.webContents)
      mainWindow.webContents.send('focusWindow');
  });
  mainWindow.on('blur', function() {
    if(mainWindow && mainWindow.webContents)
      mainWindow.webContents.send('blurWindow');
  });
  
  // 关闭,先保存数据
  mainWindow.on('close', function(e) {
    mainWindow.hide();
    e.preventDefault();
    mainWindow.webContents.send('closeWindow');
  });

  // 前端发来可以关闭了
  ipc.on('quit-app', function(event, arg) {
    console.log('get quit-app request');
    mainWindow.destroy();
    mainWindow = null;
  });

  pdfMain.init();
}
