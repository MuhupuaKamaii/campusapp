import { firstFloorGraphData } from './firstFloorGraphData';
import { secondFloorGraphData } from './secondFloorGraphData';
import { basementFloorGraphData } from './basementFloorGraphData';

export interface CampusVertex {
  id: number;
  name: string;
  type: 'entrance' | 'service' | 'study' | 'lab' | 'office' | 'restroom' | 'food' | 'rest' | 'collection' | 'walkway' | 'exit';
  cx: number;
  cy: number;
  floor_id: number;
}

export interface CampusEdge {
  id: number;
  from: number;  // vertex id
  to: number;    // vertex id
  distance: number; // in meters
}

export interface GraphData {
  vertices: CampusVertex[];
  edges: CampusEdge[];
  floorId: number;
  floorName: string;
}

/**
 * Get graph data for a specific floor
 * @param floorId - The floor ID to retrieve (currently only 3 for First Floor is implemented)
 * @returns GraphData for the requested floor
 */
export function getGraphDataByFloorId(floorId: number): GraphData {
  switch (floorId) {
    case 1: return basementFloorGraphData;
    case 3: return firstFloorGraphData;
    case 4: return secondFloorGraphData;
    default:
      throw new Error(`Floor ${floorId} graph data not found`);
  }
}

// Alias for consistency
export const getFloorGraphData = getGraphDataByFloorId;

// Find vertex by ID
 
export function findVertex(graphData: GraphData, vertexId: number): CampusVertex | undefined {
  return graphData.vertices.find(v => v.id === vertexId);
}

// Find all edges connected to a vertex
export function findConnectedEdges(graphData: GraphData, vertexId: number): CampusEdge[] {
  return graphData.edges.filter(e => e.from === vertexId || e.to === vertexId);
}


  //Find adjacent vertices
export function findAdjacentVertices(graphData: GraphData, vertexId: number): CampusVertex[] {
  const edges = graphData.edges.filter(e => e.from === vertexId);
  return edges
    .map(e => findVertex(graphData, e.to))
    .filter((v): v is CampusVertex => v !== undefined);
}

// Client-side Dijkstra pathfinding on a GraphData object.
//  Returns the ordered list of vertex IDs and total distance, or empty if unreachable.

export function findPathOnGraph(
  graphData: GraphData,
  startId: number,
  endId: number,
): { nodeIds: number[]; distance: number } {
  const dist: Record<number, number> = {};
  const prev: Record<number, number | null> = {};
  const unvisited = new Set<number>();

  for (const v of graphData.vertices) {
    dist[v.id] = Infinity;
    prev[v.id] = null;
    unvisited.add(v.id);
  }
  dist[startId] = 0;

  // O(1) vertex lookup by id
  const vertexMap = new Map<number, CampusVertex>();
  for (const v of graphData.vertices) vertexMap.set(v.id, v);

  while (unvisited.size > 0) {
    let current: number | null = null;
    unvisited.forEach(id => {
      if (current === null || dist[id] < dist[current!]) current = id;
    });
    if (current === null || dist[current] === Infinity || current === endId) break;
    unvisited.delete(current);

    for (const edge of graphData.edges) {
      if (edge.from !== current && edge.to !== current) continue;
      const neighborId = edge.from === current ? edge.to : edge.from;
      if (!unvisited.has(neighborId)) continue;

      // Use Euclidean distance from coordinates — hardcoded edge distances are unreliable
      const a = vertexMap.get(current)!;
      const b = vertexMap.get(neighborId)!;
      const edgeDist = Math.sqrt((b.cx - a.cx) ** 2 + (b.cy - a.cy) ** 2);

      const alt = dist[current] + edgeDist;
      if (alt < dist[neighborId]) {
        dist[neighborId] = alt;
        prev[neighborId] = current;
      }
    }
  }

  const path: number[] = [];
  let curr: number | null = endId;
  while (curr !== null) {
    path.unshift(curr);
    curr = prev[curr] ?? null;
  }

  if (path[0] !== startId) return { nodeIds: [], distance: 0 };
  return { nodeIds: path, distance: dist[endId] };
}

/**
 * Export graph data for debugging/visualization
 */
export function exportGraphDataAsJSON(graphData: GraphData): string {
  return JSON.stringify(graphData, null, 2);
}