# CampusNav - Campus Wayfinding & Navigation System

## Overview

**CampusNav** is an interactive web-based campus navigation and wayfinding application built for **NUST (Namibia University of Science and Technology)**. It provides students, staff, and visitors with intelligent routing, 3D building visualization, and real-time campus navigation using modern web technologies.

The system combines a **Laravel backend** with a **React/TypeScript frontend**, integrated with **MapLibre GL** for interactive mapping and an **A* pathfinding algorithm** for optimal campus walking routes.

---

## Key Features

### 🗺️ Interactive Map
- **MapLibre GL** powered interactive map with support for multiple map styles (vector, satellite, raster)
- **Satellite imagery** from Esri, OSM, or MapTiler (configurable via environment variables)
- **3D building visualization** with extrusion heights and customizable colors
- **Real-time map controls**: navigation, geolocation, fullscreen, zoom, pan, rotate
- **Keyboard shortcuts** for 3D manipulation (Shift + Arrow Keys for pitch/bearing)

### 🧭 Campus Wayfinding
- **A* Pathfinding Algorithm** for optimal walking routes between two campus locations
- **Walking graph** built from campus walkway GeoJSON data (`nust-walkways.geojson`)
- **Building avoidance** - routes intelligently avoid walking through buildings
- **Snap-to-segment projection** - starts and destinations are snapped to the nearest walkway
- **Component connectivity** - automatic bridge detection for disconnected campus areas (near gates/entrances)

### 📍 Location Management
- **Campus location database** with points of interest (gates, buildings, amenities)
- **Building labels** with name, height, color, and campus designation
- **POI markers** differentiated by type (gates, buildings)
- **Geocoding support** via Nominatim (OSM) for searching by building or street name

### 🎨 UI/UX
- **Dashboard page** with campus overview, navigation tips, and interactive map
- **Control toolbar** for quick route actions (Set Start, Set Destination, Find Route, Clear)
- **Debug overlay** showing real-time map status, container, and canvas dimensions
- **Dark mode support** via theme switching
- **Responsive design** using TailwindCSS
- **Toast notifications** for user feedback

### 🔍 Debug Features
- **Map status indicator**: Loading / Ready / Error states with error messages
- **Container and canvas dimension tracking**: helps diagnose rendering issues
- **ResizeObserver** for dynamic container size monitoring
- **Comprehensive console logging** for route computation and map events

---

## Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React 19 + TypeScript | UI components and state management |
| **Map Engine** | MapLibre GL | Interactive mapping and visualization |
| **Styling** | TailwindCSS + Radix UI | UI components and responsive design |
| **Routing** | Inertia.js | Server-side routing and data hydration |
| **Backend Framework** | Laravel 12 | API, authentication, and data persistence |
| **Build Tool** | Vite | Fast module bundling and HMR |
| **Pathfinding** | A* Algorithm (custom) | Campus walking route optimization |

### Project Structure

```
campusapp/
├── app/                          # Laravel backend application
│   ├── Http/Controllers/         # API controllers
│   ├── Models/                   # Database models
│   └── Providers/                # Service providers (Auth, Fortify)
├── config/                       # Laravel configuration files
├── database/
│   ├── migrations/               # Database schema migrations
│   └── seeders/                  # Database seeders
├── resources/
│   ├── js/
│   │   ├── app.tsx              # Main entry point (Inertia + React)
│   │   ├── components/          # React components
│   │   │   ├── MapComponent.tsx # Main map & routing engine
│   │   │   ├── DirectionsSidebar.tsx # Route details display
│   │   │   ├── app-shell.tsx    # Top-level layout wrapper
│   │   │   ├── app-content.tsx  # Content area layout
│   │   │   └── ui/              # Radix UI component library
│   │   ├── pages/               # Inertia pages (Dashboard, Settings, etc.)
│   │   ├── layouts/             # Page layouts (AppLayout)
│   │   ├── hooks/               # React hooks (useAppearance, etc.)
│   │   ├── actions/             # Server actions & API calls
│   │   ├── types/               # TypeScript type definitions
│   │   └── routes/              # Route helpers
│   ├── css/
│   │   └── app.css              # Global styles
│   └── views/
│       └── app.blade.php        # Blade template root
├── routes/
│   ├── web.php                  # Web routes (Inertia)
│   ├── console.php              # Console commands
│   └── settings.php             # Settings routes
├── public/
│   ├── data/                    # GeoJSON data files
│   │   ├── nust-campus.geojson
│   │   ├── nust-walkways.geojson
│   │   ├── nust-buildings.geojson
│   │   ├── nust-labels.geojson
│   │   └── eng-rooms.geojson
│   └── build/                   # Compiled Vite assets
├── storage/                     # File storage (cache, logs, sessions)
└── vendor/                      # Composer dependencies
```

