var fs = require('fs');
var Evt = require('evt');
var File = require('file');
var Note = require('note');
var Web = require('web');
var Tag = require('tag');
var async = require('async');
var Common = require('common');
var resanitize = require('resanitize');

var Import = {
  // 解析Leanote
  /*
  {
  exportDate: '2015-10-12 12:00:00',
  app: 'leanote.desktop.app.mac',
  appVersion: '1.0',
  notes: [
    {
      title: 'life',
      content: 'laldfadf', // 图片, 附件链接为 leanote://file/getImage?fileId=xxxx, leanote://file/getAttach?fileId=3232323
      tags: [1,2,3],
      isMarkdown: true,
      author: 'leanote', // 作者, 没用
      createdTime: '2015-10-12 12:00:00',
      updatedTime: '2015-10-12 12:00:00',
      files: [
        {fileId: '', base64: '', md5: '', type: 'png', 'isAttach': false, createdTime: '2031-12-31 12:12:32'}
        {fileId: '', base64: '', md5: '', type: 'png', 'isAttach': false, createdTime: '2031-12-31 12:12:32'}
      ]
    }
  ]
 }
  */
 
  // callback 是全局的
  // eachFileCallback是每一个文件的
  // eachNoteFileCallback是每一个笔记的
  // filePaths = []
  importFromLeanote: function(notebookId, filePaths, callback, 
    eachFileCallback, 
    eachNoteCallback) {
    var me = this;
    // var filePaths = filePaths.split(';');
    // 
    var filePaths = filePaths || [];

    async.eachSeries(filePaths, function(path, cb) {

      try {
        var json = JSON.parse(fs.readFileSync(path));
        me.parseLeanote(notebookId, json, function(ret) {
          // 单个文件完成
          eachFileCallback(ret, path)
          cb();
        },
        // 单个笔记
        function(ret) {
          eachNoteCallback(ret);
        });
      } catch(e) {
        cb();
        return false;
      }
    }, function() {
      // 全部完成
      callback(true);
    });
  },

  // 2015-12-12 12:00:00
  parseLeanoteTime: function (str) {
    if (!str || typeof str != 'string' || str.length != '2015-12-12 12:00:00'.length) {
      return new Date();
    }
    
    var d = new Date(str);
    // invalid
    if (isNaN(d.getTime())) {
      return new Date();
    }
    return d;
  },

  // 处理内容中的链接
  fixContentLink: function (note, filesFixed) {
    var me = this;

    var content = note.content;
    var allMatchs = [];

    if (note.isMarkdown) {

      // image
      var reg = new RegExp('!\\[([^\\]]*?)\\]\\(leanote://file/getImage\\?fileId=([0-9a-zA-Z]{24})\\)', 'g');
      var matches = reg.exec(content);
      // 先找到所有的
      while(matches) {
          var all = matches[0];
          var title = matches[1]; // img与src之间
          var fileId = matches[2];
          allMatchs.push({
            fileId: fileId,
            title: title,
            all: all,
            isAttach: false
          });
          // 下一个
          matches = reg.exec(content);
      }

      // attach
      var reg = new RegExp('\\[([^\\]]*?)\\]\\(leanote://file/getAttach\\?fileId=([0-9a-zA-Z]{24})\\)', 'g');
      var matches = reg.exec(content);
      // 先找到所有的
      while(matches) {
          var all = matches[0];
          var title = matches[1]; // img与src之间
          var fileId = matches[2];
          allMatchs.push({
            fileId: fileId,
            title: title,
            all: all,
            isAttach: true
          });
          // 下一个
          matches = reg.exec(content);
      }
    }
    else {

      // 图片处理后, 可以替换内容中的链接了
      // leanote://file/getImage?fileId=xxxx,
      var reg = new RegExp('<img([^>]*?)src=["\']?leanote://file/getImage\\?fileId=([0-9a-zA-Z]{24})["\']?(.*?)>', 'g');
      var matches = reg.exec(content);
      while(matches) {
          var all = matches[0];
          var pre = matches[1]; // img与src之间
          var fileId = matches[2];
          var back = matches[3]; // src与>之间
          allMatchs.push({
            fileId: fileId,
            pre: pre,
            back: back,
            all: all
          });
          // 下一个
          matches = reg.exec(content);
      }

      // 处理附件
      var reg = new RegExp('<a([^>]*?)href=["\']?leanote://file/getAttach\\?fileId=([0-9a-zA-Z]{24})["\']?(.*?)>([^<]*)</a>', 'g');
      var matches = reg.exec(content);
      // 先找到所有的
      while(matches) {
          var all = matches[0];
          var pre = matches[1]; // a 与href之间
          var fileId = matches[2];
          var back = matches[3] // href与>之间
          var title = matches[4];

          allMatchs.push({
            fileId: fileId,
            title: title,
            pre: pre,
            back: back,
            isAttach: true,
            all: all
          });
          // 下一个
          matches = reg.exec(content);
      }
    }

    // 替换内容
    for (var i = 0; i < allMatchs.length; ++i) {
      var eachMatch = allMatchs[i];
      var fileInfo = filesFixed[eachMatch.fileId];

      var link;
      if (!fileInfo) {
        link = '';
      }
      else {
        if (note.isMarkdown) {
          if (!eachMatch.isAttach) {
            // 用新的FileId
            var href = Api.evtService.getImageLocalUrl(fileInfo.FileId);
            link = '![' + eachMatch.title + '](' + href + ')';
          }
          else {
            var href = Api.evtService.getAttachLocalUrl(fileInfo.FileId);
            link = '[' + eachMatch.title + '](' + href + ')';
          }
        }
        else {
          if (!eachMatch.isAttach) {
            // 用新的FileId
            var href = Api.evtService.getImageLocalUrl(fileInfo.FileId);
            link = '<img ' + eachMatch.pre + 'src="' + href + '"' + eachMatch.back + '>';
          }
          else {
            var href = Api.evtService.getAttachLocalUrl(fileInfo.FileId);
            link = '<a ' + eachMatch.pre + 'href="' + href + '"' + eachMatch.back + '>' + eachMatch.title + '</a>';
          }
        }
      }
      content = content.replace(eachMatch.all, link);
    }
    note.content = content;
  },

  fixContent: function (content) {
    // srip unsage attrs
    var unsafeAttrs = ['id', , /on\w+/i, /data-\w+/i, 'clear', 'target'];
      content = content.replace(/<([^ >]+?) [^>]*?>/g, resanitize.filterTag(resanitize.stripAttrs(unsafeAttrs)));

      // strip unsafe tags
      content = resanitize.stripUnsafeTags(content, 
        ['wbr','style', 'comment', 'plaintext', 'xmp', 'listing',
      'applet','base','basefont','bgsound','blink','body','button','dir','embed','fieldset','frameset','head',
      'html','iframe','ilayer','input','isindex','label','layer','legend','link','marquee','menu','meta','noframes',
      'noscript','object','optgroup','option','param','plaintext','script','select','style','textarea','xml']
      );
      return content;
  },

  // 解析笔记
  parseNote: function (notebookId, note, callback) {
    var me = this;
    // 先把files保存到本地
    var files = note.files || [];
    if (Common.isEmpty(files)) {
      files = [];
    }

    var filesFixed = {}; // fileId(旧) => {fileId: (新fileId)}
    var attachs = [];
    async.eachSeries(files, 
      function(file, cb) {
        var isAttach = file.isAttach;
        File.writeBase64(file.base64, !isAttach, file.type, file.title, function(fileOk) {
          if(fileOk) {
            filesFixed[file.fileId] = fileOk;
            if(isAttach) {
              attachs.push(fileOk);
            }
          } else {
            console.log('文件保存错误!');
          }
          cb();
        });
      }, function () {

        me.fixContentLink(note, filesFixed);

        // 添加到数据库中
        var jsonNote = {
          Title: note.title,
          Content: me.fixContent(note.content),
          Tags: note.tags || [],
          CreatedTime: me.parseLeanoteTime(note.createdTime),
          UpdatedTime: me.parseLeanoteTime(note.updatedTime),

          IsMarkdown: note.isMarkdown || false,
          Attachs: attachs,

          NotebookId: notebookId,
          Desc: '',
          NoteId: Common.objectId(),
          IsNew: true
        };
        jsonNote._id = jsonNote.NoteId;

        for(var h = 0; h < jsonNote.Tags.length; ++h) {
          var tagTitle = jsonNote.Tags[h];
          if (tagTitle) {
            Tag.addOrUpdateTag(tagTitle, function(tag) {
              Web.addTag(tag); 
            });
          }
        }
        Note.updateNoteOrContent(jsonNote, function(insertedNote) {
          callback && callback(insertedNote);
        });
      }
    );
  },

  parseLeanote: function (notebookId, json, callback, eachCallback) {
    var me = this;
    var notes = json.notes || [];
    
    if (Common.isEmpty(notes)) {
      callback(true);
      return;
    }

    async.eachSeries(notes, function(note, cb) {
      me.parseNote(notebookId, note, function (insertedNote) {
        eachCallback(insertedNote);
        cb();
      });
    }, function () {
      callback(true);
    });
  }

};

module.exports = Import;
