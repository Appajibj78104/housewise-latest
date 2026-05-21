import React from 'react';

/**
 * Sparkline - Mini SVG line/area chart for stat cards
 * Props:
 *   data: number[] (values to plot)
 *   width?: number (default 80)
 *   height?: number (default 30)
 *   color?: string (stroke color, default '#60a5fa')
 *   fill?: boolean (area fill)
 *   showDot?: boolean (dot on last point)
 */
const Sparkline = ({ data = [], width = 80, height = 30, color = '#60a5fa', fill = true, showDot = true }) => {
  if (!data.length || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((val, i) => ({
    x: padding + (i / (data.length - 1)) * (width - padding * 2),
    y: padding + (1 - (val - min) / range) * (height - padding * 2),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const lastPoint = points[points.length - 1];

  return (
    <svg width={width} height={height} className="overflow-visible">
      {fill && (
        <path d={areaD} fill={color} opacity={0.1} />
      )}
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {showDot && lastPoint && (
        <circle cx={lastPoint.x} cy={lastPoint.y} r={2.5} fill={color} />
      )}
    </svg>
  );
};

export default Sparkline;

/**
 * StatusBar - Color-coded horizontal status distribution bar
 * Props:
 *   segments: Array<{ value: number, color: string, label?: string }>
 *   height?: number (default 6)
 *   showLegend?: boolean
 */
export const StatusBar = ({ segments = [], height = 6, showLegend = false }) => {
  const total = segments.reduce((sum, s) => sum + (s.value || 0), 0);
  if (!total) return null;

  return (
    <div>
      <div className="flex rounded-full overflow-hidden" style={{ height }}>
        {segments.map((seg, i) => (
          <div
            key={i}
            className="transition-all duration-500"
            style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color }}
            title={`${seg.label || ''}: ${seg.value} (${Math.round((seg.value / total) * 100)}%)`}
          />
        ))}
      </div>
      {showLegend && (
        <div className="flex flex-wrap gap-3 mt-2">
          {segments.filter(s => s.value > 0).map((seg, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-[10px] text-content-muted">{seg.label} ({seg.value})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
