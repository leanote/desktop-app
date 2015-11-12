var app = require('app');  // Module to control application life.
var BrowserWindow = require('browser-window');  // Module to create native browser window.

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

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', openIt);

function killPort(callback) {
  var protocol = require('protocol');
  if (!protocol.registerFileProtocol) {
    return;
  }
  var child_process = require('child_process');
  var port = '8912';
  if (process.platform.toLowerCase().indexOf('win') === 0) {
    // & EXIT 表示只循环一次
    // Leanote会有两个pid绑定端口, 另一个和electron相关, kill掉也会把自己kill掉
    var sh1 = 'FOR /F "tokens=4 delims= " %P IN (\'netstat -a -n -o ^| findstr :' + port + '\') DO (TaskKill.exe /F /PID %P) & Exit';
    var sh2 = 'FOR /F "tokens=5 delims= " %P IN (\'netstat -a -n -o ^| findstr :' + port + '\') DO (TaskKill.exe /F /PID %P) & Exit';
    child_process.exec(sh1, function () {
      child_process.exec(sh2, callback);
    });
  }
  else {
    var sh = 'kill -9 $(lsof -i:' + port + ' -t)';
    child_process.exec(sh, callback);
  }
}

function openIt() {
  killPort(_openIt);
}

function _openIt() {
  // console.log(arguments);
  // app.getPath('appData');

  // var Evt = require('evt');
  // var basePath = '/Users/life/Library/Application Support/Leanote'; // require('nw.gui').App.dataPath;
  // Evt.setDataBasePath(basePath);

  // leanote protocol
  // require('leanote_protocol');

  // Create the browser window.
  mainWindow = new BrowserWindow({
      width: 1050, 
      height: 595, 
      frame: process.platform != 'darwin', 
      transparent: false
    }
  );

  // and load the index.html of the app.
  mainWindow.loadUrl('file://' + __dirname + '/note.html');

  // 不能放在这里, 刚开始有图片, 之后添加的图片不能显示 ??
  // // 启动服务器, 图片
  // var Server = require('server');
  // Server.start();

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  var ipc = require('ipc');
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
}
