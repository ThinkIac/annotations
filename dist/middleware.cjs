exports.create = function(scanners) {
  var api;
  api = {};
  api.loadMiddlewareSnapshot = async function(folder) {
    var i, len, middlewares, p, predicates, predicatesList;
    predicatesList = [];
    middlewares = [];
    try {
      predicatesList = (await scanners.registerPredicates(folder));
    } catch (error) {

    }
    try {
      // Preserve the legacy missing-folder behavior.
      middlewares = (await scanners.registerMiddlewares(folder));
    } catch (error) {

    }
    // Preserve the legacy missing-folder behavior.
    predicates = {};
    for (i = 0, len = predicatesList.length; i < len; i++) {
      p = predicatesList[i];
      predicates[p.name] = p.call;
    }
    return {predicates, middlewares};
  };
  api.resolveMiddlewares = async function(folder, context, snapshot) {
    var allowed, fn, i, j, len, len1, middleware, middlewares, name, ok, predicates, ref;
    ({predicates, middlewares} = snapshot != null ? snapshot : (await api.loadMiddlewareSnapshot(folder)));
    allowed = [];
    for (i = 0, len = middlewares.length; i < len; i++) {
      middleware = middlewares[i];
      ok = true;
      ref = middleware.predicates || [];
      for (j = 0, len1 = ref.length; j < len1; j++) {
        name = ref[j];
        fn = predicates[name];
        if (typeof fn === 'function') {
          if (!(await fn(context))) {
            ok = false;
            break;
          }
        }
      }
      if (ok) {
        allowed.push(middleware);
      }
    }
    return allowed;
  };
  api.runMiddlewares = async function(middlewares, context, handler) {
    var idx, next;
    idx = 0;
    next = function() {
      var mw;
      if (idx < middlewares.length) {
        mw = middlewares[idx++];
        return mw.call(context, next);
      }
      return handler();
    };
    return (await next());
  };
  return api;
};
