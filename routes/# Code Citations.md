# Code Citations

## License: unknown
https://github.com/faizzed/weird-salads/blob/e89d23b909086a04243290b0fbb6a191950d35ab/app/javascript/components/common/api.ts

```
I can see the issue - the extraction is failing because the SVG floor plans might have a different structure than expected. Let me create a diagnostic tool to inspect the SVG structure and then fix the extraction:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\utils\svgDiagnostics.ts

/**
 * SVG Diagnostic Tool - Analyzes SVG structure to help with extraction
 */

export interface SvgAnalysis {
    fileName: string;
    hasText: boolean;
    textCount: number;
    hasTspan: boolean;
    tspanCount: number;
    hasGroups: boolean;
    groupCount: number;
    textSamples: Array<{ text: string; x: string; y: string }>;
    groupLabels: Array<{ label: string; children: number }>;
    svgDimensions: { width: string; height: string };
    xmlns: string;
}

export async function diagnoseSvg(svgUrl: string): Promise<SvgAnalysis | null> {
    try {
        const response = await fetch(svgUrl);
        const svgText = await response.text();

        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const root = svgDoc.documentElement;

        if (root.tagName !== 'svg') {
            console.error('Invalid SVG document');
            return null;
        }

        // Get text elements
        const textElements = svgDoc.querySelectorAll('text');
        const textSamples: Array<{ text: string; x: string; y: string }> = [];
        
        textElements.forEach((el, i) => {
            if (i < 10) { // First 10 samples
                textSamples.push({
                    text: el.textContent?.trim().substring(0, 50) || '',
                    x: el.getAttribute('x') || 'none',
                    y: el.getAttribute('y') || 'none',
                });
            }
        });

        // Get tspan elements
        const tspanElements = svgDoc.querySelectorAll('tspan');

        // Get groups
        const groups = svgDoc.querySelectorAll('g');
        const groupLabels: Array<{ label: string; children: number }> = [];
        
        groups.forEach((g, i) => {
            if (i < 10) {
                const label = g.getAttribute('id') || g.getAttribute('class') || `Group ${i}`;
                const children = g.children.length;
                groupLabels.push({ label, children });
            }
        });

        const analysis: SvgAnalysis = {
            fileName: svgUrl.split('/').pop() || 'unknown',
            hasText: textElements.length > 0,
            textCount: textElements.length,
            hasTspan: tspanElements.length > 0,
            tspanCount: tspanElements.length,
            hasGroups: groups.length > 0,
            groupCount: groups.length,
            textSamples,
            groupLabels,
            svgDimensions: {
                width: root.getAttribute('width') || 'auto',
                height: root.getAttribute('height') || 'auto',
            },
            xmlns: root.getAttribute('xmlns') || 'none',
        };

        return analysis;
    } catch (error) {
        console.error('Diagnostic error:', error);
        return null;
    }
}

export async function diagnoseAllFloorPlans() {
    const floors = ['basement', 'ground', 'first', 'second'];
    const results: Record<string, SvgAnalysis | null> = {};

    for (const floor of floors) {
        console.log(`\n🔍 Analyzing library-${floor}.svg...`);
        const analysis = await diagnoseSvg(`/floor-plans/library-${floor}.svg`);
        
        if (analysis) {
            results[floor] = analysis;
            console.log(`✅ ${floor}:`);
            console.log(`   Text elements: ${analysis.textCount}`);
            console.log(`   Tspan elements: ${analysis.tspanCount}`);
            console.log(`   Groups: ${analysis.groupCount}`);
            console.log(`   Dimensions: ${analysis.svgDimensions.width} x ${analysis.svgDimensions.height}`);
            console.log(`   Samples:`, analysis.textSamples);
        } else {
            console.warn(`❌ Failed to analyze ${floor}`);
        }
    }

    return results;
}
````

Now let's create an improved SVG extractor that handles various SVG structures:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\utils\improvedSvgExtractor.ts

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
````

Now update the IndoorNavigation page to use the improved extractor and show diagnostic info:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\pages\IndoorNavigation.tsx
// Replace the handleExtractFloorPlans function with:

import { extractAllFloors } from '@/utils/improvedSvgExtractor';
import { diagnoseAllFloorPlans } from '@/utils/svgDiagnostics';

// ... inside the component ...

const handleExtractFloorPlans = async () => {
    if (!window.confirm('Extract all floor plans? This will analyze the SVG structure and extract room labels.')) {
        return;
    }

    setExtracting(true);
    setExtractionStatus('🔍 Analyzing SVG structure...');

    try {
        // Step 0: Diagnose SVG structure
        console.log('=== Starting SVG Diagnosis ===');
        const diagnosis = await diagnoseAllFloorPlans();
        console.log('SVG Analysis:', diagnosis);

        // Step 1: Extract locations
        setExtractionStatus('Step 1/3: Extracting room labels from SVG...');
        console.log('=== Starting Extraction ===');
        const extractionResults = await extractAllFloors();

        if (extractionResults.length === 0) {
            throw new Error('No locations extracted. Check browser console for SVG analysis details.');
        }

        // Step 2: Seed database
        setExtractionStatus('Step 2/3: Saving to database...');
        
        const response = await fetch('/api/seed-floor-locations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify({
                
```


