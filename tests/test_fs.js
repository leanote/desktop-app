var fs = require('fs');
var filename = '/Users/life/Library/Application Support/leanote/nedb55/noteHistories.db';

// 文件超过 256 MB is the limit for strings in V8 so no, it's not a regression. What would you report in more detail?
// 就不能转成string
// toString failed
/*
 if (result === undefined) {
    var error = 'toString failed';
    // naive check, needs to also check encoding
    if (this.length > binding.kStringMaxLength {
      error += ': Buffer larger than kStringMaxLength';
    }
    throw new Error(error);
  }
 */

fs.readFile(filename, 'utf8', function (err, rawData) {
    console.log(err);
    console.log(rawData ? rawData.length : 'nono');
});