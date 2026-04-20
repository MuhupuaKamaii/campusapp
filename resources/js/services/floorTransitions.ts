export interface FloorTransition {
  id: string;
  name: string;
  type: 'lift' | 'stairs';
  fromFloor: number;
  fromVertexId: number;
  toFloor: number;
  toVertexId: number;
}

// Basement(1) ↔ Second Floor(4) via Lifts
// First Floor(3) ↔ Basement(1) via Stairs
// NOTE: Ground Floor(2) not yet mapped — no graph data available.
export const floorTransitions: FloorTransition[] = [
  { id: 'b4-lift1',  name: 'Lift 1',  type: 'lift',   fromFloor: 1, fromVertexId: 5,  toFloor: 4, toVertexId: 5  },
  { id: '4b-lift1',  name: 'Lift 1',  type: 'lift',   fromFloor: 4, fromVertexId: 5,  toFloor: 1, toVertexId: 5  },
  { id: 'b4-lift2',  name: 'Lift 2',  type: 'lift',   fromFloor: 1, fromVertexId: 6,  toFloor: 4, toVertexId: 6  },
  { id: '4b-lift2',  name: 'Lift 2',  type: 'lift',   fromFloor: 4, fromVertexId: 6,  toFloor: 1, toVertexId: 6  },
  { id: 'b3-stair',  name: 'Stairs',        type: 'stairs', fromFloor: 1, fromVertexId: 27, toFloor: 3, toVertexId: 48 },
  { id: '3b-stair',  name: 'Stairs',        type: 'stairs', fromFloor: 3, fromVertexId: 48, toFloor: 1, toVertexId: 27 },
  // First Floor (3) ↔ Second Floor (4) via Bridge Stairs
  { id: '3-4-bridge', name: 'Bridge Stairs', type: 'stairs', fromFloor: 3, fromVertexId: 49, toFloor: 4, toVertexId: 26 },
  { id: '4-3-bridge', name: 'Bridge Stairs', type: 'stairs', fromFloor: 4, fromVertexId: 26, toFloor: 3, toVertexId: 49 },
];

export function getTransitions(fromFloor: number, toFloor: number): FloorTransition[] {
  return floorTransitions.filter(t => t.fromFloor === fromFloor && t.toFloor === toFloor);
}
