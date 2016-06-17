/**
 *
 * 帐户管理
 * 
 * @author life life@leante.com
 * @date 2015/11/21
 */
var async;

define(function() {
	var accounts = {
		langs: {
			'en-us': {
				'Accounts': 'Accounts',
			},
			'de-de': {
				'Accounts': 'Benutzerkonten',
				"Username": "Benutzername",
				"Is Local": "lokal",
				'Host': 'Server',
				"Yes": "Ja",
				"No": "Nein",
				"DB Optimization": "DB Optimierung",
				"Open Dir": "Ordner",
				"Data": "Daten",
				"Options": "Optionen",
				"Current": "Aktuell",
				"Delete": "Löschen",
				"Close": "Schliessen",

				"Optimizing": "Optimiere",
				"Completed": "Abgeschlossen",
				"Deleted": "Gelöscht",

				"Error": "Fehler",
				"No such account": "Konto existiert nicht",
				"Are you sure, it can't be recovered after it has been deleted": "Sind Sie sicher, nachdem es gelöscht wurde kann es nicht wiederhergestellt werden",

				"Notebook": "Notizbücher",
				"Note": "Notizen",
				"Tag": "Tags",

				"Database": "Datenbank",
				"Image": "Bilder",
				"Attachment": "Anhänge",
			},
			'zh-cn': {
				'Accounts': '帐户管理',
				"Username": "用户名",
				"Is Local": "本地帐户",
				'Host': '服务',
				"Yes": "是",
				"No": "否",
				"DB Optimization": "数据库优化",
				"Open Dir": "打开目录",
				"Data": "数据",
				"Options": "操作",
				"Current": "当前",
				"Delete": "删除",
				"Close": "关闭",

				"Optimizing": "正在优化",
				"Completed": "优化完成",
				"Deleted": "删除成功",

				"Error": "错误",
				"No such account": "无该帐户",
				"Are you sure, it can't be recovered after it has been deleted": "确定要删除该帐户? 本地的数据将会彻底删除",

				"Notebook": "笔记本",
				"Note": "笔记",
				"Tag": "标签",

				"Database": "数据库",
				"Image": "图片",
				"Attachment": "附件",
			},
			'zh-hk': {
				'Accounts': '帳戶管理',
				"Username": "用戶名",
				"Is Local": "本地帳戶",
				"Yes": "是",
				"No": "否",
				'Host': '服務',
				"DB Optimization": "數據庫優化",
				"Open Dir": "打開目錄",
				"Data": "數據",
				"Options": "操作",
				"Current": "當前",
				"Delete": "刪除",
				"Close": "關閉",

				"Optimizing": "正在優化",
				"Completed": "優化完成",
				"Deleted": "刪除成功",

				"Error": "錯誤",
				"No such account": "無該帳戶",
				"Are you sure, it can't be recovered after it has been deleted": "確定要刪除該帳戶? 本地的數據將會徹底刪除",

				"Notebook": "筆記本",
				"Note": "筆記",
				"Tag": "標簽",

				"Database": "數據庫",
				"Image": "圖片",
				"Attachment": "附件",
			},
			'ja-jp': {
				'Accounts': 'アカウント管理',
				"Username": "名前",
				"Is Local": "ローカルアカウント",
				'Host': 'サーバー',
				"Yes": "はい",
				"No": "いいえ",
				"DB Optimization": "データベース最適化",
				"Open Dir": "ディレクトリを開く",
				"Data": "データ",
				"Options": "操作",
				"Current": "現在の",
				"Delete": "削除",
				"Close": "クローズ",

				"Optimizing": "最適化しています",
				"Completed": "最適化した",
				"Deleted": "削除した",

				"Error": "エラー",
				"No such account": "本アカウントがない",
				"Are you sure, it can't be recovered after it has been deleted": "本当にこのアカウントを削除したいですか? このアカウントについてのデータを全て削除します。",
				"Notebook": "ノートブック",
				"Note": "ノート",
				"Tag": "タグ",

				"Database": "データベース",
				"Image": "イメージ",
				"Attachment": "添付ファイル",
			}
		},
		_tpl: `
		<style>
		#accountsDialog .tab-pane {
		  text-align: center;
		  padding: 10px;
		  padding-top: 20px;
		}
		#accountsDialog table {
			width: 100%;
		}
		#accountsDialog td button {
			padding: 5px 8px;

		}
		#accountsDialog .modal-dialog {
			width: 830px ;
		}
		#accountsDialog .user-data {
			margin: 0;
		    padding: 0;
		    list-style: none;
		}
		#accountsDialog .user-data a {
		    color: #428bca;
		    display: inline-block;
		    margin: 0 3px;
		}
		#accountsDialog .user-data a:hover {
			text-decoration: underline !important;
		}
		#accountsDialog .user-data .account-q {
			color: #ddd;
		}
		#accountsDialog .user-data .account-q:hover {
			color: #428bca;
		}
		#accountsDialog .data-text {
			display: inline-block;
			min-width: 130px;
		}
		#accountsDialog .user-data li {
		    border-bottom: 1px solid #eee;
		    padding: 5px 0;
		}
		</style>
	    <div class="modal fade bs-modal-sm" id="accountsDialog" tabindex="-1" role="dialog" aria-labelledby="mySmallModalLabel">
	        <div class="modal-dialog">
	          <div class="modal-content">
		          <div class="modal-header">
		              <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
		              <h4 class="modal-title" class="modalTitle"><span class="lang">Accounts</span></h4>
		          </div>
		          <div class="modal-body" id="">
			          <table class="table table-hover">
			          	<thead>
				          	<tr>
					          	<th class="lang">Username</th>
					          	<th class="lang">Is Local</th>
					          	<th class="lang">Data</th>
					          	<th class="lang">Options</th>
				          	</tr>
			          	</thead>
			          	<tbody>
			          	</tbody>
			          </table>
		          </div>
		          <div class="modal-footer ">
		            <button type="button" class="btn btn-default upgrade-cancel-btn lang" data-dismiss="modal" class="lang">Close</button>
		          </div>
	          </div><!-- /.modal-content -->
	        </div><!-- /.modal-dialog -->
	    </div><!-- /.modal -->
		`,

		getMsg: function(txt, data) {
			return Api.getMsg(txt, 'plugin.accounts', data)
		},

		// 初始化dialog
		_inited: false,
		init: function () {
			var me = this;
			if (me._inited) {
				return;
			}
			me._inited = true;
			$('body').append(me._tpl);
			me.dialog = $("#accountsDialog");

			me.dialog.find('.lang').each(function() {
				var txt = $.trim($(this).text());
				$(this).text(me.getMsg(txt));
			});

			me.tbody = me.dialog.find('tbody');

			var op2Func = {
				db: function (userId) {
					me.dbOptimization(userId);
				},
				'open-db-dir': function (userId) {
					Api.userService.getUserRealDBPath(userId, function(path) {
						if (!path) {
							Api.gui.dialog.showErrorBox(me.getMsg("Error"), me.getMsg("No such account"));
							return;
						}
						Api.openLocalDir(path);
					});
				},
				'open-attach-dir': function (userId) {
					Api.openLocalDir(Api.userService.getUserAttachsPath(userId));
				},
				'open-image-dir': function (userId) {
					Api.openLocalDir(Api.userService.getUserImagesPath(userId));
				},
				'delete': function (userId, $targetBtn) {
					me.deleteUser(userId, function (ok) {
						if (ok) {
							$targetBtn.closest('tr').remove();
						}
					});
				}
			};

			// 事件
			me.tbody.on('click', '.op', function () {
				var $this = $(this);
				var userId = $this.closest('tr').data('id');
				var option = $this.data('op');

				var func = op2Func[option];
				if (func) {
					func(userId, $this);
				}
			});
		},

		fixSize: function (size) {
			var unit = 'KB'
			if (size > 1000) {
				size = size / 1000;
				unit = 'MB';
			}
			return size.toFixed(2) + unit;
		},

		userLength: 0,
		curUser: null,

		_renderUserDBDataStats: function(userId, data, n) {
			var me = this;
			if (n > 3) {
				return;
			}
			if($('#' + userId + '-stat-notebook').length) {
				$('#' + userId + '-stat-notebook').text(data.notebook);
				$('#' + userId + '-stat-note').text(data.note);
				$('#' + userId + '-stat-tag').text(data.tag);
			}
			else {
				setTimeout(function () {
					me._renderUserDBDataStats(userId, data, n+1);
				}, 100);
			}
		},

		renderUserDBDataStats: function (user) {
			var me = this;
			Api.userService.getUserDBDataStats(user, function (data) {
				me._renderUserDBDataStats(user.UserId, data, 0);
			});
		},

		renderUser: function(user, renderToExists) {
			var me = this;
			var username = user.Username;
			var userId = user.UserId;
			if (user.IsActive) {
				username += ' <span class="label label-success">' + me.getMsg('Current') + '</span>';
			}
			if (user.Email) {
				username += '<br />Email: <i>' + user.Email + '</i>';
			}
			if (!user.IsLocal) {
				var host = user.Host || Api.evtService.getHost();
				username += '<br />' + me.getMsg('Host') + ': <a onclick="openExternal(\'' + host +'\')">' + host + '</a>';
			}

			var tr = '<td>' + username + '</td>';

			tr += '<td>' + (user.IsLocal ? me.getMsg('Yes') : me.getMsg('No')) + '</td>';

			// 当用户只有一个时, 也可以删除自己
			var disabled = user.IsActive && me.userLength > 1 ? 'disabled="disabled"' : '';

			if (user.IsActive) {
				me.curUser = user;
			}

			// 得到用户的数据统计
			var userStats = Api.userService.getUserDataStats(user);

			var dataTd = '<ul class="user-data">';
			dataTd += '<li><span class="data-text">' + me.getMsg('Database') + ': '
				+ me.fixSize(userStats.db)
				+ '</span><a data-op="open-db-dir" class="op">' + me.getMsg('Open Dir') + '</a>'
				+ '<a data-op="db" class="op">' + me.getMsg('DB Optimization') + '</a>'
				+ '<a class="account-q" onclick="openExternal(\'http://leanote.leanote.com/post/desktop-app-db-optimization\')"><i class="fa fa-question-circle"></i></a>'
				+ '<br />'
				+ me.getMsg('Notebook') + ': <span id="' + userId + '-stat-notebook"></span><br />'
				+ me.getMsg('Note') + ': <span id="' + userId + '-stat-note"></span><br />'
				+ me.getMsg('Tag') + ': <span id="' + userId + '-stat-tag"></span>'
				+ ' </li>'
			dataTd += '<li><span class="data-text">' + me.getMsg('Image') + ': '
				+ me.fixSize(userStats.image)
				+ '</span><a data-op="open-image-dir" class="op">' + me.getMsg('Open Dir') + '</a>'
				+ ' </li>'
			dataTd += '<li><span class="data-text">' + me.getMsg('Attachment') + ': '
				+ me.fixSize(userStats.attach)
				+ '</span><a data-op="open-attach-dir" class="op">' + me.getMsg('Open Dir') + '</a>'
				+ ' </li>'
			dataTd += '</ul>';

			tr += '<td>' + dataTd + '</td>';

			var options = '<div class="btn-group" role="group">'
				+ '<button class="op btn btn-danger" ' + disabled + ' data-op="delete">' + me.getMsg('Delete') + '</button>'
				+ '</div>';
			tr += '<td>' + options + '</td>';

			setTimeout(function () {
				me.renderUserDBDataStats(user);
			}, 1000);

			if (renderToExists) {
				me.tbody.find('[data-id="' + user.UserId + '"]').html(tr);
				return;
			}

			var trContainer = '<tr data-id="' + user.UserId + '">'
				+ tr
				+ '</tr>';
			return trContainer;
		},

		renderUsers: function (users) {
			var me = this;
			var tbody = '';
			for (var i = 0; i < users.length; ++i) {
				var user = users[i];
				tbody += me.renderUser(user);
			}
			me.tbody.html(tbody);
		},

		openModal: function () {
			var me = this;
			me.dialog.modal('show');

			Api.userService.getAllUsers(function (users) {
				me.userLength = users.length;
				me.renderUsers(users);
			});
		},

		// 打开前要执行的
		onOpen: function() {
			var me = this;
			var gui = Api.gui;

		    var menu = new gui.MenuItem({
		        label: me.getMsg('Accounts'),
		        click: function () {
		        	me.init();
		        	me.openModal();
		        }
		    });

		    // 设置
		    Api.addMoreMenu(menu);
		},
		// 打开后
		onOpenAfter: function() {
			var me = this;
		},
		// 关闭时需要运行的
		onClose: function() {
		},

		// 数据库优化
		// 1. 将数据库迁移到独立的目录
		// 2. 将数据库读写合并
		dbOptimization: function (userId) {
			var me = this;
			Api.loading.show('', {hideClose: true});
			Api.userService.getUser(userId, function (user) {
				if (!user) {
					Api.gui.dialog.showErrorBox(me.getMsg("Error"), me.getMsg("No such account"));
					Api.loading.hide();
					return;
				}

				// 已经存在, 合并数据文件
				if (user.HasDB) {
					me.compactDatafile();
					Api.loading.hide(2000);
					Api.loading.setMsg(me.getMsg('Completed'), false);

					me.renderUser(user, true);
					return;
				}

				if (!async) {
					async = require('async');
				}

				me.migrateAllDBs(userId, function (ok) {
					// 迁移成功后, 更新HasDB
					Api.userService.setUserHasDB(userId, function () {
						Api.loading.setMsg(me.getMsg('Completed'), false);
						Api.loading.hide(2000);

						me.renderUser(user, true);
					});
				}, function (msg) {
					Api.loading.setMsg(msg, false);
				});
			});
		},

		// 合并数据
		compactDatafile: function () {
			var names = ['notebooks', 'notes', 'tags', 'images', 'attachs', 'noteHistories'];
			names.forEach(function (name) {
				if (Api.dbService[name]) {
					Api.dbService[name].persistence.compactDatafile();
				}
			});
			return true;
		},

		// 迁移历史记录
		migrateNoteHistories: function (noteId, sDB, dDB, callback) {
			var me = this;
			// 加载DB, 如果成功
			sDB.loadDB(function (ok) {
				if (ok) {
					sDB.findOne({_id: noteId}, function (err, doc) {
						dDB.insert(doc, function(err, retDoc) {
							callback();
						});
					});
				}
				else {
					callback();
				}
			});
		},

		migrateEach: function (userId, sourceDb, distDb, name, callback) {
			var me = this;

			var sDB = sourceDb[name];
			var dDB = distDb[name];

			var query = {UserId: userId};
			sDB.find(query, function(err, docs) {
				if(err) {
					return callback && callback(false);
				}

				if (name === 'notes') {
					me._notes = docs;
				}

				async.eachSeries(docs, function(doc, cb) {
					dDB.insert(doc, function(err, retDoc) {
						if (retDoc) {
							console.log(name + ' ok ' + retDoc._id);

							// 如果是笔记, 则迁移它的笔记历史记录
							if (name === 'notes') {
								me.migrateNoteHistories(
									doc.NoteId,
									sourceDb['noteHistories'],
									distDb['noteHistories'],
									function () {
										cb();
									});
							}
							else {
								cb();
							}
						}
						else {
							console.log(name + ' NO ');
							cb();
						}
					});
				}, function () {
					callback(true);
				});
			});

		},

		dbNames: ['notebooks', 'notes', 'tags', 'images', 'attachs', 'noteHistories'],

		// 迁移到独立目录
		migrateAllDBs: function (userId, callback, msgCallbac) {
			var me = this;
			var names = me.dbNames;
			// notes, notebooks, tags, attachs, images, noteHistories
			// 判断当前db是否是全局的, 如果不是, 则初始化全局的
			var sourceDb = {};
			if (Api.userService.hasDB) {
				Api.dbService.initIt(sourceDb, names, '', false);
			}
			else {
				sourceDb = Api.dbService;
			}

			// 如果dist数据存在, 则删除之, 不用删除, 大不了插入失败

			// 初始化dist
			var distDb = {};
			Api.dbService.initIt(distDb, names, userId, true);

			// OK, 为每个表进行迁移
			async.eachSeries(names, function(name, cb) {
				msgCallbac(me.getMsg('Optimizing') + ' ' + name);
				// console.log('正在优化 ' + name);

				if (name === 'noteHistories') {
					cb();
					return;
				}

				me.migrateEach(userId, sourceDb, distDb, name, function(ok) {
					if (ok) {
						// console.log(name + ' Over');
						msgCallbac(name + ' ' + me.getMsg('Completed'));
					}
					else {
						// console.log(name + ' 迁移失败');
					}
					cb();
				});
			}, function () {
				// 如果优化的是当前的用户, 则需要将db的表替换成distDb
				if (Api.userService.getCurActiveUserId() == userId) {
					for (var i = 0; i < names.length; ++i) {
						var name = names[i];
						Api.dbService[name] = distDb[name];
					}
				}
				callback();
			});
		},

		// 删除用户
		deleteUser: function(userId, callback) {
			var me = this;
			if (confirm(me.getMsg("Are you sure, it can't be recovered after it has been deleted"))) {

				Api.loading.show('', {hideClose: true});

				Api.userService.deleteUserAndAllData(userId, function () {
					Api.trigger('deleteUser');

					Api.loading.setMsg(me.getMsg('Deleted'), false);
					Api.loading.hide(2000);

					callback(true);

					me.userLength--;

					// 删除的是当前账户
					if (me.curUser.UserId === userId) {
						Api.switchToLoginWhenNoUser();
						return;
					}
					// 当只有一个用户时, 重新renderActive行, 可以删除
					if (me.userLength == 1) {
						me.renderUser(me.curUser, true);
					}
				});
			}
			else {
				callback(false);
			}
		}
	};

	return accounts;

});
