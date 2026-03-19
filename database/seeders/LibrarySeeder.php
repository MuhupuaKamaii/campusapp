<?php

namespace Database\Seeders;

use App\Models\Building;
use App\Models\Floor;
use Illuminate\Database\Seeder;

class LibrarySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Library Building
        $library = Building::firstOrCreate(
            ['name' => 'Prof Tjama Tjivikua Library'],
            [
                'latitude' => -22.564414570284825,
                'longitude' => 17.075346359786835,
            ]
        );

        // Add floors with PDF paths
        $floors = [
            [
                'level' => 0,
                'pdf_path' => 'Floor Plans/938-11_Floor Fin layouts_P-231_Basement Floor.pdf',
                'name' => 'Basement Floor',
            ],
            [
                'level' => 1,
                'pdf_path' => 'Floor Plans/938-11_Floor Fin layouts_P-232_Ground Floor.pdf',
                'name' => 'Ground Floor',
            ],
            [
                'level' => 2,
                'pdf_path' => 'Floor Plans/938-11_Floor Fin layouts_P-233_First Floor.pdf',
                'name' => 'First Floor',
            ],
            [
                'level' => 3,
                'pdf_path' => 'Floor Plans/938-11_Floor Fin layouts_P-234_Second Floor.pdf',
                'name' => 'Second Floor',
            ],
        ];

        foreach ($floors as $floorData) {
            Floor::firstOrCreate(
                [
                    'building_id' => $library->id,
                    'level' => $floorData['level'],
                ],
                [
                    'pdf_path' => $floorData['pdf_path'],
                    'image_path' => null,
                    'width' => null,
                    'height' => null,
                ]
            );
        }
    }
}