### Data Flow

```
1. User opens Dashboard page
   ↓
2. Inertia.js loads React component tree
   ↓
3. MapComponent mounts and initializes MapLibre GL
   ↓
4. GeoJSON data loaded (buildings, POIs, walkways, labels)
   ↓
5. User clicks "Set Start" → selection mode enabled
   ↓
6. User clicks on map → coordinates snapped to nearest walkway
   ↓
7. User repeats for destination (Set Destination)
   ↓
8. User clicks "Find Route" → A* algorithm computes optimal path
   ↓
9. Route rendered on map with distance/duration popup
   ↓
10. User can "Clear" to reset or repeat
```

---

## Core Components

### 1. **MapComponent.tsx** - Central Map Engine
The heart of the application. Handles:
- **Map initialization**: MapLibre GL setup, style selection, controls
- **Data loading**: Fetches GeoJSON for campus, buildings, POIs, walkways, labels
- **Pathfinding**: A* algorithm implementation with graph building and edge pruning
- **Route computation**: Snap-to-segment projection, virtual node creation, component bridging
- **Event handling**: Click handlers for point selection, keyboard shortcuts for 3D control
- **State management**: React hooks for map status, container/canvas sizes, route display
- **Imperative API**: Methods exposed via `useImperativeHandle` for parent component control

**Key Functions:**
- `initializeMap(container)` - Creates map instance and loads all layers
- `loadWalkGraph()` - Fetches and builds the walking graph from GeoJSON
- `tryComputeRoute()` - Computes A* path between start and destination
- `ensureRouteLayer()` - Creates/manages route visualization layer
- `setStartMode()` / `setEndMode()` - Enables point selection mode

### 2. **Dashboard.tsx** - Main Dashboard Page
Displays:
- Campus overview statistics card
- Navigation tips and instructions
- Interactive map container with control buttons
- Debug overlay showing map status

**User Controls:**
- **Set Start** button → enables start point selection
- **Set Destination** button → enables destination point selection
- **Find Route** button → triggers A* pathfinding
- **Clear** button → resets selection and route

### 3. **DirectionsSidebar.tsx** - Route Details Display
Renders:
- Route summary (distance, duration)
- Step-by-step directions with turn descriptions
- Start and end point information

### 4. **AppLayout.tsx** - Main Application Layout
Provides:
- Sidebar navigation
- Breadcrumb navigation
- Main content area
- Theme switching (light/dark mode)

---

## Walking Graph & Pathfinding

### Building the Walking Graph

The walking graph is constructed from `nust-walkways.geojson`:

1. **Fetch GeoJSON** - Download local or Overpass walkway data
2. **Create nodes** - Extract coordinates from LineString geometries
3. **Create edges** - Connect adjacent nodes along walkways
4. **Densify edges** - Add intermediate nodes (5m steps) for better connectivity
5. **Fill gaps** - Connect nearby nodes within 6m (e.g., at gates)
6. **Prune edges** - Remove edges that cross through buildings (using building polygons)

### A* Pathfinding Algorithm

**Inputs:**
- Start node ID
- End node ID
- Graph (nodes + edges)

**Process:**
1. Initialize open set with start node
2. For each node, track:
   - `g`: cost from start
   - `f`: estimated total cost (g + heuristic)
   - `came_from`: parent node for path reconstruction
3. Pop lowest-f node from open set
4. If goal reached, reconstruct path and return
5. For each neighbor:
   - Calculate tentative g cost
   - If better than previous, update and add to open set
6. Repeat until goal found or open set exhausted

**Heuristic:** Haversine distance (great-circle distance on Earth)

### Snap-to-Segment Projection

When user selects a start/end point:

1. Find nearest walkway segment
2. Project point onto the segment (perpendicular projection)
3. Create temporary virtual node at projection
4. Connect virtual node to both segment endpoints
5. Use virtual node as start/end for A* algorithm
6. Clean up virtual nodes after route is computed

---

## Map Styles & Fallbacks

