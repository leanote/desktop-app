// 服务测试

var Notebook = require('notebook');
var Note = require('note');
var Api = require('api');
var User = require('user');
var Server = require('server');

/*
Notebook.addNotebook("1", "life");
Notebook.addNotebook("2", "生活");
Notebook.addNotebook("3", "工作");
Notebook.addNotebook("4", "life2", "1");

Api.addNotebook({
  Title: "哈哈"
}, function() {});
*/
User.userId = '54bdc65599c37b0da9000002';
console.log(User.getCurActiveUserId());
Note.getDirtyNotes(function(ret) {
  console.log(ret);
});
/*
Note.getNoteByServerNoteId("54c6313799c37bdeec000008", function(ret){ 
  console.log(ret);
});
*/


// Api.auth('c@a.com', 'abc123');
// var content = '<img src="http://localhost:9000/api/file/getImage?fileId=54c2083f99c37bea5f000001"> <img src="http://localhost:9000/api/file/getImage?fileId=54c2083f99c37bea5f000001">' + "\n" + '<img src="http://localhost:9000/api/file/getImage?fileId=54c2083f99c37bea5f000001">';
// var reg = new RegExp('<img *src="' + Api.leanoteUrl + '/api/file/getImage', 'g');
// content = content.replace(reg, '<img src="' + Server.localUrl + '/api/file/getImage');
// console.log(content);
