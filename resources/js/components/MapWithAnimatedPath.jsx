import React, { useRef, useEffect, useState } from 'react';

import mapboxgl from 'mapbox-gl';
import { knownLocations } from './knownLocations';
import { buildGraph, findNearestNode, dijkstra } from './walkwayGraph';
import '../../css/AnimatedPath.css';
import '../../css/MapWithAnimatedPathOverrides.css';

mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN'; // TODO: Replace with your real token or use env

function MapWithAnimatedPath() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [route, setRoute] = useState(null);
  const [distance, setDistance] = useState(0);

  // Helper: Find location by name
  const findLocation = (name) =>
    knownLocations.find(
      (loc) => loc.name.trim().toLowerCase() === name.trim().toLowerCase()
    );

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setError('');
    setDistance(0);
    const fromLoc = findLocation(from);
    const toLoc = findLocation(to);
    // Restrict to only known locations
    if (!fromLoc) {
      setRoute(null);
      setDistance(0);
      setError('Start location not recognized. Please enter a valid location within NUST premises.');
      return;
    }
    if (!toLoc) {
      setRoute(null);
      setDistance(0);
      setError('Destination not recognized. Please enter a valid location within NUST premises.');
      return;
    }
    // Strict walkway routing
    const graph = buildGraph();
    const fromKey = findNearestNode(graph, fromLoc.coordinates);
    const toKey = findNearestNode(graph, toLoc.coordinates);
    if (!fromKey || !toKey) {
      setRoute(null);
      setError('Could not find a valid walkway route.');
      return;
    }
    const pathKeys = dijkstra(graph, fromKey, toKey);
    if (!pathKeys || pathKeys.length < 2) {
      setRoute(null);
      setError('No walkway route found between these locations.');
      return;
    }
    // Convert keys to coordinates
    let pathCoords = pathKeys.map(k => k.split(',').map(Number));

    // Helper to compare coords with small tolerance
    const almostEqual = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
    const coordsEqual = (A, B) => almostEqual(A[0], B[0]) && almostEqual(A[1], B[1]);

    // Ensure the exact start/destination coordinates are present so the route doesn't stop "mid-walkway"
    try {
      const startCoord = fromLoc.coordinates;
      const endCoord = toLoc.coordinates;
      // Prepend exact start if different from first node
      if (!coordsEqual(pathCoords[0], startCoord)) {
        pathCoords = [startCoord, ...pathCoords];
      }
      // Append exact end if different from last node
      if (!coordsEqual(pathCoords[pathCoords.length - 1], endCoord)) {
        pathCoords = [...pathCoords, endCoord];
      }
    } catch (err) {
      // If something unexpected happens, keep original pathCoords
      console.warn('Error snapping exact start/end coords to path', err);
    }

    setRoute(pathCoords);
    // Calculate total distance (rough meters)
    let dist = 0;
    for (let i = 0; i < pathCoords.length - 1; i++) {
      const [lng1, lat1] = pathCoords[i];
      const [lng2, lat2] = pathCoords[i + 1];
      dist += Math.sqrt((lng2 - lng1) ** 2 + (lat2 - lat1) ** 2) * 111320;
    }
    setDistance(dist);
  };

  // Initialize map
  useEffect(() => {
    useEffect(() => {
      if (!mapRef.current || !route) return;

      // Remove previous source/layer if exists
      if (mapRef.current.getLayer('route')) {
        mapRef.current.removeLayer('route');
        mapRef.current.removeSource('route');
      }

      mapRef.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: route,
          },
        },
      });

      mapRef.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#1976d2',
          'line-width': 4,
          'line-dasharray': [0.5, 4],
        },
      });

      // Animate the dash pattern by shifting the dasharray
      let phase = 0;
      let animationFrame;
      function animateDash() {
        phase = (phase + 1) % 8;
        const dash1 = 0.5;
        const gap = 4;
        const offset = (phase / 8) * (dash1 + gap);
        mapRef.current.setPaintProperty('route', 'line-dasharray', [dash1 + offset, gap - offset]);
        animationFrame = requestAnimationFrame(animateDash);
      }
      animateDash();

      // Add arrowhead marker at the end
      if (route.length > 1) {
        const [lng, lat] = route[route.length - 1];
        new mapboxgl.Marker({ color: '#1976d2' })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);
      }

      // Fit bounds
      mapRef.current.fitBounds([route[0], route[route.length - 1]], { padding: 80 });

      // Cleanup
      return () => {
        if (mapRef.current.getLayer('route')) {
          mapRef.current.removeLayer('route');
          mapRef.current.removeSource('route');
        }
        if (animationFrame) cancelAnimationFrame(animationFrame);
      };
    }, [route]);
    mapRef.current.fitBounds([route[0], route[1]], { padding: 80 });

    // Cleanup
    return () => {
      if (mapRef.current.getLayer('route')) {
        mapRef.current.removeLayer('route');
        mapRef.current.removeSource('route');
      }
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [route]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(120deg, #f8fafc 0%, #e0e7ef 100%)', padding: '32px 0' }}>
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '32px 28px 24px 28px',
        position: 'relative',
      }}>
        <h2 style={{
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 24,
          letterSpacing: '-0.5px',
          color: '#1a237e',
          textAlign: 'center',
        }}>
          NUST Campus Navigation
        </h2>
        <form onSubmit={handleSearch} style={{
          marginBottom: 18,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <input
            list="from-locations"
            value={from}
            onChange={e => {
              setFrom(e.target.value);
              setError('');
              setRoute(null);
              setDistance(0);
            }}
            placeholder="Select start location"
            className="map-route-input"
            style={{ minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid #bdbdbd', fontSize: 16 }}
            autoComplete="off"
          />
          <datalist id="from-locations">
            {knownLocations.map(loc => (
              <option key={loc.name} value={loc.name} />
            ))}
          </datalist>
          <span style={{ fontWeight: 600, color: '#374151', fontSize: 18 }}>to</span>
          <input
            list="to-locations"
            value={to}
            onChange={e => {
              setTo(e.target.value);
              setError('');
              setRoute(null);
              setDistance(0);
            }}
            placeholder="Select destination"
            className="map-route-input"
            style={{ minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid #bdbdbd', fontSize: 16 }}
            autoComplete="off"
          />
          <datalist id="to-locations">
            {knownLocations.map(loc => (
              <option key={loc.name} value={loc.name} />
            ))}
          </datalist>
          <button type="submit" style={{
            background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 22px',
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(25, 118, 210, 0.08)',
            transition: 'background 0.2s',
          }}>Show Route</button>
        </form>
        {error && <div style={{ color: '#d32f2f', marginBottom: 12, textAlign: 'center', fontWeight: 500 }}>{error}</div>}
        <div
          ref={mapContainer}
          style={{
            width: '100%',
            height: 500,
            borderRadius: 12,
            overflow: 'hidden',
            border: '1.5px solid #e3e7ee',
            background: 'linear-gradient(120deg, #e3e7ee 0%, #f8fafc 100%)',
          }}
        />
        {route && distance > 0 && !error && (
          <div style={{
            position: 'absolute',
            top: 32,
            right: 32,
            background: 'rgba(14, 14, 14, 0.97)',
            borderRadius: 10,
            padding: '12px 22px',
            boxShadow: '0 2px 12px rgba(25, 118, 210, 0.10)',
            zIndex: 10,
            fontSize: 16,
            color: '#1976d2',
            fontWeight: 500,
            minWidth: 160,
            textAlign: 'center',
          }}>
            <b>Route Info</b><br />
            Distance: {(distance / 1000).toFixed(2)} km
          </div>
        )}
      </div>
    </div>
  );
}

export default MapWithAnimatedPath;
