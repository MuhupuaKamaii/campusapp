// Indoor Navigation Graph & Pathfinding Engine
// Adapted from walkwayGraph.js for 2D floor coordinates
// Supports single-floor and multi-floor routing via stairs/elevators

import { Node, Path } from '../types/IndoorMap';

export interface FloorNode extends Node {
    floor_id: number;
}

export interface FloorPath extends Path {
    startLocation?: FloorNode;
    endLocation?: FloorNode;
}

export interface RouteStep {
    step: number;
    floor_id: number;
    floor_level: number;
    start_location_id: number;
    start_name: string;
    end_location_id: number;
    end_name: string;
    distance: number;
    instruction: string;
    nodes: FloorNode[];
    paths: number[]; // Path IDs in sequence
}

export interface IndoorRoute {
    totalDistance: number;
    totalSteps: number;
    steps: RouteStep[];
    estimatedTime: number; // in seconds
}

// Calculate Euclidean distance between two 2D points
function euclideanDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

// Convert node coordinates to a unique string key
function nodeKey(nodeId: number, floorId: number): string {
    return `${floorId}:${nodeId}`;
}

// Build a graph from floor nodes and paths
export function buildIndoorGraph(
    nodes: FloorNode[],
    paths: FloorPath[],
    floors: { id: number; level: number }[] = []
) {
    const graph: Record<string, Array<{ to: string; nodeId: number; floorId: number; dist: number }>> = {};
    const nodeMap = new Map<string, FloorNode>();

    // Initialize graph with all nodes
    nodes.forEach(node => {
        const key = nodeKey(node.id, node.floor_id);
        graph[key] = [];
        nodeMap.set(key, { ...node, floor_id: node.floor_id });
    });

    // Add edges from paths (bidirectional for hallways/regular paths)
    paths.forEach(path => {
        if (!path.startLocation || !path.endLocation) return;

        const startKey = nodeKey(path.startLocation.id, path.startLocation.floor_id);
        const endKey = nodeKey(path.endLocation.id, path.endLocation.floor_id);

        const distance = path.distance || euclideanDistance(
            path.startLocation.x_coordinate,
            path.startLocation.y_coordinate,
            path.endLocation.x_coordinate,
            path.endLocation.y_coordinate
        );

        // Bidirectional edges for general paths
        if (graph[startKey]) {
            graph[startKey].push({
                to: endKey,
                nodeId: path.endLocation.id,
                floorId: path.endLocation.floor_id,
                dist: distance,
            });
        }

        if (graph[endKey]) {
            graph[endKey].push({
                to: startKey,
                nodeId: path.startLocation.id,
                floorId: path.startLocation.floor_id,
                dist: distance,
            });
        }
    });

    // Create vertical connectors for stairs/elevators on different floors
    // Group stairs/elevators by name to connect same stair across floors
    const stairsByName = new Map<string, FloorNode[]>();
    nodes
        .filter(n => n.type === 'stairs')
        .forEach(stair => {
            const name = stair.name || `Stairs-${stair.id}`;
            if (!stairsByName.has(name)) {
                stairsByName.set(name, []);
            }
            stairsByName.get(name)!.push(stair);
        });

    // Connect stairs/elevators on different floors with vertical edges
    stairsByName.forEach((stairsOnFloors) => {
        if (stairsOnFloors.length > 1) {
            // Sort by floor level to ensure proper ordering
            const floorMap = new Map(floors.map(f => [f.id, f.level]));
            stairsOnFloors.sort((a, b) => (floorMap.get(a.floor_id) || 0) - (floorMap.get(b.floor_id) || 0));

            // Connect adjacent floors via stairs
            for (let i = 0; i < stairsOnFloors.length - 1; i++) {
                const currentStair = stairsOnFloors[i];
                const nextStair = stairsOnFloors[i + 1];

                const currentKey = nodeKey(currentStair.id, currentStair.floor_id);
                const nextKey = nodeKey(nextStair.id, nextStair.floor_id);

                const verticalDistance = 5; // Fixed cost for vertical transition (one floor)

                if (graph[currentKey]) {
                    graph[currentKey].push({
                        to: nextKey,
                        nodeId: nextStair.id,
                        floorId: nextStair.floor_id,
                        dist: verticalDistance,
                    });
                }

                if (graph[nextKey]) {
                    graph[nextKey].push({
                        to: currentKey,
                        nodeId: currentStair.id,
                        floorId: currentStair.floor_id,
                        dist: verticalDistance,
                    });
                }
            }
        }
    });

    return { graph, nodeMap };
}

