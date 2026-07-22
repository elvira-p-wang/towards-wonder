#!/usr/bin/env node
/*
  Regenerates every Gallery module's data file from whatever is
  actually on disk in images/gallery/<module>/ — so adding a new
  photo/drawing (or a whole new folder) and re-running this script is
  the only step needed to get it showing on the site, no manual
  editing of image paths, counts, or aspect ratios.

  Covers all three Gallery modules — Photographs, Drawings and
  Concerts — from one shared pipeline (see MODULES below). Each
  module's *-data.js is GENERATED — see the banner it writes at its
  own top. Hand edits to a module's collection *images* arrays there
  will be overwritten next run. Collection copy (title/sentence/
  placeholder count) lives in this script's MODULES config instead,
  so editing wording means editing this script, not a generated file.

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
const GALLERY_ROOT = path.join(PROJECT_ROOT, "images", "gallery");
const DATA_DIR = path.join(PROJECT_ROOT, "gallery", "data");
const INDEX_HTML_PATH = path.join(PROJECT_ROOT, "index.html");

const ASPECT_CYCLE = ["portrait", "square", "landscape", "tall", "wide"];

// EDIT POINT — one entry per Gallery module. `collectionsMeta` is
// each module's own COLLECTIONS_META: collection copy (title/
// sentence/placeholder count) and the folder it expects under
// images/gallery/<module.name>/. `folder` doesn't have to match `id`
// exactly (see photographs' "landscapes", whose folder is the
// singular "landscape"). A collection with no matching folder yet
// keeps showing `placeholderCount` quiet numbered tiles, exactly as
// today, until that folder exists.
//
// `inRotation` (default true — omit it for the common case) controls
// two derived, generated things per module: whether a collection's id
// appears in that module's <module>-rooms.js room order (what the
// page actually shows as a switchable room — n/a for `flat` modules
// like Concerts, which have no room switcher), and whether its images
// count toward the live total patched into its homepage entrance
// panel. Set it to false for a collection that should stay in the
// data (in case it's needed again) without being part of the public
// exhibition — Editor's Selection and Details today.
//
// `mode` is "masonry" (fixed aspect keyword + real aspectRatio, cropped
// photo-stream rhythm — Photographs, Concerts) or "editorial" (natural
// aspectRatio only, matted individual-work tiles — Drawings). `flat`
// means the module has no subcategories: images live directly in
// images/gallery/<module.name>/ rather than in per-collection
// subfolders, and the module gets no room switcher (see Concerts).
const MODULES = [
  {
    name: "photographs",
    mode: "masonry",
    flat: false,
    galleryDir: path.join(GALLERY_ROOT, "photographs"),
    outputDataPath: path.join(DATA_DIR, "photographs-data.js"),
    outputRoomsPath: path.join(DATA_DIR, "photographs-rooms.js"),
    dataVar: "PHOTOGRAPHS_DATA",
    roomsVar: "PHOTOGRAPHS_ROOM_ORDER",
    panelClass: "gallery-panel--photographs",
    collectionsMeta: [
      {
        id: "editors-selection",
        title: "Editor’s Selection",
        sentence: "The images I keep returning to.",
        featured: true,
        folder: "editors-selection",
        placeholderCount: 10,
        inRotation: false
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
      {
        id: "details",
        title: "Details",
        sentence: "What is easy to miss, kept anyway.",
        folder: "details",
        placeholderCount: 14,
        inRotation: false
      }
    ]
  },
  {
    name: "drawings",
    mode: "editorial",
    flat: false,
    galleryDir: path.join(GALLERY_ROOT, "drawings"),
    outputDataPath: path.join(DATA_DIR, "drawings-data.js"),
    outputRoomsPath: path.join(DATA_DIR, "drawings-rooms.js"),
    dataVar: "DRAWINGS_DATA",
    roomsVar: "DRAWINGS_ROOM_ORDER",
    panelClass: "gallery-panel--drawings",
    collectionsMeta: [
      {
        id: "sketches",
        title: "Sketches",
        sentence: "Quick records of places, people and passing moments.",
        folder: "sketches",
        placeholderCount: 10,
        aspects: ["3 / 4", "4 / 3", "1 / 1", "2 / 3"],
        featuredIndexes: [1]
      },
      {
        id: "illustrations",
        title: "Illustrations",
        sentence: "Ideas developed through line, colour and form.",
        // folder is singular ("illustration") — matches the folder
        // name actually used on disk, same precedent as photographs'
        // landscapes/landscape (folder doesn't have to match id).
        folder: "illustration",
        placeholderCount: 10,
        aspects: ["3 / 4", "4 / 5", "1 / 1"],
        featuredIndexes: [4],
        // Elvira asked for illustrations specifically (not the other
        // Drawings categories) to be free to shuffle for a better-
        // looking layout — see reorderForLayoutRhythm() below. Real
        // illustration images are reordered by measured aspect ratio
        // instead of kept in filename order.
        layoutSort: true
      },
      {
        id: "comics",
        title: "Comics",
        sentence: "Small stories told in sequence.",
        folder: "comic",
        placeholderCount: 8,
        aspects: ["3 / 2"],
        featuredIndexes: []
      },
      {
        id: "graphic-designs",
        title: "Graphic Designs",
        sentence: "Thinking in visuals.",
        folder: "graphic design",
        placeholderCount: 8,
        aspects: ["4 / 3", "1 / 1", "3 / 4"],
        featuredIndexes: [2, 6],
        // Now 8 real images (was 3) — same dead-space reasoning as
        // illustrations applies once a category has enough images to
        // fill a 3-column editorial grid: reorder by measured aspect
        // ratio instead of raw filename order. No sequence/order
        // dependency here (unlike comics), so free to shuffle.
        layoutSort: true
      },
      {
        id: "information-designs",
        title: "Information Designs",
        sentence: "Making complex ideas easier to see.",
        // folder matches the folder name actually used on disk
        // (singular "information design", same precedent as
        // "graphic design"/"illustration" above — folder doesn't have
        // to match id).
        folder: "information design",
        placeholderCount: 8,
        aspects: ["4 / 3", "1 / 1", "3 / 4"],
        featuredIndexes: [],
        layoutSort: true
      }
    ]
  },
  {
    name: "concerts",
    mode: "masonry",
    flat: false,
    galleryDir: path.join(GALLERY_ROOT, "concerts"),
    outputDataPath: path.join(DATA_DIR, "concerts-data.js"),
    outputRoomsPath: null,
    dataVar: "CONCERTS_DATA",
    roomsVar: null,
    panelClass: "gallery-panel--concerts",
    collectionsMeta: [
      {
        // No subcategories (see CLAUDE.md → "Gallery architecture") —
        // this is the only entry, so there's still only ever one
        // collection/grid, no room switcher. Images live one level
        // down, in images/gallery/concerts/concerts/ (same subfolder
        // convention as every other module's collections). `title`/
        // `sentence` here are left empty on purpose: concerts.html
        // shows "Concerts" / "Moments carried by music." once, in its
        // own page header, not a second time in the collection intro
        // (see gallery.js buildCollectionSection, which skips the
        // intro block entirely when title is empty).
        id: "concerts",
        title: "",
        sentence: "",
        folder: "concerts",
        placeholderCount: 12
      }
    ]
  }
];

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

async function buildRealImages(mode, moduleName, collectionId, moduleDir, folderName, flat) {
  const folderPath = flat ? moduleDir : path.join(moduleDir, folderName);
  const filenames = listImageFiles(folderPath);

  const images = [];
  for (let i = 0; i < filenames.length; i++) {
    const filename = filenames[i];
    const absPath = path.join(folderPath, filename);
    const aspectRatio = await readAspectRatio(absPath);
    const srcSuffix = flat ? filename : folderName + "/" + filename;

    const image = {
      id: collectionId + "-" + String(i + 1).padStart(3, "0"),
      src: "../images/gallery/" + moduleName + "/" + srcSuffix,
      alt: "",
      aspectRatio: aspectRatio
    };

    if (mode === "editorial") {
      image.category = collectionId;
    } else {
      image.aspect = ASPECT_CYCLE[i % ASPECT_CYCLE.length];
    }

    images.push(image);
  }
  return images;
}

// Reorders a collection's real images by measured aspect ratio for a
// better-looking fixed-column grid, rather than filename order. Only
// used where a collectionsMeta entry sets `layoutSort: true` (today
// just Drawings' "illustrations" — Elvira asked for that one category
// specifically to be free to shuffle for a nicer overall layout).
//
// Why this matters here: .exhibit-grid--editorial is a plain 3-column
// CSS grid with align-items: start, not a masonry layout — a row's
// track height is set by its tallest item, and shorter neighbours in
// that same row just leave dead space beneath them rather than
// reflowing. Grouping images with closely-matched height-per-width
// into the same row of `columns` avoids that dead space. Rows are
// then interleaved short/tall/short/tall (rather than left as a
// strict short-to-tall ramp) so the grid still reads as varied, not
// mechanically graduated, while each row's own three images stay
// close in height. Deterministic and re-run-safe: same input images
// always produce the same order, and adding a new photo only nudges
// rows near its own height, so this is fine to run on every generate.
function reorderForLayoutRhythm(images, columns = 3) {
  const withRatio = images.map((img) => {
    const [w, h] = img.aspectRatio.split(" / ").map(Number);
    return { img, heightPerWidth: h / w };
  });
  withRatio.sort((a, b) => a.heightPerWidth - b.heightPerWidth);

  // Only chunk whole rows into the zigzag — a leftover partial row
  // (when the count isn't a multiple of `columns`) is set aside and
  // appended at the very end instead. Interleaving a short leftover
  // row into the middle would shift every row after it by however
  // many images are missing, silently misaligning each "sorted row"
  // from the actual on-screen row boundaries and defeating the whole
  // point (an outlier-height image would land next to two unrelated
  // neighbours instead of its intended row-mates).
  const fullRowCount = Math.floor(withRatio.length / columns);
  const rows = [];
  for (let i = 0; i < fullRowCount * columns; i += columns) {
    rows.push(withRatio.slice(i, i + columns).map((entry) => entry.img));
  }
  const leftover = withRatio.slice(fullRowCount * columns).map((entry) => entry.img);

  const orderedRows = [];
  let lo = 0;
  let hi = rows.length - 1;
  let takeLow = true;
  while (lo <= hi) {
    if (takeLow) {
      orderedRows.push(rows[lo]);
      lo++;
    } else {
      orderedRows.push(rows[hi]);
      hi--;
    }
    takeLow = !takeLow;
  }

  return orderedRows.flat().concat(leftover);
}

function formatRealImagesLiteral(images, mode) {
  const lines = images.map((img) => {
    const parts = [
      "id: " + JSON.stringify(img.id),
      "src: " + JSON.stringify(img.src),
      "alt: " + JSON.stringify(img.alt)
    ];
    if (mode === "editorial") {
      parts.push("category: " + JSON.stringify(img.category));
    } else {
      parts.push("aspect: " + JSON.stringify(img.aspect));
    }
    parts.push("aspectRatio: " + JSON.stringify(img.aspectRatio));
    return "        { " + parts.join(", ") + " }";
  });
  return "[\n" + lines.join(",\n") + "\n      ]";
}

function placeholderCallLiteral(mode, meta) {
  if (mode === "editorial") {
    return (
      "makeImages(" +
      JSON.stringify(meta.id) +
      ", " +
      meta.placeholderCount +
      ", " +
      JSON.stringify(meta.id) +
      ", " +
      JSON.stringify(meta.aspects || ["4 / 5"]) +
      ", " +
      JSON.stringify(meta.featuredIndexes || []) +
      ")"
    );
  }
  return (
    "makeImages(" +
    JSON.stringify(meta.id) +
    ", " +
    meta.placeholderCount +
    ", ASPECT_CYCLE)"
  );
}

function formatCollectionEntry(meta, imagesLiteral) {
  const parts = [
    "id: " + JSON.stringify(meta.id),
    "title: " + JSON.stringify(meta.title),
    "sentence: " + JSON.stringify(meta.sentence)
  ];
  if (meta.featured) parts.push("featured: true");
  parts.push("images: " + imagesLiteral);

  return "      {\n        " + parts.join(",\n        ") + "\n      }";
}

function formatMasonryOutput(module, collectionEntries, liveTotalCount) {
  return (
    "/*\n" +
    "  GENERATED FILE — do not hand-edit the collections below.\n" +
    "  Produced by scripts/generate-gallery-data.js from whatever is\n" +
    "  actually in images/gallery/" +
    module.name +
    "/ plus that module's\n" +
    "  collectionsMeta in this script's MODULES config. To add photos:\n" +
    "  drop them in the right images/gallery/" +
    module.name +
    "/" +
    (module.flat ? "" : "<folder>/") +
    " and run\n" +
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
    "  window." +
    module.dataVar +
    " = {\n" +
    "    totalCount: " +
    liveTotalCount +
    ",\n" +
    "    collections: [\n" +
    collectionEntries.join(",\n") +
    "\n" +
    "    ]\n" +
    "  };\n" +
    "\n" +
    "})();\n"
  );
}

function formatEditorialOutput(module, collectionEntries, liveTotalCount) {
  return (
    "/*\n" +
    "  GENERATED FILE — do not hand-edit the collections below.\n" +
    "  Produced by scripts/generate-gallery-data.js from whatever is\n" +
    "  actually in images/gallery/" +
    module.name +
    "/<category>/ plus that\n" +
    "  module's collectionsMeta in this script's MODULES config. To add\n" +
    "  art: drop it in the right images/gallery/" +
    module.name +
    "/<category>/ and\n" +
    "  run `npm run generate-gallery` (or `npm run prepare-gallery` to\n" +
    "  also optimise it first) — do not edit this file directly, it\n" +
    "  will be overwritten.\n" +
    "\n" +
    "  Each drawing keeps its own aspectRatio (no forced cropping) so\n" +
    "  the editorial grid shows it at natural proportions — see\n" +
    '  gallery.js createTile() for how this is consumed (mode "editorial").\n' +
    "  Fields auto-derived from a real file: id, src, alt (blank),\n" +
    "  category, aspectRatio. title/year/medium/dimensions/description\n" +
    "  stay unset until filled in by hand — this script invents no real\n" +
    "  artwork info.\n" +
    "\n" +
    "  Loaded as a plain script (not fetch()) — see CLAUDE.md →\n" +
    '  "Gallery architecture" for why.\n' +
    "*/\n" +
    "\n" +
    "(function () {\n" +
    "\n" +
    "  // Placeholder generator for collections without a matching real-\n" +
    "  // art folder yet (see scripts/generate-gallery-data.js).\n" +
    "  function makeImages(collectionId, count, category, aspects, featuredIndexes) {\n" +
    "    var images = [];\n" +
    "    featuredIndexes = featuredIndexes || [];\n" +
    "    for (var i = 1; i <= count; i++) {\n" +
    "      images.push({\n" +
    '        id: collectionId + "-" + String(i).padStart(3, "0"),\n' +
    "        src: null,\n" +
    "        thumbnail: null,\n" +
    '        alt: "",\n' +
    "        category: category,\n" +
    "        aspectRatio: aspects[(i - 1) % aspects.length],\n" +
    "        featured: featuredIndexes.indexOf(i) !== -1,\n" +
    "        order: i\n" +
    "      });\n" +
    "    }\n" +
    "    return images;\n" +
    "  }\n" +
    "\n" +
    "  window." +
    module.dataVar +
    " = {\n" +
    "    totalCount: " +
    liveTotalCount +
    ",\n" +
    "    collections: [\n" +
    collectionEntries.join(",\n") +
    "\n" +
    "    ]\n" +
    "  };\n" +
    "\n" +
    "})();\n"
  );
}

