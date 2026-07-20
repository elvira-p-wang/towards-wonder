#!/usr/bin/env node
/*
  Optimises every image inside images/gallery/{photographs,drawings,
  concerts}/ — and only those three folders. Never touches the logo,
  cursor assets, hero image, or anything outside images/gallery/.

  What it does, per collection subfolder (or, for a flat module like
  Concerts, directly inside the module folder):
    - HEIC/HEIF source files are converted to WebP (browser-safe).
    - JPG/JPEG/PNG/WebP files are re-encoded at a size-aware quality
      and resized if their long edge exceeds MAX_LONG_EDGE_PX —
      never upscaled, never forced larger than the original.
    - Every file about to be modified is backed up first (see
      BACKUP_DIR below) — required because images/gallery/ isn't
      tracked in git yet in this project, so there is no other
      recovery path for a lossy operation like this.
    - A manifest in the backup folder records, per file, the
      (size, mtime) signature the file had right after we last
      optimised it — on the next run, a file whose current signature
      still matches is skipped entirely, so re-running this script
      is fast and doesn't repeatedly re-compress already-optimised
      images (each JPEG re-encode is lossy; doing it twice would
      quietly erode quality for no reason).

  Manifest/backup entries are namespaced per module ("photographs/…",
  "drawings/…", "concerts/…") so identically-named files in different
  modules can never collide. A one-time migration on load upgrades any
  legacy (pre-multi-module) manifest keys — which were always implicitly
  under photographs/ — to the namespaced form, so already-optimised
  photographs are never mistaken for new work and re-compressed.

  Usage:
    node scripts/optimise-gallery-images.js
    node scripts/optimise-gallery-images.js --dry-run   (report only, touches nothing)

  Run via npm run optimise-gallery (see package.json).
*/

"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const {
  isImageFile,
  isConvertibleFile,
  listCollectionFolders,
  formatBytes
} = require("./lib/gallery-fs");

const DRY_RUN = process.argv.includes("--dry-run");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const GALLERY_ROOT = path.join(PROJECT_ROOT, "images", "gallery");
const BACKUP_DIR = path.join(PROJECT_ROOT, "gallery-originals-backup");
const MANIFEST_PATH = path.join(BACKUP_DIR, "manifest.json");

// EDIT POINT — which module folders under images/gallery/ this
// script processes. `flat: true` (Concerts) means images live
// directly in the module folder rather than in per-collection
// subfolders (Photographs, Drawings).
const MODULES = [
  { name: "photographs", flat: false },
  { name: "drawings", flat: false },
  { name: "concerts", flat: false }
];
const MODULE_NAMES = MODULES.map((m) => m.name);

// ----------------------------------------
// EDIT POINTS — tune compression behaviour here.
// ----------------------------------------

// A reasonable maximum long edge for lightbox-quality display
// without shipping full camera-resolution originals.
const MAX_LONG_EDGE_PX = 3000;

// Re-encode JPEG at the first of these quality levels that lands at
// or under TARGET_MAX_BYTES; if even the lowest still doesn't, keep
// that lowest-quality result anyway rather than degrading further —
// staying visually clean matters more than hitting the byte target
// exactly for a handful of very detailed outlier photos.
const JPEG_QUALITY_TIERS = [82, 72, 65];
const WEBP_QUALITY_TIERS = [82, 72, 65];
const TARGET_MAX_BYTES = 600 * 1024;
const TARGET_MIN_USEFUL_BYTES = 20 * 1024; // below this, compressing further isn't worth the quality cost

// Convertible (HEIC/HEIF) sources become WebP at this quality.
const CONVERTED_WEBP_QUALITY = 82;

// ----------------------------------------

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return {};
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } catch (err) {
    console.warn(
      "  ! Could not parse existing manifest, starting a fresh one:",
      err.message
    );
    return {};
  }

  // One-time migration: every entry in a pre-multi-module manifest was
  // implicitly under images/gallery/photographs/ (the only module that
  // existed then) and keyed as a plain photographs-relative path, e.g.
  // "stillness/stillness1.jpeg". Namespacing it as
  // "photographs/stillness/stillness1.jpeg" here — without touching
  // the file on disk — keeps those already-optimised photos correctly
  // recognised as unchanged, so this migration never triggers a wasted
  // (lossy) re-compression pass over them.
  const migrated = {};
  Object.keys(raw).forEach((key) => {
    const alreadyNamespaced = MODULE_NAMES.some(
      (name) => key === name || key.startsWith(name + "/")
    );
    migrated[alreadyNamespaced ? key : "photographs/" + key] = raw[key];
  });
  return migrated;
}