## License: unknown
https://github.com/faizzed/weird-salads/blob/e89d23b909086a04243290b0fbb6a191950d35ab/app/javascript/components/common/api.ts

```
I can see the issue - the extraction is failing because the SVG floor plans might have a different structure than expected. Let me create a diagnostic tool to inspect the SVG structure and then fix the extraction:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\utils\svgDiagnostics.ts

/**
 * SVG Diagnostic Tool - Analyzes SVG structure to help with extraction
 */

export interface SvgAnalysis {
    fileName: string;
    hasText: boolean;
    textCount: number;
    hasTspan: boolean;
    tspanCount: number;
    hasGroups: boolean;
    groupCount: number;
    textSamples: Array<{ text: string; x: string; y: string }>;
    groupLabels: Array<{ label: string; children: number }>;
    svgDimensions: { width: string; height: string };
    xmlns: string;
}

export async function diagnoseSvg(svgUrl: string): Promise<SvgAnalysis | null> {
    try {
        const response = await fetch(svgUrl);
        const svgText = await response.text();

        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const root = svgDoc.documentElement;

        if (root.tagName !== 'svg') {
            console.error('Invalid SVG document');
            return null;
        }

        // Get text elements
        const textElements = svgDoc.querySelectorAll('text');
        const textSamples: Array<{ text: string; x: string; y: string }> = [];
        
        textElements.forEach((el, i) => {
            if (i < 10) { // First 10 samples
                textSamples.push({
                    text: el.textContent?.trim().substring(0, 50) || '',
                    x: el.getAttribute('x') || 'none',
                    y: el.getAttribute('y') || 'none',
                });
            }
        });

        // Get tspan elements
        const tspanElements = svgDoc.querySelectorAll('tspan');

        // Get groups
        const groups = svgDoc.querySelectorAll('g');
        const groupLabels: Array<{ label: string; children: number }> = [];
        
        groups.forEach((g, i) => {
            if (i < 10) {
                const label = g.getAttribute('id') || g.getAttribute('class') || `Group ${i}`;
                const children = g.children.length;
                groupLabels.push({ label, children });
            }
        });

        const analysis: SvgAnalysis = {
            fileName: svgUrl.split('/').pop() || 'unknown',
            hasText: textElements.length > 0,
            textCount: textElements.length,
            hasTspan: tspanElements.length > 0,
            tspanCount: tspanElements.length,
            hasGroups: groups.length > 0,
            groupCount: groups.length,
            textSamples,
            groupLabels,
            svgDimensions: {
                width: root.getAttribute('width') || 'auto',
                height: root.getAttribute('height') || 'auto',
            },
            xmlns: root.getAttribute('xmlns') || 'none',
        };

        return analysis;
    } catch (error) {
        console.error('Diagnostic error:', error);
        return null;
    }
}

export async function diagnoseAllFloorPlans() {
    const floors = ['basement', 'ground', 'first', 'second'];
    const results: Record<string, SvgAnalysis | null> = {};

    for (const floor of floors) {
        console.log(`\n🔍 Analyzing library-${floor}.svg...`);
        const analysis = await diagnoseSvg(`/floor-plans/library-${floor}.svg`);
        
        if (analysis) {
            results[floor] = analysis;
            console.log(`✅ ${floor}:`);
            console.log(`   Text elements: ${analysis.textCount}`);
            console.log(`   Tspan elements: ${analysis.tspanCount}`);
            console.log(`   Groups: ${analysis.groupCount}`);
            console.log(`   Dimensions: ${analysis.svgDimensions.width} x ${analysis.svgDimensions.height}`);
            console.log(`   Samples:`, analysis.textSamples);
        } else {
            console.warn(`❌ Failed to analyze ${floor}`);
        }
    }

    return results;
}
````

Now let's create an improved SVG extractor that handles various SVG structures:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\utils\improvedSvgExtractor.ts

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
````

Now update the IndoorNavigation page to use the improved extractor and show diagnostic info:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\pages\IndoorNavigation.tsx
// Replace the handleExtractFloorPlans function with:

import { extractAllFloors } from '@/utils/improvedSvgExtractor';
import { diagnoseAllFloorPlans } from '@/utils/svgDiagnostics';

// ... inside the component ...

const handleExtractFloorPlans = async () => {
    if (!window.confirm('Extract all floor plans? This will analyze the SVG structure and extract room labels.')) {
        return;
    }

    setExtracting(true);
    setExtractionStatus('🔍 Analyzing SVG structure...');

    try {
        // Step 0: Diagnose SVG structure
        console.log('=== Starting SVG Diagnosis ===');
        const diagnosis = await diagnoseAllFloorPlans();
        console.log('SVG Analysis:', diagnosis);

        // Step 1: Extract locations
        setExtractionStatus('Step 1/3: Extracting room labels from SVG...');
        console.log('=== Starting Extraction ===');
        const extractionResults = await extractAllFloors();

        if (extractionResults.length === 0) {
            throw new Error('No locations extracted. Check browser console for SVG analysis details.');
        }

        // Step 2: Seed database
        setExtractionStatus('Step 2/3: Saving to database...');
        
        const response = await fetch('/api/seed-floor-locations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify({
                
```


