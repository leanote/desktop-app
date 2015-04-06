
var fs = require('fs');

var common = require('common');

/*
var AdmZip = require('adm-zip');
// https://github.com/cthackers/adm-zip
var filePath = './a.zip';
var zip = new AdmZip(filePath);
zip.extractAllTo('./cc', true);
fs.readdir('./cc', function(err, files) {
    console.log(files);
});
*/

var scanFolder = function (path) {
    var fileList = [];
    var folderList = [];
    var walk = function(path, fileList, folderList) {
          files = fs.readdirSync(path);
          files.forEach(function(item) {  
              var tmpPath = path + '/' + item;
              var stats = fs.statSync(tmpPath);

              if (stats.isDirectory() && item.indexOf('_') == -1) {  
                  walk(tmpPath, fileList, folderList); 
                  folderList.push(tmpPath); 
              }
              else if (item.indexOf('_') == -1) {  
                  fileList.push(tmpPath); 
              }
          });  
      };  


    walk(path, fileList, folderList);

      console.log('scan foler end....');
      console.log(fileList);

    return fileList;
};

// scanFolder('/Users/life/Documents/kuaipan/leanote/desktop-app/src/data/1.1');
// console.log(process.platform.toLowerCase().indexOf('window'));

// var s = fs.existsSync('/Users/life/Library/Application Support/leanote/data/5368c1aa99c37b029d000001/images/1428148081216_2.pdf');
// console.log(s);

for(var i = 0; i < 10; ++i) {
  console.log(common.objectId());
}
