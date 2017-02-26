Notebook.curNotebookId = "";
Notebook.cache = {}; // notebookId => {};
Notebook.notebooks = []; // 按次序
// <li role="presentation"><a role="menuitem" tabindex="-1" href="#">CSS</a></li>	
Notebook.notebookNavForListNote = ""; // html 为了note list上面和新建时的ul

// 设置缓存
Notebook.setCache = function(notebook) {
    var notebookId = notebook.NotebookId;
    if (!notebookId) {
        return;
    }
    if (!Notebook.cache[notebookId]) {
        Notebook.cache[notebookId] = {};
    }
    $.extend(Notebook.cache[notebookId], notebook);
};

Notebook.getCurNotebookId = function() {
    return Notebook.curNotebookId;
};

Notebook.getCurNotebook = function() {
    return Notebook.cache[Notebook.curNotebookId];
};

// 为什么可能会没有? 因为可能是新加的笔记本, 此时该笔记本又有笔记, 一起同步过来
// 还没显示到web上
// 放在这里, 让addNote时调用
Notebook._newNotebookNumberNotes = {}; // notebookId => count
Notebook._subNotebookNumberNotes = {};
Notebook.reRenderNotebookNumberNotesIfIsNewNotebook = function(notebookId) {
    var count = Notebook._newNotebookNumberNotes[notebookId];
    if (count) {
        delete Notebook._newNotebookNumberNotes[notebookId];
    } else {
        return;
    }
    Notebook.updateNotebookNumberNotes(notebookId, count);
};
// 为了server Web调用
Notebook.updateNotebookNumberNotes = function(notebookId, count) {
    var self = this;
    var notebook = self.getNotebook(notebookId);
    // 为什么可能会没有? 因为可能是新加的笔记本, 此时该笔记本又有笔记, 一起同步过来
    // 可能是子笔记本, 显示不出
    // 还没显示到web上
    if (!notebook) {
        Notebook._newNotebookNumberNotes[notebookId] = count;
        return;
    }
    if (!$("#numberNotes_" + notebookId).length) {
        Notebook._subNotebookNumberNotes[notebookId] = count;
        return;
    }

    notebook.NumberNotes = count;
    $("#numberNotes_" + notebookId).html(count);
};

// 笔记本的笔记数量更新
Notebook._updateNotebookNumberNotes = function(notebookId, n) {
    var self = this;
    var notebook = self.getNotebook(notebookId);
    if (!notebook) {
        return;
    }
    if (!notebook.NumberNotes) {
        notebook.NumberNotes = 0;
    }
    notebook.NumberNotes += n;
    if (notebook.NumberNotes < 0) {
        notebook.NumberNotes = 0;
    }

    // 得到笔记本下笔记的数量, v2, 重新统计
    var notes = Note.getNotesByNotebookId(notebookId);
    var cnt = notes ? notes.length : 0;

    if (!cnt) {
        $("#numberNotes_" + notebookId).html(notebook.NumberNotes);
    } else {
        if (n == -1) {
            cnt += n;
        }
        if (cnt < 0) {
            cnt = 0;
        }
        $("#numberNotes_" + notebookId).html(cnt);
    }
};

// addNote, copyNote, moveNote
Notebook.incrNotebookNumberNotes = function(notebookId) {
    var self = this;
    self._updateNotebookNumberNotes(notebookId, 1);
};
// moteNote, deleteNote
Notebook.minusNotebookNumberNotes = function(notebookId) {
    var self = this;
    self._updateNotebookNumberNotes(notebookId, -1);
};

// 得到notebook标题, 给note显示其notebook标题用
// called by Note
Notebook.getNotebook = function(notebookId) {
    return Notebook.cache[notebookId];
};

// called by Note
Notebook.getNotebookTitle = function(notebookId) {
    var notebook = Notebook.cache[notebookId];
    if (notebook) {
        return trimTitle(notebook.Title);
    } else {
        return getMsg("UnTitled");
    }
}

/**
 * 我的notebooks
<ul class="folderBody" id="notebookList">
	<li><a class="active">所有</a></li>
	<li><a class="active">Hadoop</a></li>
	<li><a>August 13, 2013</a></li>
</ul>
 */

// 得到下级notebooks
Notebook.getSubNotebooks = function(parentNotebookId) {
    var me = this;
    var treeObj = me.tree;

    var parentNode = treeObj.getNodeByTId(parentNotebookId);
    if (!parentNode) {
        return;
    }

    var nextLevel = parentNode.level + 1;

    function filter(node) {
        return node.level == nextLevel;
    }
    var nodes = treeObj.getNodesByFilter(filter, false, parentNode);

    if (nodes && nodes.length == 0) {
        return false;
    }
    return nodes;
};

/**
 * Simple Tree Setting(基本版)
 * 笔记移动、复制时使用
 */
Notebook.getSimpleTreeSetting = function(options) {
    // 添加自定义dom
    function addDiyDom(treeId, treeNode) {
        var spaceWidth = 5;
        var switchObj = $("#" + treeId + " #" + treeNode.tId + "_switch"),
            icoObj = $("#" + treeId + " #" + treeNode.tId + "_ico");
        switchObj.remove();
        icoObj.before(switchObj);

        if (treeNode.level > 1) {
            var spaceStr = "<span style='display: inline-block;width:" + (spaceWidth * treeNode.level) + "px'></span>";
            switchObj.before(spaceStr);
        }
    }
    var onDblClick = function(e, treeId, treeNode) {
        var notebookId = treeNode.NotebookId;
        options.callback(notebookId);
        $("#leanoteDialog").modal('hide');
    };
    var setting = {
        view: {
            showLine: false,
            showIcon: false,
            selectedMulti: false,
            addDiyDom: addDiyDom
        },
        data: {
            key: {
                name: "Title",
                children: "Subs",
            }
        },
        callback: {
            onDblClick: onDblClick
        }
    };
    return setting;
}

