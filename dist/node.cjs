// Optional Node host adapter. Import this explicitly, never from the pure core.
var fs, path;

fs = require('node:fs');

path = require('node:path');

exports.create = function(scanners) {
  return require('./manifest.cjs').create(scanners, {
    readPackage: function(folder) {
      try {
        return JSON.parse(fs.readFileSync(path.join(folder, 'package.json'), 'utf8'));
      } catch (error) {
        return {};
      }
    },
    basename: function(folder) {
      return path.basename(folder);
    },
    now: function() {
      return new Date().toISOString();
    },
    writeManifest: function(folder, file, text) {
      var target;
      target = path.join(folder, file);
      fs.writeFileSync(target, text, 'utf8');
      return target;
    }
  });
};
