/**
 * Coordinate Extractor for SVG Floor Plans
 * 
 * Usage:
 * 1. Pass the SVG floor plan image path
 * 2. Click on each room/location in the floor plan
 * 3. Coordinates display in console and on screen
 * 4. Copy the coordinates and add them to graphData.ts
 */

import { useState } from 'react';

interface ExtractedCoord {
  name: string;
  x: number;
  y: number;
  timestamp: number;
}

interface CoordinateExtractorProps {
  floorPlanPath: string;
  floorName: string;
  viewBox: string;
}

export default function CoordinateExtractor({
  floorPlanPath,
  floorName,
  viewBox
}: CoordinateExtractorProps) {
  const [coordinates, setCoordinates] = useState<ExtractedCoord[]>([]);
  const [showExtractor, setShowExtractor] = useState(false);
  const [lastCoordName, setLastCoordName] = useState('');

  const handleSVGClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    
    // Get the point in client coordinates
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    
    // Transform to SVG coordinates
    const screenCTM = svg.getScreenCTM();
    if (screenCTM) {
      const svgCoord = point.matrixTransform(screenCTM.inverse());
      
      const newCoord: ExtractedCoord = {
        name: lastCoordName || `Location_${coordinates.length + 1}`,
        x: Math.round(svgCoord.x * 100) / 100,
        y: Math.round(svgCoord.y * 100) / 100,
        timestamp: Date.now()
      };
      
      setCoordinates([...coordinates, newCoord]);
      
      // Log to console for easy copying
      console.log(`Location: name="${newCoord.name}", cx: ${newCoord.x}, cy: ${newCoord.y}`);
      console.log(JSON.stringify({
        name: newCoord.name,
        cx: newCoord.x,
        cy: newCoord.y,
        floor_id: floorName
      }, null, 2));
    }
  };

  const exportAsJSON = () => {
    const json = coordinates.map(c => ({
      name: c.name,
      cx: c.x,
      cy: c.y,
      floor: floorName
    }));
    console.log('Export JSON:');
    console.log(JSON.stringify(json, null, 2));
  };

  const downloadJSON = () => {
    const json = coordinates.map(c => ({
      name: c.name,
      cx: c.x,
      cy: c.y,
      floor: floorName
    }));
    
    const dataStr = JSON.stringify(json, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `coordinates-${floorName.replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearCoordinates = () => {
    if (window.confirm('Clear all coordinates? This cannot be undone.')) {
      setCoordinates([]);
    }
  };

  const removeLastCoordinate = () => {
    setCoordinates(coordinates.slice(0, -1));
  };

  if (!showExtractor) {
    return (
      <button
        onClick={() => setShowExtractor(true)}
        className="fixed bottom-4 right-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-lg z-40"
      >
        🎯 Extract Coordinates
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex flex-col">
      {/* Extractor Panel */}
      <div className="absolute top-0 right-0 bg-white rounded-l-lg shadow-2xl w-96 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-orange-500 text-white p-4 border-b-2 border-orange-600">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg">Coordinate Extractor</h3>
            <button
              onClick={() => setShowExtractor(false)}
              className="text-white hover:bg-orange-600 p-1 rounded"
            >
              ✕
            </button>
          </div>
          <p className="text-sm opacity-90">{floorName} Floor</p>
          <p className="text-xs opacity-75">ViewBox: {viewBox}</p>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-orange-50 border-b border-orange-200 text-sm">
          <p className="font-semibold mb-2">📍 How to use:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Type a location name (optional)</li>
            <li>Click on the floor plan to capture coordinates</li>
            <li>Repeat for all locations</li>
            <li>Download or copy JSON</li>
          </ol>
        </div>

        {/* Input for location name */}
        <div className="p-4 border-b border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Next Location Name (optional):
          </label>
          <input
            type="text"
            value={lastCoordName}
            onChange={(e) => setLastCoordName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                setLastCoordName('');
              }
            }}
            placeholder="e.g., Study Cubicles 1, Dean's Office"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Coordinates List */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">
              Extracted Coordinates ({coordinates.length})
            </h4>
            <div className="text-xs text-gray-500">
              {coordinates.length > 0 && `Latest: ${coordinates[coordinates.length - 1].x}, ${coordinates[coordinates.length - 1].y}`}
            </div>
          </div>

          {coordinates.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No coordinates extracted yet</p>
              <p className="text-xs mt-2">Click on the floor plan to start</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {coordinates.map((coord, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50 p-3 rounded border border-gray-200 text-xs font-mono hover:bg-orange-50 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-orange-600">{idx + 1}. {coord.name}</span>
                    <span className="text-gray-400">
                      {new Date(coord.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-gray-700">
                    cx: <span className="font-bold">{coord.x}</span>, cy: <span className="font-bold">{coord.y}</span>
                  </div>
                  <code className="text-xs text-gray-500">
                    {{name: "{coord.name}", cx: {coord.x}, cy: {coord.y}}}
                  </code>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 space-y-2">
          <button
            onClick={exportAsJSON}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded font-semibold text-sm transition"
            disabled={coordinates.length === 0}
          >
            📋 Copy JSON (Console)
          </button>
          <button
            onClick={downloadJSON}
            className="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded font-semibold text-sm transition"
            disabled={coordinates.length === 0}
          >
            💾 Download JSON
          </button>
          <button
            onClick={removeLastCoordinate}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded font-semibold text-sm transition"
            disabled={coordinates.length === 0}
          >
            ↶ Remove Last
          </button>
          <button
            onClick={clearCoordinates}
            className="w-full bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded font-semibold text-sm transition"
            disabled={coordinates.length === 0}
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      {/* SVG Floor Plan */}
      <svg
        onClick={handleSVGClick}
        viewBox={viewBox}
        className="flex-1 cursor-crosshair bg-gray-900"
        style={{ maxWidth: 'calc(100vw - 400px)' }}
      >
        <image
          x="0"
          y="0"
          width="100%"
          height="100%"
          href={floorPlanPath}
          preserveAspectRatio="xMidYMid meet"
        />
        
        {/* Overlay extracted coordinates */}
        {coordinates.map((coord, idx) => (
          <g key={idx}>
            <circle
              cx={coord.x}
              cy={coord.y}
              r="8"
              fill="white"
              stroke="#FF8C00"
              strokeWidth="2"
              opacity="0.9"
            />
            <text
              x={coord.x + 12}
              y={coord.y - 5}
              fontSize="12"
              fill="white"
              stroke="#333"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fontWeight="bold"
            >
              {idx + 1}
            </text>
            <text
              x={coord.x + 12}
              y={coord.y - 5}
              fontSize="12"
              fill="#FF8C00"
              fontWeight="bold"
            >
              {idx + 1}
            </text>
          </g>
        ))}

        {/* Crosshair cursor */}
        <circle
          id="crosshair"
          r="20"
          fill="none"
          stroke="rgba(255, 140, 0, 0.5)"
          strokeWidth="1"
          strokeDasharray="5,5"
          pointerEvents="none"
        />
      </svg>
    </div>
  );
}
