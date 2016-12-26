// 本地api集成
function isURL(str_url) {
    var re = new RegExp("^((https|http|ftp|rtsp|mms|emailto)://).+");
    return re.test(str_url);
}

// 浏览器打开
function openExternal(url) {
    gui.Shell.openExternal(url);
}

function isMac() {
	return process.platform === 'darwin';
}

// 窗口大小设置
// var win = gui.Window.get();

var downloadImgPath;
$(function() {

	var isMacP = isMac();
    
    // mac上才会自己控制
	$('.tool-close, .tool-close-blur').click(function() {
        onClose(function() {
            gui.win.hide();
        });
	});

	$('.tool-min, .tool-min-blur').click(function() {
		gui.win.minimize();
	});
    // 不灵敏
	$('.tool-max, .tool-max-blur').click(function() {
        if(gui.win.isMaximized()) { 
            gui.win.unmaximize();
        }
        else {
            gui.win.maximize();
        }
	});

    // Tray
    /*

    var electron = nodeRequire('electron');
    var Menu = electron.remote.Menu;
    var Tray = electron.remote.Tray;
    var appIcon = new Tray(projectPath + '/public/images/logo/tray.png')
    var contextMenu = Menu.buildFromTemplate([
        {
            label: '打开', click: function () {
                alert(3);
            }
        },
        {
            label: '关闭', click: function () {
                alert(3);
            }
        },
    ]);
    appIcon.setToolTip('This is my application.')
    appIcon.setContextMenu(contextMenu)
    */

});

// bind close event
// 保存当前打开的笔记

// 菜单
// 更多menu用法: http://www.cnblogs.com/xuanhun/p/3669216.html
function Menu() {
    this.menu = new gui.Menu();
    this.cut = new gui.MenuItem({
        label: getMsg('Cut'),
        click: function() {
            // tinymce中没用, 会有recusive execCommand
            if($curTarget.closest('#editorContent').length == 0) {
                document.execCommand('cut');
            } else {
                /*
                // 不知道什么原因, 可能是Chrome的原因
                We don't execute document.execCommand() this time, because it is called recursively.
                console.log('tinymce中没用');
                setTimeout(function() {
                    tinymce.activeEditor
                    document.execCommand('Cut');
                    tinymce.activeEditor.execCommand('cut');
                }, 10);
                */
            }
        }
    });
    this.copy = new gui.MenuItem({
        label: getMsg('Copy'),
        click: function() {
            document.execCommand('copy');
        }
    });
    this.paste = new gui.MenuItem({
        label: getMsg('Paste'),
        click: function() {
            // document.execCommand("selectAll");
            document.execCommand('paste');
        }
    });

    this.saveAs = new gui.MenuItem({
        label: getMsg('Save as'),
        click: function() {
            // document.execCommand("selectAll");
            // document.execCommand('paste');
            var src = $curTarget.attr('src');
            if(!src) {
            	alert(getMsg('Error'));
            	return;
            }
            // 得到图片, 打开dialog
            FileService.downloadImg(src, function(curPath) {
            	if(curPath) {
            		var paths = curPath.split(/\/|\\/);
            		var name = paths[paths.length-1] || "Untitled.png";
            		downloadImgPath = curPath;

            		// title不能设置
            		gui.dialog.showSaveDialog(gui.getCurrentWindow(), {title: name, defaultPath: gui.app.getPath('userDesktop') + '/' + name}, function(targetPath) {
            			if(targetPath) {

            				FileService.download(curPath, targetPath, function(ok, msg) {
								if(ok) {
                                    Notify.show({title: 'Info', body: 'Image saved successful!'});
								} else {
                                    Notify.show({type: 'warning', title: 'Warning', body: 'Image saved failed!'});
								}
							});
            			}
            			else {
            			}
            		});
            		
            	} else {
                    Notify.show({type: 'warning', title: 'Warning', body: 'File not exists!'});
            	}
            });
        }
    });

    this.openInBrowser = new gui.MenuItem({
        label: getMsg('Open link in browser'),
        click: function() {
            // document.execCommand("selectAll");
            // document.execCommand('paste');
            // https://github.com/nwjs/nw.js/wiki/Shell
            openExternal(winHref);
        }
    });
    this.menu.append(this.cut);
    this.menu.append(this.copy);
    this.menu.append(this.paste);
    this.menu.append(gui.getSeparatorMenu());
    this.menu.append(this.saveAs);
    this.menu.append(gui.getSeparatorMenu());
    this.menu.append(this.openInBrowser);
}
Menu.prototype.canCopy = function(bool) {
    this.copy.enabled = !!bool;
};
Menu.prototype.canCut = function(bool) {
    this.cut.enabled = !!bool;
};
Menu.prototype.canPaste = function(bool) {
    this.paste.enabled = !!bool;
};
Menu.prototype.canSaveAs = function(bool) {
    // Electron只接受bool
    this.saveAs.enabled = !!bool;
};
Menu.prototype.canOpenInBroswer = function(bool) {
    this.openInBrowser.enabled = !!bool;
};
Menu.prototype.popup = function(x, y) {
    this.menu.popup(gui.getCurrentWindow(), x, y);
};
var menu = new Menu();

// 右键菜单
var winHref = '';
var $curTarget;
var openContextmenu = function (e, canCut2, canPaste2) {
    e.preventDefault();
    var $target = $(e.target);
    $curTarget = $target;
    var text = $target.text();
    winHref = $target.attr('href');
    if(!winHref) {
        winHref = text;
    }
    // 判断是否满足http://leanote.com
    if(winHref) {
        if (winHref.indexOf('http://127.0.0.1') < 0 && isURL(winHref)) {
        } else {
            winHref = false;
        }
    }

    menu.canOpenInBroswer(!!winHref);
    menu.canSaveAs($target.is('img') && $target.attr('src'));
    var selectionType = window.getSelection().type.toUpperCase();
    // var clipData = gui.Clipboard.get().get();
    // menu.canPaste(clipData.length > 0);

    var canPaste = true;
    var canCut = true;

    // 如果
    if($target.closest('#editor').length > 0 || $target.closest('#mdEditor').length > 0) {
        if(Note.readOnly) {
            canPaste = false;
            canCut = false;
        }
    }

    menu.canCopy(selectionType === 'RANGE');

    menu.canPaste(canPaste);
    menu.canCut(canCut);

    if (typeof canCut2 !== 'undefined') {
        menu.canCut(!!canCut2);
    }
    if (typeof canPaste2 !== 'undefined') {
        menu.canPaste(!!canPaste2);
    }

    menu.popup(e.originalEvent.x, e.originalEvent.y);
};

$('#noteTitle, #searchNoteInput, #searchNotebookForList, #addTagInput, #left-column, #preview-contents, #editorContent, #presentation').on('contextmenu', openContextmenu);
$('body').on('contextmenu', '.history-content', function (e) {
    openContextmenu(e, false, false);
});
