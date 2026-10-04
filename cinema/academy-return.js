/* Academy return link (opt-in, no effect without ?return=).
   82TRADE Academy sends learners here with ?start=scan01&return=<academy url>.
   After the result exists, show one button that goes back to the Academy with
   ?dna=CODE. The code is a self-reported label: no answers, scores or session
   data leave this page. Only allowlisted Academy origins are accepted, so this
   can never become an open redirect. Scoring, copy and the result flow are untouched. */
(() => {
  const ALLOWED = [
    'https://academy-staging.178-128-94-48.sslip.io',
    'https://academy.82trade.com',
    'https://82trade.com',
    'https://www.82trade.com',
  ];
  const KEY = '82trade-trader-dna:academy-return:v1';
  const CODES = /^[SI][AW][HG][CF]$/;

  function allowed(raw) {
    try {
      const u = new URL(raw);
      return ALLOWED.includes(u.origin) ? u.href : null;
    } catch {
      return null;
    }
  }
  const param = new URLSearchParams(location.search).get('return');
  if (param) {
    const ok = allowed(param);
    try { ok ? sessionStorage.setItem(KEY, ok) : sessionStorage.removeItem(KEY); } catch { /* storage blocked */ }
  }
  let target = null;
  try { target = sessionStorage.getItem(KEY); } catch { /* storage blocked */ }
  if (!target) return;

  function show(code) {
    if (!CODES.test(String(code || '')) || document.getElementById('academy-return')) return;
    const u = new URL(target);
    u.searchParams.set('dna', code);
    const a = document.createElement('a');
    a.id = 'academy-return';
    a.href = u.href;
    a.textContent = '回到 82TRADE Academy →';
    a.setAttribute('style', [
      'position:fixed', 'left:50%', 'bottom:calc(env(safe-area-inset-bottom,0px) + 20px)', 'transform:translateX(-50%)',
      'z-index:9999', 'padding:14px 22px', 'border-radius:999px', 'background:#ece7dc', 'color:#090a09',
      'font:700 15px/1 "Helvetica Neue",Arial,"PingFang TC",sans-serif', 'text-decoration:none', 'letter-spacing:.02em',
      'box-shadow:0 12px 30px rgba(0,0,0,.35)',
    ].join(';'));
    document.body.appendChild(a);
  }

  // New result: wait for the reveal to finish before offering the way back.
  document.addEventListener('traderdna:completed', (e) => setTimeout(() => show(e.detail && e.detail.dna), 3200));
  // Returning visitor who already has a result.
  addEventListener('load', () => {
    const last = window.TraderDNAEventStore && window.TraderDNAEventStore.getLastCompleted();
    if (last && last.dna) show(last.dna);
  });
})();