### Style Hierarchy

1. **MapTiler Vector** (if `VITE_MAPTILER_KEY` set)
   - High-quality vector tiles with custom styling
   - Satellite, hybrid, streets, etc.

2. **Carto Positron Vector** (fallback)
   - OSM-based vector style, no API key required
   - Clean, minimal cartography

3. **Esri Satellite Raster** (final fallback)
   - Satellite imagery tiles from ArcGIS
   - High resolution (512x512 tiles)
   - No API key required

4. **OSM Raster** (emergency fallback)
   - OpenStreetMap raster tiles
   - Simple 256x256 tiles
   - Always available

### Style Configuration

```typescript
// In MapComponent.tsx - initializeMap()
const mapTilerKey = import.meta.env.VITE_MAPTILER_KEY;
const mapTilerStyle = mapTilerKey
  ? `https://api.maptiler.com/maps/{style}/style.json?key=${mapTilerKey}`
  : null;

// Priority: MapTiler → Carto → Esri → OSM
const style = mapTilerStyle || cartoStyleUrl || satelliteStyle;
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Laravel App
APP_NAME="CampusNav"
APP_ENV=local
APP_DEBUG=true
APP_KEY=base64:...

# Database
DB_CONNECTION=sqlite
DB_DATABASE=database.sqlite

# Map Styling (optional)
VITE_MAPTILER_KEY=your-maplibre-key-here
VITE_MAPTILER_STYLE=hybrid

# App URL
APP_URL=http://localhost:8000
```

### Optional: MapTiler Setup

1. Get API key from [MapTiler Cloud](https://cloud.maptiler.com)
2. Add to `.env`:
   ```env
   VITE_MAPTILER_KEY=abc123def456...
   VITE_MAPTILER_STYLE=hybrid  # or: satellite, streets-v2, outdoor, etc.
   ```

---

## GeoJSON Data Files

Located in `public/data/`:

### `nust-campus.geojson`
- Campus boundary polygon(s)
- Used for map extent and masking outside areas

### `nust-walkways.geojson`
- LineString features representing walkable paths
- Used to build the walking graph for pathfinding

### `nust-buildings.geojson`
- Polygon features representing building footprints
- Used to:
  - Create 3D extruded building layer
  - Prune edges that cross through buildings
  - Provide building information

### `nust-labels.geojson`
- Point features with building/POI names and metadata
- Used for:
  - Map labels (symbol layer)
  - Geocoding/search (local label matching)
  - Building identification

### `eng-rooms.geojson`
- Room-level data (future use)
- Can be used for indoor navigation

---

## Installation & Setup

### Prerequisites

- PHP 8.2+
- Node.js 18+
- SQLite or MySQL
- Composer
- npm or yarn

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Chxqihermit/CampusNav.git
cd campusapp

# 2. Install dependencies
composer install
npm install

# 3. Setup environment
cp .env.example .env
php artisan key:generate

# 4. Migrate database
php artisan migrate

# 5. Build frontend
npm run build

# 6. Start development servers
# Terminal 1: PHP backend
php artisan serve

# Terminal 2: Vite dev server
npm run dev
```

### Access the Application

- **Dashboard**: http://localhost:8000
- **Map**: Accessible from Dashboard

---

## Usage Guide

### Finding a Route

1. **Set Start Point**
   - Click "Set Start" button
   - Click on map location or enter building name
   - Start marker (green circle) appears

2. **Set Destination**
   - Click "Set Destination" button
   - Click on map location or enter building name
   - End marker (red circle) appears

3. **Find Route**
   - Click "Find Route" button
   - A* algorithm computes optimal path
   - Blue line shows walking route
   - Popup shows distance and estimated duration
   - Map auto-fits to route bounds

4. **Clear**
   - Click "Clear" to reset selection and route
   - Start/end markers disappear
   - Route line disappears

### Keyboard Controls

- **Shift + ↑** - Increase 3D pitch (tilt view)
- **Shift + ↓** - Decrease 3D pitch
- **Shift + ←** - Rotate view counterclockwise
- **Shift + →** - Rotate view clockwise
- **Right-click** - Reset view to campus center

### Map Interactions

- **Drag** - Pan the map
- **Scroll** - Zoom in/out
- **Double-click** - Zoom in at location
- **Pinch (mobile)** - Zoom in/out
- **Two-finger drag** - Rotate/tilt

