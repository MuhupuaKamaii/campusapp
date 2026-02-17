# MapComponent.tsx - Complete Technical Guide

## Overview

`MapComponent.tsx` is a sophisticated React component that renders an interactive campus map for NUST (Namibia University of Science and Technology). It integrates multiple technologies including React, TypeScript, MapLibreGL, and vanilla DOM manipulation to provide a rich geospatial experience with walking route calculation.

**File Size:** ~1,604 lines  
**Primary Technologies:** React, TypeScript, MapLibreGL, GeoJSON, A* Pathfinding, DOM API

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Technologies & Languages](#core-technologies--languages)
3. [Component Structure](#component-structure)
4. [Detailed Feature Breakdown](#detailed-feature-breakdown)
5. [CSS & Styling Approach](#css--styling-approach)
6. [Mathematical Algorithms](#mathematical-algorithms)
7. [Data Structures](#data-structures)
8. [Event Handling](#event-handling)
9. [Current Issues & Debugging](#current-issues--debugging)
10. [Modularization Recommendations](#modularization-recommendations)

---

## Architecture Overview

```
MapComponent (React.forwardRef)
├── Map Initialization (MapLibreGL)
├── Base Layer Management (Raster/Vector tiles)
├── Campus Data Layer (GeoJSON - NUST boundaries)
├── Points of Interest Layer (POIs)
├── Mask/Fade Effect Layer
├── Label Cache (Buildings, gates)
├── Walking Route System (A* algorithm)
│   ├── Graph Construction (walkways)
│   ├── Edge Pruning (buildings avoidance)
│   ├── Route Calculation
│   └── WalkControl UI
├── Keyboard Navigation
└── Ref API (imperative handle)
```

---

## Core Technologies & Languages

### 1. **TypeScript** (Primary)
- **Type Annotations:** Component uses extensive typing with `MapComponentRef`, `Node`, `NodeId`
- **Generics:** `forwardRef<MapComponentRef>` for ref forwarding
- **Interfaces:** `MapComponentRef` defines exposed methods (`findRoute`, `clearRoute`, `goToMainCampus`, `goToLowerCampus`)
- **Type Assertions:** `as any`, `as [number, number]`, `as const` for strict type checking
- **Union Types:** `'start' | 'end' | null` for state values

### 2. **React** (UI Framework)
- **Hooks Used:**
  - `useRef<T>()` - Persistent references across renders
  - `useEffect()` - Map lifecycle (initialization, cleanup)
  - `useState<boolean>()` - Route active state
  - `useImperativeHandle()` - Expose methods to parent
  - `forwardRef()` - Forward refs to DOM element

- **Ref Management:**
  ```typescript
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<Map | null>(null);
  const keyHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  ```

### 3. **MapLibreGL** (Mapping Library)
- **Map Initialization:**
  ```typescript
  map.current = new maplibregl.Map({
    container: container,
    style: mapTilerStyleUrl || cartoStyleUrl || osmRasterStyle,
    center: nustCenter,
    zoom: 16.5,
    pitch: 0,
    bearing: 0
  });
  ```
- **Controls:**
  - NavigationControl (zoom + compass)
  - GeolocateControl (user location tracking)
  - FullscreenControl
- **Sources & Layers:** Add/manage GeoJSON data sources
- **Events:** `'load'`, `'click'`, `'mouseenter'`, `'mouseleave'`, `'style data'`

### 4. **GeoJSON** (Geospatial Data Format)
Used for:
- Campus boundaries (`nust-campus.geojson`)
- Walking paths (`nust-walkways.geojson`)
- Building polygons (`nust-buildings.geojson`)
- Campus labels/POIs (`nust-labels.geojson`)

### 5. **JavaScript DOM API** (Vanilla JS)
- `document.createElement()` - Build dropdown UI
- `addEventListener()` - Input/click handlers
- `style.*` - Inline CSS manipulation
- `textContent` - Set element text

### 6. **CSS** (Inline Styles)
Applied dynamically to elements. See [CSS & Styling](#css--styling-approach) section.

---

## Component Structure

### 1. **Imports & Setup**
```typescript
import React, { useRef, useEffect, JSX, useState, useImperativeHandle, forwardRef } from 'react';
import { knownLocations } from './knownLocations';
import maplibregl, { Map, NavigationControl, GeolocateControl, FullscreenControl, Popup } from 'maplibre-gl';
```

### 2. **Constants**
```typescript
export const CAMPUS_LOCATIONS = {
    main: [17.08265, -22.56085],
    lower: [17.0786, -22.56485]
};
```

### 3. **Interface Definition**
```typescript
export interface MapComponentRef {
    findRoute: () => void;
    clearRoute: () => void;
    goToMainCampus: () => void;
    goToLowerCampus: () => void;
}
```

### 4. **Component Declaration**
```typescript
const MapComponent = forwardRef<MapComponentRef>((props, ref) => {
    // Component logic here
});
```

### 5. **Ref Declarations**
Multiple refs for persistent state:
```typescript
const mapContainer = useRef<HTMLDivElement | null>(null);
const map = useRef<Map | null>(null);
const keyHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);
const routeSourceRef = useRef<string | null>(null);
const walkSelectingRef = useRef<'start' | 'end' | null>(null);
const walkStartRef = useRef<[number, number] | null>(null);
const walkEndRef = useRef<[number, number] | null>(null);
const [routeActive, setRouteActive] = useState(false);
```

### 6. **useEffect Hook**
- **Initialization:** Checks if map already exists, initializes if container is ready
- **Cleanup:** Removes event listeners and map on unmount
- **Dependencies:** Empty array `[]` = runs once on mount

---

## Detailed Feature Breakdown

### Feature 1: Base Map Layer

**Style Options (in priority order):**
1. **MapTiler Vector (if API key available)**
   - High-quality vector tiles with custom styling
   - Configurable style via `VITE_MAPTILER_STYLE` environment variable
   - Default: 'hybrid' style

2. **Carto Positron Vector (fallback)**
   - OSM-based vector tiles
   - No API key required
   - Reliable street-level detail

3. **Esri Satellite Raster (fallback 2)**
   - High-resolution satellite imagery
   - 512px tile size
   - Attribution: Esri, Maxar, GeoEye

4. **OSM Raster (fallback 3)**
   - Basic OpenStreetMap tiles
   - 256px tile size
   - Always available, no dependencies

**Code Pattern:**
```typescript
const mapTilerKey = (import.meta as any).env?.VITE_MAPTILER_KEY;
const mapTilerStyleUrl = mapTilerKey
    ? `https://api.maptiler.com/maps/${mapTilerStyleName}/style.json?key=${mapTilerKey}`
    : null;

map.current = new maplibregl.Map({
    style: mapTilerStyleUrl || cartoStyleUrl || osmRasterStyle
});
```

### Feature 2: Campus Boundary & Masking

**Purpose:** Focus user attention on campus, dim/hide everything outside

**Three Layers:**
1. **nust-campus** (GeoJSON source)
   - Campus polygon boundary from `/data/nust-campus.geojson`

2. **outside-mask-near** (fill layer)
   - White fill with 40% opacity outside campus
   - Creates soft dimming effect

3. **outside-mask-far** (fill layer)
   - White fill with 100% opacity beyond 100m buffer
   - Completely hides far-away areas

**Implementation:**
```typescript
// Build mask geometry: world polygon with campus holes
const worldRing = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
const holes = []; // Campus polygons

const nearMask = {
    type: 'FeatureCollection',
    features: [{
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [worldRing, ...holes] }
    }]
};
```

**Math Concept:** Ring-based polygon subtraction creates the "hole" effect

### Feature 3: Campus Labels

**Source:** `/data/nust-labels.geojson`  
**Cached at:** `let labelsCache: any = null;`

**Layer Configuration:**
```typescript
{
    id: 'nust-labels',
    type: 'symbol',
    source: 'nust-labels',
    layout: {
        'text-field': ['coalesce', ['get','name'], ['get','amenity'], ['get','building'], ['get','entrance'], ['get','barrier']],
        'text-size': 12,
        'text-offset': [0, 0.6],
        'text-anchor': 'top',
        'text-optional': true
    },
    paint: {
        'text-color': '#111827',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.2
    }
}
```

**Feature:** Text halos make labels readable over any background

### Feature 4: Points of Interest (POIs)

**Hardcoded Locations:**
```typescript
const nustPOIs = {
    type: 'FeatureCollection',
    features: [
        {
            properties: { name: 'Main Gate', type: 'gate' },
            geometry: { type: 'Point', coordinates: [17.0825, -22.5690] }
        }
        // More features...
    ]
};
```

**Styling:**
- Gates: Red circles, 10px radius
- Other POIs: Blue circles, 8px radius
- White stroke for visibility

**Interaction:**
- Click → Show popup with name
- Hover → Cursor changes to pointer

### Feature 5: Walking Route System (Complex)

#### 5.1 Graph Construction

**What it does:** Converts GeoJSON walkway linestrings into a directed graph

**Types:**
```typescript
type NodeId = string; // Format: "lng.toFixed(6),lat.toFixed(6)"
type Node = {
    id: NodeId;
    lng: number;
    lat: number;
    edges: Array<{ to: NodeId; w: number }>; // w = weight/distance
};
```

**Algorithm:**
```
for each LineString in walkways:
    for each segment [pt1, pt2]:
        densify segment by adding intermediate nodes every 5 meters
        connect nodes with edges
```

**Densification Purpose:** Improves connectivity at intersections. Without it, two paths crossing wouldn't connect.

**Code:**
```typescript
const addDensified = (lng1, lat1, lng2, lat2) => {
    const n1 = ensureNode(lng1, lat1);
    const n2 = ensureNode(lng2, lat2);
    const dist = hav([lng1, lat1], [lng2, lat2]);
    const step = 5; // meters
    const parts = Math.ceil(dist / step);
    
    let prev = n1;
    for (let i = 1; i < parts; i++) {
        const t = i / parts;
        const mid = ensureNode(
            lng1 + (lng2 - lng1) * t,
            lat1 + (lat2 - lat1) * t
        );
        addEdge(prev, mid);
        prev = mid;
    }
    addEdge(prev, n2);
};
```

#### 5.2 Edge Pruning Against Buildings

**Purpose:** Remove path edges that would go through buildings

**Algorithm: Geometry Intersection**
```typescript
for each edge (a, b):
    for each building polygon:
        if either endpoint inside building → block edge
        if edge segment intersects polygon boundary → block edge
```

**Key Functions:**
- `pointInRing()` - Ray casting algorithm to test if point is inside polygon
- `segsIntersect()` - Orientation-based line segment intersection test

**Math (Orient Function):**
```typescript
const orient = (px, py, qx, qy, rx, ry) => 
    (qx - px) * (ry - py) - (qy - py) * (rx - px);
```
Returns sign indicating which side of line qr the point p is on.

#### 5.3 Gap Bridging

**Problem:** Walkways may have small gaps (unmapped connections, gates)

**Solution:** Create spatial bucket grid, connect nearby nodes within 6 meters

```typescript
const bucketM = 6; // meters
const buckets: Record<string, string[]> = {};

// Quantize coordinates into grid cells
for (const n of nodes) {
    const bx = Math.round(n.lng / dLng);
    const by = Math.round(n.lat / dLat);
    const key = bx + ':' + by;
    buckets[key] ??= [];
    buckets[key].push(n.id);
}

// Check 3x3 neighborhood for nearby nodes
const neigh = [-1, 0, 1];
for (const id of ids) {
    const a = graph.nodes[id];
    for (const dx of neigh) {
        for (const dy of neigh) {
            const neighbors = buckets[(bx + dx) + ':' + (by + dy)] ?? [];
            // Connect if within 6m
        }
    }
}
```

#### 5.4 Haversine Distance

**Purpose:** Great-circle distance between two lat/lng coordinates

```typescript
const hav = (a: [number, number], b: [number, number]) => {
    const R = 6371000; // Earth radius in meters
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

**Key Feature:** Accounts for Earth's curvature (unlike simple Euclidean distance)

#### 5.5 A* Pathfinding Algorithm

**What it does:** Finds shortest walking path between two points

**Data Structures:**
```typescript
const open = new Set<NodeId>();           // Frontier to explore
const came: Record<NodeId, NodeId> = {};   // Parent of each node (for backtracking)
const g: Record<NodeId, number> = {};      // Cost from start to node
const fScore: Record<NodeId, number> = {}; // g + heuristic
```

**Algorithm:**
```
1. Add start node to open set
2. While open set not empty:
   3. Pop node with lowest f-score
   4. If reached goal → reconstruct path and return
   5. For each neighbor of current:
       6. Calculate tentative g-score
       7. If better than known → update parent, add to open
```

**Heuristic:** Haversine distance to goal (admissible, so A* is optimal)

**Code:**
```typescript
const astar = (start: NodeId, goal: NodeId): NodeId[] | null => {
    const open = new Set<NodeId>([start]);
    const came: Record<NodeId, NodeId> = {};
    const g: Record<NodeId, number> = { [start]: 0 };
    const h0 = hav(
        [graph.nodes[start].lng, graph.nodes[start].lat],
        [graph.nodes[goal].lng, graph.nodes[goal].lat]
    );
    const fScore: Record<NodeId, number> = { [start]: h0 };

    while (open.size) {
        const current = popBest(); // Pop lowest f-score
        if (current === goal) {
            const path: NodeId[] = [current];
            while (came[path[path.length - 1]]) 
                path.push(came[path[path.length - 1]]);
            return path.reverse();
        }

        for (const e of graph.nodes[current].edges) {
            const tent = (g[current] ?? Infinity) + e.w;
            if (tent < (g[e.to] ?? Infinity)) {
                came[e.to] = current;
                g[e.to] = tent;
                const ng = graph.nodes[e.to];
                fScore[e.to] = tent + hav(
                    [ng.lng, ng.lat],
                    [graph.nodes[goal].lng, graph.nodes[goal].lat]
                );
                open.add(e.to);
            }
        }
    }
    return null; // No path found
};
```

#### 5.6 Virtual Node Snapping

**Problem:** User clicks might not be exactly on a walkway node

**Solution:** Project click point onto nearest walkway segment, create temporary virtual node

```typescript
const addVirtualNodeOnNearestSegment = (lng: number, lat: number) => {
    const seg = projectToNearestSegment(lng, lat);
    if (!seg) return { id: nearestNodeId(lng, lat), cleanup: () => {} };
    
    const id: NodeId = `virt:${seg.px.toFixed(7)},${seg.py.toFixed(7)}`;
    if (!graph.nodes[id]) 
        graph.nodes[id] = { id, lng: seg.px, lat: seg.py, edges: [] };
    
    const v = graph.nodes[id];
    const a = seg.a, b = seg.b;
    const wa = hav([v.lng, v.lat], [a.lng, a.lat]);
    const wb = hav([v.lng, v.lat], [b.lng, b.lat]);
    
    // Connect virtual node to segment endpoints
    a.edges.push({ to: v.id, w: wa });
    b.edges.push({ to: v.id, w: wb });
    v.edges.push({ to: a.id, w: wa });
    v.edges.push({ to: b.id, w: wb });
    
    // Return cleanup function to remove virtual node later
    return {
        id: v.id,
        cleanup: () => {
            a.edges = a.edges.filter(ed => ed.to !== v.id);
            b.edges = b.edges.filter(ed => ed.to !== v.id);
            delete graph.nodes[v.id];
        }
    };
};
```

**Math (Point-to-Segment Projection):**
```typescript
const projectToNearestSegment = (lng: number, lat: number) => {
    // Convert to meters for accurate projection
    const toMeters = (xLng, xLat) => ({
        x: xLng * mPerDegLng,
        y: xLat * mPerDegLat
    });
    
    // For each segment, find closest point
    for (const a of graph.nodes) {
        for (const e of a.edges) {
            const b = graph.nodes[e.to];
            const P = toMeters(lng, lat);     // Point
            const A = toMeters(a.lng, a.lat); // Segment start
            const B = toMeters(b.lng, b.lat); // Segment end
            
            // Vector from A to B
            const ABx = B.x - A.x, ABy = B.y - A.y;
            // Vector from A to P
            const APx = P.x - A.x, APy = P.y - A.y;
            
            // Projection parameter (0=A, 1=B)
            const ab2 = ABx * ABx + ABy * ABy;
            let t = (APx * ABx + APy * ABy) / ab2;
            t = Math.max(0, Math.min(1, t)); // Clamp to [0,1]
            
            // Closest point on segment
            const Qx = A.x + t * ABx;
            const Qy = A.y + t * ABy;
        }
    }
};
```

**This is vector projection using dot product.**

#### 5.7 Component Disconnection Bridging

**Problem:** If start and end are in different walkway components, no path exists

**Solution:** Find nearest nodes between components that are near gates/entrances

```typescript
const connectComponentsByNearest = (sId, eId, maxDistM) => {
    const A = componentOf(sId);
    if (A.has(eId)) return true; // Already connected
    
    let best = null;
    for (const aId of A) {
        for (const bId in graph.nodes) {
            if (A.has(bId)) continue; // Skip nodes in same component
            const d = hav([a.lng, a.lat], [b.lng, b.lat]);
            
            // Only bridge if at least one end is near gate/entrance
            if (d <= maxDistM && 
                (isNearEntrance(a.lng, a.lat) || 
                 isNearEntrance(b.lng, b.lat))) {
                if (!best || d < best.d) best = { a: aId, b: bId, d };
            }
        }
    }
    if (best) {
        addEdge(graph.nodes[best.a], graph.nodes[best.b]);
        return true;
    }
    return false;
};
```

### Feature 6: Walking Route Control (WalkControl)

**What it is:** A MapLibreGL control (custom UI element) with:
- Start location input + autocomplete dropdown
- Destination input + autocomplete dropdown
- Set buttons (geocode/lookup)
- Start button (enter point-select mode)
- Clear button (reset route)

#### 6.1 Autocomplete Implementation

**Uses `knownLocations` array from `knownLocations.js`**

**Flow:**
1. User types in input field
2. `input` event listener filters `knownLocations` by name
3. Render matching locations as `<li>` elements in dropdown
4. Dropdown appears above input (`top: 40px`)
5. User clicks suggestion → input value set, point placed on map

**Key Code Pattern:**
```typescript
is.addEventListener('input', function (ev) {
    const val = is.value.trim().toLowerCase();
    startDropdown.innerHTML = '';
    
    if (!val) {
        startDropdown.style.display = 'none';
        return;
    }
    
    const matches = knownLocations.filter(loc => 
        loc.name.toLowerCase().includes(val)
    );
    
    if (matches.length === 0) {
        startDropdown.style.display = 'none';
        return;
    }
    
    matches.forEach(loc => {
        const li = document.createElement('li');
        li.textContent = loc.name;
        li.addEventListener('mousedown', (event) => {
            event.preventDefault();
            is.value = loc.name;
            startDropdown.style.display = 'none';
            setPoint('start', loc.coordinates[0], loc.coordinates[1]);
        });
        startDropdown.appendChild(li);
    });
    
    startDropdown.style.display = 'block';
});
```

**Event Choice:** `mousedown` instead of `click` because:
- `click` fires after `blur`
- `blur` closes dropdown immediately
- `mousedown` fires before `blur` (gets the click)
- Must call `preventDefault()` to keep focus in input

#### 6.2 Outside Click Handling

**Problem:** Dropdown stays open when clicking elsewhere

**Solution:** Document-level click listener

```typescript
const startClickHandler = (e: any) => {
    if (e.target instanceof Node && !startDiv.contains(e.target)) {
        startDropdown.style.display = 'none';
    }
};
document.addEventListener('click', startClickHandler);
```

**Type Safety:** `e.target instanceof Node` checks type before calling `.contains()`

### Feature 7: Keyboard Navigation

**Shift + Arrow Keys:**
```typescript
const handleKeyPress = (e: KeyboardEvent) => {
    if (!map.current || !e.shiftKey) return;
    
    const currentPitch = map.current.getPitch();
    const currentBearing = map.current.getBearing();
    
    switch(e.key) {
        case 'ArrowUp':
            map.current.easeTo({ pitch: Math.min(currentPitch + 5, 60) });
            break;
        case 'ArrowDown':
            map.current.easeTo({ pitch: Math.max(currentPitch - 5, 0) });
            break;
        case 'ArrowLeft':
            map.current.easeTo({ bearing: currentBearing - 15 });
            break;
        case 'ArrowRight':
            map.current.easeTo({ bearing: currentBearing + 15 });
            break;
    }
};
```

**Stored in ref to allow cleanup:**
```typescript
keyHandlerRef.current = handleKeyPress;
window.addEventListener('keydown', handleKeyPress);

// In cleanup:
window.removeEventListener('keydown', keyHandlerRef.current);
```

---

## CSS & Styling Approach

**Strategy:** All CSS is **inline, applied dynamically via JavaScript**

### Styling Patterns Used:

#### 1. **Container Wrapper**
```typescript
c.style.background = 'transparent';
c.style.padding = '6px 8px';
c.style.display = 'flex';
c.style.flexWrap = 'wrap';
c.style.gap = '8px';
c.style.overflow = 'visible';
```

#### 2. **Input Fields**
```typescript
is.style.padding = '8px 10px';
is.style.border = '1px solid #e5e7eb';
is.style.borderRadius = '9999px'; // Pill shape
is.style.width = 'min(40vw, 240px)'; // Responsive
is.style.background = '#FFFFFF';
is.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.04)';
is.style.transition = 'box-shadow 120ms ease-in-out, border-color 120ms ease-in-out';

// Focus state
is.onfocus = () => {
    is.style.borderColor = '#60A5FA';
    is.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.25)';
};

// Blur state
is.onblur = () => {
    is.style.borderColor = '#e5e7eb';
    is.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.04)';
};
```

#### 3. **Dropdown Menu**
```typescript
startDropdown.style.position = 'absolute';
startDropdown.style.left = '0';
startDropdown.style.right = '0';
startDropdown.style.top = '40px';
startDropdown.style.background = '#fff';
startDropdown.style.border = '1px solid #e5e7eb';
startDropdown.style.borderRadius = '8px';
startDropdown.style.zIndex = '2000';
startDropdown.style.maxHeight = '200px';
startDropdown.style.overflowY = 'auto';
startDropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
startDropdown.style.display = 'none'; // Hidden by default
```

**Key Z-Index Values:**
- Dropdown: `2000` (stays above map)
- Parent container: `1100`
- Map controls: ~`1000`

#### 4. **Dropdown Items**
```typescript
li.style.padding = '8px 12px';
li.style.cursor = 'pointer';
li.style.borderBottom = '1px solid #f3f4f6';

// Hover state
li.addEventListener('mouseenter', () => {
    li.style.background = '#f3f4f6';
});
li.addEventListener('mouseleave', () => {
    li.style.background = 'transparent';
});
```

#### 5. **Buttons**
```typescript
b.style.padding = '8px 12px';
b.style.border = '1px solid #e5e7eb';
b.style.borderRadius = '9999px';
b.style.background = '#F9FAFB';
b.style.color = '#111827';
b.style.fontSize = '12px';
b.style.fontWeight = '600';
b.style.cursor = 'pointer';
b.style.transition = 'all 120ms ease-in-out';
b.style.display = 'inline-flex';
b.style.alignItems = 'center';
b.style.justifyContent = 'center';

// Hover states
b.onmouseenter = () => { b.style.background = '#F3F4F6'; };
b.onmouseleave = () => { b.style.background = '#F9FAFB'; };
```

#### 6. **Color Scheme**
```
Primary: #16A34A (Green - Start button)
Secondary: #EF4444 (Red - Clear button)
Neutral: #F9FAFB, #e5e7eb, #111827
Accent: #60A5FA (Blue - Focus state)
```

#### 7. **Responsive Units**
```
width: 'min(40vw, 240px)'  // Smaller of viewport-width or 240px
width: 'min(45vw, 300px)'  // For destination input
maxWidth: 'min(95vw, 980px)' // Container
```

---

## Mathematical Algorithms

### 1. **Haversine Distance** (Great-Circle Distance)
Used to calculate real distance between lat/lng coordinates.

**Formula:**
$$a = \sin^2(\frac{\Delta \text{lat}}{2}) + \cos(\text{lat}_1) \cdot \cos(\text{lat}_2) \cdot \sin^2(\frac{\Delta \text{lon}}{2})$$

$$c = 2 \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a})$$

$$d = R \cdot c$$

Where $R = 6,371,000$ meters (Earth radius)

### 2. **Ray Casting (Point-in-Polygon)**
Determines if a point is inside a polygon.

**Algorithm:**
- Cast ray from point to infinity
- Count intersections with polygon edges
- Odd count = inside, even count = outside

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

### 3. **Line Segment Intersection (Orientation Method)**
Determines if two line segments intersect.

**Based on orientation of point triplets:**
```typescript
const orient = (px, py, qx, qy, rx, ry) => 
    (qx - px) * (ry - py) - (qy - py) * (rx - px);
```

**Algorithm:**
- Compute orientation of (p,q,r)
- Compute orientation of (p,q,s)
- Compute orientation of (r,s,p)
- Compute orientation of (r,s,q)
- Segments intersect if orientations indicate crossing

### 4. **A* Pathfinding**
Finds shortest path using greedy heuristic.

**F-Score = G-Score + Heuristic**
- **G-Score:** Actual distance from start
- **Heuristic:** Estimated distance to goal (haversine)

**Time Complexity:** O(n log n) where n = number of nodes

### 5. **Vector Projection (Point to Segment)**
Projects a point onto a line segment.

**Dot Product Method:**
```
AB = B - A (vector along segment)
AP = P - A (vector from A to point)
t = (AP · AB) / (AB · AB) (projection parameter)
t ∈ [0, 1] means projection falls on segment
Q = A + t * AB (closest point on segment)
```

---

## Data Structures

### 1. **Graph Structure**
```typescript
type NodeId = string;
type Node = {
    id: NodeId;
    lng: number;
    lat: number;
    edges: Array<{ to: NodeId; w: number }>;
};

const graph: { nodes: Record<NodeId, Node> } = { nodes: {} };
```

**Index:** O(1) lookup by node ID  
**Storage:** O(V + E) where V=nodes, E=edges

### 2. **Spatial Bucket Grid**
```typescript
const buckets: Record<string, string[]> = {};
// Key format: "bx:by" where bx, by are bucket coordinates
```

**Purpose:** Fast spatial queries (range searches)  
**Use:** Finding nearby nodes for gap bridging

### 3. **A* Data Structures**
```typescript
const open = new Set<NodeId>();                   // Frontier
const came: Record<NodeId, NodeId> = {};          // Parent pointers
const g: Record<NodeId, number> = {};             // G-scores
const fScore: Record<NodeId, number> = {};        // F-scores
```

**Limitation:** O(n) pop (should use priority queue for large graphs)

### 4. **GeoJSON Feature Collections**
```typescript
type Feature = {
    type: 'Feature';
    properties: Record<string, any>;
    geometry: {
        type: 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon';
        coordinates: number[] | number[][] | number[][][];
    };
};
```

---

## Event Handling

### 1. **Map Events**
```typescript
map.current.on('load', () => {})
map.current.on('error', (e) => {})
map.current.on('styledata', () => {})
map.current.on('click', (e) => {})
map.current.on('click', 'layer-id', (e) => {})
map.current.on('mouseenter', 'layer-id', () => {})
map.current.on('mouseleave', 'layer-id', () => {})
```

### 2. **Input Events**
```typescript
input.addEventListener('input', (ev) => {})
input.addEventListener('focus', () => {})
input.addEventListener('keydown', (ev) => {})
input.addEventListener('blur', () => {})
```

### 3. **DOM Events**
```typescript
li.addEventListener('mousedown', (event) => {})
li.addEventListener('mouseenter', () => {})
li.addEventListener('mouseleave', () => {})
document.addEventListener('click', (e) => {})
```

**Event Delegation:** All dropdowns use document-level click listener

---

## Current Issues & Debugging

### Issue 1: Dropdown Not Appearing

**Symptoms:** Type in input, no dropdown shown

**Debug Points:**
```typescript
// Added console.log statements:
console.log('Start input changed:', val);
console.log('Start matches found:', matches.length);
console.log('Start dropdown showing with', matches.length, 'options');
```

**Possible Causes:**
1. `knownLocations` not imported/empty
2. Dropdown hidden by CSS (z-index, overflow, display)
3. Dropdown created but display never set to 'block'
4. Input event listener not triggered

**Check in DevTools:**
- Open Console
- Type in Start field
- Look for log messages
- If no messages: listener not working
- If messages but no dropdown: CSS issue

### Issue 2: Type Error on e.target

**Cause:** `e.target` typed as `EventTarget`, not `Node`  
**Solution:** Type guard: `e.target instanceof Node`

```typescript
const handler = (e: any) => {
    if (e.target instanceof Node && !container.contains(e.target)) {
        // Safe to use Node methods
    }
};
```

### Issue 3: Duplicate Event Listeners

**Problem:** WalkControl created on each map initialization  
**Solution:** Named listeners (not implemented yet, uses anonymous functions)

---

## Modularization Recommendations

The component is **1,604 lines** and handles **8+ distinct concerns**. Here's how to break it down:

### **Current Problems:**
1. ✗ Single massive `useEffect` hook
2. ✗ All styling inlined (hard to maintain)
3. ✗ All routing logic embedded (mixing concerns)
4. ✗ WalkControl class inline (not reusable)
5. ✗ No type definitions for graph/nodes
6. ✗ Duplicate code (start/end inputs identical)

---

### **Recommended File Structure:**

```
src/
├── components/
│   └── MapComponent/
│       ├── MapComponent.tsx          (300 lines - React component only)
│       ├── hooks/
│       │   ├── useMapInitialization.ts
│       │   └── useMapControls.ts
│       ├── features/
│       │   ├── CampusLayer/
│       │   │   ├── index.ts
│       │   │   ├── hooks.ts
│       │   │   └── types.ts
│       │   ├── WalkingRoute/
│       │   │   ├── index.ts
│       │   │   ├── Graph.ts
│       │   │   ├── Pathfinding.ts
│       │   │   ├── Geometry.ts
│       │   │   └── types.ts
│       │   ├── WalkControl/
│       │   │   ├── WalkControl.ts
│       │   │   ├── LocationAutocomplete.ts
│       │   │   ├── types.ts
│       │   │   └── styles.ts
│       │   ├── MapLayers/
│       │   │   ├── BaseLayer.ts
│       │   │   ├── LabelsLayer.ts
│       │   │   ├── POIsLayer.ts
│       │   │   └── types.ts
│       │   └── Keyboard/
│       │       └── KeyboardNavigation.ts
│       └── styles/
│           └── defaults.ts
└── types/
    ├── map.types.ts
    ├── geojson.types.ts
    └── routing.types.ts
```

---

### **Module 1: `useMapInitialization.ts`**

**Purpose:** Initialize map with style fallbacks

```typescript
// useMapInitialization.ts
export const useMapInitialization = (
    container: HTMLDivElement,
    onLoad: (map: maplibregl.Map) => void
): { map: maplibregl.Map | null } => {
    const map = useRef<maplibregl.Map | null>(null);

    useEffect(() => {
        if (map.current) return;
        
        const mapInstance = new maplibregl.Map({
            container,
            style: getMapStyle(),
            center: CAMPUS_LOCATIONS.main,
            zoom: 16.5
        });

        mapInstance.on('load', () => {
            map.current = mapInstance;
            onLoad(mapInstance);
        });

        return () => mapInstance.remove();
    }, [container, onLoad]);

    return { map: map.current };
};
```

---

### **Module 2: `Graph.ts`**

**Purpose:** Graph construction and management

```typescript
// Graph.ts
export class WalkingGraph {
    nodes: Record<NodeId, Node> = {};
    graphReady: boolean = false;

    constructor(private geojson: GeoJSON.FeatureCollection) {
        this.buildFromGeoJSON(geojson);
    }

    private buildFromGeoJSON(gj: GeoJSON.FeatureCollection): void {
        for (const feature of gj.features || []) {
            if (feature.geometry.type === 'LineString') {
                this.addLineString(feature.geometry.coordinates);
            } else if (feature.geometry.type === 'MultiLineString') {
                for (const line of feature.geometry.coordinates) {
                    this.addLineString(line);
                }
            }
        }
        this.bridgeGaps();
        this.graphReady = Object.keys(this.nodes).length > 0;
    }

    private addLineString(coords: [number, number][]): void {
        for (let i = 0; i < coords.length - 1; i++) {
            const [lng1, lat1] = coords[i];
            const [lng2, lat2] = coords[i + 1];
            this.addDensifiedSegment(lng1, lat1, lng2, lat2);
        }
    }

    private addDensifiedSegment(
        lng1: number,
        lat1: number,
        lng2: number,
        lat2: number
    ): void {
        const n1 = this.ensureNode(lng1, lat1);
        const n2 = this.ensureNode(lng2, lat2);
        const dist = haversine([lng1, lat1], [lng2, lat2]);
        
        if (dist <= DENSIFY_STEP) {
            this.addEdge(n1, n2);
            return;
        }

        const parts = Math.ceil(dist / DENSIFY_STEP);
        let prev = n1;

        for (let i = 1; i < parts; i++) {
            const t = i / parts;
            const mid = this.ensureNode(
                lng1 + (lng2 - lng1) * t,
                lat1 + (lat2 - lat1) * t
            );
            this.addEdge(prev, mid);
            prev = mid;
        }

        this.addEdge(prev, n2);
    }

    private bridgeGaps(): void {
        // Spatial bucketing + gap bridging logic
    }

    private ensureNode(lng: number, lat: number): Node {
        const id = `${lng.toFixed(6)},${lat.toFixed(6)}`;
        if (!this.nodes[id]) {
            this.nodes[id] = { id, lng, lat, edges: [] };
        }
        return this.nodes[id];
    }

    private addEdge(a: Node, b: Node): void {
        const w = haversine([a.lng, a.lat], [b.lng, b.lat]);
        a.edges.push({ to: b.id, w });
        b.edges.push({ to: a.id, w });
    }
}
```

---

### **Module 3: `Pathfinding.ts`**

**Purpose:** A* and routing logic

```typescript
// Pathfinding.ts
export class RouteFinder {
    constructor(private graph: WalkingGraph) {}

    findRoute(start: [number, number], end: [number, number]): RouteResult {
        const startNode = this.projectToGraph(start);
        const endNode = this.projectToGraph(end);

        if (!startNode || !endNode) {
            return { success: false, reason: 'Could not snap to walkways' };
        }

        let path = this.astar(startNode.id, endNode.id);

        if (!path) {
            // Try connecting components
            const connected = this.connectComponents(startNode.id, endNode.id);
            if (connected) {
                path = this.astar(startNode.id, endNode.id);
            }
        }

        if (!path) {
            return { success: false, reason: 'No path found' };
        }

        const coords = path.map(id => {
            const n = this.graph.nodes[id];
            return [n.lng, n.lat] as [number, number];
        });

        const distanceM = this.calculateDistance(coords);
        const durationMin = Math.round(distanceM / 1.4 / 60);

        return {
            success: true,
            path: coords,
            distanceKm: distanceM / 1000,
            durationMin
        };
    }

    private astar(start: NodeId, goal: NodeId): NodeId[] | null {
        // A* implementation
    }

    private projectToGraph(point: [number, number]): VirtualNode | null {
        // Virtual node snapping
    }
}
```

---

### **Module 4: `LocationAutocomplete.ts`**

**Purpose:** Reusable autocomplete component

```typescript
// LocationAutocomplete.ts
export interface LocationAutocompleteProps {
    placeholder: string;
    onSelect: (location: KnownLocation) => void;
}

export class LocationAutocomplete {
    private container: HTMLElement;
    private input: HTMLInputElement;
    private dropdown: HTMLUListElement;

    constructor(props: LocationAutocompleteProps) {
        this.container = this.buildDOM(props);
        this.attachListeners(props);
    }

    private buildDOM(props: LocationAutocompleteProps): HTMLElement {
        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.zIndex = '1100';

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.placeholder = props.placeholder;
        this.applyInputStyles(this.input);

        this.dropdown = document.createElement('ul');
        this.applyDropdownStyles(this.dropdown);

        container.appendChild(this.input);
        container.appendChild(this.dropdown);

        return container;
    }

    private attachListeners(props: LocationAutocompleteProps): void {
        this.input.addEventListener('input', (e) => {
            this.onInput(e, props);
        });

        this.input.addEventListener('focus', () => {
            if (this.input.value.trim()) {
                this.dropdown.style.display = 'block';
            }
        });

        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target as Node)) {
                this.dropdown.style.display = 'none';
            }
        });
    }

    private onInput(e: Event, props: LocationAutocompleteProps): void {
        const val = this.input.value.trim().toLowerCase();
        this.dropdown.innerHTML = '';

        if (!val) {
            this.dropdown.style.display = 'none';
            return;
        }

        const matches = knownLocations.filter(loc =>
            loc.name.toLowerCase().includes(val)
        );

        if (matches.length === 0) {
            this.dropdown.style.display = 'none';
            return;
        }

        matches.forEach(loc => {
            const li = document.createElement('li');
            li.textContent = loc.name;
            li.addEventListener('mousedown', () => {
                this.input.value = loc.name;
                this.dropdown.style.display = 'none';
                props.onSelect(loc);
            });
            this.dropdown.appendChild(li);
        });

        this.dropdown.style.display = 'block';
    }

    private applyInputStyles(el: HTMLInputElement): void {
        Object.assign(el.style, INPUT_STYLES);
    }

    private applyDropdownStyles(el: HTMLUListElement): void {
        Object.assign(el.style, DROPDOWN_STYLES);
    }

    getElement(): HTMLElement {
        return this.container;
    }

    getValue(): string {
        return this.input.value;
    }

    setValue(value: string): void {
        this.input.value = value;
    }
}
```

---

### **Module 5: `WalkControl.ts`**

**Purpose:** MapLibreGL control wrapper

```typescript
// WalkControl.ts
export class WalkControl implements maplibregl.IControl {
    private container: HTMLElement | null = null;
    private startAutocomplete: LocationAutocomplete;
    private endAutocomplete: LocationAutocomplete;

    constructor(private options: WalkControlOptions) {}

    onAdd(map: maplibregl.Map): HTMLElement {
        this.container = document.createElement('div');
        this.container.className = 'maplibregl-ctrl';
        Object.assign(this.container.style, CONTROL_CONTAINER_STYLES);

        // Create autocompletes
        this.startAutocomplete = new LocationAutocomplete({
            placeholder: 'Start: building or street name',
            onSelect: (loc) => {
                this.options.onStartSelect(loc.coordinates);
            }
        });

        this.endAutocomplete = new LocationAutocomplete({
            placeholder: 'Destination: building or street name',
            onSelect: (loc) => {
                this.options.onEndSelect(loc.coordinates);
            }
        });

        // Create buttons
        const startBtn = this.createButton('Start');
        const clearBtn = this.createButton('Clear');

        // Layout
        this.container.appendChild(this.startAutocomplete.getElement());
        this.container.appendChild(this.endAutocomplete.getElement());
        this.container.appendChild(startBtn);
        this.container.appendChild(clearBtn);

        return this.container;
    }

    onRemove(): void {
        if (this.container?.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }

    private createButton(label: string): HTMLElement {
        const btn = document.createElement('button');
        btn.textContent = label;
        Object.assign(btn.style, BUTTON_STYLES);
        return btn;
    }
}
```

---

### **Module 6: `Geometry.ts`**

**Purpose:** Geometric utilities

```typescript
// Geometry.ts
export const haversine = (a: [number, number], b: [number, number]): number => {
    const R = 6371000;
    const toRad = (x: number) => x * Math.PI / 180;
    const dLat = toRad(b[1] - a[1]);
    const dLon = toRad(b[0] - a[0]);
    const la1 = toRad(a[1]);
    const la2 = toRad(b[1]);
    const s = Math.sin(dLat / 2) ** 2 +
              Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
};

export const pointInRing = (
    lng: number,
    lat: number,
    ring: [number, number][]
): boolean => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        const intersect = ((yi > lat) !== (yj > lat)) &&
                         (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

export const segmentsIntersect = (
    a: [number, number],
    b: [number, number],
    c: [number, number],
    d: [number, number]
): boolean => {
    const orient = (p: [number, number], q: [number, number], r: [number, number]) => {
        const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
        return val === 0 ? 0 : val > 0 ? 1 : 2;
    };

    const o1 = orient(a, b, c);
    const o2 = orient(a, b, d);
    const o3 = orient(c, d, a);
    const o4 = orient(c, d, b);

    return (o1 !== o2 && o3 !== o4);
};
```

---

### **Module 7: Consolidated `types.ts`**

```typescript
// types.ts
export type NodeId = string;

export interface Node {
    id: NodeId;
    lng: number;
    lat: number;
    edges: Array<{ to: NodeId; w: number }>;
}

export interface VirtualNode {
    id: NodeId;
    cleanup: () => void;
}

export interface RouteResult {
    success: boolean;
    reason?: string;
    path?: [number, number][];
    distanceKm?: number;
    durationMin?: number;
}

export interface WalkControlOptions {
    onStartSelect: (coords: [number, number]) => void;
    onEndSelect: (coords: [number, number]) => void;
    onStartClick: () => void;
    onClear: () => void;
}

export interface KnownLocation {
    type: string;
    name: string;
    coordinates: [number, number];
}
```

---

### **Refactored `MapComponent.tsx`** (Core React)

```typescript
// MapComponent.tsx
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useMapInitialization } from './hooks/useMapInitialization';
import { useCampusLayers } from './hooks/useCampusLayers';
import { useWalkingRoute } from './hooks/useWalkingRoute';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { WalkControl } from './features/WalkControl/WalkControl';

export const MapComponent = forwardRef<MapComponentRef>((props, ref) => {
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);

    // Initialize map with styles
    useMapInitialization(mapContainer, (map) => {
        mapRef.current = map;
    });

    // Setup campus layers
    useCampusLayers(mapRef);

    // Setup walking route system
    const {
        findRoute,
        clearRoute,
        setStartPoint,
        setEndPoint
    } = useWalkingRoute(mapRef);

    // Setup keyboard navigation
    useKeyboardNavigation(mapRef);

    // Setup walk control UI
    useEffect(() => {
        if (!mapRef.current) return;

        const control = new WalkControl({
            onStartSelect: setStartPoint,
            onEndSelect: setEndPoint,
            onStartClick: () => {},
            onClear: clearRoute
        });

        mapRef.current.addControl(control, 'top-left');
    }, [setStartPoint, setEndPoint, clearRoute]);

    // Expose methods
    useImperativeHandle(ref, () => ({
        findRoute,
        clearRoute,
        goToMainCampus: () => mapRef.current?.easeTo({ center: CAMPUS_LOCATIONS.main }),
        goToLowerCampus: () => mapRef.current?.easeTo({ center: CAMPUS_LOCATIONS.lower })
    }));

    return (
        <div
            ref={mapContainer}
            style={{
                width: '100%',
                height: '100%',
                minHeight: '500px',
                position: 'relative'
            }}
        />
    );
});

MapComponent.displayName = 'MapComponent';
export default MapComponent;
```

---

### **Benefits of Modularization:**

| Aspect | Before | After |
|--------|--------|-------|
| **File Size** | 1,604 lines | 250-350 lines |
| **Testability** | Difficult (all mixed) | Each module testable |
| **Reusability** | WalkControl not reusable | All components reusable |
| **Maintainability** | Hard to find code | Clear file structure |
| **Type Safety** | Mixed types | Centralized types.ts |
| **Styling** | Inlined everywhere | Centralized styles.ts |
| **Debugging** | Trace through 1600 lines | Isolate to specific module |

---

### **Migration Path (Recommended):**

1. **Week 1:** Extract `Graph.ts`, `Pathfinding.ts`, `Geometry.ts` (no UI changes)
2. **Week 2:** Extract `LocationAutocomplete.ts`, test independently
3. **Week 3:** Extract `WalkControl.ts`
4. **Week 4:** Extract hooks (`useMapInitialization`, `useCampusLayers`, `useWalkingRoute`)
5. **Week 5:** Refactor main component
6. **Week 6:** Add unit & integration tests for each module

---

### **Additional Recommendations:**

1. **Add Error Boundaries** for map initialization failures
2. **Use React Query** for GeoJSON fetching (caching, retry logic)
3. **Add Storybook** for UI component testing
4. **Create constants file** for magic numbers (z-index, distances, timings)
5. **Add logging library** instead of console.log (better for production)
6. **Use CSS-in-JS** library like styled-components (better than inline styles)
7. **Add E2E tests** with Cypress for routing workflow
8. **Implement analytics** to track route usage

---

## Conclusion

`MapComponent.tsx` is a sophisticated application combining React, geographic algorithms, and geospatial data management. While functional, it would benefit significantly from modularization to improve maintainability, testability, and reusability. The recommended structure separates concerns into algorithms (Graph, Pathfinding, Geometry), UI components (LocationAutocomplete, WalkControl), and React hooks, making the codebase more scalable for future enhancements.
