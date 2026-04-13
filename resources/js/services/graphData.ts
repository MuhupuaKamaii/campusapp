/**
 * Campus Graph Data
 * 
 * Defines interfaces and types for the wayfinding system.
 * Floor-specific data is imported from individual floor files.
 * This data structure mirrors the database locations and paths tables,
 * providing client-side access to the navigation graph.
 */

import { firstFloorGraphData } from './firstFloorGraphData';

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
    case 3:
      return firstFloorGraphData;
    default:
      throw new Error(`Floor ${floorId} graph data not found`);
  }
}

// Alias for consistency
export const getFloorGraphData = getGraphDataByFloorId;

/**
 * Find vertex by ID
 */
export function findVertex(graphData: GraphData, vertexId: number): CampusVertex | undefined {
  return graphData.vertices.find(v => v.id === vertexId);
}

/**
 * Find all edges connected to a vertex
 */
export function findConnectedEdges(graphData: GraphData, vertexId: number): CampusEdge[] {
  return graphData.edges.filter(e => e.from === vertexId || e.to === vertexId);
}

/**
 * Find adjacent vertices
 */
export function findAdjacentVertices(graphData: GraphData, vertexId: number): CampusVertex[] {
  const edges = graphData.edges.filter(e => e.from === vertexId);
  return edges
    .map(e => findVertex(graphData, e.to))
    .filter((v): v is CampusVertex => v !== undefined);
}

/**
 * Export graph data for debugging/visualization
 */
export function exportGraphDataAsJSON(graphData: GraphData): string {
  return JSON.stringify(graphData, null, 2);
}
