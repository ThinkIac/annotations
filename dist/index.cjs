var JSON_SCHEMA_TYPES, parseCommand, parseHook, parseMiddleware, parsePredicate, parseRoute, parseTool, scanners, toJsonSchemaProperty;

({parseTool, parseHook, parseRoute, parseCommand, parsePredicate, parseMiddleware} = require('./parsers.cjs'));

scanners = new WeakMap();

JSON_SCHEMA_TYPES = new Set(['string', 'number', 'integer', 'boolean', 'object', 'array', 'null']);

toJsonSchemaProperty = function(param) {
  var aliases, extra, item, raw, rawType;
  aliases = {
    Int: 'integer',
    Float: 'number',
    String: 'string',
    Boolean: 'boolean',
    DateTime: 'string',
    Json: 'object'
  };
  raw = param.type;
  rawType = raw.endsWith('[]') ? (aliases[raw.slice(0, -2)] || raw.slice(0, -2)) + '[]' : aliases[raw] || raw;
  extra = {};
  if (param.enum && param.enum.length) {
    extra.enum = param.enum;
  }
  if (param.enumSource) {
    extra['x-enumSource'] = param.enumSource;
  }
  if (typeof rawType === 'string' && rawType.endsWith('[]')) {
    item = rawType.slice(0, -2);
    return {
      type: 'array',
      items: {
        type: (JSON_SCHEMA_TYPES.has(item) ? item : 'string'),
        ...extra
      },
      description: param.description
    };
  }
  return {
    type: (JSON_SCHEMA_TYPES.has(rawType) ? rawType : 'string'),
    description: param.description,
    ...extra
  };
};

exports.createScanners = function(registerGeneric) {
  var api;
  if (scanners.has(registerGeneric)) {
    return scanners.get(registerGeneric);
  }
  api = {};
  api.registerTools = function(folder) {
    return registerGeneric(folder, parseTool, 'tools', function(meta) {
      var i, len, p, properties, ref;
      properties = {};
      ref = meta.parameters || [];
      for (i = 0, len = ref.length; i < len; i++) {
        p = ref[i];
        properties[p.name] = toJsonSchemaProperty(p);
      }
      return {
        name: meta.name,
        description: meta.description,
        parameters: {
          type: 'object',
          properties,
          required: (meta.parameters || []).filter(function(p) {
            return p.required;
          }).map(function(p) {
            return p.name;
          })
        },
        call: meta.call,
        condition: meta.condition,
        _file: meta._file
      };
    });
  };
  api.registerCommands = function(folder) {
    return registerGeneric(folder, parseCommand, 'commands');
  };
  api.registerHooks = function(folder) {
    return registerGeneric(folder, parseHook, 'hooks');
  };
  api.registerRoutes = function(folder) {
    return registerGeneric(folder, parseRoute, 'routes');
  };
  api.registerPredicates = function(folder) {
    return registerGeneric(folder, parsePredicate, 'predicates');
  };
  api.registerMiddlewares = function(folder) {
    return registerGeneric(folder, parseMiddleware, 'middlewares');
  };
  scanners.set(registerGeneric, api);
  return api;
};
