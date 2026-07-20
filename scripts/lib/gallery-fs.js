/*
  Shared filesystem helpers for the two gallery scripts
  (optimise-gallery-images.js and generate-gallery-data.js) — kept in
  one place so "what counts as a gallery image" and "how are files
  ordered" can't drift apart between the two.
*/

"use strict";

const fs = require("fs");
const path = require("path");

// EDIT POINT — supported source formats. Matched case-insensitively,
// so .JPG/.Jpeg/.PNG/.WEBP all count too.
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const CONVERTIBLE_EXTENSIONS = [".heic", ".heif"];

function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

function isConvertibleFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return CONVERTIBLE_EXTENSIONS.includes(ext);
}

// True for any file this pipeline should look at at all — real
// images plus HEIC/HEIF awaiting conversion. Everything else
// (.DS_Store, manifests, stray non-image files) is ignored.
function isGalleryCandidate(filename) {
  return isImageFile(filename) || isConvertibleFile(filename);
}

// Natural sort — "presence2" before "presence10" before "presence100"
// — by splitting each name into runs of digits vs. non-digits and
// comparing digit runs numerically. Falls back to plain string
// comparison for the non-digit runs.
function naturalCompare(a, b) {
  const re = /(\d+)|(\D+)/g;
  const partsA = a.match(re) || [];
  const partsB = b.match(re) || [];
  const len = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < len; i++) {
    const partA = partsA[i];
    const partB = partsB[i];

    if (partA === undefined) return -1;
    if (partB === undefined) return 1;

    const numA = /^\d+$/.test(partA) ? Number(partA) : null;
    const numB = /^\d+$/.test(partB) ? Number(partB) : null;

    if (numA !== null && numB !== null) {
      if (numA !== numB) return numA - numB;
    } else if (partA !== partB) {
      return partA < partB ? -1 : 1;
    }
  }

  return 0;
}

// Lists immediate subdirectories of `dir` (one level — each is a
// collection folder), skipping dotfiles/hidden folders.
function listCollectionFolders(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

// Lists gallery-candidate files directly inside one collection
// folder (non-recursive within a collection — images live flat in
// their folder), naturally sorted by filename.
function listImageFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isGalleryCandidate(entry.name))
    .map((entry) => entry.name)
    .sort(naturalCompare);
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }
  return (bytes / 1024).toFixed(1) + " KB";
}

module.exports = {
  IMAGE_EXTENSIONS,
  CONVERTIBLE_EXTENSIONS,
  isImageFile,
  isConvertibleFile,
  isGalleryCandidate,
  naturalCompare,
  listCollectionFolders,
  listImageFiles,
  formatBytes
};
