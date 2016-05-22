const {app, BrowserWindow} = require('electron');
var ipc = require('electron').ipcMain;
var fs = require('fs');

var exportPdf = {
  export: function (htmlPath, targetPdfPath, isMarkdown, callbcak) {
    var win = new BrowserWindow({
      width: 800,
      show: false
    });

    // 写入html, 然后加载这个html
    win.loadURL('file://' + htmlPath);

    win.webContents.on('did-finish-load', function() {
      console.log('load ok');
      setTimeout(function() {
          win.webContents.printToPDF({
            printBackground: true,
            landscape: false,
            pageSize: 'A4'
          }, function(err, data) {
            fs.writeFile(targetPdfPath, data, function(err) {
              if (err) {
                callbcak(false);
              }
              else {
                callbcak(true);
              }
              // win.close();
            });
          })
      }, isMarkdown ? 1000 : 100);
    });

    // win.openDevTools();

    win.webContents.on('did-fail-load', function() {
      callbcak(false);
    });
  },

  init: function () {
    var me = this;

    ipc.on('export-pdf', function(event, args) {
      // event.sender.send();
      // console.log(args);

      me.export(args.htmlPath, args.targetPdfPath, args.isMarkdown, function (ok) {
        // console.log('导出pdf');
        // console.log(ok);
        event.sender.send('export-pdf-ret', {ok: ok, seq: args.seq});
      });
    });
  }
}

module.exports = exportPdf;