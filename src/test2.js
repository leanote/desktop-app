var needle = require('needle');

var m = 100;
var j = 0;
for(var i = 0; i < m; ++i) {
  needle.get('http://leanote.com/api/user/getSyncState?token=554576a438f4113d3a000962&', function(err, resp) {
    j++;
    console.log(j);
  });
}