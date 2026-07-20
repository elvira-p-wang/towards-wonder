#!/usr/bin/env node
/*
  Watches images/gallery/ and automatically re-runs the full gallery
  pipeline (optimise + generate) whenever files change — so dropping
  new photos in while this is running updates gallery/data/*.js, the
  room-order files, and the homepage entrance-panel counts without
  having to remember to run `npm run prepare-gallery` by hand each
  time.

  This does NOT make the deployed site auto-update — Towards Wonder
  is a static site with no server/build step (see CLAUDE.md), so a
  live page still only reflects whatever was last committed and
  deployed. What this gives you is: keep this running in a terminal
  while you're adding real photos/drawings/concert shots, and your
  local preview (double-clicked index.html, or a local server) stays
  in sync automatically — then commit + deploy as usual when you're
  done for the day.

  Usage:
    node scripts/watch-gallery-images.js
    (Ctrl+C to stop)

  Run via npm run watch-gallery (see package.json).
*/

"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const GALLERY_ROOT = path.join(PROJECT_ROOT, "images", "gallery");

// EDIT POINT — how long to wait after the last detected change before
// running the pipeline, so a batch of files copied in together (e.g.
// dragging 30 photos into Finder) triggers one run, not 30.
const DEBOUNCE_MS = 1500;

const IGNORED_FILENAMES = new Set([".DS_Store"]);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: PROJECT_ROOT, stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(command + " " + args.join(" ") + " exited with code " + code));
    });
    child.on("error", reject);
  });
}

let pending = false;
let running = false;
let timer = null;

async function runPipeline() {
  if (running) {
    pending = true;
    return;
  }
  running = true;
  pending = false;

  const startedAt = new Date().toLocaleTimeString();
  console.log("\n[" + startedAt + "] Change detected — running gallery pipeline...\n");

  try {
    await run("node", [path.join("scripts", "optimise-gallery-images.js")]);
    await run("node", [path.join("scripts", "generate-gallery-data.js")]);
    console.log(
      "\n✓ Gallery data + homepage counts are up to date. Refresh your browser to see the change.\n"
    );
  } catch (err) {
    console.error("\n! Gallery pipeline failed:", err.message, "\n");
  }

  running = false;
  if (pending) {
    // Something changed again while we were running — go again.
    runPipeline();
  }
}

function scheduleRun(reason) {
  console.log("  (" + reason + ")");
  clearTimeout(timer);
  timer = setTimeout(runPipeline, DEBOUNCE_MS);
}

function main() {
  if (!fs.existsSync(GALLERY_ROOT)) {
    console.error("images/gallery/ does not exist — nothing to watch.");
    process.exit(1);
  }

  console.log("Watching " + path.relative(PROJECT_ROOT, GALLERY_ROOT) + "/ for changes...");
  console.log("(Ctrl+C to stop)\n");

  fs.watch(GALLERY_ROOT, { recursive: true }, (eventType, filename) => {
    if (filename && IGNORED_FILENAMES.has(path.basename(filename))) return;
    scheduleRun(filename ? filename : eventType);
  });
}

main();
