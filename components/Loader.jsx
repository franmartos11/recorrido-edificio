'use client';
// Loading screen: a quiet title, a hairline across the foot of the page and a large counter.
// The counter follows the real build progress (never faster than MIN seconds) and eases into it;
// once the scene is ready the type drops away and the paper fades off the first view.
import { useEffect, useRef, useState } from 'react';

const MIN = 1.8;   // seconds: the shortest the screen is shown

export default function Loader({ progress, ready, onDone }) {
  const [shown, setShown] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const target = useRef(0);
  const isReady = useRef(false);
  target.current = progress;
  isReady.current = ready;

  useEffect(() => {
    const t0 = performance.now();
    let raf, v = 0, left = false;
    const tick = () => {
      const timeCap = (performance.now() - t0) / 1000 / MIN;
      const goal = Math.min(isReady.current ? 1 : target.current * 0.97, timeCap);
      v += (goal - v) * 0.07;
      if (goal - v < 0.002) v = goal;
      setShown(v);
      if (v >= 0.999 && isReady.current && !left) {
        left = true;
        setLeaving(true);
        setTimeout(() => onDone?.(), 1400);
      }
      if (!left) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  const pct = Math.round(shown * 100);

  return (
    <div className={`loader${leaving ? ' done' : ''}`} role="status" aria-label={`Loading ${pct}%`}>
      <div className="ld-mast">
        <span className="ld-mark">STUDIO&nbsp;NAME</span>
        <span className="ld-meta">Corner Building · Mixed use</span>
      </div>

      <div className="ld-center">
        <h1 className="ld-title"><span>Corner Building</span></h1>
        <p className="ld-sub"><span>Three shops, fourteen apartments and a roof terrace</span></p>
      </div>

      <div className="ld-foot">
        <span className="ld-note">Preparing the model</span>
        <span className="ld-count">{pct}</span>
      </div>
      <div className="ld-line"><i style={{ transform: `scaleX(${shown})` }} /></div>
    </div>
  );
}
