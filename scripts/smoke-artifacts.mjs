// Feature smoke test: drive the real chat input and assert the workspace can
// spin up the artifacts the app promises — a downloadable document and a
// progress tracker — and that they render and operate without runtime errors.
//
//   node scripts/smoke-artifacts.mjs
//
// No network and no API key are available here, so the orchestrator falls back
// to the built-in templates; that's exactly the path we want to keep working.
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
  runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    w.fetch = () => Promise.reject(new Error("network disabled in smoke test"));
    w.matchMedia ||= () => ({ matches: false, media: "", addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
  },
});
const W = dom.window, D = W.document;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await sleep(3500);

function send(text) {
  const ta = D.querySelector("#dc-root textarea");
  if (!ta) throw new Error("no chat textarea found");
  const setter = Object.getOwnPropertyDescriptor(W.HTMLTextAreaElement.prototype, "value").set;
  setter.call(ta, text);
  ta.dispatchEvent(new W.Event("input", { bubbles: true }));
  ta.dispatchEvent(new W.Event("change", { bubbles: true }));
  D.querySelector('button[aria-label="Send message"]').dispatchEvent(new W.MouseEvent("click", { bubbles: true }));
}
const txt = () => D.querySelector("#dc-root")?.textContent || "";

const checks = [];
const check = (label, pass) => checks.push([label, pass]);

// 1) Spin up a downloadable document.
send("write a cover letter for Acme");
await sleep(900);
check("chat input pipeline works", txt().includes("write a cover letter for Acme"));
check("document panel drafts a cover letter", /Cover letter/.test(txt()) && /Dear/.test(txt()));
check("document is downloadable (.md and .html)", txt().includes("Download .md") && txt().includes("Download .html"));

// 2) Spin up a progress tracker.
send("make an interview prep checklist");
await sleep(900);
check("progress panel builds a checklist", txt().includes("Research the company") && /\d+%/.test(txt()));
check("checklist starts at 0 of N", /0 of \d+ done/.test(txt()));

// 3) Operate it: check an item off.
const row = [...D.querySelectorAll("#dc-root div")].find(
  (el) => el.getAttribute("style") && /cursor: pointer/.test(el.getAttribute("style")) && el.textContent.trim().startsWith("Research the company")
);
if (row) { row.dispatchEvent(new W.MouseEvent("click", { bubbles: true })); await sleep(300); }
check("checking an item advances progress", /1 of \d+ done/.test(txt()));

check("no runtime errors", errors.length === 0);

let ok = true;
for (const [label, pass] of checks) { console.log(`${pass ? "✓" : "✗"} ${label}`); if (!pass) ok = false; }
if (errors.length) { console.log("\nErrors:"); errors.slice(0, 8).forEach((e) => console.log("  - " + String(e).slice(0, 240))); }
dom.window.close();
process.exit(ok ? 0 : 1);
