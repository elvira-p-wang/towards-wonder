#!/usr/bin/env node
/*
  Regenerates gallery/data/photographs-data.js from whatever is
  actually on disk in images/gallery/photographs/ — so adding a new
  photo (or a whole new folder) and re-running this script is the
  only step needed to get it showing on the site, no manual editing
  of image paths, counts, or aspect ratios.

  This file is GENERATED — see the banner it writes at the top of
  photographs-data.js. Hand edits to the collection *images* arrays
  there will be overwritten next run. Collection copy (title/sentence
  /placeholder count) lives in COLLECTIONS_META below instead, so
  editing wording means editing this script, not the generated file.

  Usage:
    node scripts/generate-gallery-data.js

  Run via npm run generate-gallery (see package.json), ideally after
  npm run optimise-gallery (or just npm run prepare-gallery for both).
*/

"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const { listCollectionFolders, listImageFiles } = require("./lib/gallery-fs");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const GALLERY_DIR = path.join(
  PROJECT_ROOT,
  "images",
  "gallery",
  "photographs"
);
const OUTPUT_PATH = path.join(
  PROJECT_ROOT,
  "gallery",
  "data",
  "photographs-data.js"
);

// EDIT POINT — collection copy and room order live here, not in the
// generated file. `folder` is the expected subfolder name under
// images/gallery/photographs/ — it doesn't have to match `id`
// exactly (see "landscapes", whose folder is the singular
// "landscape"). A collection with no matching folder yet keeps
// showing `placeholderCount` quiet numbered tiles, exactly as today,
// until that folder exists.
const ASPECT_CYCLE = ["portrait", "square", "landscape", "tall", "wide"];

const COLLECTIONS_META = [
  {
    id: "editors-selection",
    title: "Editor’s Selection",
    sentence: "The images I keep returning to.",
    featured: true,
    folder: "editors-selection",
    placeholderCount: 10
  },
  {
    id: "stillness",
    title: "Stillness",
    sentence: "Where time slows down.",
    folder: "stillness",
    placeholderCount: 16
  },
  {
    id: "light",
    title: "Light",
    sentence: "Where the light decided the frame.",
    folder: "light",
    placeholderCount: 16
  },
  {
    id: "presence",
    title: "Presence",
    sentence: "Lives passing gently.",
    folder: "presence",
    placeholderCount: 14
  },
  {
    id: "landscapes",
    title: "Landscapes",
    sentence: "Places too large to hold in one frame.",
    folder: "landscape",
    placeholderCount: 16
  },

];

// Decorative figure shown on the Gallery entrance panel only — not a
// live count of the arrays below. Preserved as-is; bump it by hand
// if it should change.
const TOTAL_COUNT = 257;

