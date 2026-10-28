// Partners (<1024px): badges hang from short straps in a swipeable rail and sway like
// pendulums as the rail moves. Same constants as the desktop pendulum in sections.js.
(() => {
  'use strict';
  const partners = document.getElementById('partners');
  const rail = partners && partners.querySelector('.partners-rail');
  if (!rail) return;
  const badges = [...rail.querySelectorAll('.quote-card')];
  const small = matchMedia('(max-width: 1023px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const LEN = 260, W = 6.2, DAMP = 2 * .18 * W, COUPLE = .1, DRAG = .003, DT = 1 / 240;
  const state = badges.map(() => ({ th: 0, w: 0 }));
  let lastScroll = rail.scrollLeft, lastT = 0, vx = 0, ax = 0, frame = 0, kicked = false;
  const active = () => small.matches && !reduced.matches;

  function tick(now) {
    frame = 0;
    if (!active()) return clear();
    let dt = Math.min(.05, Math.max(.001, (now - lastT) / 1000));
    lastT = now;
    // Hook velocity on screen is the opposite of the rail's scroll direction.
    const v = -(rail.scrollLeft - lastScroll) / dt;
    lastScroll = rail.scrollLeft;
    ax = (v - vx) / dt; vx = v;
    let moving = Math.abs(v) > 1;
    for (let t = dt; t > 1e-6; t -= DT) {
      const h = Math.min(DT, t);
      state.forEach(s => {
        s.w += (-W * W * Math.sin(s.th) + (COUPLE * ax / LEN + DRAG * vx) * Math.cos(s.th) - DAMP * s.w) * h;
        s.th = Math.max(-.5, Math.min(.5, s.th + s.w * h));
      });
    }
    state.forEach((s, i) => {
      badges[i].style.transform = `rotate(${s.th.toFixed(4)}rad)`;
      if (Math.abs(s.th) > 2e-4 || Math.abs(s.w) > 2e-3) moving = true;
    });
    if (moving) frame = requestAnimationFrame(tick);
  }
  function wake() { if (!frame && active()) { lastT = performance.now(); frame = requestAnimationFrame(tick); } }
  function clear() { badges.forEach(b => b.style.removeProperty('transform')); state.forEach(s => { s.th = s.w = 0; }); }

  rail.addEventListener('scroll', wake, { passive: true });
  small.addEventListener('change', () => { clear(); wake(); });
  reduced.addEventListener('change', () => { clear(); wake(); });
  // A small hello swing the first time the badges come into view.
  new IntersectionObserver(entries => {
    if (kicked || !entries.some(e => e.isIntersecting) || !active()) return;
    kicked = true;
    state.forEach((s, i) => { s.w = (i % 2 ? -1 : 1) * (.9 + .15 * i); });
    wake();
  }, { threshold: .35 }).observe(rail);
})();