## License: unknown
https://github.com/faizzed/weird-salads/blob/e89d23b909086a04243290b0fbb6a191950d35ab/app/javascript/components/common/api.ts

```
I can see the issue - the extraction is failing because the SVG floor plans might have a different structure than expected. Let me create a diagnostic tool to inspect the SVG structure and then fix the extraction:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\utils\svgDiagnostics.ts

/**
 * SVG Diagnostic Tool - Analyzes SVG structure to help with extraction
 */

export interface SvgAnalysis {
    fileName: string;
    hasText: boolean;
    textCount: number;
    hasTspan: boolean;
    tspanCount: number;
    hasGroups: boolean;
    groupCount: number;
    textSamples: Array<{ text: string; x: string; y: string }>;
    groupLabels: Array<{ label: string; children: number }>;
    svgDimensions: { width: string; height: string };
    xmlns: string;
}

export async function diagnoseSvg(svgUrl: string): Promise<SvgAnalysis | null> {
    try {
        const response = await fetch(svgUrl);
        const svgText = await response.text();

        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const root = svgDoc.documentElement;

        if (root.tagName !== 'svg') {
            console.error('Invalid SVG document');
            return null;
        }

        // Get text elements
        const textElements = svgDoc.querySelectorAll('text');
        const textSamples: Array<{ text: string; x: string; y: string }> = [];
        
        textElements.forEach((el, i) => {
            if (i < 10) { // First 10 samples
                textSamples.push({
                    text: el.textContent?.trim().substring(0, 50) || '',
                    x: el.getAttribute('x') || 'none',
                    y: el.getAttribute('y') || 'none',
                });
            }
        });

        // Get tspan elements
        const tspanElements = svgDoc.querySelectorAll('tspan');

        // Get groups
        const groups = svgDoc.querySelectorAll('g');
        const groupLabels: Array<{ label: string; children: number }> = [];
        
        groups.forEach((g, i) => {
            if (i < 10) {
                const label = g.getAttribute('id') || g.getAttribute('class') || `Group ${i}`;
                const children = g.children.length;
                groupLabels.push({ label, children });
            }
        });

        const analysis: SvgAnalysis = {
            fileName: svgUrl.split('/').pop() || 'unknown',
            hasText: textElements.length > 0,
            textCount: textElements.length,
            hasTspan: tspanElements.length > 0,
            tspanCount: tspanElements.length,
            hasGroups: groups.length > 0,
            groupCount: groups.length,
            textSamples,
            groupLabels,
            svgDimensions: {
                width: root.getAttribute('width') || 'auto',
                height: root.getAttribute('height') || 'auto',
            },
            xmlns: root.getAttribute('xmlns') || 'none',
        };

        return analysis;
    } catch (error) {
        console.error('Diagnostic error:', error);
        return null;
    }
}

export async function diagnoseAllFloorPlans() {
    const floors = ['basement', 'ground', 'first', 'second'];
    const results: Record<string, SvgAnalysis | null> = {};

    for (const floor of floors) {
        console.log(`\n🔍 Analyzing library-${floor}.svg...`);
        const analysis = await diagnoseSvg(`/floor-plans/library-${floor}.svg`);
        
        if (analysis) {
            results[floor] = analysis;
            console.log(`✅ ${floor}:`);
            console.log(`   Text elements: ${analysis.textCount}`);
            console.log(`   Tspan elements: ${analysis.tspanCount}`);
            console.log(`   Groups: ${analysis.groupCount}`);
            console.log(`   Dimensions: ${analysis.svgDimensions.width} x ${analysis.svgDimensions.height}`);
            console.log(`   Samples:`, analysis.textSamples);
        } else {
            console.warn(`❌ Failed to analyze ${floor}`);
        }
    }

    return results;
}
````

Now let's create an improved SVG extractor that handles various SVG structures:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\utils\improvedSvgExtractor.ts

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
````

Now update the IndoorNavigation page to use the improved extractor and show diagnostic info:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\pages\IndoorNavigation.tsx
// Replace the handleExtractFloorPlans function with:

import { extractAllFloors } from '@/utils/improvedSvgExtractor';
import { diagnoseAllFloorPlans } from '@/utils/svgDiagnostics';

// ... inside the component ...

const handleExtractFloorPlans = async () => {
    if (!window.confirm('Extract all floor plans? This will analyze the SVG structure and extract room labels.')) {
        return;
    }

    setExtracting(true);
    setExtractionStatus('🔍 Analyzing SVG structure...');

    try {
        // Step 0: Diagnose SVG structure
        console.log('=== Starting SVG Diagnosis ===');
        const diagnosis = await diagnoseAllFloorPlans();
        console.log('SVG Analysis:', diagnosis);

        // Step 1: Extract locations
        setExtractionStatus('Step 1/3: Extracting room labels from SVG...');
        console.log('=== Starting Extraction ===');
        const extractionResults = await extractAllFloors();

        if (extractionResults.length === 0) {
            throw new Error('No locations extracted. Check browser console for SVG analysis details.');
        }

        // Step 2: Seed database
        setExtractionStatus('Step 2/3: Saving to database...');
        
        const response = await fetch('/api/seed-floor-locations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify({
                
```


