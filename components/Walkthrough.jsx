'use client';

import { useEffect, useRef, useState } from 'react';

const CAPTIONS = [
  { in: 0.10, out: 0.27, title: 'The drawing is the building.', body: 'One model, cut at 1.20 m and seen from 900 m away through a very long lens.' },
  { in: 0.40, out: 0.58, title: '20.40 × 9.00 m', body: 'on a corner lot. Shops at street level, two floors of apartments, a terrace on the roof.' },
  { in: 0.62, out: 0.72, title: 'Arrival.', body: 'North Street entrance, late afternoon.' },
  { in: 0.88, out: 1.03, num: '01', title: 'Lobby', body: 'Travertine, lime plaster, oak slats, and a patio open to the sky. 3.30 m ceiling.' },
  { in: 1.16, out: 1.32, title: 'Parking.', body: 'Six covered spaces under the upper floors, two in tandem per bay, behind a sliding gate on North Street.' },
  { in: 1.59, out: 1.67, title: 'The corner.', body: 'West sun on the café terrace. Three shopfronts on the avenue.' },
  { in: 1.77, out: 1.94, num: '02', title: 'Café', body: 'Fluted oak counter, green zellige, terrazzo floor, a window bar on North Street. 28.2 m².' },
  { in: 2.09, out: 2.39, num: '03', title: 'Clothing store', body: 'Oak shelving, a travertine plinth, a fitting room behind linen. 30.8 m².' },
  { in: 2.54, out: 2.73, num: '04', title: 'Bookshop', body: 'Oak shelves on two walls, a long table of new titles, a reading chair by the window. 29.2 m².' },
  { in: 2.96, out: 3.06, title: 'Floor 1.', body: 'Seven apartments around the light well. First, studio 1.02 on the avenue.' },
  { in: 3.42, out: 3.64, num: '05', title: 'Studio 1.02', body: 'Bed by the French window, a full kitchen, a table for two, bathroom by the entry. 32.6 m².' },
  { in: 3.79, out: 3.92, title: 'Up one floor.', body: 'The stair turns beside the light well.' },
  { in: 4.10, out: 4.28, num: '06', title: 'Residence 2.01', body: 'The three west studios of floor 2 combined: 97 m², living, dining and kitchen in one 63 m² room.' },
  { in: 4.35, out: 4.49, title: 'West light.', body: 'The French windows open over the avenue at sunset.' },
  { in: 4.70, out: 5.03, num: '07', title: 'Roof terrace', body: 'Oak deck, hot tub, lounge around the fire, an outdoor kitchen, and the hills at sunset.' },
];

export default function Walkthrough() {
  const stage = useRef(null);
  const paper = useRef(null);
  const titleblock = useRef(null);
  const titleblock2 = useRef(null);
  const railfill = useRef(null);
  const track = useRef(null);
  const captions = useRef([]);
  const [ready, setReady] = useState(false);
  const [record, setRecord] = useState(false);

  useEffect(() => {
    const isRecord = new URLSearchParams(window.location.search).has('record');
    setRecord(isRecord);
    // the canvas is created here (not in JSX) so React StrictMode's double mount gets a fresh GL context
    const canvas = document.createElement('canvas');
    canvas.className = 'gl';
    stage.current.appendChild(canvas);

    let exp;
    let cancelled = false;
    import('@/lib/scene/experience').then(({ createExperience }) => {
      if (cancelled) return;
      exp = createExperience({
        canvas,
        record: isRecord,
        ui: {
          paper: paper.current,
          titleblock: titleblock.current,
          titleblock2: titleblock2.current,
          railfill: railfill.current,
          track: track.current,
          captions: captions.current.filter(Boolean),
        },
        onReady: () => setReady(true),
      });
    });
    return () => {
      cancelled = true;
      exp?.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <>
      <div ref={stage} className="stage" />
      <div ref={paper} className="paper" />

      <header className="mast">
        <span className="mark">STUDIO&nbsp;NAME</span>
        <span className="meta">Corner Building · Mixed use</span>
      </header>

      <aside ref={titleblock} className="titleblock">
        <div className="tb-row tb-big">CORNER BUILDING</div>
        <div className="tb-row">3 shops · 14 apartments · roof terrace</div>
        <div className="tb-grid">
          <div><span>Drawing</span>Ground floor plan</div>
          <div><span>Cut</span>+1.20 m</div>
          <div><span>Scale</span>1:100</div>
          <div><span>Sheet</span>A-101</div>
        </div>
        <div className="tb-row tb-foot">Scroll to enter</div>
      </aside>

      <aside ref={titleblock2} className="titleblock" style={{ opacity: 0 }}>
        <div className="tb-row tb-big">CORNER BUILDING</div>
        <div className="tb-row">Apartment 1.02 · studio on the avenue</div>
        <div className="tb-grid">
          <div><span>Drawing</span>Floor 1 plan</div>
          <div><span>Cut</span>+1.20 m</div>
          <div><span>Scale</span>1:100</div>
          <div><span>Sheet</span>A-102</div>
        </div>
        <div className="tb-row tb-foot">Level +3.60</div>
      </aside>

      <div className="captions">
        {CAPTIONS.map((c, i) => (
          <p key={i} ref={(el) => { captions.current[i] = el; }} className="cap" data-in={c.in} data-out={c.out}>
            {c.num && <span className="num">{c.num}</span>}
            <b>{c.title}</b> {c.body}
          </p>
        ))}
      </div>

      <nav className="rail" aria-hidden="true"><div ref={railfill} className="rail-fill" /></nav>
      {!(record && ready) && <div className={`loader${ready ? ' done' : ''}`}>Preparing the drawing…</div>}

      <main ref={track} className="track" />
    </>
  );
}
