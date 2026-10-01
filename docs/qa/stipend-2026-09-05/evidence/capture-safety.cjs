const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
function redactUrls(text) {
 return text.replace(/https?:\/\/[^\s"<>]+/g, value => {
  try {
   const url = new URL(value);
   if (url.hostname === 'alchemy.com' || url.hostname.endsWith('.alchemy.com')) {
    url.pathname = '/[redacted]';
   }
   if (url.search) url.search = '?[redacted]';
   return url.toString();
  } catch {
   return value;
  }
 });
}
function createCaptureDirectory() {
 // mkdtemp creates a unique directory with owner-only access (0700).
 return fs.mkdtempSync(path.join(os.tmpdir(), 'stipend-production-'));
}

module.exports = {redactUrls, createCaptureDirectory};
