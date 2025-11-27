// Generates campus building footprints into public/data/nust-buildings.geojson
// Usage: node scripts/generate-buildings.cjs
const fs = require('fs');
const path = require('path');
const https = require('https');

const campusGeoJSONPath = path.resolve(__dirname, '..', 'public', 'data', 'nust-campus.geojson');
const outPath = path.resolve(__dirname, '..', 'public', 'data', 'nust-buildings.geojson');

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
        if (res.statusCode !== 200) { res.resume(); setTimeout(tryOne, 500); return; }
        let data=''; res.on('data', c => data += c); res.on('end', () => { try{ resolve(JSON.parse(data)); } catch(e){ setTimeout(tryOne,500); } });
      }).on('error', () => setTimeout(tryOne, 500));
    };
    tryOne();
  });
}

function overpassToBuildings(osm) {
  const nodes = new Map();
  for (const el of osm.elements||[]) if (el.type==='node') nodes.set(el.id, [el.lon, el.lat]);
  const features = [];
  for (const el of osm.elements||[]) if (el.type==='way' && el.tags && el.tags.building) {
    const coords = (el.nodes||[]).map(id => nodes.get(id)).filter(Boolean);
    if (coords.length>2) features.push({ type:'Feature', properties: el.tags, geometry: { type:'Polygon', coordinates: [coords] } });
  }
  return { type:'FeatureCollection', features };
}

async function main(){
  if (!fs.existsSync(campusGeoJSONPath)) { console.error('Campus GeoJSON missing'); process.exit(1); }
  const campus = readJSON(campusGeoJSONPath);
  let [s,w,n,e] = bboxFromGeoJSON(campus);
  const pad = 0.001; s-=pad; w-=pad; n+=pad; e+=pad;
  const query = `[out:json][timeout:60];(way["building"](${s},${w},${n},${e});>;);out;`;
  console.log('Fetching buildings for bbox:', {s,w,n,e});
  const j = await fetchOverpass(query);
  const gj = overpassToBuildings(j);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(gj));
  console.log('Saved', gj.features.length, 'buildings to', outPath);
}

main().catch(e=>{ console.error('Failed:', e); process.exit(1); });
