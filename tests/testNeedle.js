var needle = require('needle');
var url = 'http://leanote.com/api/file/getImage?fileId=56fe6b53ab64415150001dee';
// url = 'http://leanote.com/images/logo.png';
needle.get(url, function(err, resp) {
    console.log(resp.statusCode);
    console.log(resp.body);
});