Notebook.getTreeSetting = function(isSearch, isShare) {
    var noSearch = !isSearch;

    var self = this;
    // 添加自定义dom
    function addDiyDom(treeId, treeNode) {
        var spaceWidth = 5;
        var switchObj = $("#" + treeId + " #" + treeNode.tId + "_switch"),
            icoObj = $("#" + treeId + " #" + treeNode.tId + "_ico");
        switchObj.remove();
        icoObj.before(switchObj);

        if (!Notebook.isAllNotebookId(treeNode.NotebookId) && !Notebook.isTrashNotebookId(treeNode.NotebookId)) {
            icoObj.after($('<span class="notebook-number-notes" id="numberNotes_' + treeNode.NotebookId + '">' + (treeNode.NumberNotes || 0) + '</span>'));
            // icoObj.after($('<span class="notebook-dirty" id="notebookDirty_' + treeNode.NotebookId + '"></span>'));
            icoObj.after($('<span class="fa notebook-setting" title="' + getMsg('Setting') + '"></span>'));
        }

        if (treeNode.level > 1) {
            var spaceStr = "<span style='display: inline-block;width:" + (spaceWidth * treeNode.level) + "px'></span>";
            switchObj.before(spaceStr);
        }
    }
    // 拖拽
    function beforeDrag(treeId, treeNodes) {
        for (var i = 0, l = treeNodes.length; i < l; i++) {
            if (treeNodes[i].drag === false) {
                return false;
            }
        }
        return true;
    }

    function beforeDrop(treeId, treeNodes, targetNode, moveType) {
        return targetNode ? targetNode.drop !== false : true;
    }

    function onDrop(e, treeId, treeNodes, targetNode, moveType) {
        var treeNode = treeNodes[0];
        // 搜索不能drag
        if (!targetNode) {
            return;
        }
        var parentNode;
        var treeObj = self.tree;
        var ajaxData = { curNotebookId: treeNode.NotebookId };

        // 成为子节点, 那么只需要得到targetNode下所有的子结点即可
        if (moveType == "inner") {
            parentNode = targetNode;
        } else {
            parentNode = targetNode.getParentNode();
        }

        // 在targetNode之前或之后, 
        // 那么: 1) 需要将该parentNode下所有的node重新排序即可; 2) treeNodes[0]为parentNode的子
        if (!parentNode) {
            var nodes = treeObj.getNodes(); // 得到所有nodes
        } else {
            ajaxData.parentNotebookId = parentNode.NotebookId;
            var nextLevel = parentNode.level + 1;

            function filter(node) {
                return node.level == nextLevel;
            }
            var nodes = treeObj.getNodesByFilter(filter, false, parentNode);
        }

        ajaxData.siblings = [];
        for (var i in nodes) {
            var notebookId = nodes[i].NotebookId;
            if (!Notebook.isAllNotebookId(notebookId) && !Notebook.isTrashNotebookId(notebookId)) {
                ajaxData.siblings.push(notebookId);
            }
        }

        // {siblings: [id1, id2], parentNotebookId: 'xx', curNotebookId: 'yy'}
        NotebookService.dragNotebooks(ajaxData.curNotebookId, ajaxData.parentNotebookId, ajaxData.siblings);

        // 设置dirty状态
        // 不需要设置parentNotebookId
        var ids = [ajaxData.curNotebookId].concat(ajaxData.siblings || []);
        ids.forEach(function(notebookId) {
            if (notebookId) {
                Notebook.setDirtyOrNew(notebookId, true);
            }
        });
        setTimeout(function() {
            Notebook.changeNav();
        }, 100);
    }

    var onClick = function(e, treeId, treeNode) {
        var notebookId = treeNode.NotebookId;
        Notebook.changeNotebook(notebookId);
    };
    var onDblClick = function(e) {
        var notebookId = $(e.target).attr("notebookId");
        if (!Notebook.isAllNotebookId(notebookId) && !Notebook.isTrashNotebookId(notebookId)) {
            self.updateNotebookTitle(e.target);
        }
    };

    var setting = {
        view: {
            showLine: false,
            showIcon: false,
            selectedMulti: false,
            dblClickExpand: false,
            addDiyDom: addDiyDom
        },
        data: {
            key: {
                name: "Title",
                children: "Subs",
            }
        },
        edit: {
            enable: true,
            showRemoveBtn: false,
            showRenameBtn: false,
            drag: {
                isMove: noSearch,
                prev: noSearch,
                inner: noSearch,
                next: noSearch
            }
        },
        callback: {
            beforeDrag: beforeDrag,
            beforeDrop: beforeDrop,
            onDrop: onDrop,
            onClick: onClick,
            onDblClick: onDblClick,
            onExpand: function(event, treeId, treeNode) {
                // 展开时, 会有子笔记本, 如果之前有设置数量, 则重新设置
                // 为了防止移动, 复制过来时没有该sub
                if (treeNode.isParent) {
                    var childNotes = self.getSubNotebooks(treeNode.NotebookId);
                    if (childNotes) {
                        childNotes.forEach(function(node) {
                            var notebookId = node.NotebookId;
                            if (Notebook._subNotebookNumberNotes[notebookId] !== undefined) {
                                $('#numberNotes_' + notebookId).html(Notebook._subNotebookNumberNotes[notebookId]);
                                Notebook._subNotebookNumberNotes[notebookId] = undefined;
                            }
                            // 子的dirty, new状态
                            Notebook.setDirtyOrNewForSub(notebookId);
                        });
                    }
                }
            },
            beforeRename: function(treeId, treeNode, newName, isCancel) {
                if (newName == "") {
                    if (treeNode.IsNew) {
                        // 删除之
                        self.tree.removeNode(treeNode);
                        return true;
                    }
                    return false;
                }
                if (treeNode.Title == newName) {
                    return true;
                }

                // 如果是新添加的
                if (treeNode.IsNew) {
                    var parentNode = treeNode.getParentNode();
                    var parentNotebookId = parentNode ? parentNode.NotebookId : "";

                    self.doAddNotebook(treeNode.NotebookId, newName, parentNotebookId);
                } else {
                    self.doUpdateNotebookTitle(treeNode.NotebookId, newName);
                }
                return true;
            }
        }
    };

    return setting;
};

