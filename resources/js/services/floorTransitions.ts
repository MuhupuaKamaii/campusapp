export interface FloorTransition {
  id: string;
  buildingId: string;
  name: string;
  type: 'lift' | 'stairs';
  fromFloor: number;
  fromVertexId: number;
  toFloor: number;
  toVertexId: number;
}

export const floorTransitions: FloorTransition[] = [
  // ── Library: Basement(1) ↔ Second Floor(4) via Lifts ─────────────
  { id: 'b4-lift1',   buildingId: 'library', name: 'Lift 1',        type: 'lift',   fromFloor: 1, fromVertexId: 5,  toFloor: 4, toVertexId: 5  },
  { id: '4b-lift1',   buildingId: 'library', name: 'Lift 1',        type: 'lift',   fromFloor: 4, fromVertexId: 5,  toFloor: 1, toVertexId: 5  },
  { id: 'b4-lift2',   buildingId: 'library', name: 'Lift 2',        type: 'lift',   fromFloor: 1, fromVertexId: 6,  toFloor: 4, toVertexId: 6  },
  { id: '4b-lift2',   buildingId: 'library', name: 'Lift 2',        type: 'lift',   fromFloor: 4, fromVertexId: 6,  toFloor: 1, toVertexId: 6  },
  // ── Library: Basement(1) ↔ First Floor(3) via Stairs ─────────────
  { id: 'b3-stair',   buildingId: 'library', name: 'Stairs',        type: 'stairs', fromFloor: 1, fromVertexId: 27, toFloor: 3, toVertexId: 48 },
  { id: '3b-stair',   buildingId: 'library', name: 'Stairs',        type: 'stairs', fromFloor: 3, fromVertexId: 48, toFloor: 1, toVertexId: 27 },
  // ── Library: First Floor(3) ↔ Second Floor(4) via Bridge Stairs ──
  { id: '3-4-bridge', buildingId: 'library', name: 'Bridge Stairs', type: 'stairs', fromFloor: 3, fromVertexId: 49, toFloor: 4, toVertexId: 26 },
  { id: '4-3-bridge', buildingId: 'library', name: 'Bridge Stairs', type: 'stairs', fromFloor: 4, fromVertexId: 26, toFloor: 3, toVertexId: 49 },
  // ── Library: Ground Floor(2) ↔ Basement(1) via Lifts ─────────────
  { id: '2-1-lift1',  buildingId: 'library', name: 'Lift 1',        type: 'lift',   fromFloor: 2, fromVertexId: 11, toFloor: 1, toVertexId: 5  },
  { id: '1-2-lift1',  buildingId: 'library', name: 'Lift 1',        type: 'lift',   fromFloor: 1, fromVertexId: 5,  toFloor: 2, toVertexId: 11 },
  { id: '2-1-lift2',  buildingId: 'library', name: 'Lift 2',        type: 'lift',   fromFloor: 2, fromVertexId: 12, toFloor: 1, toVertexId: 6  },
  { id: '1-2-lift2',  buildingId: 'library', name: 'Lift 2',        type: 'lift',   fromFloor: 1, fromVertexId: 6,  toFloor: 2, toVertexId: 12 },
  // ── Library: Ground Floor(2) ↔ Second Floor(4) via Lifts ─────────
  { id: '2-4-lift1',  buildingId: 'library', name: 'Lift 1',        type: 'lift',   fromFloor: 2, fromVertexId: 11, toFloor: 4, toVertexId: 5  },
  { id: '4-2-lift1',  buildingId: 'library', name: 'Lift 1',        type: 'lift',   fromFloor: 4, fromVertexId: 5,  toFloor: 2, toVertexId: 11 },
  { id: '2-4-lift2',  buildingId: 'library', name: 'Lift 2',        type: 'lift',   fromFloor: 2, fromVertexId: 12, toFloor: 4, toVertexId: 6  },
  { id: '4-2-lift2',  buildingId: 'library', name: 'Lift 2',        type: 'lift',   fromFloor: 4, fromVertexId: 6,  toFloor: 2, toVertexId: 12 },
  // ── Library: Ground Floor(2) ↔ Basement(1) via Stairs ────────────
  { id: '2-1-stair',  buildingId: 'library', name: 'Stairs',        type: 'stairs', fromFloor: 2, fromVertexId: 13, toFloor: 1, toVertexId: 28 },
  { id: '1-2-stair',  buildingId: 'library', name: 'Stairs',        type: 'stairs', fromFloor: 1, fromVertexId: 28, toFloor: 2, toVertexId: 13 },
  // ── Library: Ground Floor(2) ↔ First Floor(3) via Stairs ─────────
  { id: '2-3-stair',  buildingId: 'library', name: 'Stairs',        type: 'stairs', fromFloor: 2, fromVertexId: 14, toFloor: 3, toVertexId: 48 },
  { id: '3-2-stair',  buildingId: 'library', name: 'Stairs',        type: 'stairs', fromFloor: 3, fromVertexId: 48, toFloor: 2, toVertexId: 14 },
];

export function getTransitions(fromFloor: number, toFloor: number, buildingId?: string): FloorTransition[] {
  return floorTransitions.filter(t =>
    t.fromFloor === fromFloor &&
    t.toFloor   === toFloor   &&
    (buildingId == null || t.buildingId === buildingId)
  );
}
