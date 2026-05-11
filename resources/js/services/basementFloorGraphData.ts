import { GraphData } from './graphData';

// SVG viewBox: 0 0 1588 1122.6667
export const basementFloorGraphData: GraphData = {
  floorId: 1,
  floorName: 'Basement Floor',

  vertices: [
    // ── Named POI locations ────────────────────────────────────────
    { id: 0,  name: 'Copy Center',       type: 'service',    cx: 650.063, cy: 544.960, floor_id: 1 },
    { id: 1,  name: 'Stationery Shop',   type: 'service',    cx: 753.077, cy: 497.309, floor_id: 1 },
    { id: 2,  name: 'Seminar Room 1',    type: 'study',      cx: 777.07,  cy: 404.240, floor_id: 1 },
    { id: 3,  name: 'Seminar Room 2',    type: 'study',      cx: 934.837, cy: 404.240, floor_id: 1 },
    { id: 4,  name: 'Book Acquisitions', type: 'collection', cx: 945.717, cy: 659.367, floor_id: 1 },
    { id: 5,  name: 'Lift 1',            type: 'service',    cx: 453.043, cy: 572.160, floor_id: 1 },
    { id: 6,  name: 'Lift 2',            type: 'service',    cx: 480.365, cy: 572.160, floor_id: 1 },

    // ── Walkway nodes from lifts ───────────────────────────────────
    { id: 7,  name: 'v1',  type: 'walkway', cx: 465.22,  cy: 592.82,  floor_id: 1 },
    { id: 8,  name: 'v2',  type: 'walkway', cx: 465.22,  cy: 675.23,  floor_id: 1 },
    { id: 9,  name: 'v3',  type: 'walkway', cx: 555.08,  cy: 661.11,  floor_id: 1 },
    { id: 10, name: 'v4',  type: 'walkway', cx: 610.02,  cy: 661.11,  floor_id: 1 },
    { id: 11, name: 'v5',  type: 'walkway', cx: 610.02,  cy: 693.46,  floor_id: 1 },
    { id: 12, name: 'v6',  type: 'walkway', cx: 630.04,  cy: 693.46,  floor_id: 1 },
    { id: 13, name: 'v7',  type: 'walkway', cx: 630.04,  cy: 592.30,  floor_id: 1 },
    { id: 14, name: 'v8',  type: 'walkway', cx: 692.18,  cy: 592.30,  floor_id: 1 },
    { id: 15, name: 'v9',  type: 'walkway', cx: 692.18,  cy: 570.22,  floor_id: 1 },
    { id: 16, name: 'v10', type: 'walkway', cx: 650.06,  cy: 570.22,  floor_id: 1 },
    { id: 17, name: 'v11', type: 'walkway', cx: 762.30,  cy: 570.22,  floor_id: 1 },
    { id: 18, name: 'v12', type: 'walkway', cx: 762.30,  cy: 497.30,  floor_id: 1 },
    { id: 19, name: 'v13', type: 'walkway', cx: 762.30,  cy: 422.45,  floor_id: 1 },
    { id: 20, name: 'v14', type: 'walkway', cx: 762.30,  cy: 404.24,  floor_id: 1 },
    { id: 21, name: 'v15', type: 'walkway', cx: 944.39,  cy: 422.45,  floor_id: 1 },
    { id: 22, name: 'v16', type: 'walkway', cx: 944.39,  cy: 404.24,  floor_id: 1 },
    { id: 23, name: 'v17', type: 'walkway', cx: 944.94,  cy: 533.38,  floor_id: 1 },
    { id: 24, name: 'v18', type: 'walkway', cx: 944.39,  cy: 570.22,  floor_id: 1 },
    { id: 25, name: 'v19', type: 'walkway', cx: 966.18,  cy: 570.22,  floor_id: 1 },
    { id: 26, name: 'v20',              type: 'walkway', cx: 966.18,  cy: 659.36,  floor_id: 1 },
    { id: 27, name: 'Stairs to First Floor', type: 'exit', cx: 885.76,  cy: 533.00,  floor_id: 1 },
    { id: 28, name: 'Stairs to Ground Floor', type: 'exit', cx: 817.717, cy: 521.575, floor_id: 1 },
  ],

  edges: [
    // ── Lifts → v1 ────────────────────────────────────────────────
    { id: 1,  from: 5,  to: 7,  distance: 25  },  // Lift 1 → v1
    { id: 2,  from: 6,  to: 7,  distance: 20  },  // Lift 2 → v1

    // ── Left vertical corridor ─────────────────────────────────────
    { id: 3,  from: 7,  to: 8,  distance: 82  },  // v1 ↕ v2 (vertical same x=465)

    // ── Along ramp corridor (y ≈ 592) — do NOT shortcut v1→v7 ──────
    { id: 5,  from: 13, to: 14, distance: 62  },  // v7 → v8 (horizontal same y=592)

    // ── Corner at v8 ──────────────────────────────────────────────
    { id: 6,  from: 14, to: 15, distance: 22  },  // v8 ↕ v9 (vertical same x=692)

    // ── Horizontal corridor (y = 570.22) ──────────────────────────
    { id: 7,  from: 16, to: 15, distance: 42  },  // v10 → v9
    { id: 8,  from: 15, to: 17, distance: 70  },  // v9 → v11
    { id: 9,  from: 17, to: 24, distance: 182 },  // v11 → v18 (long corridor same y)

    // ── Copy Center ────────────────────────────────────────────────
    { id: 10, from: 16, to: 0,  distance: 25  },  // v10 ↕ Copy Center (vertical same x=650)

    // ── v11 → Stationery Shop ─────────────────────────────────────
    { id: 11, from: 17, to: 18, distance: 73  },  // v11 ↕ v12 (vertical same x=762)
    { id: 12, from: 18, to: 1,  distance: 10  },  // v12 → Stationery (same y=497)

    // ── Vertical corridor x=762 ───────────────────────────────────
    { id: 13, from: 18, to: 19, distance: 75  },  // v12 ↕ v13 (vertical same x=762)
    { id: 14, from: 19, to: 20, distance: 18  },  // v13 ↕ v14 (vertical same x=762)

    // ── Seminar Room 1 ─────────────────────────────────────────────
    { id: 15, from: 20, to: 2,  distance: 15  },  // v14 → Seminar Room 1 (same y=404)

    // ── Horizontal at y=422.45 ────────────────────────────────────
    { id: 16, from: 19, to: 21, distance: 182 },  // v13 → v15 (horizontal same y=422)

    // ── Right vertical corridor (x ≈ 944) ─────────────────────────
    { id: 17, from: 21, to: 22, distance: 18  },  // v15 ↕ v16 (vertical same x=944)
    { id: 18, from: 22, to: 3,  distance: 10  },  // v16 → Seminar Room 2 (same y=404)
    { id: 19, from: 22, to: 23, distance: 129 },  // v16 ↕ v17 (vertical same x=944)
    { id: 20, from: 23, to: 24, distance: 37  },  // v17 ↕ v18 (vertical same x=944)
    { id: 21, from: 24, to: 25, distance: 22  },  // v18 → v19 (horizontal same y=570)
    { id: 22, from: 25, to: 26, distance: 89  },  // v19 ↕ v20 (vertical same x=966)

    // ── Book Acquisitions ──────────────────────────────────────────
    { id: 23, from: 26, to: 4,  distance: 22  },  // v20 → Book Acquisitions (same y=659)

    // ── Stairs connections ─────────────────────────────────────────
    { id: 30, from: 27, to: 23, distance: 59  },  // Stairs to First → v17 (same y≈533)
    { id: 31, from: 28, to: 27, distance: 69  },  // Stairs to Ground → Stairs to First

    // ── Lower section (entry/exit corridor) ───────────────────────
    { id: 24, from: 8,  to: 9,  distance: 105 },  // v2 → v3 (diagonal)
    { id: 25, from: 9,  to: 10, distance: 55  },  // v3 → v4 (horizontal same y=661)
    { id: 26, from: 10, to: 11, distance: 32  },  // v4 ↕ v5 (vertical same x=610)
    { id: 27, from: 11, to: 12, distance: 20  },  // v5 → v6 (horizontal same y=693)
    { id: 28, from: 12, to: 13, distance: 101 },  // v6 ↕ v7 (vertical same x=630)

    // ── Lower corridor to right (Book Acq side) ───────────────────
    { id: 29, from: 10, to: 26, distance: 356 },  // v4 → v20 (horizontal same y≈659–661)
  ],
};
