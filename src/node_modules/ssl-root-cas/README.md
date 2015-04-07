SSL Root CAs
=================

The module you need to solve node's SSL woes when including a custom certificate.

Let's say you're trying to connect to a site with a cheap-o SSL cert -
such as RapidSSL certificate from [name.com](http://name.com) (the **best** place to get your domains, btw) -
you'll probably get an error like `UNABLE_TO_VERIFY_LEAF_SIGNATURE` and after you google around and figure that
out you'll be able to connect to that site just fine, but now when you try to connect to other sites you get
`CERT_UNTRUSTED` or possibly other errors.

This module is the solution to your woes!

FYI, I'm merely the publisher, not the author of this module.
See here: https://groups.google.com/d/msg/nodejs/AjkHSYmiGYs/1LfNHbMhd48J

The script downloads the same root CAs that are included with
[Mozilla Firefox](http://www.mozilla.org/en-US/about/governance/policies/security-group/certs/included/),
[Google Chrome](http://www.chromium.org/Home/chromium-security/root-ca-policy),
[`libnss`](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/NSS#CA_certificates_pre-loaded_into_NSS),
and [OpenSSL](https://www.openssl.org/support/faq.html#USER16)\*:
<https://mxr.mozilla.org/nss/source/lib/ckfw/builtins/certdata.txt?raw=1>

\* OpenSSL doesn't actually bundle these CAs, but they suggest using them

**Other Implementations**

  * Golang <https://github.com/agl/extract-nss-root-certs>
  * Perl <https://github.com/bagder/curl/blob/master/lib/mk-ca-bundle.pl>

**Usage Examples**

  * https://github.com/coolaj86/nodejs-self-signed-certificate-example
  * https://github.com/coolaj86/nodejs-ssl-trusted-peer-example

Install
=====

```javascript
npm i ssl-root-cas --save
```

Usage
=====

```javascript
'use strict';
 
// This will add the well-known CAs
// to `https.globalAgent.options.ca`
require('ssl-root-cas/latest')
  .inject()
  .addFile(__dirname + '/ssl/01-cheap-ssl-intermediary-a.pem')
  .addFile(__dirname + '/ssl/02-cheap-ssl-intermediary-b.pem')
  .addFile(__dirname + '/ssl/03-cheap-ssl-site.pem')
  ;
```

For the sake of version consistency this package ships with the CA certs that were
available at the time it was published,
but for the sake of security I recommend you use the latest ones.

If you want the latest certificates (downloaded as part of the postinstall process), 
you can require those like so:

```
require('ssl-root-cas/latest').inject();
```

You can use the ones that shippped with package like so:

```
require('ssl-root-cas').inject();
```

API
---

### inject()

I thought it might be rude to modify `https.globalAgent.options.ca` on `require`,
so I afford you the opportunity to `inject()` the certs at your leisure.

`inject()` keeps track of whether or not it's been run, so no worries about calling it twice.

### addFile(filepath)

This is just a convenience method so that you don't
have to require `fs` and `path` if you don't need them.

```javascript
require('ssl-root-cas/latest')
  .addFile(__dirname + '/ssl/03-cheap-ssl-site.pem')
  ;
```

is the same as

```javascript
var https = require('https')
  , cas
  ;
 
cas = https.globalAgent.options.ca || [];
cas.push(fs.readFileSync(path.join(__dirname, 'ssl', '03-cheap-ssl-site.pem')));
```

### rootCas

If for some reason you just want to look at the array of Root CAs without actually injecting
them, or you just prefer to
`https.globalAgent.options.ca = require('ssl-root-cas').rootCas;`
yourself, well, you can.

BAD IDEAS
===

Don't use dissolutions such as these. :-)

This will turn off SSL validation checking. This is not a good idea. Please do not do it.
(really I'm only providing it as a reference for search engine seo so that people who are trying
to figure out how to avoid doing that will end up here)

```javascript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
```

The same dissolution from the terminal would be

```bash
export NODE_TLS_REJECT_UNAUTHORIZED="0"
node my-service.js
```

# Index

Other information you might want to know while you're here.

## Generating an SSL Cert

Just in case you didn't know, here's how you do it:

```
openssl req -new -newkey rsa:2048 -nodes -keyout server.key -out server.csr
```

**DO NOT FILL OUT** email address, challenge password, or optional company name

However, you *should* fill out country name, FULL state name, locality name, organization name.

*organizational unit* is optional.

```
cat server.csr
```

That creates a sha-1 hash.

When you submit that to the likes of RapidSSL you'll get back an X.509 that you should call `server.crt` (at least for the purposes of this mini-tutorial).

You cannot use "bundled" certificates (`.pem`) with node.js.

### A single HTTPS server

Here's a complete working example:

```javascript
'use strict';

var https = require('https')
  , fs = require('fs')
  , connect = require('connect')
  , app = connect()
  , sslOptions
  , server
  , port = 4080
  ;

require('ssl-root-cas/latest')
  .inject()
  .addFile(__dirname + '/ssl/Geotrust Cross Root CA.txt')
  .addFile(__dirname + '/ssl/Rapid SSL CA.txt')
  ;

sslOptions = {
  key: fs.readFileSync('./ssl/server.key')
, cert: fs.readFileSync('./ssl/server.crt')
};

app.use('/', function (req, res) {
  res.end('<html><body><h1>Hello World</h1></body></html>');
});

server = https.createServer(sslOptions, app).listen(port, function(){
  console.log('Listening on https://' + server.address().address + ':' + server.address().port);
});
```

### Multiple HTTPS servers using SNI

I know this works - because I just bought two SSL certs from RapidSSL (through name.com),
a Digital Ocean VPS,
and played around for an hour until it did.

:-)

File hierarchy:

```
webapps/
└── vhosts
    ├── aj.the.dj
    │   └── ssl
    │       ├── server.crt
    │       └── server.key
    ├── ballprovo.com
    │   └── ssl
    │       ├── server.crt
    │       └── server.key
    ├── server.js
    └── ssl
        ├── Geotrust Cross Root CA.txt
        └── Rapid SSL CA.txt
```


#### `server.js`

```javascript
'use strict';

var https = require('https')
  , http = require('http')
  , fs = require('fs')
  , crypto = require('crypto')
  , connect = require('connect')
  , vhost = require('vhost')

  // connect / express app
  , app = connect()

  // SSL Server
  , secureContexts = {}
  , secureOpts
  , secureServer
  , securePort = 4443

  // force SSL upgrade server
  , server
  , port = 4080

  // the ssl domains I have
  , domains = ['aj.the.dj', 'ballprovo.com']
  ;

require('ssl-root-cas/latest')
  .inject()
  .addFile(__dirname + '/ssl/Geotrust Cross Root CA.txt')
  .addFile(__dirname + '/ssl/Rapid SSL CA.txt')
  ;

function getAppContext(domain) {
  // Really you'd want to do this:
  // return require(__dirname + '/' + domain + '/app.js');

  // But for this demo we'll do this:
  return connect().use('/', function (req, res) {
    console.log('req.vhost', JSON.stringify(req.vhost));
    res.end('<html><body><h1>Welcome to ' + domain + '!</h1></body></html>');
  });
}

domains.forEach(function (domain) {
  secureContexts[domain] = crypto.createCredentials({
    key:  fs.readFileSync(__dirname + '/' + domain + '/ssl/server.key')
  , cert: fs.readFileSync(__dirname + '/' + domain + '/ssl/server.crt')
  }).context;

  app.use(vhost('*.' + domain, getAppContext(domain)));
  app.use(vhost(domain, getAppContext(domain)));
});

// fallback / default domain
app.use('/', function (req, res) {
  res.end('<html><body><h1>Hello World</h1></body></html>');
});

//provide a SNICallback when you create the options for the https server
secureOpts = {
  //SNICallback is passed the domain name, see NodeJS docs on TLS
  SNICallback: function (domain) {
    console.log('SNI:', domain);
    return secureContexts[domain];
  }
  // fallback / default domain
  , key:  fs.readFileSync(__dirname + '/aj.the.dj/ssl/server.key')
  , cert: fs.readFileSync(__dirname + '/aj.the.dj/ssl/server.crt')
};

secureServer = https.createServer(secureOpts, app).listen(securePort, function(){
  console.log("Listening on https://localhost:" + secureServer.address().port);
});

server = http.createServer(function (req, res) {
  res.setHeader(
    'Location'
  , 'https://' + req.headers.host.replace(/:\d+/, ':' + securePort)
  );
  res.statusCode = 302;
  res.end();
}).listen(port, function(){
  console.log("Listening on http://localhost:" + server.address().port);
});
```

Other SSL Resources
=========

Zero-Config clone 'n' run (tm) Repos:


* [io.js / node.js HTTPS SSL Example](https://github.com/coolaj86/nodejs-ssl-example)
* [io.js / node.js HTTPS SSL Self-Signed Certificate Example](https://github.com/coolaj86/nodejs-self-signed-certificate-example)
* [io.js / node.js HTTPS SSL Trusted Peer Client Certificate Example](https://github.com/coolaj86/nodejs-ssl-trusted-peer-example)
* [SSL Root CAs](https://github.com/coolaj86/node-ssl-root-cas)

Articles

* [http://greengeckodesign.com/blog/2013/06/15/creating-an-ssl-certificate-for-node-dot-js/](Creating an SSL Certificate for node.js)
* [http://www.hacksparrow.com/express-js-https-server-client-example.html/comment-page-1](HTTPS Trusted Peer Example)
* [How to Create a CSR for HTTPS SSL (demo with name.com, node.js)](http://blog.coolaj86.com/articles/how-to-create-a-csr-for-https-tls-ssl-rsa-pems/)
* [coolaj86/Painless-Self-Signed-Certificates-in-node](https://github.com/coolaj86/node-ssl-root-cas/wiki/Painless-Self-Signed-Certificates-in-node.js)
