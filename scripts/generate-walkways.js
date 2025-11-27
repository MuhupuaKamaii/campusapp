// Generates campus walking network from OSM (footways/paths) into public/data/nust-walkways.geojson
// Usage: node scripts/generate-walkways.js

const fs = require('fs');
const path = require('path');
const https = require('https');

const campusGeoJSONPath = path.resolve(__dirname, '..', 'public', 'data', 'nust-campus.geojson');
const outPath = path.resolve(__dirname, '..', 'public', 'data', 'nust-walkways.geojson');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function bboxFromGeoJSON(gj) {
  // Compute bbox [s, w, n, e]
  let minLat = 90, minLng = 180, maxLat = -90, maxLng = -180;
  function addCoord(lng, lat) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  const type = gj.type;
  if (type === 'FeatureCollection') {
    for (const f of gj.features || []) {
      if (!f.geometry) continue;
      collectGeom(f.geometry, addCoord);
    }
  } else if (type === 'Feature' && gj.geometry) {
    collectGeom(gj.geometry, addCoord);
  } else if (gj.type) {
    collectGeom(gj, addCoord);
  }
  return [minLat, minLng, maxLat, maxLng];
}

function collectGeom(geom, add) {
  if (geom.type === 'Polygon') {
    for (const ring of geom.coordinates) for (const [lng, lat] of ring) add(lng, lat);
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) for (const ring of poly) for (const [lng, lat] of ring) add(lng, lat);
  } else if (geom.type === 'LineString') {
    for (const [lng, lat] of geom.coordinates) add(lng, lat);
  } else if (geom.type === 'MultiLineString') {
    for (const line of geom.coordinates) for (const [lng, lat] of line) add(lng, lat);
  } else if (geom.type === 'Point') {
    const [lng, lat] = geom.coordinates; add(lng, lat);
  } else if (geom.type === 'MultiPoint') {
    for (const [lng, lat] of geom.coordinates) add(lng, lat);
  } else if (geom.type === 'GeometryCollection') {
    for (const g of geom.geometries || []) collectGeom(g, add);
  }
}

function fetchOverpass(query) {
  const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode));
        res.resume();
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function overpassToGeoJSON(overpassJSON) {
  const nodes = new Map();
  for (const el of overpassJSON.elements || []) if (el.type === 'node') nodes.set(el.id, [el.lon, el.lat]);
  const features = [];
  for (const el of overpassJSON.elements || []) if (el.type === 'way' && Array.isArray(el.nodes) && el.nodes.length > 1) {
    const coords = el.nodes.map(id => nodes.get(id)).filter(Boolean);
    if (coords.length > 1) {
      const props = Object.assign({}, el.tags || {});
      features.push({ type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: coords } });
    }
  }
  return { type: 'FeatureCollection', features };
}

async function main() {
  if (!fs.existsSync(campusGeoJSONPath)) {
    console.error('Campus GeoJSON missing at', campusGeoJSONPath);
    process.exit(1);
  }
  const campus = readJSON(campusGeoJSONPath);
  const [s, w, n, e] = bboxFromGeoJSON(campus);
  const query = `[out:json][timeout:60];(way["highway"~"footway|path|pedestrian|steps|living_street|service|track|cycleway"](${s},${w},${n},${e});>;);out;`;
  console.log('Fetching Overpass for bbox:', { s, w, n, e });
  const overpass = await fetchOverpass(query);
  const gj = overpassToGeoJSON(overpass);
  // ensure directory exists
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(gj));
  console.log('Saved', gj.features.length, 'features to', outPath);
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
