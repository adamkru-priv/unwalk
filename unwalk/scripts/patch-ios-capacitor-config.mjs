import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const configPath = path.join(projectRoot, 'ios', 'App', 'App', 'capacitor.config.json');

if (!fs.existsSync(configPath)) {
  console.error(`[patch-ios-capacitor-config] File not found: ${configPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(configPath, 'utf8');
let json;
try {
  json = JSON.parse(raw);
} catch (e) {
  console.error('[patch-ios-capacitor-config] Failed to parse JSON:', e);
  process.exit(1);
}

json.packageClassList = Array.isArray(json.packageClassList) ? json.packageClassList : [];

// This project registers the custom APNs token plugin via the Objective-C shim
// (ios/App/App/ApnsTokenPlugin.m) using CAP_PLUGIN. However, Capacitor still
// uses `packageClassList` at runtime to instantiate Swift plugin classes.
// If the plugin class is not listed, JS calls can still resolve to UNIMPLEMENTED.
//
// Therefore:
// 1) Remove legacy/experimental bridge entries (which do not exist in the target)
// 2) Ensure the actual plugin class name is present.
const REMOVE = new Set([
  'ApnsTokenPluginBridge',
  'App.ApnsTokenPluginBridge',
]);

const ENSURE_PRESENT = [
  // CAP_PLUGIN(...) registers this Swift class under JS name "ApnsToken"
  'ApnsTokenPlugin',
];

const before = json.packageClassList.length;
json.packageClassList = json.packageClassList.filter((x) => !REMOVE.has(x));

for (const entry of ENSURE_PRESENT) {
  if (!json.packageClassList.includes(entry)) json.packageClassList.push(entry);
}

const after = json.packageClassList.length;

if (after !== before) {
  console.log(
    `[patch-ios-capacitor-config] Updated packageClassList for ApnsToken (${before} -> ${after})`,
  );
} else {
  console.log('[patch-ios-capacitor-config] packageClassList already contains ApnsTokenPlugin');
}

fs.writeFileSync(configPath, JSON.stringify(json, null, 2) + '\n', 'utf8');
