# CampusNav - Code Architecture & Component Documentation

## Table of Contents

1. [Overall System Architecture](#overall-system-architecture)
2. [Frontend Components](#frontend-components)
3. [MapComponent - Core Engine](#mapcomponent---core-engine)
4. [Pathfinding Algorithm](#pathfinding-algorithm)
5. [Data Flow](#data-flow)
6. [GeoJSON Data Formats](#geojson-data-formats)

---

## Overall System Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────┐
│                   USER BROWSER                       │
│                                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │         React + TypeScript Frontend           │   │
│  │  ┌────────────────────────────────────────┐  │   │
│  │  │  Dashboard.tsx - Main Landing Page     │  │   │
│  │  │  ├─ Campus Info Cards                  │  │   │
│  │  │  ├─ MapComponent (ref control)         │  │   │
│  │  │  └─ Route Control Buttons               │  │   │
│  │  │      └─ Set Start / Set Destination    │  │   │
│  │  │      └─ Find Route / Clear             │  │   │
│  │  └────────────────────────────────────────┘  │   │
│  │                      ↓                        │   │
│  │  ┌────────────────────────────────────────┐  │   │
│  │  │  MapComponent.tsx - Core Map Engine    │  │   │
│  │  │  ├─ MapLibre GL Initialization         │  │   │
│  │  │  ├─ GeoJSON Data Loading                │  │   │
│  │  │  ├─ A* Pathfinding Algorithm           │  │   │
│  │  │  ├─ Route Computation & Rendering      │  │   │
│  │  │  ├─ 3D Camera Controls                 │  │   │
│  │  │  └─ Debug Overlay & Monitoring         │  │   │
│  │  └────────────────────────────────────────┘  │   │
│  │                      ↓                        │   │
│  │  ┌────────────────────────────────────────┐  │   │
│  │  │  MapLibre GL Library                   │  │   │
│  │  │  ├─ Vector/Raster Tile Rendering       │  │   │
│  │  │  ├─ WebGL Canvas Management            │  │   │
│  │  │  ├─ Layer Management                    │  │   │
│  │  │  └─ Interactive Controls                │  │   │
│  │  └────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────┘   │
│                      ↓                               │
│  ┌──────────────────────────────────────────────┐   │
│  │         Map Tile Servers (External)          │   │
│  │  ├─ MapTiler (vector tiles with API key)     │   │
│  │  ├─ Carto (OSM-based vector, no key)         │   │
│  │  ├─ Esri (satellite raster)                  │   │
│  │  └─ OpenStreetMap (raster fallback)          │   │
│  └──────────────────────────────────────────────┘   │
│                      ↓                               │
│  ┌──────────────────────────────────────────────┐   │
│  │      Local GeoJSON Data Files                │   │
│  │  (Loaded from public/data/)                  │   │
│  │  ├─ nust-campus.geojson                      │   │
│  │  ├─ nust-buildings.geojson                   │   │
│  │  ├─ nust-walkways.geojson                    │   │
│  │  ├─ nust-labels.geojson                      │   │
│  │  └─ eng-rooms.geojson                        │   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
└─────────────────────────────────────────────────────┘
                        ↓ (HTTP Requests)
┌─────────────────────────────────────────────────────┐
│              Laravel Backend Server                  │
│  ├─ API Routes (/api/*)                             │
│  ├─ Web Routes (/*)                                 │
│  ├─ Authentication (Laravel Fortify)                │
│  └─ Database Models                                 │
└─────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
<App (Inertia Entry Point)>
  └─ <AppLayout>
      ├─ <Sidebar> (Navigation)
      ├─ <AppShell>
      │   └─ <AppContent>
      │       └─ <Dashboard>
      │           ├─ <Card> Campus Overview
      │           ├─ <Card> Navigation Tips
      │           └─ <MapContainer>
      │               ├─ <ControlButtons>
      │               │   ├─ Set Start Button
      │               │   ├─ Set Destination Button
      │               │   ├─ Find Route Button
      │               │   └─ Clear Button
      │               ├─ <MapComponent>
      │               │   ├─ <MapLibreGL>
      │               │   │   ├─ Vector/Raster Layers
      │               │   │   ├─ 3D Building Layer
      │               │   │   ├─ POI Markers
      │               │   │   ├─ Route Line
      │               │   │   └─ Start/End Points
      │               │   └─ <DebugOverlay>
      │               │       ├─ Map Status
      │               │       ├─ Container Size
      │               │       └─ Canvas Size
      │               └─ <DirectionsSidebar> (future)
      └─ <Footer>
```

---

## Frontend Components

### Dashboard.tsx

**PURPOSE:** Main landing page and navigation hub for the application.

**SECTIONS:**

1. **Campus Overview Card**
   - Displays campus statistics
   - Shows number of campuses, buildings, active users
   - Educational content about the campus

2. **Navigation Tips Card**
   - Teaches users how to interact with the map
   - Lists keyboard shortcuts (Shift + arrows for 3D)
   - Explains right-click to reset view

3. **Interactive Map Container**
   - Control buttons row (Set Start, Set Destination, Find Route, Clear)
   - MapComponent with full canvas
   - Debug overlay showing map status

**KEY CODE SECTIONS:**

```typescript
// Map reference for imperative control
const mapRef = useRef<MapComponentRef>(null);

// Button handlers call ref methods
onClick={() => mapRef.current?.setStartMode()}
onClick={() => mapRef.current?.findRoute()}
onClick={() => mapRef.current?.clearRoute()}
```

**STATE FLOW:**
- User clicks button → mapRef method called
- MapComponent state updated
- React re-renders with new state
- User sees visual feedback (markers, route lines, etc.)

---

### MapComponent.tsx

**PURPOSE:** Core mapping and navigation engine. The most complex component.

**ARCHITECTURE:**

The MapComponent is organized into several logical sections:

#### 1. INITIALIZATION PHASE (useEffect Hook)

```typescript
useEffect(() => {
    if (map.current) return; // Already initialized
    
    if (mapContainer.current) {
        // Wait for container to have dimensions
        if (container.offsetWidth === 0 || container.offsetHeight === 0) {
            requestAnimationFrame(() => initializeMap(container));
        } else {
            initializeMap(container);
        }
    }
    
    // CLEANUP: Remove listeners and destroy map on unmount
    return () => {
        keyHandlerRef.current?.(); // Remove keyboard listener
        map.current?.remove();      // Destroy MapLibre instance
    };
}, []);
```

**WHY THIS MATTERS:**
- Prevents re-initialization if map already exists
- Ensures container has non-zero dimensions (fixes blank map issues)
- Proper cleanup prevents memory leaks

#### 2. MAP INITIALIZATION (initializeMap)

```
initializeMap(container)
  ↓
[Check WebGL Support]
  ↓
[Setup Style - Priority: MapTiler → Carto → Esri → OSM]
  ↓
[Create MapLibre Instance]
  ├─ container: DOM element
  ├─ style: Selected map style URL
  ├─ center: [17.0865, -22.5710] (main campus)
  ├─ zoom: 16.5 (street-level detail)
  ├─ pitch: 0 (flat view initially)
  └─ bearing: 0 (north-up)
  ↓
[Add Controls]
  ├─ NavigationControl (zoom, compass, pitch)
  ├─ GeolocateControl (user location)
  ├─ FullscreenControl (fullscreen toggle)
  └─ WalkControl (custom routing toolbar)
  ↓
[On Load Event]
  ├─ Load Campus Data (GeoJSON sources)
  ├─ Load Building Data (3D extrusion layer)
  ├─ Load POI Data (point markers)
  ├─ Load Walkway Data (pathfinding graph)
  ├─ Add Keyboard Handlers (3D control)
  ├─ Setup ResizeObserver (responsive sizing)
  └─ Setup Walking Route UI
```

**KEY STYLES:**

MapLibre supports three style types:

```typescript
// 1. VECTOR STYLE (MapTiler)
- Layer-based rendering
- High detail, customizable
- Requires API key
- Supports 3D extrusion

// 2. RASTER STYLE (Carto, OSM)
- Pre-rendered tile images
- Faster, simpler
- No customization
- Works anywhere

// 3. SATELLITE STYLE (Esri)
- Aerial imagery
- Provides geographic context
- High resolution (512x512)
- Great for visualization
```

#### 3. DATA LOADING PHASE

**GeoJSON Sources Loaded:**

1. **nust-campus.geojson**
   - Campus boundary polygon
   - Used for: map extent, masking outside areas
   - Layers: boundary fill + outline

2. **nust-buildings.geojson**
   - Building footprints with height data
   - Used for: 3D visualization, pathfinding obstacles
   - Layer: fill-extrusion (3D effect)

3. **nust-labels.geojson**
   - Points of interest (buildings, gates, amenities)
   - Used for: map labels, geocoding, search
   - Layer: symbol (text labels)

4. **nust-walkways.geojson**
   - Walking paths as LineStrings
   - Used for: building walking graph
   - Layer: thin line visualization

5. **eng-rooms.geojson** (Future)
   - Room-level data
   - Used for: indoor routing (not yet implemented)

#### 4. WALKING GRAPH CONSTRUCTION

```
loadWalkGraph()
  ↓
[Try Local First]
  ├─ Fetch /data/nust-walkways.geojson
  ├─ Parse GeoJSON features
  └─ buildGraphFromGeoJSON()
     ├─ Extract coordinates from LineStrings
     ├─ Create nodes at each coordinate
     ├─ Densify edges (5m step intervals)
     │  └─ Adds intermediate nodes for better connectivity
     ├─ Fill gaps (6m threshold near gates)
     │  └─ Bridges disconnected walkway sections
     └─ Prune edges against buildings
        └─ Remove edges crossing through building polygons
  ↓
[Fallback: Overpass API]
  ├─ Query OSM Overpass for walkways
  ├─ Filter: footway, path, pedestrian, steps, living_street, service
  ├─ Convert Overpass XML → GeoJSON
  └─ buildGraphFromGeoJSON()
  ↓
[Store in Memory]
  └─ graph: { nodes: { [id]: Node, ... } }
     └─ Each Node: { id, lng, lat, edges: [{to, w}, ...] }
```

**GRAPH DATA STRUCTURE:**

```typescript
interface Node {
    id: string;              // "17.086500,-22.571000" (lat,lng coords)
    lng: number;             // Longitude
    lat: number;             // Latitude
    edges: Array<{
        to: string;          // Neighbor node ID
        w: number;           // Weight (distance in meters, Haversine)
    }>;
}

interface Graph {
    nodes: Record<NodeId, Node>;
}
```

**HAVERSINE DISTANCE CALCULATION:**

Used to calculate edge weights (distances) on Earth's surface:

```
distance = 2R * arcsin(sqrt(sin²(Δlat/2) + cos(lat₁) * cos(lat₂) * sin²(Δlng/2)))

Where:
  R = Earth radius (6,371 km = 6,371,000 m)
  Δlat, Δlng = latitude and longitude differences (in radians)
  lat₁, lat₂ = latitudes of both points (in radians)
```

Result: Accurate walking distance in meters.

#### 5. PATHFINDING: A* ALGORITHM

**PURPOSE:** Find optimal walking route between two points on campus

**ALGORITHM:**

```
Input:
  start: Start node ID (snapped to walkway)
  goal:  End node ID (snapped to walkway)
  graph: Walking graph with all nodes/edges

Process:
  1. Initialize
     open_set = {start}
     g_score[start] = 0
     f_score[start] = h(start, goal)  // Heuristic distance

  2. Loop while open_set not empty
     current = node with lowest f_score in open_set
     
     if current == goal
        return reconstruct_path(current)
     
     remove current from open_set
     
     for each neighbor of current
        tentative_g = g_score[current] + edge_weight(current, neighbor)
        
        if tentative_g < g_score[neighbor]
           update g_score[neighbor] = tentative_g
           update f_score[neighbor] = g_score[neighbor] + h(neighbor, goal)
           add neighbor to open_set

  3. Return null if goal never reached

Heuristic h(n) = Haversine distance from n to goal
```

**ROUTE COMPUTATION FLOW:**

```
User clicks "Find Route"
  ↓
tryComputeRoute()
  ↓
[Create Virtual Nodes]
  ├─ Snap start point to nearest walkway segment
  ├─ Create temporary node at snap point
  └─ Connect to both segment endpoints
  ↓
[Same for End Point]
  ↓
[Run A* Algorithm]
  startNode = start virtual node
  goalNode = end virtual node
  ↓
[On Success]
  ├─ Extract coordinates from node path
  ├─ Calculate total distance (meters)
  ├─ Estimate duration (meters / 1.4 m/s)
  ├─ Render line on map (blue)
  └─ Show popup with distance/duration
  ↓
[On Failure]
  ├─ Try component bridging (8m, then 12m thresholds)
  │  └─ Connect disconnected walkway sections at gates
  ├─ Retry A*
  ├─ If still fails, show "No path found" popup
  └─ Cleanup virtual nodes
```

#### 6. SNAP-TO-SEGMENT PROJECTION

When user clicks map to set start/end point:

```
Click Event
  ↓
projectToNearestSegment(lng, lat)
  ├─ For each walkway segment (pair of connected nodes)
  │   ├─ Calculate perpendicular projection of click point onto segment
  │   ├─ Measure perpendicular distance
  │   └─ Keep track of closest segment
  │
  └─ Return: {segment_A, segment_B, projected_point, distance}
       where projected_point is the closest point on the segment
  ↓
Create Virtual Node
  ├─ Node at projected_point
  ├─ Connect to segment_A with distance_to_A
  └─ Connect to segment_B with distance_to_B
  ↓
User can click multiple times
  └─ Old virtual nodes are cleaned up
```

**WHY PROJECTION?**
- Prevents user from selecting points off walkways
- Ensures routes stay on valid paths
- Improves accuracy of route computation

#### 7. DEBUG OVERLAY

```typescript
// Shows in top-left corner of map
<div style={{position: 'absolute', left: 8, top: 8, ...}}>
  <div>Map Status: ✅ Ready | ⏳ Loading | ⚠️ Error</div>
  <div>Container: 1024 x 768 (width x height pixels)</div>
  <div>Canvas: 2048 x 1536 (WebGL canvas size)</div>
</div>
```

**USEFUL FOR DEBUGGING:**
- If Canvas is 0x0: Map not rendering (CSS issue)
- If Container is 0x0: Parent layout broken
- If status is Error: Check network tab for style/tile errors

---

## Pathfinding Algorithm

### A* Overview

**Advantages over Dijkstra:**
- Uses heuristic to guide search toward goal
- Much faster for point-to-point routing
- Optimal solution if heuristic is admissible (never overestimates)

**Admissible Heuristic:**
- We use Haversine distance (great-circle distance)
- Always underestimates true walking distance (can't walk in straight line)
- Therefore A* always finds optimal path

### Example Route Computation

```
Start: Engineering Building (17.0835, -22.5675)
End:   Library Building (17.0845, -22.5678)

1. User clicks "Set Start"
   - Selection mode = 'start'

2. User clicks Engineering Building on map
   - Click point: (17.0835, -22.5675)
   - Nearest segment: walkway between nodes A and B
   - Project to segment: (17.0835, -22.5675) [already on walkway]
   - Store: walkStart = [17.0835, -22.5675]

3. User clicks "Set Destination"
   - Selection mode = 'end'

4. User clicks Library Building on map
   - Click point: (17.0845, -22.5678)
   - Nearest segment: walkway near library
   - Project to segment: (17.0845, -22.5678)
   - Store: walkEnd = [17.0845, -22.5678]

5. User clicks "Find Route"
   - tryComputeRoute() called
   - Create virtual node V_start at (17.0835, -22.5675)
   - Create virtual node V_end at (17.0845, -22.5678)
   - Run A*(V_start, V_end, graph)
   
   A* Search:
     Initial:
       open_set = {V_start}
       g_score[V_start] = 0
       f_score[V_start] = 112.5 (heuristic distance to V_end)
     
     Iteration 1:
       current = V_start (lowest f_score)
       neighbors: [segment_A, segment_B]
       For segment_A:
         g = 0 + 45.2 = 45.2
         h = 89.3
         f = 134.5
       For segment_B:
         g = 0 + 32.1 = 32.1
         h = 92.1
         f = 124.2
       open_set = {segment_A, segment_B}
     
     Iteration 2:
       current = segment_B (f=124.2 < 134.5)
       neighbors: [segment_A, segment_C, segment_D]
       ... continue spreading outward, always exploring lowest f_score nodes
     
     When V_end is popped from open_set:
       Path found! Reconstruct from came_from links
       Path: V_start → ... → segment_X → V_end

6. Route Rendering
   - Extract coordinates from path nodes
   - Calculate distance: 247 meters
   - Calculate duration: 247 / 1.4 ≈ 3 minutes
   - Draw LineString feature on map (blue line)
   - Show popup: "Walking route: 247m, ~3 min"

7. Cleanup
   - Remove virtual nodes from graph
   - Keep route line visible until user clicks Clear
```

---

## Data Flow

### User Interaction Flow

```
┌─────────────────────────────────────────────────────┐
│ User opens CampusNav dashboard                       │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ MapComponent mounts, initializes MapLibre            │
│ ├─ Check WebGL support                              │
│ ├─ Load map style (MapTiler → Carto → Esri → OSM)   │
│ ├─ Create map instance                              │
│ └─ Setup 'load' event listener                       │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Map 'load' event fires                               │
│ ├─ Fetch all GeoJSON files from public/data/         │
│ ├─ Add layers: campus, buildings, POIs, walkways     │
│ ├─ Build walking graph (nodes + edges)              │
│ ├─ Setup keyboard handlers (Shift+arrows)            │
│ └─ Setup ResizeObserver (responsive canvas)          │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Map is ready, user sees:                             │
│ ├─ Interactive map with campus                       │
│ ├─ Building 3D models                                │
│ ├─ POI markers                                       │
│ ├─ Control buttons                                   │
│ └─ Debug overlay                                     │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ User clicks "Set Start" button                       │
│ └─ mapRef.current?.setStartMode() called             │
│    └─ walkSelectingRef.current = 'start'             │
│       └─ Map enters "start selection" mode           │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ User clicks on map location                          │
│ └─ map.click event fired                             │
│    ├─ Check walkSelectingRef.current == 'start'      │
│    ├─ Get clicked coordinates [lng, lat]             │
│    ├─ Project to nearest walkway segment             │
│    ├─ Create green circle marker (start point)       │
│    ├─ Store: walkStartRef = [lng, lat]               │
│    ├─ Reset: walkSelectingRef.current = null         │
│    └─ Auto-call: tryComputeRoute() (if end exists)   │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ User clicks "Set Destination" button                 │
│ └─ mapRef.current?.setEndMode() called               │
│    └─ walkSelectingRef.current = 'end'               │
│       └─ Map enters "end selection" mode             │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ User clicks on map location (second location)        │
│ └─ map.click event fired                             │
│    ├─ Check walkSelectingRef.current == 'end'        │
│    ├─ Get clicked coordinates [lng, lat]             │
│    ├─ Project to nearest walkway segment             │
│    ├─ Create red circle marker (end point)           │
│    ├─ Store: walkEndRef = [lng, lat]                 │
│    └─ Auto-call: tryComputeRoute()                   │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ tryComputeRoute() executes                           │
│ ├─ Check both start and end points exist             │
│ ├─ Create virtual nodes at snap points               │
│ ├─ Run A* algorithm                                  │
│ ├─ On success:                                       │
│ │  ├─ Extract route coordinates                      │
│ │  ├─ Calculate distance and duration                │
│ │  ├─ Draw blue line on map                          │
│ │  ├─ Show popup with stats                          │
│ │  └─ Fit map bounds to route                        │
│ └─ On failure:                                       │
│    ├─ Try component bridging at gates (8m, 12m)      │
│    └─ Show "No path found" popup if still fails       │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ User sees:                                            │
│ ├─ Blue line route on map                            │
│ ├─ Popup showing: "Walking route (A*)"               │
│ │                 "Distance: 0.25 km"                │
│ │                 "Duration: ~3 min"                 │
│ ├─ Map auto-zoomed to show full route                │
│ └─ Start (green) and end (red) markers still visible │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ User can:                                             │
│ ├─ Click "Clear" to reset everything                 │
│ │  └─ Clear route line, markers, popup               │
│ ├─ Click "Set Start" to choose new start             │
│ ├─ Click "Find Route" to recalculate (if moved)      │
│ ├─ Use keyboard for 3D navigation                    │
│ │  └─ Shift+↑↓←→ to rotate/pitch view                │
│ ├─ Right-click to reset view to campus               │
│ └─ Explore map with normal pan/zoom                  │
└─────────────────────────────────────────────────────┘
```

---

## GeoJSON Data Formats

### nust-campus.geojson

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "NUST Main Campus",
        "area_sqm": 150000
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [17.08, -22.57],
            [17.09, -22.57],
            [17.09, -22.58],
            [17.08, -22.58],
            [17.08, -22.57]  // Must close
          ]
        ]
      }
    }
  ]
}
```

**USAGE:**
- Map extent and boundary
- Building avoidance masking
- View constraints

### nust-buildings.geojson

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Engineering Building",
        "height": 25,
        "campus": "Main Campus",
        "color": "#4A90E2",
        "building_type": "academic"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [17.0835, -22.5675],
            [17.0840, -22.5675],
            [17.0840, -22.5680],
            [17.0835, -22.5680],
            [17.0835, -22.5675]
          ]
        ]
      }
    }
  ]
}
```

**USAGE:**
- 3D visualization (fill-extrusion layer with height property)
- Route obstacle detection (block edges crossing polygons)
- Building information popups

### nust-walkways.geojson

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Main Walkway",
        "walkway_type": "path",
        "width_m": 2.5
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [17.0835, -22.5675],
          [17.0840, -22.5675],
          [17.0845, -22.5678],
          [17.0850, -22.5680]
        ]
      }
    }
  ]
}
```

**USAGE:**
- Building walking graph (nodes from coordinates)
- Route path visualization (thin gray lines on map)
- Pathfinding base data

**CONVERSION TO GRAPH:**
```
LineString: [[17.0835, -22.5675], [17.0840, -22.5675], ...]

↓

Creates nodes:
  node_1: id="17.083500,-22.567500", lng=17.0835, lat=-22.5675
  node_2: id="17.084000,-22.567500", lng=17.0840, lat=-22.5675
  node_3: id="17.084500,-22.567800", lng=17.0845, lat=-22.5678
  ...

Creates edges:
  node_1 ↔ node_2 (weight = haversine distance ≈ 50m)
  node_2 ↔ node_3 (weight = haversine distance ≈ 52m)
  ...
```

### nust-labels.geojson

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "NUST Library",
        "type": "building",
        "amenity": "library",
        "entrance": false,
        "description": "Main university library"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [17.0845, -22.5678]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Main Gate",
        "type": "gate",
        "barrier": "gate",
        "entrance": true
      },
      "geometry": {
        "type": "Point",
        "coordinates": [17.0850, -22.5680]
      }
    }
  ]
}
```

**USAGE:**
- Map labels (symbol layer showing names on map)
- Geocoding database (search by building name)
- Gate detection for component bridging
- POI identification

### eng-rooms.geojson (Future)

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "room_number": "E102",
        "building": "Engineering",
        "floor": 1,
        "room_type": "classroom",
        "capacity": 60
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[...]]]
      }
    }
  ]
}
```

**FUTURE USE:**
- Indoor navigation (room-level routing)
- Room information (capacity, type, booking)
- Multi-floor building navigation

---

## Key Algorithms & Functions

### Haversine Distance

```typescript
const hav = (a: [number, number], b: [number, number]) => {
    const R = 6371000;  // Earth radius in meters
    const toRad = (x: number) => x * Math.PI / 180;
    const dLat = toRad(b[1] - a[1]);
    const dLon = toRad(b[0] - a[0]);
    const la1 = toRad(a[1]);
    const la2 = toRad(b[1]);
    const s = Math.sin(dLat / 2) ** 2 + 
              Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
};
```

**RETURNS:** Distance in meters between two lat/lng points

### Point-in-Polygon (Ray Casting)

```typescript
const pointInRing = (lng: number, lat: number, ring: number[][]) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        const intersect = ((yi > lat) !== (yj > lat)) && 
                          (lng < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};
```

**RETURNS:** true if point is inside polygon ring

**USAGE:** Detect if user point is inside a building (to block that edge)

### Line-Line Intersection

```typescript
const segsIntersect = (ax, ay, bx, by, cx, cy, dx, dy) => {
    const orient = (px, py, qx, qy, rx, ry) => 
        (qx - px) * (ry - py) - (qy - py) * (rx - px);
    const o1 = orient(ax, ay, bx, by, cx, cy);
    const o2 = orient(ax, ay, bx, by, dx, dy);
    const o3 = orient(cx, cy, dx, dy, ax, ay);
    const o4 = orient(cx, cy, dx, dy, bx, by);
    return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
};
```

**RETURNS:** true if line segment AB intersects with line segment CD

**USAGE:** Detect if walkway edge crosses through a building

---

## Performance Considerations

### Graph Building Performance

```
Complexity: O(n * m)
  where n = number of walkway segments
        m = number of buildings

Steps:
1. Parse GeoJSON: O(n)
2. Create nodes & edges: O(n)
3. Densify (5m steps): O(n * steps_per_segment)
4. Fill gaps (6m threshold): O(n² ) with spatial bucketing → O(n)
5. Prune edges: O(edges * buildings) → O(n * m)

Total: O(n * m) but optimized with:
  - Spatial bucketing for gap filling
  - Quick bbox rejection for building edges
```

### A* Pathfinding Performance

```
Complexity: O(n log n)
  where n = number of nodes in graph

Steps:
1. Initialize: O(1)
2. Main loop: O(n) iterations
   - Pop minimum f_score: O(log n) with priority queue
   - Update neighbors: O(degree) ≈ O(1) per node
3. Total: O(n log n)

Typical NUST campus:
  - ~2000-5000 nodes in graph
  - A* takes <50ms on modern browsers
```

### Map Rendering Performance

```
Optimization techniques used:
- Vector tile caching (browser disk cache)
- Layer opacity culling (don't render hidden layers)
- Zoom-level visibility (show labels only at high zoom)
- ResizeObserver (efficient canvas sizing)
- WebGL hardware acceleration (MapLibre)
```

---

## Debugging Tips

### Console Logging

Add these to MapComponent to debug pathfinding:

```typescript
console.log('Graph nodes:', Object.keys(graph.nodes).length);
console.log('A* path length:', coords.length);
console.log('Route distance (m):', meters);
console.log('Estimated duration (min):', minutes);
```

### Debug Overlay

Check these values in the overlay:
- **Canvas: 0x0** → CSS display:none or hidden parent
- **Container: 0x0** → Parent container has no height
- **Status: Error** → Check Network tab for style/tile errors

### Browser Dev Tools

```javascript
// In browser console, while on dashboard:

// Access map instance
const map = mapRef.current;

// Check graph status
console.log(mapInstance.getStyle());

// List all sources
console.log(map.getStyle().sources);

// List all layers
console.log(map.getStyle().layers);

// Zoom to coordinates
map.flyTo({ center: [17.0865, -22.5710], zoom: 18 });
```

---

**End of Documentation**

*Last Updated: November 2025*
