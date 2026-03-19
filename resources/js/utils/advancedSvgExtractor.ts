/**
 * Advanced SVG Extractor - Extracts text labels and coordinates directly from SVG
 * Uses existing room labels as navigation points
 */

interface SvgTextElement {
    text: string;
    x: number;
    y: number;
    fill: string;
    fontSize: string;
}

interface ExtractedLocation {
    name: string;
    x_coordinate: number;
    y_coordinate: number;
    type: string;
    confidence: number;
}

export async function extractLocationsFromSvgText(svgUrl: string): Promise<ExtractedLocation[]> {
    try {
        const response = await fetch(svgUrl);
        const svgText = await response.text();

        // Parse SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');

        if (svgDoc.documentElement.tagName !== 'svg') {
            throw new Error('Invalid SVG document');
        }

        const locations: ExtractedLocation[] = [];
        const processedLabels = new Set<string>();

        // Strategy 1: Extract all text elements from SVG
        const textElements = svgDoc.querySelectorAll('text');
        const textMap = new Map<string, SvgTextElement>();

        console.log(`Found ${textElements.length} text elements in SVG`);

        textElements.forEach((textEl) => {
            const x = parseFloat(textEl.getAttribute('x') || '0');
            const y = parseFloat(textEl.getAttribute('y') || '0');
            const content = textEl.textContent?.trim() || '';
            const fill = textEl.getAttribute('fill') || textEl.style.fill || '#000000';
            const fontSize = textEl.getAttribute('font-size') || '12';

            if (content.length === 0 || content.length > 100) return; // Skip empty or very long text

            const key = `${Math.round(x)}-${Math.round(y)}-${content.substring(0, 20)}`;
            
            if (!textMap.has(key)) {
                textMap.set(key, {
                    text: content,
                    x,
                    y,
                    fill,
                    fontSize,
                });
            }
        });

        console.log(`Extracted ${textMap.size} unique text labels`);

        // Strategy 2: Process text elements into locations
        textMap.forEach((textEl) => {
            const roomInfo = parseRoomLabel(textEl.text);
            
            if (roomInfo && !processedLabels.has(roomInfo.name)) {
                locations.push({
                    name: roomInfo.name,
                    x_coordinate: Math.round(textEl.x),
                    y_coordinate: Math.round(textEl.y),
                    type: roomInfo.type,
                    confidence: roomInfo.confidence,
                });
                
                processedLabels.add(roomInfo.name);
            }
        });

        // Strategy 3: Extract from tspan elements (sometimes text is split across tspan)
        const tspanElements = svgDoc.querySelectorAll('tspan');
        tspanElements.forEach((tspanEl) => {
            const parentText = tspanEl.parentElement?.getAttribute('x');
            const parentY = tspanEl.parentElement?.getAttribute('y');
            
            if (!parentText || !parentY) return;

            const x = parseFloat(parentText);
            const y = parseFloat(parentY);
            const content = tspanEl.textContent?.trim() || '';

            if (content.length === 0 || content.length > 100) return;

            const roomInfo = parseRoomLabel(content);
            const key = `${roomInfo?.name}-tspan`;

            if (roomInfo && !processedLabels.has(key)) {
                locations.push({
                    name: roomInfo.name,
                    x_coordinate: Math.round(x),
                    y_coordinate: Math.round(y),
                    type: roomInfo.type,
                    confidence: roomInfo.confidence,
                });
                
                processedLabels.add(key);
            }
        });

        console.log(`✅ Extracted ${locations.length} total locations from SVG text labels`);
        return locations;
    } catch (error) {
        console.error('❌ SVG Text Extraction Error:', error);
        return [];
    }
}

/**
 * Parse room label to extract name and type
 * Handles various formats like "Office 101", "Conf Room B3:2", "HALLWAY", etc.
 */
