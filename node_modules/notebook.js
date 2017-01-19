var db = require('db');
var async = require('async');
var User = require('user');
// var db.notebooks = db.notebooks;
var Common = require('common');
var Web = require('web');

function log(o) {console.log(o);}

/*
字段: 
_id, // NotebookId表示是服务端Id, _id表示本地的id, 不一样
IsDeleted bool, // 是否已删除, true表示本地已删除, 未同步
LocalUsn int 本地Usn, 递增, 用于记录从上次同步后是否已修改, 若 > lastUpdateCount则表示已修改
	NotebookId       bson.ObjectId `bson:"_id,omitempty"` // 必须要设置bson:"_id" 不然mgo不会认为是主键
	UserId           bson.ObjectId `bson:"UserId"`
	ParentNotebookId bson.ObjectId `bson:"ParentNotebookId,omitempty"` // 上级
	Seq              int           `Seq`                               // 排序
	Title            string        `Title`                             // 标题
	UrlTitle         string        `UrlTitle`                          // Url标题 2014/11.11加
	NumberNotes      int           `NumberNotes`                       // 笔记数
	IsTrash          bool          `IsTrash,omitempty`                 // 是否是trash, 默认是false
	IsBlog           bool          `IsBlog,omitempty`                  // 是否是Blog 2013/12/29 新加
	CreatedTime      time.Time     `CreatedTime,omitempty`
	UpdatedTime      time.Time     `UpdatedTime,omitempty`

	// 2015/1/15, 更新序号
	Usn int `Usn` // UpdateSequenceNum, 与服务器端保存一致
 
 */

// 排序笔记本和子笔记本
function sortNotebooks(notebooks) {
	notebooks.sort(function(a, b) {
		return a.Seq - b.Seq;
	});
	for(var i in notebooks) {
		var notebook = notebooks[i];
		if(notebook.Subs.length > 0) {
			sortNotebooks(notebook.Subs);
		}
	}
}

