/**
 * Batch SVG-to-GeoJSON Extraction Utility
 * Extracts all floor plans and optionally saves to server
 */

import { extractOfficesFromSVG, generateGeoJSON, type ExtractedOffice, type GeoJSONFeatureCollection } from './svgExtractor';

export interface FloorConfig {
    fileName: string;
    floorName: string;
    floorLevel: number;
}

const FLOOR_CONFIGS: FloorConfig[] = [
    { fileName: 'library-basement', floorName: 'Basement', floorLevel: -1 },
    { fileName: 'library-ground', floorName: 'Ground', floorLevel: 0 },
    { fileName: 'library-first', floorName: 'First', floorLevel: 1 },
    { fileName: 'library-second', floorName: 'Second', floorLevel: 2 },
];

export interface ExtractionResult {
    floor: string;
    fileName: string;
    count: number;
    offices: ExtractedOffice[];
    geojson: GeoJSONFeatureCollection;
    status: 'success' | 'failed';
    error?: string;
}

export async function extractAllFloorPlans(): Promise<ExtractionResult[]> {
    console.log('🏗️  Starting bulk SVG-to-GeoJSON extraction...\n');

    const results: ExtractionResult[] = [];

    // Map to the actual SVG file locations with spaces
    const svgMappings = [
        { fileName: 'library-basement', floorName: 'Basement', floorLevel: -1, svgFile: 'Basement 1.5.svg' },
        { fileName: 'library-ground', floorName: 'Ground', floorLevel: 0, svgFile: 'Ground 1.5.svg' },
        { fileName: 'library-first', floorName: 'First', floorLevel: 1, svgFile: 'First 1.5.svg' },
        { fileName: 'library-second', floorName: 'Second', floorLevel: 2, svgFile: 'Second 1.5.svg' },
    ];

    for (const floor of svgMappings) {
        try {
            console.log(`📄 Processing: ${floor.svgFile}...`);

            const svgUrl = `/Floor Plans/${floor.svgFile}`;
            const offices = await extractOfficesFromSVG(svgUrl);

            if (offices.length === 0) {
                console.warn(`⚠️  No offices extracted from ${floor.svgFile}`);
                results.push({
                    floor: floor.floorName,
                    fileName: floor.fileName,
                    count: 0,
                    offices: [],
                    geojson: { type: 'FeatureCollection', features: [] },
                    status: 'failed',
                    error: 'No offices found in SVG',
                });
                continue;
            }

            const geojson = generateGeoJSON(offices, floor.floorName);

            // Log sample data
            console.log(
                `✅ ${floor.floorName}: ${offices.length} locations extracted`
            );
            console.log(
                `   Samples: ${offices.slice(0, 3).map((o) => `${o.name} (${o.type})`).join(', ')}`
            );

            results.push({
                floor: floor.floorName,
                fileName: floor.fileName,
                count: offices.length,
                offices,
                geojson,
                status: 'success',
            });

            // Save to localStorage for immediate use
            localStorage.setItem(
                `geojson-${floor.fileName}`,
                JSON.stringify(geojson)
            );
        } catch (error) {
            console.error(`❌ Error processing ${floor.svgFile}:`, error);
            results.push({
                floor: floor.floorName,
                fileName: floor.fileName,
                count: 0,
                offices: [],
                geojson: { type: 'FeatureCollection', features: [] },
                status: 'failed',
                error: String(error),
            });
        }
    }

    console.log('\n✨ Extraction complete!');
    return results;
}

export async function saveAllGeoJSONToServer(results: ExtractionResult[]): Promise<void> {
    console.log('\n💾 Saving GeoJSON files to server...\n');

    for (const result of results) {
        if (result.status === 'failed') {
            console.warn(`⏭️  Skipping ${result.floor} (extraction failed)`);
            continue;
        }

        try {
            const response = await fetch('/api/save-geojson', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileName: result.fileName,
                    floorName: result.floor,
                    geojson: result.geojson,
                }),
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();
            console.log(`✅ Saved ${result.floor}: ${result.fileName}.geojson`);
        } catch (error) {
            console.error(`❌ Failed to save ${result.floor}:`, error);
        }
    }

    console.log('\n✨ Save complete!');
}

export async function seedAllFloorPlansToDatabase(results: ExtractionResult[]): Promise<void> {
    console.log('\n🗄️  Seeding floor plan data to database...\n');

    for (const result of results) {
        if (result.status === 'failed') {
            console.warn(`⏭️  Skipping ${result.floor} (extraction failed)`);
            continue;
        }

        try {
            const response = await fetch('/api/seed-floor-locations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    floor: result.floor,
                    fileName: result.fileName,
                    geojson: result.geojson,
                }),
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();
            console.log(`✅ Seeded ${result.floor}: ${data.count} locations`);
        } catch (error) {
            console.error(`❌ Failed to seed ${result.floor}:`, error);
        }
    }

    console.log('\n✨ Seeding complete!');
}

/**
 * Main function: Extract, save, and seed all floor plans
 */
export async function processAllFloorPlans(): Promise<void> {
    const results = await extractAllFloorPlans();
    await saveAllGeoJSONToServer(results);
    await seedAllFloorPlansToDatabase(results);
}