## License: unknown
https://github.com/faizzed/weird-salads/blob/e89d23b909086a04243290b0fbb6a191950d35ab/app/javascript/components/common/api.ts

```
I can see the issue - the extraction is failing because the SVG floor plans might have a different structure than expected. Let me create a diagnostic tool to inspect the SVG structure and then fix the extraction:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\utils\svgDiagnostics.ts

/**
 * SVG Diagnostic Tool - Analyzes SVG structure to help with extraction
 */

export interface SvgAnalysis {
    fileName: string;
    hasText: boolean;
    textCount: number;
    hasTspan: boolean;
    tspanCount: number;
    hasGroups: boolean;
    groupCount: number;
    textSamples: Array<{ text: string; x: string; y: string }>;
    groupLabels: Array<{ label: string; children: number }>;
    svgDimensions: { width: string; height: string };
    xmlns: string;
}

export async function diagnoseSvg(svgUrl: string): Promise<SvgAnalysis | null> {
    try {
        const response = await fetch(svgUrl);
        const svgText = await response.text();

        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const root = svgDoc.documentElement;

        if (root.tagName !== 'svg') {
            console.error('Invalid SVG document');
            return null;
        }

        // Get text elements
        const textElements = svgDoc.querySelectorAll('text');
        const textSamples: Array<{ text: string; x: string; y: string }> = [];
        
        textElements.forEach((el, i) => {
            if (i < 10) { // First 10 samples
                textSamples.push({
                    text: el.textContent?.trim().substring(0, 50) || '',
                    x: el.getAttribute('x') || 'none',
                    y: el.getAttribute('y') || 'none',
                });
            }
        });

        // Get tspan elements
        const tspanElements = svgDoc.querySelectorAll('tspan');

        // Get groups
        const groups = svgDoc.querySelectorAll('g');
        const groupLabels: Array<{ label: string; children: number }> = [];
        
        groups.forEach((g, i) => {
            if (i < 10) {
                const label = g.getAttribute('id') || g.getAttribute('class') || `Group ${i}`;
                const children = g.children.length;
                groupLabels.push({ label, children });
            }
        });

        const analysis: SvgAnalysis = {
            fileName: svgUrl.split('/').pop() || 'unknown',
            hasText: textElements.length > 0,
            textCount: textElements.length,
            hasTspan: tspanElements.length > 0,
            tspanCount: tspanElements.length,
            hasGroups: groups.length > 0,
            groupCount: groups.length,
            textSamples,
            groupLabels,
            svgDimensions: {
                width: root.getAttribute('width') || 'auto',
                height: root.getAttribute('height') || 'auto',
            },
            xmlns: root.getAttribute('xmlns') || 'none',
        };

        return analysis;
    } catch (error) {
        console.error('Diagnostic error:', error);
        return null;
    }
}

export async function diagnoseAllFloorPlans() {
    const floors = ['basement', 'ground', 'first', 'second'];
    const results: Record<string, SvgAnalysis | null> = {};

    for (const floor of floors) {
        console.log(`\n🔍 Analyzing library-${floor}.svg...`);
        const analysis = await diagnoseSvg(`/floor-plans/library-${floor}.svg`);
        
        if (analysis) {
            results[floor] = analysis;
            console.log(`✅ ${floor}:`);
            console.log(`   Text elements: ${analysis.textCount}`);
            console.log(`   Tspan elements: ${analysis.tspanCount}`);
            console.log(`   Groups: ${analysis.groupCount}`);
            console.log(`   Dimensions: ${analysis.svgDimensions.width} x ${analysis.svgDimensions.height}`);
            console.log(`   Samples:`, analysis.textSamples);
        } else {
            console.warn(`❌ Failed to analyze ${floor}`);
        }
    }

    return results;
}
````

Now let's create an improved SVG extractor that handles various SVG structures:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\utils\improvedSvgExtractor.ts

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
````

Now update the IndoorNavigation page to use the improved extractor and show diagnostic info:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\pages\IndoorNavigation.tsx
// Replace the handleExtractFloorPlans function with:

import { extractAllFloors } from '@/utils/improvedSvgExtractor';
import { diagnoseAllFloorPlans } from '@/utils/svgDiagnostics';

// ... inside the component ...

const handleExtractFloorPlans = async () => {
    if (!window.confirm('Extract all floor plans? This will analyze the SVG structure and extract room labels.')) {
        return;
    }

    setExtracting(true);
    setExtractionStatus('🔍 Analyzing SVG structure...');

    try {
        // Step 0: Diagnose SVG structure
        console.log('=== Starting SVG Diagnosis ===');
        const diagnosis = await diagnoseAllFloorPlans();
        console.log('SVG Analysis:', diagnosis);

        // Step 1: Extract locations
        setExtractionStatus('Step 1/3: Extracting room labels from SVG...');
        console.log('=== Starting Extraction ===');
        const extractionResults = await extractAllFloors();

        if (extractionResults.length === 0) {
            throw new Error('No locations extracted. Check browser console for SVG analysis details.');
        }

        // Step 2: Seed database
        setExtractionStatus('Step 2/3: Saving to database...');
        
        const response = await fetch('/api/seed-floor-locations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify({
                
```