function titleCase(slug) {
  return slug
    .split(/[-_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function readAspectRatio(absPath) {
  const meta = await sharp(absPath).metadata();
  let width = meta.width;
  let height = meta.height;

  // EXIF orientations 5–8 are rotated 90°; swap so the ratio matches
  // what actually renders (sharp reports pre-rotation dimensions).
  if (meta.orientation && meta.orientation >= 5 && meta.orientation <= 8) {
    const swap = width;
    width = height;
    height = swap;
  }

  return width + " / " + height;
}

async function buildRealImages(collectionId, folderName) {
  const folderPath = path.join(GALLERY_DIR, folderName);
  const filenames = listImageFiles(folderPath);

  const images = [];
  for (let i = 0; i < filenames.length; i++) {
    const filename = filenames[i];
    const absPath = path.join(folderPath, filename);
    const aspectRatio = await readAspectRatio(absPath);

    images.push({
      id: collectionId + "-" + String(i + 1).padStart(3, "0"),
      src:
        "../images/gallery/photographs/" +
        folderName +
        "/" +
        filename,
      alt: "",
      aspect: ASPECT_CYCLE[i % ASPECT_CYCLE.length],
      aspectRatio: aspectRatio
    });
  }
  return images;
}

function formatRealImagesLiteral(images) {
  const lines = images.map((img) => {
    return (
      "        { id: " +
      JSON.stringify(img.id) +
      ", src: " +
      JSON.stringify(img.src) +
      ", alt: " +
      JSON.stringify(img.alt) +
      ", aspect: " +
      JSON.stringify(img.aspect) +
      ", aspectRatio: " +
      JSON.stringify(img.aspectRatio) +
      " }"
    );
  });
  return "[\n" + lines.join(",\n") + "\n      ]";
}

function formatCollectionEntry(meta, imagesLiteral) {
  const parts = [
    "id: " + JSON.stringify(meta.id),
    "title: " + JSON.stringify(meta.title),
    "sentence: " + JSON.stringify(meta.sentence)
  ];
  if (meta.featured) parts.push("featured: true");
  parts.push("images: " + imagesLiteral);

  return (
    "      {\n        " + parts.join(",\n        ") + "\n      }"
  );
}

async function main() {
  console.log("Scanning " + path.relative(PROJECT_ROOT, GALLERY_DIR) + "\n");

  const foldersOnDisk = listCollectionFolders(GALLERY_DIR);
  const knownFolders = new Set(
    COLLECTIONS_META.map((m) => m.folder).filter(Boolean)
  );

  const collectionEntries = [];
  const summary = [];

  for (const meta of COLLECTIONS_META) {
    const hasFolder = meta.folder && foldersOnDisk.includes(meta.folder);

    if (hasFolder) {
      const images = await buildRealImages(meta.id, meta.folder);

      if (images.length === 0) {
        // Folder exists but is empty (or only had non-image files) —
        // fall back to the placeholder count rather than emitting an
        // empty, permanently-"More to come." room.
        summary.push({ id: meta.id, folder: meta.folder, count: 0, real: false });
        collectionEntries.push(
          formatCollectionEntry(
            meta,
            "makeImages(" +
              JSON.stringify(meta.id) +
              ", " +
              meta.placeholderCount +
              ", ASPECT_CYCLE)"
          )
        );
        continue;
      }

      summary.push({
        id: meta.id,
        folder: meta.folder,
        count: images.length,
        real: true
      });
      collectionEntries.push(
        formatCollectionEntry(meta, formatRealImagesLiteral(images))
      );
    } else {
      summary.push({
        id: meta.id,
        folder: meta.folder,
        count: meta.placeholderCount,
        real: false
      });
      collectionEntries.push(
        formatCollectionEntry(
          meta,
          "makeImages(" +
            JSON.stringify(meta.id) +
            ", " +
            meta.placeholderCount +
            ", ASPECT_CYCLE)"
        )
      );
    }
  }

  // Any folder on disk that isn't claimed by a known collection —
  // surfaced loudly rather than silently dropped, but not auto-wired
  // into photographs.html's room order (that's a curatorial choice).
  const unclaimedFolders = foldersOnDisk.filter((f) => !knownFolders.has(f));
  for (const folder of unclaimedFolders) {
    const images = await buildRealImages(folder, folder);
    if (!images.length) continue;

    const autoTitle = titleCase(folder);
    console.warn(
      "  ! Found an unrecognised folder \"" +
        folder +
        "\" with " +
        images.length +
        " image(s). Added it to photographs-data.js as \"" +
        folder +
        '" / "' +
        autoTitle +
        '" with a placeholder sentence — please edit the title/' +
        "sentence in COLLECTIONS_META (scripts/generate-gallery-data.js) " +
        "and add its id to photographs.html's room order if it should " +
        "appear in the exhibition."
    );

    summary.push({ id: folder, folder: folder, count: images.length, real: true, unclaimed: true });
    collectionEntries.push(
      formatCollectionEntry(
        {
          id: folder,
          title: autoTitle,
          sentence: "New photographs, not yet described."
        },
        formatRealImagesLiteral(images)
      )
    );
  }

  const output =
    "/*\n" +
    "  GENERATED FILE — do not hand-edit the collections below.\n" +
    "  Produced by scripts/generate-gallery-data.js from whatever is\n" +
    "  actually in images/gallery/photographs/ plus the collection copy\n" +
    "  in that script's COLLECTIONS_META. To add photographs: drop them\n" +
    "  in the right images/gallery/photographs/<folder>/ and run\n" +
    "  `npm run generate-gallery` (or `npm run prepare-gallery` to also\n" +
    "  optimise them first) — do not edit this file directly, it will\n" +
    "  be overwritten.\n" +
    "\n" +
    "  Loaded as a plain script (not fetch()) — see CLAUDE.md →\n" +
    '  "Gallery architecture" for why.\n' +
    "*/\n" +
    "\n" +
    "(function () {\n" +
    "\n" +
    "  var ASPECT_CYCLE = " +
    JSON.stringify(ASPECT_CYCLE) +
    ";\n" +
    "\n" +
    "  // Placeholder generator for collections without a matching real-\n" +
    "  // photo folder yet (see scripts/generate-gallery-data.js).\n" +
    "  function makeImages(collectionId, count, aspects) {\n" +
    "    var images = [];\n" +
    "    for (var i = 1; i <= count; i++) {\n" +
    "      images.push({\n" +
    '        id: collectionId + "-" + String(i).padStart(3, "0"),\n' +
    "        src: null,\n" +
    '        alt: "",\n' +
    "        aspect: aspects[(i - 1) % aspects.length]\n" +
    "      });\n" +
    "    }\n" +
    "    return images;\n" +
    "  }\n" +
    "\n" +
    "  window.PHOTOGRAPHS_DATA = {\n" +
    "    totalCount: " +
    TOTAL_COUNT +
    ",\n" +
    "    collections: [\n" +
    collectionEntries.join(",\n") +
    "\n" +
    "    ]\n" +
    "  };\n" +
    "\n" +
    "})();\n";

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, output);

  console.log("Collections:");
  summary.forEach((s) => {
    const label = s.real
      ? s.count + " real photo(s) from " + s.folder + "/"
      : s.count + " placeholder tile(s)" + (s.folder ? " (no " + s.folder + "/ folder yet)" : "");
    console.log("  " + s.id + ": " + label + (s.unclaimed ? "  [unclaimed folder]" : ""));
  });

  console.log(
    "\nWrote " + path.relative(PROJECT_ROOT, OUTPUT_PATH)
  );
}

main().catch((err) => {
  console.error("\nGeneration failed:", err);
  process.exit(1);
});
