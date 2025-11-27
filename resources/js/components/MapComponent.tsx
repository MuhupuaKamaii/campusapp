// resources/js/Components/MapComponent.jsx
import React, { useRef, useEffect, JSX, useState, useImperativeHandle, forwardRef } from 'react';
import maplibregl, { Map, NavigationControl, GeolocateControl, FullscreenControl, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css'; // Import Maplibre CSS for map components

// Define campus locations (centered on the actual NUST Windhoek West blocks)
export const CAMPUS_LOCATIONS = {
    // Upper campus quad (between Austin Rd & Brahms Ave)
    main: [17.08265, -22.56085] as [number, number],
    // Lower campus engineering cluster (Pasteur St side)
    lower: [17.0786, -22.56485] as [number, number],
};

export interface MapComponentRef {
    findRoute: () => void;
    clearRoute: () => void;
    goToMainCampus: () => void;
    goToLowerCampus: () => void;
}

const MapComponent = forwardRef<MapComponentRef>((props, ref) => {
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const map = useRef<Map | null>(null);
    const keyHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);
    const routeSourceRef = useRef<string | null>(null);
    // Walking route UI state (click-to-set inside campus)
    const walkSelectingRef = useRef<'start' | 'end' | null>(null);
    const walkStartRef = useRef<[number, number] | null>(null);
    const walkEndRef = useRef<[number, number] | null>(null);
    const [routeActive, setRouteActive] = useState(false);

    useEffect(() => {
        if (map.current) return;

        if (mapContainer.current) {
            const container = mapContainer.current;
            if (container.offsetWidth === 0 || container.offsetHeight === 0) {
                requestAnimationFrame(() => {
                    if (container && !map.current) {
                        initializeMap(container);
                    }
                });
            } else {
                initializeMap(container);
            }
        }

        function initializeMap(container: HTMLDivElement) {
            const nustCenter: [number, number] = CAMPUS_LOCATIONS.main;

            // Use reliable Esri satellite imagery with high resolution
            const satelliteStyle: maplibregl.StyleSpecification = {
                version: 8 as const,
                sources: {
                    'satellite': {
                        type: 'raster',
                        tiles: [
                            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                        ],
                        tileSize: 512,
                        attribution: '© Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
                    },
                    'labels': {
                        type: 'raster',
                        tiles: [
                            'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
                        ],
                        tileSize: 512,
                        attribution: '© Esri'
                    }
                },
                layers: [
                    {
                        id: 'satellite-layer',
                        type: 'raster',
                        source: 'satellite',
                        minzoom: 0,
                        maxzoom: 20
                    },
                    {
                        id: 'labels-layer',
                        type: 'raster',
                        source: 'labels',
                        minzoom: 0,
                        maxzoom: 20
                    }
                ],
                glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
            };

            // Prefer MapTiler/Mapbox vector style if API key is configured, otherwise use Esri satellite raster style
            const mapTilerKey = (import.meta as any).env?.VITE_MAPTILER_KEY;
            // Allow an optional style name via VITE_MAPTILER_STYLE (e.g. 'hybrid', 'satellite', 'streets-v2')
            const mapTilerStyleName = (import.meta as any).env?.VITE_MAPTILER_STYLE || 'hybrid';
            const mapTilerStyleUrl = mapTilerKey
                ? `https://api.maptiler.com/maps/${mapTilerStyleName}/style.json?key=${mapTilerKey}`
                : null;

            // Carto Positron vector style (no key) – reliable OSM-like streets
            const cartoStyleUrl = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

            // Reliable OSM raster style (no API key needed) as secondary fallback
            const osmRasterStyle: maplibregl.StyleSpecification = {
                version: 8 as const,
                sources: {
                    osm: {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: '© OpenStreetMap contributors'
                    }
                },
                layers: [
                    { id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }
                ],
                glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
            };

            map.current = new maplibregl.Map({
                container: container,
                style: mapTilerStyleUrl || cartoStyleUrl || osmRasterStyle,
                center: nustCenter,
                zoom: 16.5,
                pitch: 0,
                bearing: 0,
                minZoom: 10,
                maxZoom: 20,
                pixelRatio: window.devicePixelRatio || 2,
                dragRotate: true,
                touchZoomRotate: true,
                keyboard: true,
                doubleClickZoom: true,
                scrollZoom: true,
                renderWorldCopies: true,
            });

            map.current.on('error', (e) => {
                console.error('Map error:', e);
            });

            map.current.on('styledata', () => {
                console.log('Map style loaded successfully');
            });

            // Add navigation controls
            const nav = new maplibregl.NavigationControl({
                showCompass: true,
                showZoom: true,
                visualizePitch: true,
            });
            map.current.addControl(nav, 'top-right');

            const geolocate = new maplibregl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true,
                },
                trackUserLocation: true,
            });
            map.current.addControl(geolocate, 'top-right');

            map.current.addControl(new maplibregl.FullscreenControl(), 'top-right');

            map.current.on('load', () => {
                console.log('Map loaded and ready');
                setTimeout(() => {
                    if (map.current) {
                        map.current.resize();
                    }
                }, 100);

                // Cache for campus rings and labels
                let campusRings: number[][][] = [];
                let labelsCache: any = null;
                let routePopup: maplibregl.Popup | null = null;
                const pointInPolygon = (lng: number, lat: number, rings: number[][][]) => {
                    // Ray casting on outer ring(s); consider inside if inside any ring
                    const insideRing = (ring: number[][]) => {
                        let inside = false;
                        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                            const xi = ring[i][0], yi = ring[i][1];
                            const xj = ring[j][0], yj = ring[j][1];
                            const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi);
                            if (intersect) inside = !inside;
                        }
                        return inside;
                    };
                    for (const ring of rings) if (insideRing(ring)) return true;
                    return false;
                };

                try {
                    const campusMap = map.current;
                    if (campusMap && !campusMap.getSource('nust-campus')) {
                        campusMap.addSource('nust-campus', { type: 'geojson', data: '/data/nust-campus.geojson' } as any);
                        // Fit map to the campus polygon bounds so user sees only the premises clearly
                        fetch('/data/nust-campus.geojson')
                            .then(r => r.json())
                            .then((gj) => {
                                if (!map.current) return;
                                const bounds = new maplibregl.LngLatBounds();
                                const addCoords = (coords: any) => {
                                    if (!coords) return;
                                    if (typeof coords[0] === 'number') {
                                        bounds.extend(coords as [number, number]);
                                    } else {
                                        coords.forEach(addCoords);
                                    }
                                };
                                (gj.features || []).forEach((f: any) => addCoords(f.geometry?.coordinates));
                                // cache rings for pointInPolygon (support Polygon and MultiPolygon outer rings)
                                try {
                                    campusRings = [];
                                    for (const f of (gj.features || [])) {
                                        const g = f.geometry; if (!g) continue;
                                        if (g.type === 'Polygon' && g.coordinates?.[0]) campusRings.push(g.coordinates[0]);
                                        if (g.type === 'MultiPolygon') for (const poly of g.coordinates || []) if (poly?.[0]) campusRings.push(poly[0]);
                                    }
                                } catch {}
                                if (!bounds.isEmpty()) {
                                    map.current!.fitBounds(bounds, { padding: 40, duration: 700 });
                                    // Limit the map to NUST plus a small surrounding buffer (~150m)
                                    const padLng = 0.0015; // ~150m
                                    const padLat = 0.0015; // ~150m
                                    const sw0 = bounds.getSouthWest();
                                    const ne0 = bounds.getNorthEast();
                                    const paddedSW = [sw0.lng - padLng, sw0.lat - padLat] as [number, number];
                                    const paddedNE = [ne0.lng + padLng, ne0.lat + padLat] as [number, number];
                                    const paddedBounds = new maplibregl.LngLatBounds(paddedSW, paddedNE);
                                    map.current!.setMaxBounds(paddedBounds);
                                }

                                // Build fade masks: near (dim) and far (opaque) with correct bounds
                                try {
                                    const features = (gj.features || []).filter((f: any) => f.geometry);
                                    const worldRing = [
                                        [-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]
                                    ];
                                    const holes: any[] = [];
                                    for (const f of features) {
                                        if (f.geometry.type === 'Polygon') {
                                            const ring = f.geometry.coordinates?.[0];
                                            if (ring) holes.push(ring);
                                        } else if (f.geometry.type === 'MultiPolygon') {
                                            (f.geometry.coordinates || []).forEach((poly: any) => {
                                                if (poly && poly[0]) holes.push(poly[0]);
                                            });
                                        }
                                    }
                                    if (holes.length) {
                                        // Near dim: everything outside campus is softly dimmed
                                        const nearMask = {
                                            type: 'FeatureCollection',
                                            features: [
                                                { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [worldRing, ...holes] } }
                                            ]
                                        } as any;
                                        if (!map.current!.getSource('outside-mask-near')) {
                                            map.current!.addSource('outside-mask-near', { type: 'geojson', data: nearMask } as any);
                                            map.current!.addLayer({ id: 'outside-mask-near', type: 'fill', source: 'outside-mask-near', paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.4 } } as any);
                                        } else {
                                            (map.current!.getSource('outside-mask-near') as any).setData(nearMask);
                                        }

                                        // Far white: hide everything outside a small padded rectangle around campus (~100m)
                                        const padLngFar = 0.001; // ~100m
                                        const padLatFar = 0.001; // ~100m
                                        const sw = bounds.getSouthWest();
                                        const ne = bounds.getNorthEast();
                                        const rect = [
                                            [sw.lng - padLngFar, sw.lat - padLatFar],
                                            [ne.lng + padLngFar, sw.lat - padLatFar],
                                            [ne.lng + padLngFar, ne.lat + padLatFar],
                                            [sw.lng - padLngFar, ne.lat + padLatFar],
                                            [sw.lng - padLngFar, sw.lat - padLatFar]
                                        ];
                                        const farMask = {
                                            type: 'FeatureCollection',
                                            features: [
                                                { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [worldRing, rect] } }
                                            ]
                                        } as any;
                                        if (!map.current!.getSource('outside-mask-far')) {
                                            map.current!.addSource('outside-mask-far', { type: 'geojson', data: farMask } as any);
                                            map.current!.addLayer({ id: 'outside-mask-far', type: 'fill', source: 'outside-mask-far', paint: { 'fill-color': '#ffffff', 'fill-opacity': 1 } } as any);
                                        } else {
                                            (map.current!.getSource('outside-mask-far') as any).setData(farMask);
                                        }

                                        // Ensure nothing covers labels inside campus
                                        if (map.current!.getLayer('nust-campus-fill-bright')) {
                                            map.current!.removeLayer('nust-campus-fill-bright');
                                        }
                                    }
                                } catch (err) {
                                    console.warn('mask build failed', err);
                                }
                            })
                            .catch(() => {});
                    }
                } catch (e) {
                    console.warn('nust-campus source not available', e);
                }

                // Load campus labels (buildings, gates, amenities) from local GeoJSON
                try {
                    fetch('/data/nust-labels.geojson')
                        .then(r => r.ok ? r.json() : Promise.reject(new Error('labels 404')))
                        .then((labels) => {
                            try {
                                labelsCache = labels;
                                if (!map.current!.getSource('nust-labels')) {
                                    map.current!.addSource('nust-labels', { type: 'geojson', data: labels } as any);
                                } else {
                                    (map.current!.getSource('nust-labels') as any).setData(labels);
                                }
                                if (!map.current!.getLayer('nust-labels')) {
                                    map.current!.addLayer({
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
                                    } as any);
                                }
                            } catch (e) { console.warn('labels layer add failed', e); }
                        })
                        .catch(() => {});
                } catch {}

                // Add keyboard controls
                const handleKeyPress = (e: KeyboardEvent) => {
                    if (!map.current || !e.shiftKey) return;
                    const currentPitch = map.current.getPitch();
                    const currentBearing = map.current.getBearing();
                    switch(e.key) {
                        case 'ArrowUp':
                            e.preventDefault();
                            map.current.easeTo({ pitch: Math.min(currentPitch + 5, 60), duration: 300 });
                            break;
                        case 'ArrowDown':
                            e.preventDefault();
                            map.current.easeTo({ pitch: Math.max(currentPitch - 5, 0), duration: 300 });
                            break;
                        case 'ArrowLeft':
                            e.preventDefault();
                            map.current.easeTo({ bearing: currentBearing - 15, duration: 300 });
                            break;
                        case 'ArrowRight':
                            e.preventDefault();
                            map.current.easeTo({ bearing: currentBearing + 15, duration: 300 });
                            break;
                    }
                };
                keyHandlerRef.current = handleKeyPress;
                window.addEventListener('keydown', handleKeyPress);


                // Simple walking route UI: Set Start/Set Destination/Clear using OSRM walking
                try {
                    let selecting: 'start' | 'end' | null = null;
                    let startPt: [number, number] | null = null;
                    let endPt: [number, number] | null = null;
                    // Walking graph (nodes/edges) for A*
                    type NodeId = string;
                    type Node = { id: NodeId; lng: number; lat: number; edges: Array<{ to: NodeId; w: number }> };
                    const graph: { nodes: Record<NodeId, Node> } = { nodes: {} };
                    let graphReady = false;

                    const hav = (a: [number, number], b: [number, number]) => {
                        const R = 6371000;
                        const toRad = (x: number) => x * Math.PI / 180;
                        const dLat = toRad(b[1] - a[1]);
                        const dLon = toRad(b[0] - a[0]);
                        const la1 = toRad(a[1]);
                        const la2 = toRad(b[1]);
                        const s = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
                        return 2 * R * Math.asin(Math.sqrt(s));
                    };
                    const nid = (lng: number, lat: number) => `${lng.toFixed(6)},${lat.toFixed(6)}` as NodeId;
                    const ensureNode = (lng: number, lat: number) => {
                        const id = nid(lng, lat);
                        if (!graph.nodes[id]) graph.nodes[id] = { id, lng, lat, edges: [] };
                        return graph.nodes[id];
                    };
                    const addEdge = (a: Node, b: Node) => {
                        const w = hav([a.lng, a.lat], [b.lng, b.lat]);
                        a.edges.push({ to: b.id, w });
                        b.edges.push({ to: a.id, w });
                    };
                    const buildGraphFromGeoJSON = (gj: any) => {
                        const addDensified = (lng1: number, lat1: number, lng2: number, lat2: number) => {
                            const n1 = ensureNode(lng1, lat1);
                            const n2 = ensureNode(lng2, lat2);
                            const dist = hav([lng1, lat1], [lng2, lat2]);
                            const step = 5; // meters (more vertices improves connectivity at crossings)
                            if (dist <= step) { addEdge(n1, n2); return; }
                            const parts = Math.ceil(dist / step);
                            let prev = n1;
                            for (let i = 1; i < parts; i++) {
                                const t = i / parts;
                                const lng = lng1 + (lng2 - lng1) * t;
                                const lat = lat1 + (lat2 - lat1) * t;
                                const mid = ensureNode(lng, lat);
                                addEdge(prev, mid);
                                prev = mid;
                            }
                            addEdge(prev, n2);
                        };
                        for (const f of (gj.features || [])) {
                            if (!f.geometry) continue;
                            if (f.geometry.type === 'LineString') {
                                const coords = f.geometry.coordinates as [number, number][];
                                for (let i = 0; i < coords.length - 1; i++) {
                                    const [lng1, lat1] = coords[i];
                                    const [lng2, lat2] = coords[i + 1];
                                    addDensified(lng1, lat1, lng2, lat2);
                                }
                            } else if (f.geometry.type === 'MultiLineString') {
                                for (const line of f.geometry.coordinates as [number, number][][]) {
                                    for (let i = 0; i < line.length - 1; i++) {
                                        const [lng1, lat1] = line[i];
                                        const [lng2, lat2] = line[i + 1];
                                        addDensified(lng1, lat1, lng2, lat2);
                                    }
                                }
                            }
                        }
                        // Bridge tiny gaps between segment endpoints (e.g., unmapped gates) by connecting nodes within ~6 meters (safer)
                        try {
                            const centerLat = -22.5710;
                            const mPerDegLat = 111320;
                            const mPerDegLng = Math.cos((centerLat * Math.PI) / 180) * 111320;
                            const bucketM = 6; // meters
                            const dLng = bucketM / mPerDegLng;
                            const dLat = bucketM / mPerDegLat;
                            const buckets: Record<string, string[]> = {};
                            const ids = Object.keys(graph.nodes);
                            for (const id of ids) {
                                const n = graph.nodes[id];
                                const bx = Math.round(n.lng / dLng);
                                const by = Math.round(n.lat / dLat);
                                const key = bx + ':' + by;
                                (buckets[key] ||= []).push(id);
                            }
                            const seenPair = new Set<string>();
                            const neigh = [-1, 0, 1];
                            for (const id of ids) {
                                const a = graph.nodes[id];
                                const bx = Math.round(a.lng / dLng);
                                const by = Math.round(a.lat / dLat);
                                for (const dx of neigh) for (const dy of neigh) {
                                    const list = buckets[(bx + dx) + ':' + (by + dy)] || [];
                                    for (const oid of list) {
                                        if (oid === id) continue;
                                        const b = graph.nodes[oid];
                                        const dist = hav([a.lng, a.lat], [b.lng, b.lat]);
                                        if (dist > bucketM) continue;
                                        const k = id < oid ? id + '|' + oid : oid + '|' + id;
                                        if (seenPair.has(k)) continue;
                                        seenPair.add(k);
                                        // Avoid duplicating existing immediate edges
                                        const has = a.edges.some(e => e.to === b.id) || b.edges.some(e => e.to === a.id);
                                        if (!has) { addEdge(a, b); }
                                    }
                                }
                            }
                        } catch {}
                        graphReady = Object.keys(graph.nodes).length > 0;
                    };
                    // Geometry helpers for building avoidance
                    const segsIntersect = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) => {
                        const orient = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
                        const o1 = orient(ax, ay, bx, by, cx, cy);
                        const o2 = orient(ax, ay, bx, by, dx, dy);
                        const o3 = orient(cx, cy, dx, dy, ax, ay);
                        const o4 = orient(cx, cy, dx, dy, bx, by);
                        if (o1 === 0 && o2 === 0 && o3 === 0 && o4 === 0) return false; // colinear treat as non-blocking
                        return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
                    };
                    const pointInRing = (lng: number, lat: number, ring: number[][]) => {
                        let inside = false;
                        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                            const xi = ring[i][0], yi = ring[i][1];
                            const xj = ring[j][0], yj = ring[j][1];
                            const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi);
                            if (intersect) inside = !inside;
                        }
                        return inside;
                    };
                    const pruneEdgesAgainstBuildings = (rings: number[][][]) => {
                        if (!rings.length) return;
                        const nodeIds = Object.keys(graph.nodes);
                        const seen = new Set<string>();
                        for (const id of nodeIds) {
                            const a = graph.nodes[id];
                            a.edges = a.edges.filter(e => {
                                const b = graph.nodes[e.to];
                                if (!b) return false;
                                const key = id < b.id ? id + '|' + b.id : b.id + '|' + id;
                                if (seen.has(key)) return true;
                                let blocked = false;
                                for (const ring of rings) {
                                    // quick bbox reject
                                    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
                                    for (const p of ring) { if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; }
                                    if ((a.lng < minx && b.lng < minx) || (a.lng > maxx && b.lng > maxx) || (a.lat < miny && b.lat < miny) || (a.lat > maxy && b.lat > maxy)) {
                                        continue;
                                    }
                                    // if either endpoint inside building, block
                                    if (pointInRing(a.lng, a.lat, ring) || pointInRing(b.lng, b.lat, ring)) { blocked = true; break; }
                                    // check segment intersection with polygon edges
                                    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                                        const c = ring[j], d = ring[i];
                                        if (segsIntersect(a.lng, a.lat, b.lng, b.lat, c[0], c[1], d[0], d[1])) { blocked = true; break; }
                                    }
                                    if (blocked) break;
                                }
                                if (blocked) {
                                    // also remove reverse edge
                                    const nb = graph.nodes[e.to];
                                    if (nb) nb.edges = nb.edges.filter(ed => ed.to !== id);
                                }
                                seen.add(key);
                                return !blocked;
                            });
                        }
                    };
                    const loadWalkGraph = async () => {
                        if (graphReady) return;
                        try {
                            const local = await fetch('/data/nust-walkways.geojson');
                            if (local.ok) {
                                const j = await local.json();
                                buildGraphFromGeoJSON(j);
                                // add a thin visualization layer for walkways
                                try {
                                    if (!map.current!.getSource('walkways')) {
                                        map.current!.addSource('walkways', { type: 'geojson', data: j } as any);
                                    } else {
                                        (map.current!.getSource('walkways') as any).setData(j);
                                    }
                                    if (!map.current!.getLayer('walkways')) {
                                        map.current!.addLayer({ id: 'walkways', type: 'line', source: 'walkways', paint: { 'line-color': '#9CA3AF', 'line-width': 1.5, 'line-opacity': 0.7 } } as any);
                                    }
                                } catch {}
                                try {
                                    const bld = await fetch('/data/nust-buildings.geojson');
                                    if (bld.ok) {
                                        const bj = await bld.json();
                                        const rings: number[][][] = [];
                                        for (const f of (bj.features || [])) {
                                            const g = f.geometry; if (!g) continue;
                                            if (g.type === 'Polygon' && g.coordinates?.[0]) rings.push(g.coordinates[0]);
                                            if (g.type === 'MultiPolygon') for (const poly of g.coordinates || []) if (poly?.[0]) rings.push(poly[0]);
                                        }
                                        pruneEdgesAgainstBuildings(rings);
                                    }
                                } catch {}
                                graphReady = Object.keys(graph.nodes).length > 0;
                                if (graphReady) return;
                            }
                        } catch {}
                        // fallback: fetch from Overpass within current bounds
                        try {
                            const b = map.current!.getBounds();
                            const s = b.getSouth(), w = b.getWest(), n = b.getNorth(), e = b.getEast();
                            const q = `data=[out:json][timeout:25];(way["highway"~"footway|path|pedestrian|steps|living_street|service"](${s},${w},${n},${e});>;);out;`;
                            const resp = await fetch(`https://overpass-api.de/api/interpreter?${new URLSearchParams({ data: q }).toString()}`);
                            const j = await resp.json();
                            // convert Overpass JSON to GeoJSON LineStrings
                            const nodes: Record<string, any> = {};
                            for (const el of j.elements) if (el.type === 'node') nodes[el.id] = [el.lon, el.lat];
                            const features: any[] = [];
                            for (const el of j.elements) if (el.type === 'way' && el.nodes?.length > 1) {
                                const coords = el.nodes.map((id: any) => nodes[id]).filter(Boolean);
                                if (coords.length > 1) features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
                            }
                            const gj = { type: 'FeatureCollection', features } as any;
                            buildGraphFromGeoJSON(gj);
                            // add visualization layer
                            try {
                                if (!map.current!.getSource('walkways')) {
                                    map.current!.addSource('walkways', { type: 'geojson', data: gj } as any);
                                } else {
                                    (map.current!.getSource('walkways') as any).setData(gj);
                                }
                                if (!map.current!.getLayer('walkways')) {
                                    map.current!.addLayer({ id: 'walkways', type: 'line', source: 'walkways', paint: { 'line-color': '#9CA3AF', 'line-width': 1.5, 'line-opacity': 0.7 } } as any);
                                }
                            } catch {}
                            // prune edges against buildings if dataset present
                            try {
                                const bld = await fetch('/data/nust-buildings.geojson');
                                if (bld.ok) {
                                    const bj = await bld.json();
                                    const rings: number[][][] = [];
                                    for (const f of (bj.features || [])) {
                                        const g = f.geometry; if (!g) continue;
                                        if (g.type === 'Polygon' && g.coordinates?.[0]) rings.push(g.coordinates[0]);
                                        if (g.type === 'MultiPolygon') for (const poly of g.coordinates || []) if (poly?.[0]) rings.push(poly[0]);
                                    }
                                    pruneEdgesAgainstBuildings(rings);
                                }
                            } catch {}
                            graphReady = Object.keys(graph.nodes).length > 0;
                        } catch {}
                    };
                    const nearestNodeId = (lng: number, lat: number) => {
                        let best: { id: NodeId; d: number } | null = null;
                        for (const n of Object.values(graph.nodes)) {
                            const d = hav([lng, lat], [n.lng, n.lat]);
                            if (!best || d < best.d) best = { id: n.id, d };
                        }
                        return best?.id || null;
                    };
                    // Find nearest segment on the graph and project the point onto it
                    const projectToNearestSegment = (lng: number, lat: number) => {
                        const toMeters = (xLng: number, xLat: number) => {
                            const mPerDegLat = 111320;
                            const mPerDegLng = Math.cos((lat * Math.PI) / 180) * 111320;
                            return { x: xLng * mPerDegLng, y: xLat * mPerDegLat };
                        };
                        let best: null | { a: Node; b: Node; px: number; py: number; t: number; distM: number } = null;
                        const visited = new Set<string>();
                        for (const a of Object.values(graph.nodes)) {
                            for (const e of a.edges) {
                                const b = graph.nodes[e.to]; if (!b) continue;
                                const key = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
                                if (visited.has(key)) continue; visited.add(key);
                                const P = toMeters(lng, lat);
                                const A = toMeters(a.lng, a.lat);
                                const B = toMeters(b.lng, b.lat);
                                const ABx = B.x - A.x, ABy = B.y - A.y;
                                const APx = P.x - A.x, APy = P.y - A.y;
                                const ab2 = ABx * ABx + ABy * ABy; if (!ab2) continue;
                                let t = (APx * ABx + APy * ABy) / ab2; // projection factor
                                if (t < 0) t = 0; if (t > 1) t = 1;
                                const Qx = A.x + t * ABx, Qy = A.y + t * ABy;
                                const dx = P.x - Qx, dy = P.y - Qy;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (!best || dist < best.distM) {
                                    // convert back to lng/lat
                                    const mPerDegLat = 111320;
                                    const mPerDegLng = Math.cos((lat * Math.PI) / 180) * 111320;
                                    const qLng = Qx / mPerDegLng;
                                    const qLat = Qy / mPerDegLat;
                                    best = { a, b, px: qLng, py: qLat, t, distM: dist };
                                }
                            }
                        }
                        return best;
                    };
                    // Expose a helper for debug overlay
                    const snapInfoFor = (lng: number, lat: number) => projectToNearestSegment(lng, lat);
                    // Create a temporary virtual node connected to the nearest segment for better snapping
                    const addVirtualNodeOnNearestSegment = (lng: number, lat: number) => {
                        const seg = projectToNearestSegment(lng, lat);
                        if (!seg) return { id: nearestNodeId(lng, lat), cleanup: () => {} };
                        const id: NodeId = (`virt:${seg.px.toFixed(7)},${seg.py.toFixed(7)}`);
                        if (!graph.nodes[id]) graph.nodes[id] = { id, lng: seg.px, lat: seg.py, edges: [] };
                        const v = graph.nodes[id];
                        const a = seg.a, b = seg.b;
                        const wa = hav([v.lng, v.lat], [a.lng, a.lat]);
                        const wb = hav([v.lng, v.lat], [b.lng, b.lat]);
                        a.edges.push({ to: v.id, w: wa });
                        b.edges.push({ to: v.id, w: wb });
                        v.edges.push({ to: a.id, w: wa });
                        v.edges.push({ to: b.id, w: wb });
                        const cleanup = () => {
                            // remove edges pointing to v from a and b
                            a.edges = a.edges.filter((ed) => ed.to !== v.id);
                            b.edges = b.edges.filter((ed) => ed.to !== v.id);
                            // remove v
                            delete graph.nodes[v.id];
                        };
                        return { id: v.id, cleanup };
                    };
                    const astar = (start: NodeId, goal: NodeId): NodeId[] | null => {
                        const open = new Set<NodeId>([start]);
                        const came: Record<NodeId, NodeId> = {};
                        const g: Record<NodeId, number> = { [start]: 0 };
                        const h0 = hav([graph.nodes[start].lng, graph.nodes[start].lat], [graph.nodes[goal].lng, graph.nodes[goal].lat]);
                        const fScore: Record<NodeId, number> = { [start]: h0 };
                        const popBest = () => {
                            let bestId: NodeId | null = null, bestF = Infinity;
                            for (const id of open) { const val = fScore[id] ?? Infinity; if (val < bestF) { bestF = val; bestId = id; } }
                            if (bestId) open.delete(bestId);
                            return bestId;
                        };
                        while (open.size) {
                            const current = popBest(); if (!current) break;
                            if (current === goal) {
                                const path: NodeId[] = [current];
                                while (came[path[path.length - 1]]) path.push(came[path[path.length - 1]]);
                                return path.reverse();
                            }
                            const ncur = graph.nodes[current];
                            for (const e of ncur.edges) {
                                const tent = (g[current] ?? Infinity) + e.w;
                                if (tent < (g[e.to] ?? Infinity)) {
                                    came[e.to] = current;
                                    g[e.to] = tent;
                                    const ng = graph.nodes[e.to];
                                    fScore[e.to] = tent + hav([ng.lng, ng.lat], [graph.nodes[goal].lng, graph.nodes[goal].lat]);
                                    open.add(e.to);
                                }
                            }
                        }
                        return null;
                    };
                    const componentOf = (seed: NodeId) => {
                        const seen = new Set<NodeId>();
                        const q: NodeId[] = [seed]; seen.add(seed);
                        while (q.length) {
                            const cur = q.shift()!;
                            for (const e of graph.nodes[cur].edges) {
                                if (!seen.has(e.to)) { seen.add(e.to); q.push(e.to); }
                            }
                        }
                        return seen;
                    };
                    const connectComponentsByNearest = (sId: NodeId, eId: NodeId, maxDistM: number) => {
                        const A = componentOf(sId);
                        if (A.has(eId)) return true;
                        const isNearEntrance = (lng: number, lat: number) => {
                            try {
                                if (!labelsCache?.features?.length) return false;
                                for (const f of labelsCache.features) {
                                    const p = f.properties || {};
                                    const isEnt = p.barrier === 'gate' || p.entrance;
                                    const c = f.geometry?.coordinates;
                                    if (!isEnt || !Array.isArray(c)) continue;
                                    const d = hav([lng, lat], [c[0], c[1]]);
                                    if (d <= 8) return true;
                                }
                            } catch {}
                            return false;
                        };
                        let best: null | { a: NodeId; b: NodeId; d: number } = null;
                        for (const aId of A) {
                            const a = graph.nodes[aId];
                            for (const bId in graph.nodes) {
                                if (A.has(bId as NodeId)) continue;
                                const b = graph.nodes[bId];
                                const d = hav([a.lng, a.lat], [b.lng, b.lat]);
                                // Only allow bridging when at least one end is near a gate/entrance label
                                if (d <= maxDistM && (isNearEntrance(a.lng, a.lat) || isNearEntrance(b.lng, b.lat))) {
                                    if (!best || d < best.d) best = { a: aId, b: bId as NodeId, d };
                                }
                            }
                        }
                        if (best) {
                            addEdge(graph.nodes[best.a], graph.nodes[best.b]);
                            return true;
                        }
                        return false;
                    };

                    const ensurePointLayer = (id: string, color: string) => {
                        if (!map.current!.getSource(id)) {
                            map.current!.addSource(id, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } as any);
                        }
                        if (!map.current!.getLayer(id)) {
                            map.current!.addLayer({ id, type: 'circle', source: id, paint: { 'circle-radius': 7, 'circle-color': color, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } } as any);
                            try { map.current!.moveLayer(id); } catch {}
                        }
                    };
                    const ensureRouteLayer = () => {
                        if (!map.current!.getSource('walk-route')) {
                            map.current!.addSource('walk-route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } as any);
                        }
                        if (!map.current!.getLayer('walk-route')) {
                            map.current!.addLayer({ id: 'walk-route', type: 'line', source: 'walk-route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#2563EB', 'line-width': 5, 'line-opacity': 0.95 } } as any);
                            try { map.current!.moveLayer('walk-route'); } catch {}
                        }
                    };
                    const removeDebugLayers = () => {
                        try {
                            if (map.current!.getLayer('walk-snap-points')) map.current!.removeLayer('walk-snap-points');
                            if (map.current!.getSource('walk-snap-points')) map.current!.removeSource('walk-snap-points');
                            if (map.current!.getLayer('walk-snap-segs')) map.current!.removeLayer('walk-snap-segs');
                            if (map.current!.getSource('walk-snap-segs')) map.current!.removeSource('walk-snap-segs');
                        } catch {}
                    };
                    const setPoint = (which: 'start' | 'end', lng: number, lat: number) => {
                        const feature = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lng, lat] } } as any;
                        if (which === 'start') {
                            startPt = [lng, lat];
                            (map.current!.getSource('walk-start') as any)?.setData?.({ type: 'FeatureCollection', features: [feature] });
                        } else {
                            endPt = [lng, lat];
                            (map.current!.getSource('walk-end') as any)?.setData?.({ type: 'FeatureCollection', features: [feature] });
                        }
                    };

                    // OSRM fallback disabled: campus routing uses A* only.
                    const tryComputeRoute = async () => {
                        if (!(startPt && endPt)) return;
                        await loadWalkGraph();
                        if (!graphReady) return;
                        // ensure layers and clear any previous popup and debug overlays
                        ensureRouteLayer();
                        removeDebugLayers();
                        if (routePopup) { try { routePopup.remove(); } catch {} routePopup = null; }
                        console.log('Graph nodes:', Object.keys(graph.nodes).length);
                        // Debug overlays removed for production UI
                        const sVirt = addVirtualNodeOnNearestSegment(startPt[0], startPt[1]);
                        const eVirt = addVirtualNodeOnNearestSegment(endPt[0], endPt[1]);
                        const sId = sVirt.id;
                        const eId = eVirt.id;
                        if (!sId || !eId) return;
                        let path = astar(sId, eId);
                        if (!path || path.length < 2) {
                            // Try to connect disconnected components by nearest linking near gates/entrances only
                            const thresholds = [8, 12];
                            let bridged = false;
                            for (const th of thresholds) {
                                if (connectComponentsByNearest(sId, eId, th)) {
                                    bridged = true;
                                    path = astar(sId, eId);
                                    if (path && path.length >= 2) break;
                                }
                            }
                            if (!path || path.length < 2) {
                                routePopup = new maplibregl.Popup()
                                    .setLngLat([(startPt[0] + endPt[0]) / 2, (startPt[1] + endPt[1]) / 2])
                                    .setHTML('<div style="padding:8px">No walking path found between points.</div>')
                                    .addTo(map.current!);
                                try { sVirt.cleanup(); eVirt.cleanup(); } catch {}
                                // OSRM fallback removed by request; report A* failure only.
                                return;
                            }
                        }
                        // Build route coordinates from the on-network A* path only (no straight connectors across buildings)
                        const coords = path.map(id => { const n = graph.nodes[id]!; return [n.lng, n.lat] as [number, number]; });
                        console.log('A* path length:', coords.length);
                        const meters = coords.reduce((sum, c, i) => i ? sum + hav(coords[i - 1] as [number, number], c as [number, number]) : 0, 0);
                        (map.current!.getSource('walk-route') as any).setData({ type:'FeatureCollection', features: [{ type:'Feature', properties:{}, geometry: { type:'LineString', coordinates: coords } }] });
                        const minutes = Math.round(meters / 1.4 / 60);
                        routePopup = new maplibregl.Popup()
                            .setLngLat([(startPt[0] + endPt[0]) / 2, (startPt[1] + endPt[1]) / 2])
                            .setHTML(`<div style=\"padding:8px\"><strong>Walking route (A*)</strong><br/>Distance: ${(meters/1000).toFixed(2)} km<br/>Duration: ~${minutes} min</div>`)
                            .addTo(map.current!);
                        try { sVirt.cleanup(); eVirt.cleanup(); } catch {}
                        try {
                            // Fit to the route for visibility
                            let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
                            for (const [lng, lat] of coords as any) { if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng; if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat; }
                            map.current!.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60, maxZoom: 19, duration: 600 });
                        } catch {}
                    };
                    const clearWalk = () => {
                        startPt = null; endPt = null;
                        if (map.current!.getSource('walk-start')) (map.current!.getSource('walk-start') as any).setData({ type: 'FeatureCollection', features: [] });
                        if (map.current!.getSource('walk-end')) (map.current!.getSource('walk-end') as any).setData({ type: 'FeatureCollection', features: [] });
                        if (map.current!.getSource('walk-route')) (map.current!.getSource('walk-route') as any).setData({ type: 'FeatureCollection', features: [] });
                        removeDebugLayers();
                        if (routePopup) { try { routePopup.remove(); } catch {} routePopup = null; }
                    };

                    // Prepare start/end sources and layers
                    if (!map.current!.getSource('walk-start')) map.current!.addSource('walk-start', { type: 'geojson', data: { type:'FeatureCollection', features: [] } } as any);
                    if (!map.current!.getLayer('walk-start')) map.current!.addLayer({ id: 'walk-start', type: 'circle', source: 'walk-start', paint: { 'circle-radius': 7, 'circle-color': '#10B981', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } } as any);
                    if (!map.current!.getSource('walk-end')) map.current!.addSource('walk-end', { type: 'geojson', data: { type:'FeatureCollection', features: [] } } as any);
                    if (!map.current!.getLayer('walk-end')) map.current!.addLayer({ id: 'walk-end', type: 'circle', source: 'walk-end', paint: { 'circle-radius': 7, 'circle-color': '#EF4444', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } } as any);

                    // Control: inputs + buttons
                    class WalkControl {
                        _c: HTMLElement | null = null;
                        onAdd() {
                            const c = document.createElement('div');
                            c.className = 'maplibregl-ctrl';
                            c.style.background = 'transparent';
                            c.style.backdropFilter = '';
                            c.style.padding = '6px 8px';
                            c.style.border = 'none';
                            c.style.borderRadius = '9999px';
                            c.style.display = 'flex';
                            c.style.flexWrap = 'wrap';
                            c.style.gap = '8px';
                            c.style.alignItems = 'center';
                            c.style.boxShadow = 'none';
                            c.style.maxWidth = 'min(95vw, 980px)';
                            c.style.overflow = 'visible';

                            const mk = (t: string) => {
                                const b = document.createElement('div');
                                b.textContent = t;
                                b.setAttribute('role', 'button');
                                (b as any).tabIndex = 0;
                                b.style.padding = '8px 12px';
                                b.style.cursor = 'pointer';
                                b.style.border = '1px solid #e5e7eb';
                                b.style.borderRadius = '9999px';
                                b.style.background = '#F9FAFB';
                                b.style.color = '#111827';
                                b.style.fontSize = '12px';
                                b.style.fontWeight = '600';
                                b.style.whiteSpace = 'nowrap';
                                b.style.transition = 'all 120ms ease-in-out';
                                b.style.width = 'auto';
                                b.style.height = 'auto';
                                b.style.minHeight = '32px';
                                b.style.minWidth = '60px';
                                b.style.lineHeight = '1.2';
                                b.style.display = 'inline-flex';
                                b.style.alignItems = 'center';
                                b.style.justifyContent = 'center';
                                b.style.flexShrink = '0';
                                b.style.overflow = 'visible';
                                b.style.boxSizing = 'border-box';
                                b.onmouseenter = () => { b.style.background = '#F3F4F6'; };
                                b.onmouseleave = () => { b.style.background = '#F9FAFB'; };
                                return b;
                            };

                            // Inputs
                            const is = document.createElement('input');
                            is.type = 'text'; is.placeholder = 'Start: building or street name';
                            is.style.padding = '8px 10px';
                            is.style.border = '1px solid #e5e7eb';
                            is.style.borderRadius = '9999px';
                            is.style.fontSize = '12px';
                            is.style.width = 'min(40vw, 240px)';
                            is.style.background = '#FFFFFF';
                            is.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.04)';
                            is.style.transition = 'box-shadow 120ms ease-in-out, border-color 120ms ease-in-out';
                            is.onfocus = () => { is.style.borderColor = '#60A5FA'; is.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.25)'; };
                            is.onblur = () => { is.style.borderColor = '#e5e7eb'; is.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.04)'; };
                            const ie = document.createElement('input');
                            ie.type = 'text'; ie.placeholder = 'Destination: building or street name';
                            ie.style.padding = '8px 10px';
                            ie.style.border = '1px solid #e5e7eb';
                            ie.style.borderRadius = '9999px';
                            ie.style.fontSize = '12px';
                            ie.style.width = 'min(45vw, 300px)';
                            ie.style.background = '#FFFFFF';
                            ie.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.04)';
                            ie.style.transition = 'box-shadow 120ms ease-in-out, border-color 120ms ease-in-out';
                            ie.onfocus = () => { ie.style.borderColor = '#60A5FA'; ie.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.25)'; };
                            ie.onblur = () => { ie.style.borderColor = '#e5e7eb'; ie.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.04)'; };

                            const bs = mk('Start');
                            const bc = mk('Clear');
                            bs.style.minWidth = '72px';
                            bc.style.minWidth = '72px';
                            bs.style.flex = '0 0 auto';
                            bc.style.flex = '0 0 auto';

                            const setActive = (mode: 'start' | 'end' | null) => {
                                selecting = mode;
                                // reset styles
                                [bs].forEach(btn => { btn.style.background = '#16A34A'; btn.style.color = '#ffffff'; btn.style.borderColor = '#16A34A'; btn.onmouseenter = () => { btn.style.background = '#15803D'; }; btn.onmouseleave = () => { btn.style.background = '#16A34A'; }; });
                                if (mode === 'start') { bs.style.background = '#16A34A'; bs.style.color = '#ffffff'; }
                            };

                            bs.title = 'Click, then pick a start point on the map';
                            bc.title = 'Clear start, destination and route';

                            bs.onclick = () => setActive('start');
                            bc.onclick = () => { setActive(null); clearWalk(); };

                            // Geocode helper: parse lng,lat or query Nominatim inside current bounds
                            const geocodeAndSet = async (which: 'start'|'end', text: string) => {
                                const t = text.trim(); if (!t) return;
                                const comma = t.indexOf(',');
                                if (comma !== -1) {
                                    const a = parseFloat(t.slice(0, comma));
                                    const b = parseFloat(t.slice(comma + 1));
                                    if (!Number.isNaN(a) && !Number.isNaN(b)) { setPoint(which, a, b); await tryComputeRoute(); return; }
                                }
                                // 1) Try local labels cache first (case-insensitive substring)
                                try {
                                    if (labelsCache?.features?.length) {
                                        const q = t.toLowerCase();
                                        let best: any = null; let bestScore = -1;
                                        for (const f of labelsCache.features) {
                                            const name = (f.properties?.name || f.properties?.amenity || f.properties?.building || '').toString();
                                            if (!name) continue;
                                            const nm = name.toLowerCase();
                                            if (nm.includes(q)) {
                                                // prefer closer label to map center
                                                const c = f.geometry?.coordinates;
                                                if (Array.isArray(c)) {
                                                    const center = map.current!.getCenter();
                                                    const dx = Math.abs(center.lng - c[0]);
                                                    const dy = Math.abs(center.lat - c[1]);
                                                    const score = 1 / (dx + dy + 1e-6);
                                                    if (score > bestScore) { bestScore = score; best = c; }
                                                }
                                            }
                                        }
                                        if (best) { setPoint(which, best[0], best[1]); await tryComputeRoute(); return; }
                                    }
                                } catch {}
                                try {
                                    const bnds = map.current!.getBounds();
                                    const west = bnds.getWest(), south = bnds.getSouth(), east = bnds.getEast(), north = bnds.getNorth();
                                    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&bounded=1&viewbox=${west},${north},${east},${south}&q=${encodeURIComponent(t)}`;
                                    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
                                    const j = await r.json();
                                    if (Array.isArray(j) && j.length) {
                                        const { lon, lat } = j[0];
                                        setPoint(which, parseFloat(lon), parseFloat(lat));
                                        await tryComputeRoute();
                                    }
                                } catch {}
                            };

                            is.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') geocodeAndSet('start', is.value); });
                            ie.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') geocodeAndSet('end', ie.value); });

                            // Small Set buttons next to inputs (no need to press Enter)
                            const gs = mk('Set'); gs.title = 'Use the Start text above';
                            gs.style.background = '#F9FAFB';
                            gs.style.borderColor = '#e5e7eb';
                            gs.style.minWidth = '52px';
                            gs.onclick = () => geocodeAndSet('start', is.value);
                            const ge = mk('Set'); ge.title = 'Use the Destination text above';
                            ge.style.background = '#F9FAFB';
                            ge.style.borderColor = '#e5e7eb';
                            ge.style.minWidth = '52px';
                            ge.onclick = () => geocodeAndSet('end', ie.value);

                            // Style Start (picker) and Clear variants
                            bs.style.background = '#16A34A';
                            bs.style.borderColor = '#16A34A';
                            bs.style.color = '#ffffff';
                            bs.onmouseenter = () => { bs.style.background = '#15803D'; };
                            bs.onmouseleave = () => { bs.style.background = selecting === 'start' ? '#15803D' : '#16A34A'; };

                            bc.style.background = '#FFFFFF';
                            bc.style.borderColor = '#FCA5A5';
                            bc.style.color = '#B91C1C';
                            bc.onmouseenter = () => { bc.style.background = '#FEF2F2'; };
                            bc.onmouseleave = () => { bc.style.background = '#FFFFFF'; };

                            // Layout: input+Set groups, then action buttons grouped to stay together
                            const wrap = (el: HTMLElement, btn: HTMLElement) => {
                                const w = document.createElement('div');
                                w.style.display = 'flex';
                                w.style.gap = '8px';
                                w.style.alignItems = 'center';
                                w.style.background = '#FFFFFF';
                                w.style.padding = '4px';
                                w.style.borderRadius = '9999px';
                                w.style.border = '1px solid #e5e7eb';
                                w.style.flex = '1 1 auto';
                                w.style.minWidth = '260px';
                                w.appendChild(el); w.appendChild(btn); return w;
                            };
                            c.appendChild(wrap(is, gs));
                            c.appendChild(wrap(ie, ge));
                            const actions = document.createElement('div');
                            actions.style.display = 'flex';
                            actions.style.gap = '8px';
                            actions.style.alignItems = 'center';
                            actions.style.flex = '0 0 auto';
                            actions.appendChild(bs);
                            actions.appendChild(bc);
                            c.appendChild(actions);
                            this._c = c; return c;
                        }
                        onRemove() { if (this._c?.parentNode) this._c.parentNode.removeChild(this._c); this._c = null; }
                    }
                    map.current!.addControl(new (WalkControl as any)(), 'top-left');

                    // Click handler to place points and compute route
                    map.current!.on('click', async (e) => {
                        if (!selecting) return;
                        const { lng, lat } = e.lngLat;
                        setPoint(selecting, lng, lat);
                        selecting = null;
                        await tryComputeRoute();
                    });
                } catch (err) {
                    console.warn('Walking routing UI failed to initialize', err);
                }

                // Right-click: reset view to campus
                map.current?.on('contextmenu', (e) => {
                    e.preventDefault();
                    map.current?.easeTo({
                        center: nustCenter,
                        zoom: 16.5,
                        pitch: 0,
                        bearing: 0,
                        duration: 1000
                    });
                });

            // Function to add 3D buildings
            function add3DBuildings() {
                if (!map.current) return;

                const nustBuildings = {
                    type: 'FeatureCollection',
                    features: [
                        {
                            type: 'Feature',
                            properties: {
                                name: 'Engineering Building',
                                height: 25,
                                campus: 'Main Campus',
                                color: '#4A90E2'
                            },
                            geometry: {
                                type: 'Polygon',
                                coordinates: [[
                                    [17.0835, -22.5675],
                                    [17.0840, -22.5675],
                                    [17.0840, -22.5680],
                                    [17.0835, -22.5680],
                                    [17.0835, -22.5675]
                                ]]
                            }
                        },
                        {
                            type: 'Feature',
                            properties: {
                                name: 'NUST Library',
                                height: 20,
                                campus: 'Main Campus',
                                color: '#50C878'
                            },
                            geometry: {
                                type: 'Polygon',
                                coordinates: [[
                                    [17.0845, -22.5678],
                                    [17.0850, -22.5678],
                                    [17.0850, -22.5683],
                                    [17.0845, -22.5683],
                                    [17.0845, -22.5678]
                                ]]
                            }
                        },
                        {
                            type: 'Feature',
                            properties: {
                                name: 'Faculty of Health and Applied Sciences',
                                height: 22,
                                campus: 'Main Campus',
                                color: '#FF6B6B'
                            },
                            geometry: {
                                type: 'Polygon',
                                coordinates: [[
                                    [17.0855, -22.5680],
                                    [17.0860, -22.5680],
                                    [17.0860, -22.5685],
                                    [17.0855, -22.5685],
                                    [17.0855, -22.5680]
                                ]]
                            }
                        },
                        {
                            type: 'Feature',
                            properties: {
                                name: 'Biodiversity Research Centre',
                                height: 15,
                                campus: 'Main Campus',
                                color: '#9B59B6'
                            },
                            geometry: {
                                type: 'Polygon',
                                coordinates: [[
                                    [17.0840, -22.5685],
                                    [17.0845, -22.5685],
                                    [17.0845, -22.5690],
                                    [17.0840, -22.5690],
                                    [17.0840, -22.5685]
                                ]]
                            }
                        },
                        {
                            type: 'Feature',
                            properties: {
                                name: 'Lower Campus Building',
                                height: 18,
                                campus: 'Lower Campus',
                                color: '#F39C12'
                            },
                            geometry: {
                                type: 'Polygon',
                                coordinates: [[
                                    [17.0820, -22.5695],
                                    [17.0825, -22.5695],
                                    [17.0825, -22.5700],
                                    [17.0820, -22.5700],
                                    [17.0820, -22.5695]
                                ]]
                            }
                        }
                    ]
                };

                map.current.addSource('nust-buildings', {
                    type: 'geojson',
                    data: nustBuildings as any
                });

                map.current.addLayer({
                    id: 'nust-buildings-3d',
                    type: 'fill-extrusion',
                    source: 'nust-buildings',
                    paint: {
                        'fill-extrusion-color': ['get', 'color'],
                        'fill-extrusion-height': ['get', 'height'],
                        'fill-extrusion-base': 0,
                        'fill-extrusion-opacity': 0.7
                    }
                });

                map.current.addLayer({
                    id: 'nust-buildings-labels',
                    type: 'symbol',
                    source: 'nust-buildings',
                    layout: {
                        'text-field': ['get', 'name'],
                        'text-size': 12,
                        'text-anchor': 'top',
                        'text-offset': [0, 1.5],
                        'text-allow-overlap': false
                    },
                    paint: {
                        'text-color': '#ffffff',
                        'text-halo-color': '#000000',
                        'text-halo-width': 2
                    }
                });

                map.current.on('click', 'nust-buildings-3d', (e) => {
                    if (e.features && e.features[0]) {
                        const props = e.features[0].properties;
                        new Popup()
                            .setLngLat(e.lngLat)
                            .setHTML(`
                                <div style="padding: 8px;">
                                    <strong>${props?.name || 'Building'}</strong><br/>
                                    Height: ${props?.height || 'N/A'}m<br/>
                                    Campus: ${props?.campus || 'N/A'}
                                </div>
                            `)
                            .addTo(map.current!);
                    }
                });

                map.current.on('mouseenter', 'nust-buildings-3d', () => {
                    if (map.current) {
                        map.current.getCanvas().style.cursor = 'pointer';
                    }
                });

                map.current.on('mouseleave', 'nust-buildings-3d', () => {
                    if (map.current) {
                        map.current.getCanvas().style.cursor = '';
                    }
                });
            }

            // Function to add NUST POIs
            function addNUSTPOIs() {
                if (!map.current) return;

                const nustPOIs = {
                    type: 'FeatureCollection',
                    features: [
                        {
                            type: 'Feature',
                            properties: {
                                name: 'NUST Main Gate',
                                type: 'gate',
                                description: 'Main entrance to NUST campus'
                            },
                            geometry: {
                                type: 'Point',
                                coordinates: [17.0845, -22.5678]
                            }
                        },
                        {
                            type: 'Feature',
                            properties: {
                                name: 'NUST Small Gate',
                                type: 'gate',
                                description: 'Small gate near B1 road'
                            },
                            geometry: {
                                type: 'Point',
                                coordinates: [17.0830, -22.5685]
                            }
                        },
                        {
                            type: 'Feature',
                            properties: {
                                name: 'NUST Library',
                                type: 'building',
                                description: 'Main library building'
                            },
                            geometry: {
                                type: 'Point',
                                coordinates: [17.0845, -22.5678]
                            }
                        },
                        {
                            type: 'Feature',
                            properties: {
                                name: 'INDIA - NAMIBIA CENTRE OF EXCELLENCE IN INFORMATION TECHNOLOGY',
                                type: 'building',
                                description: 'IT Centre of Excellence'
                            },
                            geometry: {
                                type: 'Point',
                                coordinates: [17.0855, -22.5680]
                            }
                        }
                    ]
                };

                map.current.addSource('nust-pois', {
                    type: 'geojson',
                    data: nustPOIs as any
                });

                map.current.addLayer({
                    id: 'nust-pois-markers',
                    type: 'circle',
                    source: 'nust-pois',
                    paint: {
                        'circle-radius': [
                            'case',
                            ['==', ['get', 'type'], 'gate'], 10,
                            8
                        ],
                        'circle-color': [
                            'case',
                            ['==', ['get', 'type'], 'gate'], '#FF6B6B',
                            '#4A90E2'
                        ],
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#ffffff'
                    }
                });

                map.current.on('click', 'nust-pois-markers', (e) => {
                    if (e.features && e.features[0]) {
                        const props = e.features[0].properties;
                        new Popup()
                            .setLngLat(e.lngLat)
                            .setHTML(`
                                <div style="padding: 8px;">
                                    <strong>${props?.name || 'Location'}</strong><br/>
                                    <span style="color: #666; font-size: 12px;">${props?.type || ''}</span>
                                </div>
                            `)
                            .addTo(map.current!);
                    }
                });

                map.current.on('mouseenter', 'nust-pois-markers', () => {
                    if (map.current) {
                        map.current.getCanvas().style.cursor = 'pointer';
                    }
                });

                map.current.on('mouseleave', 'nust-pois-markers', () => {
        if (map.current) {
                        map.current.getCanvas().style.cursor = '';
                    }
                });
            }

            // Legacy demo driving routing removed; A* walking routing is used now.

            function goToMainCampus() {
                if (!map.current) return;
                map.current.easeTo({
                    center: CAMPUS_LOCATIONS.main,
                    zoom: 17,
                    pitch: 45,
                    bearing: 0,
                    duration: 1000
                });
            }

            function goToLowerCampus() {
                if (!map.current) return;
                map.current.easeTo({
                    center: CAMPUS_LOCATIONS.lower,
                    zoom: 17,
                    pitch: 45,
                    bearing: 0,
                    duration: 1000
                });
            }

            // No global exposure; useImperativeHandle handles calls.
            
            // Close the 'load' handler
            });
        }

        return () => {
            if (keyHandlerRef.current) {
                window.removeEventListener('keydown', keyHandlerRef.current);
                keyHandlerRef.current = null;
            }
            
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    useImperativeHandle(ref, () => ({
        findRoute: () => {},
        clearRoute: () => {},
        goToMainCampus: () => {
            if (!map.current) return;
            map.current.easeTo({ center: CAMPUS_LOCATIONS.main, zoom: 17, pitch: 45, bearing: 0, duration: 1000 });
        },
        goToLowerCampus: () => {
            if (!map.current) return;
            map.current.easeTo({ center: CAMPUS_LOCATIONS.lower, zoom: 17, pitch: 45, bearing: 0, duration: 1000 });
        }
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