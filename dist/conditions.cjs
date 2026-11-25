// Availability is evaluated per invocation, never cached with declarations.
exports.resolveConditions = async function(condition = {}, context = {}) {
  var i, j, key, len, len1, ref, ref1;
  await Promise.resolve();
  ref = [...(condition.only || []), ...(condition.when || [])];
  for (i = 0, len = ref.length; i < len; i++) {
    key = ref[i];
    if (!context[key]) {
      return false;
    }
  }
  ref1 = condition.never || [];
  for (j = 0, len1 = ref1.length; j < len1; j++) {
    key = ref1[j];
    if (context[key]) {
      return false;
    }
  }
  return true;
};