Notebook.allNotebookId = "0";
Notebook.trashNotebookId = "-1";
Notebook.curNotebookIsTrashOrAll = function() {
    return Notebook.curNotebookId == Notebook.trashNotebookId || Notebook.curNotebookId == Notebook.allNotebookId;
};
Notebook.curNotebookIsTrash = function() {
    return Notebook.curNotebookId == Notebook.trashNotebookId;
};
// reload 是否再一次load
Notebook.renderNotebooks = function(notebooks, reload) {
    var self = this;

    if (!notebooks || typeof notebooks != "object" || notebooks.length < 0) {
        notebooks = [];
    }

    // title可能有<script>
    for (var i = 0, len = notebooks.length; i < len; ++i) {
        var notebook = notebooks[i];
        notebook.Title = trimTitle(notebook.Title);
    }

    notebooks = [{ NotebookId: Notebook.allNotebookId, Title: getMsg("all"), drop: false, drag: false }].concat(notebooks);
    notebooks.push({ NotebookId: Notebook.trashNotebookId, Title: getMsg("trash"), drop: false, drag: false });
    Notebook.notebooks = notebooks; // 缓存之

    self.tree = $.fn.zTree.init($("#notebookList"), self.getTreeSetting(), notebooks);

    // 展开/折叠图标
    var $notebookList = $("#notebookList");
    $notebookList.hover(function() {
        if (!$(this).hasClass("showIcon")) {
            $(this).addClass("showIcon");
        }
    }, function() {
        $(this).removeClass("showIcon");
    });

    // 缓存所有notebooks信息
    if (!isEmpty(notebooks)) {
        Notebook.curNotebookId = notebooks[0].NotebookId;
        self.cacheAllNotebooks(notebooks);
    }

    if (!reload) {
        // 渲染nav
        Notebook.renderNav();

        // 渲染第一个notebook作为当前
        Notebook.changeNotebookNavForNewNote(notebooks[0].NotebookId);
    } else {
        console.log('	reload notebook ok');
    }
};

Notebook.cacheAllNotebooks = function(notebooks) {
    var self = this;
    for (var i in notebooks) {
        var notebook = notebooks[i];
        Notebook.cache[notebook.NotebookId] = notebook;
        if (!isEmpty(notebook.Subs)) {
            self.cacheAllNotebooks(notebook.Subs);
        }
    }
};

// 展开到笔记本
Notebook.expandNotebookTo = function(notebookId, userId) {
    var me = this;
    var selected = false;
    var tree = me.tree;

    // 共享的
    if (userId) {
        return;
    }
    var curNode = tree.getNodeByTId(notebookId);
    if (!curNode) {
        return;
    }
    while (true) {
        var pNode = curNode.getParentNode();
        if (pNode) {
            tree.expandNode(pNode, true);
            if (!selected) {
                Notebook.changeNotebookNav(notebookId);
                selected = true;
            }
            curNode = pNode;
        } else {
            if (!selected) {
                Notebook.changeNotebookNav(notebookId);
            }
            break;
        }
    }
};


// RenderNotebooks调用, 
// nav 为了新建, 快速选择, 移动笔记
// 这些在添加,修改,删除notebooks都要变动!!!
Notebook.renderNav = function(nav) {
    var self = this;
    self.changeNav();
};

// 搜索notebook
Notebook.searchNotebookForAddNote = function(key) {
    var self = this;
    if (key) {
        var notebooks = self.tree.getNodesByParamFuzzy("Title", key);
        notebooks = notebooks || [];
        // 过滤下, 把new, trash过滤掉
        var notebooks2 = [];
        for (var i in notebooks) {
            var notebookId = notebooks[i].NotebookId;
            if (!self.isAllNotebookId(notebookId) && !self.isTrashNotebookId(notebookId)) {
                notebooks2.push(notebooks[i]);
            }
        }
    }
};

// 搜索notebook
Notebook.searchNotebookForList = function(key) {
    var self = this;
    var $search = $("#notebookListForSearch");
    var $notebookList = $("#notebookList");
    if (key) {
        $search.show();
        $notebookList.hide();

        var notebooks = self.tree.getNodesByParamFuzzy("Title", key);
        log('search');
        log(notebooks);
        if (isEmpty(notebooks)) {
            $search.html("");
        } else {
            var setting = self.getTreeSetting(true);
            self.tree2 = $.fn.zTree.init($search, setting, notebooks);
        }
    } else {
        self.tree2 = null;
        $search.hide();
        $notebookList.show();
    }
};

