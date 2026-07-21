/* ========================================
   TRAVEL GLOBE — "A Map of Curiosity"

   A quiet, hand-drawn-feeling 3D globe: a warm ivory sphere with soft
   beige continent silhouettes, rotating very slowly on its own,
   draggable (mouse + touch) with inertia, zoomable, and marked with
   small dots at every place Elvira has visited. Deliberately not a
   realistic, textured Earth (no satellite imagery, no ocean-blue, no
   borders or labels — that reads as Google Earth or a data
   dashboard) and not a travel tracker (no pins-with-photos, no flight
   lines, no counters). Flat, soft-edged continent fills read as a
   painted atlas, not a technical wireframe — the latitude/longitude
   grid is kept, but only as a whisper, mostly hidden beneath the
   landmasses (see "GRATICULE" below).

   No rendering library is used — the sphere is a handful of shapes
   drawn with 2D canvas + basic trigonometry, in keeping with the
   site's zero-runtime-dependency convention (see CLAUDE.md).

   Data — GLOBE_LOCATIONS, below — is the single source of truth for
   both the markers on the globe and the note panel's content, same
   "data file, not hand-authored markup" convention as the Gallery.
   Adding, removing or repositioning a place is a one-line edit here;
   nothing in index.html needs to change.

   Fields:
     id        stable string, used for DOM state (no display role)
     name      place name — shown as the note panel's heading
     lat, lon  approximate real-world coordinates in degrees, used to
               place the marker on the sphere. These are real places
               (not the old map's aesthetic-only positions), so a few
               are geographically close together (Western/Northern
               Europe especially) and their markers will sit near one
               another on the globe — that's accurate rather than a
               bug, and matches how a real desk globe's pins would
               cluster too. Hovering brings a marker forward and
               reveals its name so a tight cluster stays legible.
     meta      short poetic subtitle (2–3 words), shown under the
               place name in the note panel
     sentence  the reflection: how the place changed her, not what
               she did there
     link      path to a full travel note, or null if none exists yet
               — when null, "Read travel note →" is simply omitted
========================================= */

const GLOBE_LOCATIONS = [
  {
    id: 'china',
    name: 'China',
    lat: 39.9,
    lon: 116.4,
    meta: 'Where everything began',
    sentence: 'My lovely Sheltie understands Chinese but refuses to acknowledge English.',
    link: null
  },
  {
    id: 'australia',
    name: 'Australia',
    lat: -33.87,
    lon: 151.21,
    meta: 'Still becoming home',
    sentence: 'Somehow the magpies accepted me before I accepted myself.',
    link: null
  },
  {
    id: 'new-zealand',
    name: 'New Zealand',
    lat: -36.85,
    lon: 174.76,
    meta: 'Power out. Kindness on.',
    sentence: 'Tekapo went dark after a helicopter struck a power line. A stranger lent me their power bank.',
    link: null
  },
  {
    id: 'japan',
    name: 'Japan',
    lat: 35.68,
    lon: 139.69,
    meta: 'Tiny acts of care',
    sentence: 'Even convenience stores felt like someone genuinely tried.',
    link: null
  },
  {
    id: 'maldives',
    name: 'Maldives',
    lat: 3.2,
    lon: 73.2,
    meta: 'Island time',
    sentence: 'The hardest decision each day was whether to swim before or after lunch.',
    link: null
  },
  {
    id: 'sri-lanka',
    name: 'Sri Lanka',
    lat: 6.93,
    lon: 79.85,
    meta: 'Small classrooms, big smiles',
    sentence: "I don't remember every lesson, but I remember every goodbye.",
    link: null
  },
  {
    id: 'germany',
    name: 'Germany',
    lat: 52.52,
    lon: 13.4,
    meta: 'No unnecessary creativity',
    sentence: 'The spicy burger came with exactly one chilli. Perfectly vertical.',
    link: null
  },
  {
    id: 'united-kingdom',
    name: 'United Kingdom',
    lat: 51.51,
    lon: -0.13,
    meta: 'Oxford or Cambridge?',
    sentence: "That was my childhood dilemma.",
    link: null
  },
  {
    id: 'austria',
    name: 'Austria',
    lat: 47.5,
    lon: 14.5,
    meta: 'Gravity stayed consistent',
    sentence: "My skiing didn't, but I kept getting back up.",
    link: null
  },
  {
    id: 'luxembourg',
    name: 'Luxembourg',
    lat: 49.61,
    lon: 6.13,
    meta: 'Small country. Many languages.',
    sentence: 'Public transport was free. Every conversation took me somewhere new.',
    link: null
  },
  {
    id: 'france',
    name: 'France',
    lat: 48.86,
    lon: 2.35,
    meta: 'Skipped the Eiffel Tower souvenir',
    sentence: 'Brought home a hautbois carrying the scent of wood instead.',
    link: null
  },
  {
    id: 'italy',
    name: 'Italy',
    lat: 43.77,
    lon: 11.26,
    meta: 'Danced with strangers',
    sentence: 'Went home with the wedding flowers.',
    link: null
  },
  {
    id: 'denmark',
    name: 'Denmark',
    lat: 55.68,
    lon: 12.57,
    meta: 'Summer light',
    sentence: 'Where quiet design taught me that simplicity can still feel alive.',
    link: null
  },
  {
    id: 'norway',
    name: 'Norway',
    lat: 61.5,
    lon: 7.0,
    meta: 'Auroras danced first',
    sentence: "Everything after that somehow felt possible.",
    link: null
  },
  {
    id: 'sweden',
    name: 'Sweden',
    lat: 59.33,
    lon: 18.07,
    meta: 'Island life, briefly',
    sentence: 'We arrived by kayak and stayed for three days.',
    link: null
  },
  {
    id: 'finland',
    name: 'Finland',
    lat: 60.17,
    lon: 24.94,
    meta: 'Met Santa',
    sentence: '"Apparently, so had my country\'s president."',
    link: null
  },
  {
    id: 'estonia',
    name: 'Estonia',
    lat: 58.38,
    lon: 26.72,
    meta: 'Old meets tomorrow',
    sentence: 'It somehow felt medieval and futuristic at the same time.',
    link: null
  },
  {
    id: 'indonesia',
    name: 'Indonesia',
    lat: -8.34,
    lon: 115.09,
    meta: 'The wind knew every lyric',
    sentence: 'I sang all the way on the back of a motorbike.',
    link: null
  }
];

const DEFAULT_LOCATION_ID = 'denmark';

