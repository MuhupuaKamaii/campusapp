<?php

namespace App\Http\Controllers;

use App\Models\Floor;
use App\Models\Location;
use App\Models\Path;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PathController extends Controller
{
    /**
     * Get all locations for a specific floor
     */
    public function getFloorLocations(int $floorId): JsonResponse
    {
        try {
            $floor = Floor::findOrFail($floorId);
            $locations = Location::where('floor_id', $floorId)
                ->select('id', 'name', 'type', 'x_coordinate', 'y_coordinate')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $locations,
                'floor' => $floor
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Floor not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Get all path connections for a specific floor
     */
    public function getFloorPaths(int $floorId): JsonResponse
    {
        try {
            $paths = Path::whereHas('startLocation', function ($query) use ($floorId) {
                $query->where('floor_id', $floorId);
            })
                ->with('startLocation:id,name', 'endLocation:id,name')
                ->select('id', 'start_location_id', 'end_location_id', 'distance')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $paths
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching paths',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate shortest path between two locations using Dijkstra's algorithm
     */
    public function calculatePath(int $startId, int $endId): JsonResponse
    {
        try {
            // Validate locations exist
            $startLocation = Location::findOrFail($startId);
            $endLocation = Location::findOrFail($endId);

            // Ensure both locations are on the same floor
            if ($startLocation->floor_id !== $endLocation->floor_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Locations must be on the same floor'
                ], 400);
            }

            // If start and end are the same
            if ($startId === $endId) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'path' => [
                            [
                                'id' => $startLocation->id,
                                'name' => $startLocation->name,
                                'type' => $startLocation->type,
                                'x_coordinate' => $startLocation->x_coordinate,
                                'y_coordinate' => $startLocation->y_coordinate,
                            ]
                        ],
                        'distance' => 0,
                        'waypoints' => [
                            ['x' => $startLocation->x_coordinate, 'y' => $startLocation->y_coordinate]
                        ]
                    ]
                ]);
            }

            // Get all locations and build graph
            $locations = Location::where('floor_id', $startLocation->floor_id)
                ->get()
                ->keyBy('id');

            $paths = Path::whereHas('startLocation', function ($query) use ($startLocation) {
                $query->where('floor_id', $startLocation->floor_id);
            })->get();

            // Build adjacency list graph
            $graph = [];
            foreach ($locations as $loc) {
                $graph[$loc->id] = [];
            }

            foreach ($paths as $path) {
                $graph[$path->start_location_id][] = [
                    'to' => $path->end_location_id,
                    'distance' => $path->distance
                ];
            }

            // Run Dijkstra's algorithm
            $result = $this->dijkstra($graph, $startId, $endId, $locations);

            if ($result['found']) {
                // Extract waypoints from the path
                $waypoints = [];
                foreach ($result['path'] as $locationId) {
                    $loc = $locations[$locationId];
                    $waypoints[] = [
                        'x' => $loc->x_coordinate,
                        'y' => $loc->y_coordinate
                    ];
                }

                // Build full path with location details
                $pathWithDetails = [];
                foreach ($result['path'] as $locationId) {
                    $loc = $locations[$locationId];
                    $pathWithDetails[] = [
                        'id' => $loc->id,
                        'name' => $loc->name,
                        'type' => $loc->type,
                        'x_coordinate' => $loc->x_coordinate,
                        'y_coordinate' => $loc->y_coordinate,
                    ];
                }

                return response()->json([
                    'success' => true,
                    'data' => [
                        'path' => $pathWithDetails,
                        'distance' => $result['distance'],
                        'waypoints' => $waypoints
                    ]
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'No path found between these locations'
                ], 404);
            }
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Location not found'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error calculating path',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Dijkstra's shortest path algorithm implementation
     * 
     * @param array $graph Adjacency list representation of the graph
     * @param int $start Starting node ID
     * @param int $end Ending node ID
     * @param \Illuminate\Database\Eloquent\Collection $locations Location objects keyed by ID
     * @return array Array with 'found' boolean, 'path' array of node IDs, and 'distance' total
     */
    private function dijkstra(array $graph, int $start, int $end, $locations): array
    {
        $distances = [];
        $previous = [];
        $unvisited = [];

        // Initialize distances
        foreach ($graph as $nodeId => $edges) {
            $distances[$nodeId] = PHP_INT_MAX;
            $previous[$nodeId] = null;
            $unvisited[$nodeId] = true;
        }

        $distances[$start] = 0;

        // Main algorithm loop
        while (!empty($unvisited)) {
            // Find unvisited node with minimum distance
            $current = null;
            $minDistance = PHP_INT_MAX;

            foreach ($unvisited as $nodeId => $visited) {
                if ($distances[$nodeId] < $minDistance) {
                    $minDistance = $distances[$nodeId];
                    $current = $nodeId;
                }
            }

            // If we've reached the end or no path exists
            if ($current === null || $distances[$current] === PHP_INT_MAX) {
                break;
            }

            // Remove current from unvisited
            unset($unvisited[$current]);

            // If we reached the destination, we can stop
            if ($current === $end) {
                break;
            }

            // Update distances to neighbors
            if (isset($graph[$current])) {
                foreach ($graph[$current] as $edge) {
                    $neighbor = $edge['to'];
                    $weight = $edge['distance'];

                    if (isset($unvisited[$neighbor])) {
                        $newDistance = $distances[$current] + $weight;

                        if ($newDistance < $distances[$neighbor]) {
                            $distances[$neighbor] = $newDistance;
                            $previous[$neighbor] = $current;
                        }
                    }
                }
            }
        }

        // Reconstruct path
        $path = [];
        $current = $end;

        if ($previous[$current] === null && $current !== $start) {
            // No path found
            return [
                'found' => false,
                'path' => [],
                'distance' => 0
            ];
        }

        // Build path by backtracking through previous nodes
        while ($current !== null) {
            array_unshift($path, $current);
            $current = $previous[$current];
        }

        return [
            'found' => true,
            'path' => $path,
            'distance' => $distances[$end]
        ];
    }
}
