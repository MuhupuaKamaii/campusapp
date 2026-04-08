<?php

namespace App\Http\Controllers;

use App\Models\Building;
use App\Models\Floor;
use App\Models\Location;
use App\Models\Path;
use Illuminate\Http\Request;

class IndoorNavigationController extends Controller
{
    /**
     * Get all buildings
     */
    public function getAllBuildings()
    {
        $buildings = Building::all();
        return response()->json($buildings);
    }

    /**
     * Get all floors for a building
     */
    public function getFloors($buildingId)
    {
        $floors = Floor::where('building_id', $buildingId)
            ->orderBy('level')
            ->get();
        
        return response()->json($floors);
    }

    public function getFloorLocations($floorId)
{
    $locations = Location::where('floor_id', $floorId)->get();
    return response()->json($locations);
}
    /**
     * Save extracted GeoJSON files to public folder
     */
    public function saveGeoJSON(Request $request)
    {
        $request->validate([
            'fileName' => 'required|string',
            'floorName' => 'required|string',
            'geojson' => 'required|array',
        ]);

        try {
            // Ensure public/floor-plans directory exists
            $dirPath = public_path('floor-plans');
            if (!is_dir($dirPath)) {
                mkdir($dirPath, 0755, true);
            }

            // Save GeoJSON file
            $filePath = $dirPath . '/' . $request->fileName . '.geojson';
            file_put_contents($filePath, json_encode($request->geojson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return response()->json([
                'success' => true,
                'message' => "GeoJSON saved for {$request->floorName}",
                'path' => url('floor-plans/' . $request->fileName . '.geojson'),
                'file' => $request->fileName . '.geojson',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Seed floor locations from extracted GeoJSON
     */
    public function seedFloorLocations(Request $request)
    {
        try {
            // Handle both batch and single floor requests
            $results = $request->input('results');
            $isBatchRequest = isset($results) && is_array($results);

            // Determine building (assume Library building)
            $building = Building::where('name', 'Library')->first();
            if (!$building) {
                $building = Building::create(['name' => 'Library']);
            }

            // Map floor names to levels
            $floorLevels = [
                'Basement' => -1,
                'Ground' => 0,
                'First' => 1,
                'Second' => 2,
            ];

            $totalCreated = 0;

            if ($isBatchRequest) {
                // Process batch of multiple floors
                foreach ($results as $floorData) {
                    $floorName = $floorData['name'] ?? self::getFloorNameFromLevel($floorData['level']);
                    $floorLevel = $floorData['level'] ?? 0;

                    // Get or create floor
                    $floor = Floor::firstOrCreate(
                        [
                            'building_id' => $building->id,
                            'level' => $floorLevel,
                        ],
                        ['name' => $floorName]
                    );

                    // Clear existing locations for this floor (fresh import)
                    Location::where('floor_id', $floor->id)->delete();

                    // Process locations from extraction
                    $locations = $floorData['locations'] ?? [];
                    foreach ($locations as $location) {
                        Location::create([
                            'floor_id' => $floor->id,
                            'name' => $location['name'] ?? 'Unknown',
                            'type' => $location['type'] ?? 'room',
                            'x_coordinate' => $location['x_coordinate'] ?? 0,
                            'y_coordinate' => $location['y_coordinate'] ?? 0,
                            'description' => "Extracted from SVG label (confidence: {$location['confidence']})",
                        ]);
                        $totalCreated++;
                    }

                    \Log::info("Seeded {$floorName} with " . count($locations) . " locations");
                }

                return response()->json([
                    'success' => true,
                    'message' => "Seeded database with extracted locations",
                    'building_id' => $building->id,
                    'created_count' => $totalCreated,
                ]);
            } else {
                // Process single floor (legacy format)
                $request->validate([
                    'floor' => 'required|string',
                    'fileName' => 'required|string',
                    'geojson' => 'required|array',
                ]);

                $floorLevel = $floorLevels[$request->floor] ?? 0;

                // Get or create floor
                $floor = Floor::firstOrCreate(
                    [
                        'building_id' => $building->id,
                        'level' => $floorLevel,
                    ],
                    ['name' => $request->floor]
                );

                $features = $request->geojson['features'] ?? [];
                $createdCount = 0;

                foreach ($features as $feature) {
                    $properties = $feature['properties'] ?? [];
                    $coordinates = $feature['geometry']['coordinates'] ?? [0, 0];

                    // Create location
                    Location::updateOrCreate(
                        [
                            'floor_id' => $floor->id,
                            'name' => $properties['name'] ?? 'Unknown',
                        ],
                        [
                            'type' => $properties['type'] ?? 'room',
                            'x_coordinate' => $coordinates[0] ?? 0,
                            'y_coordinate' => $coordinates[1] ?? 0,
                            'area_sqm' => $properties['area_sqm'] ?? null,
                        ]
                    );

                    $createdCount++;
                }

                return response()->json([
                    'success' => true,
                    'message' => "Seeded {$request->floor} with locations",
                    'count' => $createdCount,
                    'floor_id' => $floor->id,
                ]);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Helper to get floor name from level
     */
    private static function getFloorNameFromLevel($level)
    {
        $levelNames = [
            -1 => 'Basement',
            0 => 'Ground',
            1 => 'First',
            2 => 'Second',
        ];
        return $levelNames[$level] ?? "Floor {$level}";
    }

    /**
     * Get graph data (nodes and paths) for a specific floor, including PDF path
     */
    public function getGraphData($floorId)
    {
        $floor = Floor::find($floorId);
        $nodes = Location::where('floor_id', $floorId)->get();
        $paths = Path::with(['startLocation', 'endLocation'])
            ->whereHas('startLocation', fn($q) => $q->where('floor_id', $floorId))
            ->get();
        
        return response()->json([
            'floor' => $floor,
            'nodes' => $nodes,
            'paths' => $paths,
            'pdfPath' => $floor?->pdf_path ? url('storage/floorplans/' . basename($floor->pdf_path)) : null,
        ]);
    }

    /**
     * Get all available floor plans from the Floor Plans folder
     */
    public function getFloorPlans()
    {
        $floorPlansPath = public_path('Floor Plans');
        $floorPlans = [];

        if (is_dir($floorPlansPath)) {
            $files = scandir($floorPlansPath);
            foreach ($files as $file) {
                if (strtolower(pathinfo($file, PATHINFO_EXTENSION)) === 'pdf') {
                    // Extract the floor name from the filename
                    // Format: 938-11_Floor Fin layouts_P-231_Basement Floor.pdf
                    // Extract what comes after the last underscore and before .pdf
                    $name = preg_replace('/^.*_([^_]*)\.pdf$/i', '$1', $file);
                    
                    $floorPlans[] = [
                        'filename' => $file,
                        'name' => $name ?: $file,
                    ];
                }
            }
        }

        return response()->json($floorPlans);
    }
    /**
     * Calculate route between two indoor locations
     */
    public function calculateRoute(Request $request)
    {
        $request->validate([
            'start_location_id' => 'required|integer|exists:locations,id',
            'end_location_id' => 'required|integer|exists:locations,id',
        ]);

        $startLocation = Location::with('floor')->find($request->start_location_id);
        $endLocation = Location::with('floor')->find($request->end_location_id);

        if (!$startLocation || !$endLocation) {
            return response()->json(['error' => 'Location not found'], 404);
        }

        // Get all nodes and paths needed for routing
        $buildingIds = collect([$startLocation->floor->building_id, $endLocation->floor->building_id])->unique();
        $floors = Floor::whereIn('building_id', $buildingIds)->with(['locations', 'building'])->get();

        $allNodes = [];
        $allPaths = [];

        foreach ($floors as $floor) {
            $floorNodes = Location::where('floor_id', $floor->id)->get();
            $floorPaths = Path::with(['startLocation', 'endLocation'])
                ->where(function ($q) use ($floor) {
                    $q->whereHas('startLocation', fn($aq) => $aq->where('floor_id', $floor->id));
                })
                ->get();

            foreach ($floorNodes as $node) {
                $allNodes[] = array_merge($node->toArray(), ['floor_id' => $floor->id]);
            }

            foreach ($floorPaths as $path) {
                $allPaths[] = array_merge($path->toArray(), [
                    'startLocation' => $path->startLocation ? array_merge($path->startLocation->toArray(), ['floor_id' => $path->startLocation->floor_id]) : null,
                    'endLocation' => $path->endLocation ? array_merge($path->endLocation->toArray(), ['floor_id' => $path->endLocation->floor_id]) : null,
                ]);
            }
        }

        // Call pathfinding (this would be done via a service class in production)
        // For now, return the data structure needed by the frontend
        return response()->json([
            'start_location' => $startLocation->toArray(),
            'end_location' => $endLocation->toArray(),
            'all_nodes' => $allNodes,
            'all_paths' => $allPaths,
            'floors' => $floors->map(fn($f) => [
                'id' => $f->id,
                'level' => $f->level,
                'building_id' => $f->building_id,
                'building_name' => $f->building->name,
            ])->toArray(),
        ]);
    }

    /**
     * Search for indoor locations by name or building
     */
    public function searchLocations(Request $request)
    {
        $query = $request->query('q', '');
        $buildingId = $request->query('building_id');

        $locations = Location::query()
            ->with(['floor.building'])
            ->where('name', 'like', "%{$query}%");

        if ($buildingId) {
            $locations = $locations->whereHas('floor', fn($q) => $q->where('building_id', $buildingId));
        }

        $results = $locations->limit(20)->get()->map(fn($loc) => [
            'id' => $loc->id,
            'name' => $loc->name,
            'type' => $loc->type,
            'floor_id' => $loc->floor_id,
            'floor_level' => $loc->floor->level,
            'building_name' => $loc->floor->building->name,
            'display_name' => "{$loc->name} - {$loc->floor->building->name} Floor {$loc->floor->level}",
        ]);

        return response()->json($results);
    }
}