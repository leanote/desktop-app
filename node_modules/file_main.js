var fs = require('fs');
var path = require('path');
var db = require('db_main');
var Api = require('api_main');
var Evt = require('evt_main');

function log(o) {
	console.trace(o);
}

// 文件服务 main 进程调用

var File = {
	// 从服务器上把文件download下来后
	// 这里的fileId是serverFileId, 本地的FileId也保存为该值
	addImageForce: function(fileId, path, callback) {
		var me = this;
		// 先删除之, 可能是本地有记录, 但是文件没了
		db.images.remove({FileId: fileId}, function() { 
			me._addImage(fileId, path, callback, true);
		});
	},

	// 获取图片本地路径
	// 通过FileId可ServerFileId来查找
	// 因为图片的链接 有可能是本地添加的, 又有可能是远程的
	// 如果是远程的, FileId == ServerFileId, 是一样的, 所以不要Or
	getImageLocalPath: function(fileId, callback) {
		// db.images.findOne({$or: {FileId: fileId}, {ServerFileId: fileId}}, function(err, doc) {
		db.images.findOne({FileId: fileId}, function(err, doc) {
			if(!err && doc && doc.Path) { // FileLocalPath是相对于项目的路径
				callback(true, doc.Path);
			} else {
				callback(false, false);
			}
		});
	},

	getImageInfo: function(fileId, callback) {
		db.images.findOne({FileId: fileId}, function(err, doc) {
			if(!err && doc && doc.Path) {
				callback(true, doc);
			} else {
				callback(false, false);
			}
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
			db.images.update({FileId: file.LocalFileId},
				{$set: {ServerFileId: file.FileId, IsDirty: false}});
		}
	},

	// 处理用户图片
	getImage: function(fileId, callback) {
		var me = this;
		if(!fileId) {
			return callback(false);
		}

		// 访问api, 得到图片
		function getImageFromApi() {
			console.log('main fetch servers image ' + fileId);
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
					// console.log("cann't get server's image" + fileId);
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
						if (fileLocalPath.indexOf('; charset=utf-8') < 0) {
							// console.log('本地存在 ' + fileId);
							callback(fileLocalPath);
						}
						else {
							// 存在, 但之前存错了
							console.log('存在, 但之前存错了 ' + fileId);
							getImageFromApi();
						}
					} else {
						getImageFromApi();
					}
				});
			} else {
				getImageFromApi();
			}
		});
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
			UserId: Evt.getCurUserId(),
			Title: name,
			Type: ext,
			Size: stat && stat.size,
			IsDirty: true, // 本地是新添加的
			CreatedTime: new Date()
		};
		if(isForce) {
			image.ServerFileId = fileId;
		}
		db.images.insert(image, function(err, doc) {
			console.log(err);
			console.log(doc);
			if(err) {
				callback && callback(false);
			} else {
				callback && callback(doc);
			}
		})
	}
};

module.exports = File; 
