// resources/js/types/IndoorMap.ts

export interface Node {
    id: number;
    x_coordinate: number;
    y_coordinate: number;
    name?: string;
    type: 'room' | 'hallway' | 'stairs';
}

export interface Path {
    id: number;
    start_location_id: number;
    end_location_id: number;
    distance: number;
}