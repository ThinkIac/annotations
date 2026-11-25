// Compatibility parsers: metadata only; handlers are never executed here.
var ENUM_RE, ENUM_SOURCE_RE, PARAM_RE, UNION_RE, docLines, getDescription, hasTag, parseCommandArguments, parseConditions, parseParams, parseReach, parseUnion, registration, tagValues;

({docLines, tagValues, hasTag, parseReach, parseConditions} = require('./jsdoc.cjs'));

PARAM_RE = /@params? {([^}]+)} (\S+)(?: - (.*))?$/;

UNION_RE = /^\((.+)\)$/;

ENUM_RE = /@enum\s+(\S+)/;

ENUM_SOURCE_RE = /@enumSource\s+(\S+)/;

parseUnion = function(type) {
  var match, values;
  match = type.match(UNION_RE);
  if (!match) {
    return null;
  }
  values = match[1].split('|').map(function(v) {
    return v.trim().replace(/^['"]|['"]$/g, '');
  }).filter(Boolean);
  if (values.length) {
    return values;
  } else {
    return null;
  }
};

parseParams = function(lines) {
  var cleanName, description, enumMatch, enumSource, i, len, line, match, name, param, paramMap, parameters, parent, parentName, required, sourceMatch, type, unionValues, values;
  parameters = [];
  paramMap = {};
  for (i = 0, len = lines.length; i < len; i++) {
    line = lines[i];
    if (!line.startsWith('@param')) {
      continue;
    }
    match = line.match(PARAM_RE);
    if (!match) {
      continue;
    }
    [, type, name, description = ''] = match;
    required = !type.endsWith('?');
    if (!required) {
      type = type.slice(0, -1);
    }
    enumMatch = description.match(ENUM_RE);
    sourceMatch = description.match(ENUM_SOURCE_RE);
    description = description.replace(ENUM_SOURCE_RE, '').replace(ENUM_RE, '').trim();
    unionValues = parseUnion(type);
    if (unionValues) {
      type = 'string';
    }
    values = enumMatch ? enumMatch[1].split(',').map(function(v) {
      return v.trim();
    }).filter(Boolean) : unionValues;
    enumSource = sourceMatch ? sourceMatch[1] : null;
    cleanName = name.replace(/\[\]/g, '');
    if (cleanName.includes('.')) {
      parentName = cleanName.split('.')[0];
      if (!paramMap[parentName]) {
        parent = {
          name: parentName,
          type: (name.includes('[]') ? 'array' : 'object'),
          description: `${parentName} object`,
          required
        };
        parameters.push(parent);
        paramMap[parentName] = parent;
      } else if (required) {
        paramMap[parentName].required = true;
      }
    }
    param = {name, type, description, required};
    if (values && values.length) {
      param.enum = values;
    }
    if (enumSource) {
      param.enumSource = enumSource;
    }
    parameters.push(param);
    paramMap[name] = param;
  }
  return parameters;
};

getDescription = function(lines) {
  var line;
  line = lines.find(function(l) {
    return l.startsWith('@description');
  });
  if (line) {
    return line.replace('@description', '').trim();
  } else {
    return null;
  }
};

exports.OFFLINE_POLICIES = ['cache', 'online'];

exports.parseOffline = function(doc, method = 'get') {
  var match, value;
  match = doc.match(/@offline\s+(\S+)/);
  if (!match) {
    return 'online';
  }
  value = match[1].trim().toLowerCase();
  if (value === 'queue') {
    throw new Error('[logos] @offline queue ainda não existe: fila de escrita exige dedupe por chave de idempotência no servidor, senão o reenvio duplica o registro. Remova a anotação (rotas sem @offline já são "online") até a fila existir.');
  }
  if (!exports.OFFLINE_POLICIES.includes(value)) {
    throw new Error(`[logos] @offline \"${value}\" desconhecido — use ${exports.OFFLINE_POLICIES.join(' ou ')}. Valor inválido é erro de carregamento, e não \"online\" silencioso, para que a política nunca prometa menos do que o autor escreveu.`);
  }
  if (value === 'cache' && method !== 'get') {
    throw new Error(`[logos] @offline cache só vale para GET (esta rota é ${method.toUpperCase()}). Servir uma mutação do cache devolveria uma resposta antiga para uma escrita que nunca aconteceu.`);
  }
  return value;
};

registration = function(doc, kind) {
  var legacy, lines, modern, name, ref;
  lines = docLines(doc);
  legacy = lines.map(function(line) {
    return line.match(new RegExp('^@register_' + kind + '[ \\t]+([^\\s@]+)'));
  }).find(Boolean);
  if (legacy) {
    return {
      value: legacy[1],
      legacy: true
    };
  }
  modern = lines.map(function(line) {
    return line.match(new RegExp('^@register[ \\t]+' + kind + '(?:[ \\t]+([^\\s@]+))?(?:[ \\t]|$)'));
  }).find(Boolean);
  if (!modern) {
    return null;
  }
  name = modern[1] || ((ref = lines.map(function(line) {
    return line.match(/^@name[ \t]+([^\s@]+)/);
  }).find(Boolean)) != null ? ref[1] : void 0);
  if (!name) {
    throw new Error(`[logos] @register ${kind} requires a name`);
  }
  return {
    value: name,
    legacy: false
  };
};

exports.parseRoute = function(fn, doc) {
  var channel, direction, isPublic, method, methodMatch, publicMatch, route, upload, uploadMatch, value;
  if (!(typeof fn === 'function' && doc)) {
    return null;
  }
  route = registration(doc, 'router');
  if (!route) {
    return null;
  }
  methodMatch = doc.match(/@method\s+([^\s]+)/);
  direction = doc.match(/@direction\s+(\S+)/);
  channel = doc.match(/@channel\s+(\S+)/);
  uploadMatch = doc.match(/@upload\s+(\S+)(?:\s+(\d+))?(?:\s+(\d+(?:kb|mb|gb)))?(?:\s+(memory|disk))?/i);
  upload = null;
  if (uploadMatch) {
    upload = {
      field: uploadMatch[1],
      quantity: (uploadMatch[2] ? Number(uploadMatch[2]) : 1),
      size: uploadMatch[3] || '10mb',
      storage: uploadMatch[4] || 'disk'
    };
  }
  method = methodMatch ? methodMatch[1].trim().toLowerCase() : 'get';
  publicMatch = doc.match(/@public(?:\s+(\S+))?/);
  isPublic = false;
  if (publicMatch) {
    value = (publicMatch[1] || 'true').toLowerCase();
    if (value !== 'true' && value !== 'false') {
      throw new Error(`[logos] @public \"${value}\" inválido — use true, false, ou omita o valor.`);
    }
    isPublic = value === 'true';
  }
  return {
    path: (route.legacy ? route.value : route.value.replace(/^\/+/, '')),
    method,
    public: isPublic,
    handler: fn,
    upload,
    offline: exports.parseOffline(doc, method),
    streaming: /@streaming\b/.test(doc),
    stream: /@stream\b/.test(doc),
    direction: (direction ? direction[1].trim() : 'bidirectional'),
    channel: (channel ? channel[1].trim() : null),
    credentialRequired: hasTag(doc, 'requireCredential') || hasTag(doc, 'auth'),
    condition: parseConditions(doc)
  };
};

exports.parseTool = function(fn, doc) {
  var lines, modern, name, raw, registerLine, registerMatch;
  if (!(typeof fn === 'function' && doc)) {
    return null;
  }
  lines = docLines(doc);
  registerLine = lines.find(function(l) {
    return l.startsWith('@register_tool');
  });
  modern = !registerLine ? registration(doc, 'tool') : null;
  if (!(registerLine || modern)) {
    return null;
  }
  registerMatch = registerLine != null ? registerLine.match(/@register_tool\s*(\S+)?/) : void 0;
  name = (modern != null ? modern.value : void 0) || (registerMatch && registerMatch[1]) || fn.name || 'anonymousTool';
  raw = (tagValues(doc, 'recovery')[0] || '').toLowerCase();
  return {
    name,
    description: getDescription(lines),
    parameters: parseParams(lines),
    call: fn,
    condition: parseConditions(doc),
    reach: parseReach(doc),
    recoveryPolicy: (raw === 'none' || raw === 'read-only' || raw === 'idempotent' || raw === 'reconcile' ? raw : null),
    reconcileTool: tagValues(doc, 'reconcile')[0] || null
  };
};

exports.parseHook = function(fn, doc) {
  var match, priority;
  if (!(typeof fn === 'function' && doc)) {
    return null;
  }
  match = registration(doc, 'hook');
  if (!match) {
    return null;
  }
  priority = doc.match(/@priority\s+(\d+)/);
  return {
    event: match.value,
    call: fn,
    priority: (priority ? parseInt(priority[1], 10) : 100),
    condition: parseConditions(doc)
  };
};

parseCommandArguments = function(lines, parameters) {
  var alias, byName, current, i, j, k, len, len1, len2, line, name, order, parameter, ref, ref1, ref2, tag, used, value;
  byName = new Map(parameters.map(function(p) {
    return [p.name, p];
  }));
  used = new Set([...byName.keys(), 'help', 'h', 'params']);
  order = [];
  current = void 0;
  for (i = 0, len = lines.length; i < len; i++) {
    line = lines[i];
    [, tag, value = ''] = line.match(/^@(param|parameter|alias|order)(?:\s+(.*))?$/) || [];
    if (tag === 'param') {
      current = (ref = line.match(PARAM_RE)) != null ? ref[2] : void 0;
    }
    if (tag === 'parameter') {
      current = value.trim();
    }
    if (tag === 'alias') {
      parameter = byName.get(current);
      if (!(parameter && value.trim())) {
        throw new Error('@alias requires a declared parameter and at least one alias');
      }
      ref1 = value.trim().split(/[\s,]+/);
      for (j = 0, len1 = ref1.length; j < len1; j++) {
        alias = ref1[j];
        if (!/^[a-zA-Z][\w-]*$/.test(alias)) {
          throw new Error(`Invalid command alias: ${alias}`);
        }
        if (used.has(alias)) {
          throw new Error(`Conflicting command alias: ${alias}`);
        }
        used.add(alias);
        (parameter.aliases != null ? parameter.aliases : parameter.aliases = []).push(alias);
      }
    }
    if (tag === 'order') {
      if (!value.trim()) {
        throw new Error('@order requires at least one parameter');
      }
      ref2 = value.split(',').map(function(item) {
        return item.trim();
      });
      for (k = 0, len2 = ref2.length; k < len2; k++) {
        name = ref2[k];
        if (!byName.has(name)) {
          throw new Error(`Unknown parameter in @order: ${name}`);
        }
        if (order.includes(name)) {
          throw new Error(`Duplicate parameter in @order: ${name}`);
        }
        order.push(name);
      }
    }
  }
  return order;
};

exports.parseCommand = function(fn, doc) {
  var cli, line, lines, match, order, parameters, ref, ref1, result;
  if (!(typeof fn === 'function' && doc)) {
    return null;
  }
  lines = docLines(doc);
  line = lines.find(function(l) {
    return l.startsWith('@register_command');
  });
  if (!line) {
    return null;
  }
  match = line.match(/@register_command\s*(\S+)?/);
  parameters = parseParams(lines);
  order = parseCommandArguments(lines, parameters);
  cli = (ref = lines.find(function(l) {
    return l.startsWith('@cli_runtime');
  })) != null ? ref.match(/^@cli_runtime\s+(minimal|full)$/) : void 0;
  result = {
    name: (match && match[1]) || fn.name || 'anonymousCommand',
    description: getDescription(lines),
    parameters,
    call: fn,
    condition: parseConditions(doc),
    cliRuntime: (ref1 = cli != null ? cli[1] : void 0) != null ? ref1 : 'minimal'
  };
  if (order.length) {
    result.order = order;
  }
  return result;
};

exports.parsePredicate = function(fn, doc) {
  var match, name;
  if (!(typeof fn === 'function' && doc)) {
    return null;
  }
  match = doc.match(/@register_predicate\s*(\w+)?/);
  if (!match) {
    return null;
  }
  name = match[1] || fn.name || null;
  if (name) {
    return {
      name,
      call: fn
    };
  } else {
    return null;
  }
};

exports.parseMiddleware = function(fn, doc) {
  var match;
  if (!(typeof fn === 'function' && doc)) {
    return null;
  }
  match = doc.match(/@register_middleware\s+(\w+)/);
  if (!match) {
    return null;
  }
  return {
    name: match[1],
    call: fn,
    predicates: Array.from(doc.matchAll(/@predicate\s+(\w+)/g), function(m) {
      return m[1];
    })
  };
};

exports.parseModule = function(fn, doc) {
  var match, phase, runtime;
  if (!(typeof fn === 'function' && doc)) {
    return null;
  }
  match = doc.match(/@register_module\s+([^\s]+)/);
  if (!match) {
    return null;
  }
  phase = doc.match(/@phase\s+(boot|wire)/);
  runtime = doc.match(/@runtime\s+(\S+)/);
  return {
    name: match[1].trim(),
    phase: (phase ? phase[1] : 'wire'),
    after: tagValues(doc, 'after'),
    swappable: !/@swappable\s+false/.test(doc),
    runtime: (runtime ? runtime[1].trim() : 'node'),
    events: tagValues(doc, 'events'),
    install: fn
  };
};
