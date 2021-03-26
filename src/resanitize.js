/*!
 * resanitize - Regular expression-based HTML sanitizer and ad remover, geared toward RSS feed descriptions
 * Copyright(c) 2012 Dan MacTough <danmactough@gmail.com>
 * All rights reserved.
 */

/**
 * Dependencies
 */
var validator = require('validator');
/**
 * Remove unsafe parts and ads from HTML
 *
 * Example:
 *
 *      var resanitize = require('resanitize');
 *      resanitize('<div style="border: 400px solid pink;">Headline</div>');
 *      // => '<div>Headline</div>'
 *
 * References:
 * - http://en.wikipedia.org/wiki/C0_and_C1_control_codes
 * - http://en.wikipedia.org/wiki/Unicode_control_characters
 * - http://www.utf8-chartable.de/unicode-utf8-table.pl
 *
 * @param {String|Buffer} HTML string to sanitize
 * @return {String} sanitized HTML
 * @api public
 */
function resanitize (str) {
  if ('string' !== typeof str) {
    if (Buffer.isBuffer(str)) {
      str = str.toString();
    }
    else {
      throw new TypeError('Invalid argument: must be String or Buffer');
    }
  }
  str = stripAsciiCtrlChars(str);
  str = stripExtendedCtrlChars(str);
  str = fixSpace(str);
  str = stripComments(str);
  str = stripAds(str); // It's important that this comes before the remainder
                       // because it matches on certain attribute values that
                       // get stripped below.
  str = validator.sanitize(str).xss().replace(/\[removed\]/g, '')
  str = fixImages(str);
  str = stripUnsafeTags(str);
  str = stripUnsafeAttrs(str);
  return str;
}
module.exports = resanitize;

/**
 * Replace UTF-8 non-breaking space with a regular space and strip null bytes
 */
function fixSpace (str) {
  return str.replace(/\u00A0/g, ' ') // Unicode non-breaking space
            .replace(/[\u2028\u2029]/g, '') // UCS newline characters
            .replace(/\0/g, '');
}
module.exports.fixSpace = fixSpace;

/**
 * Strip superfluous whitespace
 */
function stripHtmlExtraSpace (str) {
  return str.replace(/<(div|p)[^>]*?>\s*?(?:<br[^>]*?>)*?\s*?<\/\1>/gi, '')
            .replace(/<(div|span)[^>]*?>\s*?<\/\1>/gi, '');
}
module.exports.stripHtmlExtraSpace = stripHtmlExtraSpace;

/**
 * Strip ASCII control characters
 */
function stripAsciiCtrlChars (str) {
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/g, '');
}
module.exports.stripAsciiCtrlChars = stripAsciiCtrlChars;

/**
 * Strip ISO 6429 control characters
 */
function stripExtendedCtrlChars (str) {
  return str.replace(/[\u0080-\u009F]+/g, '');
}
module.exports.stripExtendedCtrlChars = stripExtendedCtrlChars;

/**
 * Strip HTML comments
 */
function stripComments (str) {
  return str.replace(/<!--[^>]*?-->/g, '');
}
module.exports.stripComments = stripComments;

/**
 * Permit only the provided attributes to remain in the tag
 */
function filterAttrs () {
  var allowed = [];

  if (Array.isArray(arguments[0])) {
    allowed = arguments[0];
  } else {
    allowed = Array.prototype.slice.call(arguments);
  }
  return function (attr, name) {
    if ( ~allowed.indexOf(name && name.toLowerCase()) ) {
      return attr;
    } else {
      return '';
    }
  };
}
module.exports.filterAttrs = filterAttrs;

/**
 * Strip the provided attributes from the tag
 */
function stripAttrs () {
  var banned = []
    , regexes = [];

  if (Array.isArray(arguments[0])) {
    banned = arguments[0].filter(function (attr) {
      if ('string' === typeof attr) {
        return true;
      }
      else if (attr.constructor && 'RegExp' === attr.constructor.name) {
        regexes.push(attr);
      }
    });
  } else {
    banned = Array.prototype.slice.call(arguments).filter(function (attr) {
      if ('string' === typeof attr) {
        return true;
      }
      else if (attr.constructor && 'RegExp' === attr.constructor.name) {
        regexes.push(attr);
      }
    });
  }
  return function (attr, name) {
    if ( ~banned.indexOf(name && name.toLowerCase()) || regexes.some(function (re) { return re.test(name); }) ) {
      return '';
    } else {
      return attr;
    }
  };
}
module.exports.stripAttrs = stripAttrs;

