# Job Desk

A local-first **job-search co-pilot** that runs entirely in the browser. Track
applications through a pipeline, browse a remote-jobs feed, draft outreach and
cover letters, and keep a working "frame" of what you're optimizing for — all
stored locally, with optional AI (Claude) and Matrix sync.

This repository is the un-bundled, editable source of a single-page app that was
originally shipped as one self-contained HTML file. It runs with **no build
step**: open `index.html` or serve the folder.

```bash
npm install      # optional — only needed to run the dev server / tests / re-vendor
npm run serve    # http://localhost:5173
# …or just open index.html directly in a browser (file://)
```

## Features

- **Search / feed** — a remote-jobs feed (We Work Remotely RSS via a proxy) plus
  built-in seed roles, scored by a rough match heuristic.
- **Tracker** — an application pipeline across `Saved → Applied → Interview →
  Offer`, with per-application notes and checklists.
- **Draft / materials** — cover letters, outreach notes, and talking points.
- **Documents** — just ask ("draft a cover letter for Stripe", "write a
  thank-you note", "build a one-page resume") and the assistant spins up an
  editable document in the workspace. Download any of them as Markdown (`.md`)
  or a printable web page (`.html` → print to PDF).
- **Progress trackers** — ask it to track a goal ("track my interview prep",
  "a weekly job-search plan") and it spins up a checklist you can tick off, with
  a progress bar; trackers persist locally.
- **Frame** — define the move you're making: target roles, a reservation bar,
  and "done when" criteria to keep decisions honest. You set it by *talking* —
  describe what you're after in your own words and it captures the frame as the
  conversation surfaces it, rather than running a fixed questionnaire.
- **Memory** — durable notes/context the app reuses across views.
- **Two themes** — `paper` (warm light) and `terminal` (green-on-black mono).
- **Optional integrations**
  - **Anthropic / Claude** — paste an API key (kept in `localStorage`) to get AI
    help drafting and reasoning. Calls go directly from the browser to the
    Anthropic API.
  - **Matrix** — connect a Matrix account to sync your casebook, memory, frame,
    and next-moves to a room.

All core data persists in `localStorage` (keys prefixed `investdesk.*`). No
backend is required for the core experience.

## How it runs (architecture)

Job Desk is a **DC document** — a small format with three parts:

| Part | Where | What it is |
| --- | --- | --- |
| **Template** | `<x-dc>…</x-dc>` in `index.html` | HTML with `{{ binding }}` placeholders and `onclick="{{ handler }}"` event hooks. |
| **Logic** | `<script type="text/x-dc" data-dc-script>` in `index.html` | A `class Component extends DCLogic` whose `renderVals()` produces the values the template binds to. |
| **Runtime** | `assets/dc-runtime.js` | Parses the template + logic and renders them with React 18. |

At boot the runtime replaces `<x-dc>` with `<div id="dc-root">` and mounts the
component there. The logic class is evaluated as plain JS (`new Function`) — there
is **no JSX and no Babel** in this app.

React and ReactDOM are **vendored locally** in `assets/vendor/` and pre-loaded in
`index.html`. The runtime only fetches them from a CDN (unpkg) when
`window.React` is absent, so with the local copies present that network call
never happens and the app works offline.

> Editing tip: change the markup in the `<x-dc>` template and the behavior in the
> `data-dc-script` class — both live in `index.html`.

## Project layout

```
index.html                       The app: <x-dc> template + data-script + runtime
assets/
  dc-runtime.js                  DC runtime (renders the document with React)
  vendor/
    react.production.min.js       React 18.3.1 UMD (vendored)
    react-dom.production.min.js   ReactDOM 18.3.1 UMD (vendored)
  fonts/*.woff2                  Subsetted Hanken Grotesk / JetBrains Mono
dist/
  job-desk.standalone.html       Original single-file build (see note below)
scripts/
  serve.mjs                      Zero-dependency static dev server
  vendor.mjs                     Re-copy React/ReactDOM from node_modules
  smoke.mjs                      Headless boot test (jsdom)
```

## Development

```bash
npm install        # install dev tooling + pinned react/react-dom
npm run serve      # serve the app locally
npm test           # headless boot test: mounts index.html in jsdom, asserts it renders
npm run vendor     # refresh assets/vendor/* from the pinned versions after a bump
```

`node_modules/` is dev-only (server, tests, vendoring). The shipped app under
`index.html` + `assets/` depends on nothing installed.

## `dist/job-desk.standalone.html`

The original, fully self-contained single file: all assets are embedded
(base64 + gzip) and unpacked in-page. It's handy for sharing as one file, but it
loads React **and** Babel from the unpkg CDN, so it needs internet access and
won't run on networks that block unpkg. For local/offline use, prefer
`index.html`.

## Notes

- The jobs feed proxy and the optional Anthropic/Matrix calls require network
  access; everything else works offline.
- API keys and synced data live in your browser's `localStorage`. Clearing site
  data resets the app.
