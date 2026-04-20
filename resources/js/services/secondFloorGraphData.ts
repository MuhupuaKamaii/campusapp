import { GraphData } from './graphData';

// SVG viewBox: 0 0 1588 1122.6667
// Coordinates provided by user (comma = decimal separator converted to dot).
export const secondFloorGraphData: GraphData = {
  floorId: 4,
  floorName: 'Second Floor',

  vertices: [
    // ── Named POI locations ────────────────────────────────────────
    { id: 0,  name: 'IT Section Labs',      type: 'lab',      cx: 670.357, cy: 349.811, floor_id: 4 },
    { id: 1,  name: 'IT Section Labs 2',    type: 'lab',      cx: 791.957, cy: 349.811, floor_id: 4 },
    { id: 2,  name: 'Reference Section',    type: 'study',    cx: 709.38,  cy: 544.42,  floor_id: 4 },
    { id: 3,  name: 'Students Rest Area',   type: 'rest',     cx: 954.92,  cy: 473.65,  floor_id: 4 },
    { id: 4,  name: 'Staff Area',           type: 'office',   cx: 961.369, cy: 510.720, floor_id: 4 },
    { id: 5,  name: 'Lift 1',               type: 'service',  cx: 501.42,  cy: 500.64,  floor_id: 4 },
    { id: 6,  name: 'Lift 2',               type: 'service',  cx: 526.32,  cy: 500.64,  floor_id: 4 },
    { id: 7,  name: 'Short Loan Section',   type: 'study',    cx: 913.397, cy: 678.792, floor_id: 4 },

    // ── Lower Quad walkway ─────────────────────────────────────────
    { id: 8,  name: 'v1',  type: 'walkway', cx: 897.74,  cy: 678.57,  floor_id: 4 },
    { id: 9,  name: 'v2',  type: 'walkway', cx: 894.74,  cy: 544.42,  floor_id: 4 },
    { id: 10, name: 'v3',  type: 'walkway', cx: 907.84,  cy: 500.64,  floor_id: 4 },
    { id: 11, name: 'v4',  type: 'walkway', cx: 709.38,  cy: 500.64,  floor_id: 4 },

    // ── Bridge nodes ───────────────────────────────────────────────
    { id: 12, name: 'v5',  type: 'walkway', cx: 736.59,  cy: 449.81,  floor_id: 4 },
    { id: 13, name: 'v6',  type: 'walkway', cx: 686.27,  cy: 449.81,  floor_id: 4 },

    // ── Upper Quad walkway ─────────────────────────────────────────
    { id: 14, name: 'v7',  type: 'walkway', cx: 686.27,  cy: 367.65,  floor_id: 4 },
    { id: 15, name: 'v8',  type: 'walkway', cx: 653.15,  cy: 367.65,  floor_id: 4 },
    { id: 16, name: 'v9',  type: 'walkway', cx: 653.15,  cy: 349.811, floor_id: 4 },
    { id: 17, name: 'v10', type: 'walkway', cx: 736.59,  cy: 367.65,  floor_id: 4 },
    { id: 18, name: 'v11', type: 'walkway', cx: 802.32,  cy: 367.15,  floor_id: 4 },
    { id: 19, name: 'v12', type: 'walkway', cx: 802.32,  cy: 349.811, floor_id: 4 },

    // ── To the Lifts ───────────────────────────────────────────────
    { id: 20, name: 'v13', type: 'walkway', cx: 640.31,  cy: 498.34,  floor_id: 4 },
    { id: 21, name: 'v14', type: 'walkway', cx: 513.48,  cy: 523.24,  floor_id: 4 },

    // ── Stairs Lower Left Quad ─────────────────────────────────────
    { id: 22, name: 'v15', type: 'walkway', cx: 513.48,  cy: 636.72,  floor_id: 4 },
    { id: 23, name: 'v16', type: 'walkway', cx: 544.29,  cy: 668.04,  floor_id: 4 },
    { id: 24, name: 'v17', type: 'walkway', cx: 711.69,  cy: 668.04,  floor_id: 4 },
    { id: 25, name: 'v18',               type: 'walkway', cx: 858.80,  cy: 668.04,  floor_id: 4 },

    // ── Bridge stair arrival (from First Floor) ───────────────────
    { id: 26, name: 'Bridge Stairs Arrival', type: 'exit', cx: 749.17, cy: 445.70, floor_id: 4 },
  ],

  edges: [
    // ── IT Labs level (y ≈ 349.811) ───────────────────────────────
    { id: 1,  from: 0,  to: 16, distance: 20  },  // IT Lab 1 → v9
    { id: 2,  from: 16, to: 19, distance: 150 },  // v9 → v12 (horizontal same y)
    { id: 3,  from: 19, to: 1,  distance: 10  },  // v12 → IT Lab 2

    // ── Upper quad corridor (y ≈ 367–368) ─────────────────────────
    { id: 4,  from: 16, to: 15, distance: 20  },  // v9 ↕ v8 (vertical same x=653)
    { id: 5,  from: 15, to: 14, distance: 33  },  // v8 → v7 (horizontal)
    { id: 6,  from: 14, to: 17, distance: 50  },  // v7 → v10 (horizontal)
    { id: 7,  from: 17, to: 18, distance: 66  },  // v10 → v11 (horizontal)
    { id: 8,  from: 18, to: 19, distance: 18  },  // v11 ↕ v12 (vertical same x=802)

    // ── Bridge (y ≈ 449.81) ────────────────────────────────────────
    { id: 9,  from: 12, to: 13, distance: 50  },  // v5 → v6 (horizontal)
    { id: 10, from: 13, to: 14, distance: 82  },  // v6 ↕ v7 (vertical same x=686)
    { id: 11, from: 12, to: 17, distance: 82  },  // v5 ↕ v10 (vertical same x=737)

    // ── Bridge to main corridor ────────────────────────────────────
    { id: 12, from: 12, to: 11, distance: 67  },  // v5 → v4 (diagonal)
    { id: 13, from: 20, to: 13, distance: 67  },  // v13 → v6 (diagonal)

    // ── Lifts ──────────────────────────────────────────────────────
    { id: 14, from: 5,  to: 6,  distance: 25  },  // Lift 1 ↔ Lift 2
    { id: 15, from: 5,  to: 21, distance: 25  },  // Lift 1 → v14
    { id: 16, from: 6,  to: 21, distance: 25  },  // Lift 2 → v14
    { id: 17, from: 21, to: 20, distance: 130 },  // v14 → v13 (to main corridor)

    // ── Main corridor (y ≈ 500.64) ────────────────────────────────
    { id: 18, from: 20, to: 11, distance: 70  },  // v13 → v4
    { id: 19, from: 11, to: 10, distance: 198 },  // v4 → v3 (long horizontal)

    // ── Reference Section ──────────────────────────────────────────
    { id: 20, from: 11, to: 2,  distance: 44  },  // v4 ↕ Reference Section (vertical same x)
    { id: 21, from: 2,  to: 9,  distance: 185 },  // Ref Section → v2 (horizontal same y=544)

    // ── Right side ────────────────────────────────────────────────
    { id: 22, from: 9,  to: 10, distance: 44  },  // v2 ↕ v3 (connector)
    { id: 23, from: 10, to: 3,  distance: 55  },  // v3 → Students Rest Area
    { id: 24, from: 10, to: 4,  distance: 60  },  // v3 → Staff Area

    // ── Lower stair corridor ───────────────────────────────────────
    { id: 25, from: 21, to: 22, distance: 113 },  // v14 ↕ v15 (vertical same x=513)
    { id: 26, from: 22, to: 23, distance: 45  },  // v15 → v16
    { id: 27, from: 23, to: 24, distance: 167 },  // v16 → v17 (horizontal y=668)
    { id: 28, from: 24, to: 25, distance: 147 },  // v17 → v18 (horizontal y=668)
    { id: 29, from: 25, to: 8,  distance: 40  },  // v18 → v1

    // ── Short Loan & upper connections ────────────────────────────
    { id: 30, from: 8,  to: 7,  distance: 16  },  // v1 → Short Loan Section
    { id: 31, from: 8,  to: 9,  distance: 134 },  // v1 ↕ v2 (vertical same x≈894–897)
    { id: 32, from: 24, to: 11, distance: 167 },  // v17 ↕ v4 (vertical same x≈709–711)

    // ── Bridge stair arrival → v5 ─────────────────────────────────
    { id: 33, from: 26, to: 12, distance: 14  },  // Bridge Stairs Arrival → v5 (id=12)
  ],
};
