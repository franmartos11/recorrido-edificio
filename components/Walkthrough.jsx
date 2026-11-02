'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Loader from './Loader';

const CAPTIONS = [
  { in: 0.08, out: 0.46, title: 'The drawing is the building.', body: 'One model, cut at 1.20 m and seen from 900 m away through a very long lens.' },
  { in: 0.60, out: 0.78, title: '20.40 × 9.00 m', body: 'on a corner lot. Shops at street level, two floors of apartments, a terrace on the roof.' },
  { in: 0.82, out: 0.92, title: 'Arrival.', body: 'North Street entrance, late afternoon.' },
  { in: 1.08, out: 1.23, num: '01', title: 'Lobby', body: 'Travertine, lime plaster, oak slats, and a patio open to the sky. 3.30 m ceiling.' },
  { in: 1.36, out: 1.52, title: 'Parking.', body: 'Six covered spaces under the upper floors, two in tandem per bay, behind a sliding gate on North Street.' },
  { in: 1.79, out: 1.87, title: 'The corner.', body: 'West sun on the café terrace. Three shopfronts on the avenue.' },
  { in: 1.97, out: 2.14, num: '02', title: 'Café', body: 'Fluted oak counter, green zellige, terrazzo floor, a window bar on North Street. 28.2 m².' },
  { in: 2.29, out: 2.59, num: '03', title: 'Clothing store', body: 'Oak shelving, a travertine plinth, a fitting room behind linen. 30.8 m².' },
  { in: 2.74, out: 2.93, num: '04', title: 'Bookshop', body: 'Oak shelves on two walls, a long table of new titles, a reading chair by the window. 29.2 m².' },
  { in: 3.16, out: 3.46, title: 'Floor 1.', body: 'Seven apartments around the light well. First, studio 1.02 on the avenue.' },
  { in: 3.82, out: 4.04, num: '05', title: 'Studio 1.02', body: 'Bed by the French window, a full kitchen, a table for two, bathroom by the entry. 32.6 m².' },
  { in: 4.19, out: 4.32, title: 'Up one floor.', body: 'The stair turns beside the light well.' },
  { in: 4.49, out: 4.79, title: 'Floor 2.', body: 'The three west studios combined into one residence; four more apartments around the light well.' },
  { in: 5.22, out: 5.40, num: '06', title: 'Residence 2.01', body: 'The three west studios of floor 2 combined: 97 m², living, dining and kitchen in one 63 m² room.' },
  { in: 5.47, out: 5.61, title: 'West light.', body: 'The French windows open over the avenue at sunset.' },
  { in: 5.82, out: 6.00, num: '07', title: 'Roof terrace', body: 'Two oak decks either side of the stair and tank volumes, open to the sky.' },
  { in: 6.10, out: 6.28, title: 'The east deck.', body: 'Dinner for six under the pergola, string lights and an olive in the corner.' },
  { in: 6.48, out: 6.66, title: 'The west deck.', body: 'Hot tub, loungers, a lounge round the fire and an outdoor kitchen, facing the hills at sunset.' },
  { in: 6.84, out: 7.4, title: 'Corner Building.', body: 'Three shops, fourteen apartments and a roof terrace on a corner lot.' },
];

export default function Walkthrough() {
  const stage = useRef(null);
  const paper = useRef(null);
  const titleblock = useRef(null);
  const titleblock2 = useRef(null);
  const titleblock3 = useRef(null);
  const railfill = useRef(null);
  const track = useRef(null);
  const captions = useRef([]);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loaderGone, setLoaderGone] = useState(false);
  const hideLoader = useCallback(() => setLoaderGone(true), []);
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
          titleblock3: titleblock3.current,
          railfill: railfill.current,
          track: track.current,
          captions: captions.current.filter(Boolean),
        },
        onProgress: setProgress,
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

      <aside ref={titleblock3} className="titleblock" style={{ opacity: 0 }}>
        <div className="tb-row tb-big">CORNER BUILDING</div>
        <div className="tb-row">Apartment 2.01 · residence</div>
        <div className="tb-grid">
          <div><span>Drawing</span>Floor 2 plan</div>
          <div><span>Cut</span>+1.20 m</div>
          <div><span>Scale</span>1:100</div>
          <div><span>Sheet</span>A-103</div>
        </div>
        <div className="tb-row tb-foot">Level +6.70</div>
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
      {!loaderGone && !(record && ready) && <Loader progress={progress} ready={ready} onDone={hideLoader} />}

      <main ref={track} className="track" />
    </>
  );
}
