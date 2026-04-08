# Quick Start: SVG Floor Plan Extraction

## One-Click Extraction

1. **Go to:** `http://localhost:8000/indoor-map`
2. **Click:** "📄 Extract" button (top of page)
3. **Wait:** ~3 seconds for extraction to complete
4. **Watch:** Status messages for each step
5. **Done:** Page reloads with extracted floor plans

## What Gets Created

| File | Location | Purpose |
|------|----------|---------|
| `library-basement.geojson` | `/public/floor-plans/` | Basement coordinates |
| `library-ground.geojson` | `/public/floor-plans/` | Ground floor coordinates |
| `library-first.geojson` | `/public/floor-plans/` | First floor coordinates |
| `library-second.geojson` | `/public/floor-plans/` | Second floor coordinates |
| Database records | MySQL `locations` table | Office metadata |

## After Extraction

1. **IndoorNavigation page loads GeoJSON**
   - Automatically from `/public/floor-plans/*.geojson`
   - Or from browser localStorage cache

2. **Floor plans become interactive**
   - Click offices to select start/end
   - Calculate routes between locations
   - View turn-by-turn directions

3. **Data persists**
   - GeoJSON files stay in `/public/floor-plans/`
   - Database records in `locations` table
   - Can re-extract anytime to update

## Troubleshooting

### Extraction doesn't find offices
- Check if SVG contains `<text>` elements with coordinates
- Verify `x` and `y` attributes are present on text
- Check browser console for error messages

### GeoJSON files created but floor plan shows test data
- Refresh browser (Ctrl+F5)
- Check `/public/floor-plans/` folder for *.geojson files
- Check browser console for loading errors

### Need to manually extract
```javascript
// In browser console:
import { processAllFloorPlans } from '@/utils/batchExtractFloorPlans';
await processAllFloorPlans();
```

## Technical Stack

**Frontend SVG Processing:**
- `resources/js/utils/svgExtractor.ts` - SVG parsing
- `resources/js/utils/batchExtractFloorPlans.ts` - Batch processing

**Backend Storage:**
- `app/Http/Controllers/IndoorNavigationController.php` - API endpoints
- MySQL `locations` table - Office coordinates
- `/public/floor-plans/` - GeoJSON files

**UI Component:**
- `resources/js/pages/IndoorNavigation.tsx` - Extract button & UI
- `resources/js/components/IndoorMapViewer.tsx` - Floor plan visualization

## Process Flow

```
SVG Files
   ↓
extracts offices (DOMParser)
   ↓
generates GeoJSON coordinates
   ↓
saves to /public/floor-plans/ (API)
   ↓
seeds database with locations (API)
   ↓
loads in IndoorMapViewer component
   ↓
user sees interactive floor plan
```

## Key Coordinates

- **Extraction button:** IndoorNavigation page, top section
- **GeoJSON output:** `/public/floor-plans/library-*.geojson`
- **Database:** `locations` table, `buildings` & `floors` tables
- **UI component:** `IndoorMapViewer.tsx` for visualization

## Typical Extraction Results

For Library floor plans:
- **Basement:** ~40-50 locations
- **Ground:** ~45-55 locations
- **First:** ~40-50 locations
- **Second:** ~35-45 locations
- **Total:** ~160-200 offices/spaces

Time to complete: **2-3 seconds**

---

For detailed implementation guide, see **SVG_TO_GEOJSON_GUIDE.md**
