"use strict";

// Bound recursion before the upstream AST walkers execute (GHSA-vfj7-8cjw-p6xm).
const MAX_DEPTH = 128;
function assertDepth(root) {
  const pending = [[root, 0]];
  while (pending.length) {
    const [node, depth] = pending.pop();
    if (depth >= MAX_DEPTH) throw new RangeError("Brace nesting exceeds maximum depth");
    if (node && Array.isArray(node.nodes)) {
      for (const child of node.nodes) pending.push([child, depth + 1]);
    }
  }
}
module.exports = { MAX_DEPTH, assertDepth };
