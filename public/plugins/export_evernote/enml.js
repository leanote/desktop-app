/**
 * 将html -> enml支持的html
 * evernote有些html不支持, 将不能导入
 * 该方法只是过滤一些html不支持的属性, 或清空一些标签
 * 使得能尽量(不能保证100%)导入evernote, 即使能导入成功但有可能不能同步!! 因为没有完全验证html
 */

var resanitize = require('resanitize');

// Portable override before pull request merge into it
resanitize.stripUnsafeAttrs = function(str, unsafeAttrs) {
    var unsafeAttrsDefault = ['id', 'data', 'class', 'style', 'clear', 'target', 'onclick', 'ondblclick', 'onmousedown', 'onmousemove', 'onmouseover', 'onmouseout', 'onmouseup', 'onkeydown', 'onkeypress', 'onkeyup', 'onabort', 'onerror', 'onload', 'onresize', 'onscroll', 'onunload', 'onblur', 'onchange', 'onfocus', 'onreset', 'onselect', 'onsubmit'];
    unsafeAttrs = unsafeAttrs || unsafeAttrsDefault;
    // unsafeAttrs.push(/data\-[a-zA-Z0-9\-]+=".*?"/);
    unsafeAttrs.push(/data-\w+/i)
    // console.log(unsafeAttrs);
    // data-id=""
    // str = str.replace(/data\-[a-zA-Z0-9\-]+=".*?"/g, '');
    return str.replace(/<([^ >]+?) [^>]*?>/g, resanitize.filterTag(resanitize.stripAttrs(unsafeAttrs)));
};

var addHostUrlToHref = function(str, host) {
    //only replace those start immediately with /
    return str.replace(/<a([^>]*?)href=(?:"|')\/([^"']*)(?:"|')([^>]*)>/gi, '<a$1href=\'' + host + '/$2\'$3>');
    // [^>]*?\1.*?>
};

var ENMLOfHTML = function(text, options, cb) {
    if (!cb) {
        cb = options;
    }
    options = options || {};

    if (options.css) {
        var regex = /(<link [^>]*>)/g;
        //TODO ensure it is gist tag?
        //asssume static tag
        //style after body tag as original link tag also after body tag
        text = text.replace(regex, '<style>' + options.css + '</style>');
    }

    // var styliner = new Styliner('/', {});
    // console.log(text);
    // console.log(styliner);
    // try {
    // styliner.processHTML(text)
    //   .then(function(text) {
    //Directly grep body and put into handlebars will be more efficient? need test
    // console.log('[source]\n' + source);
    //slow impl TODO find a better html parser

    // resanitize
    var enmlUnsafeAttrs = ['rel', 'id', 'class', 'clear', 'target', 'onclick', 'ondblclick', 'onmousedown', 'onmousemove', 'onmouseover', 'onmouseout', 'onmouseup', 'onkeydown', 'onkeypress', 'onkeyup', 'onabort', 'onerror', 'onload', 'onresize', 'onscroll', 'onunload', 'onblur', 'onchange', 'onfocus', 'onreset', 'onselect', 'onsubmit'];

    text = resanitize.stripUnsafeTags(text);
    text = resanitize.stripUnsafeAttrs(text, enmlUnsafeAttrs);

    // //TODO use chain .replace
    text = text.replace(/<\/*html>/g, '').replace(/<\/?head>/g, '').replace(/<(\/?)body[^>]*>/g, '<$1div>')
    //convert body to div & keep the styles
    .replace(/<\/?meta[^>]*>/g, '');

    text = text.replace(/<\/?style[^<]*<\/style>/g, '');

    //default host
    //replace with defaultDomain
    if (options.defaultDomain) {
        text = exports.addHostUrlToHref(text, options.defaultDomain);
    }

    cb(null, text);
    //   }).then(function() {
    //     console.log('??????????--------??????????')
    //   });
    // } catch(e) {
    //   console.error(e);
    // }
};

module.exports.ENMLOfHTML = ENMLOfHTML;