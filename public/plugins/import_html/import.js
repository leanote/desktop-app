var fs = require('fs');
var Evt = require('evt');
var File = require('file');
var Note = require('note');
var Web = require('web');
var Tag = require('tag');
var async = require('async');
var Common = require('common');
var path = require('path');
var resanitize = require('resanitize');
var iconv = require('iconv-lite');

var Import = {
 
  // callback 是全局的
  // eachFileCallback是每一个文件的
  // eachNoteFileCallback是每一个笔记的
  // filePaths = []
  importFromHTML: function(notebookId, filePaths, callback, 
    eachFileCallback, 
    eachNoteCallback) {
    var me = this;
    // var filePaths = filePaths.split(';');
    // 
    var filePaths = filePaths || [];

    async.eachSeries(filePaths, function(path, cb) {

      try {
        // 可能不是utf-8文件
        me.parseHTML(notebookId, path, function(ret) {
          // 单个文件完成
          eachFileCallback(ret, path);
          cb();
        },
        // 单个笔记
        function(ret) {
          eachNoteCallback(ret);
        });
      } catch(e) {
        console.error(e);
        cb();
        return false;
      }
    }, function() {
      // 全部完成
      callback(true);
    });
  },

  fixContent: function (content) {
    // srip unsage attrs
    var unsafeAttrs = ['id', , /on\w+/i, /data-\w+/i, 'clear', 'target'];
      content = content.replace(/<([^ >]+?) [^>]*?>/g, resanitize.filterTag(resanitize.stripAttrs(unsafeAttrs)));

      // strip unsafe tags
      content = resanitize.stripUnsafeTags(content, 
        ['wbr','style', 'comment', 'plaintext', 'xmp', 'listing',
      'applet','base','basefont','bgsound','blink','body','button','dir','embed','fieldset','frameset','head',
      'html','iframe','ilayer','input','isindex','layer','legend','link','marquee','menu','meta','noframes',
      'noscript','object','optgroup','option','param','plaintext','script','select','textarea','xml']
      );
      return content;
  },

  getTitle: function (htmlData, filename) {
    // 1. 在<title></title> header中找
    try {
      var title = htmlData.match(/<title[^>]*>([\s\S]*?)<\/title>/i)[1];
      if (title && title.replace(/(^\s*)|(\s*$)/g, "")) {
        return title;
      }
    } catch(e) {
    }

    // 2. 通过文件名获取
    var pathInfo = Api.commonService.splitFile(filename);
    return pathInfo.nameNotExt;
  },

  parseHTML: function (notebookId, filename, callback, eachCallback) {
    var me = this;
    try {
      var data = fs.readFileSync(filename);
      var htmlData = iconv.decode(data, 'utf-8');
      if (!htmlData) {
        return callback(false);
      }
      // utf-16
      if (htmlData.indexOf('�') != -1) {
        htmlData = iconv.decode(fs.readFileSync(filename), 'utf-16');
      }
      // gbk
      if (htmlData.indexOf('�') != -1) {
        htmlData = iconv.decode(fs.readFileSync(filename), 'gbk');
      }
      var body = htmlData.match(/<body[^>]*>([\s\S]*?)<\/body>/i)[1];
      if (!body) {
        return callback(false);
      }
      // Leanote导出为html后会自动加h1
      body = body.replace(/<h1 class="title" id="leanote-title">.*?<\/h1>/, '');
      var title = this.getTitle(htmlData, filename) || getMsg('Untitled');
      // 解析里面的图片
      var reg = /<img[^>]*?(src=(?:["'])([^>]+?)(?:["']))[^>]*?>/gi;
      var ret;
      var imagePaths = [];
      while(ret = reg.exec(body)) {
        // console.log(ret);
        /*
        "<img id="wiz_todo_1429010269089_521433" class="wiz-todo-img wiz-img-cannot-drag" state="unchecked" _src="wiz测试笔记_files/unchecked.png" src="wiz测试笔记_files/unchecked.png" />"
        " src="wiz测试笔记_files/unchecked.png""
        "wiz测试笔记_files/unchecked.png"
        */
        var imagePath = ret[2];
        var imagePathLower = imagePath.toLowerCase();
        // 是http图片,skip
        if (imagePathLower.indexOf('http://') < 0 && imagePathLower.indexOf('https://') < 0) {
          imagePaths.push(imagePath);
        }
      }
      var dirname = path.dirname(filename);
      // console.log('??', dirname)
      var imagePath2ImageInfo = {}; // imagePath => imageInfo
      async.eachSeries(imagePaths, function(imagePath, cb) {

        // 重复图片
        if (imagePath2ImageInfo[imagePath]) {
          return cb();
        }

        var absImagePath;
        // 绝对路径
        if (imagePath.indexOf('file://') == 0) {
          absImagePath = imagePath.substr('file://'.length);
          // file:///c:/a/b
          if (process.platform.toLowerCase().substr(0, 3) == 'win') {
            absImagePath = absImagePath.substr(1, absImagePath.length-1);
          }
        } else {
          absImagePath = path.join(dirname, imagePath);
        }
        if (fs.existsSync(absImagePath)) {
          File.copyFile(absImagePath, true, function (imageInfo) {
            if (imageInfo) {
              imagePath2ImageInfo[imagePath] = imageInfo;
            }
            cb();
          });
        } else {
          return cb();
        }
      }, function () {
        // 替换图片
        // console.log(imagePath2ImageInfo);
        while(ret = reg.exec(body)) {
          // console.log('=====');
          // console.log(ret);
          var imagePath = ret[2];
          var imageInfo = imagePath2ImageInfo[imagePath];
          if (imageInfo) {
            // console.log('有的');
            var imageLink = ' src="leanote://file/getImage?fileId=' + imageInfo.FileId + '"';
            body = body.replace( ret[0], ret[0].replace(ret[1], imageLink) );
          }
        }

        // console.log(body);

        // OK了
        // 添加到数据库中
        var jsonNote = {
          Title: title,
          Content: me.fixContent(body),
          Tags: [],
          CreatedTime: new Date(),
          UpdatedTime: new Date(),

          IsMarkdown: false,
          Attachs: null,

          NotebookId: notebookId,
          Desc: '',
          NoteId: Common.objectId(),
          IsNew: true
        };
        jsonNote._id = jsonNote.NoteId;
        Note.updateNoteOrContent(jsonNote, function(insertedNote) {
          eachCallback && eachCallback(insertedNote);
          callback(true);
        });
      });

    } catch(e) {
      console.trace(e);
      callback(false);
    }
  },

};

module.exports = Import;