Notebook.everNotebooks = [];
Notebook.changeNav = function() {
    var self = Notebook;
    var notebooks = Notebook.tree.getNodes();
    var pureNotebooks = []; // 不含新和垃圾
    for (var i = 0; i < notebooks.length; ++i) {
        var notebookId = notebooks[i].NotebookId;
        if (Notebook.isAllNotebookId(notebookId) || Notebook.isTrashNotebookId(notebookId)) {} else {
            pureNotebooks.push(notebooks[i]);
        }
    }
    self.everNotebooks = pureNotebooks;
    // 移动, 复制重新来, 因为nav变了, 移动至-----的notebook导航也变了
    Note.initContextmenu();
};

/**
 * 我的共享notebooks	    
 <div id="shareNotebooks">
	 <div class="folderNote closed">
      <div class="folderHeader">
        <a>
          <h1>
            <i class="fa fa-angle-right"></i> 
            Life's</h1>
        </a>
      </div>
      <ul class="folderBody">
        <li><a>Hadoop</a></li>
        <li><a>Node webkit</a></li>
        <li><a>Hadoop</a></li>
        <li><a>Node webkit</a></li>
      </ul>
    </div>
 */
// TODO 层级
Notebook.renderShareNotebooks = function(sharedUserInfos, shareNotebooks) {
    if (isEmpty(sharedUserInfos)) {
        return;
    }

    if (!shareNotebooks || typeof shareNotebooks != "object" || shareNotebooks.length < 0) {
        return;
    }

    var $shareNotebooks = $("#shareNotebooks");
    var user2ShareNotebooks = {};
    for (var i in shareNotebooks) {
        var userNotebooks = shareNotebooks[i];
        user2ShareNotebooks[userNotebooks.UserId] = userNotebooks;
    }
    for (var i in sharedUserInfos) {
        var userInfo = sharedUserInfos[i];
        var userNotebooks = user2ShareNotebooks[userInfo.UserId] || { ShareNotebooks: [] };

        userNotebooks.ShareNotebooks = [{ NotebookId: "-2", Title: "默认共享" }].concat(userNotebooks.ShareNotebooks)

        var username = userInfo.Username || userInfo.Email;
        var header = tt('<div class="folderNote closed"><div class="folderHeader"><a><h1 title="? 的共享"><i class="fa fa-angle-right"></i>?</h1></a></div>', username, username);
        var body = '<ul class="folderBody">';
        for (var j in userNotebooks.ShareNotebooks) {
            var notebook = userNotebooks.ShareNotebooks[j];
            body += tt('<li><a notebookId="?">?</a></li>', notebook.NotebookId, notebook.Title)
        }
        body += "</ul>";

        $shareNotebooks.append(header + body + "</div>")
    }
}

// 左侧导航, 选中某个notebook
Notebook.selectNotebook = function(target) {
    $(".notebook-item").removeClass("curSelectedNode");
    $(target).addClass("curSelectedNode");
};

// 新建笔记导航
Notebook.changeNotebookNavForNewNote = function(notebookId, title) {
    // 没有notebookId, 则选择第1个notebook
    // 第一个是全部笔记
    if (!notebookId) {
        var notebook = Notebook.notebooks[0];
        notebookId = notebook.NotebookId;
        title = notebook.Title;
    }
    if (!title) {
        var notebook = Notebook.cache[0];
        title = notebook.Title;
    }

    if (!Notebook.isAllNotebookId(notebookId) && !Notebook.isTrashNotebookId(notebookId)) {
        $("#curNotebookForNewNote").html(title).attr("notebookId", notebookId);
    } else if (!$("#curNotebookForNewNote").attr("notebookId")) {
        // 但又没有一个笔记, 默认选第一个吧
        // 这里很可能会死循环, 万一用户没有其它笔记呢?
        // 服务端肯定要在新建一个用户时给他创建一个默认笔记本的
        if (Notebook.notebooks.length > 2) {
            var notebook = Notebook.notebooks[1];
            notebookId = notebook.NotebookId;
            title = notebook.Title;
            Notebook.changeNotebookNavForNewNote(notebookId, title);
        }
    }
}

// 改变导航, 两处
// 单击左侧, 单击新建下拉时调用
// 1 选中左侧导航, 
// 2 notelist上面 >
// 3 新建笔记 - js >
// 转成我的nav <-> 共享
Notebook.toggleToMyNav = function(userId, notebookId) {
    $("#sharedNotebookNavForListNav").hide();
    $("#myNotebookNavForListNav").show();

    $("#newMyNote").show();
    $("#newSharedNote").hide();

    // 搜索tag隐藏
    $("#tagSearch").hide();
};

Notebook.changeNotebookNav = function(notebookId) {
    Notebook.curNotebookId = notebookId;
    Notebook.toggleToMyNav();

    // 1 改变当前的notebook
    Notebook.selectNotebook($(tt('#notebook [notebookId="?"]', notebookId)));

    var notebook = Notebook.cache[notebookId];

    if (!notebook) {
        return;
    }

    // 2
    Notebook.changeCurNotebookTitle(notebook.Title);

    // 3
    Notebook.changeNotebookNavForNewNote(notebookId, notebook.Title);
};

