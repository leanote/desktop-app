// var app = require('electron').app;  // Module to control application life.
const {app, BrowserWindow, crashReporter} = require('electron');
var ipc = require('electron').ipcMain;
const electron = require('electron');
const Menu = electron.Menu
const Tray = electron.Tray
var pdfMain = require('pdf_main');
var appIcon;

// Report crashes to our server.
crashReporter.start({
  productName: 'YourName',
  companyName: 'YourCompany',
  submitURL: 'https://your-domain.com/url-to-submit',
  autoSubmit: true
});


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;

// single instance
const shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    mainWindow.show();
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
})

if (shouldQuit) {
  app.quit()
}

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // if (process.platform != 'darwin')
    app.quit();
});

// 仅MAC
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

// 仅MAC
// var appIsReady = false;
app.on('activate', function() {
  console.log('activate');
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
  mainWindow.loadURL('file://' + __dirname + '/note.html');

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    console.log('closed');
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  mainWindow.on('focus', function() {
    console.log('focus');
    // ipc.send('focusWindow'); mainProcess没有该方法
    if(mainWindow && mainWindow.webContents)
      mainWindow.webContents.send('focusWindow');
  });
  mainWindow.on('blur', function() {
    console.log('blur');
    if(mainWindow && mainWindow.webContents)
      mainWindow.webContents.send('blurWindow');
  });

  function close (e, force) {
    console.log('close:', force);
    mainWindow.hide();
    e && e.preventDefault();
    mainWindow.webContents.send('closeWindow');
  }
  
  // 以前的关闭是真关闭, 现是是假关闭了
  // 关闭,先保存数据
  mainWindow.on('close', function(e) {
    // windows支持tray, 点close就是隐藏
    if (process.platform.toLowerCase().indexOf('win') === 0) { // win32
      mainWindow.hide();
      e.preventDefault();
      return;
    }

    // mac 在docker下quit;
    // linux直接点x linux不支持Tray
    close(e, false);
  });

  // 前端发来可以关闭了
  ipc.on('quit-app', function(event, arg) {
    console.log('get quit-app request');
    mainWindow.destroy();
    mainWindow = null;
  });

  pdfMain.init();

  function show () {
    mainWindow.show();
    mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.send('focusWindow');
  }

  var trayShowed = false;
  ipc.on('show-tray', function(event, arg) {
    if (trayShowed) {
      return;
    }
    trayShowed = true;

    if (process.platform == 'linux') {
      return;
    }

    appIcon = new Tray(__dirname + '/public/images/tray/' + ( process.platform == 'darwin' ? 'trayTemplate.png' : 'tray.png'))
    var contextMenu = Menu.buildFromTemplate([
      {
        label: arg.Open, click: function () {
          show();
        }
      },
      {
        label: arg.Close, click: function () {
          close(null, true);
        }
      },
    ]);
    appIcon.setToolTip('Leanote');
    // appIcon.setTitle('Leanote');
    // appIcon.setContextMenu(contextMenu);

    appIcon.on('click', function (e) {
      show();
      e.preventDefault();
    });
    appIcon.on('right-click', function () {
      appIcon.popUpContextMenu(contextMenu);
    });

  });

}
