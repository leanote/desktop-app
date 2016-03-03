var xml2js = require('xml2js');
var fs = require('fs');
var Evt = require('evt');
var File = require('file');
var Note = require('note');
var Web = require('web');
var Tag = require('tag');
var async = require('async');
var Common = require('common');

var Import = {

  /*
   '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n
   <!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">\n
   <en-note>\n
     <div>简单简历模板</div>\n<div><a href="http://tympanus.net/Development/FullscreenLayoutPageTransitions/">http://tympanus.net/Development/FullscreenLayoutPageTransitions/</a></div>\n<div>优化, 上线</div>\n<div>
     <en-media type="text/html" style="cursor:pointer;" height="43" hash="bc322a11075e40f3a5b2dce3f2fffcdc"/><br/></div>\n<div>做一个slide的vcard也行啊, 用slide去做</div>\n<div><br/></div>\n<div>
     <en-media style="height:auto;" width="558" type="image/png" hash="7165072ac950b3f0fe919d45a49c847e"/></div>\n<div>颜色变换, 几套主题</div>\n<div>中间弄个头像</div>\n<div>开始的时候, 头像转转, 随后, 4个卡处渐隐出现</div>\n<div><br/></div>\n
   </en-note>\n'
   把<en-note>与</en-note>中间部分抽出

   parsedRes = {hash1: file, hash2: file}
   */
  parseEvernoteContent: function(xml, parsedRes) {
    var me = this;

    if(!xml) {
      return '';
    }
    // console.log(xml);
    var ret = /<en\-note.*?>([\s\S]*)<\/en\-note>/.exec(xml)
    var content = '';
    if(ret && ret.length == 2) {
      content = ret[1];
    }

    if(!content) {
      return '';
    }
    var reg = new RegExp("<en\-media(.*?)\/*>", "g"); // <en-media /> <en-media></en-media>
    // console.log(content);
    while(ret = reg.exec(content)) {
      // ret[1] == type="text/html" style="cursor:pointer;" height="43" hash="bc322a11075e40f3a5b2dce3f2fffcdc"
      try {
        var attrs = ret[1];

        // 得到hash
        var hashes = attrs.match(/hash="([0-9a-zA-Z]{32})"/);
        var hash = '';
        if (hashes) {
          hash = hashes[1];
        }
        if (!hash) {
          continue;
        }

        var res = parsedRes[hash];
        var fileId = res['FileId'];
        if(!fileId) {
          continue;
        }
        if(res.IsImage) {
          var replace = '<img src="' + Evt.getImageLocalUrl(fileId) + '" ' + attrs + '>';
        } else {
          var replace = '<a href="' + Evt.getAttachLocalUrl(fileId) + '">' + res['Title'] + '</a>'
        }
        content = content.replace(ret[0], replace);
      } catch(e) {
        console.log(e);
      };
    };

    // 如果是<en-media></en-media>, </en-media>匹配不到
    content = content.replace(/<\/en-media>/g, '');

    return content;
  },

  writeTest: function() {
    var path = '/Users/life/Desktop/1428226025985_2.png.txt';
    fs.readFile(path, function(err, xml) {
      File.writeBase64(xml+"", true, 'png', 'a.png', function(file) {
      });
    });
  },

  // 20150206T031506Z
  parseEvernoteTime: function (str) {
    // console.log('parseEvernoteTime');
    // console.log(str);
    if (!str || typeof str != 'string' || str.length != '20150206T031506Z'.length) {
      return new Date();
    }
    var year = str.substr(0, 4);
    var month = str.substr(4, 2);
    var day = str.substr(6, 2);

    var h = str.substr(9, 2);
    var m = str.substr(11, 2);
    var s = str.substr(13, 2);

    var d = new Date(year + '-' + month + '-' + day + ' ' + h + ':' + m + ':' + s);
    // invalid
    if (isNaN(d.getTime())) {
      return new Date();
    }
    return d;
  },

  parseEachNote: function(note, callback) {
    var me = this;

    var created = note['created'] && note['created'][0];
    var updated = note['updated'] && note['updated'][0];

    var jsonNote = {
      Title: note['title'][0],
      Tags: note['tag'] || [],
      Content: note['content'][0],
      CreatedTime: me.parseEvernoteTime(created),
      UpdatedTime: me.parseEvernoteTime(updated),
    };

    // 文件保存之
    var resources = note['resource'] || [];
    var parsedRes = {};
    var attachs = [];
    // console.log("-----------")
    // console.log(note);
    // console.log(resources);
    async.eachSeries(resources, function(res, cb) {
        // console.log(res['data'][0]['$']);
        /*
          { data: [ { _: 'base64字符中','$': { encoding: 'base64' } } ],
            mime: [ 'image/png' ],
            width: [ '2398' ],
            height: [ '1466' ],
            resource-attributes: [
              {
                'file-name': ['Leanote.html']
              }
            ]
          }
        */
        try {
          var base64Str = res['data'][0]['_'];
        } catch(e) {
          parsedRes.push({})
          return cb();
        }
        try {
          var filename = res['resource-attributes'][0]['file-name'][0];
        } catch(e) {}
        var isImage = false;
        var type = '';
        var mime = res['mime'][0].toLowerCase();
        if(mime.indexOf('image') == 0) {
          isImage = true;
        }
        type = mime.split('/').pop();
        if(type == '') {
          type = 'raw';
        }

        // console.log(base64Str);
        // console.log(isImage + "");
        // console.log(type);
        // return cb();

        File.writeBase64(base64Str, isImage, type, filename, function(file) {
          if(file) {
            parsedRes[file.hash] = file;
            // parsedRes.push(file);
            if(!isImage) {
              attachs.push(file);
            }
          } else {
            console.log('文件保存错误!');
          }

          cb();
        });
      }, function() {
        // 把content的替换之
        // console.log('ok, writeBase64 ok');
        try {
          // console.log('parsedRes');
          // console.log(parsedRes);
          jsonNote.Content = me.parseEvernoteContent(jsonNote.Content, parsedRes);
          jsonNote.Attachs = attachs;
        } catch(e) {
          console.log(e);
        }
        // console.log(jsonNote);
        return callback && callback(jsonNote);
      }
    );
  },

  // callback 是全局的
  // eachFileCallback是每一个文件的
  // eachNoteFileCallback是每一个笔记的
  // filePaths = []
  importFromEvernote: function(notebookId, filePaths, callback, eachFileCallback, eachNoteCallback) {
    var me = this;
    // var filePaths = filePaths.split(';');
    // 
    var filePaths = filePaths || [];

    async.eachSeries(filePaths, function(path, cb) {
      fs.readFile(path, function(err, xml) {
        me.parseEvernote(notebookId, xml + '', function(ret) {
          // 单个文件完成
          eachFileCallback(ret, path)
          cb();
        },
        // 单个笔记
        function(ret) {
          eachNoteCallback(ret);
        });
      });
    }, function() {
      // 全部完成
      callback(true);
    });
  },

  // 解析evernote xml
  parseEvernote: function (notebookId, xml, callback, eachCallback) {
    var me = this;
    xml2js.parseString(xml, function (err, result) {
        // console.log(result);
        if(err) {
          return callback(false);
        }
        try {
          var notes = result['en-export']['note'];
        } catch(e) {
          return callback(false);
        }
        async.eachSeries(notes, function(note, cb) {
          me.parseEachNote(note, function(jsonNote) { 
            if(jsonNote) {
              try {

                // 保存到数据库中
                jsonNote.NoteId = Common.objectId();
                jsonNote._id = jsonNote.NoteId;
                jsonNote.IsNew = true;
                jsonNote.NotebookId = notebookId;
                jsonNote.Desc = '';
                jsonNote.IsMarkdown = false;

                // console.log('----------');
                // console.log(jsonNote);

                // 添加tags
                if(jsonNote.Tags && jsonNote.Tags.length > 0) {
                  for(var h = 0; h < jsonNote.Tags.length; ++h) {
                    var tagTitle = jsonNote.Tags[h];
                    Tag.addOrUpdateTag(tagTitle, function(tag) {
                      Web.addTag(tag); 
                    });
                  }
                }

                console.log('--- haha -- Note.updateNoteOrContent');

                Note.updateNoteOrContent(jsonNote, function(insertedNote) {
                  eachCallback && eachCallback(insertedNote);
                  cb();
                });
              } catch(e) {
                console.log(e);
              }
            }
            cb();
          });
        }, function() {
          callback && callback(true);
        });
    });
  }
};

module.exports = Import;
