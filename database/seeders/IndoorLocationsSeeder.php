<?php

namespace Database\Seeders;

use App\Models\Building;
use App\Models\Floor;
use App\Models\Location;
use App\Models\Path;
use Illuminate\Database\Seeder;

class IndoorLocationsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get or create the Library building
        $library = Building::firstOrCreate(
            ['name' => 'Library Offices'],
            [
                'latitude' => 33.6414,
                'longitude' => 73.0786,
            ]
        );

        // Create floors for the library
        $floorData = [
            ['level' => -1, 'name' => 'Basement'],
            ['level' => 0, 'name' => 'Ground'],
            ['level' => 1, 'name' => 'First'],
            ['level' => 2, 'name' => 'Second'],
        ];

        $floors = [];
        foreach ($floorData as $data) {
            $floors[$data['level']] = Floor::firstOrCreate(
                [
                    'building_id' => $library->id,
                    'level' => $data['level'],
                ],
                [
                    'width' => 800,
                    'height' => 600,
                ]
            );
        }

        // Define office locations for each floor
        // Format: [x, y, name, type]
        $officesByFloor = [
            -1 => [ // Basement
                [150, 100, 'Storage Room A', 'room'],
                [350, 100, 'Storage Room B', 'room'],
                [550, 100, 'Server Room', 'room'],
                [200, 300, 'Basement Hallway Center', 'hallway'],
                [400, 300, 'Basement Hallway Center', 'hallway'],
                [600, 300, 'Basement Hallway Center', 'hallway'],
                [100, 500, 'Stair A Basement', 'stairs'],
                [400, 500, 'Stair B Basement', 'stairs'],
                [700, 500, 'Elevator Basement', 'stairs'],
            ],
            0 => [ // Ground Floor
                [100, 100, 'Main Reception', 'room'],
                [250, 100, 'Office 101', 'room'],
                [400, 100, 'Office 102', 'room'],
                [550, 100, 'Office 103', 'room'],
                [200, 300, 'Ground Floor Hallway', 'hallway'],
                [400, 300, 'Ground Floor Hallway', 'hallway'],
                [600, 300, 'Ground Floor Hallway', 'hallway'],
                [100, 500, 'Stair A Ground', 'stairs'],
                [400, 500, 'Stair B Ground', 'stairs'],
                [700, 500, 'Elevator Ground', 'stairs'],
            ],
            1 => [ // First Floor
                [100, 100, 'Office 201', 'room'],
                [250, 100, 'Office 202', 'room'],
                [400, 100, 'Conference Room 201', 'room'],
                [550, 100, 'Office 203', 'room'],
                [200, 300, 'First Floor Hallway', 'hallway'],
                [400, 300, 'First Floor Hallway', 'hallway'],
                [600, 300, 'First Floor Hallway', 'hallway'],
                [100, 500, 'Stair A First', 'stairs'],
                [400, 500, 'Stair B First', 'stairs'],
                [700, 500, 'Elevator First', 'stairs'],
            ],
            2 => [ // Second Floor
                [100, 100, 'Office 301', 'room'],
                [250, 100, 'Office 302', 'room'],
                [400, 100, 'Office 303', 'room'],
                [550, 100, 'Director Office', 'room'],
                [200, 300, 'Second Floor Hallway', 'hallway'],
                [400, 300, 'Second Floor Hallway', 'hallway'],
                [600, 300, 'Second Floor Hallway', 'hallway'],
                [100, 500, 'Stair A Second', 'stairs'],
                [400, 500, 'Stair B Second', 'stairs'],
                [700, 500, 'Elevator Second', 'stairs'],
            ],
        ];

        // Create locations for each floor
        $locationsByFloor = [];
        foreach ($officesByFloor as $floorLevel => $offices) {
            $locationsByFloor[$floorLevel] = [];

            foreach ($offices as [$x, $y, $name, $type]) {
                $location = Location::firstOrCreate(
                    [
                        'floor_id' => $floors[$floorLevel]->id,
                        'name' => $name,
                    ],
                    [
                        'x_coordinate' => $x,
                        'y_coordinate' => $y,
                        'type' => $type,
                    ]
                );

                $locationsByFloor[$floorLevel][] = $location;
            }
        }

        // Create paths (connections) on each floor
        foreach ($locationsByFloor as $floorLevel => $locations) {
            // For each floor, connect adjacent rooms and hallways
            // Define connection patterns
            $connections = [
                // Offices to hallway connections
                [0, 4], [1, 4], [2, 4], [3, 4], // Basement connections
                [0, 4], [1, 4], [2, 4], [3, 4], // Ground floor connections
                [0, 4], [1, 4], [2, 4], [3, 4], // First floor connections
                [0, 4], [1, 4], [2, 4], [3, 4], // Second floor connections
                // Hallway to hallway
                [4, 5], [5, 6],
                // Hallway to stairs/elevators
                [4, 7], [4, 8], [4, 9],
                [5, 7], [5, 8], [5, 9],
                [6, 7], [6, 8], [6, 9],
            ];

            $processedPairs = new \Illuminate\Support\Collection();

            foreach ($connections as [$fromIdx, $toIdx]) {
                if ($fromIdx >= count($locations) || $toIdx >= count($locations)) {
                    continue;
                }

                $fromLoc = $locations[$fromIdx];
                $toLoc = $locations[$toIdx];

                // Skip if already created (avoid duplicates)
                $pairKey = min($fromLoc->id, $toLoc->id) . '-' . max($fromLoc->id, $toLoc->id);
                if ($processedPairs->contains($pairKey)) {
                    continue;
                }

                $processedPairs->push($pairKey);

                // Calculate distance based on coordinates
                $distance = sqrt(
                    pow($toLoc->x_coordinate - $fromLoc->x_coordinate, 2) +
                    pow($toLoc->y_coordinate - $fromLoc->y_coordinate, 2)
                );

                // Create bidirectional paths
                Path::firstOrCreate(
                    [
                        'start_location_id' => $fromLoc->id,
                        'end_location_id' => $toLoc->id,
                    ],
                    ['distance' => $distance]
                );

                Path::firstOrCreate(
                    [
                        'start_location_id' => $toLoc->id,
                        'end_location_id' => $fromLoc->id,
                    ],
                    ['distance' => $distance]
                );
            }
        }

        // Create vertical connections (stairs and elevators between floors)
        $stairLabels = ['Stair A', 'Stair B', 'Elevator'];

        foreach ($stairLabels as $stairLabel) {
            for ($level = -1; $level < 2; $level++) {
                $nextLevel = $level + 1;
                
                if (!isset($locationsByFloor[$level]) || !isset($locationsByFloor[$nextLevel])) {
                    continue;
                }
                
                $currentFloorLocations = $locationsByFloor[$level];
                $nextFloorLocations = $locationsByFloor[$nextLevel];

                // Find the stair/elevator on current floor and next floor
                $currentStair = null;
                $nextStair = null;
                
                foreach ($currentFloorLocations as $loc) {
                    if (str_contains($loc->name, $stairLabel)) {
                        $currentStair = $loc;
                        break;
                    }
                }
                
                foreach ($nextFloorLocations as $loc) {
                    if (str_contains($loc->name, $stairLabel)) {
                        $nextStair = $loc;
                        break;
                    }
                }

                if ($currentStair && $nextStair) {
                    // Create vertical connection
                    Path::firstOrCreate(
                        [
                            'start_location_id' => $currentStair->id,
                            'end_location_id' => $nextStair->id,
                        ],
                        ['distance' => 5] // Fixed cost for vertical transition
                    );

                    Path::firstOrCreate(
                        [
                            'start_location_id' => $nextStair->id,
                            'end_location_id' => $currentStair->id,
                        ],
                        ['distance' => 5]
                    );
                }
            }
        }

        $this->command->info('Indoor location data seeded successfully!');
    }
}
