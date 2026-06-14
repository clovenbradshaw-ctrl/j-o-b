// Minimal zero-dependency static file server for local development.
//
//   npm run serve              # http://localhost:5173
//   PORT=8080 npm run serve
//
// index.html also works when opened directly via file:// (everything it needs
// is vendored locally), but serving it gives the browser a normal http origin.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 5173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let fp = path.normalize(path.join(root, pathname));
    if (fp !== root && !fp.startsWith(root + path.sep)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    let info = await stat(fp).catch(() => null);
    if (info?.isDirectory()) {
      fp = path.join(fp, "index.html");
      info = await stat(fp).catch(() => null);
    }
    if (!info) {
      res.writeHead(404).end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
    res.end(await readFile(fp));
  } catch (err) {
    res.writeHead(500).end(String(err));
  }
});

server.listen(port, () => console.log(`Job Desk → http://localhost:${port}`));
