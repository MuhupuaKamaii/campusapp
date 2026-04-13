/**
 * Campus Edges Component
 * 
 * Renders lines (edges) connecting vertices on the SVG floor plan.
 * Shows all available paths in the wayfinding graph.
 */

import { GraphData, CampusEdge, findVertex } from '../services/graphData';

interface CampusEdgesProps {
  graphData: GraphData;
  highlightedPath?: number[] | null; // Array of vertex IDs representing the current path
  showLabels?: boolean;
}

export default function CampusEdges({
  graphData,
  highlightedPath,
  showLabels = false,
}: CampusEdgesProps) {
  // Build a set of edge IDs that are part of the highlighted path
  const highlightedEdgeIds = new Set<number>();
  if (highlightedPath && highlightedPath.length > 1) {
    for (let i = 0; i < highlightedPath.length - 1; i++) {
      const fromId = highlightedPath[i];
      const toId = highlightedPath[i + 1];
      // Find the edge ID(s) that connect these vertices
      const edges = graphData.edges.filter(e => e.from === fromId && e.to === toId);
      edges.forEach(e => highlightedEdgeIds.add(e.id));
    }
  }

  return (
    <g id="campus-edges">
      {/* First pass: render all non-highlighted edges */}
      {graphData.edges
        .filter(edge => !highlightedEdgeIds.has(edge.id))
        .map((edge) => {
          const fromVertex = findVertex(graphData, edge.from);
          const toVertex = findVertex(graphData, edge.to);

          if (!fromVertex || !toVertex) return null;

          // Build path string
          const pathStr = `M ${fromVertex.cx} ${fromVertex.cy} L ${toVertex.cx} ${toVertex.cy}`;

          return (
            <path
              key={`edge-${edge.id}`}
              d={pathStr}
              stroke="#d1d5db"
              strokeWidth="0.8"
              fill="none"
              opacity="0.4"
              pointerEvents="none"
            />
          );
        })}

      {/* Second pass: render highlighted path edges with animation */}
      {Array.from(highlightedEdgeIds).map((edgeId) => {
        const edge = graphData.edges.find(e => e.id === edgeId);
        if (!edge) return null;

        const fromVertex = findVertex(graphData, edge.from);
        const toVertex = findVertex(graphData, edge.to);

        if (!fromVertex || !toVertex) return null;

        const pathStr = `M ${fromVertex.cx} ${fromVertex.cy} L ${toVertex.cx} ${toVertex.cy}`;

        return (
          <g key={`highlighted-edge-${edgeId}`}>
            {/* Glow effect */}
            <path
              d={pathStr}
              stroke="#3b82f6"
              strokeWidth="3"
              fill="none"
              opacity="0.3"
              pointerEvents="none"
            />
            {/* Main highlighted path line */}
            <path
              d={pathStr}
              stroke="#3b82f6"
              strokeWidth="1.5"
              fill="none"
              opacity="0.9"
              pointerEvents="none"
              className="wayfinding-path"
            />
            {/* Animated dashes */}
            <path
              d={pathStr}
              stroke="#0ea5e9"
              strokeWidth="1"
              fill="none"
              strokeDasharray="4,4"
              opacity="0.8"
              pointerEvents="none"
              style={{
                animation: 'dash 20s linear infinite',
                animationPlayState: 'running',
              } as React.CSSProperties}
            />
          </g>
        );
      })}

      {/* Mid-point labels for distances (optional) */}
      {showLabels &&
        graphData.edges.map((edge) => {
          // Only show labels for non-reverse edges to avoid clutter
          if (edge.id % 2 === 0) return null;

          const fromVertex = findVertex(graphData, edge.from);
          const toVertex = findVertex(graphData, edge.to);

          if (!fromVertex || !toVertex) return null;

          const midX = (fromVertex.cx + toVertex.cx) / 2;
          const midY = (fromVertex.cy + toVertex.cy) / 2;

          return (
            <g key={`label-${edge.id}`}>
              {/* Label background */}
              <rect
                x={midX - 18}
                y={midY - 8}
                width="36"
                height="12"
                fill="rgba(0, 0, 0, 0.6)"
                rx="2"
              />
              {/* Distance label */}
              <text
                x={midX}
                y={midY + 2}
                fontSize="8"
                fill="white"
                textAnchor="middle"
                fontWeight="bold"
                pointerEvents="none"
              >
                {edge.distance}m
              </text>
            </g>
          );
        })}

      {/* CSS for dash animation */}
      <defs>
        <style>{`
          @keyframes dash {
            to {
              stroke-dashoffset: -8;
            }
          }
          
          .wayfinding-path {
            filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.5));
          }
        `}</style>
      </defs>
    </g>
  );
}
