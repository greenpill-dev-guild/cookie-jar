#!/bin/bash

# Check for <img> tags in client code (should use Next.js Image component)
if grep -r "<img" --include="*.tsx" --include="*.jsx" client/components/ client/app/ --exclude-dir=node_modules 2>/dev/null; then
  echo "❌ Error: Found <img> tags. Use Next.js <Image /> component instead."
  exit 1
fi

echo "✅ Next.js rules check passed"
exit 0

