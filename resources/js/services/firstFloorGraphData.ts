/**
 * First Floor Graph Data
 * 
 * Defines all vertices (locations) and edges (paths) for the First Floor wayfinding system.
 * This data structure mirrors the database locations and paths tables for Floor ID 3.
 * 
 * Coordinate system matches SVG viewBox for First 1.5.svg:
 * ViewBox: "0 0 765.12 540.15995"
 * 
 * Contains 27 vertices and 74 edges (37 bidirectional connections)
 */

import type { GraphData } from './graphData';

export const firstFloorGraphData: GraphData = {
  floorId: 3,
  floorName: 'First Floor',
  
  // 27 Vertices (Locations) - Coordinates from SVG viewBox (0 0 765.12 540.15995)
  vertices: [
    // ID 0: Reception & Entry
    { id: 0, name: 'Reception Desk', type: 'service', cx: 445.56, cy: 586.288, floor_id: 3 },
    
    // ID 1-2: Visual Sections
    { id: 1, name: 'Visual Section Audio F5', type: 'collection', cx: 240.72, cy: 606.328, floor_id: 3 },
    { id: 2, name: 'Visual Section Audio F5:1', type: 'collection', cx: 252.6, cy: 612.088, floor_id: 3 },
    
    // ID 3: Communication
    { id: 3, name: 'Communication Area', type: 'walkway', cx: 293.04, cy: 765.208, floor_id: 3 },
    
    // ID 4: Staff Office
    { id: 4, name: 'Staff Office', type: 'office', cx: 279.96, cy: 644.608, floor_id: 3 },
    
    // ID 5-7: Facilities - Restrooms
    { id: 5, name: 'Student Toilets Male', type: 'restroom', cx: 255.6, cy: 782.368, floor_id: 3 },
    { id: 6, name: 'Rest Areas Students', type: 'rest', cx: 337.92, cy: 785.848, floor_id: 3 },
    { id: 7, name: 'Student Toilets Female', type: 'restroom', cx: 274.92, cy: 753.208, floor_id: 3 },
    
    // ID 8: Staff Area
    { id: 8, name: 'Staff Area', type: 'office', cx: 292.8, cy: 417.328, floor_id: 3 },
    
    // ID 9: Computer Lab
    { id: 9, name: 'Structured Computer Lab', type: 'lab', cx: 268.44, cy: 694.528, floor_id: 3 },
    
    // ID 10: Kitchenette
    { id: 10, name: 'Kitchenette', type: 'food', cx: 268.08, cy: 401.728, floor_id: 3 },
    
    // ID 11: IT Labs  
    { id: 11, name: 'IT Sections', type: 'lab', cx: 297.72, cy: 492.208, floor_id: 3 },
    
    // ID 12-13: Staff Room & Kitchenette
    { id: 12, name: 'Staff Room F7', type: 'office', cx: 428.4, cy: 800.968, floor_id: 3 },
    { id: 13, name: 'Kitchenette 2', type: 'food', cx: 426.12, cy: 800.608, floor_id: 3 },
    
    // ID 14: Disabled / Accessible
    { id: 14, name: 'Disabled Facility', type: 'restroom', cx: 425.04, cy: 420.688, floor_id: 3 },
    
    // ID 15-16: Communication & Rest
    { id: 15, name: 'Communication Point', type: 'walkway', cx: 279.96, cy: 429.568, floor_id: 3 },
    { id: 16, name: 'Rest Area', type: 'rest', cx: 282.24, cy: 429.688, floor_id: 3 },
    
    // ID 17: Book Stacks
    { id: 17, name: 'Book Stacks', type: 'collection', cx: 404.16, cy: 596.008, floor_id: 3 },
    
    // ID 18: Communication 2
    { id: 18, name: 'Communication Point 2', type: 'walkway', cx: 404.52, cy: 436.648, floor_id: 3 },
    
    // ID 19-22: Study Cubicles
    { id: 19, name: 'Study Cubicles 1', type: 'study', cx: 406.68, cy: 436.768, floor_id: 3 },
    { id: 20, name: 'Study Cubicles 2', type: 'study', cx: 522.48, cy: 445.888, floor_id: 3 },
    { id: 21, name: 'Study Cubicles 3', type: 'study', cx: 534.96, cy: 765.928, floor_id: 3 },
    { id: 22, name: 'Study Cubicles 4', type: 'study', cx: 545.28, cy: 745.888, floor_id: 3 },
    
    // ID 23: Communication 3
    { id: 23, name: 'Communication Point 3', type: 'walkway', cx: 439.92, cy: 765.928, floor_id: 3 },
    
    // ID 24: Staff Area 3
    { id: 24, name: 'Staff Area F7', type: 'office', cx: 436.68, cy: 783.688, floor_id: 3 },
    
    // ID 25: Bridge
    { id: 25, name: 'Bridge', type: 'walkway', cx: 329.16, cy: 593.248, floor_id: 3 },
    
    // ID 26: Rest Area 2
    { id: 26, name: 'Rest Area 2', type: 'rest', cx: 354.48, cy: 660.928, floor_id: 3},
  ],

  // 74 Edges (37 bidirectional connections)
  edges: [
    // Reception to main areas
    { id: 1, from: 0, to: 25, distance: 10 },
    { id: 2, from: 25, to: 0, distance: 10 },
    { id: 3, from: 0, to: 1, distance: 15 },
    { id: 4, from: 1, to: 0, distance: 15 },
    { id: 5, from: 0, to: 2, distance: 18 },
    { id: 6, from: 2, to: 0, distance: 18 },
    
    // Visual Sections connections
    { id: 7, from: 1, to: 2, distance: 8 },
    { id: 8, from: 2, to: 1, distance: 8 },
    { id: 9, from: 1, to: 17, distance: 20 },
    { id: 10, from: 17, to: 1, distance: 20 },
    
    // Book Stacks connections
    { id: 11, from: 17, to: 25, distance: 15 },
    { id: 12, from: 25, to: 17, distance: 15 },
    { id: 13, from: 17, to: 4, distance: 12 },
    { id: 14, from: 4, to: 17, distance: 12 },
    
    // Study Cubicles connections
    { id: 15, from: 19, to: 20, distance: 8 },
    { id: 16, from: 20, to: 19, distance: 8 },
    { id: 17, from: 20, to: 18, distance: 12 },
    { id: 18, from: 18, to: 20, distance: 12 },
    { id: 19, from: 18, to: 21, distance: 15 },
    { id: 20, from: 21, to: 18, distance: 15 },
    
    // Study adjacent connections
    { id: 21, from: 19, to: 18, distance: 10 },
    { id: 22, from: 18, to: 19, distance: 10 },
    { id: 23, from: 21, to: 22, distance: 12 },
    { id: 24, from: 22, to: 21, distance: 12 },
    
    // IT/Lab connections
    { id: 25, from: 11, to: 9, distance: 12 },
    { id: 26, from: 9, to: 11, distance: 12 },
    { id: 27, from: 9, to: 10, distance: 8 },
    { id: 28, from: 10, to: 9, distance: 8 },
    { id: 29, from: 11, to: 15, distance: 10 },
    { id: 30, from: 15, to: 11, distance: 10 },
    
    // Rest and Facilities
    { id: 31, from: 5, to: 6, distance: 10 },
    { id: 32, from: 6, to: 5, distance: 10 },
    { id: 33, from: 5, to: 7, distance: 20 },
    { id: 34, from: 7, to: 5, distance: 20 },
    { id: 35, from: 6, to: 3, distance: 12 },
    { id: 36, from: 3, to: 6, distance: 12 },
    
    // Staff and Communication Points
    { id: 37, from: 4, to: 8, distance: 8 },
    { id: 38, from: 8, to: 4, distance: 8 },
    { id: 39, from: 8, to: 12, distance: 18 },
    { id: 40, from: 12, to: 8, distance: 18 },
    { id: 41, from: 12, to: 24, distance: 10 },
    { id: 42, from: 24, to: 12, distance: 10 },
    
    // Communication Points circulation
    { id: 43, from: 15, to: 18, distance: 12 },
    { id: 44, from: 18, to: 15, distance: 12 },
    { id: 45, from: 15, to: 16, distance: 5 },
    { id: 46, from: 16, to: 15, distance: 5 },
    { id: 47, from: 16, to: 26, distance: 8 },
    { id: 48, from: 26, to: 16, distance: 8 },
    
    // Kitchenette connections
    { id: 49, from: 10, to: 13, distance: 25 },
    { id: 50, from: 13, to: 10, distance: 25 },
    { id: 51, from: 13, to: 14, distance: 8 },
    { id: 52, from: 14, to: 13, distance: 8 },
    { id: 53, from: 13, to: 12, distance: 5 },
    { id: 54, from: 12, to: 13, distance: 5 },
    
    // Disabled facility connections
    { id: 55, from: 14, to: 7, distance: 15 },
    { id: 56, from: 7, to: 14, distance: 15 },
    
    // Bridge and central circulation
    { id: 57, from: 25, to: 3, distance: 20 },
    { id: 58, from: 3, to: 25, distance: 20 },
    { id: 59, from: 25, to: 23, distance: 15 },
    { id: 60, from: 23, to: 25, distance: 15 },
    
    // Communication 3 and Study connection
    { id: 61, from: 23, to: 21, distance: 10 },
    { id: 62, from: 21, to: 23, distance: 10 },
    { id: 63, from: 23, to: 22, distance: 8 },
    { id: 64, from: 22, to: 23, distance: 8 },
    
    // Rest Area 2 connections
    { id: 65, from: 26, to: 18, distance: 12 },
    { id: 66, from: 18, to: 26, distance: 12 },
    { id: 67, from: 26, to: 15, distance: 8 },
    { id: 68, from: 15, to: 26, distance: 8 },
    
    // Additional circulation paths
    { id: 69, from: 0, to: 4, distance: 12 },
    { id: 70, from: 4, to: 0, distance: 12 },
    { id: 71, from: 17, to: 23, distance: 18 },
    { id: 72, from: 23, to: 17, distance: 18 },
    { id: 73, from: 11, to: 19, distance: 15 },
    { id: 74, from: 19, to: 11, distance: 15 },
  ],
};