## License: unknown
https://github.com/faizzed/weird-salads/blob/e89d23b909086a04243290b0fbb6a191950d35ab/app/javascript/components/common/api.ts

```
I can see the issue - the extraction is failing because the SVG floor plans might have a different structure than expected. Let me create a diagnostic tool to inspect the SVG structure and then fix the extraction:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\utils\svgDiagnostics.ts

/**
 * SVG Diagnostic Tool - Analyzes SVG structure to help with extraction
 */

export interface SvgAnalysis {
    fileName: string;
    hasText: boolean;
    textCount: number;
    hasTspan: boolean;
    tspanCount: number;
    hasGroups: boolean;
    groupCount: number;
    textSamples: Array<{ text: string; x: string; y: string }>;
    groupLabels: Array<{ label: string; children: number }>;
    svgDimensions: { width: string; height: string };
    xmlns: string;
}

export async function diagnoseSvg(svgUrl: string): Promise<SvgAnalysis | null> {
    try {
        const response = await fetch(svgUrl);
        const svgText = await response.text();

        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const root = svgDoc.documentElement;

        if (root.tagName !== 'svg') {
            console.error('Invalid SVG document');
            return null;
        }

        // Get text elements
        const textElements = svgDoc.querySelectorAll('text');
        const textSamples: Array<{ text: string; x: string; y: string }> = [];
        
        textElements.forEach((el, i) => {
            if (i < 10) { // First 10 samples
                textSamples.push({
                    text: el.textContent?.trim().substring(0, 50) || '',
                    x: el.getAttribute('x') || 'none',
                    y: el.getAttribute('y') || 'none',
                });
            }
        });

        // Get tspan elements
        const tspanElements = svgDoc.querySelectorAll('tspan');

        // Get groups
        const groups = svgDoc.querySelectorAll('g');
        const groupLabels: Array<{ label: string; children: number }> = [];
        
        groups.forEach((g, i) => {
            if (i < 10) {
                const label = g.getAttribute('id') || g.getAttribute('class') || `Group ${i}`;
                const children = g.children.length;
                groupLabels.push({ label, children });
            }
        });

        const analysis: SvgAnalysis = {
            fileName: svgUrl.split('/').pop() || 'unknown',
            hasText: textElements.length > 0,
            textCount: textElements.length,
            hasTspan: tspanElements.length > 0,
            tspanCount: tspanElements.length,
            hasGroups: groups.length > 0,
            groupCount: groups.length,
            textSamples,
            groupLabels,
            svgDimensions: {
                width: root.getAttribute('width') || 'auto',
                height: root.getAttribute('height') || 'auto',
            },
            xmlns: root.getAttribute('xmlns') || 'none',
        };

        return analysis;
    } catch (error) {
        console.error('Diagnostic error:', error);
        return null;
    }
}

export async function diagnoseAllFloorPlans() {
    const floors = ['basement', 'ground', 'first', 'second'];
    const results: Record<string, SvgAnalysis | null> = {};

    for (const floor of floors) {
        console.log(`\n🔍 Analyzing library-${floor}.svg...`);
        const analysis = await diagnoseSvg(`/floor-plans/library-${floor}.svg`);
        
        if (analysis) {
            results[floor] = analysis;
            console.log(`✅ ${floor}:`);
            console.log(`   Text elements: ${analysis.textCount}`);
            console.log(`   Tspan elements: ${analysis.tspanCount}`);
            console.log(`   Groups: ${analysis.groupCount}`);
            console.log(`   Dimensions: ${analysis.svgDimensions.width} x ${analysis.svgDimensions.height}`);
            console.log(`   Samples:`, analysis.textSamples);
        } else {
            console.warn(`❌ Failed to analyze ${floor}`);
        }
    }

    return results;
}
````

Now let's create an improved SVG extractor that handles various SVG structures:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\utils\improvedSvgExtractor.ts

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
````

Now update the IndoorNavigation page to use the improved extractor and show diagnostic info:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\pages\IndoorNavigation.tsx
// Replace the handleExtractFloorPlans function with:

import { extractAllFloors } from '@/utils/improvedSvgExtractor';
import { diagnoseAllFloorPlans } from '@/utils/svgDiagnostics';

// ... inside the component ...

const handleExtractFloorPlans = async () => {
    if (!window.confirm('Extract all floor plans? This will analyze the SVG structure and extract room labels.')) {
        return;
    }

    setExtracting(true);
    setExtractionStatus('🔍 Analyzing SVG structure...');

    try {
        // Step 0: Diagnose SVG structure
        console.log('=== Starting SVG Diagnosis ===');
        const diagnosis = await diagnoseAllFloorPlans();
        console.log('SVG Analysis:', diagnosis);

        // Step 1: Extract locations
        setExtractionStatus('Step 1/3: Extracting room labels from SVG...');
        console.log('=== Starting Extraction ===');
        const extractionResults = await extractAllFloors();

        if (extractionResults.length === 0) {
            throw new Error('No locations extracted. Check browser console for SVG analysis details.');
        }

        // Step 2: Seed database
        setExtractionStatus('Step 2/3: Saving to database...');
        
        const response = await fetch('/api/seed-floor-locations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify({
                
```


