// Pure annotation text helpers. No host capabilities are required.
var DOC_ABOVE_RE;

DOC_ABOVE_RE = /\/\*\*([\s\S]*?)\*\/\s*(?:export\s+(?:default\s+)?)?(?:module\.exports\.(\w+)\s*=|exports\.(\w+)\s*=|(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=)/g;

exports.buildAboveDocMap = function(source) {
  var map, match, name;
  map = {};
  DOC_ABOVE_RE.lastIndex = 0;
  while ((match = DOC_ABOVE_RE.exec(source)) !== null) {
    name = match[2] || match[3] || match[4] || match[5];
    if (name && match[1] && !map[name]) {
      map[name] = match[1];
    }
  }
  return map;
};

exports.docInside = function(source) {
  var match;
  match = source.match(/\/\*\*([\s\S]*?)\*\//);
  if (match) {
    return match[1];
  } else {
    return null;
  }
};

exports.resolveDoc = function(fn, aboveMap) {
  var inside;
  inside = exports.docInside(fn.toString());
  if (inside) {
    return inside;
  }
  if (fn.name && aboveMap[fn.name]) {
    return aboveMap[fn.name];
  }
  return null;
};

exports.docLines = function(doc) {
  return doc.split('\n').map(function(l) {
    return l.trim().replace(/^\*\s?/, '');
  });
};

exports.tagValues = function(doc, tag) {
  return Array.from(doc.matchAll(new RegExp('@' + tag + '\\s+([^\\s]+)', 'g')), function(m) {
    return m[1];
  });
};

exports.hasTag = function(doc, tag) {
  return new RegExp('@' + tag + '\\b').test(doc);
};

exports.parseReach = function(doc) {
  var raw;
  raw = (exports.tagValues(doc, 'reach')[0] || '').toLowerCase();
  if (['auto', 'always', 'manual'].includes(raw)) {
    return raw;
  } else {
    return 'auto';
  }
};

exports.parseConditions = function(doc) {
  var condition, never, only;
  condition = {};
  only = [...exports.tagValues(doc, 'only'), ...exports.tagValues(doc, 'when')];
  never = exports.tagValues(doc, 'never');
  if (only.length) {
    condition.only = only;
  }
  if (never.length) {
    condition.never = never;
  }
  return condition;
};
