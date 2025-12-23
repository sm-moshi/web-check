#!/usr/bin/env node
/**
 * Postinstall script to fix @fortawesome/svelte-fontawesome package.json
 * This adds proper export conditions for Vite 6 / Astro 5 compatibility
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../node_modules/@fortawesome/svelte-fontawesome/package.json');

// Check if the package exists
if (!fs.existsSync(packageJsonPath)) {
  console.log('⚠️  @fortawesome/svelte-fontawesome not found, skipping patch');
  process.exit(0);
}

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Ensure exports field exists
  if (!packageJson.exports) {
    packageJson.exports = {};
  }

  // Check if the package already has the fix
  if (packageJson.exports["."] && packageJson.exports["."].import) {
    console.log('✓ @fortawesome/svelte-fontawesome already patched');
    process.exit(0);
  }

  // Add proper export conditions for Vite 6 compatibility
  packageJson.exports["."] = {
    "types": "./index.d.ts",
    "svelte": "./src/index.js",
    "import": "./index.es.js",
    "default": "./index.es.js"
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✓ Fixed @fortawesome/svelte-fontawesome package.json for Vite 6 compatibility');
} catch (error) {
  console.error('❌ Error patching @fortawesome/svelte-fontawesome:', error.message);
  // Don't fail the install if patching fails
  process.exit(0);
}