// 笔记本服务
var Notebook = {

	addNotebookTest: function() {
		var doc = {
			// _id: "xxxxx",
			hello: 'world'
		   , n: 5
		   , today: new Date()
		   , nedbIsAwesome: true
		   , notthere: null
		   , notToBeSaved: undefined  // Will not be saved
		   , fruits: [ 'apple', 'orange', 'pear' ]
		   , infos: { name: 'nedb' }
		   };
		console.log("save before")
		db.notebooks.insert(doc, function (err, newDoc) {   // Callback is optional
		  // newDoc is the newly inserted document, including its _id
		  // newDoc has no key called notToBeSaved since its value was undefined
		  // console.log(err);
		  // console.log(newDoc);
		});
	},

	// 建立关联
	_mapNotebooks: function(notebooks) {
		var me = this;
		// log(notebooks);
		// 整理成层级关系, 并排序
		// 1. 建立map
		var notebooksMap = {};
		for(var i in notebooks) {
			var notebook = notebooks[i];
			notebook.Subs = [];
			notebooksMap[notebook.NotebookId] = notebook;
		}
		// 2. 追加到父下
		var isolatedNotebooks = []; // 独立的, 没有父的, 第一级
		for(var notebookId in notebooksMap) {
			var notebook = notebooksMap[notebookId];
			var parentNotebookId = notebook.ParentNotebookId;
			if(parentNotebookId && notebooksMap[parentNotebookId]) {
				notebooksMap[parentNotebookId].Subs.push(notebook);
			} else {
				isolatedNotebooks.push(notebook);
			}
		}
		// 3. 排序
		sortNotebooks(isolatedNotebooks);
		// log(notebooks);
		// log(notebooksMap['1'].Subs);
		return isolatedNotebooks;
	},

	// 得到用户下所有的notebook
	// 排序好之后返回
	getNotebooks: function(callback) {
		var me = this;
		var userId = User.getCurActiveUserId();
		db.notebooks.find({UserId: userId, $or: [{LocalIsDelete : { $exists : false }}, {LocalIsDelete: false}] }, function(err, notebooks) {
			if(err) {
				log(err);
				return callback && callback(false);
			}
			
			callback && callback(me._mapNotebooks(notebooks));
		});
	},

	// 新建笔记本
	// 这里, 之前有个大BUG, pull过来后添加到tree上设为IsNew, 导致添加大量重复的notebook
	addNotebook: function(notebookId, title, parentNotebookId, callback) {
		var notebook = {
			Title: title,
			Seq: -1,
			UserId: User.getCurActiveUserId(),
			ParentNotebookId: parentNotebookId,
			LocalIsNew: true,
			IsDirty: true, // 必须, 同步后才为非dirty状态
			// TODO UrlTitle
		}
		if(notebookId) {
			notebook['NotebookId'] = notebookId;
		}
		db.notebooks.insert(notebook, function (err, newDoc) {   // Callback is optional
			if(err) {
				console.log(err);
				callback && callback(false);
			} else {
				callback && callback(newDoc);
			}
		});
	},

	// 修改笔记本标题
	updateNotebookTitle: function(notebookId, title, callback) {
		db.notebooks.update({NotebookId: notebookId}, 
			{$set: 
				{Title: title, IsDirty: true, UpdatedTime: new Date()}
			}, function(err, n) {
			callback(true);
		});
	},

	// 拖动笔记本
	// 当前笔记在parentNotebookId下, 且该parentNotebookId下的所有子孩子的id
	dragNotebooks: function(curNotebookId, parentNotebookId, siblingNotebookIds) {
		var me = this;
		console.log(curNotebookId);
		console.log(parentNotebookId);
		console.log(siblingNotebookIds);
		// 先更新curNotebookId的父
		me.getNotebook(curNotebookId, function(notebook) {
			if(!notebook) {
				console.log('not fount');
				return;
			}
			// 先更新之
			// db.notebooks.update({NotebookId: notebookId}, {$set: {ParentNotebookId: parentNotebookId, IsDirty: true, UpdatedTime: new Date()}}, function(err, n) {
			// });
			siblingNotebookIds = siblingNotebookIds || [];
			// 再更新所有子孩子的seq
			for(var i = 0; i < siblingNotebookIds.length; ++i) {
				var siblingNotebookId = siblingNotebookIds[i];
				console.log('siblingNotebookId: ' + siblingNotebookId);
				db.notebooks.update({NotebookId: siblingNotebookId}, 
					{$set: 
						{ParentNotebookId: parentNotebookId, Seq: i, IsDirty: true, UpdatedTime: new Date()}
					}
				);
			}
		});
	},

	// 修改笔记本
	updateNotebook: function(notebookId, callback) {

	},

	// 删除笔记本
	deleteNotebook: function(notebookId, callback) {
		// 先检查是否有笔记, 如果有, 则不准删除
		var Note = require('note');
		Note.hasNotes(notebookId, function(has) {
			if(has) {
				callback(false, 'This notebook has notes, please delete notes firstly.');
			} else {
				db.notebooks.update({NotebookId: notebookId}, {$set: {LocalIsDelete: true, IsDirty: true, UpdatedTime: new Date()}}, function(err, n) {
					callback(true);
				});
			}
		});

		/*
		db.notebooks.remove({NotebookId: notebookId}, function(err, n) {
			callback();
		});
		*/
	},

	// 删除本地的笔记本, 是New又是Delete
	deleteLocalNotebook: function(notebookId, callback) {
		db.notebooks.remove({NotebookId: notebookId}, function(err, n) {
			callback && callback();
		});
	},

	// addNote, 删除note, 移动note
	// 重新统计笔记本的笔记数据
	reCountNotebookNumberNotes: function(notebookId) {
		db.notes.count({NotebookId: notebookId,
				// 现在还不明确为什么会有IsDeleted的笔记
				$or:[
					{IsDeleted: {$exists: false}},
					{IsDeleted: false}
				],
				IsTrash: false,
				LocalIsDelete: false
			}, function(err, count) {
			if(err) {
				log(err);
				return;
			}
			Web.updateNotebookNumberNotes(notebookId, count);
			db.notebooks.update({NotebookId: notebookId}, {$set: {NumberNotes: count}}, {})
		});
	},

	// 得到笔记本
	getNotebook: function(notebookId, callback) {
		var me = this;
		db.notebooks.findOne({NotebookId: notebookId}, function(err, doc) {
			if(err || !doc) {
				log('不存在');
				callback && callback(false);
			} else {
				callback && callback(doc);
			}
		});
	},


	//----------------
	// 同步 
	//----------------
	
	getNotebookByServerNotebookId: function(notebookId, callback) {
		var me = this;
		db.notebooks.findOne({ServerNotebookId: notebookId}, function(err, doc) {
			if(err || !doc) {
				log('不存在');
				callback && callback(false);
			} else {
				callback && callback(doc);
			}
		});
	},

	// 通过ServerNotebookId得到NotebookId
	getNotebookIdByServerNotebookId: function(serverNotebookId, callback) {
		if(!serverNotebookId) {
			return callback(false);
		}
		db.notebooks.findOne({ServerNotebookId: serverNotebookId}, function(err, notebook) {
			if(err || !notebook) {
				return callback(false);
			}
			callback(notebook.NotebookId);
		});
	},
	// 发送changes时用 api调用
	getServerNotebookIdByNotebookId: function(notebookId, callback) {
		if(!notebookId) {
			return callback(false);
		}
		db.notebooks.findOne({NotebookId: notebookId}, function(err, notebook) {
			if(err || !notebook) {
				return callback(false);
			}
			callback(notebook.ServerNotebookId);
		});
	},

	// 强制删除
	deleteNotebookForce: function(notebookId, callback) {
		var me = this;
		db.notebooks.remove({ServerNotebookId: notebookId}, function(err, n) {
			if(err) { 
				callback && callback(false);
			} else {
				callback && callback(true);
			}
		});
	},

	// 添加笔记本, notebook object
	// 这里的notebook是服务器传过来的数据, 需要fix下, 
	addNotebookForce: function(notebook, callback) {
		var me = this;
		notebook.ServerNotebookId = notebook.NotebookId;
		// notebook.NotebookId = Common.objectId();
		notebook.NotebookId = notebook.NotebookId; // 就采用服务器的, 怕失去了层级
		me.getNotebookIdByServerNotebookId(notebook.ParentNotebookId, function(parentNotebookId) {
			// 如果是第一次添加可能会有问题, 数据库还没有数据, 那么还找不到
			if(parentNotebookId) {
				notebook.ParentNotebookId = parentNotebookId;
			} else {
				// 否则, 就用服务器上的
			}

			notebook.CreatedTime = Common.goNowToDate(notebook.CreatedTime);
			notebook.UpdatedTime = Common.goNowToDate(notebook.UpdatedTime);

			notebook.IsDirty = false;
			notebook.LocalIsNew = false;
			notebook.LocalIsDelete = false;

			db.notebooks.insert(notebook, function (err, newDoc) {   // Callback is optional
				if(err) {
					console.log(err);
					callback && callback(false);
				} else {
					callback && callback(newDoc);
				}
			});
		});
	},
	// 更新笔记本
	// 这里的notebook是服务器传过来的数据, 需要fix下, 
	updateNotebookForce: function(notebook, notebookLocal, callback) {
		var me = this;

		notebook.IsDirty = false;
		notebook.LocalIsNew = false;
		notebook.LocalIsDelete = false;

		delete notebook['NumberNotes'];
		delete notebook['UpdatedTime'];
		delete notebook['CreatedTime'];

		var serverNotebookId = notebook.NotebookId;
		me.getNotebookIdByServerNotebookId(notebook.ParentNotebookId, function(parentNotebookId) {
			notebook.ParentNotebookId = parentNotebookId;
			notebook.ServerNotebookId = notebook.NotebookId;
			notebook.NotebookId = notebookLocal.NotebookId;
			db.notebooks.update({ServerNotebookId: serverNotebookId}, {$set: notebook}, {}, function (err, updates) {   // Callback is optional
				if(err) {
					console.log(err);
					callback && callback(false);
				} else {
					callback && callback(notebook);
				}
			});
		});
	},

	//

	// 更新笔记本, NotebookId可能也要更改
	// notebook是服务器传过来的
	updateNotebookForceForSendChange: function(notebookId, notebook, callback) {
		// console.log('updateNotebookForceForSendChange notebook是服务器传过来的');
		var me = this;
		notebook.IsDirty = false;
		notebook.LocalIsNew = false;
		notebook.ServerNotebookId = notebook.NotebookId; // ? 怎么可能要改呢? 因为这可能是添加后的笔记本
		notebook.NotebookId = notebookId; // 必须设为本地, 因为notebook.NotebookId是服务器传过来的 2/16 fixed

		me.getNotebookIdByServerNotebookId(notebook.ParentNotebookId, function(parentNotebookId) {
			notebook.ParentNotebookId = parentNotebookId;
			// console.log(notebook2);
			// notebook2.Title  += " H-";
			// multi, 因为历史原因, 导致大量重复notebookId的元素
			db.notebooks.update({NotebookId: notebookId}, {$set: notebook}, {multi: true}, function (err, n) {
				// console.log('updateNotebookForceForSendChange end' + notebookId + ' ' + n);
				if(err) {
					console.log(err);
					callback && callback(false);
				} else {
					callback && callback(notebook);
				}
			});
		});
	},

	// 深度优先一个列表
	// 为了send changes时避免先send child
	_deepTraversal: [],
	_visited: {}, // 可以不要
	deep: function(T) {
		var me = this;
		if(!T || !T.Subs || T.Subs.length == 0) {
			return;
		}
		for(var i = 0; i < T.Subs.length; ++i) {
			var node = T.Subs[i];
			if(!me._visited[node.NotebookId]) { // 可以不要这个判断
				me._visited[node.NotebookId] = true;
				me._deepTraversal.push(T.Subs[i]);
				// 递归
				me.deep(T.Subs[i]);
			}
		}
	},

	// 获得用户修改的笔记本
	getDirtyNotebooks: function(callback) {
		var me = this;
		db.notebooks.find({UserId: User.getCurActiveUserId(), IsDirty: true}, function(err, notebooks) {
			if(err) {
				log(err);
				return callback && callback(false);
			} else {
				var mapNotebooks = me._mapNotebooks(notebooks);
				// 深度优先一个序列
				me._deepTraversal = [];
				me._visited = {};
				me.deep({Subs: mapNotebooks});
				// 返回之
				callback(me._deepTraversal);
			}
		});
	},

	// 处理冲突
	// notes是服务器的数据, 与本地的有冲突
	// 1) 将本地的note复制一份
	// 2) 服务器替换之前
	fixConflicts: function(notebookSyncInfo, callback) {
		var me = this;

		// 服务器没有, 但是是发送更新的, 所以需要作为添加
		// 情况很少见
		if(notebookSyncInfo.changeNeedAdds) { 
			var needAddNotebooks = notebookSyncInfo.changeNeedAdds;
			for(var i in needAddNotebooks) {
				var notebook = needAddNotebooks[i];
				me.setIsNew(notebook.NotebookId);
			}
		}

		// pull
		// 处理添加的, 更新的, 这里前端统一重新渲染!!
		var adds = notebookSyncInfo.adds;
		if (!isEmpty(adds) || !isEmpty(notebookSyncInfo.updates)) {
			console.log('	has adds/updates notebook', adds, notebookSyncInfo.updates);
			// Web.addSyncNotebook(adds);
			// Web.updateSyncNotebook(notebookSyncInfo.updates);

			Web.reloadNotebook();
		}

		// push
		if (!isEmpty(notebookSyncInfo.changeAdds)) {
			console.log('	has changeAdds notebook', notebookSyncInfo.changeAdds);
			Web.addChangeNotebook(notebookSyncInfo.changeAdds);
		}
		if (!isEmpty(notebookSyncInfo.changeUpdates)) {
			console.log('	has changeUpdates notebook', notebookSyncInfo.changeUpdates);
			Web.updateChangeNotebook(notebookSyncInfo.changeUpdates);
		}

		if (!isEmpty(notebookSyncInfo.deletes)) {
			// 处理删除的
			Web.deleteSyncNotebook(notebookSyncInfo.deletes);
		}

		// 没有冲突的, 因为notebook不处理冲突
		// 处理冲突
		var conflictNotebooks = notebookSyncInfo.conflicts || [];
		conflictNotebooks.length && console.log('	fix notebook conflicts');
		async.eachSeries(conflictNotebooks, function(notebook, cb) { 
			/*
			var noteId = note.NoteId;
			// 复制一份
			me.copyNoteForConfict(noteId, function(newNote) {
				if(newNote) {
					// 更新之前的
					me.updateNotebookForce(note, function() { 
						cb();
						// 前端来处理, 全量sync时不用前端一个个处理
						notebookWeb.fixSyncConflict && notebookWeb.fixSyncConflict(note, newNote);
					});
				} else {
					cb();
				}
			});
			*/
			cb();
		}, function() {
			// 最后调用
			callback && callback();
		});
	},

	// 在send delete笔记时成功
	setNotDirty: function(notebookId) {
		db.notebooks.update({NotebookId: notebookId}, {$set:{IsDirty: false}})
	},
	// 在send delete笔记时有冲突
	setNotDirtyNotDelete: function(notebookId) {
		db.notebooks.update({NotebookId: notebookId}, {$set:{IsDirty: false, LocalIsDelete: false}})
	},
	setIsNew: function(notebookId) {
		db.notebooks.update({NotebookId: notebookId}, {$set:{LocalIsNew: true, IsDirty: true}})
	}
};
module.exports = Notebook;