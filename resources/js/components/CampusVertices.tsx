/**
 * Campus Vertices Component
 * 
 * Renders circles at each graph vertex (location) on the SVG floor plan.
 * Used for visual debugging and graph overlay visualization.
 */

import { GraphData, CampusVertex } from '../services/graphData';

interface CampusVerticesProps {
  graphData: GraphData;
  userPosition?: { cx: number; cy: number } | null;
  highlightedVertexId?: number | null;
  onVertexClick?: (vertex: CampusVertex) => void;
  showLabels?: boolean;
  showVertices?: boolean;
  showLegend?: boolean;
}

export default function CampusVertices({
  graphData,
  userPosition,
  highlightedVertexId,
  onVertexClick,
  showLabels = false,
  showVertices = false,
  showLegend = false,
}: CampusVerticesProps) {
  // Define colors by vertex type
  const getVertexColor = (type: CampusVertex['type']): string => {
    switch (type) {
      case 'entrance':
        return '#10b981'; // emerald
      case 'service':
        return '#3b82f6'; // blue
      case 'study':
        return '#6366f1'; // indigo
      case 'lab':
        return '#f59e0b'; // amber
      case 'office':
        return '#8b5cf6'; // violet
      case 'restroom':
        return '#ec4899'; // pink
      case 'food':
        return '#f97316'; // orange
      case 'rest':
        return '#14b8a6'; // teal
      case 'collection':
        return '#d946ef'; // fuchsia
      case 'walkway':
        return '#6b7280'; // gray
      case 'exit':
        return '#dc2626'; // red
      default:
        return '#9ca3af'; // default gray
    }
  };

  return (
    <g id="campus-vertices">
      {/* Render all vertices - only if showVertices is true */}
      {showVertices && graphData.vertices.map((vertex) => {
        const isHighlighted = vertex.id === highlightedVertexId;
        const color = getVertexColor(vertex.type);
        const radius = isHighlighted ? 6 : 4;

        return (
          <g key={`vertex-${vertex.id}`} className="">
            {/* Outer glow effect for highlighted vertex */}
            {isHighlighted && (
              <circle
                cx={vertex.cx}
                cy={vertex.cy}
                r={8}
                fill="none"
                stroke={color}
                strokeWidth="1"
                opacity="0.4"
              />
            )}

            {/* Main vertex circle */}
            <circle
              cx={vertex.cx}
              cy={vertex.cy}
              r={radius}
              fill={color}
              stroke="white"
              strokeWidth="1.5"
              opacity="0.85"
              style={{ cursor: onVertexClick ? 'pointer' : 'default' }}
              onClick={() => onVertexClick?.(vertex)}
              className={onVertexClick ? 'hover:opacity-100' : ''}
            />

            {/* Labels (optional) */}
            {showLabels && (
              <g>
                {/* Label background for readability */}
                <rect
                  x={vertex.cx + 8}
                  y={vertex.cy - 8}
                  width={Math.min(vertex.name.length * 3.5, 80)}
                  height="12"
                  fill="rgba(0, 0, 0, 0.6)"
                  rx="2"
                />
                {/* Vertex ID and name */}
                <text
                  x={vertex.cx + 10}
                  y={vertex.cy - 1}
                  fontSize="8"
                  fill="white"
                  fontWeight="bold"
                  fontFamily="monospace"
                  pointerEvents="none"
                >
                  {vertex.name.substring(0, 12)}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Render user position if provided */}
      {userPosition && (
        <g id="user-position">
          {/* Animated pulse ring */}
          <circle
            cx={userPosition.cx}
            cy={userPosition.cy}
            r="12"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
            opacity="0.6"
            className="animate-pulse"
          />

          {/* User position marker */}
          <circle
            cx={userPosition.cx}
            cy={userPosition.cy}
            r="5"
            fill="#3b82f6"
            stroke="white"
            strokeWidth="2"
            opacity="0.9"
          />

          {/* Accuracy radius indicator */}
          <circle
            cx={userPosition.cx}
            cy={userPosition.cy}
            r="20"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="0.5"
            strokeDasharray="2,3"
            opacity="0.3"
          />
        </g>
      )}

      {/* Legend - removed, now exported as separate component */}
    </g>
  );
}

/**
 * Vertex Legend Component - renders as HTML outside SVG
 * Shows color legend for all vertex types
 */
export function VertexLegend() {
  const vertexTypes: Array<{ type: CampusVertex['type']; label: string }> = [
    { type: 'entrance', label: 'Entrance' },
    { type: 'study', label: 'Study' },
    { type: 'office', label: 'Office' },
    { type: 'lab', label: 'Lab' },
    { type: 'restroom', label: 'Restroom' },
    { type: 'food', label: 'Food' },
    { type: 'walkway', label: 'Walkway' },
  ];

  const getVertexColor = (type: CampusVertex['type']): string => {
    switch (type) {
      case 'entrance':
        return '#10b981';
      case 'service':
        return '#3b82f6';
      case 'study':
        return '#6366f1';
      case 'lab':
        return '#f59e0b';
      case 'office':
        return '#8b5cf6';
      case 'restroom':
        return '#ec4899';
      case 'food':
        return '#f97316';
      case 'rest':
        return '#14b8a6';
      case 'collection':
        return '#d946ef';
      case 'walkway':
        return '#6b7280';
      case 'exit':
        return '#dc2626';
      default:
        return '#9ca3af';
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-lg">
      <h3 className="font-semibold text-gray-900 mb-3 text-sm">Node Types:</h3>
      <div className="space-y-2">
        {vertexTypes.map((item) => (
          <div key={item.type} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border border-white"
              style={{ backgroundColor: getVertexColor(item.type) }}
            ></div>
            <span className="text-xs text-gray-700">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
