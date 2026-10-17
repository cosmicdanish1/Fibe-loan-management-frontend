import React, { useEffect, useState } from 'react';
import { prefersCalm } from '../calm';

export interface FlowNode {
  title: string;
  /** Short lines under the title (keep each to about 28 characters; SVG text does not wrap). */
  lines: string[];
  /** Where it lives in the menu, e.g. "Transaction › Loan Application". */
  where?: string;
}

const NW = 200, NH = 128, GX = 58, GY = 70, PAD = 24;

/**
 * Animated flow chart in SVG: numbered cards that appear one after another, joined by arrows that
 * draw themselves. Rows wrap after `columns` cards with an elbow connector. Colours come from the
 * --aw-* tokens, so it follows Light/Dark and the accent colour.
 */
export const FlowDiagram: React.FC<{ nodes: FlowNode[]; columns?: number; label: string }> = ({ nodes, columns, label }) => {
  const cols = columns ?? Math.min(nodes.length, 5);
  const rows = Math.ceil(nodes.length / cols);
  const w = cols * NW + (cols - 1) * GX + PAD * 2;
  const h = rows * NH + (rows - 1) * GY + PAD * 2;
  // After everything has appeared, the stages light up one after another, like work moving through.
  const [active, setActive] = useState(-1);
  useEffect(() => {
    if (prefersCalm()) return;
    let tick: number | undefined;
    const start = window.setTimeout(() => {
      setActive(0);
      tick = window.setInterval(() => setActive((a) => (a + 1) % nodes.length), 1300);
    }, nodes.length * 400 + 700);
    return () => { window.clearTimeout(start); if (tick) window.clearInterval(tick); };
  }, [nodes.length]);

  const pos = (i: number) => ({ x: PAD + (i % cols) * (NW + GX), y: PAD + Math.floor(i / cols) * (NH + GY) });

  return (
    <svg className="ob-flow" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <defs>
        <marker id="ob-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M1 1 L9 5 L1 9" fill="none" stroke="context-stroke" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      {nodes.slice(0, -1).map((_, i) => {
        const a = pos(i), b = pos(i + 1);
        const sameRow = Math.floor(i / cols) === Math.floor((i + 1) / cols);
        const d = sameRow
          ? `M${a.x + NW + 4} ${a.y + NH / 2} L${b.x - 6} ${b.y + NH / 2}`
          : `M${a.x + NW / 2} ${a.y + NH + 4} L${a.x + NW / 2} ${a.y + NH + GY / 2} L${b.x + NW / 2} ${a.y + NH + GY / 2} L${b.x + NW / 2} ${b.y - 6}`;
        return (
          <g key={`c${i}`}>
            <path className="ob-conn" pathLength={1} d={d} markerEnd="url(#ob-arrow)" style={{ ['--i' as any]: i }} />
            <path className="ob-pulse" pathLength={1} d={d} style={{ ['--n' as any]: i }} />
          </g>
        );
      })}

      {nodes.map((n, i) => {
        const { x, y } = pos(i);
        return (
          <g key={n.title} transform={`translate(${x} ${y})`}>
          <g className={`ob-node${i === active ? ' is-active' : ''}`} style={{ ['--i' as any]: i }}>
            <rect width={NW} height={NH} rx="16" />
            <circle className="ob-badge" cx="22" cy="24" r="12" />
            <text className="ob-badge-n" x="22" y="28.5" textAnchor="middle">{i + 1}</text>
            <text className="ob-node-title" x="42" y="29">{n.title}</text>
            {n.lines.map((line, li) => (
              <text key={li} className="ob-node-line" x="16" y={56 + li * 17}>{line}</text>
            ))}
            {n.where && <text className="ob-node-where" x="16" y={NH - 12}>{n.where}</text>}
          </g>
          </g>
        );
      })}
    </svg>
  );
};

export default FlowDiagram;
