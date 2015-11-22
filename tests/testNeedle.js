var needle = require('needle');
var url = 'http://i7.baidu.com/it/u=401605395,2928249378&fm=96&s=5DAEA85217785B88557C00640300B062';
url = 'http://i7.baidu.com/it/u=401605395,2928249378&fm=96&s=5DAEA85217785B88557C00640300B062';
// url = 'http://leanote.com/images/logo.png';
needle.get(url, function(err, resp) {
    console.log(resp.statusCode);
    console.log(typeof resp.body);
});