const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { redactUrls, createCaptureDirectory } = require('./capture-safety.cjs');

test('redacts Alchemy paths and query strings without treating lookalike hosts as Alchemy', () => {
 assert.equal(redactUrls('https://arb-mainnet.g.alchemy.com/v2/key?secret=1'), 'https://arb-mainnet.g.alchemy.com/[redacted]?[redacted]');
 assert.equal(redactUrls('https://alchemy.com/key'), 'https://alchemy.com/[redacted]');
 assert.equal(redactUrls('https://notalchemy.com/public'), 'https://notalchemy.com/public');
 assert.equal(redactUrls('https://alchemy.com.evil.example/public'), 'https://alchemy.com.evil.example/public');
 assert.equal(redactUrls('https://example.com/public?token=private'), 'https://example.com/public?[redacted]');
});

test('each capture gets a private directory that cannot collide with another run', () => {
 const first = createCaptureDirectory();
 const second = createCaptureDirectory();
 try {
  assert.notEqual(first, second);
  assert.equal(fs.statSync(first).mode & 0o777, 0o700);
  assert.equal(fs.statSync(second).mode & 0o777, 0o700);
  fs.writeFileSync(`${first}/observations.json`, 'first');
  fs.writeFileSync(`${second}/observations.json`, 'second');
  assert.equal(fs.readFileSync(`${first}/observations.json`, 'utf8'), 'first');
 } finally {
  for (const directory of new Set([first, second])) fs.rmSync(directory, {recursive:true});
 }
});
