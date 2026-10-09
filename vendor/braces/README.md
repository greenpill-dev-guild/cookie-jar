# Local braces security remediation

This is the MIT-licensed runtime source from `braces@3.0.3`, originally published by Jon Schlinkert at https://github.com/micromatch/braces. The upstream LICENSE and public API are retained. The package is private and is installed through the root `braces` file override. The matching direct development dependency lets Bun resolve its declared `fill-range` dependency on a fresh install.

GHSA-vfj7-8cjw-p6xm has no published patched release as of 2026-10-09. The local change bounds parser nesting at 128 stack entries before recursive AST walkers can run. Compile, expand and stringify also validate externally supplied ASTs using an iterative depth check, including cyclic ASTs. Ordinary patterns, nesting, ranges and escapes retain upstream behavior.

The local package keeps the upstream version for provenance; it does not pretend that an upstream patched release exists. Registry audits do not scan file dependencies. `bun run test:dependency-security` therefore verifies malicious patterns, external/cyclic ASTs, ordinary behavior and the installed Tailwind/micromatch resolution before the unchanged high/critical registry audit runs in CI. No advisory is ignored.

Remove this override and source copy once an upstream release addresses the nesting vulnerability and passes the same regressions. Dependency dev scripts and upstream development-only dependencies are omitted.
