// Generates campus walking network from OSM (footways/paths) into public/data/nust-walkways.geojson
// Usage: node scripts/generate-walkways.cjs

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
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter'
  ];
  let attempt = 0;
  return new Promise((resolve, reject) => {
    const tryOne = () => {
      if (attempt >= endpoints.length) return reject(new Error('All Overpass endpoints failed'));
      const url = endpoints[attempt] + '?data=' + encodeURIComponent(query);
      attempt++;
      https.get(url, res => {
        if (res.statusCode !== 200) { res.resume(); setTimeout(tryOne, 500); return; }
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { setTimeout(tryOne, 500); } });
      }).on('error', () => setTimeout(tryOne, 500));
    };
    tryOne();
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
  let [s, w, n, e] = bboxFromGeoJSON(campus);
  // pad bbox slightly to include edges of ways
  const pad = 0.0008; // ~80m
  s -= pad; w -= pad; n += pad; e += pad;
  // General highway fetch to avoid empty results, we will include any highway and foot-accessible tags
  const query = `[out:json][timeout:60];(
    way["highway"](${s},${w},${n},${e});
    way["foot"~"yes|designated|permissive"](${s},${w},${n},${e});
    way["sidewalk"](${s},${w},${n},${e});
  >;);out;`;
  console.log('Fetching Overpass for bbox:', { s, w, n, e });
  const overpass = await fetchOverpass(query);
  const gj = overpassToGeoJSON(overpass);
  // ensure directory exists
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(gj));
  console.log('Saved', gj.features.length, 'features to', outPath);
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
