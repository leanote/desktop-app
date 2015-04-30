
module.exports = exports = build

exports.usage = 'Attempts to compile the module by dispatching to node-gyp or nw-gyp'

var fs = require('fs')
  , compile = require('./util/compile.js')
  , versioning = require('./util/versioning.js')
  , path = require('path')
  , fs = require('fs')
  , mkdirp = require('mkdirp')

function build(gyp, argv, callback) {
    var gyp_args = [];
    if (argv.length && argv[0] == 'rebuild') {
        gyp_args.push('rebuild');
    } else {
        gyp_args.push('configure');
        gyp_args.push('build');
    }
    var package_json = JSON.parse(fs.readFileSync('./package.json'));
    var opts = versioning.evaluate(package_json, gyp.opts);
    // options look different depending on whether node-pre-gyp is called directly
    // or whether it is called from npm install, hence the following line.
    // TODO: check if this is really necessary with latest npm/nopt versions
    var original_args = (typeof(gyp.opts.argv.original) === 'string') ? JSON.parse(gyp.opts.argv).original : gyp.opts.argv.original || [];
    // add command line options to existing opts
    original_args.forEach(function(opt) {
        // we ignore any args like 'install' since we know
        // we are either running 'build' or 'rebuild' but we
        // do want to pass along to node-gyp/nw-gyp any command
        // line options like --option or --option=value passed in
        if (opt.length > 2 && opt.slice(0,2) == '--') {
            var parts = opt.split('=');
            if (parts.length > 1) {
                var key = parts[0];
                opts[key.slice(2)] = parts[1];
            }
        }
    });
    var known_gyp_args = ['dist-url','python','nodedir','msvs_version'];
    // in addition, pass along known node-gyp options
    known_gyp_args.forEach(function(arg) {
        var val = gyp.opts[arg] || gyp.opts[arg.replace('-','_')];
        if (val) {
            opts[arg] = val;
        }
    });

    var command_line_args = [];
    // turn back into command line options
    Object.keys(opts).forEach(function(o) {
        var val = opts[o];
        if (val) {
            command_line_args.push('--' + o + '=' + val);
        }
    })
    compile.run_gyp(gyp_args.concat(command_line_args),opts,function(err,gopts) {
        return callback(err);
    });
}
