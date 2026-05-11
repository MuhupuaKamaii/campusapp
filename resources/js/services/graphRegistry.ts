import { GraphData } from './graphData';

const registry = new Map<number, GraphData>();

export function registerFloorGraph(data: GraphData): void {
  registry.set(data.floorId, data);
}

export function getFloorGraph(floorId: number): GraphData {
  const data = registry.get(floorId);
  if (!data) throw new Error(`No graph registered for floor ${floorId}`);
  return data;
}

export function isFloorRegistered(floorId: number): boolean {
  return registry.has(floorId);
}
