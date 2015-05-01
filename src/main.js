var app = require('app');  // Module to control application life.
var BrowserWindow = require('browser-window');  // Module to create native browser window.

// Report crashes to our server.
require('crash-reporter').start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  if (process.platform != 'darwin')
    app.quit();
});

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', function() {

  app.getPath('appData');

  // var Evt = require('evt');
  // var basePath = '/Users/life/Library/Application Support/Leanote'; // require('nw.gui').App.dataPath;
  // Evt.setDataBasePath(basePath);

  // leanote protocol
  // require('leanote_protocol');

  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1000, height: 600, frame: true, transparent: false });

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
});