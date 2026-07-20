/*
  Drawings data — JSON-shaped, loaded as a plain script (not fetch()).
  See photographs-data.js and CLAUDE.md → "Gallery architecture" for
  the reasoning and the convention for adding real artwork later.

  Unlike Photographs (fixed aspect keywords for a masonry rhythm),
  each drawing carries its own `aspectRatio` so the editorial grid on
  drawings.html can show it at its natural proportions — nothing here
  is force-cropped. See gallery.js createTile() for how this field is
  consumed (mode "editorial").

  Schema per artwork — every field beyond id/src/alt/aspectRatio is
  optional and left unset on placeholders (this file invents no real
  titles, mediums or descriptions; only structural/layout fields are
  filled in):
    id            unique string, e.g. "sketches-004"
    src           image path once real art exists, else null (renders
                   the same numbered placeholder tile Photographs uses)
    thumbnail     optional smaller src for future use — gallery.js
                   doesn't read this yet, kept for forward-compatibility
    alt           short alt text (fill in alongside src)
    title         optional, shown in the lightbox meta line
    category      "sketches" | "illustrations" | "comics" |
                   "visual-thoughts" — drives the medium-specific grid
                   rhythm (gallery.js adds it as a tile class; comics
                   gets a wider card, see style.css .exhibit-tile--comics)
    year          optional, shown in the lightbox meta line
    medium        optional, shown in the lightbox meta line
    dimensions    optional, not yet surfaced in the UI
    description   optional, not yet surfaced in the UI
    aspectRatio   CSS aspect-ratio value, e.g. "3 / 4"
    featured      optional — spans 2 grid columns (.exhibit-tile--span2)
    sequence      optional { group, page } — comic pages that belong
                   together; not yet used to build a carousel, just
                   metadata for whenever that's worth building
    order         optional explicit sort position — the array order
                   is authoritative today, this is here for whenever
                   content needs reordering independent of array order
*/

(function () {

  function makeImages(collectionId, count, category, aspects, featuredIndexes) {
    var images = [];
    featuredIndexes = featuredIndexes || [];

    for (var i = 1; i <= count; i++) {
      images.push({
        id: collectionId + "-" + String(i).padStart(3, "0"),
        src: null,
        thumbnail: null,
        alt: "",
        category: category,
        aspectRatio: aspects[(i - 1) % aspects.length],
        featured: featuredIndexes.indexOf(i) !== -1,
        order: i
      });
    }
    return images;
  }

  var sketches = makeImages(
    "sketches",
    10,
    "sketches",
    ["3 / 4", "4 / 3", "1 / 1", "2 / 3"],
    [1]
  );

  var illustrations = makeImages(
    "illustrations",
    10,
    "illustrations",
    ["3 / 4", "4 / 5", "1 / 1"],
    [4]
  );

  // Comics: two placeholder "stories", each a run of sequential pages
  // sharing a `sequence.group` — the wide "comics" category card
  // (style.css .exhibit-tile--comics) keeps panels legible without
  // cropping them down to a square.
  var comics = [];
  ["morning-walk", "studio-notes"].forEach(function (group) {
    for (var page = 1; page <= 4; page++) {
      comics.push({
        id: "comics-" + group + "-" + page,
        src: null,
        thumbnail: null,
        alt: "",
        category: "comics",
        aspectRatio: "3 / 2",
        featured: false,
        sequence: { group: group, page: page },
        order: comics.length + 1
      });
    }
  });

  var visualThoughts = makeImages(
    "visual-thoughts",
    8,
    "visual-thoughts",
    ["4 / 3", "1 / 1", "3 / 4"],
    [2, 6]
  );

  window.DRAWINGS_DATA = {
    totalCount:
      sketches.length + illustrations.length + comics.length + visualThoughts.length,
    collections: [
      {
        id: "sketches",
        title: "Sketches",
        sentence: "Quick records of places, people and passing moments.",
        images: sketches
      },
      {
        id: "illustrations",
        title: "Illustrations",
        sentence: "Ideas developed through line, colour and form.",
        images: illustrations
      },
      {
        id: "comics",
        title: "Comics",
        sentence: "Small stories told in sequence.",
        images: comics
      },
      {
        id: "visual-thoughts",
        title: "Visual Thoughts",
        sentence: "Questions and observations worked out on paper.",
        images: visualThoughts
      }
    ]
  };

})();
