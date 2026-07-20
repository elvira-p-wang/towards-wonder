/*
  Photographs data — JSON-shaped, loaded as a plain script (not fetch()),
  so the site still opens by double-clicking index.html with no local
  server required. See CLAUDE.md → "Gallery architecture" for why.

  To add real photographs: give an image its `src` (path under
  ../images/gallery/photographs/) and a short `alt`. Until then, `src`
  stays null and the page renders a quiet placeholder tile instead.

  To add more images to a collection, just raise the count passed to
  makeImages() or push extra objects onto that collection's `images`
  array — nothing else needs to change.
*/

(function () {

  var ASPECT_CYCLE = ["portrait", "square", "landscape", "tall", "wide"];

  function makeImages(collectionId, count, aspects) {
    var images = [];
    for (var i = 1; i <= count; i++) {
      images.push({
        id: collectionId + "-" + String(i).padStart(3, "0"),
        src: null,
        alt: "",
        aspect: aspects[(i - 1) % aspects.length]
      });
    }
    return images;
  }

  window.PHOTOGRAPHS_DATA = {
    totalCount: 257,
    collections: [
      {
        id: "editors-selection",
        title: "Editor’s Selection",
        sentence: "The images I keep returning to.",
        featured: true,
        images: makeImages("editors-selection", 10, ASPECT_CYCLE)
      },
      {
        id: "stillness",
        title: "Stillness",
        sentence: "Moments that asked nothing of me.",
        images: makeImages("stillness", 16, ASPECT_CYCLE)
      },
      {
        id: "light",
        title: "Light",
        sentence: "Where the light decided the frame.",
        images: makeImages("light", 16, ASPECT_CYCLE)
      },
      {
        id: "human-traces",
        title: "Human Traces",
        sentence: "Evidence that someone was here.",
        images: makeImages("human-traces", 14, ASPECT_CYCLE)
      },
      {
        id: "landscapes",
        title: "Landscapes",
        sentence: "Places too large to hold in one frame.",
        images: makeImages("landscapes", 16, ASPECT_CYCLE)
      },
      {
        id: "details",
        title: "Details",
        sentence: "What is easy to miss, kept anyway.",
        images: makeImages("details", 14, ASPECT_CYCLE)
      }
    ]
  };

})();
