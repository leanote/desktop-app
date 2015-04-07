'use strict';

// Explained here: https://groups.google.com/d/msg/nodejs/AjkHSYmiGYs/1LfNHbMhd48J

var fs = require('fs')
  , path = require('path')
  , request = require('request')
  , CERTDB_URL = 'https://mxr.mozilla.org/nss/source/lib/ckfw/builtins/certdata.txt?raw=1'
  , HEADER
  , outputFile
  , outputPemsDir
  , Promise = require('es6-promise').Promise
  ;

HEADER =
  "/**\n" +
  " * Mozilla's root CA store\n" +
  " *\n" +
  " * generated from " + CERTDB_URL + "\n" +
  " */\n\n";

function Certificate() {
  this.name = null;
  this.body = '';
  this.trusted = true;
}

Certificate.prototype.quasiPEM = function quasiPEM() {
  var bytes = this.body.split('\\')
    , offset = 0
    , converted
    ;

  bytes.shift();
  converted = new Buffer(bytes.length);
  while(bytes.length > 0) {
    converted.writeUInt8(parseInt(bytes.shift(), 8), offset++);
  }

  return {
    name: this.name
  , value: '  // ' + this.name + '\n'
      + '  "-----BEGIN CERTIFICATE-----\\n" +\n'
      + converted.toString('base64').replace(/(.{1,76})/g, '  "$1\\n" +\n')
      + '  "-----END CERTIFICATE-----\\n"'
  };
};

function parseBody(current, lines) {
  var line
    ;

  while (lines.length > 0) {
    line = lines.shift();
    if (line.match(/^END/)) { break; }
    current.body += line;
  }

  while (lines.length > 0) {
    line = lines.shift();
    if (line.match(/^CKA_CLASS CK_OBJECT_CLASS CKO_NSS_TRUST/)) { break; }
  }

  while (lines.length > 0) {
    line = lines.shift();
    if (line.match(/^#|^\s*$/)) { break; }
    if (line.match(/^CKA_TRUST_SERVER_AUTH\s+CK_TRUST\s+CKT_NSS_NOT_TRUSTED$/) ||
        line.match(/^CKA_TRUST_SERVER_AUTH\s+CK_TRUST\s+CKT_NSS_TRUST_UNKNOWN$/)) {
      current.trusted = false;
    }
  }

  if (current.trusted) return current;
}

function parseCertData(lines) {
  var certs = []
    , current
    , skipped = 0
    , match
    , finished
    ;

  function parseLine(line) {
    //
    // Find & nuke whitespace and comments
    //
    if (line.match(/^#|^\s*$/)) {
      return;
    }

    //
    // Find CERT
    //
    if (line.match(/^CKA_CLASS CK_OBJECT_CLASS CKO_CERTIFICATE/)) {
      current = new Certificate();
      return;
    }

    if (!current) {
      return;
    }

    //
    // Find Name
    //
    match = line.match(/^CKA_LABEL UTF8 \"(.*)\"/);
    if (match) {
      current.name = decodeURIComponent(match[1]);
      return;
    }

    //
    // Find Body
    //
    if (line.match(/^CKA_VALUE MULTILINE_OCTAL/)) {
      finished = parseBody(current, lines);
      if (finished) {
        certs.push(finished);
      } else {
        skipped += 1;
      }
      current = null;
      return;
    }
  }

  while (lines.length > 0) {
    parseLine(lines.shift());
  }

  console.info("Skipped %s untrusted certificates.", skipped);
  console.info("Processed %s certificates.", certs.length);

  return certs;
}

function dumpCerts(certs, filename, pemsDir) {
  certs.forEach(function (cert) {
    var pem = cert.quasiPEM()
      , pemName = pem.name.toLowerCase().replace(/[\\\s\/\(\)\.]+/g, '-').replace(/-+/g, '-')
      , pemsFile = path.join(pemsDir, pemName + '.pem')
      ;

    /*
    if (/[^\w\-]/.test(pemName)) {
      //pemName = pemName.replace(/\\/g, '-');
      //pemName = pemName.replace(/[^\w-]/g, '-');
      console.log(pemName);
    }
    */
    fs.writeFileSync(pemsFile, pem.value);
  });

  console.info("Wrote " + certs.length + " certificates in '"
    + path.join(__dirname, 'pems/').replace(/'/g, "\\'") + "'.");

  fs.writeFileSync(
    filename
  , HEADER
      + 'var cas = module.exports = [\n'
      + certs.map(function (cert) { return cert.quasiPEM().value; }).join(',\n\n')
      + '\n];\n'
      + "module.exports.rootCas = cas;\n"
      + "module.exports.inject = function () {\n"
      + "  var opts = require('https').globalAgent.options;\n"
      + "  if (!opts.ca || !opts.ca.__injected) { opts.ca = (opts.ca||[]).concat(cas); }\n"
      + "  opts.ca.__injected = true;\n"
      + "  return module.exports;\n"
      + "};\n"
      + "module.exports.addFile = function (filepath) {\n"
      + "  var opts = require('https').globalAgent.options;\n"
      + "  var root = filepath[0] === '/' ? '/' : '';\n"
      + "  var filepaths = filepath.split(/\\//g);\n"
      + "  if (root) { filepaths.unshift(root); }\n"
      + "  opts.ca = opts.ca || [];\n"
      + "  opts.ca.push(require('fs').readFileSync(require('path').join.apply(null, filepaths)));\n"
      + "  return module.exports;\n"
      + "};\n"
  );
  console.info("Wrote '" + filename.replace(/'/g, "\\'") + "'.");
}

function run(filename) {
  return new Promise(function (resolve, reject) {
    if (!filename) {
      console.error("Error: No file specified");
      console.info("Usage: %s <outputfile>", process.argv[1]);
      console.info("   where <outputfile> is the name of the file to write to, relative to %s", process.argv[1]);
      console.info("Note that a 'pems/' directory will also be created at the same location as the <outputfile>, containing individual .pem files.");
      reject(3);
      return;
    }

    // main (combined) output file location, relative to this script's location
    outputFile = path.resolve(__dirname, filename);

    // pems/ output directory, in the same directory as the outputFile
    outputPemsDir = path.resolve(outputFile, '../pems');

    if (!fs.existsSync(outputPemsDir)) {
      fs.mkdirSync(outputPemsDir);
    } 

    console.info("Loading latest certificates from " + CERTDB_URL);
    request.get(CERTDB_URL, function (error, response, body) {
      if (error) {
        console.error(error);
        console.error(error.stacktrace);
        reject({ code: 1, error: error });
        return;
      }

      if (response.statusCode !== 200) {
        console.error("Fetching failed with status code %s", response.statusCode);
        reject({ code: 2, error: "Fetching failed with status code " + response.statusCode });
        return;
      }

      var lines = body.split("\n")
        , certs = parseCertData(lines)
        , pemsFile = path.join(outputPemsDir, 'mozilla-certdata.txt')
        ;

      fs.writeFileSync(pemsFile, body);
      dumpCerts(certs, outputFile, outputPemsDir);

      resolve();
    });
  });
}

module.exports.generate = run;

if (require.main === module) {
  run(process.argv[2])
    .then
      (function () {
        // something
      }
    , function (errcode) {
        process.exit(errcode);
      }
    );
}