/* ========================================
   CONTINENT SILHOUETTES

   Hand-placed at real coastline landmarks (capes, gulfs, deltas,
   peninsulas — traced from memory, not a traced/imported geographic
   dataset — network access to fetch one wasn't reliably available in
   this environment), at meaningfully higher density than a first pass
   (~320 points across 17 landmasses, vs. ~15 points per continent
   before) specifically so the silhouettes read as real coastlines
   rather than geometric low-poly blobs. Every continent plus the
   handful of islands that matter for this site's own marker list
   (UK, Ireland, Japan, New Zealand, Sri Lanka, and Indonesia's four
   main islands) are included; Madagascar is included too since it's
   large enough to otherwise read as a conspicuous gap. At the size
   these render (soft-filled, no stroke), this is still a "loose,
   recognizable at a glance" silhouette, not survey-grade accuracy —
   in keeping with "clear but very subtle", not a GIS export.
   Each ring is `[lat, lon]` pairs, in order around the shape's edge —
   closed automatically (last point connects back to the first).
========================================= */

const RAW_CONTINENTS = [
  {
    name: 'africa',
    points: [
      [37.3, 10.2], [33.9, 13.2], [31.2, 25.2], [31.5, 32.3], [29.5, 32.6],
      [27.8, 34.5], [22.0, 36.9], [15.6, 39.5], [12.5, 43.3], [11.8, 51.3],
      [2.0, 45.3], [-0.4, 42.8], [-4.0, 39.7], [-6.8, 39.3], [-10.8, 40.5],
      [-18.0, 36.9], [-23.9, 35.4], [-27.8, 32.9], [-33.9, 25.6], [-34.4, 20.0],
      [-33.9, 18.4], [-29.9, 15.2], [-23.6, 14.5], [-17.9, 11.8], [-12.6, 13.4],
      [-6.0, 12.2], [0.4, 9.5], [3.9, 9.4], [4.0, 6.0], [5.6, 3.4],
      [5.3, -0.9], [4.9, -7.5], [7.2, -11.9], [10.8, -15.6], [14.7, -17.5],
      [20.9, -17.0], [27.7, -13.2], [33.6, -7.6], [35.8, -5.9], [36.8, 3.1]
    ]
  },
  {
    // Was a single "europe" ring that looped up through Scandinavia and
    // then doubled back down through the Baltic states to close near
    // its own starting region — a self-crossing path. Canvas fills
    // self-crossing polygons with the nonzero winding rule, so where
    // two lobes of the same ring overlapped with opposite winding
    // direction, their winding numbers cancelled out and that area
    // silently went unfilled — this is what made Norway disappear.
    // Fixed by splitting the Nordic peninsula into its own separate,
    // individually-simple rings (this one, plus denmark/norway/sweden/
    // finland below) rather than one large ring trying to thread the
    // Atlantic coast, the Baltic coast, *and* Scandinavia in one pass.
    // This ring now only traces mainland Europe (Iberia round through
    // France, the Low Countries, Germany, the Baltic coast down to the
    // Gulf of Finland, then an artificial closing edge approximating
    // the Europe/Asia land border down to the Black Sea, then Turkey,
    // Greece, the Balkans, Italy, and back to Iberia) — a single
    // continuous clockwise sweep with no backtracking, so it can't
    // self-intersect the way the old ring did.
    name: 'mainland-europe',
    points: [
      [37.0, -8.9], [38.7, -9.4], [41.1, -8.7], [43.4, -8.4], [43.5, -1.8],
      [47.2, -2.9], [49.4, 0.1], [51.0, 2.4], [51.9, 4.5], [53.5, 8.6],
      [54.8, 8.9], [54.0, 10.8], [54.4, 14.3], [54.2, 18.6], [54.7, 20.5],
      [56.9, 24.1], [59.4, 24.7], [60.0, 29.7], [50.0, 36.0], [46.5, 30.7],
      [45.4, 29.7], [43.4, 28.0], [41.0, 29.0], [38.4, 26.1], [37.9, 23.7],
      [39.6, 19.9], [42.5, 18.5], [45.5, 13.6], [41.9, 15.9], [40.6, 17.9],
      [38.1, 15.6], [40.8, 14.3], [43.7, 10.3], [44.1, 9.8], [43.7, 7.3],
      [43.3, 3.0], [41.4, 2.2], [39.5, -0.3], [36.7, -4.4], [36.0, -5.6]
    ]
  },
  {
    // Own marker (Denmark) — kept as a separate small ring rather than
    // folded into the mainland-europe trace above, both for accuracy
    // (Denmark is mostly islands/a thin peninsula, easy to mangle
    // inline) and so it can't ever again drag a neighbouring ring into
    // a self-crossing shape.
    name: 'denmark',
    points: [
      [57.7, 10.6], [57.1, 8.0], [55.5, 8.1], [54.8, 9.4], [55.5, 9.8],
      [55.3, 11.0], [55.7, 12.6], [56.0, 12.4], [56.5, 10.3]
    ]
  },
  {
    // Own marker (Norway). Closes via an approximate line down the
    // Scandinavian mountains (the Norway/Sweden land border), not a
    // coastline — there's no water there, but every ring needs some
    // closing edge, and the soft fill makes it invisible either way.
    name: 'norway',
    points: [
      [58.0, 7.0], [58.9, 5.7], [60.4, 5.0], [62.5, 6.0], [63.5, 10.4],
      [65.5, 12.0], [67.3, 14.4], [69.0, 18.0], [70.4, 25.8], [70.0, 29.0],
      [69.5, 30.0], [65.0, 14.0], [61.0, 12.0], [59.0, 11.5]
    ]
  },
  {
    // Own marker (Sweden).
    name: 'sweden',
    points: [
      [59.0, 11.5], [58.5, 11.3], [56.0, 12.8], [56.2, 15.6], [58.6, 17.0],
      [59.3, 18.1], [60.7, 17.1], [63.0, 19.0], [65.6, 22.2], [68.0, 20.0],
      [64.0, 14.5]
    ]
  },
  {
    // Own marker (Finland).
    name: 'finland',
    points: [
      [60.1, 19.9], [60.2, 24.9], [60.5, 27.0], [61.5, 29.0], [65.0, 29.5],
      [68.0, 28.5], [69.0, 27.0], [68.5, 23.0], [66.0, 23.5], [63.5, 21.0],
      [61.0, 21.3]
    ]
  },
  {
    // Not a marker, but large/recognizable enough that leaving it out
    // reads as a conspicuous gap in the North Atlantic.
    name: 'iceland',
    points: [
      [66.5, -14.5], [65.0, -13.5], [63.4, -19.0], [64.0, -22.0], [65.9, -24.0]
    ]
  },
  {
    // Not a marker, but one of the most recognizable shapes on any
    // world map — its absence near Canada would look like a mistake
    // rather than a deliberate simplification.
    name: 'greenland',
    points: [
      [83.0, -35.0], [81.0, -15.0], [76.0, -20.0], [70.0, -22.0], [65.0, -40.0],
      [60.0, -45.0], [62.0, -49.0], [68.0, -53.0], [76.0, -68.0], [81.0, -65.0]
    ]
  },
  {
    // Real coastline data treats Europe and Asia as one connected
    // Eurasian landmass (no ocean between them) — this ring picks up
    // roughly where mainland-europe's Ural/Black-Sea seam leaves off,
    // rather than being topologically welded to it. At this fill
    // style (soft, low-alpha, no stroke) the seam itself is invisible.
    name: 'asia',
    points: [
      [65.0, 60.0], [73.0, 80.0], [76.0, 104.0], [73.0, 140.0], [70.0, 161.0],
      [66.0, 172.0], [60.0, 166.0], [51.0, 157.0], [46.0, 142.0], [43.0, 132.0],
      [38.0, 128.0], [34.0, 126.0], [31.0, 122.0], [23.0, 117.0], [21.0, 108.0],
      [10.0, 106.0], [1.0, 104.0], [6.0, 100.0], [13.0, 100.0], [16.0, 96.0],
      [20.0, 93.0], [17.0, 82.0], [8.0, 77.0], [15.0, 74.0], [22.0, 70.0],
      [25.0, 67.0], [25.0, 61.0], [26.0, 56.0], [29.0, 49.0], [24.5, 51.5],
      [23.0, 58.0], [17.0, 54.0], [12.5, 45.0], [15.0, 42.5], [21.0, 39.0],
      [28.0, 35.0], [31.0, 35.0], [36.0, 36.0], [37.0, 28.0], [41.0, 29.0],
      [42.0, 41.0], [47.0, 52.0]
    ]
  },
  {
    // Own island — was previously missing entirely.
    name: 'taiwan',
    points: [
      [25.3, 121.8], [24.8, 121.9], [23.5, 121.5], [22.0, 120.7], [22.8, 120.2],
      [24.0, 120.6], [25.0, 121.5]
    ]
  },
  {
    name: 'north-america',
    points: [
      [71, -156], [69, -141], [69, -105], [63, -75], [58, -63],
      [52, -56], [47, -53], [45, -64], [44, -66],
      [43, -70], [42, -71], [40, -74], [38, -75], [36, -76], [34, -78],
      [32, -81], [30, -81], [25, -80], [25, -82], [30, -88], [29, -90],
      [29, -95], [26, -97], [22, -97], [19, -96], [16, -95], [15, -92],
      [9, -83], [16, -99], [20, -105], [23, -110], [27, -114], [32, -117],
      [34, -120], [38, -123], [42, -124], [46, -124], [49, -123], [55, -130],
      [58, -136], [60, -146], [57, -157], [65, -166]
    ]
  },
  {
    name: 'south-america',
    points: [
      [12, -72], [11, -70], [10, -64], [8, -60], [5, -52], [-1, -48],
      [-3, -40], [-5, -35], [-8, -35], [-13, -38], [-20, -40], [-23, -43],
      [-26, -48], [-30, -50], [-33, -53], [-35, -57], [-40, -62], [-45, -67],
      [-50, -69], [-53, -68], [-55, -68], [-52, -73], [-46, -75], [-42, -73],
      [-38, -73], [-33, -72], [-27, -71], [-20, -70], [-18, -70], [-12, -77],
      [-5, -81], [-2, -80], [1, -79], [4, -77], [8, -77]
    ]
  },
  {
    name: 'australia',
    points: [
      [-11, 132], [-12, 137], [-16, 140], [-13, 143], [-17, 146], [-23, 151],
      [-27, 153], [-32, 152], [-34, 151], [-38, 147], [-38, 145], [-35, 138],
      [-32, 133], [-32, 127], [-35, 118], [-32, 116], [-28, 114], [-22, 114],
      [-18, 122], [-14, 126], [-12, 131]
    ]
  },
  {
    name: 'united-kingdom',
    points: [
      [58.6, -3.0], [57.5, -4.0], [56.5, -6.2], [55.0, -5.6], [54.6, -3.6],
      [53.4, -3.0], [52.0, -4.8], [51.2, -3.2], [50.1, -5.7], [50.7, -1.9],
      [50.8, 0.3], [51.5, 1.4], [52.6, 1.7], [53.7, 0.2], [55.8, -1.9], [57.7, -2.0]
    ]
  },
  {
    name: 'ireland',
    points: [
      [55.2, -6.7], [54.8, -8.4], [53.3, -9.9], [51.5, -9.5], [52.1, -6.5],
      [53.3, -6.2], [54.6, -5.4]
    ]
  },
  {
    name: 'japan',
    points: [
      [41.0, 140.5], [41.8, 140.3], [43.0, 141.0], [45.0, 141.8], [43.2, 144.8],
      [42.0, 141.5], [41.3, 140.8], [38.2, 140.9], [35.7, 139.8], [34.7, 137.7],
      [34.4, 132.5], [34.0, 131.0], [33.9, 130.9], [31.6, 130.6], [32.8, 129.9],
      [34.3, 131.1], [35.0, 132.7], [36.6, 137.2], [38.9, 139.8]
    ]
  },
  {
    name: 'new-zealand-north',
    points: [
      [34.4, 173.0], [35.3, 174.3], [36.8, 174.8], [37.7, 178.5], [39.3, 177.0],
      [41.3, 174.8], [39.9, 174.9], [38.0, 174.7], [36.4, 174.0]
    ]
  },
  {
    name: 'new-zealand-south',
    points: [
      [40.8, 173.9], [41.5, 174.2], [43.6, 172.7], [45.9, 170.5], [46.6, 169.1],
      [44.7, 167.9], [42.5, 171.2], [40.8, 172.1]
    ]
  },
  {
    name: 'sri-lanka',
    points: [
      [9.8, 80.1], [8.5, 81.2], [6.9, 81.9], [6.0, 80.4], [6.9, 79.9], [8.5, 79.9]
    ]
  },
  {
    name: 'madagascar',
    points: [
      [-12.3, 49.3], [-15.7, 50.2], [-19.8, 49.0], [-23.4, 47.6], [-25.6, 45.4],
      [-24.0, 43.7], [-21.3, 43.3], [-17.4, 44.0], [-15.4, 46.3], [-13.4, 48.3]
    ]
  },
  {
    name: 'sumatra',
    points: [
      [5.6, 95.3], [3.0, 98.5], [0.0, 102.0], [-3.5, 104.3], [-5.4, 105.2],
      [-4.5, 102.5], [-2.0, 100.5], [1.0, 99.0], [3.5, 96.5]
    ]
  },
  {
    name: 'java',
    points: [
      [-6.1, 106.0], [-6.9, 108.6], [-7.7, 111.4], [-8.2, 114.4], [-8.7, 113.0],
      [-8.4, 109.0], [-7.8, 106.5]
    ]
  },
  {
    name: 'borneo',
    points: [
      [4.2, 117.9], [1.0, 110.3], [-3.4, 114.6], [-2.0, 117.0], [1.0, 118.9]
    ]
  },
  {
    name: 'sulawesi',
    points: [
      [1.4, 124.8], [-1.5, 120.8], [-5.6, 119.4], [-3.0, 121.5], [-2.0, 123.0]
    ]
  }
];