## License: unknown
https://github.com/faizzed/weird-salads/blob/e89d23b909086a04243290b0fbb6a191950d35ab/app/javascript/components/common/api.ts

```
I can see the issue - the extraction is failing because the SVG floor plans might have a different structure than expected. Let me create a diagnostic tool to inspect the SVG structure and then fix the extraction:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\utils\svgDiagnostics.ts

/**
 * SVG Diagnostic Tool - Analyzes SVG structure to help with extraction
 */

export interface SvgAnalysis {
    fileName: string;
    hasText: boolean;
    textCount: number;
    hasTspan: boolean;
    tspanCount: number;
    hasGroups: boolean;
    groupCount: number;
    textSamples: Array<{ text: string; x: string; y: string }>;
    groupLabels: Array<{ label: string; children: number }>;
    svgDimensions: { width: string; height: string };
    xmlns: string;
}

export async function diagnoseSvg(svgUrl: string): Promise<SvgAnalysis | null> {
    try {
        const response = await fetch(svgUrl);
        const svgText = await response.text();

        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const root = svgDoc.documentElement;

        if (root.tagName !== 'svg') {
            console.error('Invalid SVG document');
            return null;
        }

        // Get text elements
        const textElements = svgDoc.querySelectorAll('text');
        const textSamples: Array<{ text: string; x: string; y: string }> = [];
        
        textElements.forEach((el, i) => {
            if (i < 10) { // First 10 samples
                textSamples.push({
                    text: el.textContent?.trim().substring(0, 50) || '',
                    x: el.getAttribute('x') || 'none',
                    y: el.getAttribute('y') || 'none',
                });
            }
        });

        // Get tspan elements
        const tspanElements = svgDoc.querySelectorAll('tspan');

        // Get groups
        const groups = svgDoc.querySelectorAll('g');
        const groupLabels: Array<{ label: string; children: number }> = [];
        
        groups.forEach((g, i) => {
            if (i < 10) {
                const label = g.getAttribute('id') || g.getAttribute('class') || `Group ${i}`;
                const children = g.children.length;
                groupLabels.push({ label, children });
            }
        });

        const analysis: SvgAnalysis = {
            fileName: svgUrl.split('/').pop() || 'unknown',
            hasText: textElements.length > 0,
            textCount: textElements.length,
            hasTspan: tspanElements.length > 0,
            tspanCount: tspanElements.length,
            hasGroups: groups.length > 0,
            groupCount: groups.length,
            textSamples,
            groupLabels,
            svgDimensions: {
                width: root.getAttribute('width') || 'auto',
                height: root.getAttribute('height') || 'auto',
            },
            xmlns: root.getAttribute('xmlns') || 'none',
        };

        return analysis;
    } catch (error) {
        console.error('Diagnostic error:', error);
        return null;
    }
}

export async function diagnoseAllFloorPlans() {
    const floors = ['basement', 'ground', 'first', 'second'];
    const results: Record<string, SvgAnalysis | null> = {};

    for (const floor of floors) {
        console.log(`\n🔍 Analyzing library-${floor}.svg...`);
        const analysis = await diagnoseSvg(`/floor-plans/library-${floor}.svg`);
        
        if (analysis) {
            results[floor] = analysis;
            console.log(`✅ ${floor}:`);
            console.log(`   Text elements: ${analysis.textCount}`);
            console.log(`   Tspan elements: ${analysis.tspanCount}`);
            console.log(`   Groups: ${analysis.groupCount}`);
            console.log(`   Dimensions: ${analysis.svgDimensions.width} x ${analysis.svgDimensions.height}`);
            console.log(`   Samples:`, analysis.textSamples);
        } else {
            console.warn(`❌ Failed to analyze ${floor}`);
        }
    }

    return results;
}
````

Now let's create an improved SVG extractor that handles various SVG structures:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\utils\improvedSvgExtractor.ts

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
````

Now update the IndoorNavigation page to use the improved extractor and show diagnostic info:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\pages\IndoorNavigation.tsx
// Replace the handleExtractFloorPlans function with:

import { extractAllFloors } from '@/utils/improvedSvgExtractor';
import { diagnoseAllFloorPlans } from '@/utils/svgDiagnostics';

// ... inside the component ...

const handleExtractFloorPlans = async () => {
    if (!window.confirm('Extract all floor plans? This will analyze the SVG structure and extract room labels.')) {
        return;
    }

    setExtracting(true);
    setExtractionStatus('🔍 Analyzing SVG structure...');

    try {
        // Step 0: Diagnose SVG structure
        console.log('=== Starting SVG Diagnosis ===');
        const diagnosis = await diagnoseAllFloorPlans();
        console.log('SVG Analysis:', diagnosis);

        // Step 1: Extract locations
        setExtractionStatus('Step 1/3: Extracting room labels from SVG...');
        console.log('=== Starting Extraction ===');
        const extractionResults = await extractAllFloors();

        if (extractionResults.length === 0) {
            throw new Error('No locations extracted. Check browser console for SVG analysis details.');
        }

        // Step 2: Seed database
        setExtractionStatus('Step 2/3: Saving to database...');
        
        const response = await fetch('/api/seed-floor-locations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify({
                
```


