import { Node, Path } from '../types/IndoorMap'; // Ensure this path is correct for your project

/**
 * Shortest Path Algorithm (Dijkstra)
 * Finds the sequence of node IDs to follow to reach the destination.
 */
export function findShortestPath(
    nodes: Node[],
    paths: Path[],
    startNodeId: number,
    endNodeId: number
): number[] {
    const distances: Record<number, number> = {};
    const previous: Record<number, number | null> = {};
    const unvisited = new Set<number>();

    // Initialize the graph
    nodes.forEach(node => {
        distances[node.id] = Infinity;
        previous[node.id] = null;
        unvisited.add(node.id);
    });

    distances[startNodeId] = 0;

    while (unvisited.size > 0) {
        // Find the node in unvisited with the smallest distance
        let currentId: number | null = null;
        unvisited.forEach(id => {
            if (currentId === null || distances[id] < distances[currentId]) {
                currentId = id;
            }
        });

        if (currentId === null || distances[currentId] === Infinity || currentId === endNodeId) {
            break;
        }

        unvisited.delete(currentId);

        // Check neighbours
        const connections = paths.filter(p => p.start_location_id === currentId || p.end_location_id === currentId);
        
        for (const path of connections) {
            const neighborId = path.start_location_id === currentId ? path.end_location_id : path.start_location_id;
            
            if (!unvisited.has(neighborId)) continue;

            const alt = distances[currentId] + path.distance;
            if (alt < distances[neighborId]) {
                distances[neighborId] = alt;
                previous[neighborId] = currentId;
            }
        }
    }

    // Reconstruct the path array
    const pathIds: number[] = [];
    let curr: number | null = endNodeId;
    
    while (curr !== null) {
        pathIds.unshift(curr);
        curr = previous[curr];
    }

    return pathIds[0] === startNodeId ? pathIds : [];
}