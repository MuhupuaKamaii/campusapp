export interface VertexData {
    id: string;
    objectName: string | null;   // null = invisible junction node, string = named location
    cx: number;                  // x in SVG viewBox units
    cy: number;                  // y in SVG viewBox units
    floor: 'basement' | 'ground' | 'first' | 'second';
    type?: 'room' | 'corridor' | 'stairs' | 'entrance' | 'open_space';
}

export interface EdgeData {
    id: string;
    from: string;
    to: string;
    // weight is NOT stored here — calculated at runtime from Euclidean distance
}

export interface FloorGraphData {
    vertices: VertexData[];
    edges: EdgeData[];
}

// ─────────────────────────────────────────────────────────────
// FIRST FLOOR — viewBox: 0 0 765.12 540.15995
// Use the coordinate picker tool to get all values below.
// Replace ALL placeholder coordinates with real clicked values.
// ─────────────────────────────────────────────────────────────
export const firstFloorGraph: FloorGraphData = {
    vertices: [
        // ── Named locations ────────────────────────────────────────────
        { id: 'f1_it_lab_1',   objectName: 'IT Section Labs',          cx: 128.16,  cy: 138.37,  floor: 'first', type: 'room' },
        { id: 'f1_it_lab_2',   objectName: 'IT Section Labs',          cx: 252.64,  cy: 138.37,  floor: 'first', type: 'room' },
        { id: 'f1_staff_f3',   objectName: 'Staff Area F3',            cx: 103.11,  cy: 146.26,  floor: 'first', type: 'room' },
        { id: 'f1_av_f5',      objectName: 'Audio Visual Section F5',  cx: 304.317, cy: 129.941, floor: 'first', type: 'room' },
        { id: 'f1_staff_f7',   objectName: 'Staff Area F7',            cx: 541.312, cy: 279.04,  floor: 'first', type: 'room' },
        { id: 'f1_comp_lab2',  objectName: 'Computer Labs 2',          cx: 392.204, cy: 138.37,  floor: 'first', type: 'room' },
        { id: 'f1_cubicle_1',  objectName: 'Study Cubicle 1',          cx: 489.06,  cy: 468.48,  floor: 'first', type: 'room' },
        { id: 'f1_cubicle_2',  objectName: 'Study Cubicle 2',          cx: 506.697, cy: 468.48,  floor: 'first', type: 'room' },
        { id: 'f1_cubicle_3',  objectName: 'Study Cubicle 3',          cx: 522.90,  cy: 468.48,  floor: 'first', type: 'room' },
        { id: 'f1_cubicle_4',  objectName: 'Study Cubicle 4',          cx: 532.79,  cy: 459.75,  floor: 'first', type: 'room' },
        { id: 'f1_cubicle_5',  objectName: 'Study Cubicle 5',          cx: 532.64,  cy: 425.64,  floor: 'first', type: 'room' },
        { id: 'f1_cubicle_6',  objectName: 'Study Cubicle 6',          cx: 532.64,  cy: 442.85,  floor: 'first', type: 'room' },
        { id: 'f1_cubicle_7',  objectName: 'Study Cubicle 7',          cx: 532.64,  cy: 459.36,  floor: 'first', type: 'room' },
        { id: 'f1_cubicle_8',  objectName: 'Study Cubicle 8',          cx: 522.90,  cy: 468.48,  floor: 'first', type: 'room' },

        // ── Upper Quad open space nodes ────────────────────────────────
        { id: 'f1_v1',   objectName: null, cx: 104.60,  cy: 157.23,  floor: 'first', type: 'open_space' },
        { id: 'f1_v2',   objectName: null, cx: 120.72,  cy: 157.23,  floor: 'first', type: 'open_space' },
        { id: 'f1_v3',   objectName: null, cx: 119.84,  cy: 138.37,  floor: 'first', type: 'open_space' },
        { id: 'f1_v4',   objectName: null, cx: 264.02,  cy: 157.23,  floor: 'first', type: 'open_space' },
        { id: 'f1_v4_5', objectName: null, cx: 294.50,  cy: 157.23,  floor: 'first', type: 'open_space' },
        { id: 'f1_v5',   objectName: null, cx: 264.02,  cy: 138.37,  floor: 'first', type: 'open_space' },
        { id: 'f1_v6',   objectName: null, cx: 304.31,  cy: 138.37,  floor: 'first', type: 'open_space' },
        { id: 'f1_v7',   objectName: null, cx: 374.76,  cy: 138.37,  floor: 'first', type: 'open_space' },
        { id: 'f1_v8',   objectName: null, cx: 341.87,  cy: 157.23,  floor: 'first', type: 'open_space' },
        { id: 'f1_v9',   objectName: null, cx: 374.76,  cy: 157.23,  floor: 'first', type: 'open_space' },

        // ── Bridge / corridor nodes ────────────────────────────────────
        { id: 'f1_v10',  objectName: null, cx: 294.50,  cy: 201.96,  floor: 'first', type: 'corridor' },
        { id: 'f1_v11',  objectName: null, cx: 341.87,  cy: 201.96,  floor: 'first', type: 'corridor' },
        { id: 'f1_v12',  objectName: null, cx: 294.50,  cy: 222.36,  floor: 'first', type: 'corridor' },
        { id: 'f1_v13',  objectName: null, cx: 341.87,  cy: 222.36,  floor: 'first', type: 'corridor' },
        { id: 'f1_v14',  objectName: null, cx: 294.50,  cy: 245.15,  floor: 'first', type: 'corridor' },
        { id: 'f1_v15',  objectName: null, cx: 341.87,  cy: 245.15,  floor: 'first', type: 'corridor' },
        { id: 'f1_v16',  objectName: null, cx: 294.50,  cy: 270.60,  floor: 'first', type: 'corridor' },
        { id: 'f1_v17',  objectName: null, cx: 341.87,  cy: 270.60,  floor: 'first', type: 'corridor' },
        { id: 'f1_v19',  objectName: null, cx: 401.30,  cy: 270.60,  floor: 'first', type: 'corridor' },
        { id: 'f1_v20',  objectName: null, cx: 421.69,  cy: 270.60,  floor: 'first', type: 'corridor' },
        { id: 'f1_v21',  objectName: null, cx: 465.33,  cy: 270.60,  floor: 'first', type: 'corridor' },
        { id: 'f1_v22',  objectName: null, cx: 265.78,  cy: 270.60,  floor: 'first', type: 'corridor' },
        { id: 'f1_v23',  objectName: null, cx: 197.14,  cy: 270.60,  floor: 'first', type: 'corridor' },
        { id: 'f1_v24',  objectName: null, cx: 197.14,  cy: 304.81,  floor: 'first', type: 'corridor' },
        { id: 'f1_v25',  objectName: null, cx: 159.20,  cy: 304.81,  floor: 'first', type: 'corridor' },
        { id: 'f1_v26',  objectName: null, cx: 265.78,  cy: 304.81,  floor: 'first', type: 'corridor' },
        { id: 'f1_v27',  objectName: null, cx: 311.13,  cy: 304.81,  floor: 'first', type: 'corridor' },
        { id: 'f1_v28',  objectName: null, cx: 401.30,  cy: 304.81,  floor: 'first', type: 'corridor' },
        { id: 'f1_v29',  objectName: null, cx: 421.69,  cy: 304.81,  floor: 'first', type: 'corridor' },
        { id: 'f1_v30',  objectName: null, cx: 465.33,  cy: 304.81,  floor: 'first', type: 'corridor' },
        { id: 'f1_v31',  objectName: null, cx: 465.33,  cy: 413.235, floor: 'first', type: 'corridor' },
        { id: 'f1_v32',  objectName: null, cx: 522.90,  cy: 425.63,  floor: 'first', type: 'corridor' },
        { id: 'f1_v33',  objectName: null, cx: 522.90,  cy: 422.85,  floor: 'first', type: 'corridor' },
        { id: 'f1_v34',  objectName: null, cx: 522.90,  cy: 459.36,  floor: 'first', type: 'corridor' },
    ],

    edges: [
        // ── Upper Quad spine ───────────────────────────────────────────
        { id: 'f1_v1_v2',     from: 'f1_v1',    to: 'f1_v2' },
        { id: 'f1_v2_v3',     from: 'f1_v2',    to: 'f1_v3' },
        { id: 'f1_v1_v4',     from: 'f1_v1',    to: 'f1_v4' },
        { id: 'f1_v4_v4_5',   from: 'f1_v4',    to: 'f1_v4_5' },
        { id: 'f1_v4_v5',     from: 'f1_v4',    to: 'f1_v5' },
        { id: 'f1_v5_v6',     from: 'f1_v5',    to: 'f1_v6' },
        { id: 'f1_v6_v7',     from: 'f1_v6',    to: 'f1_v7' },
        { id: 'f1_v6_v8',     from: 'f1_v6',    to: 'f1_v8' },
        { id: 'f1_v8_v9',     from: 'f1_v8',    to: 'f1_v9' },
        { id: 'f1_v7_v9',     from: 'f1_v7',    to: 'f1_v9' },
        { id: 'f1_v4_5_v10',  from: 'f1_v4_5',  to: 'f1_v10' },
        { id: 'f1_v8_v11',    from: 'f1_v8',    to: 'f1_v11' },

        // ── Bridge nodes ───────────────────────────────────────────────
        { id: 'f1_v10_v11',   from: 'f1_v10',   to: 'f1_v11' },
        { id: 'f1_v10_v12',   from: 'f1_v10',   to: 'f1_v12' },
        { id: 'f1_v11_v13',   from: 'f1_v11',   to: 'f1_v13' },
        { id: 'f1_v12_v13',   from: 'f1_v12',   to: 'f1_v13' },
        { id: 'f1_v12_v14',   from: 'f1_v12',   to: 'f1_v14' },
        { id: 'f1_v13_v15',   from: 'f1_v13',   to: 'f1_v15' },
        { id: 'f1_v14_v15',   from: 'f1_v14',   to: 'f1_v15' },
        { id: 'f1_v14_v16',   from: 'f1_v14',   to: 'f1_v16' },
        { id: 'f1_v15_v17',   from: 'f1_v15',   to: 'f1_v17' },
        { id: 'f1_v16_v17',   from: 'f1_v16',   to: 'f1_v17' },

        // ── Horizontal corridor ────────────────────────────────────────
        { id: 'f1_v16_v22',   from: 'f1_v16',   to: 'f1_v22' },
        { id: 'f1_v22_v23',   from: 'f1_v22',   to: 'f1_v23' },
        { id: 'f1_v17_v19',   from: 'f1_v17',   to: 'f1_v19' },
        { id: 'f1_v19_v20',   from: 'f1_v19',   to: 'f1_v20' },
        { id: 'f1_v20_v21',   from: 'f1_v20',   to: 'f1_v21' },

        // ── Lower corridor ─────────────────────────────────────────────
        { id: 'f1_v23_v24',   from: 'f1_v23',   to: 'f1_v24' },
        { id: 'f1_v24_v25',   from: 'f1_v24',   to: 'f1_v25' },
        { id: 'f1_v24_v26',   from: 'f1_v24',   to: 'f1_v26' },
        { id: 'f1_v26_v27',   from: 'f1_v26',   to: 'f1_v27' },
        { id: 'f1_v22_v26',   from: 'f1_v22',   to: 'f1_v26' },
        { id: 'f1_v27_v28',   from: 'f1_v27',   to: 'f1_v28' },
        { id: 'f1_v28_v29',   from: 'f1_v28',   to: 'f1_v29' },
        { id: 'f1_v29_v30',   from: 'f1_v29',   to: 'f1_v30' },
        { id: 'f1_v21_v30',   from: 'f1_v21',   to: 'f1_v30' },

        // ── Cubicle corridor ───────────────────────────────────────────
        { id: 'f1_v30_v31',   from: 'f1_v30',   to: 'f1_v31' },
        { id: 'f1_v31_v32',   from: 'f1_v31',   to: 'f1_v32' },
        { id: 'f1_v32_v33',   from: 'f1_v32',   to: 'f1_v33' },
        { id: 'f1_v33_v34',   from: 'f1_v33',   to: 'f1_v34' },

        // ── Named POIs → nearest node ──────────────────────────────────
        { id: 'f1_staff_f3_v1',    from: 'f1_staff_f3',   to: 'f1_v1' },
        { id: 'f1_it_lab_1_v3',    from: 'f1_it_lab_1',   to: 'f1_v3' },
        { id: 'f1_it_lab_2_v5',    from: 'f1_it_lab_2',   to: 'f1_v5' },
        { id: 'f1_av_f5_v6',       from: 'f1_av_f5',      to: 'f1_v6' },
        { id: 'f1_comp_lab2_v7',   from: 'f1_comp_lab2',  to: 'f1_v7' },
        { id: 'f1_staff_f7_v19',   from: 'f1_staff_f7',   to: 'f1_v19' },
        { id: 'f1_cubicle1_v31',   from: 'f1_cubicle_1',  to: 'f1_v31' },
        { id: 'f1_cubicle2_v31',   from: 'f1_cubicle_2',  to: 'f1_v31' },
        { id: 'f1_cubicle3_v34',   from: 'f1_cubicle_3',  to: 'f1_v34' },
        { id: 'f1_cubicle4_v34',   from: 'f1_cubicle_4',  to: 'f1_v34' },
        { id: 'f1_cubicle5_v32',   from: 'f1_cubicle_5',  to: 'f1_v32' },
        { id: 'f1_cubicle6_v32',   from: 'f1_cubicle_6',  to: 'f1_v32' },
        { id: 'f1_cubicle7_v34',   from: 'f1_cubicle_7',  to: 'f1_v34' },
        { id: 'f1_cubicle8_v34',   from: 'f1_cubicle_8',  to: 'f1_v34' },
    ],
};