## License: unknown
https://github.com/faizzed/weird-salads/blob/e89d23b909086a04243290b0fbb6a191950d35ab/app/javascript/components/common/api.ts

```
I can see the issue - the extraction is failing because the SVG floor plans might have a different structure than expected. Let me create a diagnostic tool to inspect the SVG structure and then fix the extraction:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\utils\svgDiagnostics.ts

/**
 * SVG Diagnostic Tool - Analyzes SVG structure to help with extraction
 */

export interface SvgAnalysis {
    fileName: string;
    hasText: boolean;
    textCount: number;
    hasTspan: boolean;
    tspanCount: number;
    hasGroups: boolean;
    groupCount: number;
    textSamples: Array<{ text: string; x: string; y: string }>;
    groupLabels: Array<{ label: string; children: number }>;
    svgDimensions: { width: string; height: string };
    xmlns: string;
}

export async function diagnoseSvg(svgUrl: string): Promise<SvgAnalysis | null> {
    try {
        const response = await fetch(svgUrl);
        const svgText = await response.text();

        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const root = svgDoc.documentElement;

        if (root.tagName !== 'svg') {
            console.error('Invalid SVG document');
            return null;
        }

        // Get text elements
        const textElements = svgDoc.querySelectorAll('text');
        const textSamples: Array<{ text: string; x: string; y: string }> = [];
        
        textElements.forEach((el, i) => {
            if (i < 10) { // First 10 samples
                textSamples.push({
                    text: el.textContent?.trim().substring(0, 50) || '',
                    x: el.getAttribute('x') || 'none',
                    y: el.getAttribute('y') || 'none',
                });
            }
        });

        // Get tspan elements
        const tspanElements = svgDoc.querySelectorAll('tspan');

        // Get groups
        const groups = svgDoc.querySelectorAll('g');
        const groupLabels: Array<{ label: string; children: number }> = [];
        
        groups.forEach((g, i) => {
            if (i < 10) {
                const label = g.getAttribute('id') || g.getAttribute('class') || `Group ${i}`;
                const children = g.children.length;
                groupLabels.push({ label, children });
            }
        });

        const analysis: SvgAnalysis = {
            fileName: svgUrl.split('/').pop() || 'unknown',
            hasText: textElements.length > 0,
            textCount: textElements.length,
            hasTspan: tspanElements.length > 0,
            tspanCount: tspanElements.length,
            hasGroups: groups.length > 0,
            groupCount: groups.length,
            textSamples,
            groupLabels,
            svgDimensions: {
                width: root.getAttribute('width') || 'auto',
                height: root.getAttribute('height') || 'auto',
            },
            xmlns: root.getAttribute('xmlns') || 'none',
        };

        return analysis;
    } catch (error) {
        console.error('Diagnostic error:', error);
        return null;
    }
}

export async function diagnoseAllFloorPlans() {
    const floors = ['basement', 'ground', 'first', 'second'];
    const results: Record<string, SvgAnalysis | null> = {};

    for (const floor of floors) {
        console.log(`\n🔍 Analyzing library-${floor}.svg...`);
        const analysis = await diagnoseSvg(`/floor-plans/library-${floor}.svg`);
        
        if (analysis) {
            results[floor] = analysis;
            console.log(`✅ ${floor}:`);
            console.log(`   Text elements: ${analysis.textCount}`);
            console.log(`   Tspan elements: ${analysis.tspanCount}`);
            console.log(`   Groups: ${analysis.groupCount}`);
            console.log(`   Dimensions: ${analysis.svgDimensions.width} x ${analysis.svgDimensions.height}`);
            console.log(`   Samples:`, analysis.textSamples);
        } else {
            console.warn(`❌ Failed to analyze ${floor}`);
        }
    }

    return results;
}
````

Now let's create an improved SVG extractor that handles various SVG structures:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\utils\improvedSvgExtractor.ts

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
````

Now update the IndoorNavigation page to use the improved extractor and show diagnostic info:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\pages\IndoorNavigation.tsx
// Replace the handleExtractFloorPlans function with:

import { extractAllFloors } from '@/utils/improvedSvgExtractor';
import { diagnoseAllFloorPlans } from '@/utils/svgDiagnostics';

// ... inside the component ...

const handleExtractFloorPlans = async () => {
    if (!window.confirm('Extract all floor plans? This will analyze the SVG structure and extract room labels.')) {
        return;
    }

    setExtracting(true);
    setExtractionStatus('🔍 Analyzing SVG structure...');

    try {
        // Step 0: Diagnose SVG structure
        console.log('=== Starting SVG Diagnosis ===');
        const diagnosis = await diagnoseAllFloorPlans();
        console.log('SVG Analysis:', diagnosis);

        // Step 1: Extract locations
        setExtractionStatus('Step 1/3: Extracting room labels from SVG...');
        console.log('=== Starting Extraction ===');
        const extractionResults = await extractAllFloors();

        if (extractionResults.length === 0) {
            throw new Error('No locations extracted. Check browser console for SVG analysis details.');
        }

        // Step 2: Seed database
        setExtractionStatus('Step 2/3: Saving to database...');
        
        const response = await fetch('/api/seed-floor-locations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify({
                
```


