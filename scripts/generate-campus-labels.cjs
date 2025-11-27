// Generates campus labels (buildings, amenities, entrances, gates) into public/data/nust-labels.geojson
// Usage: node scripts/generate-campus-labels.cjs

const fs = require('fs');
const path = require('path');
const https = require('https');

const campusGeoJSONPath = path.resolve(__dirname, '..', 'public', 'data', 'nust-campus.geojson');
const outPath = path.resolve(__dirname, '..', 'public', 'data', 'nust-labels.geojson');

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function bboxFromGeoJSON(gj) {
  let minLat = 90, minLng = 180, maxLat = -90, maxLng = -180;
  function add(lng, lat) { if (lat<minLat)minLat=lat; if(lat>maxLat)maxLat=lat; if(lng<minLng)minLng=lng; if(lng>maxLng)maxLng=lng; }
  function collect(g) {
    if (g.type === 'Polygon') for (const r of g.coordinates) for (const [lng,lat] of r) add(lng,lat);
    else if (g.type === 'MultiPolygon') for (const p of g.coordinates) for (const r of p) for (const [lng,lat] of r) add(lng,lat);
  }
  if (gj.type === 'FeatureCollection') for (const f of gj.features||[]) if (f.geometry) collect(f.geometry);
  else if (gj.type === 'Feature' && gj.geometry) collect(gj.geometry);
  else if (gj.type) collect(gj);
  return [minLat, minLng, maxLat, maxLng];
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
        if (res.statusCode !== 200) {
          res.resume();
          setTimeout(tryOne, 500);
          return;
        }
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { setTimeout(tryOne, 500); } });
      }).on('error', () => setTimeout(tryOne, 500));
    };
    tryOne();
  });
}

function centerOfCoords(coords) {
  let sx=0, sy=0, n=0; for (const [lng,lat] of coords) { sx+=lng; sy+=lat; n++; } return n? [sx/n, sy/n] : null;
}

function overpassToLabels(osm) {
  const nodes = new Map();
  for (const el of osm.elements||[]) if (el.type==='node') nodes.set(el.id, [el.lon, el.lat]);
  const features = [];
  const addPoint = (lng, lat, props) => { features.push({ type:'Feature', properties: props, geometry:{ type:'Point', coordinates:[lng,lat] } }); };

  for (const el of osm.elements||[]) {
    const tags = el.tags || {}; const name = tags.name;
    if (el.type === 'node') {
      if (name || tags.amenity || tags.building || tags.barrier==='gate' || tags.entrance) {
        addPoint(el.lon, el.lat, { name, ...tags });
      }
    } else if (el.type === 'way') {
      if (Array.isArray(el.nodes) && el.nodes.length > 1) {
        const coords = el.nodes.map(id => nodes.get(id)).filter(Boolean);
        if (name || tags.amenity || tags.building) {
          const c = centerOfCoords(coords);
          if (c) addPoint(c[0], c[1], { name, ...tags });
        }
      }
    }
  }
  return { type:'FeatureCollection', features };
}

async function main() {
  if (!fs.existsSync(campusGeoJSONPath)) { console.error('Campus GeoJSON missing at', campusGeoJSONPath); process.exit(1); }
  const campus = readJSON(campusGeoJSONPath);
  const [s,w,n,e] = bboxFromGeoJSON(campus);
  const query = `[out:json][timeout:60];(node["name"](${s},${w},${n},${e});way["name"](${s},${w},${n},${e});node["barrier"="gate"](${s},${w},${n},${e});node["entrance"](${s},${w},${n},${e}););out tags center;>;out skel;`;
  console.log('Fetching labels for bbox:', { s,w,n,e });
  const overpass = await fetchOverpass(query);
  const gj = overpassToLabels(overpass);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(gj));
  console.log('Saved', gj.features.length, 'labels to', outPath);
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
