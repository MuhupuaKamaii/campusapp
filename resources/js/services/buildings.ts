export interface BuildingFloor {
  floorId: number;
  name: string;
  svgFile: string;
  svgWidth: number;
  svgHeight: number;
}

export interface Building {
  id: string;
  name: string;
  floors: BuildingFloor[];
}

export const BUILDINGS: Building[] = [
  {
    id: 'library',
    name: 'Library',
    floors: [
      { floorId: 1, name: 'Basement Floor', svgFile: 'Basement 1.5.svg', svgWidth: 1588,   svgHeight: 1122.6667 },
      { floorId: 2, name: 'Ground Floor',   svgFile: 'Ground 1.5.svg',   svgWidth: 1588,   svgHeight: 1122.6667 },
      { floorId: 3, name: 'First Floor',    svgFile: 'First 1.5.svg',    svgWidth: 765.12, svgHeight: 540.15995 },
      { floorId: 4, name: 'Second Floor',   svgFile: 'Second 1.5.svg',   svgWidth: 1588,   svgHeight: 1122.6667 },
    ],
  },
  // To add a new building: append an entry here, create its graph data files
  // under services/<buildingId>/, and add its SVGs to public/Floor Plans/.
];

export function getBuildingById(id: string): Building | undefined {
  return BUILDINGS.find(b => b.id === id);
}

export function getFloorConfig(floorId: number): BuildingFloor | undefined {
  for (const b of BUILDINGS) {
    const f = b.floors.find(f => f.floorId === floorId);
    if (f) return f;
  }
}

export function getBuildingByFloorId(floorId: number): Building | undefined {
  return BUILDINGS.find(b => b.floors.some(f => f.floorId === floorId));
}