(function initTravelGlobe() {
  const stageEl = document.getElementById('globeStage');
  const canvas = document.getElementById('globeCanvas');
  const noteEl = document.getElementById('globeNote');

  if (!stageEl || !canvas || !noteEl || !canvas.getContext) return;

  const ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------
     TUNABLES — EDIT POINT
  ---------------------------------------- */
  const BASE_RADIUS_RATIO = 0.58;    // sphere radius at zoom=1, as a fraction of min(width,height)/2
  const PERSPECTIVE_STRENGTH = 0.16; // how much nearer points bulge outward (fake perspective, no matrix math)
  const BASE_TILT_RAD = 0.24;        // constant axial tilt, like a desk globe's fixed lean (~14°)
  const MAX_PITCH_OFFSET = 0.45;     // how far a drag can additionally tilt the view, beyond the base tilt

  const DEFAULT_ZOOM = 1.62; // resting state — large enough to fill most of the stage and bleed past its edges
  const MIN_ZOOM = 0.6;      // zoomed all the way out — the whole sphere, with room around it
  const MAX_ZOOM = 2.5;      // zoomed all the way in — close, tactile, a lot of one hemisphere
  const ZOOM_LERP_SPEED = 9; // how quickly displayed zoom eases toward the target — smooth, not snappy
  const TRACKPAD_ZOOM_SENSITIVITY = 0.02;  // trackpad pinch / ctrl+wheel — the only wheel-zoom path now (see WHEEL_ROTATE_* below)

  const BASE_IDLE_SPEED = (Math.PI * 2) / 150; // one full turn every 150s — slow enough to feel like breathing, not spinning
  const DRAG_YAW_PER_PX = 0.016;      // 1 finger/mouse drag — deliberately closer to 1:1 with the pointer than a "map" would be, for a tactile, direct-manipulation feel
  const DRAG_PITCH_PER_PX = 0.011;    // if a vertical drag ever feels inverted, flip this sign
  const VELOCITY_SAMPLES = 4;         // rolling window used to smooth inertia's launch speed against a jittery last frame
  const INERTIA_FRICTION = 0.965;     // per ~16.7ms frame; higher = longer glide
  const INERTIA_STOP_EPS = 0.02;      // rad/s below which inertia is considered settled
  const RETURN_MS = 1300;             // easing back to the idle spin after inertia settles
  const FOCUS_TWEEN_MS = 1500;        // click-to-focus rotation duration
  const RESUME_IDLE_DELAY_MS = 60000; // how long the globe holds still after ANY interaction (drag/wheel/pinch settling, or a click-to-focus arrival) before its slow idle spin resumes — deliberately long, so there's real time to read a place's note before the globe starts drifting again

  // Trackpad two-finger swipe (and a plain mouse wheel) arrive as
  // non-ctrlKey `wheel` events — there's no separate "trackpad pan"
  // event on the web platform, so this is the only signal available.
  // ctrlKey-on-wheel is the browser's own convention for a pinch
  // gesture (trackpad pinch, or literal ctrl+scroll), handled
  // separately below as zoom. EDIT POINT: if plain mouse-wheel users
  // should zoom instead of rotate, gate this branch on a detected
  // input type — deliberately not done here, since the two can't be
  // reliably told apart from a single event, and unifying "wheel
  // always rotates, pinch always zooms" is simpler and matches how
  // Apple/Google's own map products behave.
  // Both deltas are negated in onWheel below. Under macOS's default
  // "natural scrolling", a two-finger swipe reports deltaX/deltaY in
  // the direction content would SCROLL, which is the opposite of the
  // direction the fingers moved — e.g. swiping right (finger moves
  // right) reports a negative deltaX. Direct-manipulation drag uses
  // dx>0 (pointer moved right) to mean "surface moves right", so
  // matching that feel for a swipe means flipping the sign on both
  // axes: swipe left-to-right rotates the globe left-to-right, swipe
  // bottom-to-top rotates it bottom-to-top, and so on for all 4
  // directions — the surface visually follows the fingers, the same
  // way a single-pointer drag already does.
  const WHEEL_ROTATE_YAW_PER_PX = 0.006;
  const WHEEL_ROTATE_PITCH_PER_PX = 0.0045;
  const WHEEL_VELOCITY_SAMPLES = 5;
  const WHEEL_GESTURE_IDLE_MS = 120; // no wheel events for this long = the swipe ended; settle into inertia

  // Graticule — kept only as a faint hint of structure, drawn *under*
  // the continents so it mostly disappears beneath the landmasses and
  // only shows through over open "ocean". Far fewer lines than a real
  // reference grid, and much lower contrast — see "should not
  // dominate" in the project brief.
  const MERIDIAN_LONS = [0, 90, 180, 270];
  const PARALLEL_LATS = [-45, 0, 45];
  const MERIDIAN_STEPS = 24;
  const PARALLEL_STEPS = 32;
  const GRID_BACK_ALPHA = 0.012;
  const GRID_FRONT_ALPHA = 0.07;
  const EQUATOR_BACK_ALPHA = 0.02;
  const EQUATOR_FRONT_ALPHA = 0.1;
  const LINE_WIDTH = 0.6;

  const CONTINENT_EDGE_STEPS = 3;     // interpolated points per polygon edge — lower than before since the authored rings are now dense enough on their own (~320 points across 17 landmasses)
  const CONTINENT_BACK_CUTOFF = 0.02; // stop drawing once a point dips behind this depth (keeps fill inside the sphere's rim)
  const CONTINENT_ALPHA_MIN = 0.24;   // near the horizon
  const CONTINENT_ALPHA_MAX = 0.44;   // front-facing — still "very subtle", never solid
  const CONTINENT_FILL_RGB = '196, 163, 128'; // soft beige

  const MARKER_HIDE_Z = -0.16; // fully hidden at/behind this depth
  const MARKER_SHOW_Z = 0.16;  // fully shown at/above this depth — fades smoothly in between

  /* ----------------------------------------
     STATE
  ---------------------------------------- */
  let cssWidth = 0, cssHeight = 0, centerX = 0, centerY = 0;
  let baseRadius = 0, radius = 0;
  let zoom = DEFAULT_ZOOM, targetZoom = DEFAULT_ZOOM;
  let yaw = 0;
  let pitchOffset = 0;
  let mode = 'idle'; // idle | dragging | inertia | returning | focusing | paused
  let velocityYaw = 0;
  let velocityPitch = 0;
  let dragState = null;
  let focusTween = null;
  let returnState = null;
  let resumeIdleTimer = null;
  let lastTime = null;

  // Multi-pointer tracking — a plain drag (1 pointer) rotates; two
  // pointers pinch-zoom instead. Handles the 2→1 and 1→0 transitions
  // so switching between them never causes a visual jump.
  const activePointers = new Map();
  let pinchState = null;

  let selectedId = DEFAULT_LOCATION_ID;
  let displayedId = null;
  let fadeTimer = null;

  const idleSpeed = reducedMotion ? 0 : BASE_IDLE_SPEED;
  const MAP_NOTE_FADE_MS = 220;

  /* ----------------------------------------
     MATH HELPERS
  ---------------------------------------- */
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function normalizeAngle(angle) {
    let a = angle % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function debounce(fn, wait) {
    let timer = null;
    return function debounced() {
      window.clearTimeout(timer);
      timer = window.setTimeout(fn, wait);
    };
  }

  /* ----------------------------------------
     GEOMETRY — a point's unrotated unit-sphere position depends only
     on its lat/lon, never on the current rotation, so every static
     shape (continents, graticule, markers) converts to `{x0,y0,z0}`
     exactly once, at init. Only the current frame's rotation trig
     (cosYaw/sinYaw/cosPitch/sinPitch) changes per frame; `rotate()`
     applies it with plain multiplication, no per-point trig calls.
     With ~1,000 continent/graticule points, this is the difference
     between a few trig calls a frame and several thousand.
  ---------------------------------------- */
  function toUnit(latDeg, lonDeg) {
    const latR = (latDeg * Math.PI) / 180;
    const lonR = (lonDeg * Math.PI) / 180;
    return {
      x0: Math.cos(latR) * Math.sin(lonR),
      y0: Math.sin(latR),
      z0: Math.cos(latR) * Math.cos(lonR)
    };
  }

  let cosYaw = 1, sinYaw = 0, cosPitch = 1, sinPitch = 0;

  function setRotationTrig(yawRad, pitchRad) {
    cosYaw = Math.cos(yawRad);
    sinYaw = Math.sin(yawRad);
    cosPitch = Math.cos(pitchRad);
    sinPitch = Math.sin(pitchRad);
  }

  function rotate(u) {
    const x1 = u.x0 * cosYaw + u.z0 * sinYaw;
    const z1 = -u.x0 * sinYaw + u.z0 * cosYaw;
    const y2 = u.y0 * cosPitch - z1 * sinPitch;
    const z2 = u.y0 * sinPitch + z1 * cosPitch;
    return { x: x1, y: y2, z: z2 };
  }

  function depthAlpha(z, backAlpha, frontAlpha) {
    const t = clamp((z + 1) / 2, 0, 1);
    return backAlpha + (frontAlpha - backAlpha) * t;
  }

  /* ----------------------------------------
     CANVAS SIZING
  ---------------------------------------- */
  function resizeCanvas() {
    const rect = stageEl.getBoundingClientRect();
    cssWidth = rect.width;
    cssHeight = rect.height;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    centerX = cssWidth / 2;
    centerY = cssHeight / 2;
    baseRadius = Math.min(cssWidth, cssHeight) * 0.5 * BASE_RADIUS_RATIO;
  }

  /* ----------------------------------------
     PRECOMPUTED SHAPES (unit vectors, built once)
  ---------------------------------------- */
  function densifyRing(points, stepsPerEdge) {
    const ring = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      for (let s = 0; s < stepsPerEdge; s++) {
        const t = s / stepsPerEdge;
        ring.push(toUnit(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t));
      }
    }
    return ring;
  }

  const CONTINENTS = RAW_CONTINENTS.map(c => ({
    name: c.name,
    ring: densifyRing(c.points, CONTINENT_EDGE_STEPS)
  }));

  function buildGraticule(steps, isMeridian) {
    return function (value) {
      const ring = [];
      for (let i = 0; i <= steps; i++) {
        if (isMeridian) {
          const lat = -90 + (180 * i) / steps;
          ring.push(toUnit(lat, value));
        } else {
          const lon = (360 * i) / steps;
          ring.push(toUnit(value, lon));
        }
      }
      return { value, ring };
    };
  }
  const MERIDIANS = MERIDIAN_LONS.map(buildGraticule(MERIDIAN_STEPS, true));
  const PARALLELS = PARALLEL_LATS.map(buildGraticule(PARALLEL_STEPS, false));

  /* ----------------------------------------
     DRAWING — a painted sphere, not a photographed one: the light
     source stays fixed at the upper-left regardless of rotation, so
     the shading reads as suggested form rather than simulated light.
  ---------------------------------------- */
  function screenPoint(p) {
    const scale = 1 + p.z * PERSPECTIVE_STRENGTH;
    return {
      x: centerX + p.x * radius * scale,
      y: centerY - p.y * radius * scale
    };
  }

  function strokeRing(ring, alphaFn, lineWidth) {
    const rotated = ring.map(rotate);
    const avgZ = rotated.reduce((sum, p) => sum + p.z, 0) / rotated.length;
    const alpha = alphaFn(avgZ);
    if (alpha <= 0.008) return;

    ctx.beginPath();
    rotated.forEach((p, i) => {
      const s = screenPoint(p);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = `rgba(31, 27, 24, ${alpha})`;
    ctx.stroke();
  }

  function drawGraticule() {
    ctx.lineCap = 'round';
    MERIDIANS.forEach(m => strokeRing(m.ring, z => depthAlpha(z, GRID_BACK_ALPHA, GRID_FRONT_ALPHA), LINE_WIDTH));
    PARALLELS.forEach(p => {
      const isEquator = p.value === 0;
      strokeRing(
        p.ring,
        z => depthAlpha(z, isEquator ? EQUATOR_BACK_ALPHA : GRID_BACK_ALPHA, isEquator ? EQUATOR_FRONT_ALPHA : GRID_FRONT_ALPHA),
        isEquator ? LINE_WIDTH * 1.4 : LINE_WIDTH
      );
    });
  }

  // Fills a continent with the sphere's own curvature in mind: a ring
  // that dips behind the horizon is split into whichever contiguous
  // front-facing arcs remain, each filled on its own, rather than
  // drawing the raw (partly-hidden) polygon straight across the disc.
  function drawContinents() {
    CONTINENTS.forEach(continent => {
      const rotated = continent.ring.map(rotate);
      const runs = [];
      let current = [];

      rotated.forEach(p => {
        if (p.z > CONTINENT_BACK_CUTOFF) {
          current.push(p);
        } else if (current.length) {
          runs.push(current);
          current = [];
        }
      });

      if (current.length) {
        if (runs.length && rotated[0].z > CONTINENT_BACK_CUTOFF) {
          runs[0] = current.concat(runs[0]);
        } else {
          runs.push(current);
        }
      }

      runs.forEach(run => {
        if (run.length < 3) return;
        const avgZ = run.reduce((sum, p) => sum + p.z, 0) / run.length;
        const alpha = depthAlpha(avgZ, CONTINENT_ALPHA_MIN, CONTINENT_ALPHA_MAX);
        if (alpha <= 0.008) return;

        ctx.beginPath();
        run.forEach((p, i) => {
          const s = screenPoint(p);
          if (i === 0) ctx.moveTo(s.x, s.y);
          else ctx.lineTo(s.x, s.y);
        });
        ctx.closePath();
        ctx.fillStyle = `rgba(${CONTINENT_FILL_RGB}, ${alpha})`;
        ctx.fill();
      });
    });
  }

  function drawGlobe() {
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    if (radius <= 0) return;

    const lightX = centerX - radius * 0.38;
    const lightY = centerY - radius * 0.42;
    const bodyGradient = ctx.createRadialGradient(
      lightX, lightY, radius * 0.05,
      centerX, centerY, radius * 1.05
    );
    bodyGradient.addColorStop(0, '#fffaf3');
    bodyGradient.addColorStop(0.55, '#f8efe1');
    bodyGradient.addColorStop(1, '#eeddc4');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = bodyGradient;
    ctx.fill();

    // Grid first, continents on top — over open "ocean" the grid
    // still shows faintly through; under a landmass it quietly
    // disappears, the way it would on a real printed globe.
    drawGraticule();
    drawContinents();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(31, 27, 24, 0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /* ----------------------------------------
     MARKERS — real DOM buttons (for hover/focus/click and
     accessibility), repositioned every frame from the same rotation
     used to draw the sphere, so they always sit exactly on its
     surface as it turns.
  ---------------------------------------- */
  function updateMarkers() {
    GLOBE_LOCATIONS.forEach(location => {
      const el = location._el;
      if (!el) return;

      const p = rotate(location._unit);
      const s = screenPoint(p);
      const markerScale = 0.82 + 0.3 * Math.max(0, p.z);
      const visibility = clamp(
        (p.z - MARKER_HIDE_Z) / (MARKER_SHOW_Z - MARKER_HIDE_Z),
        0,
        1
      );

      el.style.transform =
        'translate3d(' + s.x.toFixed(2) + 'px, ' + s.y.toFixed(2) + 'px, 0) ' +
        'translate(-50%, -50%) scale(' + markerScale.toFixed(3) + ')';
      el.style.opacity = visibility.toFixed(3);

      const hot = el.classList.contains('is-hot') || el.classList.contains('is-selected');
      el.style.zIndex = String(Math.round(200 + p.z * 100) + (hot ? 500 : 0));

      const interactive = visibility > 0.22;
      el.style.pointerEvents = interactive ? 'auto' : 'none';
      if (interactive) {
        el.removeAttribute('aria-hidden');
        el.tabIndex = 0;
      } else {
        el.setAttribute('aria-hidden', 'true');
        el.tabIndex = -1;
      }
    });
  }

  /* ----------------------------------------
     NOTE PANEL — hovering previews a location without disturbing the
     locked selection; leaving reverts to the selection, not to a
     default.
  ---------------------------------------- */
  function findLocation(id) {
    return GLOBE_LOCATIONS.find(location => location.id === id) || GLOBE_LOCATIONS[0];
  }

  function renderNote(location) {
    const metaHTML = location.meta
      ? `<p class="map-note-meta">${location.meta}</p>`
      : '';
    const linkHTML = location.link
      ? `<a href="${location.link}" class="text-link">Read travel note →</a>`
      : '';

    // Prev/next arrows sit either side of the name inside one flex
    // row (.map-note-heading, align-items: center) rather than being
    // positioned separately — that's what keeps their centerline
    // genuinely aligned with the name's, since flexbox centers both
    // against the row's actual content height, not a guessed offset.
    noteEl.innerHTML = `
      <p class="section-label">A Map of Curiosity</p>
      <div class="map-note-heading">
        <button type="button" class="map-note-arrow map-note-arrow--prev" aria-label="Previous place, west">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="11 6 5 12 11 18"/></svg>
        </button>
        <h3>${location.name}</h3>
        <button type="button" class="map-note-arrow map-note-arrow--next" aria-label="Next place, east">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
        </button>
      </div>
      ${metaHTML}
      <p>${location.sentence}</p>
      ${linkHTML}
    `;
  }

  function showLocation(id) {
    if (id === displayedId) return;
    displayedId = id;

    const location = findLocation(id);

    if (reducedMotion) {
      renderNote(location);
      return;
    }

    window.clearTimeout(fadeTimer);
    noteEl.classList.add('is-fading');

    fadeTimer = window.setTimeout(() => {
      renderNote(location);
      requestAnimationFrame(() => {
        noteEl.classList.remove('is-fading');
      });
    }, MAP_NOTE_FADE_MS);
  }

  function selectLocation(id) {
    selectedId = id;
    GLOBE_LOCATIONS.forEach(location => {
      if (location._el) {
        location._el.classList.toggle('is-selected', location.id === id);
      }
    });
  }

  /* ----------------------------------------
     CLICK-TO-FOCUS — clicking a marker doesn't just select it, it
     gently turns the globe so that place settles at the front, then
     holds still for a moment before quietly resuming its slow spin.
  ---------------------------------------- */
  function focusLocation(location) {
    const lonR = (location.lon * Math.PI) / 180;
    const targetYaw = yaw + normalizeAngle(-lonR - yaw);

    focusTween = {
      startYaw: yaw,
      deltaYaw: targetYaw - yaw,
      startPitch: pitchOffset,
      deltaPitch: -pitchOffset,
      startTime: null,
      duration: reducedMotion ? 1 : FOCUS_TWEEN_MS
    };

    window.clearTimeout(resumeIdleTimer);
    mode = 'focusing';
  }

  // Selects, displays and rotates to face a place in one call — the
  // shared "go here" action behind both a marker click and the note
  // panel's prev/next arrows below.
  function goToLocation(location) {
    selectLocation(location.id);
    showLocation(location.id);
    focusLocation(location);
  }

  /* ----------------------------------------
     PREV/NEXT BY LONGITUDE — the note panel's arrows step through
     GLOBE_LOCATIONS ordered west-to-east (ascending longitude) rather
     than in authoring order, so "left"/"right" matches where each
     place actually sits on the globe. Cyclic, same wraparound as the
     Gallery's room switcher: past the last (easternmost) place wraps
     back to the first (westernmost), and vice versa.
  ---------------------------------------- */
  const LOCATIONS_BY_LON = GLOBE_LOCATIONS.slice().sort((a, b) => a.lon - b.lon);

  function adjacentLocation(id, direction) {
    const index = LOCATIONS_BY_LON.findIndex(location => location.id === id);
    const from = index === -1 ? 0 : index;
    const nextIndex = (from + direction + LOCATIONS_BY_LON.length) % LOCATIONS_BY_LON.length;
    return LOCATIONS_BY_LON[nextIndex];
  }

  // Delegated (not bound per-render) since renderNote() replaces the
  // arrows' own DOM every time it runs — this survives that.
  noteEl.addEventListener('click', e => {
    const arrow = e.target.closest('.map-note-arrow');
    if (!arrow) return;
    const direction = arrow.classList.contains('map-note-arrow--prev') ? -1 : 1;
    goToLocation(adjacentLocation(selectedId, direction));
  });

  /* ----------------------------------------
     MARKER CONSTRUCTION
  ---------------------------------------- */
  function attachMarkerHandlers(location, el) {
    const preview = () => {
      stageEl.classList.add('is-warm');
      el.classList.add('is-hot');
      showLocation(location.id);
    };
    const unpreview = () => {
      stageEl.classList.remove('is-warm');
      el.classList.remove('is-hot');
      showLocation(selectedId);
    };

    el.addEventListener('pointerenter', preview);
    el.addEventListener('pointerleave', unpreview);
    el.addEventListener('focus', preview);
    el.addEventListener('blur', unpreview);

    el.addEventListener('click', () => goToLocation(location));
  }

  GLOBE_LOCATIONS.forEach(location => {
    location._unit = toUnit(location.lat, location.lon);

    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'globe-marker';
    el.dataset.locationId = location.id;
    el.setAttribute('aria-label', 'View ' + location.name + ' — ' + location.sentence);

    const dot = document.createElement('span');
    dot.className = 'globe-marker-dot';
    dot.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'globe-marker-label';
    label.textContent = location.name;
    label.setAttribute('aria-hidden', 'true');

    el.appendChild(dot);
    el.appendChild(label);
    stageEl.appendChild(el);

    location._el = el;
    attachMarkerHandlers(location, el);
  });

  /* ----------------------------------------
     DRAG + INERTIA + PINCH/WHEEL ZOOM + TRACKPAD SWIPE

     Three input sources all drive the same rotation, and hand off to
     each other without a jump:
       — a single mouse/touch pointer drags (1:1 with the pointer)
       — a second pointer switches to pinch-zoom instead (the first
         pointer's rotation is put down, not blended with the pinch)
       — a non-ctrlKey `wheel` event (Mac trackpad two-finger swipe,
         or a plain mouse wheel) rotates the same way a drag would

     Releasing back down to one finger resumes rotation from wherever
     that finger already is; ending a wheel gesture (a short silence
     between wheel events) hands off into the same velocity-smoothed
     inertia used after a drag. Nothing here ever resets yaw to a
     fixed value — only pitch eases back to the resting tilt — so the
     globe always keeps spinning on from wherever it currently is,
     like a real globe that's been nudged, never snapping back "home".
  ---------------------------------------- */
  function pointerDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function activePointerPair() {
    const values = Array.from(activePointers.values());
    return values.length >= 2 ? [values[0], values[1]] : null;
  }

  function beginSingleDrag(x, y) {
    window.clearTimeout(resumeIdleTimer);
    mode = 'dragging';
    dragState = { x, y, t: performance.now(), history: [] };
  }

  // Shared by every path that can end an interaction — drag release,
  // wheel-gesture end, inertia settling, and click-to-focus arrival:
  // holds the globe still for RESUME_IDLE_DELAY_MS (a real pause to
  // read a place's note, or just to keep exploring without the globe
  // drifting out from under you), then eases back up to the idle spin
  // via 'returning' rather than snapping straight to idle speed.
  function pauseThenResumeIdle() {
    mode = 'paused';
    window.clearTimeout(resumeIdleTimer);
    resumeIdleTimer = window.setTimeout(() => {
      if (mode !== 'paused') return;
      mode = 'returning';
      returnState = { startTime: null, startSpeed: 0, startPitch: pitchOffset };
    }, RESUME_IDLE_DELAY_MS);
  }

  // Shared by drag-release and wheel-gesture-end: averages recent
  // instantaneous velocity samples (rather than trusting only the
  // last one, which can be jittery) and decides whether to glide into
  // inertia or settle into the post-interaction pause.
  function settleRotation(history) {
    if (reducedMotion || !history || !history.length) {
      velocityYaw = 0;
      velocityPitch = 0;
    } else {
      const sum = history.reduce(
        (acc, s) => ({ vYaw: acc.vYaw + s.vYaw, vPitch: acc.vPitch + s.vPitch }),
        { vYaw: 0, vPitch: 0 }
      );
      velocityYaw = sum.vYaw / history.length;
      velocityPitch = sum.vPitch / history.length;
    }

    const settled =
      Math.abs(velocityYaw) < INERTIA_STOP_EPS && Math.abs(velocityPitch) < INERTIA_STOP_EPS;

    if (reducedMotion) {
      // No automatic animation under reduced motion — leave the globe
      // exactly where the direct drag left it, no ease-back-to-baseline.
      mode = 'idle';
    } else if (settled) {
      pauseThenResumeIdle();
    } else {
      mode = 'inertia';
    }
  }

  function onPointerDown(e) {
    if (e.target.closest && e.target.closest('.globe-marker')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.cancelable) e.preventDefault();

    if (stageEl.setPointerCapture) {
      try { stageEl.setPointerCapture(e.pointerId); } catch (err) { /* no-op */ }
    }

    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size >= 2) {
      dragState = null;
      window.clearTimeout(resumeIdleTimer);
      mode = 'dragging'; // umbrella "actively interacting" state; rotation just won't move without dragState
      const [a, b] = activePointerPair();
      pinchState = { startDistance: Math.max(1, pointerDistance(a, b)), startZoom: targetZoom };
    } else {
      beginSingleDrag(e.clientX, e.clientY);
    }
  }

  function onPointerMove(e) {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinchState && activePointers.size >= 2) {
      const [a, b] = activePointerPair();
      const dist = Math.max(1, pointerDistance(a, b));
      targetZoom = clamp(pinchState.startZoom * (dist / pinchState.startDistance), MIN_ZOOM, MAX_ZOOM);
      return;
    }

    if (mode !== 'dragging' || !dragState) return;

    const now = performance.now();
    const dt = Math.max(1, now - dragState.t);
    const dx = e.clientX - dragState.x;
    const dy = e.clientY - dragState.y;

    const dYaw = dx * DRAG_YAW_PER_PX;
    const dPitch = dy * DRAG_PITCH_PER_PX;

    yaw += dYaw;
    pitchOffset = clamp(pitchOffset + dPitch, -MAX_PITCH_OFFSET, MAX_PITCH_OFFSET);

    dragState.history.push({ vYaw: (dYaw / dt) * 1000, vPitch: (dPitch / dt) * 1000 });
    if (dragState.history.length > VELOCITY_SAMPLES) dragState.history.shift();

    dragState.x = e.clientX;
    dragState.y = e.clientY;
    dragState.t = now;
  }

  function onPointerEnd(e) {
    activePointers.delete(e.pointerId);

    if (activePointers.size >= 2) {
      // Still pinching with the remaining pointers — rebase so the
      // zoom doesn't jump when one finger lifts and another stays.
      const [a, b] = activePointerPair();
      pinchState = { startDistance: Math.max(1, pointerDistance(a, b)), startZoom: targetZoom };
      return;
    }

    pinchState = null;

    if (activePointers.size === 1) {
      const remaining = Array.from(activePointers.values())[0];
      beginSingleDrag(remaining.x, remaining.y);
      return;
    }

    if (mode !== 'dragging') return;
    const history = dragState ? dragState.history : null;
    dragState = null;
    settleRotation(history);
  }

  // Trackpad two-finger swipe (and plain mouse-wheel scroll) — see the
  // EDIT POINT note by WHEEL_ROTATE_YAW_PER_PX above for why both
  // share this path. `wheelGesture` tracks one continuous swipe the
  // same way `dragState` tracks one continuous pointer drag; a short
  // silence between wheel events (WHEEL_GESTURE_IDLE_MS) stands in
  // for the "pointerup" that a real drag gets for free.
  let wheelGesture = null;

  function endWheelGesture() {
    if (!wheelGesture) return;
    const history = wheelGesture.history;
    wheelGesture = null;
    settleRotation(history);
  }

  function onWheel(e) {
    if (e.cancelable) e.preventDefault();

    if (e.ctrlKey) {
      // Trackpad pinch (or literal ctrl+scroll) — zoom, not rotation.
      const delta = clamp(-e.deltaY * TRACKPAD_ZOOM_SENSITIVITY, -0.35, 0.35);
      targetZoom = clamp(targetZoom * (1 + delta), MIN_ZOOM, MAX_ZOOM);
      return;
    }

    // Don't fight an active pointer-driven drag/pinch — extremely
    // unlikely to overlap in practice, but keep rotation single-owner.
    if (dragState || activePointers.size > 0) return;

    window.clearTimeout(resumeIdleTimer);
    window.clearTimeout(wheelGesture && wheelGesture.endTimer);
    mode = 'dragging';

    const now = performance.now();
    if (!wheelGesture) wheelGesture = { history: [], lastT: now - 16, endTimer: null };
    const dt = Math.max(1, now - wheelGesture.lastT);

    // Negated — see the WHEEL_ROTATE_YAW_PER_PX comment above: this is
    // what makes the globe's surface follow the fingers' actual swipe
    // direction rather than the browser's "content scroll" direction.
    const dYaw = -e.deltaX * WHEEL_ROTATE_YAW_PER_PX;
    const dPitch = -e.deltaY * WHEEL_ROTATE_PITCH_PER_PX;

    yaw += dYaw;
    pitchOffset = clamp(pitchOffset + dPitch, -MAX_PITCH_OFFSET, MAX_PITCH_OFFSET);

    wheelGesture.history.push({ vYaw: (dYaw / dt) * 1000, vPitch: (dPitch / dt) * 1000 });
    if (wheelGesture.history.length > WHEEL_VELOCITY_SAMPLES) wheelGesture.history.shift();
    wheelGesture.lastT = now;
    wheelGesture.endTimer = window.setTimeout(endWheelGesture, WHEEL_GESTURE_IDLE_MS);
  }

  stageEl.style.touchAction = 'none';
  stageEl.addEventListener('pointerdown', onPointerDown);
  stageEl.addEventListener('pointermove', onPointerMove);
  stageEl.addEventListener('pointerup', onPointerEnd);
  stageEl.addEventListener('pointercancel', onPointerEnd);
  stageEl.addEventListener('wheel', onWheel, { passive: false });

  /* ----------------------------------------
     ROTATION STATE MACHINE
  ---------------------------------------- */
  function updateRotation(timestamp, dtSec) {
    switch (mode) {
      case 'dragging':
        break; // yaw/pitchOffset already set directly in onPointerMove

      case 'inertia': {
        yaw += velocityYaw * dtSec;

        let nextPitch = pitchOffset + velocityPitch * dtSec;
        if (nextPitch > MAX_PITCH_OFFSET || nextPitch < -MAX_PITCH_OFFSET) {
          nextPitch = clamp(nextPitch, -MAX_PITCH_OFFSET, MAX_PITCH_OFFSET);
          velocityPitch = 0;
        }
        pitchOffset = nextPitch;

        const friction = Math.pow(INERTIA_FRICTION, dtSec * 60);
        velocityYaw *= friction;
        velocityPitch *= friction;

        if (Math.abs(velocityYaw) < INERTIA_STOP_EPS && Math.abs(velocityPitch) < INERTIA_STOP_EPS) {
          pauseThenResumeIdle();
        }
        break;
      }

      case 'returning': {
        if (returnState.startTime === null) returnState.startTime = timestamp;
        const t = Math.min(1, (timestamp - returnState.startTime) / RETURN_MS);
        const eased = easeInOutCubic(t);

        const speed = lerp(returnState.startSpeed, idleSpeed, eased);
        yaw += speed * dtSec;
        pitchOffset = lerp(returnState.startPitch, 0, eased);

        if (t >= 1) mode = 'idle';
        break;
      }

      case 'focusing': {
        if (focusTween.startTime === null) focusTween.startTime = timestamp;
        const t = Math.min(1, (timestamp - focusTween.startTime) / focusTween.duration);
        const eased = easeOutCubic(t);

        yaw = focusTween.startYaw + focusTween.deltaYaw * eased;
        pitchOffset = focusTween.startPitch + focusTween.deltaPitch * eased;

        if (t >= 1) {
          pauseThenResumeIdle();
        }
        break;
      }

      case 'paused':
        break;

      case 'idle':
      default:
        yaw += idleSpeed * dtSec;
        break;
    }
  }

  /* ----------------------------------------
     MAIN LOOP — paused whenever the tab isn't visible, resumed by
     the visibilitychange listener below.
  ---------------------------------------- */
  function frame(timestamp) {
    if (document.hidden) return;

    if (lastTime === null) lastTime = timestamp;
    const dtSec = Math.min(0.064, (timestamp - lastTime) / 1000);
    lastTime = timestamp;

    updateRotation(timestamp, dtSec);

    // Zoom eases toward its target every frame, whatever set the
    // target (wheel, pinch) — "smooth, restrained" rather than a
    // hard jump straight to the new value.
    zoom = lerp(zoom, targetZoom, clamp(dtSec * ZOOM_LERP_SPEED, 0, 1));
    radius = baseRadius * zoom;

    const totalPitch = BASE_TILT_RAD + pitchOffset;
    setRotationTrig(yaw, totalPitch);
    drawGlobe();
    updateMarkers();

    requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      lastTime = null;
      requestAnimationFrame(frame);
    }
  });

  /* ----------------------------------------
     INIT — start already facing the default location, rather than an
     arbitrary orientation, so the globe and the note panel agree on
     first paint.
  ---------------------------------------- */
  const defaultLocation = findLocation(DEFAULT_LOCATION_ID);
  yaw = normalizeAngle(-((defaultLocation.lon * Math.PI) / 180));

  selectLocation(selectedId);
  renderNote(defaultLocation);
  displayedId = selectedId;

  resizeCanvas();
  window.addEventListener('resize', debounce(resizeCanvas, 150));
  window.addEventListener('load', resizeCanvas);

  requestAnimationFrame(frame);
})();