Notebook.isAllNotebookId = function(notebookId) {
    return notebookId == Notebook.allNotebookId;
};
Notebook.isTrashNotebookId = function(notebookId) {
    return notebookId == Notebook.trashNotebookId;
};
// 当前选中的笔记本是否是"所有"
// called by Note
Notebook.curActiveNotebookIsAll = function() {
    return Notebook.isAllNotebookId($("#notebookList .curSelectedNode").attr("notebookId"));
};
Notebook.curActiveNotebookIsTrash = function() {
    return Notebook.isTrashNotebookId($("#notebookList .curSelectedNode").attr("notebookId"));
};

Notebook.renderCurNotebook = function() {
        Notebook.changeNotebook(Notebook.curNotebookId);
    }
    // 改变笔记本
    // 0. 改变样式
    // 1. 改变note, 此时需要先保存
    // 2. ajax得到该notebook下的所有note
    // 3. 使用Note.RederNotes()
    // callback Pjax, 当popstate时调用
Notebook.changeNotebookSeq = 1;
Notebook.changeNotebook = function(notebookId, callback, needRendNoteId) {
    var me = this;

    // 如果找不到
    if (!Notebook.cache[notebookId]) {
        return;
    }

    Notebook.changeNotebookNav(notebookId);

    Notebook.curNotebookId = notebookId;

    // 1
    Note.curChangedSaveIt(true);

    // 2 先清空所有
    Note.clearAll();

    var url = "/note/listNotes/";
    var param = { notebookId: notebookId };
    var cacheNotes = null;
    // 废纸篓
    if (Notebook.isTrashNotebookId(notebookId)) {
        url = "/note/listTrashNotes";
        param = {};
    } else if (Notebook.isAllNotebookId(notebookId)) {
        param = {};
        // 得到全部的...
        cacheNotes = Note.getNotesByNotebookId();
        // 数量一致
        if (!isEmpty(cacheNotes)) {
            if (callback) {
                callback(cacheNotes);
            } else {
                Note.renderNotesAndTargetNote(cacheNotes, needRendNoteId, true);
            }
            return;
        }
    } else {
        cacheNotes = Note.getNotesByNotebookId(notebookId);
        var notebook = Notebook.cache[notebookId];
        notebook.Title = trimTitle(notebook.Title);
        if (!notebook) {
            return;
        }
        var len = cacheNotes ? cacheNotes.length : 0;

        // 如果为0, 从服务器上拿
        if (len != 0 && len == notebook.NumberNotes) {
            if (callback) {
                callback(cacheNotes);
            } else {
                Note.renderNotesAndTargetNote(cacheNotes, needRendNoteId, true);
            }
            return;
        } else {
            Note.clearCacheByNotebookId(notebookId);
            log('数量不一致');
        }
    }

    // 2 得到笔记本
    // 这里可以缓存起来, note按notebookId缓存
    // 这里可能点击过快导致前面点击的后来才返回
    me.showNoteAndEditorLoading();
    me.changeNotebookSeq++;
    (function(seq) {
        var callback2 = function(cacheNotes) {
            // 后面点击过快, 之前的结果不要了
            if (seq != me.changeNotebookSeq) {
                log("notebook changed too fast!");
                log(cacheNotes);
                return;
            }
            if (callback) {
                callback(cacheNotes);
            } else {
                Note.renderNotesAndTargetNote(cacheNotes, needRendNoteId, false);
            }
            me.hideNoteAndEditorLoading();
        };
        if (Notebook.isTrashNotebookId(notebookId)) {
            Service.noteService.getTrashNotes(callback2);
        } else {
            Service.noteService.getNotes(notebookId, callback2);
        }
        // ajaxGet(url, param, );
    })(me.changeNotebookSeq);
};

// 改变标签, isStarred是否是星笔记本
Notebook.changeCurNotebookTitle = function(title, isStarred, subTitle, isTag, isSearch) {
    var me = this;
    var title = isTag ? title : trimTitle(title);
    $("#curNotebookForListNote").html(title);
    me.isStarred = isStarred;
    me.isTag = isTag;
    me.isSearch = isSearch;
    if (isTag) {
        $('#myNotebookNavForListNav').addClass('tag-title');
    } else {
        $('#myNotebookNavForListNav').removeClass('tag-title');
    }
};

// 笔记列表与编辑器的mask loading
Notebook.showNoteAndEditorLoading = function() {
    $("#noteAndEditorMask").show();
};
Notebook.hideNoteAndEditorLoading = function() {
    $("#noteAndEditorMask").hide();
};

// 是否是当前选中的notebookId
// 还包括共享
// called by Note
Notebook.isCurNotebook = function(notebookId) {
    return $(tt('#notebookList [notebookId="?"], #shareNotebooks [notebookId="?"]', notebookId, notebookId)).attr("class") == "active";
};

// 改变nav, 为了新建note
// called by Note
Notebook.changeNotebookForNewNote = function(notebookId) {
    // 废纸篓
    if (Notebook.isTrashNotebookId(notebookId) || Notebook.isAllNotebookId(notebookId)) {
        return;
    }

    Notebook.changeNotebookNav(notebookId, true);
    Notebook.curNotebookId = notebookId;

    // 2 得到笔记本
    // 这里可以缓存起来, note按notebookId缓存
    Service.noteService.getNotes(notebookId, function(notes) {
        // note 导航
        Note.renderNotes(notes, true);
    });
};

//---------------------------
// 显示共享信息
Notebook.listNotebookShareUserInfo = function(target) {
        var notebookId = $(target).attr("notebookId");
        showDialogRemote("/share/listNotebookShareUserInfo", { notebookId: notebookId });
    }
    // 共享笔记本
