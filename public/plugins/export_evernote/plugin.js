/**
 * 导出Evernote插件
 * @author  life life@leanote.com
 *
 * 注意/遗留问题:
 *
 * 1. 导出的文件有可能不能导入到evernote, 即使可以导入, 也有可能不能同步
 *    原因: enml.dtd
 * 2. 导出markdown问题, 加一个<pre>markdown content</pre>. 导出的markdown没有图片
 *
 * https://dev.evernote.com/doc/articles/enml.php

Before submitting HTML content over the EDAM API the client application is expected to follow the following steps:
1. Convert the document into valid XML
2. Discard all tags that are not accepted by the ENML DTD
3. Convert tags to the proper ENML equivalent (e.g. BODY becomes EN-NOTE)
4. Validate against the ENML DTD
5. Validate href and src values to be valid URLs and protocols

 */
define(function() {
	var async; //  = require('async');
	var enml; //  = nodeRequire('./public/plugins/export_evernote/enml');

	//==============
	// tpls

	var evernoteTpl = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export3.dtd">
<en-export export-date="{exportedTime}" application="leanote.desktop.app.{platform}" version="{appVersion}">
<note><title>{title}</title><content><![CDATA[<?xml version="1.0" encoding="UTF-8" standalone="no"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note>{content}</en-note>
]]></content>
    <created>{createdTime}</created>
    <updated>{updatedTime}</updated>
    {tags}
    <note-attributes>
        <latitude></latitude>
        <longitude></longitude>
        <altitude></altitude>
        <leaIsMarkdown>{isMarkdown}</leaIsMarkdown>
        <author>{authorEmail}</author>
        <source>leanote.desktop</source>
        <reminder-order>0</reminder-order>
    </note-attributes>
    {resources}
</note>
</en-export>
	`;

	var resourceTpl = `<resource>
    <data encoding="base64">{base64}</data>
    <mime>{type}</mime>
    <width>{width}</width>
    <height>{height}</height>
    <duration>0</duration>
    <resource-attributes>
        <timestamp>{createdTime}</timestamp>
        <file-name>{name}</file-name>
    </resource-attributes>
</resource>`;

	//===========
	// start

	var exportEvernote = {
		langs: {
			'en-us': {
				'export': 'Export Evernote',
				'Exporting': 'Exporting',
				'Exporting: ': 'Exporting: ',
				'exportSuccess': 'Evernote saved successful!',
				'exportFailure': 'Evernote saved failure!',
				'notExists': 'Please sync your note to ther server firslty.'
			},
			'de-de': {
				'export': 'Als Evernote exportieren',
				'Exporting': 'Exportiere',
				'Exporting: ': 'Exportiere: ',
				'exportSuccess': 'Evernote erfolgreich gespeichert!',
				'exportFailure': 'Evernote speichern fehlgeschlagen!',
				'notExists': 'Bitte Notizen zuerst mit dem Server synchronisieren.'
			},
			'zh-cn': {
				'export': '导出Evernote',
				'Exporting': '正在导出',
				'Exporting: ': '正在导出: ',
				'exportSuccess': 'Evernote导出成功!',
				'exportFailure': 'Evernote导出失败!'
			},
			'zh-hk': {
				'export': '導出Evernote',
				'Exporting': '正在導出',
				'Exporting: ': '正在導出: ',
				'exportSuccess': 'Evernote導出成功!',
				'exportFailure': 'Evernote導出失敗!'
			}
		},

		_inited: false,
		init: function() {
			var me = this;
			if (me._inited) {
				return;
			}
			async = require('async');
			enml= nodeRequire('./public/plugins/export_evernote/enml');

			me._inited = true;
		},

		replaceAll: function(src, pattern, to) {
			if(!src) {
				return src;
			}
			while(true) {
				var oldSrc = src;
				src = src.replace(pattern, to);
				if(oldSrc === src) {
					return src;
				}
			}
		},

		fixFilename: function(filename) {
			var reg = new RegExp("/|#|\\$|!|\\^|\\*|'| |\"|%|&|\\(|\\)|\\+|\\,|/|:|;|<|>|=|\\?|@|\\||\\\\", 'g');
			filename = filename.replace(reg, "-");
			// 防止出现两个连续的-
			while(filename.indexOf('--') != -1) {
				filename = this.replaceAll(filename, '--', '-');
			}
			if (filename.length > 1) {
				// 最后一个-
				filename = filename.replace(/\-$/, '');
			}
			return filename;
		},

		getEvernoteTime: function(t) {
			// 20151026T033928Z
			// 2015 10 26 T 03 39 28 Z
			if (!t) {
				t = new Date();
			}
			if (typeof t != 'object' || !('getTime' in t)) {
				try {
					t = new Date(t);
				}
				catch(e) {
					t = new Date();
				}
			}
			return t.format("yyyyMMddThhmmssZ");
		},

		renderTpl: function (tpl, info, keys) {
			for(var i = 0; i < keys.length; ++i) {
				tpl = tpl.replace('{' + keys[i] + '}', info[keys[i]]);
			}
			return tpl;
		},

		render: function(note, callback) {
			var me = this;
			var keys = ['title', 'content', 'createdTime', 'updatedTime', 'tags',
				'isMarkdown', 'exportedTime', 'appVersion', 'authorEmail', 'platform', 'resources'];
			var tpl = evernoteTpl;
			var appVersion = Api.getCurVersion() || {version: 'unknown'};
			var info = {
				title: note.Title,
				content: note.Content,
				createdTime: me.getEvernoteTime(note.createdTime),
				updatedTime: me.getEvernoteTime(note.updatedTime),
				exportedTime: me.getEvernoteTime(),
				authorEmail: Api.userService.email || Api.userService.username,
				platform: process.platform,
				appVersion: appVersion.version,
				isMarkdown: note.IsMarkdown ? 'true' : 'false',
				tags: me.renderTags(note.Tags)
			};

			me.fixResources(note.Content, function (content, resources) {
				content = $('<div>' + content + '</div>').html();
				content = content.replace(/<br.*?>/g, '<br />');
				content = content.replace(/<hr.*?>/g, '<hr />');
				info.resources = resources;

				enml.ENMLOfHTML(content, function(err, ENML) {
					if (err) {
						info.content = content;
					}
					else {
						info.content = ENML;
					}

					if (note.IsMarkdown) {
						info.content = '<pre>' + info.content + '</pre>';
					}

					callback(me.renderTpl(tpl, info, keys));
				});
			});
		},

		renderTags: function (tags) {
			if (!tags || tags.length === 0) { 
				return ''
			}
			var str = '';
			for (var i = 0; i < tags.length; ++i) {
				if (tags[i]) {
					str += '<tag>' + tags[i] + '</tag>';
				}
			}
			return str;
		},

		// 得到resource
		renderResource: function (fileInfo) {
			var me = this;
			var keys = ['name', 'width', 'height', 'type', 'createdTime', 'base64'];
			var tpl = resourceTpl;
			fileInfo.width = '';
			fileInfo.height = '';
			fileInfo.createdTime = me.getEvernoteTime(fileInfo.createdTime);
			return me.renderTpl(tpl, fileInfo, keys);
		},

		findAllImages: function (content) {
			var reg = new RegExp('<img[^>]*?src=["\']?' + Api.evtService.getImageLocalUrlPrefix() + '\\?fileId=([0-9a-zA-Z]{24})["\']?.*?>', 'g');
			var matches = reg.exec(content);

			// width="330" height="330", style="width:200px"
			var widthReg = /width(=|:)[ "']*?([0-9]+)/;
			var heightReg = /height(=|:)[ "']*?([0-9]+)/;

			// 先找到所有的
			var allMatchs = [];
			while(matches) {
			    var all = matches[0];

			    var fileId = matches[1];

			    // 得到width, height
			    var widthRet = all.match(widthReg);
			    var heightRet = all.match(heightReg);
			    var width = '';
			    var height = '';
			    if (widthRet) {
			        width = widthRet[2];
			    }
			    if (heightRet) {
			        height = heightRet[2];
			    }

			    allMatchs.push({
			    	width: width,
			    	height: height,
			    	fileId: fileId,
			    	all: all
			    });
			    // 下一个
			    matches = reg.exec(content);
			}

			return allMatchs;
		},

		findAllAttachs: function (content) {
			var reg = new RegExp('<a[^>]*?href=["\']?' + Api.evtService.getAttachLocalUrlPrefix() + '\\?fileId=([0-9a-zA-Z]{24})["\']?.*?>([^<]*)</a>', 'g');
			var matches = reg.exec(content);

			// 先找到所有的
			var allMatchs = [];
			while(matches) {
			    var all = matches[0];

			    var fileId = matches[1];
			    var title = matches[2];

			    allMatchs.push({
			    	fileId: fileId,
			    	title: title,
			    	isAttach: true,
			    	all: all
			    });
			    // 下一个
			    matches = reg.exec(content);
			}
			return allMatchs;
		},
		

		fixResources: function (content, callback) {
			var me = this;
			
			var allImages = me.findAllImages(content) || [];
			var allAttachs = me.findAllAttachs(content) || [];

			var allMatchs = allImages.concat(allAttachs);

			// console.log(allMatchs);

			if (allMatchs.length == 0) {
				callback(content, '');
				return;
			}

			var resources = '';
			var fileIdFixed = {};

			var fileInfos = {}; // fileId => 
			var fileRendered = {};

			function replaceContent () {
				for (var i = 0; i < allMatchs.length; ++i) {
					var eachMatch = allMatchs[i];
					var fileInfo = fileInfos[eachMatch.fileId];
					if (!fileInfo) {
						continue;
					}

					var media = '<en-media';
					if (!eachMatch.isAttach) {
						if (eachMatch.width) {
							media += ' width="' + eachMatch.width + '"';
						}
						if (eachMatch.height) {
							media += ' height="' + eachMatch.height + '"';
						}
						else {
							media += ' style="height:auto"';
						}
					}
					else {
						media += ' height="43"'; // style="cursor:pointer;"';
					}

					media += ' type="' + fileInfo.type + '"';
					 
					media += ' hash="' + fileInfo.md5 + '"';
					media += ' />';
					content = content.replace(eachMatch.all, media);

					if (!fileRendered[eachMatch.fileId]) {
						resources += me.renderResource(fileInfo);
						fileRendered[eachMatch.fileId] = true;
					}
				}
			}

			// 再一个个来
			async.eachSeries(allMatchs, function(eachMatch, cb) {
			    var fileId = eachMatch.fileId;

			    if (fileIdFixed[fileId]) {
			    	cb();
			    	return;
			    }

			    var server = eachMatch.isAttach ? Api.fileService.getAttachInfo : Api.fileService.getImageInfo;
			    server.call(Api.fileService, fileId, function(err, doc) {
					fileIdFixed[fileId] = true;
					if(doc) {
						var base64AndMd5 = Api.fileService.getFileBase64AndMd5(doc.Path);
						if (base64AndMd5) {
							base64AndMd5.createdTime = doc.CreatedTime;
							base64AndMd5.name = eachMatch.title || doc.Name;
							base64AndMd5.type = Api.fileService.getFileType(doc.Type);
							fileInfos[fileId] = base64AndMd5;
						}
						cb();
					}
					else {
						cb();
					}
				});

			}, function () {
				replaceContent();

				callback(content, resources);
			});
		},

		// 得到可用的文件名, 避免冲突
		getExportedFilePath: function(pathInfo, n, cb) {
			var me = this;
			if(n > 1) {
				pathInfo.nameNotExt = pathInfo.nameNotExtRaw + '-' + n; 
			}
			var absPath = pathInfo.getFullPath();

			// Api.nodeFs.existsSync(absPath) 总是返回false, 不知道什么原因
			// 在控制台上是可以的
			Api.nodeFs.exists(absPath, function(exists) {
				if(!exists) {
					cb(absPath);
				}
				else {
					me.getExportedFilePath(pathInfo, n+1, cb);
				}
			});
		},

		getTargetPath: function(callback) {
			// showSaveDialog 不支持property选择文件夹
			Api.gui.dialog.showOpenDialog(Api.gui.getCurrentWindow(), 
				{
					defaultPath: Api.gui.app.getPath('userDesktop') + '/',
					properties: ['openDirectory']
				}, 
				function(targetPath) {
					callback(targetPath);
				}
			);
		},

		loadingIsClosed: false,

		exportEvernoteForNotebook: function (notebookId) {
			var me = this;
			if (!notebookId) {
				return;
			}
			me.getTargetPath(function(targetPath) {
				if (!targetPath) {
					return;
				}

				me.loadingIsClosed = false;
				Api.loading.show(Api.getMsg('plugin.export_evernote.Exporting'), 
					{
						hasProgress: true, 
						isLarge: true,
						onClose: function () {
							me.loadingIsClosed = true;
							setTimeout(function() {
								me.hideLoading();
						});
				}});
				Api.loading.setProgress(1);

				Api.noteService.getNotes(notebookId, function(notes) {
					if (!notes) {
						me.hideLoading();
						return;
					}

					var total = notes.length;
					var i = 0;
					async.eachSeries(notes, function(note, cb) {
						if (me.loadingIsClosed) {
							cb();
							me.hideLoading();
							return;
						}
						i++;
						Api.loading.setProgress(100 * i / total);
						me._exportEvernote(note, targetPath, function() {
							cb();
		        		}, i, total);
					}, function() {
						me.hideLoading();
						Notify.show({title: 'Info', body: getMsg('plugin.export_evernote.exportSuccess')});
					});
				});
			});
		},

		hideLoading: function () {
			setTimeout(function () {
				Api.loading.hide();
			}, 1000);
		},

		exportEvernote: function (noteIds) {
			var me = this;
			if (!noteIds || noteIds.length == 0) {
				return;
			}
			me.getTargetPath(function(targetPath) {
				if (!targetPath) {
					return;
				}

				me.loadingIsClosed = false;
				Api.loading.show(Api.getMsg('plugin.export_evernote.Exporting'), 
					{
						hasProgress: true, 
						isLarge: true,
						onClose: function () {
							me.loadingIsClosed = true;
							setTimeout(function() {
								me.hideLoading();
						});
				}});
				Api.loading.setProgress(1);

				var i = 0;
				var total = noteIds.length;

				async.eachSeries(noteIds, function(noteId, cb) {
					if (me.loadingIsClosed) {
						cb();
						return;
					}

					i++;
					Api.loading.setProgress(100 * i / total);
					Api.noteService.getNote(noteId, function(note) {
		        		me._exportEvernote(note, targetPath, function() {
		        			cb();
		        		}, i, total);
	        		});

				}, function () {
					me.hideLoading();
					Notify.show({title: 'Info', body: getMsg('plugin.export_evernote.exportSuccess')});
				});
			});
		},

		_exportEvernote: function(note, path, callback, i, total) {
			var me = this;
			if(!note) {
				return;
			}

			if (me.loadingIsClosed) {
				callback();
				return;
			}

			setTimeout(function () {
				Api.loading.setMsg(Api.getMsg('plugin.export_evernote.Exporting: ') + (note.Title || getMsg('Untitled')));
				Api.loading.setProgressRate(i + '/' + total);
			}, 100);

			var name = note.Title ? note.Title + '.enex' : getMsg('Untitled') + '.enex';
			name = me.fixFilename(name);

			var targetPath = path + Api.commonService.getPathSep() + name;

			// 将路径和名字区分开
			var pathInfo = Api.commonService.splitFile(targetPath);
			pathInfo.nameNotExt = me.fixFilename(pathInfo.nameNotExt); // 重新修正一次
			var nameNotExt = pathInfo.nameNotExt;
			pathInfo.nameNotExtRaw = pathInfo.nameNotExt;

			// 得到可用文件的绝对路径
			me.getExportedFilePath(pathInfo, 1, function(absEvernoteFilePath) {
				me.render(note, function (content) {
					Api.commonService.writeFile(absEvernoteFilePath, content);
					callback();
				});
			});
		},

		// 打开前要执行的
		onOpen: function() {
			var me = this;
			var gui = Api.gui;

		    var menu = {
		        label: Api.getMsg('plugin.export_evernote.export'),
		        enabled: function(noteIds) {
		        	return true;
		        },
		        click: (function() {
		        	return function(noteIds) {
		        		me.init();
		        		me.exportEvernote(noteIds);
		        	}
		        })()
		    };
		    Api.addExportMenu(menu);

		    Api.addExportMenuForNotebook({
		        label: Api.getMsg('plugin.export_evernote.export'),
		        enabled: function(notebookId) {
		        	return true;
		        },
		        click: (function() {
		        	return function(notebookId) {
		        		me.init();
		        		me.exportEvernoteForNotebook(notebookId);
		        	}
		        })()
		    });
		},
		// 打开后
		onOpenAfter: function() {
		},
		// 关闭时需要运行的
		onClose: function() {
		}
	};

	return exportEvernote;
});