async function generateModule(module) {
  console.log("Scanning " + path.relative(PROJECT_ROOT, module.galleryDir));

  const foldersOnDisk = module.flat
    ? []
    : listCollectionFolders(module.galleryDir);
  const knownFolders = new Set(
    module.collectionsMeta.map((m) => m.folder).filter(Boolean)
  );

  const collectionEntries = [];
  const summary = [];

  for (const meta of module.collectionsMeta) {
    const hasContent = module.flat
      ? listImageFiles(module.galleryDir).length > 0
      : meta.folder && foldersOnDisk.includes(meta.folder);

    if (hasContent) {
      let images = await buildRealImages(
        module.mode,
        module.name,
        meta.id,
        module.galleryDir,
        meta.folder,
        module.flat
      );

      if (meta.layoutSort && images.length > 0) {
        images = reorderForLayoutRhythm(images);
      }

      if (images.length === 0) {
        // Folder exists but is empty (or only had non-image files) —
        // fall back to the placeholder count rather than emitting an
        // empty, permanently-"More to come." room.
        summary.push({ id: meta.id, folder: meta.folder, count: 0, real: false });
        collectionEntries.push(
          formatCollectionEntry(meta, placeholderCallLiteral(module.mode, meta))
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
        formatCollectionEntry(meta, formatRealImagesLiteral(images, module.mode))
      );
    } else {
      summary.push({
        id: meta.id,
        folder: meta.folder,
        count: meta.placeholderCount,
        real: false
      });
      collectionEntries.push(
        formatCollectionEntry(meta, placeholderCallLiteral(module.mode, meta))
      );
    }
  }

  // Any folder on disk that isn't claimed by a known collection —
  // surfaced loudly rather than silently dropped, but not auto-wired
  // into the room order (that's a curatorial choice). Only meaningful
  // for non-flat modules, which have per-collection subfolders.
  const unclaimedFolders = module.flat
    ? []
    : foldersOnDisk.filter((f) => !knownFolders.has(f));
  for (const folder of unclaimedFolders) {
    const images = await buildRealImages(
      module.mode,
      module.name,
      folder,
      module.galleryDir,
      folder,
      false
    );
    if (!images.length) continue;

    const autoTitle = titleCase(folder);
    console.warn(
      '  ! Found an unrecognised folder "' +
        folder +
        '" with ' +
        images.length +
        " image(s) in " +
        module.name +
        "/. Added it to " +
        path.basename(module.outputDataPath) +
        ' as "' +
        folder +
        '" / "' +
        autoTitle +
        '" with a placeholder sentence — please edit the title/' +
        "sentence in this module's collectionsMeta " +
        "(scripts/generate-gallery-data.js) and add its id to the room " +
        "order if it should appear in the exhibition."
    );

    summary.push({
      id: folder,
      folder: folder,
      count: images.length,
      real: true,
      unclaimed: true
    });
    collectionEntries.push(
      formatCollectionEntry(
        {
          id: folder,
          title: autoTitle,
          sentence: "New " + module.name + ", not yet described."
        },
        formatRealImagesLiteral(images, module.mode)
      )
    );
  }

  // Which collections are actually part of the public exhibition —
  // drives both this module's rooms file and its live entrance-panel
  // count below. Unclaimed folders are deliberately excluded here too
  // (see the warning above): appearing in the data isn't the same as
  // being wired into the rotation, which stays a curatorial decision.
  const roomOrder = module.collectionsMeta
    .filter((meta) => meta.inRotation !== false)
    .map((meta) => meta.id);
  const roomOrderSet = new Set(roomOrder);

  const liveTotalCount = summary
    .filter((s) => roomOrderSet.has(s.id))
    .reduce((sum, s) => sum + s.count, 0);

  const output =
    module.mode === "editorial"
      ? formatEditorialOutput(module, collectionEntries, liveTotalCount)
      : formatMasonryOutput(module, collectionEntries, liveTotalCount);

  fs.mkdirSync(path.dirname(module.outputDataPath), { recursive: true });
  fs.writeFileSync(module.outputDataPath, output);

  if (module.outputRoomsPath) {
    const roomOrderOutput =
      "/*\n" +
      "  GENERATED FILE — do not hand-edit. Produced by\n" +
      "  scripts/generate-gallery-data.js from this module's\n" +
      "  collectionsMeta `inRotation` flags. Single source of truth for\n" +
      "  which " +
      titleCase(module.name) +
      " collections are actually shown as\n" +
      "  switchable rooms, and in what order — read by " +
      module.name +
      ".html\n" +
      "  (passed straight to initRooms()) and by gallery-preload.js (to\n" +
      '  know which collection is "first" for its idle-time warm-up), so\n' +
      "  both stay in sync with " +
      path.basename(module.outputDataPath) +
      " automatically.\n" +
      "*/\n" +
      "\n" +
      "window." +
      module.roomsVar +
      " = " +
      JSON.stringify(roomOrder) +
      ";\n";

    fs.writeFileSync(module.outputRoomsPath, roomOrderOutput);
  }

  console.log("Collections:");
  summary.forEach((s) => {
    const label = s.real
      ? s.count + " real photo(s) from " + s.folder + "/"
      : s.count +
        " placeholder tile(s)" +
        (s.folder ? " (no " + s.folder + "/ folder yet)" : "");
    console.log(
      "  " +
        s.id +
        ": " +
        label +
        (s.unclaimed ? "  [unclaimed folder]" : "") +
        (roomOrderSet.has(s.id) || module.flat ? "" : "  [not in rotation]")
    );
  });

  console.log(
    "\nWrote " +
      path.relative(PROJECT_ROOT, module.outputDataPath) +
      (module.outputRoomsPath
        ? "\nWrote " +
          path.relative(PROJECT_ROOT, module.outputRoomsPath) +
          " — room order: " +
          roomOrder.join(", ")
        : "")
  );

  return { panelClass: module.panelClass, liveTotalCount: liveTotalCount };
}

// Patch each module's live photo count into index.html's Gallery
// entrance panel — scoped tightly to that module's own panel-count
// span so the other two panels' counts are never touched.
function patchPanelCounts(indexHtml, results) {
  let html = indexHtml;

  results.forEach((result) => {
    const countText =
      result.liveTotalCount + (result.liveTotalCount === 1 ? " work" : " works");
    // Matches the panel's class attribute even if it carries extra
    // classes after its own (e.g. "gallery-panel gallery-panel--x
    // reveal-up" from the scroll-reveal system) — anchored on the
    // module's own panel class rather than requiring it to be the
    // last one before the closing quote.
    const panelRegex = new RegExp(
      '(class="gallery-panel ' +
        result.panelClass +
        '(?:\\s[^"]*)?"[\\s\\S]*?<span class="gallery-panel-count">)([^<]*)(<\\/span>)'
    );

    if (panelRegex.test(html)) {
      html = html.replace(
        panelRegex,
        (_match, before, _oldCount, after) => before + countText + after
      );
      console.log(
        "Updated index.html Gallery entrance panel count (" +
          result.panelClass +
          ") → " +
          countText
      );
    } else {
      console.warn(
        "  ! Could not find " +
          result.panelClass +
          " gallery-panel-count in index.html — left it unchanged."
      );
    }
  });

  return html;
}

async function main() {
  const results = [];

  for (const module of MODULES) {
    const result = await generateModule(module);
    results.push(result);
    console.log("");
  }

  const indexHtml = fs.readFileSync(INDEX_HTML_PATH, "utf8");
  const patchedHtml = patchPanelCounts(indexHtml, results);
  if (patchedHtml !== indexHtml) {
    fs.writeFileSync(INDEX_HTML_PATH, patchedHtml);
  }
}

main().catch((err) => {
  console.error("\nGeneration failed:", err);
  process.exit(1);
});
