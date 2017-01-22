var db = require('db');
var async = require('async');
var Common = require('common');
var User = require('user');
var Tag = require('tag');
var Tags = db.tags;
var needle = require('needle');
var fs = require('fs');
var Api = require('api');
var Notebook = require('notebook');
var Note = require('note');
var Web = require('web');

function log(o) {
	// console.log(o);
}

// 同步服务
/*
syncProgress 设置
两阶段, 各个50%
1. <-
	notebook 10 -> 10%
	note 30 -> 40%
	tag 10 -> 50%

2. ->
	notebook 10 -> 60%
	note 30 -> 90%
	tag 10 -> 100%
 */
var Sync = {
	// 同步的信息, 返回给调用者
	_syncInfo: {
		notebook: {changeAdds: [], changeConflicts: [], adds: [], deletes: [], updates: [], changeUpdates: []}, 
		note: {changeAdds: [], changeConflicts: [], adds: [], deletes: [], updates: [], conflicts: [], errors: []}, 
		tag: {}
	}, 
	/*
	_sendInfo: {
		notebook: {adds: [], deletes: [], updates: []}, 
		note: {adds: [], deletes: [], updates: [], conflicts: []}, 
		tag: {}
	}, 
	*/
	_needIncrSyncAgain: false,

	// notebook
	_syncNotebookIsLastChunk: false,
	_totalSyncNotebookNum: 0, // 需要同步的数量
	_tocalHasSyncNotebookNum: 0, // 已同步的数量
	_notebookMaxEntry: 200,

	// note
	_syncNoteIsLastChunk: false,
	_totalSyncNoteNum: 0, // 需要同步的数量
	_noteMaxEntry: 200,

	// tag
	_syncTagIsLastChunk: false,
	_totalSyncTagNum: 0, // 需要同步的数量
	_tagMaxEntry: 200,

	_initSyncInfo: function() { 
		var me = this;

		// notebook
		me._syncNotebookIsLastChunk = false;
		me._totalSyncNotebookNum = 0;
		me._totalHasSyncNotebookNum = 0;
		me._lockNotebook = 1;

		// note
		me._syncNoteIsLastChunk = false;
		me._totalSyncNoteNum = 0;
		me._totalHasSyncNoteNum = 0;
		me._lockNote = 1;

		// tag
		me._syncTagIsLastChunk = false;
		me._totalSyncTagNum = 0;
		me._totalHasSyncTagNum = 0;
		me._lockTag = 1;

		// 同步信息
		me._syncInfo = {
			notebook: {ok: false, changeAdds: [], changeConflicts: [], changeNeedAdds: [], adds: [], deletes: [], updates: [], changeUpdates: []}, 
			note: {ok: false, adds: [], changeAdds: [], changeConflicts: [], changeUpdates:[], changeNeedAdds: [], deletes: [], updates: [], conflicts: [], errors: []}, 
			tag: {ok: false, adds: [], changeAdds: [], changeConflicts: [], changeNeedAdds: [], deletes: [], updates: [], conflicts: []},
		};

		// 发送改变信息
		/*
		me._sendInfo = {
			notebook: {ok: false, adds: [], deletes: [], updates: []}, 
			note: {ok: false, adds: [], deletes: [], updates: [], conflicts: []}, 
			tag: {ok: false}
		};
		*/
		// 是否还要来一次增量同步 ?
		me._needIncrSyncAgain = false;
	},

	// 停止同步
	// 第一次，note.html -> login.html(使得_stop: true), -> note.html fullSync，一看，是stop
	_stop: false,
	stop: function() {
		var me = this;
		me._stop = true;
	},
	isStop: function() {
		var me = this;
		if(me._stop) {
			me._stop = false;
			return true;
		}
		return false;
	},

	//---------------
	// notebook
	//---------------
	
	// 增加, 有锁
	_lockNotebook: 1,
	_addSyncNotebookNum: function() {
		var me = this;
		if(me._lockNotebook) {
			me._lockNotebook = 0;
			me._totalHasSyncNotebookNum++;
			me._lockNotebook = 1;
		} else {
			me._addSyncNotebookNum();
		}
	},

	// 同步笔记本
	_syncNotebookToLocal: function(notebooks, callback) { 
		var me = this;

		function canCall() {
			// 是最后一块, 且
			me._addSyncNotebookNum();
			// console.log(me._syncNotebookIsLastChunk);
			// console.log(me._totalHasSyncNotebookNum + ' ' + me._totalSyncNotebookNum);
			// console.log(me._syncInfo.notebook.ok);
			if(me._syncNotebookIsLastChunk && 
				me._totalHasSyncNotebookNum >= me._totalSyncNotebookNum) {
				// 防止多次callback
				if(!me._syncInfo.notebook.ok) {
					me._syncInfo.notebook.ok = true;
					callback && callback(true);
				}
			}
		}

		if(!notebooks || notebooks.length == 0) {
			return canCall();
		}

		for(var i in notebooks) {
			var notebook = notebooks[i];
			// 得到本地的, 与之对比

			Web.syncProcess('notebook', notebook.Title);

			(function(notebook) {

				var usn = notebook.Usn;
				var notebookId = notebook.NotebookId; // 服务器端的

				// 1) 服务器端删除了, 本地肯定删除
				if(notebook.IsDeleted) {
					// console.log('delete: ');
					// console.log(notebook);
					Notebook.getNotebookIdByServerNotebookId(notebookId, function(localNotebookId) {
						Notebook.deleteNotebookForce(notebookId, function() { 
							// me._syncInfo.notebook.deletes.push(localNotebookId);
							me.fixSynced('notebook', 'deletes', localNotebookId);
							canCall();
						})
					});
					return;
				}
				// 2) 查看本地的, 与本地合并
				Notebook.getNotebookByServerNotebookId(notebookId, function(notebookLocal) {
					// 2.1 本地没有, 表示是新建
					if(!notebookLocal) {
						console.log('	add addNotebookForce...', notebook.Title)
						// TODO
						Notebook.addNotebookForce(notebook, function(notebook) {
							// 要最后一起添加, 因为有层级关系
							console.log('	', notebook.Title)
							me._syncInfo.notebook.adds.push(notebook);
							// me.fixSynced('notebook', 'adds', notebook);
							canCall();
						});
					} else {
						// 如果Usn一样, 表示服务器端并没有修改
						if(notebookLocal.Usn === notebook.Usn) {
							console.log('notebookLocal 如果Usn一样, 表示服务器端并没有修改');
							return canCall();
						}
						
						// 2.2 本地是否修改了, 需要合并, 使用服务端的数据
						if(notebook.IsDirty) {
							console.log('冲突....')
						// 2.3 服务器是最新的, 用服务器的
						} else {
						}
						// 这里都是用服务器端的数据, 不处理冲突
						Notebook.updateNotebookForce(notebook, notebookLocal, function(notebook) {
							if(notebook) {
								// 前端一起渲染
								me._syncInfo.notebook.updates.push(notebook);
								// me.fixSynced('notebook', 'updates', notebook);
							}
							canCall();
						})
					}
				});
			})(notebook);
		}
	},

	syncNotebook: function(afterUsn, callback) {
		var me = this;
		if(me.isStop()) {
			return;
		}
		Api.getSyncNotebooks(afterUsn, me._notebookMaxEntry, function(notebooks) {
			console.log('	syncNotebook', notebooks)
			// console.log(notebooks);
			if(Common.isOk(notebooks)) {
				me._totalSyncNotebookNum += notebooks.length;
				// 证明可能还有要同步的
				if(notebooks.length == me._notebookMaxEntry) {
					me._syncNotebookToLocal(notebooks, callback);
					var last = notebooks[notebooks.length-1];
					me.syncNotebook(last.Usn, callback);

					// 更新Usn
					me.updateSyncUsn('NotebookUsn', last.Usn);

				} else {
					console.log('	no more notebooks');
					me._syncNotebookIsLastChunk = true;
					me._syncNotebookToLocal(notebooks, callback);

					if (notebooks.length) {
						var last = notebooks[notebooks.length-1];
						me.updateSyncUsn('NotebookUsn', last.Usn);
					}
				}
			} else {
				// 同步失败
				me._syncInfo.notebook.ok = false;
				me._syncInfo.notebook.msg = "cann't get all chunks";
				callback && callback(false);
			}
		});
	},

	//-------------
	// note
	//-------------

	// 增加, 有锁
	_lockNote: 1,
	_addSyncNoteNum: function() {
		var me = this;
		if(me._lockNote) {
			me._lockNote = 0;
			me._totalHasSyncNoteNum++;
			me._lockNote = 1;
		} else {
			me._addSyncNoteNum();
		}
	},

	// 同步笔记到本地
	_syncNoteToLocal: function(notes, callback) { 
		var me = this;
		
		function canCall(isEmpty) {
			// 为空时来判断是最后一次了, 可以之前的还没处理完
			if(isEmpty && me._totalHasSyncNoteNum <  me._totalSyncNoteNum) {
				return;
			}

			// 是最后一块, 且
			me._addSyncNoteNum();
			// log('notes: ' + me._totalHasSyncNoteNum + ' ' + me._totalSyncNoteNum + ' ' + me._syncNoteIsLastChunk);
			if(me._syncNoteIsLastChunk && me._totalHasSyncNoteNum >= me._totalSyncNoteNum) {
				// 防止多次callback
				if(!me._syncInfo.note.ok) {
					log('note->next');
					me._syncInfo.note.ok = true;
					callback && callback(true);
				}
			}
		}

		// 为什么会出现最后 > 的情况, 是因为这里length == 0 也判断了
		if(!notes || notes.length == 0) {
			return canCall(true);
		}

		for(var i in notes) {
			var note = notes[i];
			// 得到本地的, 与之对比
			Web.syncProcess('note', note.Title);

			(function(note) {

				var usn = note.Usn;
				var noteId = note.NoteId;

				// 1) 服务器端删除了, 本地肯定删除
				if(note.IsDeleted) {
					console.log('	delete: ', note);
					Note.getNoteIdByServerNoteId(noteId, function(localNoteId) { 
						Note.deleteNoteForce(noteId, function() { 
							// me._syncInfo.note.deletes.push(localNoteId);
							me.fixSynced('note', 'deletes', localNoteId);
							canCall();
						});
					});
					return;
				}
				// 2) 查看本地的, 与本地合并
				Note.getNoteByServerNoteId(noteId, function(noteLocal) {
					// 2.1 本地没有, 表示是新建
					if(!noteLocal) {
						console.log('	add note', note);
						Note.addNoteForce(note, function(note) {
							// me._syncInfo.note.adds.push(note);
							me.fixSynced('note', 'adds', note);
							return canCall();
						});
					} else {
						// 如果Usn一样, 表示服务器端并没有修改
						if(noteLocal.Usn === note.Usn) {
							console.log('	note 如果Usn一样, 表示服务器端并没有修改');
							return canCall();
						}

						// 2.2 本地是否修改了, 冲突, 报告给前端, 前端处理
						// 冲突, 将本地修改的笔记复制一份(设置冲突字段, ConflictNoteId), 远程的覆盖本地的
						// 新方法: 冲突后, 得到最新内容, 看是否与本地内容一致, 如果一致, 则不冲突, 其它数据用服务器上的
						if(noteLocal.IsDirty) {
							console.log('	note 冲突 serverNoteId: ' + noteId, note.Title);
							// console.log(noteLocal.NoteId);
							// console.log(noteLocal.IsDirty);
							// console.log(noteLocal);
							// note.ServerNoteId = note.NoteId;
							// note.NoteId = noteLocal.NoteId;

							Note.getNoteContentFromServer(noteId, function (content) {
								// 表示没有获取到content, 则只能标志为冲突了
								// 内容不一样, 也标为冲突
								if (content === false || content != noteLocal.Content) {
									me._syncInfo.note.conflicts.push({server: note, local: noteLocal});
									// me.fixSynced('note', 'conflicts', {server: note, local: noteLocal});
								}
								// 否则, 内容一样, 标为不冲突, 需要更新
								else {

									// 2.3 服务器是最新的, 用服务器的
									// 服务器是最新的, 本地没动过, 则覆盖之
									Note.updateNoteForce(note, function(note) {
										if(note) {
											// me._syncInfo.note.updates.push(note);
											me.fixSynced('note', 'updates', note);
										}
										canCall();
									}, false);
								}
							});

							return canCall();
						// 2.3 服务器是最新的, 用服务器的
						} else {
							// 服务器是最新的, 本地没动过, 则覆盖之
							Note.updateNoteForce(note, function(note) {
								if(note) {
									// me._syncInfo.note.updates.push(note);
									me.fixSynced('note', 'updates', note);
								}
								canCall();
							});
						}
					}
				});
			})(note);
		}
	},

	syncNote: function(afterUsn, callback) {
		var me = this;
		if(me.isStop()) {
			return;
		}

		console.log('	pull notes from server...');
		Api.getSyncNotes(afterUsn, me._noteMaxEntry, function(notes) {
			// console.log('syncNote---');
			console.log('	notes:', notes);
			if(Common.isOk(notes)) {
				me._totalSyncNoteNum += notes.length;
				// 证明可能还有要同步的
				if(notes.length == me._noteMaxEntry) {
					me._syncNoteToLocal(notes, callback);
					var last = notes[notes.length-1];

					// 500ms延迟
					setTimeout(function () {
						me.syncNote(last.Usn, callback);
					}, 500);

					// 更新Usn
					me.updateSyncUsn('NoteUsn', last.Usn);

				} else {
					console.log('	no more notes');
					me._syncNoteIsLastChunk = true;
					me._syncNoteToLocal(notes, callback);

					if (notes.length) {
						var last = notes[notes.length-1];
						me.updateSyncUsn('NoteUsn', last.Usn);
					}
				}
			} else {
				// 同步失败
				me._syncInfo.note.ok = false;
				me._syncInfo.note.msg = "cann't get all chunks";
				console.error('	pull notes error', notes)
				callback && callback(false);
			}
		});
	},


	//----------------
	// 同步标签
	// ---------------
	// 增加, 有锁
	_lockTag: 1,
	_addSyncTagNum: function() {
		var me = this;
		if(me._lockTag) {
			me._lockTag = 0;
			me._totalHasSyncTagNum++;
			me._lockTag = 1;
		} else {
			me._addSyncTagNum();
		}
	},

	// 同步标签到本地
	_syncTagToLocal: function(tags, callback) { 
		var me = this;
		function canCall(isEmpty) {
			// 为空时来判断是最后一次了, 可以之前的还没处理完
			if(isEmpty && me._totalHasSyncTagNum <  me._totalSyncTagNum) {
				return;
			}

			// 是最后一块, 且
			me._addSyncTagNum();
			// log('tags: ' + me._totalHasSyncNoteNum + ' ' + me._totalSyncNoteNum + ' ' + me._syncNoteIsLastChunk);
			if(me._syncTagIsLastChunk && me._totalHasSyncTagNum >= me._totalSyncTagNum) {
				// 防止多次callback
				if(!me._syncInfo.tag.ok) {
					log('tag->next');
					me._syncInfo.tag.ok = true;
					callback && callback(true);
				}
			}
		}

		// 为什么会出现最后 > 的情况, 是因为这里length == 0 也判断了
		if(!tags || tags.length == 0) {
			return canCall(true);
		}

		for(var i in tags) {
			var tag = tags[i];
			// 得到本地的, 与之对比
			Web.syncProcess('tag', tag.Tag);

			(function(tag) {

				var usn = tag.Usn;
				var tagId = tag.TagId;

				// 1) 服务器端删除了, 本地肯定删除
				if(tag.IsDeleted) {
					console.log('	delete tag: ', tag);
					Tag.deleteTag(tag.Tag, function() {
						// me._syncInfo.tag.deletes.push(tag.Tag);
						me.fixSynced('tag', 'deletes', tag.Tag);
						canCall();
					}, true, me.fullSyncStart);
					return;
				}
				// 2) 查看本地的, 与本地合并
				Tag.getTag(tag.Tag, function(tagLocal) {
					// 2.1 本地没有, 表示是新建
					if(!tagLocal) {
						console.log('	add tag: ...')
						Tag.addOrUpdateTag(tag.Tag, function(tagAdded) {
							// me._syncInfo.tag.adds.push(tagAdded);
							me.fixSynced('tag', 'adds', tagAdded);
							return canCall();
						}, true, usn);
					} else {
						// 本地有, 不用操作
						Tag.setNotDirtyAndUsn(tag.Tag, tag.Usn);
						return canCall();
					}
				});
			})(tag);
		}
	},
	syncTag: function(afterUsn, callback) {
		var me = this;
		if(me.isStop()) {
			return;
		}
		Api.getSyncTags(afterUsn, me._tagMaxEntry, function(tags) {
			// console.log(afterUsn + ' syncTags------------------------------------')
			// console.log(tags);
			if(Common.isOk(tags)) {
				me._totalSyncTagNum += tags.length;
				// 证明可能还有要同步的
				if(tags.length == me._tagMaxEntry) {
					me._syncTagToLocal(tags, callback);
					var last = tags[tags.length-1];
					me.syncTag(last.Usn, callback);

					// 更新Usn
					me.updateSyncUsn('TagUsn', last.Usn);
				} else {
					log('no more');
					me._syncTagIsLastChunk = true;
					me._syncTagToLocal(tags, callback);

					if (tags.length) {
						var last = tags[tags.length-1];
						me.updateSyncUsn('TagUsn', last.Usn);
					}
				}
			} else {
				// 同步失败
				me._syncInfo.tag.ok = false;
				me._syncInfo.tag.msg = "cann't get all chunks";
				console.error('	sync tags error...')
				// console.log(tags);
				callback && callback(false);
			}
		});
	},

	//----------

	// 记录LastSyncUsn, LastUpdateTime 同步时间
	updateLastSyncState: function(callback) {
		var me = this;
		User.updateLastSyncState(function() {
			callback();
		});
	},

	// 为了避免全都重新来过, 这里保存每次
	updateSyncUsn: function (type, usn) {
		// console.error('---')
		// console.log(type + ' = ' + usn);
		User.updateEachSyncState(type, usn, function() {});
	},

	// 全量同步
	// callback(error, info)
	fullSync: function(callback) {
		var me = this;
		me._stop = false;
		me._initSyncInfo();
		me.fullSyncStart = true;

		User.getAllLastSyncState(function(lastUsn, notebookUsn, noteUsn, tagUsn) {
			// 不可能会有lastUsn吧
			if (lastUsn && lastUsn > 0) {
				notebookUsn = -1;
				noteUsn = -1;
				tagUsn = -1;
			}

			if (!notebookUsn) {
				notebookUsn = -1;
			}
			if (!noteUsn) {
				noteUsn = -1;
			}
			if (!tagUsn) {
				tagUsn = -1;
			}

			console.log('fullSync ' + notebookUsn + ' ' + noteUsn + ' ' + tagUsn);

			Api.getLastSyncState(function(serverState) {
				if(!Common.isOk(serverState)) {
					console.error('	get Server LastSyncState error!!');
					callback && callback(serverState, null);
					return;
				}

				// Web.syncNotebookFinish();
				// 同步笔记本
				me.syncNotebook(notebookUsn, function(ok) {
					if(ok) {
						// Web.syncNoteFinish();
						// console.log('------------------')
						// 同步笔记
						me.syncNote(noteUsn, function(ok) {
							if(ok) {
								// Web.syncTagFinish();
								// 同步标签
								me.syncTag(tagUsn, function(ok) { 
									if (ok) {
										me.fullSyncStart = false;
										// 更新上次同步时间
										me.updateLastSyncState(function() {
											// send changes
											// me.sendChanges();
											callback && callback(false, me._syncInfo);
										});
									}
									else {
										me.fullSyncStart = false;
										console.error('syncTag error....');
										callback && callback({}, me._syncInfo);
									}
								});
							} else {
								me.fullSyncStart = false;
								console.error('syncNote error.... 跳过tag');
								callback && callback({}, me._syncInfo);
							}
						});
					} else {
						me.fullSyncStart = false;
						console.error('syncNotebook error.... 跳过note,tag');
						callback && callback({}, me._syncInfo);
					}
				});

			});

		});
	},

	// 处理同步好的之后的
	// mainType == notebook, note, tag
	// type = changeAdds, changeConflicts, adds, deletes, updates, conflicts, errors,
	fixSynced: function (mainType, type, data) {
		if (this.fullSyncStart) {
			return;
		}
		var o = {};
		if (!Common.isArray(data)) {
			data = [data];
		}
		o[type] = data;
		if (mainType == 'notebook') {
			Notebook.fixConflicts(o);
		} else if (mainType == 'note') {
			Note.fixConflicts(o);
		} else {
			Web.addOrDeleteTagFromSync(o);
		}
	},

	// 前端重新渲染
	fixSyncedNotebook: function () {
		var me = this;
		if(me.incrSyncStart) {
			console.log('	fixSyncedNotebook')
			Notebook.fixConflicts(me._syncInfo.notebook);
		}
	},

	// 处理冲突
	fixConflicts: function(callback) {
		var me = this;
		var afterInfo = me._syncInfo;
		// log('处理冲突....');
		// log(me._syncInfo);
		// log(me._syncInfo.tag);
		var tag = me._syncInfo.tag;

		// 如果是incSync, 则要前端处理
		// 不是fullSync
		if(me.incrSyncStart) {

			// Notebook.fixConflicts(me._syncInfo.notebook);

			Note.fixConflicts(me._syncInfo.note, function() {
				// 避免无限循环, 别send changes了
				if(!me._needIncrSyncAgain) {
					// alert("?")
					console.log("	not needIncrSyncAgain")
					// send changes
					callback && callback();
				} else {

				}
			});

			// 添加或删除一些tag
			// console.log('怎么可能?')
			// console.error(me._syncInfo.tag); // 为空, 不知道原因
			// console.error();
			// console.error(tag);
			Web.addOrDeleteTagFromSync(tag);
		}
	},

	fixConflictsForSendChanges: function(callback) { 
		var me = this;
		me.fixConflicts(function() {
			callback();
			// 已结束
			me.setSyncFinished();
		})
	},
	// 同步状态
	syncProcessStatus: 0,
	// 添加
	addSyncProcessStatus: function(n) {
		var me = this;
		me.syncProcessStatus += n;
		if(me.syncProcessStatus >= 100) {
			me.syncProcessStatus = 98;
		}
		Web.syncProgress(me.syncProcessStatus);
	},
	// 增量同步
	incrSyncStart: false,
	// 如果第一次insync, 网络错误导致incrSyncStart不结束, 第二次就会永远转动
	setSyncFinished: function(hasError) { 
		var me = this;
		// unconnect也会调, 所以, 一旦所有都是unconnect, 那就时不时会有进度条到100
		if (!me.incrSyncStart || !me.incrSyncStart) {
			return;
		}
		me.incrSyncStart = false;
		me.fullSyncStart = false;
		// Web.syncProgress(0);
		Web.syncFinished(hasError);
	},
	incrSync: function(again) {
		if (User.isLocal()) {
			console.log('no sync for local account');
			return;
		}
		var me = this;
		me._stop = false;
		me._initSyncInfo();

		// again表示重来
		if(!again && me.incrSyncStart) {
			console.log('上一sync未结束!!');
			return;
		}

		me.incrSyncStart = true;
		me.syncProcessStatus = 0;

		console.log('inc sync start');
		if(again) {
			console.log('again >>');
		}

		// 得到当前LastSyncUsn
		User.getLastSyncState(function(lastSyncUsn, lastSyncTime) {
			console.log('%cstep1 getLastSyncState', 'color: #68bc7a')

			// 没有上次同步的时间, 则需要进行一次全量同步, 不可能会发生
			if(!lastSyncUsn) {
				console.error('	getLastSyncState error!!');
				me.setSyncFinished();
				return;
			}

			// 先从服务器上得到usn, 与本地的判断, 是否需要pull
			Api.getLastSyncState(function(serverState) {
				if(!Common.isOk(serverState)) {
					console.error('	get Server LastSyncState error!!');
					me.setSyncFinished(true);
					return;
				}
				console.log('	get Server LastSyncState ret', serverState.LastSyncUsn + ' ' + lastSyncUsn);
				if(serverState.LastSyncUsn > lastSyncUsn) {
					// 需要同步笔记本
					console.log('%cstep2 pull', 'color: #68bc7a')
					// 同步笔记本
					me.syncNotebook(lastSyncUsn, function(ok) {
						if(ok) {
							me.fixSyncedNotebook();
							console.log('	incr notebook ok', lastSyncUsn);

							me.addSyncProcessStatus(10);
							console.log('	incr note start');

							// 同步笔记
							me.syncNote(lastSyncUsn, function(ok) {
								if(ok) {
									console.log('	incr note ok', lastSyncUsn);
									me.addSyncProcessStatus(30);
									// 同步标签
									me.syncTag(lastSyncUsn, function() { 
										console.log('	incr tag ok', lastSyncUsn);
										me.addSyncProcessStatus(10);
										// 更新上次同步时间
										me.updateLastSyncState(function() {
											// send changes
											me.sendChanges(again);
										});
									});
								} else {
									console.log('	incr note not ok')
									me.fixConflicts();
								}
							});
						} else {
							me.fixConflicts();
						}
					});

				} else {
					console.log('%cstep2 不需要pull, skip', 'color: #68bc7a')
					me.addSyncProcessStatus(50);
					me.sendChanges(again);
				}
			});
		});
	},

	//---------
	// 发送改变
	//---------

	// 发送笔记本的更改
	sendNotebookChanges: function(callback) { 
		var me = this;
		console.log('	3.1: sendNotebookChanges')
		// 获取所有笔记本的更改
		Notebook.getDirtyNotebooks(function(notebooks) {
			if (!Common.isEmpty(notebooks)) {
				console.log('	dirty notebooks:', notebooks);
			} else {
				console.log('	no dirty notebooks');
			}
			if(!notebooks) {
				callback && callback();
			} else {
				// 调api, 所有执行后再callback();
				// 一个一个同步执行, 因为要有
				async.eachSeries(notebooks, function(notebook, cb) {
					var api = Api.updateNotebook;

					// 本地既是新的, 又是删除的, 删除本地的, 不要同步
					// 5/4
					if(notebook.LocalIsNew && notebook.LocalIsDelete) {
						console.log('	笔记本既是新的, 又是删除的, 不同步, 直接删除本地的');
						Notebook.deleteLocalNotebook(notebook.NotebookId);
						return cb();
					}

					if(notebook.LocalIsNew) {
						api = Api.addNotebook;
					} else if(notebook.LocalIsDelete) {
						api = Api.deleteNotebook;
					}

					api.call(Api, notebook, function(newNotebook) {
						// 更新失败
						if(!newNotebook) {
							return cb();
						}

						// 删除操作
						if(notebook.LocalIsDelete) {
							return cb();
						}

						// 更新成功, 是否有冲突? 
						// newNotebook是服务器上的笔记本
						// 没有更新成功
						if(!newNotebook.NotebookId) {
							if(newNotebook.Msg == 'conflict') {
								// 没用, 前端不会处理的, 按理不会出现这种情况, 因为先sync
								// me._syncInfo.notebook.conflicts.push(newNotebook);
								me.fixSynced('notebook', 'conflicts', newNotebook);
							} else if(newNotebook.Msg == 'notExists') {
								// 服务器端没有, 那么要作为添加
								// 可能服务器上已删除, 此时应该要作为添加而不是更新
								// me._syncInfo.notebook.changeNeedAdds.push(notebook);
								me.fixSynced('notebook', 'changeNeedAdds', notebook);
							}

							// me.checkNeedIncSyncAgain(newNotebook.Usn);
							return cb();
						}
						else {
							// 更新
							// TODO 后端updateNotebook只要传Usn回来即可
							console.log("	返回来的notebook " + newNotebook.Title)
							
							Notebook.updateNotebookForceForSendChange(notebook.NotebookId, newNotebook, function() { 
								if(notebook.LocalIsNew) {
									// me._syncInfo.notebook.changeAdds.push(newNotebook);
									me.fixSynced('notebook', 'changeAdds', newNotebook);
								} else {
									// me._syncInfo.notebook.changeUpdates.push(newNotebook);
									me.fixSynced('notebook', 'changeUpdates', newNotebook);
								}

								// 这里才cb(), 因为先添加父, 再添加子
								me.checkNeedIncSyncAgain(newNotebook.Usn);
								cb();
							});
						}
						
					});
				}, function() {
					callback && callback();
				});
			}
		});
	},

	checkNeedIncSyncAgain: function(usn) {
		var me = this;
		// 如果之前都很正常
		if(!me._needIncrSyncAgain) {
			// 检查是否有问题
			if(User.getLastSyncUsn() + 1 == usn) { 
				// 更新到本地lastSyncUsn
				User.updateLastSyncUsn(usn);
			} else {
				// newNote.Usn > User.getLastSyncUsn + 1, 表示服务器端在本次同步后, sendChanges之前有更新
				// 那么, 还需要来一次incrSync, 之后
				if(User.getLastSyncUsn() > usn) { // 添加标签时如果标签已经存在, 则返回的是旧的
					return;
				}
				console.error('---?? checkNeedIncSyncAgain ??------' + usn)
				console.trace();
				me._needIncrSyncAgain = true;
			}
		}
	},

	// 发送笔记改变
	// 发送笔记本的更改
	sendNoteChanges: function(callback) { 
		var me = this;
		console.log('	3.2: sendNoteChanges');
		// 获取所有笔记本的更改
		Note.getDirtyNotes(function(notes) {
			if (!Common.isEmpty(notes)) {
				console.log('	dirty notes:', notes);
			} else {
				console.log('	no dirty notes');
			}
			if(!notes) {
				callback && callback();
			} else {
				// 调api, 所有执行后再callback();
				// 一个一个同步执行, 因为要有
				async.eachSeries(notes, function(note, cb) {
					
					if (note.InitSync) {
						console.log('	InitSync is Dirty', note);
						return cb();
					}

					if (note.ConflictNoteId && !note.ConflictFixed) {
						console.log('	未解决的冲突不同步', note.Title);
						return cb();
					}

					if(note.LocalIsNew) {
						// 是新的, 且不是trash和删除的
						if(!note.IsTrash && !note.LocalIsDelete) { 
							// 添加, newNote的返回不会很多值(server端)
							Api.addNote(note, function(err, newNote) {
								if(err || !Common.isOk(newNote)) {
									console.log('	添加笔记失败!', err, newNote);
									me._syncInfo.note.errors.push({err: err, ret: newNote, note: note});
									return cb();
								}
								console.log('	添加笔记成功!', note.Title);

								newNote.ServerNoteId = newNote.NoteId;
								newNote.NoteId = note.NoteId;

								newNote.IsBlog = note.IsBlog; // 前端要用

								// me._syncInfo.note.changeAdds.push(newNote);
								me.fixSynced('note', 'changeAdds', newNote);

								Note.updateNoteForceForSendChange(newNote, true);

								// 这里
								me.checkNeedIncSyncAgain(newNote.Usn);

								cb();
							});
						}
						// 5/4
						// 本地已经删除了, 则彻底删除之
						else if(note.LocalIsDelete) {
							console.log('	既是新的, 又是删除的, 则删除笔记的');
							Note.deleteLocalNote(note.NoteId);
							return cb();
						}
						// isTrash, 不同步, 不删除
						else {
							console.log('	既是新的, 又是trash的, 不要同步');
							return cb();
						}
					}
					else if(note.LocalIsDelete) {
						// 删除, 不管它了
						// TODO
						Api.deleteTrash(note, function(ret) {
							if(Common.isOk(ret)) {
								me.checkNeedIncSyncAgain(ret.Usn);

							// 本地删除了的, 服务端没有, 直接删除本地的
							} else if (typeof ret == 'object' && ret.Msg == 'notExists') {
								console.log(	'本地删除了的, 服务端没有, 直接删除本地的');
								Note.deleteLocalNote(note.NoteId);
							}
							return cb();
						});
					}
					else {
						// 更新
						Api.updateNote(note, function(err, ret) {
							if(err || !Common.isOk(ret)) {
								console.log('	update error:' + note.Title, ret);
								if(typeof ret == 'object') {
									if(ret.Msg == 'conflict') {
										console.error('	updateNote 冲突');

										// 这种情况有很少见, 原因是先pull, 肯定会pull过来
										// 处理方法和pull一样, 看内容是否一样
										// 如果一样, 则不标志为冲突, 修改本Usn为serverUsn, 等下次再send changes
										Note.getNoteContentFromServer(note.ServerNoteId, function (content) {
											if (content === false || content != note.LocalContent) {
												me._syncInfo.note.changeConflicts.push(note);
												cb();
											}
											else {
												// 不冲突, 修改之Usn
												Api.getNote(note.ServerNoteId, function (serverNote) {
													// 取不到, 当作冲突
													if (!serverNote) {
														me._syncInfo.note.changeConflicts.push(note);
														cb();
													}
													else {
														Note.updateNoteUsn(note.NoteId, serverNote.Usn);
														cb();
													}
												});
											}
										});
									}
									else if(ret.Msg == 'notExists') {
										Note.setError(note.NoteId, err, ret);
										me.fixSynced('note', 'errors', {err: err, ret: ret, note: note});
										// me._syncInfo.note.errors.push({err: err, ret: ret, note: note});
										// 可能服务器上已删除, 此时应该要作为添加而不是更新
										// me._syncInfo.note.changeNeedAdds.push(note);
										cb();
									}
									// 其它错误, 不加, notImage 导致不能终止
									else {
										Note.setError(note.NoteId, err, ret);
										console.error('	updateNote error', err, ret);
										me.fixSynced('note', 'errors', {err: err, ret: ret, note: note});
										cb();
									}
								}
								// 更新失败了, 服务器返回异常
								else {
									Note.setError(note.NoteId, err, ret);
									console.error('	updateNote error', err);
									me.fixSynced('note', 'errors', {err: err, ret: ret, note: note});
									cb();
								}
							}
							// 更新成功
							else {
								console.log('	更新成功: ', note.Title);
								ret.ServerNoteId = ret.NoteId;
								ret.NoteId = note.NoteId;
								Note.updateNoteForceForSendChange(ret, false);
								// me._syncInfo.note.changeUpdates.push(note);
								me.fixSynced('note', 'changeUpdates', note);

								me.checkNeedIncSyncAgain(ret.Usn);

								return cb();
							}
						});
					}
				}, function() {
					callback && callback();
				});
			}
		});
	},
	// 发送标签改变
	sendTagChanges: function(callback) {
		console.log('	3.3: sendTagChanges');
		var me = this;
		// 获取所有笔记本的更改
		Tag.getDirtyTags(function(tags) {
			if (!Common.isEmpty(tags)) {
				console.log('	dirty tags:', tags);
			} else {
				console.log('	no dirty tags');
			}
			if(!tags) {
				callback && callback();
			} else {
				// 调api, 所有执行后再callback();
				// 一个一个同步执行, 因为要有
				async.eachSeries(tags, function(tag, cb) {
					if(tag.IsDirty) {
						if(!tag.LocalIsDelete) {
							// 添加
							Api.addTag(tag.Tag, function(newTag) {
								if(!Common.isOk(newTag)) {
									return cb();
								}
								// 更新, 添加usn
								Tag.setNotDirtyAndUsn(tag.Tag, newTag.Usn);

								me._syncInfo.tag.changeAdds.push(newTag); // 之前是note.changeAdds
								// Tag.updateTagForce(newTag);
								me.checkNeedIncSyncAgain(newTag.Usn);
								cb();
							});
						} else {
							// 删除, 不管它了
							Api.deleteTag(tag, function(ret) {
								if(Common.isOk(ret)) {
									Tag.setNotDirty(tag.Tag);
									me.checkNeedIncSyncAgain(ret.Usn);
								// 本地删除了的, 服务端没有, 直接删除本地的
								} else if (typeof ret == 'object') {
									if (ret.Msg == 'notExists') {
										console.log(	'tag本地删除了的, 服务端没有, 直接删除本地的');
										Tag.deleteLocalTag(tag.Tag);
									} else if(ret.Msg == 'conflict') {
										Tag.setNotDirty(tag.Tag);
									}
								}
								return cb();
							});
						}
					}
				}, function() {
					callback && callback();
				});
			}
		});
	},

	// again, 再一次sync, 不要send changes
	sendChanges: function(again) { 
		var me = this;
		console.log('%cstep3 send changes', 'color: #68bc7a')
		// 先处理冲突, 可以同时进行
		if(again) {
			console.log('	send changes again....');
			me.fixConflictsForSendChanges(function(){});
			return;
		}
		me.fixConflicts(function() {
			// send changes
			console.log('	send changes');
			me._initSyncInfo(); // 重新初始化[]
			async.series([
				function(cb) {
					me.sendNotebookChanges(cb);
				},
				function(cb) {
					me.addSyncProcessStatus(10);
					me.sendNoteChanges(cb);
				},
				function(cb) {
					me.addSyncProcessStatus(30);
					me.sendTagChanges(cb);
				}
			], function() {
				me.addSyncProcessStatus(10);

				// 重新再来一次增量同步
				if(me._needIncrSyncAgain) {
					console.error('	needIncrSyncAgain')
					me.fixConflictsForSendChanges(function() {
						me.incrSync(true);
					});
				} else {
					console.log('	send changes 后解决冲突');
					me.fixConflictsForSendChanges(function() {
					});
				}
			});
		});
	}
};

module.exports = Sync;