/**
 * Filter an HTML opening or self-closing tag
 */
function filterTag (nextFilter) {
  return function (rematch) {
    if ('function' === typeof nextFilter) {
      rematch = rematch.replace(/([^\s"']+?)=("|')[^>]+?\2/g, nextFilter);
    }
    // Cleanup extra whitespace
    return rematch.replace(/\s+/g, ' ')
                  .replace(/ (\/)?>/, '$1>');
  };
}
module.exports.filterTag = filterTag;

function fixImages (str) {
  return str.replace(/(<img[^>]*?>)/g, filterTag(filterAttrs('src', 'alt', 'title', 'height', 'width')) );
}
module.exports.fixImages = fixImages;

function stripUnsafeAttrs (str) {
  var unsafe = [ 'id'
               , 'class'
               , 'style'
               , 'accesskey'
               , 'action'
               , 'autocomplete'
               , 'autofocus'
               , 'clear'
               , 'contextmenu'
               , 'contenteditable'
               , 'draggable'
               , 'dropzone'
               , 'method'
               , 'tabindex'
               , 'target'
               , /on\w+/i
               , /data-\w+/i
               ];
  return str.replace(/<([^ >]+?) [^>]*?>/g, filterTag(stripAttrs(unsafe)));
}
module.exports.stripUnsafeAttrs = stripUnsafeAttrs;

function stripUnsafeTags (str) {
  var el = /<(?:form|input|font|blink|script|style|comment|plaintext|xmp|link|listing|meta|body|frame|frameset)\b/;
  var ct = 0, max = 2;

  // We'll repeatedly try to strip any maliciously nested elements up to [max] times
  while (el.test(str) && ct++ < max) {
    str = str.replace(/<form[^>]*?>[\s\S]*?<\/form>/gi, '')
             .replace(/<input[^>]*?>[\s\S]*?<\/input>/gi, '')
             .replace(/<\/?(?:form|input|font|blink)[^>]*?>/gi, '')
             // These are XSS/security risks
             .replace(/<script[^>]*?>[\s\S]*?<\/script>/gi, '')
             .replace(/<style[^>]*?>[\s\S]*?<\/style>/gi, '') // shouldn't work anyway...
             .replace(/<comment[^>]*?>[\s\S]*?<\/comment>/gi, '')
             .replace(/<plaintext[^>]*?>[\s\S]*?<\/plaintext>/gi, '')
             .replace(/<xmp[^>]*?>[\s\S]*?<\/xmp>/gi, '')
             .replace(/<\/?(?:link|listing|meta|body|frame|frameset)[^>]*?>/gi, '')
             // Delete iframes, except those inserted by Google in lieu of video embeds
             .replace(/<iframe(?![^>]*?src=("|')\S+?reader.googleusercontent.com\/reader\/embediframe.+?\1)[^>]*?>[\s\S]*?<\/iframe>/gi, '')
             ;
  }
  if (el.test(str)) {
    // We couldn't safely strip the HTML, so we return an empty string
    return '';
  }
  return str;
}
module.exports.stripUnsafeTags = stripUnsafeTags;

function stripAds (str) {
  return str.replace(/<div[^>]*?class=("|')snap_preview\1[^>]*?>(?:<br[^>]*?>)?([\s\S]*?)<\/div>/gi, '$2')
            .replace(/<div[^>]*?class=("|')(?:feedflare|zemanta-pixie)\1[^>]*?>[\s\S]*?<\/div>/gi, '')
            .replace(/<!--AD BEGIN-->[\s\S]*?<!--AD END-->\s*/gi, '')
            .replace(/<table[^>]*?>[\s\S]*?<\/table>\s*?<div[^>]*?>[\s\S]*?Ads by Pheedo[\s\S]*?<\/div>/gi, '')
            .replace(/<table[^>]*?>.*?<img[^>]*?src=("|')[^>]*?advertisement[^>]*?\1.*?>.*?<\/table>/gi, '')
            .replace(/<br[^>]*?>\s*?<br[^>]*?>\s*?<span[^>]*?class=("|')advertisement\1[^>]*?>[\s\S]*?<\/span>[\s\S]*<div[^>]*?>[\s\S]*?Ads by Pheedo[\s\S]*?<\/div>/gi, '')
            .replace(/<br[^>]*?>\s*?<br[^>]*?>\s*?(?:<[^>]+>\s*)*?<hr[^>]*?>\s*?<div[^>]*?>(?:Featured Advertiser|Presented By:)<\/div>[\s\S]*<div[^>]*?>[\s\S]*?(?:Ads by Pheedo|ads\.pheedo\.com)[\s\S]*?<\/div>/gi, '')
            .replace(/<br[^>]*?>\s*?<br[^>]*?>\s*?<a[^>]*?href=("|')http:\/\/[^>]*?\.?(?:pheedo|pheedcontent)\.com\/[^>]*?\1[\s\S]*?<\/a>[\s\S]*$/gim, '')
            .replace(/<div[^>]*?class=("|')cbw snap_nopreview\1[^>]*?>[\s\S]*$/gim, '')
            .replace(/<div><a href=(?:"|')http:\/\/d\.techcrunch\.com\/ck\.php[\s\S]*?<\/div> */gi, '')
            .replace(/<(p|div)[^>]*?>\s*?<a[^>]*?href=("|')[^>]+?\2[^>]*?><img[^>]*?src=("|')http:\/\/(?:feedads\.googleadservices|feedproxy\.google|feeds2?\.feedburner)\.com\/(?:~|%7e)[^>]*?\/[^>]+?\3[^>]*?>[\s\S]*?<\/\1>/gi, '')
            .replace(/<(p|div)[^>]*?>\s*?<a[^>]*?href=("|')[^>]+?\2[^>]*?><img[^>]*?src=("|')http:\/\/feeds\.[^>]+?\.[^>]+?\/(?:~|%7e)[^>]\/[^>]+?\3[^>]*?>[\s\S]*?<\/\1>/gi, '')
            .replace(/<a[^>]*?href=("|')http:\/\/feeds\.[^>]+?\.[^>]+?\/(?:~|%7e)[a-qs-z]\/[^>]+?\1[\s\S]*?<\/a>/gi, '')
            .replace(/<a[^>]*?href=("|')http:\/\/[^>]*?\.?addtoany\.com\/[^>]*?\1[\s\S]*?<\/a>/gi, '')
            .replace(/<a[^>]*?href=("|')http:\/\/feeds\.wordpress\.com\/[\.\d]+?\/(?:comments|go[\s\S]*)\/[^>]+?\1[\s\S]*?<\/a> ?/gi, '')
            .replace(/<a[^>]*?href=("|')http:\/\/[^>]*?\.?doubleclick\.net\/[^>]*?\1[\s\S]*?<\/a>/gi, '')
            .replace(/<a[^>]*?href=("|')http:\/\/[^>]*?\.?fmpub\.net\/adserver\/[^>]*?\1[\s\S]*?<\/a>/gi, '')
            .replace(/<a[^>]*?href=("|')http:\/\/[^>]*?\.?eyewonderlabs\.com\/[^>]*?\1[\s\S]*?<\/a>/gi, '')
            .replace(/<a[^>]*?href=("|')http:\/\/[^>]*?\.?pheedo\.com\/[^>]*?\1[\s\S]*?<\/a>/gi, '')
            .replace(/<a[^>]*?href=("|')http:\/\/api\.tweetmeme\.com\/share\?[^>]*?\1[\s\S]*?<\/a>/gi, '')
            .replace(/<p><a[^>]*?href=("|')http:\/\/rss\.cnn\.com\/+?(?:~|%7e)a\/[^>]*?\1[\s\S]*?<\/p>/gi, '')
            .replace(/<img[^>]*?src=("|')http:\/\/feeds\.[^>]+?\.[^>]+?\/(?:~|%7e)r\/[^>]+?\1[\s\S]*?>/gi, '')
            .replace(/<img[^>]*?src=("|')http:\/\/rss\.nytimes\.com\/c\/[^>]*?\1.*?>.*$/gim, '')
            .replace(/<img[^>]*?src=("|')http:\/\/feeds\.washingtonpost\.com\/c\/[^>]*?\1.*?>.*$/gim, '')
            .replace(/<img[^>]*?src=("|')http:\/\/[^>]*?\.?feedsportal\.com\/c\/[^>]*?\1.*?>.*$/gim, '')
            .replace(/<img[^>]*?src=("|')http:\/\/(?:feedads\.googleadservices|feedproxy\.google|feeds2\.feedburner)\.com\/(?:~|%7e)r\/[^>]+?\1[\s\S]*?>/gi, '')
            .replace(/<img[^>]*?src=("|')http:\/\/rss\.cnn\.com\/~r\/[^>]*?\1[\s\S]*?>/gi, '')
            .replace(/<img[^>]*?src=("|')http:\/\/[^>]*?\.?fmpub\.net\/adserver\/[^>]*?\1[\s\S]*?>/gi, '')
            .replace(/<img[^>]*?src=("|')http:\/\/[^>]*?\.?pheedo\.com\/[^>]*?\1[\s\S]*?>/gi, '')
            .replace(/<img[^>]*?src=("|')http:\/\/stats\.wordpress\.com\/[\w]\.gif\?[^>]*?\1[\s\S]*?>/gi, '')
            .replace(/<img[^>]*?src=("|')http:\/\/feeds\.wired\.com\/c\/[^>]*?\1.*?>.*$/gim, '')
            .replace(/<p><strong><em>Crunch Network[\s\S]*?<\/p>/gi, '')
            .replace(/<embed[^>]*?castfire_player[\s\S]*?> *?(<\/embed>)?/gi, '')
            .replace(/<embed[^>]*?src=("|')[^>]*?castfire\.com[^>]+?\1[\s\S]*?> *?(<\/embed>)?/gi, '')
            .replace(/<p align=("|')right\1><em>Sponsor<\/em>[\s\S]*?<\/p>/gi, '')
            .replace(/<div [\s\S]*?<img [^>]*?src=(?:"|')[^>]*?\/share-buttons\/[\s\S]*?<\/div>[\s]*/gi, '')
            // This is that annoying footer in every delicious item
            .replace(/<span[^>]*?>\s*?<a[^>]*?href=("|')[^\1]+?src=feed_newsgator\1[^>]*?>[\s\S]*<\/span>/gi, '')
            // This is the annoying footer from ATL
            .replace(/<p[^>]*?><strong><a[^>]*?href=("|')[^>]*?abovethelaw\.com\/[\s\S]+?\1[^>]*?>Continue reading[\s\S]*<\/p>/gi, '')
            // This is the annoying link at the end of WaPo articles
            .replace(/<a[^>]*?>Read full article[\s\S]*?<\/a>/gi, '')
            // These ads go...
            .replace(/<div[^>]*?><a[^>]*?href=("|')[^>]*?crunchbase\.com\/company\/[\s\S]+?\1[^>]*?>[\s\S]*?<div[\s\S]*?>Loading information about[\s\S]*?<\/div>/gi, '')
            .replace(/<div[^>]*?class=("|')cb_widget_[^>]+?\1[\s\S]*?><\/div>/gi, '')
            .replace(/<div[^>]*?class=("|')cb_widget_[^>]+?\1[\s\S]*?>[\s\S]*?<\/div>/gi, '')
            // Before these
            .replace(/<a[^>]*?href=("|')[^>]*?crunchbase\.com\/\1[\s\S]*?<\/a>\s*/gi, '')
            .replace(/<div[^>]*?class=("|')cb_widget\1[^>]*?>[\s\S]*?<\/div>/gi, '')
            // Clean up some empty things
            //.replace(/<(div|p|span)[^>]*?>(\s|<br *?\/?>|(?R))*?<\/\1>/gi, '')
            .replace(/(\s|<br[^>]*?\/?>)*$/gim, '')
            ;
}
module.exports.stripAds = stripAds;

/**
 * Dumbly strip angle brackets
 */
function stripHtml (str) {
  return str.replace(/<.*?>/g, '');
}
module.exports.stripHtml = stripHtml;
