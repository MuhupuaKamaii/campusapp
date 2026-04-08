<?php

namespace Database\Seeders;

use App\Models\Floor;
use App\Models\Location;
use App\Models\Path;
use Illuminate\Database\Seeder;

class FirstFloorLocationsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get the First Floor (level 2)
        $floor = Floor::where('level', 2)->first();
        
        if (!$floor) {
            $this->command->error('First Floor not found. Please run the main migrations first.');
            return;
        }

        // Clear existing locations and paths for this floor
        Location::where('floor_id', $floor->id)->delete();
        Path::whereHas('startLocation', function ($query) use ($floor) {
            $query->where('floor_id', $floor->id);
        })->delete();

        // Define all locations with extracted coordinates from First 1.5.svg
        $locations = [
            // Services & Entrance Points
            ['name' => 'Entrance Door', 'type' => 'entrance', 'x' => 620, 'y' => 550],
            ['name' => 'Reception Desk', 'type' => 'service', 'x' => 446, 'y' => 586],
            ['name' => 'Main Walkway Center', 'type' => 'walkway', 'x' => 400, 'y' => 450],
            ['name' => 'Lobby Area', 'type' => 'walkway', 'x' => 480, 'y' => 520],
            
            // Study Areas
            ['name' => 'Study Cubicles 1', 'type' => 'study', 'x' => 407, 'y' => 437],
            ['name' => 'Study Cubicles 2', 'type' => 'study', 'x' => 450, 'y' => 437],
            ['name' => 'Study Cubicles 3', 'type' => 'study', 'x' => 500, 'y' => 437],
            ['name' => 'Study Cubicles 4', 'type' => 'study', 'x' => 545, 'y' => 437],
            ['name' => 'Reading Area East', 'type' => 'study', 'x' => 600, 'y' => 480],
            ['name' => 'Reading Area West', 'type' => 'study', 'x' => 300, 'y' => 480],
            
            // Computer & Tech
            ['name' => 'Computer Lab', 'type' => 'lab', 'x' => 268, 'y' => 695],
            ['name' => 'Tech Support Room', 'type' => 'service', 'x' => 280, 'y' => 620],
            
            // Staff & Administration
            ['name' => 'Librarian Office', 'type' => 'office', 'x' => 350, 'y' => 380],
            ['name' => 'Administrative Office', 'type' => 'office', 'x' => 380, 'y' => 350],
            ['name' => 'Head Librarian Office', 'type' => 'office', 'x' => 350, 'y' => 320],
            
            // Facilities
            ['name' => 'Student Toilets Male', 'type' => 'restroom', 'x' => 240, 'y' => 782],
            ['name' => 'Student Toilets Female', 'type' => 'restroom', 'x' => 280, 'y' => 782],
            ['name' => 'Accessible Restroom', 'type' => 'restroom', 'x' => 170, 'y' => 750],
            
            // Food & Rest Services
            ['name' => 'Cafeteria Area', 'type' => 'food', 'x' => 550, 'y' => 350],
            ['name' => 'Vending Machine Area', 'type' => 'food', 'x' => 520, 'y' => 300],
            ['name' => 'Rest Area North', 'type' => 'rest', 'x' => 600, 'y' => 300],
            ['name' => 'Rest Area South', 'type' => 'rest', 'x' => 600, 'y' => 600],
            
            // Collection & Archive
            ['name' => 'Reference Section', 'type' => 'collection', 'x' => 150, 'y' => 450],
            ['name' => 'Journal Collection', 'type' => 'collection', 'x' => 150, 'y' => 550],
            ['name' => 'Archive Storage', 'type' => 'collection', 'x' => 150, 'y' => 650],
            
            // Additional Walkways & Points
            ['name' => 'Emergency Exit', 'type' => 'exit', 'x' => 100, 'y' => 300],
            ['name' => 'Staircase Central', 'type' => 'walkway', 'x' => 650, 'y' => 200],
        ];

        $locationModels = [];
        
        // Create all locations
        foreach ($locations as $locationData) {
            $location = Location::create([
                'floor_id' => $floor->id,
                'name' => $locationData['name'],
                'type' => $locationData['type'],
                'x_coordinate' => $locationData['x'],
                'y_coordinate' => $locationData['y'],
            ]);
            $locationModels[$locationData['name']] = $location;
        }

        $this->command->info('Created ' . count($locationModels) . ' locations on First Floor');

        // Define path connections (bidirectional)
        // Format: [start_name, end_name, approximate_distance_in_meters]
        $connections = [
            // From Entrance to main areas
            ['Entrance Door', 'Reception Desk', 15],
            ['Entrance Door', 'Lobby Area', 12],
            ['Entrance Door', 'Main Walkway Center', 20],
            
            // Reception area connections
            ['Reception Desk', 'Lobby Area', 10],
            ['Reception Desk', 'Main Walkway Center', 12],
            
            // Study area connections
            ['Study Cubicles 1', 'Study Cubicles 2', 8],
            ['Study Cubicles 2', 'Study Cubicles 3', 8],
            ['Study Cubicles 3', 'Study Cubicles 4', 8],
            ['Study Cubicles 1', 'Main Walkway Center', 20],
            ['Study Cubicles 4', 'Reading Area East', 15],
            
            // Reading areas
            ['Reading Area East', 'Rest Area North', 20],
            ['Reading Area East', 'Lobby Area', 18],
            ['Reading Area West', 'Reference Section', 15],
            ['Reading Area West', 'Main Walkway Center', 12],
            
            // Computer Lab connections
            ['Computer Lab', 'Tech Support Room', 8],
            ['Tech Support Room', 'Main Walkway Center', 25],
            ['Computer Lab', 'Student Toilets Male', 15],
            
            // Staff areas
            ['Librarian Office', 'Administrative Office', 10],
            ['Administrative Office', 'Head Librarian Office', 8],
            ['Librarian Office', 'Main Walkway Center', 15],
            
            // Facilities
            ['Student Toilets Male', 'Student Toilets Female', 8],
            ['Student Toilets Male', 'Accessible Restroom', 20],
            ['Student Toilets Female', 'Computer Lab', 15],
            
            // Food & Rest
            ['Cafeteria Area', 'Vending Machine Area', 10],
            ['Cafeteria Area', 'Rest Area North', 15],
            ['Rest Area North', 'Reading Area East', 20],
            ['Rest Area South', 'Lobby Area', 12],
            ['Vending Machine Area', 'Staircase Central', 25],
            
            // Collections
            ['Reference Section', 'Journal Collection', 20],
            ['Journal Collection', 'Archive Storage', 20],
            ['Reference Section', 'Reading Area West', 15],
            ['Archive Storage', 'Accessible Restroom', 25],
            
            // Main circulation paths
            ['Main Walkway Center', 'Lobby Area', 8],
            ['Staircase Central', 'Entrance Door', 30],
            ['Staircase Central', 'Rest Area North', 15],
            ['Emergency Exit', 'Reference Section', 20],
            ['Emergency Exit', 'Accessible Restroom', 8],
        ];

        $pathCount = 0;
        
        // Create paths (bidirectional)
        foreach ($connections as [$startName, $endName, $distance]) {
            $startLocation = $locationModels[$startName];
            $endLocation = $locationModels[$endName];
            
            // Create path from start to end
            Path::create([
                'start_location_id' => $startLocation->id,
                'end_location_id' => $endLocation->id,
                'distance' => $distance,
            ]);
            
            // Create reverse path (bidirectional)
            Path::create([
                'start_location_id' => $endLocation->id,
                'end_location_id' => $startLocation->id,
                'distance' => $distance,
            ]);
            
            $pathCount += 2;
        }

        $this->command->info('Created ' . $pathCount . ' path connections');
        $this->command->info('First Floor wayfinding data successfully seeded!');
    }
}
