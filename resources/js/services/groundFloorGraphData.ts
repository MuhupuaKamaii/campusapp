import { GraphData } from './graphData';

// SVG viewBox: 0 0 1588 1122.6667
export const groundFloorGraphData: GraphData = {
  floorId: 2,
  floorName: 'Ground Floor',

  vertices: [
    // ── Named POI locations ────────────────────────────────────────
    { id: 0,  name: 'Administration',        type: 'office',   cx: 529.237,  cy: 579.659, floor_id: 2 },
    { id: 1,  name: 'Periodical Sections',   type: 'study',    cx: 829.532,  cy: 592.960, floor_id: 2 },
    { id: 2,  name: 'Periodicals Reception', type: 'office',   cx: 859.957,  cy: 659.367, floor_id: 2 },
    { id: 3,  name: 'Main Concourse',        type: 'entrance', cx: 528.888,  cy: 488.960, floor_id: 2 },
    { id: 4,  name: 'Info Commons',          type: 'study',    cx: 646.659,  cy: 353.600, floor_id: 2 },
    { id: 5,  name: 'Group Study 1',         type: 'study',    cx: 771.750,  cy: 306.317, floor_id: 2 },
    { id: 6,  name: 'Group Study 2',         type: 'study',    cx: 796.614,  cy: 306.560, floor_id: 2 },
    { id: 7,  name: 'Group Study 3',         type: 'study',    cx: 887.568,  cy: 306.560, floor_id: 2 },
    { id: 8,  name: 'Group Study 4',         type: 'study',    cx: 912.439,  cy: 306.560, floor_id: 2 },
    { id: 9,  name: 'Group Study 5',         type: 'study',    cx: 958.733,  cy: 306.560, floor_id: 2 },
    { id: 10, name: 'Student Toilets',       type: 'restroom', cx: 974.197,  cy: 306.560, floor_id: 2 },
    { id: 11, name: 'Lift 1',                type: 'service',  cx: 473.648,  cy: 530.080, floor_id: 2 },
    { id: 12, name: 'Lift 2',                type: 'service',  cx: 502.876,  cy: 530.080, floor_id: 2 },

    // ── Inter-floor stair nodes ────────────────────────────────────
    { id: 13, name: 'Stairs to Basement',    type: 'exit',     cx: 817.717,  cy: 521.575, floor_id: 2 },
    { id: 14, name: 'Stairs to 1st Floor',   type: 'exit',     cx: 761.557,  cy: 472.195, floor_id: 2 },

    // ── Walkway nodes ─────────────────────────────────────────────
    { id: 15, name: 'v1',  type: 'walkway', cx: 572.59,  cy: 670.26,  floor_id: 2 },
    { id: 16, name: 'v2',  type: 'walkway', cx: 572.59,  cy: 530.11,  floor_id: 2 },
    { id: 17, name: 'v3',  type: 'walkway', cx: 538.10,  cy: 531.92,  floor_id: 2 },
    { id: 18, name: 'v4',  type: 'walkway', cx: 538.10,  cy: 578.76,  floor_id: 2 },
    { id: 19, name: 'v5',  type: 'walkway', cx: 522.85,  cy: 504.69,  floor_id: 2 },
    { id: 20, name: 'v6',  type: 'walkway', cx: 692.40,  cy: 530.11,  floor_id: 2 },
    { id: 21, name: 'v7',  type: 'walkway', cx: 742.88,  cy: 530.11,  floor_id: 2 },
    { id: 22, name: 'v8',  type: 'walkway', cx: 692.40,  cy: 474.92,  floor_id: 2 },
    { id: 23, name: 'v9',  type: 'walkway', cx: 692.40,  cy: 472.195, floor_id: 2 },
    { id: 24, name: 'v10', type: 'walkway', cx: 692.40,  cy: 418.72,  floor_id: 2 },
    { id: 25, name: 'v11', type: 'walkway', cx: 692.40,  cy: 377.61,  floor_id: 2 },
    { id: 26, name: 'v12', type: 'walkway', cx: 771.75,  cy: 318.87,  floor_id: 2 },
    { id: 27, name: 'v13', type: 'walkway', cx: 796.61,  cy: 318.87,  floor_id: 2 },
    { id: 28, name: 'v14', type: 'walkway', cx: 887.56,  cy: 318.87,  floor_id: 2 },
    { id: 29, name: 'v15', type: 'walkway', cx: 912.43,  cy: 318.87,  floor_id: 2 },
    { id: 30, name: 'v16', type: 'walkway', cx: 958.73,  cy: 318.87,  floor_id: 2 },
    { id: 31, name: 'v17', type: 'walkway', cx: 742.88,  cy: 533.63,  floor_id: 2 },
    { id: 32, name: 'v18', type: 'walkway', cx: 608.48,  cy: 566.37,  floor_id: 2 },
    { id: 33, name: 'v19', type: 'walkway', cx: 829.53,  cy: 566.53,  floor_id: 2 },
    { id: 34, name: 'v20', type: 'walkway', cx: 1004.12, cy: 566.63,  floor_id: 2 },
  ],

  edges: [
    // ── Lower left quad ────────────────────────────────────────────
    { id: 1,  from: 15, to: 16, distance: 140 },  // v1 ↕ v2
    { id: 2,  from: 16, to: 17, distance: 35  },  // v2 → v3
    { id: 3,  from: 17, to: 18, distance: 47  },  // v3 ↕ v4
    { id: 4,  from: 17, to: 19, distance: 31  },  // v3 → v5

    // ── Lifts ──────────────────────────────────────────────────────
    { id: 5,  from: 11, to: 12, distance: 29  },  // Lift 1 ↔ Lift 2
    { id: 6,  from: 19, to: 11, distance: 55  },  // v5 → Lift 1
    { id: 7,  from: 19, to: 12, distance: 32  },  // v5 → Lift 2
    { id: 8,  from: 19, to: 3,  distance: 17  },  // v5 → Main Concourse

    // ── Main corridor spine ────────────────────────────────────────
    { id: 9,  from: 16, to: 20, distance: 120 },  // v2 → v6
    { id: 10, from: 20, to: 21, distance: 50  },  // v6 → v7
    { id: 11, from: 20, to: 22, distance: 55  },  // v6 ↕ v8
    { id: 12, from: 21, to: 22, distance: 75  },  // v7 ↘ v8 (diagonal)
    { id: 13, from: 22, to: 23, distance: 3   },  // v8 ↕ v9
    { id: 14, from: 23, to: 24, distance: 53  },  // v9 ↕ v10
    { id: 15, from: 24, to: 25, distance: 41  },  // v10 ↕ v11

    // ── Upper right quad ──────────────────────────────────────────
    { id: 16, from: 25, to: 4,  distance: 52  },  // v11 → Info Commons
    { id: 17, from: 25, to: 26, distance: 99  },  // v11 → v12
    { id: 18, from: 26, to: 27, distance: 25  },  // v12 → v13
    { id: 19, from: 27, to: 28, distance: 91  },  // v13 → v14
    { id: 20, from: 28, to: 29, distance: 25  },  // v14 → v15
    { id: 21, from: 29, to: 30, distance: 46  },  // v15 → v16

    // ── Lower right quad ──────────────────────────────────────────
    { id: 22, from: 21, to: 31, distance: 4   },  // v7 → v17
    { id: 23, from: 31, to: 32, distance: 138 },  // v17 → v18
    { id: 24, from: 32, to: 16, distance: 51  },  // v18 → v2
    { id: 25, from: 31, to: 33, distance: 93  },  // v17 → v19
    { id: 26, from: 33, to: 34, distance: 175 },  // v19 → v20

    // ── Named POIs → nearest walkway ─────────────────────────────
    { id: 27, from: 0,  to: 18, distance: 9   },  // Administration → v4
    { id: 28, from: 1,  to: 33, distance: 26  },  // Periodical Sections → v19
    { id: 29, from: 2,  to: 33, distance: 98  },  // Periodicals Reception → v19
    { id: 30, from: 5,  to: 26, distance: 13  },  // Group Study 1 → v12
    { id: 31, from: 6,  to: 27, distance: 12  },  // Group Study 2 → v13
    { id: 32, from: 7,  to: 28, distance: 12  },  // Group Study 3 → v14
    { id: 33, from: 8,  to: 29, distance: 12  },  // Group Study 4 → v15
    { id: 34, from: 9,  to: 30, distance: 12  },  // Group Study 5 → v16
    { id: 35, from: 10, to: 30, distance: 20  },  // Student Toilets → v16

    // ── Inter-floor stair connections ────────────────────────────
    { id: 36, from: 21, to: 13, distance: 75  },  // v7 → Stairs to Basement
    { id: 37, from: 21, to: 14, distance: 61  },  // v7 → Stairs to 1st Floor
    { id: 38, from: 23, to: 14, distance: 69  },  // v9 → Stairs to 1st Floor (same y)
  ],
};
