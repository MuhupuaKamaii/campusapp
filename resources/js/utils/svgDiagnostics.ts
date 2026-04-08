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
