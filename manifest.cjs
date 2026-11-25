'use strict';
// Preserve create(scanners); capability injection uses the portable core.
exports.create = (scanners, capabilities) => capabilities
  ? require('./dist/manifest.cjs').create(scanners, capabilities)
  : require('./dist/node.cjs').create(scanners);
