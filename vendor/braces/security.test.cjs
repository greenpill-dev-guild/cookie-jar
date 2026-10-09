"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const clientRequire = createRequire(path.resolve("client/package.json"));
const tailwindRequire = createRequire(clientRequire.resolve("tailwindcss/package.json"));
const matchRequire = createRequire(tailwindRequire.resolve("micromatch"));
const braces = matchRequire("braces");

test("preserves ordinary nested patterns, ranges and escaped braces", () => {
 assert.deepEqual(braces.expand("src/{client,shared}/{a,b}.ts"), ["src/client/a.ts", "src/client/b.ts", "src/shared/a.ts", "src/shared/b.ts"]);
 assert.deepEqual(braces.expand("file{1..3}.js"), ["file1.js", "file2.js", "file3.js"]);
 assert.equal(braces.compile("{a,{b,c}}"), "(a|(b|c))");
 assert.equal(braces.stringify(braces.parse("{a,b}")), "{a,b}");
 assert.doesNotThrow(() => braces.compile("\\{".repeat(300)));
});
for (const method of ["parse", "compile", "expand", "stringify"]) {
 test(`${method} rejects excessive brace and parenthesis nesting before recursive walking`, () => {
  for (const [open,close] of [["{", "}"], ["(", ")"]]) {
   assert.throws(() => braces[method](open.repeat(4000)+"a,b"+close.repeat(4000)), /Brace nesting exceeds maximum depth/);
  }
 });
}
for (const method of ["compile", "expand", "stringify"]) {
 test(`${method} rejects a deeply nested external AST`, () => {
  let node={type:"text",value:"x"};
  for(let i=0;i<4000;i++)node={type:"root",nodes:[node]};
  assert.throws(()=>braces[method](node), /Brace nesting exceeds maximum depth/);
 });
 test(`${method} rejects cyclic AST nodes`, () => {
  const node={type:"root",nodes:[]};node.nodes.push(node);
  assert.throws(()=>braces[method](node), /Brace nesting exceeds maximum depth/);
 });
}
test("Tailwind's installed micromatch uses the local security remediation", () => {
 const installed = path.dirname(matchRequire.resolve("braces"));
 for (const file of ["index.js", "lib/depth.js", "lib/parse.js", "lib/compile.js", "lib/expand.js", "lib/stringify.js"]) {
  assert.equal(readFileSync(path.join(installed,file),"utf8"),readFileSync(path.resolve("vendor/braces",file),"utf8"));
 }
 const match=tailwindRequire("micromatch");
 assert.deepEqual(match(["src/a.ts", "src/b.ts", "src/a.js"], "src/*.{ts,tsx}"), ["src/a.ts","src/b.ts"]);
 assert.throws(()=>match.braces("{".repeat(4000)+"a,b"+"}".repeat(4000)), /Brace nesting exceeds maximum depth/);
});
