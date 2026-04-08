export interface GraphNode {
    id: number;
    x_coordinate: number;
    y_coordinate: number;
    name: string;
    type: string;
}

export interface GraphEdge {
    start_location_id: number;
    end_location_id: number;
    distance: number;
    is_bidirectional: boolean;
}

export interface Graph {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export interface PathResult {
    path: GraphNode[];
    totalDistance: number;
    waypoints: Array<{ x: number; y: number }>;
}

export function dijkstra(
    graph: Graph,
    startId: number,
    endId: number
): PathResult | null {
    const distances: Record<number, number> = {};
    const previous: Record<number, number | null> = {};
    const unvisited = new Set<number>();

    // Initialize
    graph.nodes.forEach(node => {
        distances[node.id] = Infinity;
        previous[node.id] = null;
        unvisited.add(node.id);
    });
    distances[startId] = 0;

    while (unvisited.size > 0) {
        // Get unvisited node with smallest distance
        let current: number | null = null;
        unvisited.forEach(id => {
            if (current === null || distances[id] < distances[current]) {
                current = id;
            }
        });

        if (current === null || distances[current] === Infinity) break;
        if (current === endId) break;

        unvisited.delete(current);

        // Check neighbors
        const edges = graph.edges.filter(e =>
            e.start_location_id === current ||
            (e.is_bidirectional && e.end_location_id === current)
        );

        for (const edge of edges) {
            const neighborId = edge.start_location_id === current
                ? edge.end_location_id
                : edge.start_location_id;

            if (!unvisited.has(neighborId)) continue;

            const alt = distances[current] + edge.distance;
            if (alt < distances[neighborId]) {
                distances[neighborId] = alt;
                previous[neighborId] = current;
            }
        }
    }

    // Reconstruct path
    if (distances[endId] === Infinity) return null;

    const pathIds: number[] = [];
    let current: number | null = endId;
    while (current !== null) {
        pathIds.unshift(current);
        current = previous[current];
    }

    const pathNodes = pathIds
        .map(id => graph.nodes.find(n => n.id === id)!)
        .filter(Boolean);

    return {
        path: pathNodes,
        totalDistance: distances[endId],
        waypoints: pathNodes.map(n => ({
            x: n.x_coordinate,
            y: n.y_coordinate
        }))
    };
}