## License: unknown
https://github.com/faizzed/weird-salads/blob/e89d23b909086a04243290b0fbb6a191950d35ab/app/javascript/components/common/api.ts

```
I can see the issue - the extraction is failing because the SVG floor plans might have a different structure than expected. Let me create a diagnostic tool to inspect the SVG structure and then fix the extraction:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\utils\svgDiagnostics.ts

/**
 * SVG Diagnostic Tool - Analyzes SVG structure to help with extraction
 */

export interface SvgAnalysis {
    fileName: string;
    hasText: boolean;
    textCount: number;
    hasTspan: boolean;
    tspanCount: number;
    hasGroups: boolean;
    groupCount: number;
    textSamples: Array<{ text: string; x: string; y: string }>;
    groupLabels: Array<{ label: string; children: number }>;
    svgDimensions: { width: string; height: string };
    xmlns: string;
}

export async function diagnoseSvg(svgUrl: string): Promise<SvgAnalysis | null> {
    try {
        const response = await fetch(svgUrl);
        const svgText = await response.text();

        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const root = svgDoc.documentElement;

        if (root.tagName !== 'svg') {
            console.error('Invalid SVG document');
            return null;
        }

        // Get text elements
        const textElements = svgDoc.querySelectorAll('text');
        const textSamples: Array<{ text: string; x: string; y: string }> = [];
        
        textElements.forEach((el, i) => {
            if (i < 10) { // First 10 samples
                textSamples.push({
                    text: el.textContent?.trim().substring(0, 50) || '',
                    x: el.getAttribute('x') || 'none',
                    y: el.getAttribute('y') || 'none',
                });
            }
        });

        // Get tspan elements
        const tspanElements = svgDoc.querySelectorAll('tspan');

        // Get groups
        const groups = svgDoc.querySelectorAll('g');
        const groupLabels: Array<{ label: string; children: number }> = [];
        
        groups.forEach((g, i) => {
            if (i < 10) {
                const label = g.getAttribute('id') || g.getAttribute('class') || `Group ${i}`;
                const children = g.children.length;
                groupLabels.push({ label, children });
            }
        });

        const analysis: SvgAnalysis = {
            fileName: svgUrl.split('/').pop() || 'unknown',
            hasText: textElements.length > 0,
            textCount: textElements.length,
            hasTspan: tspanElements.length > 0,
            tspanCount: tspanElements.length,
            hasGroups: groups.length > 0,
            groupCount: groups.length,
            textSamples,
            groupLabels,
            svgDimensions: {
                width: root.getAttribute('width') || 'auto',
                height: root.getAttribute('height') || 'auto',
            },
            xmlns: root.getAttribute('xmlns') || 'none',
        };

        return analysis;
    } catch (error) {
        console.error('Diagnostic error:', error);
        return null;
    }
}

export async function diagnoseAllFloorPlans() {
    const floors = ['basement', 'ground', 'first', 'second'];
    const results: Record<string, SvgAnalysis | null> = {};

    for (const floor of floors) {
        console.log(`\n🔍 Analyzing library-${floor}.svg...`);
        const analysis = await diagnoseSvg(`/floor-plans/library-${floor}.svg`);
        
        if (analysis) {
            results[floor] = analysis;
            console.log(`✅ ${floor}:`);
            console.log(`   Text elements: ${analysis.textCount}`);
            console.log(`   Tspan elements: ${analysis.tspanCount}`);
            console.log(`   Groups: ${analysis.groupCount}`);
            console.log(`   Dimensions: ${analysis.svgDimensions.width} x ${analysis.svgDimensions.height}`);
            console.log(`   Samples:`, analysis.textSamples);
        } else {
            console.warn(`❌ Failed to analyze ${floor}`);
        }
    }

    return results;
}
````

Now let's create an improved SVG extractor that handles various SVG structures:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\utils\improvedSvgExtractor.ts

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
````

Now update the IndoorNavigation page to use the improved extractor and show diagnostic info:

````tsx
// filepath: c:\laragon\www\campusapp\resources\js\pages\IndoorNavigation.tsx
// Replace the handleExtractFloorPlans function with:

import { extractAllFloors } from '@/utils/improvedSvgExtractor';
import { diagnoseAllFloorPlans } from '@/utils/svgDiagnostics';

// ... inside the component ...

const handleExtractFloorPlans = async () => {
    if (!window.confirm('Extract all floor plans? This will analyze the SVG structure and extract room labels.')) {
        return;
    }

    setExtracting(true);
    setExtractionStatus('🔍 Analyzing SVG structure...');

    try {
        // Step 0: Diagnose SVG structure
        console.log('=== Starting SVG Diagnosis ===');
        const diagnosis = await diagnoseAllFloorPlans();
        console.log('SVG Analysis:', diagnosis);

        // Step 1: Extract locations
        setExtractionStatus('Step 1/3: Extracting room labels from SVG...');
        console.log('=== Starting Extraction ===');
        const extractionResults = await extractAllFloors();

        if (extractionResults.length === 0) {
            throw new Error('No locations extracted. Check browser console for SVG analysis details.');
        }

        // Step 2: Seed database
        setExtractionStatus('Step 2/3: Saving to database...');
        
        const response = await fetch('/api/seed-floor-locations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify({
                results: extractionResults.
```

