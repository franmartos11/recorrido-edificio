'use client';
// Enquiry form, opened from any "Enquire" button (window event 'cb:enquire', detail: the space).
// Posts to /api/enquiry; a thank-you replaces the form once it is received.
import { useEffect, useRef, useState } from 'react';

const SPACES = ['Any', 'Shop 01 · Café', 'Shop 02 · Clothing', 'Shop 03 · Books', 'Studio 1.02', 'Residence 2.01', 'Another apartment', 'Parking space'];
const INTENTS = ['Buy', 'Rent', 'Lease a shop', 'Just curious'];

export default function Enquiry({ open, space, onClose }) {
  const [state, setState] = useState('idle');   // idle | sending | done | error
  const [err, setErr] = useState('');
  const [intent, setIntent] = useState('Buy');
  const form = useRef(null);

  useEffect(() => {
    if (!open) return;
    setState('idle'); setErr('');
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    setTimeout(() => form.current?.querySelector('input')?.focus(), 450);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(form.current);
    const data = Object.fromEntries(f.entries());
    data.consent = f.get('consent') === 'on';
    data.intent = intent;
    if (!data.name || !data.email || !data.consent) { setErr('Please add your name and email, and accept to be contacted.'); return; }
    setState('sending'); setErr('');
    try {
      const r = await fetch('/api/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Something went wrong.');
      setState('done');
    } catch (x) { setState('error'); setErr(x.message || 'Something went wrong. Please try again.'); }
  };

  const match = SPACES.find((s) => space && s.toLowerCase().includes(space.toLowerCase().replace(/^shop \d+ · /, ''))) ?? 'Any';

  return (
    <div className={`eq${open ? ' open' : ''}`} aria-hidden={!open}>
      <div className="eq-back" onClick={onClose} />
      <div className="eq-panel" data-lenis-prevent role="dialog" aria-modal="true" aria-label="Enquire">
        <button className="rs-x" onClick={onClose} aria-label="Close">×</button>
        {state === 'done' ? (
          <div className="eq-done">
            <p className="rs-k">Corner Building</p>
            <h2 className="eq-t">Thank you.</h2>
            <p className="rs-l">We have your enquiry and will be in touch within two working days.</p>
            <button className="cta-b primary" onClick={onClose}>Back to the walk</button>
          </div>
        ) : (
          <form ref={form} onSubmit={submit} noValidate key={open ? space || 'any' : 'closed'}>
            <p className="rs-k">Corner Building · Availability</p>
            <h2 className="eq-t">Enquire</h2>
            <p className="rs-l">Tell us what you are looking for and we will send plans, prices and times to visit.</p>
            <div className="eq-chips" role="radiogroup" aria-label="I would like to">
              {INTENTS.map((i) => (
                <button type="button" key={i} role="radio" aria-checked={intent === i} className={intent === i ? 'on' : ''} onClick={() => setIntent(i)}>{i}</button>
              ))}
            </div>
            <div className="eq-grid">
              <label className="eq-f"><span>Name *</span><input name="name" autoComplete="name" required /></label>
              <label className="eq-f"><span>Email *</span><input name="email" type="email" autoComplete="email" required /></label>
              <label className="eq-f"><span>Phone</span><input name="phone" type="tel" autoComplete="tel" /></label>
              <label className="eq-f"><span>Interested in</span>
                <select name="space" defaultValue={match}>{SPACES.map((s) => <option key={s}>{s}</option>)}</select>
              </label>
              <label className="eq-f wide"><span>Message</span><textarea name="message" rows={4} placeholder="Size, timing, questions…" /></label>
            </div>
            <fieldset className="eq-contact">
              <legend>Best way to reach you</legend>
              {['Email', 'Phone', 'WhatsApp'].map((c, i) => (
                <label key={c}><input type="radio" name="contact" value={c} defaultChecked={i === 0} /><span>{c}</span></label>
              ))}
            </fieldset>
            <input className="eq-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <label className="eq-consent"><input type="checkbox" name="consent" /><span>I agree to be contacted about Corner Building.</span></label>
            {err && <p className="eq-err" role="alert">{err}</p>}
            <div className="rs-a">
              <button className="cta-b primary" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send enquiry'}</button>
              <button className="cta-b ghost" type="button" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
