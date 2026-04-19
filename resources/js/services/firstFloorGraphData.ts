import { GraphData } from './graphData';

// SVG viewBox: 0 0 765.12 540.15995
// All cx/cy values are in SVG units matching the floor plan image.
export const firstFloorGraphData: GraphData = {
  floorId: 3,
  floorName: 'First Floor',

  vertices: [
    // ── Named locations ────────────────────────────────────────────
    { id: 0,  name: 'IT Section Labs',         type: 'lab',      cx: 128.16,  cy: 138.37,  floor_id: 3 },
    { id: 1,  name: 'IT Section Labs',         type: 'lab',      cx: 252.64,  cy: 138.37,  floor_id: 3 },
    { id: 2,  name: 'Staff Area F3',           type: 'office',   cx: 103.11,  cy: 146.26,  floor_id: 3 },
    { id: 3,  name: 'Audio Visual Section F5', type: 'service',  cx: 304.317, cy: 129.941, floor_id: 3 },
    { id: 4,  name: 'Staff Area F7',           type: 'office',   cx: 541.312, cy: 279.04,  floor_id: 3 },
    { id: 5,  name: 'Computer Labs 2',         type: 'lab',      cx: 392.204, cy: 138.37,  floor_id: 3 },
    { id: 6,  name: 'Study Cubicle 1',         type: 'study',    cx: 489.06,  cy: 468.48,  floor_id: 3 },
    { id: 7,  name: 'Study Cubicle 2',         type: 'study',    cx: 506.697, cy: 468.48,  floor_id: 3 },
    { id: 8,  name: 'Study Cubicle 3',         type: 'study',    cx: 522.90,  cy: 468.48,  floor_id: 3 },
    { id: 9,  name: 'Study Cubicle 4',         type: 'study',    cx: 532.79,  cy: 459.75,  floor_id: 3 },
    { id: 10, name: 'Study Cubicle 5',         type: 'study',    cx: 532.64,  cy: 425.64,  floor_id: 3 },
    { id: 11, name: 'Study Cubicle 6',         type: 'study',    cx: 532.64,  cy: 442.85,  floor_id: 3 },
    { id: 12, name: 'Study Cubicle 7',         type: 'study',    cx: 532.64,  cy: 459.36,  floor_id: 3 },
    { id: 13, name: 'Study Cubicle 8',         type: 'study',    cx: 522.90,  cy: 468.48,  floor_id: 3 },

    // ── Upper Quad open space nodes ────────────────────────────────
    { id: 14, name: 'v1',   type: 'walkway', cx: 104.60,  cy: 157.23,  floor_id: 3 },
    { id: 15, name: 'v2',   type: 'walkway', cx: 120.72,  cy: 157.23,  floor_id: 3 },
    { id: 16, name: 'v3',   type: 'walkway', cx: 119.84,  cy: 138.37,  floor_id: 3 },
    { id: 17, name: 'v4',   type: 'walkway', cx: 264.02,  cy: 157.23,  floor_id: 3 },
    { id: 18, name: 'v4.5', type: 'walkway', cx: 294.50,  cy: 157.23,  floor_id: 3 },
    { id: 19, name: 'v5',   type: 'walkway', cx: 264.02,  cy: 138.37,  floor_id: 3 },
    { id: 20, name: 'v6',   type: 'walkway', cx: 304.31,  cy: 138.37,  floor_id: 3 },
    { id: 21, name: 'v7',   type: 'walkway', cx: 374.76,  cy: 138.37,  floor_id: 3 },
    { id: 22, name: 'v8',   type: 'walkway', cx: 341.87,  cy: 157.23,  floor_id: 3 },
    { id: 23, name: 'v9',   type: 'walkway', cx: 374.76,  cy: 157.23,  floor_id: 3 },

    // ── Bridge / corridor nodes ────────────────────────────────────
    { id: 24, name: 'v10',  type: 'walkway', cx: 294.50,  cy: 201.96,  floor_id: 3 },
    { id: 25, name: 'v11',  type: 'walkway', cx: 341.87,  cy: 201.96,  floor_id: 3 },
    { id: 26, name: 'v12',  type: 'walkway', cx: 294.50,  cy: 222.36,  floor_id: 3 },
    { id: 27, name: 'v13',  type: 'walkway', cx: 341.87,  cy: 222.36,  floor_id: 3 },
    { id: 28, name: 'v14',  type: 'walkway', cx: 294.50,  cy: 245.15,  floor_id: 3 },
    { id: 29, name: 'v15',  type: 'walkway', cx: 341.87,  cy: 245.15,  floor_id: 3 },
    { id: 30, name: 'v16',  type: 'walkway', cx: 294.50,  cy: 270.60,  floor_id: 3 },
    { id: 31, name: 'v17',  type: 'walkway', cx: 341.87,  cy: 270.60,  floor_id: 3 },
    { id: 32, name: 'v19',  type: 'walkway', cx: 401.30,  cy: 270.60,  floor_id: 3 },
    { id: 33, name: 'v20',  type: 'walkway', cx: 421.69,  cy: 270.60,  floor_id: 3 },
    { id: 34, name: 'v21',  type: 'walkway', cx: 465.33,  cy: 270.60,  floor_id: 3 },
    { id: 35, name: 'v22',  type: 'walkway', cx: 265.78,  cy: 270.60,  floor_id: 3 },
    { id: 36, name: 'v23',  type: 'walkway', cx: 197.14,  cy: 270.60,  floor_id: 3 },
    { id: 37, name: 'v24',  type: 'walkway', cx: 197.14,  cy: 304.81,  floor_id: 3 },
    { id: 38, name: 'v25',  type: 'walkway', cx: 159.20,  cy: 304.81,  floor_id: 3 },
    { id: 39, name: 'v26',  type: 'walkway', cx: 265.78,  cy: 304.81,  floor_id: 3 },
    { id: 40, name: 'v27',  type: 'walkway', cx: 311.13,  cy: 304.81,  floor_id: 3 },
    { id: 41, name: 'v28',  type: 'walkway', cx: 401.30,  cy: 304.81,  floor_id: 3 },
    { id: 42, name: 'v29',  type: 'walkway', cx: 421.69,  cy: 304.81,  floor_id: 3 },
    { id: 43, name: 'v30',  type: 'walkway', cx: 465.33,  cy: 304.81,  floor_id: 3 },
    { id: 44, name: 'v31',  type: 'walkway', cx: 465.33,  cy: 413.235, floor_id: 3 },
    { id: 45, name: 'v32',  type: 'walkway', cx: 522.90,  cy: 425.63,  floor_id: 3 },
    { id: 46, name: 'v33',  type: 'walkway', cx: 522.90,  cy: 422.85,  floor_id: 3 },
    { id: 47, name: 'v34',  type: 'walkway', cx: 522.90,  cy: 459.36,  floor_id: 3 },
  ],

  edges: [
    // ── Upper Quad spine ───────────────────────────────────────────
    { id: 1,  from: 14, to: 15, distance: 16 },
    { id: 2,  from: 15, to: 16, distance: 19 },
    { id: 3,  from: 14, to: 17, distance: 159 },
    { id: 4,  from: 17, to: 18, distance: 31 },
    { id: 5,  from: 17, to: 19, distance: 19 },
    { id: 6,  from: 19, to: 20, distance: 40 },
    { id: 7,  from: 20, to: 21, distance: 70 },
    { id: 8,  from: 20, to: 22, distance: 38 },
    { id: 9,  from: 22, to: 23, distance: 33 },
    { id: 10, from: 21, to: 23, distance: 19 },
    { id: 11, from: 18, to: 24, distance: 45 },
    { id: 12, from: 22, to: 25, distance: 45 },

    // ── Bridge nodes ───────────────────────────────────────────────
    { id: 13, from: 24, to: 25, distance: 47 },
    { id: 14, from: 24, to: 26, distance: 20 },
    { id: 15, from: 25, to: 27, distance: 20 },
    { id: 16, from: 26, to: 27, distance: 47 },
    { id: 17, from: 26, to: 28, distance: 23 },
    { id: 18, from: 27, to: 29, distance: 23 },
    { id: 19, from: 28, to: 29, distance: 47 },
    { id: 20, from: 28, to: 30, distance: 25 },
    { id: 21, from: 29, to: 31, distance: 25 },
    { id: 22, from: 30, to: 31, distance: 47 },

    // ── Horizontal corridor ────────────────────────────────────────
    { id: 23, from: 30, to: 35, distance: 29 },
    { id: 24, from: 35, to: 36, distance: 69 },
    { id: 25, from: 31, to: 32, distance: 60 },
    { id: 26, from: 32, to: 33, distance: 20 },
    { id: 27, from: 33, to: 34, distance: 44 },

    // ── Lower corridor ─────────────────────────────────────────────
    { id: 28, from: 36, to: 37, distance: 34 },
    { id: 29, from: 37, to: 38, distance: 38 },
    { id: 30, from: 37, to: 39, distance: 69 },
    { id: 31, from: 39, to: 40, distance: 45 },
    { id: 32, from: 35, to: 39, distance: 34 },
    { id: 33, from: 40, to: 41, distance: 90 },
    { id: 34, from: 41, to: 42, distance: 20 },
    { id: 35, from: 42, to: 43, distance: 44 },
    { id: 36, from: 34, to: 43, distance: 34 },

    // ── Cubicle corridor ───────────────────────────────────────────
    { id: 37, from: 43, to: 44, distance: 108 },
    { id: 38, from: 44, to: 45, distance: 58 },
    { id: 39, from: 45, to: 46, distance: 3 },
    { id: 40, from: 46, to: 47, distance: 37 },

    // ── Named POIs → nearest node ──────────────────────────────────
    { id: 41, from: 2,  to: 14, distance: 16 },  // Staff Area F3 → v1
    { id: 42, from: 0,  to: 16, distance: 9 },   // IT Lab 1 → v3
    { id: 43, from: 1,  to: 19, distance: 12 },  // IT Lab 2 → v5
    { id: 44, from: 3,  to: 20, distance: 9 },   // AV F5 → v6
    { id: 45, from: 5,  to: 21, distance: 19 },  // Computer Labs 2 → v7
    { id: 46, from: 4,  to: 32, distance: 140 }, // Staff Area F7 → v19
    { id: 47, from: 6,  to: 44, distance: 24 },  // Cubicle 1 → v31
    { id: 48, from: 7,  to: 44, distance: 42 },  // Cubicle 2 → v31
    { id: 49, from: 8,  to: 47, distance: 9 },   // Cubicle 3 → v34
    { id: 50, from: 9,  to: 47, distance: 10 },  // Cubicle 4 → v34
    { id: 51, from: 10, to: 45, distance: 10 },  // Cubicle 5 → v32
    { id: 52, from: 11, to: 45, distance: 17 },  // Cubicle 6 → v32
    { id: 53, from: 12, to: 47, distance: 10 },  // Cubicle 7 → v34
    { id: 54, from: 13, to: 47, distance: 9 },   // Cubicle 8 → v34
  ],
};