// Find the nearest node to given coordinates on a specific floor
export function findNearestNodeOnFloor(
    nodes: FloorNode[],
    floorId: number,
    x: number,
    y: number
): FloorNode | null {
    let minDist = Infinity;
    let nearest: FloorNode | null = null;

    nodes
        .filter(n => n.floor_id === floorId)
        .forEach(node => {
            const dist = euclideanDistance(x, y, node.x_coordinate, node.y_coordinate);
            if (dist < minDist) {
                minDist = dist;
                nearest = node;
            }
        });

    return nearest;
}

// Find shortest path using A* algorithm (with heuristic) or Dijkstra (without floors)
export function findShortestPath(
    graph: Record<string, Array<{ to: string; nodeId: number; floorId: number; dist: number }>>,
    nodeMap: Map<string, FloorNode>,
    startKey: string,
    endKey: string
): string[] {
    const dist: Record<string, number> = {};
    const prev: Record<string, string> = {};
    const visited = new Set<string>();

    dist[startKey] = 0;
    const queue: [number, string][] = [[0, startKey]];

    while (queue.length > 0) {
        // Sort by distance (priority queue simulation)
        queue.sort((a, b) => a[0] - b[0]);
        const [d, u] = queue.shift()!;

        if (visited.has(u)) continue;
        visited.add(u);

        if (u === endKey) break;

        const neighbors = graph[u] || [];
        for (const edge of neighbors) {
            const v = edge.to;
            const alt = d + edge.dist;

            if (alt < (dist[v] ?? Infinity)) {
                dist[v] = alt;
                prev[v] = u;
                queue.push([alt, v]);
            }
        }
    }

    // Reconstruct path
    const path: string[] = [];
    let u: string | undefined = endKey;

    while (u && u !== startKey) {
        path.unshift(u);
        u = prev[u];
    }

    if (u === startKey) {
        path.unshift(startKey);
    }

    return path;
}

