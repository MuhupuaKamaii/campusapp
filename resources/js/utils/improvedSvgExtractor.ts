/**
 * Improved SVG Extractor - Handles various SVG structures
 */

interface ExtractedLocation {
    name: string;
    x_coordinate: number;
    y_coordinate: number;
    type: string;
    confidence: number;
    source: string; // Where it came from (text, tspan, data-attr, etc.)
}

export async function extractLocationsFromSvg(svgUrl: string): Promise<ExtractedLocation[]> {
    try {
        console.log(`📍 Extracting from: ${svgUrl}`);
        const response = await fetch(svgUrl);
        const svgText = await response.text();

        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');

        if (svgDoc.documentElement.tagName !== 'svg') {
            throw new Error('Invalid SVG document');
        }

        const locations: ExtractedLocation[] = [];
        const processedLabels = new Set<string>();

        // Strategy 1: Extract from <text> elements with attributes
        console.log('   Strategy 1: Extracting from <text> elements...');
        const textElements = svgDoc.querySelectorAll('text');
        console.log(`   Found ${textElements.length} text elements`);

        textElements.forEach((textEl) => {
            const x = parseFloat(textEl.getAttribute('x') || '0');
            const y = parseFloat(textEl.getAttribute('y') || '0');
            const content = textEl.textContent?.trim() || '';

            if (content.length > 0 && content.length < 100 && (x !== 0 || y !== 0)) {
                const roomInfo = parseRoomLabel(content);
                
                if (roomInfo && !processedLabels.has(roomInfo.name)) {
                    locations.push({
                        name: roomInfo.name,
                        x_coordinate: Math.round(x),
                        y_coordinate: Math.round(y),
                        type: roomInfo.type,
                        confidence: roomInfo.confidence,
                        source: 'text-element',
                    });
                    processedLabels.add(roomInfo.name);
                }
            }
        });

        // Strategy 2: Extract from <tspan> with parent coordinates
        console.log('   Strategy 2: Extracting from <tspan> elements...');
        const tspanElements = svgDoc.querySelectorAll('tspan');
        console.log(`   Found ${tspanElements.length} tspan elements`);

        tspanElements.forEach((tspanEl) => {
            const parent = tspanEl.parentElement;
            if (!parent) return;

            let x = parseFloat(tspanEl.getAttribute('x') || parent.getAttribute('x') || '0');
            let y = parseFloat(tspanEl.getAttribute('y') || parent.getAttribute('y') || '0');
            const content = tspanEl.textContent?.trim() || '';

            if (content.length > 0 && content.length < 100 && (x !== 0 || y !== 0)) {
                const roomInfo = parseRoomLabel(content);
                
                if (roomInfo && !processedLabels.has(roomInfo.name)) {
                    locations.push({
                        name: roomInfo.name,
                        x_coordinate: Math.round(x),
                        y_coordinate: Math.round(y),
                        type: roomInfo.type,
                        confidence: roomInfo.confidence,
                        source: 'tspan-element',
                    });
                    processedLabels.add(roomInfo.name);
                }
            }
        });

        // Strategy 3: Extract from data attributes (if SVG is annotated)
        console.log('   Strategy 3: Extracting from data attributes...');
        const dataElements = svgDoc.querySelectorAll('[data-location]');
        console.log(`   Found ${dataElements.length} data-location elements`);

        dataElements.forEach((el) => {
            const locationData = el.getAttribute('data-location');
            if (!locationData) return;

            try {
                const parsed = JSON.parse(locationData);
                const roomInfo = parseRoomLabel(parsed.name || '');
                
                if (roomInfo && !processedLabels.has(roomInfo.name)) {
                    locations.push({
                        name: roomInfo.name,
                        x_coordinate: parsed.x || 0,
                        y_coordinate: parsed.y || 0,
                        type: parsed.type || roomInfo.type,
                        confidence: 0.95,
                        source: 'data-attribute',
                    });
                    processedLabels.add(roomInfo.name);
                }
            } catch (e) {
                // Skip malformed data
            }
        });

        // Strategy 4: Extract from rect/circle title attributes
        console.log('   Strategy 4: Extracting from shape titles...');
        const shapes = svgDoc.querySelectorAll('rect[title], circle[title], ellipse[title]');
        console.log(`   Found ${shapes.length} shapes with titles`);

        shapes.forEach((shape) => {
            const title = shape.getAttribute('title');
            let x = parseFloat(shape.getAttribute('cx') || shape.getAttribute('x') || '0');
            let y = parseFloat(shape.getAttribute('cy') || shape.getAttribute('y') || '0');

            if (title && (x !== 0 || y !== 0)) {
                const roomInfo = parseRoomLabel(title);
                
                if (roomInfo && !processedLabels.has(roomInfo.name)) {
                    locations.push({
                        name: roomInfo.name,
                        x_coordinate: Math.round(x),
                        y_coordinate: Math.round(y),
                        type: roomInfo.type,
                        confidence: roomInfo.confidence,
                        source: 'shape-title',
                    });
                    processedLabels.add(roomInfo.name);
                }
            }
        });

        console.log(`✅ Extracted ${locations.length} total locations`);
        return locations;
    } catch (error) {
        console.error('❌ Extraction error:', error);
        return [];
    }
}

function parseRoomLabel(text: string): { name: string; type: string; confidence: number } | null {
    const cleanText = text.trim();

    if (cleanText.length === 0 || cleanText.length > 80) {
        return null;
    }

    // Skip coordinates and generic text
    if (/^\d+\.?\d*\s*,\s*\d+\.?\d*$/.test(cleanText) || /^[xy]$/i.test(cleanText)) {
        return null;
    }

    const typePatterns = [
        { pattern: /stair/i, type: 'stair' },
        { pattern: /elevator/i, type: 'elevator' },
        { pattern: /hallway|corridor|passage|hall\s/i, type: 'hallway' },
        { pattern: /conf|meeting|conference/i, type: 'room' },
        { pattern: /office|room|lab|library|lounge|cafeteria/i, type: 'room' },
        { pattern: /restroom|toilet|wc/i, type: 'room' },
        { pattern: /entrance|entry|exit/i, type: 'entrance' },
    ];

    let type = 'room';
    let confidence = 0.5;

    for (const { pattern, type: detectedType } of typePatterns) {
        if (pattern.test(cleanText)) {
            type = detectedType;
            confidence = 0.9;
            break;
        }
    }

    // Higher confidence for room numbers
    if (/^[A-Z]?\d{2,4}(:\d)?$/.test(cleanText)) {
        confidence = Math.max(confidence, 0.7);
    }

    return { name: cleanText, type, confidence };
}

export async function extractAllFloors() {
    const floorConfigs = [
        { file: 'library-basement', name: 'Basement', level: -1 },
        { file: 'library-ground', name: 'Ground', level: 0 },
        { file: 'library-first', name: 'First', level: 1 },
        { file: 'library-second', name: 'Second', level: 2 },
    ];

    const results = [];

    for (const floor of floorConfigs) {
        console.log(`\n📄 Processing ${floor.name}...`);
        const locations = await extractLocationsFromSvg(`/floor-plans/${floor.file}.svg`);

        if (locations.length === 0) {
            console.warn(`⚠️ No locations found in ${floor.name}`);
            continue;
        }

        results.push({
            file: floor.file,
            name: floor.name,
            level: floor.level,
            locations,
            count: locations.length,
        });

        console.log(`✅ ${floor.name}: ${locations.length} locations`);
    }

    return results;
}
