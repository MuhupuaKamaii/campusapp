/**
 * Advanced SVG Floor Plan to GeoJSON Converter
 * Handles Library floor plans with text labels and colored regions
 */

export interface ExtractedOffice {
    id: string;
    name: string;
    type: 'room' | 'hallway' | 'stair' | 'elevator' | 'department' | 'entrance';
    x: number;
    y: number;
    area?: number;
}

export interface GeoJSONFeature {
    type: 'Feature';
    properties: Record<string, any>;
    geometry: {
        type: 'Point';
        coordinates: [number, number];
    };
}

export interface GeoJSONFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJSONFeature[];
}

export async function extractOfficesFromSVG(svgUrl: string): Promise<ExtractedOffice[]> {
    try {
        const response = await fetch(svgUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch SVG: ${response.statusText}`);
        }

        const svgText = await response.text();

        // Parse SVG using DOMParser
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');

        if (svgDoc.documentElement.tagName !== 'svg') {
            throw new Error('Invalid SVG document');
        }

        const offices: ExtractedOffice[] = [];
        const processedLabels = new Set<string>();

        // Strategy 1: Extract text elements with coordinates
        const textElements = svgDoc.querySelectorAll('text');
        const textMap = new Map<string, ExtractedOffice>();

        textElements.forEach((text) => {
            const x = parseFloat(text.getAttribute('x') || '0');
            const y = parseFloat(text.getAttribute('y') || '0');
            const content = text.textContent?.trim() || '';
            const fill = text.getAttribute('fill') || text.style.fill || '#000000';

            if (content.length === 0 || content === ' ') return;

            // Store text with its position
            const key = `${Math.round(x)}-${Math.round(y)}`;
            if (!textMap.has(key)) {
                textMap.set(key, {
                    id: content,
                    name: content,
                    type: classifyOfficeType(content),
                    x,
                    y,
                });
            }
        });

        // Group related text labels (room names + IDs + areas)
        const groupedOffices = groupRelatedLabels(Array.from(textMap.values()));

        groupedOffices.forEach((office) => {
            if (!processedLabels.has(office.id)) {
                offices.push(office);
                processedLabels.add(office.id);
            }
        });

        // Strategy 2: Extract from rectangles with attached labels
        const rects = svgDoc.querySelectorAll('rect');
        rects.forEach((rect) => {
            const x = parseFloat(rect.getAttribute('x') || '0');
            const y = parseFloat(rect.getAttribute('y') || '0');
            const width = parseFloat(rect.getAttribute('width') || '0');
            const height = parseFloat(rect.getAttribute('height') || '0');
            const centerX = x + width / 2;
            const centerY = y + height / 2;

            // Find nearby text labels
            const nearbyLabels = Array.from(textMap.values()).filter(
                (office) =>
                    Math.abs(office.x - centerX) < 50 && Math.abs(office.y - centerY) < 50
            );

            if (nearbyLabels.length > 0 && !processedLabels.has(nearbyLabels[0].id)) {
                const office = {
                    ...nearbyLabels[0],
                    x: centerX,
                    y: centerY,
                };
                offices.push(office);
                processedLabels.add(office.id);
            }
        });

        // Strategy 3: Extract circles (common for navigation nodes)
        const circles = svgDoc.querySelectorAll('circle');
        circles.forEach((circle) => {
            const cx = parseFloat(circle.getAttribute('cx') || '0');
            const cy = parseFloat(circle.getAttribute('cy') || '0');

            // Find nearby text
            const nearbyText = Array.from(textMap.values()).find(
                (office) => Math.abs(office.x - cx) < 30 && Math.abs(office.y - cy) < 30
            );

            if (nearbyText && !processedLabels.has(nearbyText.id)) {
                offices.push({
                    ...nearbyText,
                    x: cx,
                    y: cy,
                });
                processedLabels.add(nearbyText.id);
            }
        });

        console.log(`✅ Extracted ${offices.length} offices from SVG`);
        return offices;
    } catch (error) {
        console.error('❌ SVG Extraction Error:', error);
        return [];
    }
}

export async function extractPathsFromSVG(svgUrl: string): Promise<Array<{ from: string; to: string }>> {
    try {
        const response = await fetch(svgUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch SVG: ${response.statusText}`);
        }

        const svgText = await response.text();
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');

        const paths: Array<{ from: string; to: string }> = [];

        // Extract from line elements with data attributes
        svgDoc.querySelectorAll('line[data-from][data-to]').forEach((line) => {
            const from = line.getAttribute('data-from');
            const to = line.getAttribute('data-to');
            if (from && to) {
                paths.push({ from, to });
            }
        });

        return paths;
    } catch (error) {
        console.error('❌ Path Extraction Error:', error);
        return [];
    }
}

function groupRelatedLabels(textOffices: ExtractedOffice[]): ExtractedOffice[] {
    const grouped: Map<string, ExtractedOffice> = new Map();

    textOffices.forEach((office) => {
        // Extract room ID (e.g., "B3:1" from "B3:1, 20.1m²")
        const roomIdMatch = office.name.match(/^([A-Z0-9:]+)/);
        const roomId = roomIdMatch ? roomIdMatch[1].trim() : office.name;

        // Extract area if present (e.g., "46.2m²")
        const areaMatch = office.name.match(/(\d+\.?\d*)\s*m²/);
        const area = areaMatch ? parseFloat(areaMatch[1]) : undefined;

        // Get room name (full text or derived from ID)
        const roomName = office.name.includes('\n')
            ? office.name.split('\n')[0].trim()
            : office.name;

        if (!grouped.has(roomId)) {
            grouped.set(roomId, {
                id: roomId,
                name: roomName,
                type: office.type,
                x: office.x,
                y: office.y,
                area,
            });
        } else {
            // Update with better data if available
            const existing = grouped.get(roomId)!;
            if (office.name.length > existing.name.length) {
                existing.name = roomName;
            }
            if (area) {
                existing.area = area;
            }
        }
    });

    return Array.from(grouped.values());
}

function classifyOfficeType(
    label: string
): 'room' | 'hallway' | 'stair' | 'elevator' | 'department' | 'entrance' {
    const lower = label.toLowerCase();

    if (lower.includes('stair') || lower.includes('stairs')) return 'stair';
    if (lower.includes('elevator') || lower.includes('lift')) return 'elevator';
    if (
        lower.includes('hall') ||
        lower.includes('corridor') ||
        lower.includes('passage')
    )
        return 'hallway';
    if (lower.includes('entrance') || lower.includes('entry') || lower.includes('main'))
        return 'entrance';
    if (
        lower.includes('department') ||
        lower.includes('office') ||
        lower.includes('reception')
    )
        return 'department';

    return 'room';
}

export function generateGeoJSON(
    offices: ExtractedOffice[],
    floorName: string
): GeoJSONFeatureCollection {
    return {
        type: 'FeatureCollection',
        features: offices.map((office, index) => ({
            type: 'Feature',
            properties: {
                id: index + 1,
                name: office.name,
                room_id: office.id,
                type: office.type,
                floor: floorName,
                area_sqm: office.area,
            },
            geometry: {
                type: 'Point',
                coordinates: [Math.round(office.x), Math.round(office.y)],
            },
        })),
    };
}
