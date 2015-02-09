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
  Title: "哈哈"54ce31fa99c37b1d5c00057e
}, function() {});
*/
// Api.uploadImage();
User.userId = '54bdc65599c37b0da9000002';
User.userId = '54d7620d99c37b030600002c';

/*
User.init(function() {
  Api.getAttach('54d8c8de99c37b02fa000002', function() {
  });
});
*/

/*
Note.hasNotes('54bdc65599c37b0da9000005', function(doc) {
  console.log(doc);
});
*/
/*
// console.log(User.getCurActiveUserId());
Note.getDirtyNotes(function(ret) {
  console.log(ret);

  Api.updateNote(ret[2], function(ret2){
    console.log(ret2);
  });

  // console.log(ret[2]);
  Api.addNote(ret[3], function(ret2){
    console.log(ret2);
  });
});
*/
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

/*
var content = '<p>lifedddddd</p><p><img src="app://leanote/data/54bdc65599c37b0da9000002/images/1422368307147_2.png" alt="" data-mce-src="app://leanote/data/54bdc65599c37b0da9000002/images/1422368307147_2.png" style="display: block; margin-left: auto; margin-right: auto;"></p><p><img src="http://127.0.0.1:8008/api/file/getImage?fileId=54c7ae27d98d0329dd000000" alt="" data-mce-src="http://127.0.0.1:8008/api/file/getImg?fileId=54c7ae27d98d0329dd000000"></p><p><br></p><p><img src="http://127.0.0.1:8008/api/file/getImage?fileId=54c7ae855e94ea2dba000000" alt="" data-mce-src="http://127.0.0.1:8008/api/file/getImage?fileId=54c7ae855e94ea2dba000000" style="display: block; margin-left: auto; margin-right: auto;"></p><p><br></p><p><br></p>';
// http://127.0.0.1:8008/api/file/getImage?fileId=54c7ae27d98d0329dd000000
// var reg = new RegExp('http://127.0.0.1:8008/api/file/getImage?fileId=([0-9a-zA-Z]{24})', 'g');
var reg = new RegExp("http://127.0.0.1:8008/api/file/getImage\\?fileId=([0-9a-zA-Z]{24})", 'g');
var fileIds = [];
while((result = reg.exec(content)) != null) {
  // result = [所有, 子表达式1, 子表达式2]
    console.log(result);
}
console.log("??");
*/

var a = '<img src="http://127.0.0.1:8008/api/file/getImage?fileId=34232323234iji3"';
// var reg = /fileId=(.+?)"/g;
var reg = new RegExp("http://127.0.0.1:8008/api/file/getImage\\?fileId=(.{10})", 'g');

console.log(reg);
while(s = reg.exec(a)) {
  console.log(s);
}