Notebook.shareNotebooks = function(target) {
    var title = $(target).text();
    showDialog("dialogShareNote", { title: "分享笔记本给好友-" + title });
    setTimeout(function() {
        $("#friendsEmail").focus();
    }, 500);
    var notebookId = $(target).attr("notebookId");

    shareNoteOrNotebook(notebookId, false);
}

//-----------------------------
// 设为blog/unset
Notebook.setNotebook2Blog = function(target) {
    var notebookId = $(target).attr("notebookId");
    var notebook = Notebook.cache[notebookId];
    var isBlog = true;
    if (notebook.IsBlog != undefined) {
        isBlog = !notebook.IsBlog;
    }

    // 那么, 如果当前是该notebook下, 重新渲染之
    if (Notebook.curNotebookId == notebookId) {
        if (isBlog) {
            $("#noteList .item-blog").show();
        } else {
            $("#noteList .item-blog").hide();
        }

        // 如果当前在所有笔记本下
    } else if (Notebook.curNotebookId == Notebook.allNotebookId) {
        $("#noteItemList .item").each(function() {
            var noteId = $(this).attr("noteId");
            var note = Note.cache[noteId];
            if (note.NotebookId == notebookId) {
                if (isBlog) $(this).find(".item-blog").show();
                else $(this).find(".item-blog").hide();
            }
        });
    }
    ajaxPost("/notebook/setNotebook2Blog", { notebookId: notebookId, isBlog: isBlog }, function(ret) {
        if (ret) {
            // 这里要设置notebook下的note的blog状态
            Note.setAllNoteBlogStatus(notebookId, isBlog);
            Notebook.setCache({ NotebookId: notebookId, IsBlog: isBlog });
        }
    });
}

// 添加, 修改完后都要对notebook的列表重新计算 TODO

// 修改笔记本标题
Notebook.updateNotebookTitle = function(target) {
    var self = Notebook;
    var notebookId = $(target).attr("notebookId");

    if (self.tree2) {
        self.tree2.editName(self.tree2.getNodeByTId(notebookId));
    } else {
        self.tree.editName(self.tree.getNodeByTId(notebookId));
    }
};
Notebook.subNotebookDirtyOrNew = {}; // notebookId => {dirty: new: }
Notebook.setDirtyOrNew = function(notebookId, isDirty, isNew) {
    if (this._setDirtyOrNew(notebookId, isDirty, isNew)) {
        if (this.subNotebookDirtyOrNew[notebookId]) {
            delete this.subNotebookDirtyOrNew[notebookId];
        }
    }
    // 没找到, 可能是子笔记本, 还没展开
    else {
        this.subNotebookDirtyOrNew[notebookId] = { isDirty: isDirty, isNew: isNew };
    }
};

Notebook.setDirtyOrNewForSub = function(notebookId, isDirty, isNew) {
    var d = this.subNotebookDirtyOrNew[notebookId];
    if (!d) {
        return;
    }
    this._setDirtyOrNew(notebookId, d.isDirty, d.isNew);
};

Notebook._setDirtyOrNew = function(notebookId, isDirty, isNew) {
    var $o = $('#' + notebookId + '_a');
    if ($o.length) {
        isDirty ? $o.addClass('nb-dirty') : $o.removeClass('nb-dirty');
        isNew ? $o.addClass('nb-new') : $o.removeClass('nb-new');
        return true;
    }
    return false;
};

Notebook.doUpdateNotebookTitle = function(notebookId, newTitle) {
    var self = Notebook;
    newTitle = trimTitle(newTitle);
    NotebookService.updateNotebookTitle(notebookId, newTitle, function() {
        // 修改缓存
        Notebook.cache[notebookId].Title = newTitle;
        // 改变nav
        Notebook.changeNav();

        // 同步
        if (self.tree2) {
            var notebook = self.tree.getNodeByTId(notebookId);
            notebook.Title = newTitle;
            self.tree.updateNode(notebook); // 同步到对方
        }

        self.setDirtyOrNew(notebookId, true);
    });
};

// 修改标题 for sync
Notebook.renderUpdateNoteTitle = function(notebookId, newTitle) {
    var self = this;
    // 修改缓存
    if (!Notebook.cache[notebookId]) {
        return;
    }
    Notebook.cache[notebookId].Title = trimTitle(newTitle);
    // 改变nav
    Notebook.changeNav();

    var notebook = self.tree.getNodeByTId(notebookId);
    if (!notebook) {
        return;
    }
    notebook.Title = newTitle;
    if (self.tree) {
        self.tree.updateNode(notebook);
    }
    if (self.tree2) {
        self.tree2.updateNode(notebook);
    }
};


//-----------
// 添加笔记本
// 1 确保是展开的
// 2 在所有后面添加<li></li>
Notebook.addNotebookSeq = 1; // inputId
Notebook.addNotebook = function() {
    var self = Notebook;
    if ($("#myNotebooks").hasClass("closed")) {
        $("#myNotebooks .folderHeader").trigger("click");
    }

    // 添加并修改
    self.tree.addNodes(null, { Title: "", NotebookId: getObjectId(), IsNew: true }, true, true);
}

// rename 调用
Notebook.doAddNotebook = function(notebookId, title, parentNotebookId) {
    var self = Notebook;
    Service.notebookService.addNotebook(notebookId, title, parentNotebookId, function(ret) {
        if (ret.NotebookId) {
            Notebook.cache[ret.NotebookId] = ret;
            var notebook = self.tree.getNodeByTId(notebookId);
            $.extend(notebook, ret);
            notebook.IsNew = false;

            // 选中之
            Notebook.changeNotebook(notebookId);

            // 改变nav
            Notebook.changeNav();
        }
    });
}

