// 服务测试

var Notebook = require('notebook');
var Note = require('note');
var Api = require('api');
var User = require('user');
var Evt = require('evt');
var Common = require('common');

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
User.userId = '5503c84c99c37b22a4000003';

// 54d7624205fcd105da00005

// var reg = new RegExp(Evt.localUrl + '/api/file/getImage', 'g');
// content = content.replace(reg, Evt.leanoteUrl + '/api/file/getImage');

// Api.auth('leanote@leanote.com', 'myleanotelife121');

User.init(function() {

  /*
  Note.getNote('54d76aeec596f27b0b000000', function(note) {
    console.log(note);
  });
  */
 
 /*
   Notebook.getDirtyNotebooks(function(notebooks) {
    console.log(notebooks);
   });

*/
  
  // Note.getNoteByServerNoteId('54f1a1f899c37b4faf000001', function(note) {
  //   console.log(note);
  // });
  
  Note.getTrashNotes(function(ret) {
    console.log(ret);
    console.log(ret.length);

  });
});


/*
Api.auth('e@a.com', 'abc123');
User.getAllUsers();
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

/*
var a = '<img src="http://127.0.0.1:8008/api/file/getImage?fileId=34232323234iji3"';
// var reg = /fileId=(.+?)"/g;
var reg = new RegExp("http://127.0.0.1:8008/api/file/getImage\\?fileId=(.{10})", 'g');

a = a.replace(reg, 'xx');
console.log(a);
*/
/*

console.log(reg);
while(s = reg.exec(a)) {
  console.log(s);
}
*/

// console.log(Common.goNowToDate('2014-01-06T18:29:48.802+08:00'));

var A = {
  _deepTraversal: [],
  _visited: {},
  deep: function(T) {
    var me = this;
    if(!T || !T.Subs || T.Subs.length == 0) {
      return;
    }
    for(var i = 0; i < T.Subs.length; ++i) {
      var node = T.Subs[i];
      if(!me._visited[node.NotebookId]) {
        me._visited[node.NotebookId] = true;
        me._deepTraversal.push(T.Subs[i]);
        me.deep(T.Subs[i]);
      }
    }
  },

  init: function() {
    var nodes = [
      {NotebookId: 1, Subs: [{NotebookId: 2, Subs: [{NotebookId: 9}]}, {NotebookId: 3, Subs: [{NotebookId: 4}, {NotebookId: 5}]}]},
      {NotebookId: 6},
      {NotebookId: 7}
    ]
    this.deep({Subs: nodes});
    console.log(this._deepTraversal);
  }
};
// A.init();