// Refresh the vendored React / ReactDOM UMD bundles in assets/vendor/ from the
// versions pinned in package.json (devDependencies).
//
//   npm install        # installs the pinned react / react-dom
//   npm run vendor     # copies their UMD builds into assets/vendor/
//
// Why vendor at all? assets/dc-runtime.js loads React from unpkg, but ONLY when
// window.React / window.ReactDOM are missing. index.html pre-loads these local
// copies, so the runtime's CDN fetch never fires and the app runs fully offline.
import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "assets", "vendor");

const files = [
  ["react/umd/react.production.min.js", "react.production.min.js"],
  ["react-dom/umd/react-dom.production.min.js", "react-dom.production.min.js"],
];

await mkdir(out, { recursive: true });
for (const [from, to] of files) {
  await copyFile(path.join(root, "node_modules", from), path.join(out, to));
  console.log("vendored", to);
}
console.log("Done — React/ReactDOM copied into assets/vendor/.");