//-------------
// 添加子笔记本
Notebook.addChildNotebook = function(target) {
    var self = Notebook;
    if ($("#myNotebooks").hasClass("closed")) {
        $("#myNotebooks .folderHeader").trigger("click");
    }

    var notebookId = $(target).attr("notebookId");

    // 添加并修改
    self.tree.addNodes(self.tree.getNodeByTId(notebookId), { Title: "", NotebookId: getObjectId(), IsNew: true }, false, true);
}

//-------------
// 删除
Notebook.deleteNotebook = function(target) {
    var self = Notebook;

    var notebookId = $(target).attr("notebookId");
    if (!notebookId) {
        return;
    }

    // TODO, 如果删除的是父, 那子树要移到前面去
    // 查看是否有子
    if (self.getSubNotebooks(notebookId)) {
        alert('This notebook has sub notebooks, please delete sub notebooks firstly.');
        return;
    }
    NotebookService.deleteNotebook(notebookId, function(ok, msg) {
        if (!ok) {
            alert(msg || "error");
            return;
        }
        self.deleteNotebookFromTree(notebookId);
    })
};
Notebook.deleteNotebookFromTree = function(notebookId) {
    var self = this;
    self.tree.removeNode(self.tree.getNodeByTId(notebookId));
    if (self.tree2) {
        self.tree2.removeNode(self.tree2.getNodeByTId(notebookId));
    }
    delete Notebook.cache[notebookId];
    // 改变nav
    Notebook.changeNav();
};

// 清空垃圾
Notebook.clearTrash = function() {
    var me = this;
    if (confirm(getMsg('Are you sure ?'))) {
        NoteService.clearTrash(function() {
            if (Notebook.curNotebookId == Notebook.trashNotebookId) {
                Note.clearAll();
                Note.showEditorMask();
            }
        });
    }
};

//---------------
// 笔记本解决冲突
//----------------------
// 冲突解决, 增量sync时
// note是服务器端的笔记, newNote是本地复制后的笔记
Notebook.fixSyncConflict = function(note, newNote) {
    // Note.cache[note.NoteId] = note;
    // Note.cache[newNote.NoteId] = newNote;
    /*
    Note.addNoteCache(note);
    Note.addNoteCache(newNote);

    var target = $(tt('[noteId="?"]', note.NoteId)); // 
    // 如果当前笔记在笔记列表中, 那么生成一个新笔记放在这个笔记上面
    if(target.length > 0) {
    	var newHtmlObject = Note._getNoteHtmlObjct(note);
    	newHtmlObject.insertBefore(target);
    }
    // 当前这个换成新复制的
    target.attr('noteId', newNote.NoteId);
    // 重新render 左侧下, 因为有冲突了, 不要render内容啊

    // 如果当前编辑的是这个笔记, 那切换到newNote上来
    if(Note.curNoteId == note.NoteId) {
    	Note.curNoteId = newNote.NoteId;
    }
    */
};

// push
// 本地 -> 添加到服务器上的
// 前端取消dirty
Notebook.addChanges = function(notebooks) {
    var me = this;
    if (isEmpty(notebooks)) {
        return;
    }
    for (var i = 0; i < notebooks.length; ++i) {
        var notebook = notebooks[i];
        me.setDirtyOrNew(notebook.NotebookId, false, false);
    }
};
Notebook.updateChanges = function(notebooks) {
    this.addChanges(notebooks);
};

// 服务器adds/updates后, 一起渲染
Notebook.reload = function() {
    var me = this;
    var curNotebookId = Notebook.curNotebookId;
    NotebookService.getNotebooks(function(notebooks) {
        me.renderNotebooks(notebooks, true);

        // 定位到某个笔记本下
        Notebook.expandNotebookTo(curNotebookId);

        // 为了移动/复制笔记
        me.changeNav();
    });
};

// 弃用, 一起渲染 reload
// notebooks
// <- server 服务器端添加过来的
// ? 如果是子先添加了, 再父添加呢?
Notebook.addSync = function(notebooks) {
    var me = this;
    if (isEmpty(notebooks)) {
        return;
    }
    console.log('web add sync notebook');
    for (var i = 0; i < notebooks.length; ++i) {
        var notebook = notebooks[i];
        Notebook.setCache(notebook);
        me.tree.addNodes(me.tree.getNodeByTId(notebook.ParentNotebookId), { Title: notebook.Title, NotebookId: notebook.NotebookId, IsNew: false }, // IsNew: false啊!!!
            true, true, false);
    }
};
// 弃用, 一起渲染 reload
// 更新
// 不对移动做修改, 只修改标题
Notebook.updateSync = function(notebooks) {
    var me = this;
    if (isEmpty(notebooks)) {
        return;
    }
    log("update notebook sync");
    for (var i in notebooks) {
        var notebook = notebooks[i];
        // 更新可以是本笔记本删除后, 更新的服务器版
        if (me.cache[notebook.NotebookId]) {
            me.renderUpdateNoteTitle(notebook.NotebookId, notebook.Title);
        } else {
            Notebook.setCache(notebook);
            me.tree.addNodes(me.tree.getNodeByTId(notebook.ParentNotebookId), { Title: notebook.Title, NotebookId: notebook.NotebookId, IsNew: true }, true, true, false);
        }
    }
};

