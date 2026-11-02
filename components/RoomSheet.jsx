'use client';
// The room sheet: a drawer that slides in from the right with the room's drawing, figures,
// finishes and features. Opened from an info point; closed with the cross, Esc or the backdrop.
import { useEffect, useRef } from 'react';
import { SHEETS } from './roomSheets';

// a small plan of the room: its outline in poché, glazing and doors, overall dimensions
function MiniPlan({ plan }) {
  const { w, d, doors = [], windows = [] } = plan;
  const k = Math.min(300 / w, 190 / d), W = w * k, D = d * k, t = 5, ox = 40, oy = 22;
  const side = (s, a0, a1) => (s === 'n' ? [ox + a0 * W, oy, ox + a1 * W, oy] : s === 's' ? [ox + a0 * W, oy + D, ox + a1 * W, oy + D]
    : s === 'w' ? [ox, oy + a0 * D, ox, oy + a1 * D] : [ox + W, oy + a0 * D, ox + W, oy + a1 * D]);
  return (
    <svg className="rs-plan" viewBox={`0 0 ${W + 80} ${D + 64}`} aria-hidden="true">
      <rect x={ox} y={oy} width={W} height={D} fill="none" stroke="var(--ink)" strokeWidth={t} />
      {windows.map(([s, a, b], i) => { const [x1, y1, x2, y2] = side(s, a, b); return <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--paper)" strokeWidth={t + 1} /><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink)" strokeWidth={1} /></g>; })}
      {doors.map(([s, a], i) => {
        const L = Math.min(0.9 * k, 26), [x1, y1] = side(s, a, a);
        const horiz = s === 'n' || s === 's', dir = s === 'n' || s === 'w' ? 1 : -1;
        const x2 = horiz ? x1 + L : x1, y2 = horiz ? y1 : y1 + L;
        const ex = horiz ? x1 : x1 + dir * L, ey = horiz ? y1 + dir * L : y1;
        return <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--paper)" strokeWidth={t + 1} />
          <path d={`M${x1} ${y1}L${ex} ${ey}A${L} ${L} 0 0 ${dir > 0 === horiz ? 0 : 1} ${x2} ${y2}`} fill="none" stroke="var(--accent)" strokeWidth={1} /></g>;
      })}
      <g className="rs-dim">
        <line x1={ox} y1={oy + D + 22} x2={ox + W} y2={oy + D + 22} /><line x1={ox} y1={oy + D + 16} x2={ox} y2={oy + D + 28} /><line x1={ox + W} y1={oy + D + 16} x2={ox + W} y2={oy + D + 28} />
        <text x={ox + W / 2} y={oy + D + 38}>{w.toFixed(2)}</text>
        <line x1={ox - 20} y1={oy} x2={ox - 20} y2={oy + D} /><line x1={ox - 26} y1={oy} x2={ox - 14} y2={oy} /><line x1={ox - 26} y1={oy + D} x2={ox - 14} y2={oy + D} />
        <text x={ox - 26} y={oy + D / 2} transform={`rotate(-90 ${ox - 26} ${oy + D / 2})`}>{d.toFixed(2)}</text>
      </g>
    </svg>
  );
}

export default function RoomSheet({ id, onClose }) {
  const s = id ? SHEETS[id] : null;
  const panel = useRef(null);
  useEffect(() => {
    if (!s) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [s, onClose]);

  return (
    <div className={`rs${s ? ' open' : ''}`} aria-hidden={!s}>
      <div className="rs-back" onClick={onClose} />
      <aside ref={panel} className="rs-panel" data-lenis-prevent role="dialog" aria-modal="true" aria-label={s?.title} tabIndex={-1}>
        {s && (
          <>
            <button className="rs-x" onClick={onClose} aria-label="Close">×</button>
            <p className="rs-k">{s.kicker}</p>
            <h2 className="rs-t">{s.title}</h2>
            <p className="rs-l">{s.lede}</p>
            <MiniPlan plan={s.plan} />
            <dl className="rs-f">
              {s.figures.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
            <h3 className="rs-h">Finishes</h3>
            <ul className="rs-sw">
              {s.finishes.map(([n, c]) => <li key={n}><i style={{ background: c }} />{n}</li>)}
            </ul>
            <h3 className="rs-h">Features</h3>
            <ul className="rs-li">{s.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <div className="rs-a">
              <button className="cta-b primary" onClick={() => window.dispatchEvent(new CustomEvent('cb:enquire', { detail: s.title }))}>Enquire about this space</button>
              <button className="cta-b" onClick={onClose}>Back to the walk</button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