---

## Troubleshooting

### Map Not Showing

1. **Check WebGL support**: Open browser console, look for "WebGL is not available"
   - Solution: Use a modern browser (Chrome, Firefox, Safari, Edge)

2. **Check container size**: Look at debug overlay - Canvas should show non-zero dimensions
   - Solution: Ensure parent container has explicit height

3. **Check map style**: Look for CORS or 403 errors in Network tab
   - Solution: Add VITE_MAPTILER_KEY or let it fallback to Carto/OSM

4. **Check tile loading**: Network tab should show requests to tile servers
   - Solution: Check internet connection, try alternate map style

### Routes Not Computing

1. **Graph not loaded**: Check console for "Graph nodes: 0"
   - Solution: Ensure `nust-walkways.geojson` exists in `public/data/`

2. **No path found**: Check if start/end are on disconnected walkway sections
   - Solution: Move start/end points closer to main walkways, check gate connectivity

3. **Selection mode not working**: Try clicking "Set Start" button first
   - Solution: Ensure you see "Start" button highlighted in green before clicking map

### Performance Issues

1. **Slow A* computation**: Large graph or long distances
   - Solution: Pre-compute common routes, cache results

2. **Lag when panning**: Heavy layer rendering
   - Solution: Reduce number of visible POIs, disable 3D buildings when not needed

### Build/Compilation Errors

```bash
# Clear cache and rebuild
rm -rf node_modules
npm install
npm run build

# Or rebuild Laravel
composer install
php artisan config:clear
php artisan cache:clear
```

---

## Development

### Project Commands

```bash
# Development
npm run dev              # Start Vite dev server
php artisan serve       # Start Laravel server

# Building
npm run build           # Production build
npm run build:ssr       # SSR build (if applicable)

# Code Quality
npm run lint            # Run ESLint with auto-fix
npm run format          # Format with Prettier
npm run format:check    # Check formatting
npm run types           # TypeScript type check

# Database
php artisan migrate     # Run migrations
php artisan seed        # Run seeders
php artisan tinker      # Interactive shell
```

### Adding New Features

1. **New Map Layer**
   - Add GeoJSON to `public/data/`
   - Load in `MapComponent.tsx` `onLoad` handler
   - Add layer styling and event handlers

2. **New Route Algorithm**
   - Implement in `MapComponent.tsx` inside load handler
   - Follow A* pattern: graph building → pathfinding → result handling

3. **New Dashboard Card**
   - Create React component in `resources/js/components/`
   - Import and render in `Dashboard.tsx`
   - Style with TailwindCSS

4. **New API Endpoint**
   - Create controller in `app/Http/Controllers/`
   - Define route in `routes/web.php`
   - Call from React via Inertia action or fetch

---

## Performance Optimization

- **Tile Caching**: Browser caches map tiles automatically
- **Graph Caching**: Walking graph built once on map load, reused
- **Route Caching**: Consider pre-computing common routes
- **Lazy Loading**: POIs and buildings loaded only when visible
- **Vector Optimization**: Use proper zoom levels for layer visibility

---

## Security Considerations

- **API Keys**: Keep `VITE_MAPTILER_KEY` secure, use environment variables
- **Input Validation**: Sanitize user-provided location names before geocoding
- **CORS**: Ensure tile servers allow your domain
- **Authentication**: Use Laravel Fortify for user authentication
- **Authorization**: Implement role-based access if needed (admin, student, staff)

---

## Future Enhancements

- **Indoor Navigation**: Use `eng-rooms.geojson` for room-level routing
- **Real-time Updates**: WebSocket integration for live campus events
- **User Preferences**: Save favorite locations, preferred routes
- **Mobile App**: React Native version for iOS/Android
- **Analytics**: Track popular routes, peak times
- **Accessibility**: Screen reader support, keyboard navigation improvements
- **Multi-language**: i18n support for different languages
- **Offline Mode**: Service worker for offline campus map access

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Support & Contact

For issues, feature requests, or questions:
- Open an issue on GitHub
- Contact: [Your Contact Info]
- Documentation: See `/docs` folder

---

## Acknowledgments

- **MapLibre GL** - Open-source mapping library
- **React** - UI framework
- **Laravel** - Backend framework
- **NUST** - Namibia University of Science and Technology
- **OpenStreetMap** - Geographic data

---

**Last Updated:** November 2025
**Version:** 1.0.0