// 删除
Notebook.deleteSync = function(notebooks) {
    var me = this;
    if (isEmpty(notebooks)) {
        return;
    }
    log('delete notebook sync');
    for (var i in notebooks) {
        var notebookId = notebooks[i];
        // 删除
        me.deleteNotebookFromTree(notebookId);
    }
};


// 初始化
Notebook.init = function() {
    //-------------------
    // 点击notebook
    /*
    $("#myNotebooks").on("click", "ul.folderBody li a", function() {
    	var notebookId = $(this).attr("notebookId");
    	Notebook.changeNotebook(notebookId);
    });
    */
    // min
    $("#minNotebookList").on("click", "li", function() {
        var notebookId = $(this).find("a").attr("notebookId");
        Notebook.changeNotebook(notebookId);
    });

    //-------------------
    // 右键菜单
    function newNotebookListMenu() {

        var me = this;
        this.target = '';
        this.menu = new gui.Menu();
        this.addSub = new gui.MenuItem({
            label: getMsg('Add sub notebook'),
            click: function(e) {
                Notebook.addChildNotebook(me.target);
            }
        });
        this.rename = new gui.MenuItem({
            label: getMsg('Rename'),
            click: function(e) {
                Notebook.updateNotebookTitle(me.target);
            }
        });
        this.del = new gui.MenuItem({
            label: getMsg('Delete'),
            click: function(e) {
                Notebook.deleteNotebook(me.target);
            }
        });

        this.menu.append(this.addSub);
        this.menu.append(this.rename);
        this.menu.append(this.del);

        // 导入菜单
        var importMenus = Api.getImportMenus();
        if (importMenus && importMenus.length) {
            var importSubmenus = new gui.Menu();
            for (var i = 0; i < importMenus.length; ++i) {

                (function(j) {
                    var clickCallback = importMenus[j].click;
                    if (clickCallback) {
                        importMenus[i].click = function() {
                            var notebookId = $(me.target).attr("notebookId");
                            var notebook = Notebook.getNotebook(notebookId);
                            clickCallback(notebook);
                        }
                    }
                })(i);

                importSubmenus.append(new gui.MenuItem(importMenus[i]));
            }
            this.imports = new gui.MenuItem({
                submenu: importSubmenus,
                label: getMsg('Import notes')
            });
            this.menu.append(gui.getSeparatorMenu());
            this.menu.append(this.imports);
        }

        // 导出
        var exportsSubMenus = new gui.Menu();
        var exportMenus = Api.getExportMenusForNotebook() || [];
        for (var i = 0; i < exportMenus.length; ++i) {
            (function(j) {

                var menu = exportMenus[j];
                var clickBac = menu.click;

                var menuItem = new gui.MenuItem({
                    label: menu.label,
                    click: function(e) {
                        var notebookId = $(me.target).attr('notebookId');
                        clickBac && clickBac(notebookId);
                    }
                });

                exportMenus[i].menu = menuItem;
                exportsSubMenus.append(menuItem);
            })(i);
        }

        if (exportMenus.length > 0) {
            this.exports = new gui.MenuItem({
                label: getMsg('Export notes'),
                submenu: exportsSubMenus,
                click: function(e) {}
            });

            this.menu.append(this.exports);
        }

        this.enable = function(name, ok) {
            this[name].enabled = ok;
        }
        this.popup = function(e, target, isSearch) {
            me.target = target;
            var notebookId = $(target).attr("notebookId");
            if (Notebook.isTrashNotebookId(notebookId)) {
                newClearTrashMenuSys.popup(e);
                return;
            }
            if (Notebook.isAllNotebookId(notebookId)) {
                return;
            }
            var notebook = Notebook.cache[notebookId];
            if (!notebook) {
                return;
            }
            // 是否已公开为blog
            /*
            if(!notebook.IsBlog) {
            	items.push("unset2Blog");
            } else {
            	items.push("set2Blog");
            }
            */
            // 是否还有笔记
            if (Note.notebookHasNotes(notebookId)) {
                this.del.enabled = false;
            } else {
                this.del.enabled = true;
            }
            if (isSearch) {
                this.addSub.enabled = false;
            } else {
                this.addSub.enabled = true;
            }
            this.menu.popup(gui.getCurrentWindow(), e.originalEvent.x, e.originalEvent.y);
        }
    }
    var newNotebookListMenuSys = new newNotebookListMenu();

    // 清空回收站
    function newClearTrashMenu() {

        var me = this;
        this.menu = new gui.Menu();
        this.clear = new gui.MenuItem({
            label: 'Clear trash',
            click: function(e) {
                Notebook.clearTrash();
            }
        });
        this.menu.append(this.clear);
        this.popup = function(e, target) {
            this.menu.popup(gui.getCurrentWindow(), e.originalEvent.x, e.originalEvent.y);
        }
    }
    var newClearTrashMenuSys = new newClearTrashMenu();

    // 添加笔记本
    $("#addNotebookPlus").click(function(e) {
        e.stopPropagation();
        Notebook.addNotebook();
    });

    // notebook setting
    $("#notebookList").on("click", ".notebook-setting", function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $p = $(this).parent();
        newNotebookListMenuSys.popup(e, $p);
    });
    $("#notebookList").on('contextmenu', 'li a', function(e) {
        newNotebookListMenuSys.popup(e, $(this));
    });

    $("#notebookListForSearch").on('contextmenu', 'li a', function(e) {
        newNotebookListMenuSys.popup(e, $(this), true);
    });
    $("#notebookListForSearch").on("click", ".notebook-setting", function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $p = $(this).parent();
        newNotebookListMenuSys.popup(e, $p, true);
    });
};
