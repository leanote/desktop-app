var app = require('app');  // Module to control application life.
var BrowserWindow = require('browser-window');  // Module to create native browser window.

// Report crashes to our server.
require('crash-reporter').start();

var debug = false;

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

var Menu = require('menu');
var MenuItem = require('menu-item');

function buildMenu(items) {
  var menu = new Menu();
  for(var i = 0; i < items.length; ++i) {
    var item = items[i];
    if(item.submenu) {
      item.submenu = buildMenu(item.submenu);
    }
    var item = new MenuItem(item);

    menu.append(item);
  }
  return menu;
}

function setMenu() {
  var isMac = process.platform == 'darwin';
  var template = [
    {
      label: 'Leanote',
      submenu: [
        {
          label: 'About Leanote',
          selector: 'orderFrontStandardAboutPanel:'
        },
        {
          type: 'separator'
        },
        {
          label: 'Services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          label: 'Hide Electron',
          accelerator: 'Command+H',
          selector: 'hide:'
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          selector: 'hideOtherApplications:'
        },
        {
          label: 'Show All',
          selector: 'unhideAllApplications:'
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: function() { app.quit(); }
        },
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'Command+Z',
          selector: 'undo:'
        },
        {
          label: 'Redo',
          accelerator: 'Shift+Command+Z',
          selector: 'redo:'
        },
        {
          type: 'separator'
        },
        {
          label: 'Cut',
          accelerator: 'Command+X',
          selector: 'cut:'
        },
        {
          label: 'Copy',
          accelerator: 'Command+C',
          selector: 'copy:'
        },
        {
          label: 'Paste',
          accelerator: 'Command+V',
          selector: 'paste:'
        },
        {
          label: 'Select All',
          accelerator: 'Command+A',
          selector: 'selectAll:'
        },
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: isMac ? 'Command+R' : 'Ctrl+R',
          click: function() { BrowserWindow.getFocusedWindow().reloadIgnoringCache(); }
        },
        {
          label: 'Toggle DevTools',
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+I',
          click: function() { BrowserWindow.getFocusedWindow().toggleDevTools(); }
        },
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:'
        },
        {
          label: 'Close',
          accelerator: 'Command+W',
          selector: 'performClose:'
        },
        {
          type: 'separator'
        },
        {
          label: 'Bring All to Front',
          selector: 'arrangeInFront:'
        },
      ]
    },
    {
      label: 'Mode',
      submenu: [
        {
          label: 'Toggle Fullscreen',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:'
        },
        {
          label: 'Toggle Presentation',
          accelerator: 'Command+W',
          selector: 'performClose:'
        }
      ]
    },
    {
      label: 'Help',
      submenu: []
    },
  ];

  // menu = Menu.buildFromTemplate(template);

  menu = buildMenu(template);

  Menu.setApplicationMenu(menu); // Must be called within app.on('ready', function(){ ... });
}

var child_process = require('child_process');
function killPort(callback) {
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
      frame: debug || process.platform != 'darwin', 
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

  // 作为调试
  debug && setMenu();
}


