var db = require('db');
var dbClient = require('db_client');
var fs = require('fs');
var crypto = require('crypto');
var needle = require('needle');
var path = require('path');
var Evt = require('evt');
var User = require('user');
var Common = require('common');
var Images = dbClient.images;
var Attachs = db.attachs;
var Web = require('web');

// timeout 0无限等待, 60,000 1分钟
needle.defaults({
	timeout: 60000,
	rejectUnauthorized: false
});

function log(o) {
	console.trace(o);
}
/*
type File struct {
	FileId         bson.ObjectId `bson:"_id,omitempty"` //
	UserId         bson.ObjectId `bson:"UserId"`
	AlbumId        bson.ObjectId `bson:"AlbumId"`
	Name           string        `Name`  // file name
	Title          string        `Title` // file name or user defined for search
	Size           int64         `Size`  // file size (byte)
	Type           string        `Type`  // file type, "" = image, "doc" = word
	Path           string        `Path`  // the file path
	IsDefaultAlbum bool          `IsDefaultAlbum`
	CreatedTime    time.Time     `CreatedTime`
	FromFileId bson.ObjectId `bson:"FromFileId,omitempty"` // copy from fileId, for collaboration
}

*/

// 文件服务
var File = {
	// 将base64字符串写入文件中, 为导入笔记
	writeBase64: function(data, isImage, type, fileTitle, callback) {
		var me = this;
      	var filename = Common.uuid() + '.' + type;
      	if(isImage) {
      		var basePath = User.getCurUserImagesPath();
      		
      	} else {
      		var basePath = User.getCurUserAttachsPath();
      	}
      	var filePath = basePath + '/' + filename;

      	// test
		// return callback && callback({FileId: Common.objectId(), IsImage: true});

      	// return;
      	try {
      		var bf = new Buffer(data, 'base64');
			var err = fs.writeFileSync(filePath, bf);
			if(err) {
				return callback(false);
			}

			// 得到文件的hash
			var hash = crypto.createHash('md5');
			hash.setEncoding('hex');
			hash.write(bf);
			hash.end();
			var fileHash = hash.read();

			if(isImage) {
				me._addImage(Common.objectId(), filePath, function(newImg) {
					newImg.IsImage = true;
					newImg.hash = fileHash;
					callback && callback(newImg);
				});
			} else {
				me._addAttach(filePath, fileTitle, function(attach) {
					attach.hash = fileHash;
					callback && callback(attach);
				});
			}
		} catch(e) {
			console.log("error!!!");
			console.error(e);
		}
	},

	copyFile: function(originPath, isImage, callback) {
		var me = this;
      	var basePath;
      	if(isImage) {
      		basePath = User.getCurUserImagesPath();
      	} else {
      		basePath = User.getCurUserAttachsPath();
      	}

      	var filePathAttr = Common.splitFile(originPath);
		var fileId = Common.objectId();
		var newFilename = fileId + '_html_' + '.' + filePathAttr.ext;
		var newFilePath = basePath + '/' + newFilename;

      	Common.copyFile(originPath, newFilePath, function(ret) {
			if(ret) {
				if(isImage) {
					me._addImage(fileId, newFilePath, function(newImg) {
						newImg.IsImage = true;
						callback(newImg);
					});
				} else {
					me._addAttach(newFilePath, '', function(attach) {
						callback(attach);
					});
				}
			} else {
				callback(false);
			}
		});
	},

	getFileBase64: function(filePath) {
		try {
			// read binary data
		    var bitmap = fs.readFileSync(filePath);
		    if (!bitmap) {
		    	return '';
		    }
		    return new Buffer(bitmap).toString('base64');
		} catch(e) {
			return '';
		}
	},

	getFileBase64AndMd5: function(filePath) {
		try {
			// read binary data
		    var bitmap = fs.readFileSync(filePath);
		    if (!bitmap) {
		    	return '';
		    }
		    var base64 =  new Buffer(bitmap).toString('base64');

		    var hash = crypto.createHash('md5');
			hash.setEncoding('hex');
			hash.write(bitmap);
			hash.end();
			var md5 = hash.read();

			return {base64: base64, md5: md5}

		} catch(e) {
			return '';
		}
	},

	getFileMd5: function (filePath) {
		try {
		    var bitmap = fs.readFileSync(filePath);
		    if (!bitmap) {
		    	return;
		    }
			var hash = crypto.createHash('md5');
			hash.setEncoding('hex');
			hash.write(bitmap);
			hash.end();
			return hash.read();
		} catch(e) {
			return '';
		}
	},

	mines: {
	    "gif": "image/gif",
	    "jpeg": "image/jpeg",
	    "jpg": "image/jpeg",
	    "png": "image/png",
	    
	    "css": "text/css",
	    "html": "text/html",
	    "ico": "image/x-icon",
	    "js": "text/javascript",
	    "json": "application/json",
	    "pdf": "application/pdf",
	    "svg": "image/svg+xml",
	    "swf": "application/x-shockwave-flash",
	    "tiff": "image/tiff",
	    "txt": "text/plain",
	    "wav": "audio/x-wav",
	    "wma": "audio/x-ms-wma",
	    "wmv": "video/x-ms-wmv",
	    "xml": "text/xml"
	},

	getFileType: function (ext) {
		if (!ext) {
			return;
		}

		ext = ext.toLowerCase();
		var type = this.mines[ext];
		if (type) {
			return type;
		}
		return ext;
	},

	_addAttach: function(filePath, fileTitle, callback) {
		try {
			var fileStat = fs.statSync(filePath);
		} catch(e) {
			callback(false);
			return;
		}
		var paths = filePath.split(Common.getPathSep()); // windows的filePath不同
		var name = paths[paths.length-1];
		// Web.alertWeb(name);
		var names = name.split('.');
		var ext = names[names.length-1];
		var attach = {
			FileId: Common.objectId(),
			ServerFileId: '',
			Path: filePath,
			NoteId: '',
			Name: name,
			UserId: User.getCurActiveUserId(),
			Title: fileTitle,
			IsDirty: true, // 先添加的肯定是dirty, 什么时候不是dirty ? sync 和 send changes后
			Type: ext,
			Size: fileStat && fileStat.size,
			IsDirty: true, // 本地是新添加的, ServerFileId = 0
			CreatedTime: new Date()
		};
		db.attachs.insert(attach);
		callback && callback(attach);
	},

	// data在web端获取到, 在nodejs端会有错误!!
	pasteImage2: function(data, callback) {
		var me = this;
		data = data.replace(/^data:image\/\w+;base64,/, "");
      	// log(User.getCurUserImagesPath());
      	var filename = Common.uuid() + '.png';
      	var filePath = User.getCurUserImagesPath() + '/' + filename;
      	console.log(filePath);
      	// return;
		fs.writeFile(filePath, new Buffer(data, 'base64'), function(err) {  
			if(err) {
				console.log(err);
				return;
			}
			// return;
			// 保存
			// var relativePath = User.getCurUserImagesAppPath() + '/' + filename;
			// 保存到数据库中
			me._addImage(Common.objectId(), filePath, function(newImg) {
				callback && callback(Evt.getImageLocalUrl(newImg.FileId));
			});
		}); 
	},
	// FileReaderWeb 是 web上的FileReader, 可能与nodejs这个有冲突
	pasteImage: function(event, FileReaderWeb, callback) {
		var me = this;
		var items = (event.clipboardData  || event.originalEvent.clipboardData).items; // 可能有多个file, 找到属于图片的file
		// find pasted image among pasted items
		var blob;
	    for (var i = 0; i < items.length; i++) {
	    	if (items[i].type.indexOf("image") === 0) {
	    		blob = items[i].getAsFile();
		    }
		}
		// console.log("paste images");
		console.log(blob);
		// load image if there is a pasted image
		if (blob) {
			try {
				// console.log("??");
			    var reader = new FileReaderWeb();
			    // console.log(">>")
			    // return;
			    // console.log(">>")
			    /*
			    reader.onloadend = function() { 
			    	console.log(reader);
					// 这个事件在读取结束后，无论成功或者失败都会触发
					if (reader.error) { 
						console.log(reader.error); 
					} else {
					}
				};
				console.log("-----------");
			    reader.onload = function(e) {
			    	// alert(3);
			    	console.log('haha');
			    	return;
			      	// 上传之
			      	// log('result');
			      	// log(reader.result);
			      	var ret = reader.result;
			      	ret = ret.replace(/^data:image\/\w+;base64,/, "");
			      	console.log(ret);
			      	return;
			      	// log(User.getCurUserImagesPath());
			      	var filename = Common.uuid() + '.png';
			      	var filePath = User.getCurUserImagesPath() + '/' + filename;
			      	console.log(filePath);
			      	return;
					fs.writeFile(filePath, new Buffer(ret, 'base64'), function(err) {  
						if(err) {
							log(err);
							return;
						}
						// 保存
						// var relativePath = User.getCurUserImagesAppPath() + '/' + filename;
						// 保存到数据库中
						File.addImage(filePath, function(newImg) {
							callback && callback(Evt.getImageLocalUrl(newImg.FileId));
							// callback && callback('app://leanote/' + relativePath);
						});
					}); 
			    };
			    */
			    console.log(reader);
			    console.log("??");
			    reader.onloadend = function() { 
			    	console.log('end');
				    console.log(reader.result);
			    };
			    reader.readAsDataURL(blob);
			} catch(e) {
				console.log(e);
			}
		};
	},

	// path是相对于项目路径
	addImage: function(path, callback) {
		var me = this;
		var absolutePath = Evt.getBasePath() + '/' + path;
		me._addImage(Common.objectId(), absolutePath, callback);
	},

	_addImage: function(fileId, absolutePath, callback, isForce) {
		// var absolutePath = Evt.getBasePath() + '/' + path;
		// 得到文件大小
		var stat = fs.statSync(absolutePath);
		var paths = absolutePath.split('/');
		var name = paths[paths.length-1];
		var names = name.split('.');
		var ext = names[names.length-1];
		var image = {
			FileId: fileId,
			ServerFileId: '',
			Path: absolutePath,
			Name: name,
			UserId: User.getCurActiveUserId(),
			Title: name,
			Type: ext,
			Size: stat && stat.size,
			IsDirty: true, // 本地是新添加的
			CreatedTime: new Date()
		};
		if(isForce) {
			image.ServerFileId = fileId;
		}
		dbClient.images.insert(image, function(err, doc) {
			console.log(err);
			console.log(doc);
			if(err) {
				callback && callback(false);
			} else {
				callback && callback(doc);
			}
		})
	},

	// 从服务器上把文件download下来后
	// 这里的fileId是serverFileId, 本地的FileId也保存为该值
	addImageForce: function(fileId, path, callback) {
		var me = this;
		// 先删除之, 可能是本地有记录, 但是文件没了
		dbClient.images.remove({FileId: fileId}, function() { 
			me._addImage(fileId, path, callback, true);
		});
	},

	// 获取图片本地路径
	// 通过FileId可ServerFileId来查找
	// 因为图片的链接 有可能是本地添加的, 又有可能是远程的
	// 如果是远程的, FileId == ServerFileId, 是一样的, 所以不要Or
	getImageLocalPath: function(fileId, callback) {
		// dbClient.images.findOne({$or: {FileId: fileId}, {ServerFileId: fileId}}, function(err, doc) {
		dbClient.images.findOne({FileId: fileId}, function(err, doc) {
			if(!err && doc && doc.Path) { // FileLocalPath是相对于项目的路径
				callback(true, doc.Path);
			} else {
				callback(false, false);
			}
		});
	},

	getImageInfo: function(fileId, callback) {
		dbClient.images.findOne({FileId: fileId}, function(err, doc) {
			if(!err && doc && doc.Path) {
				callback(true, doc);
			} else {
				callback(false, false);
			}
		});
	},

	getAttachInfo: function(fileId, callback) {
		db.attachs.findOne({FileId: fileId}, function(err, doc) {
			if(!err && doc && doc.Path) {
				callback(true, doc);
			} else {
				callback(false, false);
			}
		});
	},
	
	// 得到fileIds所有的images, 为了发送到服务器上
	getAllImages: function(fileIds, callback) {
		var me = this;
		dbClient.images.find({$or:[{FileId: {$in: fileIds}}, {ServerFileId: {$in: fileIds}}]}, function(err, images) {
			if(err || !images) {
				return callback(false);
			}
			callback(images);
		});
	},

	// 笔记添加/修改后会有LocalFileId <=> FileId映射
	// 这个只对image有用
	updateImageForce: function(files) {
		if(!files) {
			// callback && callback(false);
			return;
		}
		for(var i in files) {
			var file = files[i];
			if(file.IsAttach) {
				continue;
			}
			if(!file.FileId || !file.LocalFileId) {
				continue;
			}
			dbClient.images.update({FileId: file.LocalFileId}, {$set: {ServerFileId: file.FileId, IsDirty: false}});
		}
	},

	// tinymce 或 mceeditor上传图片
	// callback({FileId: "xx"})
	uploadImage: function(imagePath, callback) {
		var me = this;
		// 读取文件, 查看是否是图片
		var filePathAttr = Common.splitFile(imagePath);
		var ext = filePathAttr.ext;
		if(!Common.isImageExt(ext)) {
			return callback(false, 'Please select a image');
		}
		var fileId = Common.objectId();
		// 复制到图片文件夹
		filePathAttr.nameNotExt = fileId + '_cp_';
		var newFilename = fileId + '.' + ext;
		var newFilePath = User.getCurUserImagesPath() + '/' + newFilename;
		// 复制之, 并写入到数据库中
		Common.copyFile(imagePath, newFilePath, function(ret) {
			if(ret) {
				me._addImage(fileId, newFilePath, callback);
			} else {
				callback(false);
			}
		});
	},

	// 处理用户图片
	getImage: function(fileId, callback) {
		var me = this;
		if(!fileId) {
			return callback(false);
		}

		var Api = require('api');

		// 访问api, 得到图片
		function getImageFromApi() {
			// console.log('fetch servers image ' + fileId);
			Api.getImage(fileId, function(fileLocalPath, filename) { 
				if(fileLocalPath) {
					// console.log('save image to local');
					// 保存到本地数据库中
					me.addImageForce(fileId, fileLocalPath, function(doc) {
						if(doc) {
							// console.log('save image to local success');
						} else {
							// console.log('save image to local error');
						}
						callback(fileLocalPath);
						// return me.retImage(fileLocalPath, res);
					});
				} else {
					// 远程取不到图片, 是没有网络? 还是远程真的没有了
					// TODO
					console.log("cann't get server's image" + fileId);
					callback(false);
					// return me.e404(res);
				}
			});	
		}
		// 先查看本地是否有该文件
		// has表示本地数据库有记录
		me.getImageLocalPath(fileId, function(has, fileLocalPath) {
			// 本地有
			// console.log('re img')
			// console.log(fileLocalPath);
			// console.log(fs.exists(fileLocalPath));
			if(has && fileLocalPath) {
				fs.exists(fileLocalPath, function(exists) {
					if(exists) { 
						// console.log('本地存在 ' + fileId);
						callback(fileLocalPath);
						// me.retImage(fileLocalPath, res);
					} else {
						getImageFromApi();
					}
				});
			} else {
				getImageFromApi();
			}
		});
	},

	// 下载, 复制一份文件
	download: function(srcPath, toPath, callback) {
		var srcIsExists = fs.existsSync(srcPath);
		if(!srcIsExists) {
			return callback(false, 'File Not Exists');
		}
		// console.log(srcPath);
		// console.log(toPath);
		var toIsExists = fs.existsSync(toPath);
		function cp() {
			Common.copyFile(srcPath, toPath, function(ok) {
				callback && callback(ok);
			});
		}
		if(toIsExists) {
			fs.unlink(toPath, function(error) {
				if(!error) {
					cp();
				} else {
					callback && callback(false, 'The Target File Cannot Overwrite');
				}
			});
		} else {
			cp();
		}
	},

	// 附件操作
	addAttach: function(filePaths, noteId, callback) {
		if(!noteId || !filePaths || filePaths.length == 0) {
			return callback && callback(false);
		}
		// filePaths = filePaths.split(';');
		// 复制每一个文件, 保存到数据库中
		var targets = [];
		for(var i in filePaths) {
			var filePath = filePaths[i];
			var fileStat = fs.statSync(filePath);
			var paths = filePath.split(Common.getPathSep()); // windows的filePath不同
			var name = paths[paths.length-1];
			// Web.alertWeb(name);
			var names = name.split('.');
			var ext = names[names.length-1];

			var rename = Common.uuid() + "." + ext;
			var distPath = User.getCurUserAttachsPath() + '/' + rename;
			var readable = fs.createReadStream(filePath);
	        // 创建写入流
	        var writable = fs.createWriteStream(distPath);   
	        // 通过管道来传输流
	        readable.pipe(writable);
			var attach = {
				FileId: Common.objectId(),
				ServerFileId: '',
				Path: distPath,
				NoteId: noteId,
				Name: rename,
				UserId: User.getCurActiveUserId(),
				Title: name,
				IsDirty: true, // 先添加的肯定是dirty, 什么时候不是dirty ? sync 和 send changes后
				Type: ext,
				Size: fileStat && fileStat.size,
				IsDirty: true, // 本地是新添加的, ServerFileId = 0
				CreatedTime: new Date()
			};
			db.attachs.insert(attach);
			targets.push(attach);
		}

		callback && callback(targets);
	},
	// 删除不存在的attachs
	deleteNotExistsAttach: function(noteId, attachs) {
		var me = this;
		// console.log('--');
		db.attachs.find({NoteId: noteId}, function(err, everAttachs) { 
			if(err) {
				return;
			}
			var nowMap = {};
			for(var i in attachs) {
				nowMap[attachs[i].FileId] = attachs[i];
			}
			var fileBasePath = User.getCurUserAttachsPath();
			for(var i in everAttachs) {
				var attach = everAttachs[i];
				if(!nowMap[attach.FileId]) { // 如果不在, 则删除之
					db.attachs.remove({FileId: attach.FileId});
					// 删除源文件, 别删错了啊
					if(attach.Path.indexOf(fileBasePath) >= 0) {
						fs.unlink(attach.Path);
					}
				}
			}
		});
	},

	// 下载图片, 本地的, 或外站的
	downloadImg: function(src, callback) {
		var me = this;
		// 本地的
		if(src.indexOf('http://127.0.0.1') != -1 || src.indexOf('leanote://') != -1) {
			var ret = /fileId=([a-zA-Z0-9]{24})/.exec(src);
			if(ret && ret.length == 2) {
				var fileId = ret[1];
				me.getImage(fileId, function(filePath) {
					callback(filePath);
				});
			} else {
				callback();
			}
			
		// 本地地址
		// 形如 file:///Users/life/Desktop/test/1.jpeg 本地文件
		// file:///C:/Users/CLi/App
		// file://C:/Users/CLi/App
		// C:/a.png
		} else if(src.indexOf('file:') === 0 || /^[c-z]:/i.test(src)) {
			if (src.indexOf('file://') >= 0) {
				src = src.substr('file://'.length); // /user 或  /C:
				if (!src) {
					callback();
					return;
				}
			}

			// windows下的 把最前一个'/'去掉
			if (src.indexOf(':') >= 0 && src[0] == '/') {
				src = src.substr(1);
			}

			// 图片类型
			var type = 'png';
			var strArr = src.split('.');
			if (strArr.length > 1) {
				type = strArr.pop();
			}

			// 新图片地址
			var filename = Common.uuid() + '.' + type;
			var imagePath = User.getCurUserImagesPath();
			var imagePathAll = imagePath + '/' + filename;

			// 复制图片
			var readStream = fs.createReadStream(src);
			var writeStream = fs.createWriteStream(imagePathAll);
			readStream.pipe(writeStream);
			readStream.on('end', function () {
				callback(imagePathAll);
			});
			readStream.on('error', function () {
				callback();
			});
		}
		else {
			if (src.indexOf('https://leanote.com') == 0) {
				needle.defaults({
					timeout: 60000,
					rejectUnauthorized: true
				});
			} else {
				needle.defaults({
					timeout: 60000,
					rejectUnauthorized: false
				});
			}
			// 远程的图片
			needle.get(src, function(err, resp) {
				/*
				{ 'accept-ranges': 'bytes',
				  'content-disposition': 'inline; filename="logo.png"',
				  'content-length': '8583',
				  'content-type': 'image/png',
				  date: 'Mon, 19 Jan 2015 15:01:47 GMT',
	  			*/
				// log(resp.headers);
				if(err || !resp || resp.statusCode != 200) {
					callback(false);
					return;
				} else {
					// 当图片没有时候还是执行这一步

					var typeStr = resp.headers['content-type'];
					var type = 'png';
					if(typeStr) {
						var typeArr = typeStr.split('/');
						if(typeStr.length > 1) {
							type = typeArr[1];
						}
					}

					// 返回的是字符串, 肯定是403之类的
					if (typeof resp.body === 'string') {
						callback(false);
						return;
					}

					var filename = Common.uuid() + '.' + type;
					var imagePath = User.getCurUserImagesPath();
					var imagePathAll = imagePath + '/' + filename;
					fs.writeFile(imagePathAll, resp.body, function(err) {
						if(err) {
							callback(false);
						} else {
							callback(imagePathAll);
						}
					});
				}
			});
		}
	},

	// 复制外站图片
	copyOtherSiteImage: function(src, callback) {
		var me = this;
		console.log('copyOtherSiteImage');
		console.log(src);
		me.downloadImg(src, function (filePath) {
			console.log(filePath);
			if (filePath) {
				me._addImage(Common.objectId(), filePath, function(file) {
					if (file) {
						callback(Evt.getImageLocalUrl(file.FileId));
					}
					else {
						callback(false);
					}
				});
			}
			else {
				callback(false);
			}
		});
	}
};

module.exports = File; 