function saveManifest(manifest) {
  if (DRY_RUN) return;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function signatureOf(filePath) {
  const stat = fs.statSync(filePath);
  return { size: stat.size, mtimeMs: stat.mtimeMs };
}

function signaturesMatch(a, b) {
  return !!a && !!b && a.size === b.size && a.mtimeMs === b.mtimeMs;
}

// Backs up the pristine source file before we touch it — but only
// once per manifest key, ever, so re-running the script (or later
// re-optimising after a manual edit) never overwrites an earlier,
// possibly-higher-quality backup with an already-compressed one.
function backupOriginal(absPath, manifestKey) {
  const backupPath = path.join(BACKUP_DIR, manifestKey);
  if (fs.existsSync(backupPath)) return;

  if (DRY_RUN) return;

  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(absPath, backupPath);

  // Verify the copy is byte-for-byte the right size before trusting
  // it as a safety net.
  const srcSize = fs.statSync(absPath).size;
  const backupSize = fs.statSync(backupPath).size;
  if (srcSize !== backupSize) {
    throw new Error(
      "Backup verification failed for " +
        manifestKey +
        " (source " +
        srcSize +
        " bytes, backup " +
        backupSize +
        " bytes) — aborting before any original is modified."
    );
  }
}

async function encodeAtBestQuality(pipeline, format, qualityTiers) {
  let buffer = null;
  for (let i = 0; i < qualityTiers.length; i++) {
    const quality = qualityTiers[i];
    const encoder =
      format === "jpeg"
        ? pipeline.clone().jpeg({ quality: quality, mozjpeg: true })
        : pipeline.clone().webp({ quality: quality });

    buffer = await encoder.toBuffer();

    const isLastTier = i === qualityTiers.length - 1;
    if (buffer.length <= TARGET_MAX_BYTES || isLastTier) {
      return buffer;
    }
  }
  return buffer;
}

// Returns { buffer, outputExt } or null if the file should be left
// exactly as-is (already small/optimal enough that re-encoding isn't
// worth doing).
async function optimiseImageBuffer(absPath, ext) {
  const isConvertible = [".heic", ".heif"].includes(ext);
  const originalSize = fs.statSync(absPath).size;

  const image = sharp(absPath, { failOn: "none" }).rotate(); // bakes in EXIF orientation, avoids cross-browser rotation bugs
  const resized = image.resize({
    width: MAX_LONG_EDGE_PX,
    height: MAX_LONG_EDGE_PX,
    fit: "inside",
    withoutEnlargement: true
  });

  if (isConvertible) {
    const buffer = await encodeAtBestQuality(
      resized,
      "webp",
      [CONVERTED_WEBP_QUALITY]
    );
    return { buffer: buffer, outputExt: ".webp" };
  }

  if (originalSize <= TARGET_MIN_USEFUL_BYTES) {
    // Already tiny — recompressing a very small file risks making it
    // bigger (re-encoding overhead) for no visible benefit.
    return null;
  }

  if (ext === ".png") {
    const buffer = await resized
      .clone()
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
    return { buffer: buffer, outputExt: ".png" };
  }

  if (ext === ".webp") {
    const buffer = await encodeAtBestQuality(resized, "webp", WEBP_QUALITY_TIERS);
    return { buffer: buffer, outputExt: ".webp" };
  }

  // .jpg / .jpeg — keep whichever spelling the file already used
  // (ext is already lower-cased by the caller); only HEIC/HEIF
  // conversion and uppercase-extension normalisation should ever
  // change a filename, per "prefer preserving the existing base
  // filenames".
  const buffer = await encodeAtBestQuality(resized, "jpeg", JPEG_QUALITY_TIERS);
  return { buffer: buffer, outputExt: ext };
}

// relWithinModule is the path relative to the module's own folder
// (e.g. "stillness/stillness1.jpeg") — used for the module-scoped
// image directory. manifestKey additionally namespaces that by
// module name (e.g. "photographs/stillness/stillness1.jpeg") — used
// for the manifest and backup paths, so identical relative paths in
// different modules never collide.
async function processFile(absPath, relWithinModule, manifestKey, manifest, stats) {
  stats.scanned++;

  // rawExt preserves the on-disk casing (e.g. ".JPEG"); ext is the
  // lower-cased form used to pick an encoder. Comparing a result's
  // outputExt (always lower-case) against rawExt — not ext — is what
  // correctly detects "this needs renaming to a lower-case
  // extension" for case-sensitive hosts like Vercel, without
  // treating an already-lowercase .jpeg as needing to become .jpg.
  const rawExt = path.extname(absPath);
  const ext = rawExt.toLowerCase();
  const dir = path.dirname(absPath);
  const base = path.basename(absPath, rawExt);

  const currentSignature = signatureOf(absPath);
  if (signaturesMatch(manifest[manifestKey], currentSignature)) {
    stats.skippedUnchanged++;
    return;
  }

  let result;
  try {
    result = await optimiseImageBuffer(absPath, ext);
  } catch (err) {
    stats.errors.push({ file: manifestKey, error: err.message });
    console.error("  ! Failed to process " + manifestKey + ": " + err.message);
    return;
  }

  if (!result) {
    stats.skippedSmall++;
    return;
  }

  const originalSize = fs.statSync(absPath).size;
  const isConverting = result.outputExt !== rawExt;

  if (!isConverting && result.buffer.length >= originalSize) {
    // Re-encoding didn't help — never replace with something larger.
    stats.skippedNoGain++;
    manifest[manifestKey] = currentSignature; // still record so we don't re-check every run
    stats.totalBefore += originalSize;
    stats.totalAfter += originalSize;
    return;
  }

  backupOriginal(absPath, manifestKey);

  const newAbsPath = path.join(dir, base + result.outputExt);

  if (!DRY_RUN) {
    fs.writeFileSync(newAbsPath, result.buffer);

    // Verify the written file is valid and non-empty before removing
    // anything.
    const verify = await sharp(newAbsPath).metadata();
    if (!verify.width || !verify.height) {
      throw new Error(
        "Verification failed for " + newAbsPath + " — refusing to delete source."
      );
    }

    if (isConverting) {
      fs.unlinkSync(absPath);
    }
  }

  if (!DRY_RUN) {
    const newManifestKey = isConverting
      ? manifestKey.slice(0, -rawExt.length) + result.outputExt
      : manifestKey;
    manifest[newManifestKey] = signatureOf(newAbsPath);
    if (isConverting) delete manifest[manifestKey];
  }

  stats.totalBefore += originalSize;
  stats.totalAfter += result.buffer.length;

  if (isConverting) {
    stats.converted++;
    console.log(
      "  converted  " +
        manifestKey +
        "  →  " +
        base +
        result.outputExt +
        "  (" +
        formatBytes(originalSize) +
        " → " +
        formatBytes(result.buffer.length) +
        ")"
    );
  } else {
    stats.compressed++;
    console.log(
      "  compressed " +
        manifestKey +
        "  (" +
        formatBytes(originalSize) +
        " → " +
        formatBytes(result.buffer.length) +
        ")"
    );
  }
}

async function main() {
  console.log(
    (DRY_RUN ? "[dry run] " : "") +
      "Optimising images in " +
      path.relative(PROJECT_ROOT, GALLERY_ROOT) +
      "/{" +
      MODULE_NAMES.join(",") +
      "}\n"
  );

  const manifest = loadManifest();
  const stats = {
    scanned: 0,
    converted: 0,
    compressed: 0,
    skippedUnchanged: 0,
    skippedSmall: 0,
    skippedNoGain: 0,
    totalBefore: 0,
    totalAfter: 0,
    errors: []
  };

  for (const module of MODULES) {
    const moduleDir = path.join(GALLERY_ROOT, module.name);
    if (!fs.existsSync(moduleDir)) continue;

    // A "group" is one folder actually holding image files directly:
    // for a nested module (Photographs, Drawings) that's each
    // collection subfolder; for a flat module (Concerts) it's the
    // module folder itself, since there are no subcategories.
    const groups = module.flat
      ? [{ label: module.name, dir: moduleDir }]
      : listCollectionFolders(moduleDir).map((folder) => ({
          label: module.name + "/" + folder,
          dir: path.join(moduleDir, folder)
        }));

    for (const group of groups) {
      const entries = fs
        .readdirSync(group.dir, { withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => e.name)
        .filter((name) => isImageFile(name) || isConvertibleFile(name));

      if (!entries.length) continue;

      console.log(group.label + "/ (" + entries.length + " files)");

      for (const name of entries) {
        const absPath = path.join(group.dir, name);
        const relWithinModule = path.relative(moduleDir, absPath);
        const manifestKey = module.name + "/" + relWithinModule;
        await processFile(absPath, relWithinModule, manifestKey, manifest, stats);
      }
    }
  }

  saveManifest(manifest);

  const skippedTotal =
    stats.skippedUnchanged + stats.skippedSmall + stats.skippedNoGain;

  console.log("\n" + "=".repeat(50));
  console.log((DRY_RUN ? "[dry run] " : "") + "Optimisation summary");
  console.log("=".repeat(50));
  console.log("Files scanned:     " + stats.scanned);
  console.log("Converted:         " + stats.converted + " (HEIC/HEIF → WebP)");
  console.log("Compressed:        " + stats.compressed);
  console.log(
    "Skipped:           " +
      skippedTotal +
      "  (" +
      stats.skippedUnchanged +
      " unchanged since last run, " +
      stats.skippedSmall +
      " already small, " +
      stats.skippedNoGain +
      " no size gain)"
  );
  console.log("Original total size: " + formatBytes(stats.totalBefore));
  console.log("Final total size:    " + formatBytes(stats.totalAfter));
  if (stats.totalBefore > 0) {
    const savedPct =
      (1 - stats.totalAfter / stats.totalBefore) * 100;
    console.log("Reduction:           " + savedPct.toFixed(1) + "%");
  }
  if (stats.errors.length) {
    console.log("\nErrors (" + stats.errors.length + "):");
    stats.errors.forEach((e) => console.log("  - " + e.file + ": " + e.error));
  } else {
    console.log("Errors:              none");
  }
  if (!DRY_RUN) {
    console.log(
      "\nOriginal files are backed up in " +
        path.relative(PROJECT_ROOT, BACKUP_DIR) +
        "/ (not committed to git, not deployed)."
    );
  }
}

main().catch((err) => {
  console.error("\nOptimisation failed:", err);
  process.exit(1);
});
