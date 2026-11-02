// Enquiries from the form (components/Enquiry.jsx). Validates and acknowledges; delivery (email or
// CRM) is connected here once the studio's details are final — until then it is only logged.
export async function POST(req) {
  let d;
  try { d = await req.json(); } catch { return Response.json({ ok: false, error: 'Invalid request' }, { status: 400 }); }
  const s = (v, n = 2000) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
  const e = { name: s(d.name, 120), email: s(d.email, 200), phone: s(d.phone, 40), space: s(d.space, 80), intent: s(d.intent, 40), message: s(d.message), contact: s(d.contact, 20) };
  if (!e.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email) || d.consent !== true) {
    return Response.json({ ok: false, error: 'Please complete the required fields.' }, { status: 422 });
  }
  if (s(d.website)) return Response.json({ ok: true });   // honeypot: bots fill the hidden field
  console.log('[enquiry]', new Date().toISOString(), e);
  return Response.json({ ok: true });
}
