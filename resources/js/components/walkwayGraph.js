// Utility to build a graph from walkway GeoJSON and find shortest path
// Only allows routing along walkways and through gates/doors

import walkways from '../../public/data/nust-walkways.geojson';
import gates from '../../public/data/nust-gates.geojson';

function haversine([lng1, lat1], [lng2, lat2]) {
  const R = 6371000;
  const toRad = (x) => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function coordsKey([lng, lat]) {
  return `${lng.toFixed(6)},${lat.toFixed(6)}`;
}

export function buildGraph() {
  const graph = {};
  function addEdge(a, b) {
    const keyA = coordsKey(a);
    const keyB = coordsKey(b);
    if (!graph[keyA]) graph[keyA] = [];
    if (!graph[keyB]) graph[keyB] = [];
    const dist = haversine(a, b);
    graph[keyA].push({ to: keyB, coords: b, dist });
    graph[keyB].push({ to: keyA, coords: a, dist });
  }
  // Walkways
  walkways.features.forEach(f => {
    const coords = f.geometry.coordinates;
    for (let i = 0; i < coords.length - 1; i++) {
      addEdge(coords[i], coords[i + 1]);
    }
  });
  // Gates (treat as walkable edges)
  gates.features.forEach(f => {
    const coords = f.geometry.coordinates;
    for (let i = 0; i < coords.length - 1; i++) {
      addEdge(coords[i], coords[i + 1]);
    }
  });
  return graph;
}

export function findNearestNode(graph, [lng, lat]) {
  let minDist = Infinity, nearest = null;
  for (const key in graph) {
    const [nLng, nLat] = key.split(',').map(Number);
    const d = haversine([lng, lat], [nLng, nLat]);
    if (d < minDist) {
      minDist = d;
      nearest = key;
    }
  }
  return nearest;
}

export function dijkstra(graph, startKey, endKey) {
  const dist = {}, prev = {}, visited = new Set();
  dist[startKey] = 0;
  const queue = [[0, startKey]];
  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [d, u] = queue.shift();
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === endKey) break;
    for (const edge of graph[u] || []) {
      const v = edge.to;
      const alt = d + edge.dist;
      if (alt < (dist[v] ?? Infinity)) {
        dist[v] = alt;
        prev[v] = u;
        queue.push([alt, v]);
      }
    }
  }
  // Reconstruct path
  const path = [];
  let u = endKey;
  while (u && u !== startKey) {
    path.unshift(u);
    u = prev[u];
  }
  if (u === startKey) path.unshift(startKey);
  return path;
}