function parseRoomLabel(text: string): { name: string; type: string; confidence: number } | null {
    const cleanText = text.trim();

    if (cleanText.length === 0) {
        return null;
    }

    // Room type keywords
    const typePatterns = [
        { pattern: /stair/i, type: 'stair' },
        { pattern: /stairs/i, type: 'stair' },
        { pattern: /elevator/i, type: 'elevator' },
        { pattern: /lift/i, type: 'elevator' },
        { pattern: /hallway/i, type: 'hallway' },
        { pattern: /corridor/i, type: 'hallway' },
        { pattern: /passage/i, type: 'hallway' },
        { pattern: /hall\s/i, type: 'hallway' },
        { pattern: /conf room/i, type: 'room' },
        { pattern: /conference/i, type: 'room' },
        { pattern: /meeting/i, type: 'room' },
        { pattern: /office/i, type: 'room' },
        { pattern: /room/i, type: 'room' },
        { pattern: /lab/i, type: 'room' },
        { pattern: /library/i, type: 'room' },
        { pattern: /lounge/i, type: 'room' },
        { pattern: /cafeteria/i, type: 'room' },
        { pattern: /restroom/i, type: 'room' },
        { pattern: /toilet/i, type: 'room' },
        { pattern: /entrance/i, type: 'entrance' },
        { pattern: /entry/i, type: 'entrance' },
        { pattern: /exit/i, type: 'entrance' },
    ];

    let type = 'room'; // Default type
    let confidence = 0.5;

    // Check for type pattern matches
    for (const { pattern, type: detectedType } of typePatterns) {
        if (pattern.test(cleanText)) {
            type = detectedType;
            confidence = 0.9;
            break;
        }
    }

    // Check if it looks like just a room number (e.g., "101", "B3:2", "G04")
    if (/^[A-Z]?\d{2,4}(:\d)?$/.test(cleanText)) {
        return {
            name: cleanText,
            type: 'room',
            confidence: 0.7,
        };
    }

    // Skip generic labels
    const skipPatterns = [/^[xy]$/i, /^pt\d+$/i, /^,$/];
    if (skipPatterns.some(p => p.test(cleanText))) {
        return null;
    }

    // Skip very short or very long text
    if (cleanText.length < 2 || cleanText.length > 80) {
        return null;
    }

    // Skip coordinates-like text
    if (/^\d+\.?\d*\s*,\s*\d+\.?\d*$/.test(cleanText)) {
        return null;
    }

    return {
        name: cleanText,
        type,
        confidence,
    };
}

/**
 * Convert extracted locations to GeoJSON format
 */
export function locationsToGeoJSON(locations: ExtractedLocation[], floorName: string) {
    return {
        type: 'FeatureCollection' as const,
        features: locations.map((location, index) => ({
            type: 'Feature' as const,
            properties: {
                id: index + 1,
                name: location.name,
                type: location.type,
                floor: floorName,
                confidence: location.confidence,
            },
            geometry: {
                type: 'Point' as const,
                coordinates: [location.x_coordinate, location.y_coordinate],
            },
        })),
    };
}

/**
 * Batch extract all floor plans using text labels
 */
export async function extractAllFloorPlansFromText() {
    const floorConfigs = [
        { file: 'library-basement', name: 'Basement', level: -1 },
        { file: 'library-ground', name: 'Ground', level: 0 },
        { file: 'library-first', name: 'First', level: 1 },
        { file: 'library-second', name: 'Second', level: 2 },
    ];

    const results = [];

    for (const floor of floorConfigs) {
        console.log(`\n📄 Extracting ${floor.name}...`);
        
        try {
            const locations = await extractLocationsFromSvgText(`/floor-plans/${floor.file}.svg`);
            
            if (locations.length === 0) {
                console.warn(`⚠️ No locations found in ${floor.name}`);
                continue;
            }

            const geojson = locationsToGeoJSON(locations, floor.name);

            results.push({
                floor: floor.file,
                level: floor.level,
                locations,
                geojson,
                count: locations.length,
            });

            console.log(`✅ ${floor.name}: Extracted ${locations.length} locations`);
            
            // Log sample locations
            console.log('Sample locations:', locations.slice(0, 3).map(l => `${l.name} (${l.type}) @ ${l.x_coordinate},${l.y_coordinate}`));

        } catch (error) {
            console.error(`❌ Error extracting ${floor.name}:`, error);
        }
    }

    return results;
}
