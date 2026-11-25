// Capability injection keeps filesystem and path semantics outside the core.
exports.create = function(scanners, capabilities) {
  var api;
  api = {};
  api.generateManifest = async function(folder) {
    var commands, folderPath, hooks, pkg, routes, tools;
    folderPath = scanners.resolveAgentFolder(folder);
    if (!folderPath) {
      throw new Error('Folder not found');
    }
    pkg = (await capabilities.readPackage(folderPath));
    [tools, hooks, routes, commands] = (await Promise.all([scanners.registerTools(folderPath), scanners.registerHooks(folderPath), scanners.registerRoutes(folderPath), scanners.registerCommands(folderPath)]));
    return {
      name: pkg.name || capabilities.basename(folderPath),
      version: pkg.version,
      description: pkg.description,
      tools: tools.map(function(t) {
        var ref;
        return {
          name: t.name,
          description: (ref = t.description) != null ? ref : null,
          parameters: t.parameters,
          reach: t.reach || 'auto',
          recoveryPolicy: t.recoveryPolicy || null,
          reconcileTool: t.reconcileTool || null
        };
      }),
      hooks: hooks.map(function(h) {
        return {
          event: h.event,
          priority: h.priority
        };
      }),
      routes: routes.map(function(r) {
        return {
          path: r.path,
          method: r.method
        };
      }),
      commands: commands.map(function(c) {
        var item, ref;
        item = {
          name: c.name,
          description: (ref = c.description) != null ? ref : null,
          parameters: c.parameters
        };
        if (c.order) {
          item.order = c.order;
        }
        return item;
      }),
      generatedAt: capabilities.now()
    };
  };
  api.writeManifest = async function(folder, outFile = 'logos.json') {
    var folderPath, manifest;
    folderPath = scanners.resolveAgentFolder(folder);
    if (!folderPath) {
      throw new Error('Folder not found');
    }
    manifest = (await api.generateManifest(folderPath));
    return (await capabilities.writeManifest(folderPath, outFile, JSON.stringify(manifest, null, 2) + '\n'));
  };
  return api;
};
