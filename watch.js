#!/usr/bin/env node

/* Rebuild dependencies on changed files.
 * I could not get this to work with python watchdog, so I used node.
 * Adding new compiler types should be trivial.
 * Currently has the following npm dependencies:
 * - log4js
 * - typescript
 * - less
 * - watchr
 */

var exec = require('child_process').exec;
var path = require('path');

var log4js = require('log4js'), log = log4js.getLogger();
var watchr = require('watchr');

// For automatic building appropriate output files.
var extMap = {
    '.ts': '.js',
    '.less': '.css',
};

String.prototype.endsWith = function(suffix) {
  return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

function build(cmd, src, out) {
  log.debug(cmd);
  exec(cmd, function(e, stdout, stderr) {
    if (stdout.length) log.info(stdout);
    if (stderr.length) log.error(stderr);
    if (!e) {
      log.info('Successfully rebuilt: "' + src + '" to "' + out + '".');
    }
  });
}

process.argv.slice(2).forEach(function(src) {
  var dst = null, pieces = src.split(':');
  if (pieces.length > 1) {
    src = pieces[0];
    dst = pieces[1];
  }
  log.info('Watching source path %s.', src)
  watchr.watch({
    persistent: true,
    path: src,
    listener: function(name, fpath, stat, pstat) {
      var dir = path.dirname(fpath), ext = path.extname(fpath),
          fname = path.basename(fpath, ext);
      var out = dst || path.join(dir, fname + (extMap[ext] || '.null'));
      if (fpath.endsWith('.ts')) {
        build('tsc --sourcemap --target ES5 ' + src + ' --out ' + out, src, out);
      } else if (fpath.endsWith('.less')) {
        build('lessc ' + src + ' > ' + out, src, out);
      }
    },
  });
});
