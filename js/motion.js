(() => {
  'use strict';
  const hero = document.getElementById('hero');
  const header = document.getElementById('header');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');
  document.querySelectorAll('.landing-1 > [id]').forEach(section => {
    const inner = document.createElement('div');
    inner.className = 'section-composition';
    inner.append(...section.childNodes);
    section.append(inner);
  });
  const targets = ['projects', 'team', 'benefits', 'feedback'];
  header.querySelectorAll('.layer-7 > p').forEach((item, i) => {
    const link = document.createElement('a');
    link.href = '#' + targets[i]; link.className = item.className;
    link.textContent = item.textContent; item.replaceWith(link);
  });
  const cta = hero.querySelector('.hero_cta-31');
  const ctaLink = document.createElement('a');
  ctaLink.className = cta.className; ctaLink.href = '#feedback';
  ctaLink.append(...cta.childNodes); cta.replaceWith(ctaLink);
  const source = hero.querySelector('.hero_logo-15');
  const destination = header.querySelector('.logo_ingotech-4');
  const flying = document.createElement('div');
  flying.className = 'flying-logo';
  flying.setAttribute('aria-hidden', 'true');
  flying.append(source.querySelector('img').cloneNode());
  document.body.append(flying);
  const office = document.getElementById('office');
  const joinArt = [...office.querySelectorAll('.layer-708, .layer-710, .layer-713, .layer-715')];
  // Each object has its own launch, curved path and continuing outward drift.
  const joinPaths = [
    { delay: 0, end: .86, bendX: -65, bendY: -40, angle: -18, driftX: -75, driftY: -100, spin: -9, growth: .06 },
    { delay: .22, end: 1, bendX: -35, bendY: 80, angle: 24, driftX: -100, driftY: 35, spin: 13, growth: .10 },
    { delay: .08, end: .74, bendX: 55, bendY: -75, angle: 19, driftX: 60, driftY: -125, spin: 16, growth: -.04 },
    { delay: .30, end: .96, bendX: 80, bendY: 45, angle: -15, driftX: 95, driftY: 65, spin: -11, growth: .08 }
  ];
  const clamp = value => Math.max(0, Math.min(1, value));
  let origin, target, joinStart, joinGeometry, progress = 0, joinProgress = 0;
  let initialized = false;
  const layers = [...hero.querySelectorAll('.layer-13, .layer-33, [data-name^="Hero_Tag"]')];
  layers.forEach(el => el.classList.add('motion-layer'));
  let height, raf = 0, pointerX = 0, pointerY = 0, x = 0, y = 0, lastTime = 0;
  let docked = scrollY > 3;
  function measure() {
    height = hero.offsetHeight;
    const scale = Math.min(1, innerWidth / 1440, Math.max(.2, (height - 90) / 705));
    hero.style.setProperty('--hero-scale', scale);
    const box = source.getBoundingClientRect();
    origin = { left: box.left, top: box.top + scrollY, width: box.width };
    target = destination.getBoundingClientRect();
    joinStart = office.getBoundingClientRect().top + scrollY + 800;
    joinGeometry = joinArt.map(el => ({
      x: 720 - el.offsetLeft - el.offsetWidth / 2,
      y: 1140 - el.offsetTop - el.offsetHeight / 2
    }));
    wake();
  }
  function render(time) {
    raf = 0;
    const scroll = Math.max(0, scrollY);
    // A small dead zone prevents trackpad bounce from flickering the header.
    if (scroll > 3) docked = true;
    else if (scroll <= 1) docked = false;
    header.classList.toggle('is-docked', docked);
    const dt = Math.min(64, lastTime ? time - lastTime : 16.7);
    lastTime = time;
    const response = 1 - Math.exp(-dt / 110);
    // Scroll directs the whole journey; vertical lift leads the reduction in size.
    const desired = clamp((scroll - 3) / Math.min(360, height * .42));
    const joinDesired = Math.max(0, Math.min(2.8, (scroll + innerHeight * .92 - joinStart) / (innerHeight * .7)));
    if (!initialized || reduced.matches) {
      progress = desired; joinProgress = joinDesired; initialized = true;
    } else {
      progress += (desired - progress) * (1 - Math.exp(-dt / 75));
      joinProgress += (joinDesired - joinProgress) * response;
    }
    if (Math.abs(desired - progress) < .0005) progress = desired;
    if (Math.abs(joinDesired - joinProgress) < .0005) joinProgress = joinDesired;
    const p = reduced.matches ? (docked ? 1 : 0) : progress;
    const inFlight = p > 0 && p < 1;
    header.classList.toggle('is-revealed', p > .78 || reduced.matches);
    hero.classList.toggle('is-docked', p > 0);
    hero.classList.toggle('logo-in-flight', inFlight);
    header.classList.toggle('logo-in-flight', p < 1);
    flying.style.visibility = inFlight ? 'visible' : 'hidden';
    if (inFlight) {
      const lift = 1 - Math.pow(1 - p, 3);
      const shrink = p * p * (3 - 2 * p);
      const left = origin.left + (target.left - origin.left) * lift;
      const top = (origin.top - scroll) * (1 - lift) + target.top * lift;
      const width = origin.width + (target.width - origin.width) * shrink;
      flying.style.transform = `translate3d(${left}px,${top}px,0) scale(${width / 1107})`;
    }
    // Original positions are a waypoint, not a stop: drift continues on exit.
    joinArt.forEach((el, i) => {
      const path = joinPaths[i];
      const staggered = clamp((joinProgress - path.delay) / (path.end - path.delay));
      const reveal = reduced.matches ? 1 : staggered * staggered * (3 - 2 * staggered);
      const remaining = 1 - reveal;
      const { x: dx, y: dy } = joinGeometry[i];
      const arc = reduced.matches ? 0 : Math.sin(Math.PI * reveal);
      const exit = reduced.matches ? 0 : Math.max(0, joinProgress - path.end);
      const drift = exit * exit / (exit + .24);
      const tx = dx * remaining + path.bendX * arc + path.driftX * drift;
      const ty = dy * remaining + path.bendY * arc + path.driftY * drift;
      const angle = path.angle * remaining + path.spin * drift;
      el.style.transform = `translate3d(${tx}px,${ty}px,0) rotate(${angle}deg) scale(${.24 + .76 * reveal + path.growth * drift})`;
      el.style.opacity = String(.12 + .88 * reveal);
    });
    if (progress !== desired || joinProgress !== joinDesired) wake();
    x += (pointerX - x) * response; y += (pointerY - y) * response;
    if (!reduced.matches && scroll < height && !document.hidden) {
      layers.forEach((el, i) => {
        const illustration = el.matches('.layer-13, .layer-33');
        const depth = illustration ? 0 : 8;
        const wave = time / 1000 * .65 + (illustration ? 0 : i * 1.7);
        const direction = el.matches('.layer-33') ? -1 : 1;
        el.style.transform = `translate3d(${x * depth + Math.sin(wave) * (illustration ? 9 : 3) * direction}px,${y * depth + Math.cos(wave) * (illustration ? 12 : 4) * direction}px,0) rotate(${illustration ? Math.sin(wave) * .7 * direction : x * .4}deg)`;
      });
      wake();
    } else { layers.forEach(el => el.style.removeProperty('transform')); }
  }
  function wake() { if (!raf) raf = requestAnimationFrame(render); }
  hero.addEventListener('pointermove', event => {
    if (!finePointer.matches) return;
    pointerX = (event.clientX / innerWidth - .5) * 2;
    pointerY = (event.clientY / height - .5) * 2;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointerX = pointerY = 0; });
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', measure, { passive: true });
  document.addEventListener('visibilitychange', wake);
  reduced.addEventListener('change', wake);
  measure();
})();
