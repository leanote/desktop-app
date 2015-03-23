var AdmZip = require('adm-zip');
var fs = require('fs');
// https://github.com/cthackers/adm-zip
var filePath = './a.zip';
var zip = new AdmZip(filePath);
zip.extractAllTo('./cc', true);
fs.readdir('./cc', function(err, files) {
    console.log(files);
});