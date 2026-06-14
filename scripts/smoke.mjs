// Headless boot test: render index.html in jsdom using the vendored React and
// assert the DC app mounts and paints without runtime errors.
//
//   npm test
//
// This catches the things that actually break an un-bundled DC app: a broken
// asset path, React not being picked up, or a syntax error in the data-script.
import { JSDOM, VirtualConsole } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(root, "index.html");
const html = readFileSync(indexPath, "utf8");

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push(e?.detail?.message || e?.message || String(e)));
vc.on("error", (...a) => errors.push(a.join(" ")));

const dom = new JSDOM(html, {
  url: "file://" + indexPath,
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(window) {
    // The app only hits the network on user actions and a deferred background
    // scan; stub fetch so that scan can't reach out during the test.
    window.fetch = () => Promise.reject(new Error("network disabled in smoke test"));
    window.matchMedia ||= () => ({
      matches: false, media: "", onchange: null,
      addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
    });
  },
});

await new Promise((r) => setTimeout(r, 4500));

const d = dom.window.document;
const dcRoot = d.querySelector("#dc-root");
const txt = dcRoot ? dcRoot.textContent : "";
const buttons = dcRoot ? dcRoot.querySelectorAll("button").length : 0;

const checks = [
  ["React + ReactDOM loaded (vendored, no CDN)", !!(dom.window.React && dom.window.ReactDOM)],
  ["runtime booted: #dc-root present", !!dcRoot],
  ["raw <x-dc> template consumed", !d.querySelector("x-dc")],
  ["component rendered into #dc-root", !!dcRoot && dcRoot.children.length > 0],
  ["renders 'Job Desk'", txt.includes("Job Desk")],
  ["renders tagline", txt.includes("your job-search co-pilot")],
  ["renders navigation / sections", /Pipeline|Search|Tracker|Frame|Memory|Saved|Applied|Interview/.test(txt)],
  ["renders interactive controls", buttons > 0],
  ["no runtime errors", errors.length === 0],
];

let ok = true;
for (const [label, pass] of checks) {
  console.log(`${pass ? "✓" : "✗"} ${label}`);
  if (!pass) ok = false;
}
if (errors.length) {
  console.log("\nErrors:");
  errors.slice(0, 10).forEach((e) => console.log("  - " + String(e).slice(0, 200)));
}
console.log(`\n#dc-root text length: ${txt.length}, buttons: ${buttons}`);

dom.window.close();
process.exit(ok ? 0 : 1);
