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

if (!app.makeSingleInstance) {
  app.allowRendererProcessReuse = true

  // single instance
  const gotTheLock = app.requestSingleInstanceLock()
  if (!gotTheLock) {
    console.log("gotTheLock is false, another instance is running")
    app.quit()
  } else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      if (mainWindow) {
        mainWindow.show();
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
      }
    })
  }
}
else {
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

function removeEvents (win) {
  win.removeAllListeners('closed');
  win.removeAllListeners('focus');
  win.removeAllListeners('blur');
  win.removeAllListeners('close');
}

function close (e, force) {
  console.log('close:', force);
  if (mainWindow) {
    mainWindow.hide();
    e && e.preventDefault();
    mainWindow.webContents.send('closeWindow');
  } else {
    app.quit();
  }
}

function bindEvents (win) {
  mainWindow = win;

  // Emitted when the window is closed.
  win.on('closed', function() {
    console.log('closed');
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  win.on('focus', function() {
    console.log('focus');
    // ipc.send('focusWindow'); mainProcess没有该方法
    if(win && win.webContents)
      win.webContents.send('focusWindow');
  });
  win.on('blur', function() {
    console.log('blur');
    if(win && win.webContents)
      win.webContents.send('blurWindow');
  });
  
  // 以前的关闭是真关闭, 现是是假关闭了
  // 关闭,先保存数据
  win.on('close', function(e) {
    // windows支持tray, 点close就是隐藏
    if (process.platform.toLowerCase().indexOf('win') === 0) { // win32
      win.hide();
      e.preventDefault();
      return;
    }

    // mac 在docker下quit;
    // linux直接点x linux不支持Tray
    close(e, false);
  });

}

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
      transparent: false,
      webPreferences: {
        nodeIntegration: true
      }
    }
  );

  console.log('load: file://' + __dirname + '/note.html');

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/note.html');

  bindEvents(mainWindow);

  // 前端发来可以关闭了
  ipc.on('quit-app', function(event, arg) {
    console.log('get quit-app request');
    if (mainWindow) {
      mainWindow.destroy();
      mainWindow = null;
    } else {
      app.quit();
    }
  });

  // open login.html and note.html
  ipc.on('openUrl', function(event, arg) {
    console.log('openUrl', arg);

    arg.webPreferences = arg.webPreferences === undefined ? {} : arg.webPreferences;
    arg.webPreferences.nodeIntegration = true;

    var html = arg.html;
    var everWindow = mainWindow;
    var win2 = new BrowserWindow(arg);
    win2.loadURL('file://' + __dirname + '/' + html);
    mainWindow = win2;

    // remove all events then close it
    removeEvents(everWindow);
    everWindow.close();

    if (html.indexOf('note.html') >= 0) {
      bindEvents(mainWindow)
    }
  });

  pdfMain.init();

  function show () {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.restore();
      mainWindow.focus();
      mainWindow.webContents.send('focusWindow');
    } else {
      app.quit();
    }
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
