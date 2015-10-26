#  Resanitize - Regular expression-based HTML sanitizer and ad remover, geared toward RSS feed descriptions

This node.js module provides functions for removing unsafe parts and ads from
HTML. I am using it for the &lt;description&gt; element of RSS feeds.

## Installation

npm install resanitize

## Usage

```javascript

    var resanitize = require('resanitize')
      , html = '<div style="border: 400px solid pink;">Headline</div>'
      ;

    resanitize(html); // => '<div>Headline</div>'
```

## Notes

This module's opinion of "sanitized" might not meet your security requirements.
The mere fact that it uses regular expressions should make this disclaimer
unnecessary, but just to be clear: if you intend to display arbitrary user input
that includes HTML, you're going to want something more robust.

As of v0.3.0, we've added [node-validator's](//github.com/chriso/node-validator) XSS
filter. It's certainly an improvement, but still -- be careful. Any concerns
about XSS attacks should be directered to [node-validator's issue tracker](//github.com/chriso/node-validator/issues).

Note that the `stripUnsafeTags` method will loop over the strip an arbitrary
number of times (2) to try to strip maliciously nested html tags. After the
maximum number of iterations is reached, if the string still appears to contain
any unsafe tags, it is deemed unsafe and set to an empty string. If this seems
unexpected and/or is causing any problems, please raise an [issue](//github.com/danmactough/node-resanitize/issues).