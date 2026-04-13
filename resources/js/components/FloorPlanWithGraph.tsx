/**
 * Floor Plan With Graph Component
 * 
 * Integrates the graph-based visualization (vertices and edges) with
 * the floor plan background image for complete wayfinding visualization.
 */

import { useEffect, useState } from 'react';
import { GraphData, getGraphDataByFloorId } from '../services/graphData';
import CampusVertices, { VertexLegend } from './CampusVertices';
import CampusEdges from './CampusEdges';

interface FloorPlanWithGraphProps {
  floorId: number;
  floorPlanPath: string;
  viewBox: string;
  currentRoutePath?: number[] | null; // Array of vertex IDs
  userPosition?: { cx: number; cy: number } | null;
  highlightedVertexId?: number | null;
  onVertexClick?: (vertexId: number, vertexName: string) => void;
  showGraphOverlay?: boolean;
  showLabels?: boolean;
  animateRoute?: boolean;
}

export default function FloorPlanWithGraph({
  floorId,
  floorPlanPath,
  viewBox,
  currentRoutePath,
  userPosition,
  highlightedVertexId,
  onVertexClick,
  showGraphOverlay = false,
  showLabels = false,
  animateRoute = true,
}: FloorPlanWithGraphProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setIsLoading(true);
      setError(null);

      const data = getGraphDataByFloorId(floorId);
      if (!data) {
        throw new Error(`Graph data not found for floor ID ${floorId}`);
      }

      setGraphData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error loading graph data';
      setError(message);
      console.error('Error loading graph data:', message);
    } finally {
      setIsLoading(false);
    }
  }, [floorId]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <p>Loading floor plan...</p>
        </div>
      </div>
    );
  }

  if (error || !graphData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
        <div className="text-red-400 text-center">
          <p className="font-semibold mb-2">Error Loading Floor Plan</p>
          <p className="text-sm">{error || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <svg
        viewBox={viewBox}
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background floor plan image */}
        <image
          x="0"
          y="0"
          width="100%"
          height="100%"
          href={floorPlanPath}
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Graph overlay */}
        {showGraphOverlay && (
          <>
            {/* Render edges first (so they appear behind vertices) */}
            <CampusEdges
              graphData={graphData}
              highlightedPath={animateRoute ? currentRoutePath : null}
              showLabels={showLabels}
            />

            {/* Render vertices on top */}
            <CampusVertices
              graphData={graphData}
              userPosition={userPosition}
              highlightedVertexId={highlightedVertexId}
              onVertexClick={(vertex) => onVertexClick?.(vertex.id, vertex.name)}
              showLabels={showLabels}
              showVertices={showGraphOverlay}
            />
          </>
        )}

        {/* Current route indicator (simplified version without detailed markers) */}
        {currentRoutePath && currentRoutePath.length > 1 && animateRoute && (
          <g id="route-markers" opacity="0.6">
            {/* Start marker */}
            {(() => {
              const startId = currentRoutePath[0];
              const startVertex = graphData.vertices.find(v => v.id === startId);
              return startVertex ? (
                <circle
                  cx={startVertex.cx}
                  cy={startVertex.cy}
                  r="8"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="3,3"
                />
              ) : null;
            })()}

            {/* End marker with pulsing animation */}
            {(() => {
              const endId = currentRoutePath[currentRoutePath.length - 1];
              const endVertex = graphData.vertices.find(v => v.id === endId);
              return endVertex ? (
                <g>
                  <circle
                    cx={endVertex.cx}
                    cy={endVertex.cy}
                    r="12"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                  <circle
                    cx={endVertex.cx}
                    cy={endVertex.cy}
                    r="6"
                    fill="#ef4444"
                    opacity="0.3"
                  />
                </g>
              ) : null;
            })()}
          </g>
        )}
      </svg>

      {/* Controls overlay - only show when graph is visible */}
      {showGraphOverlay && (
        <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-2 rounded-lg text-xs space-y-1">
          <div>
            <span className="font-semibold">Floor:</span> {graphData.floorName}
          </div>
          <div>
            <span className="font-semibold">Vertices:</span> {graphData.vertices.length}
          </div>
          <div>
            <span className="font-semibold">Edges:</span> {graphData.edges.length}
          </div>
          {currentRoutePath && (
            <div>
              <span className="font-semibold">Route:</span> {currentRoutePath.length} steps
            </div>
          )}
        </div>
      )}

      {/* Vertex Legend - show when graph debug is visible */}
      {showGraphOverlay && (
        <div className="absolute top-20 left-4">
          <VertexLegend />
        </div>
      )}

      {/* Debug controls - only show when graph is visible */}
      {showGraphOverlay && (
        <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-2 rounded-lg text-xs space-y-2">
          <div className="text-xs font-semibold">Debug Info:</div>
          <ul className="space-y-1">
            <li>• Graph overlay: {showGraphOverlay ? '✓' : '✗'}</li>
            <li>• Labels: {showLabels ? '✓' : '✗'}</li>
            <li>• Animation: {animateRoute ? '✓' : '✗'}</li>
            <li>• User position: {userPosition ? '✓' : '✗'}</li>
          </ul>
        </div>
      )}

      {/* Styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