// Convert path keys to node objects and extract routing information
export function extractRouteSteps(
    pathKeys: string[],
    nodeMap: Map<string, FloorNode>,
    paths: FloorPath[],
    floorMap: Map<number, { level: number; name: string }> = new Map()
): RouteStep[] {
    const steps: RouteStep[] = [];
    let currentFloor: number | null = null;
    let stepNumber = 0;

    for (let i = 0; i < pathKeys.length - 1; i++) {
        const fromKey = pathKeys[i];
        const toKey = pathKeys[i + 1];

        const fromNode = nodeMap.get(fromKey);
        const toNode = nodeMap.get(toKey);

        if (!fromNode || !toNode) continue;

        // Detect floor change (vertical transition)
        if (fromNode.floor_id !== toNode.floor_id) {
            stepNumber++;
            const fromFloor = floorMap.get(fromNode.floor_id) || { level: fromNode.floor_id, name: `Floor ${fromNode.floor_id}` };
            const toFloor = floorMap.get(toNode.floor_id) || { level: toNode.floor_id, name: `Floor ${toNode.floor_id}` };

            const verticalPath = paths.find(
                p =>
                    (p.startLocation?.id === fromNode.id && p.endLocation?.id === toNode.id) ||
                    (p.startLocation?.id === toNode.id && p.endLocation?.id === fromNode.id)
            );

            steps.push({
                step: stepNumber,
                floor_id: fromNode.floor_id,
                floor_level: fromFloor.level,
                start_location_id: fromNode.id,
                start_name: fromNode.name || 'Current Location',
                end_location_id: toNode.id,
                end_name: toNode.name || `${toFloor.name}`,
                distance: verticalPath?.distance || 5,
                instruction: `Proceed to ${fromNode.name || 'stairs/elevator'} and climb/take elevator to ${toFloor.name}`,
                nodes: [fromNode, toNode],
                paths: verticalPath ? [verticalPath.id] : [],
            });

            // Start new floor
            currentFloor = toNode.floor_id;
        } else if (fromNode.floor_id !== currentFloor) {
            // New floor started
            currentFloor = fromNode.floor_id;
            stepNumber++;

            const floorInfo = floorMap.get(fromNode.floor_id) || { level: fromNode.floor_id, name: `Floor ${fromNode.floor_id}` };
            steps.push({
                step: stepNumber,
                floor_id: fromNode.floor_id,
                floor_level: floorInfo.level,
                start_location_id: fromNode.id,
                start_name: fromNode.name || 'Start',
                end_location_id: toNode.id,
                end_name: toNode.name || 'Destination',
                distance: 0,
                instruction: `You are now on ${floorInfo.name}. Walk to ${toNode.name}`,
                nodes: [fromNode, toNode],
                paths: [],
            });
        } else {
            // Same floor navigation
            const nodePath = paths.find(
                p =>
                    (p.startLocation?.id === fromNode.id && p.endLocation?.id === toNode.id) ||
                    (p.startLocation?.id === toNode.id && p.endLocation?.id === fromNode.id)
            );

            if (!steps.some(s => s.step === stepNumber) && stepNumber === 0) {
                stepNumber++;
                const floorInfo = floorMap.get(fromNode.floor_id) || { level: fromNode.floor_id, name: `Floor ${fromNode.floor_id}` };

                steps.push({
                    step: stepNumber,
                    floor_id: fromNode.floor_id,
                    floor_level: floorInfo.level,
                    start_location_id: fromNode.id,
                    start_name: fromNode.name || 'Start',
                    end_location_id: toNode.id,
                    end_name: toNode.name || 'Destination',
                    distance: nodePath?.distance || euclideanDistance(fromNode.x_coordinate, fromNode.y_coordinate, toNode.x_coordinate, toNode.y_coordinate),
                    instruction: `Walk to ${toNode.name || 'destination'}`,
                    nodes: [fromNode, toNode],
                    paths: nodePath ? [nodePath.id] : [],
                });
            }
        }
    }

    return steps;
}

// Main function to calculate complete indoor route
export async function calculateIndoorRoute(
    startLocationId: number,
    endLocationId: number,
    nodes: FloorNode[],
    paths: FloorPath[],
    floors: { id: number; level: number; name: string }[] = []
): Promise<IndoorRoute | null> {
    const { graph, nodeMap } = buildIndoorGraph(nodes, paths, floors);

    const startNode = nodes.find(n => n.id === startLocationId);
    const endNode = nodes.find(n => n.id === endLocationId);

    if (!startNode || !endNode) {
        console.error('Start or end location not found');
        return null;
    }

    const startKey = nodeKey(startNode.id, startNode.floor_id);
    const endKey = nodeKey(endNode.id, endNode.floor_id);

    if (!graph[startKey] || !graph[endKey]) {
        console.error('Start or end location not in graph');
        return null;
    }

    const pathKeys = findShortestPath(graph, nodeMap, startKey, endKey);

    if (pathKeys.length === 0) {
        console.error('No path found');
        return null;
    }

    const floorMap = new Map(floors.map(f => [f.id, { level: f.level, name: f.name }]));
    const steps = extractRouteSteps(pathKeys, nodeMap, paths, floorMap);

    const totalDistance = steps.reduce((sum, s) => sum + s.distance, 0);
    const estimatedTime = Math.ceil(totalDistance / 1.4); // Assuming 1.4 units per second walking speed

    return {
        totalDistance,
        totalSteps: steps.length,
        steps,
        estimatedTime,
    };
}
