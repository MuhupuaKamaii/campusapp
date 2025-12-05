<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class IndoorNavigationController extends Controller
{
    public function getGraphData($floorId) {
    $nodes = Location::where('floor_id', $floorId)->get();
    $paths = Path::with(['startLocation', 'endLocation'])
                 ->whereHas('startLocation', fn($q) => $q->where('floor_id', $floorId))
                 ->get();
                 
    return response()->json(['nodes' => $nodes, 'paths' => $paths]);
}
    //
}
