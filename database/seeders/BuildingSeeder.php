<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BuildingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $buildings = [
            ['name' => 'Prof Tjama Tjivikua Library', 'latitude' => -22.564414570284825, 'longitude' => 17.075346359786835],
            ['name' => 'Engineering Building', 'latitude' => -22.564940049542116, 'longitude' => 17.074554165337275],
            ['name' => 'Health and Applied', 'latitude' => -22.565779664363262, 'longitude' => 17.073325762141593],
        ];

        foreach ($buildings as $building) {
            DB::table('buildings')->insert($building);
        }
    }
}