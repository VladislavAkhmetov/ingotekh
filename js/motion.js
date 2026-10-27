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
  document.querySelectorAll('img.chika-source, img.mascot-source').forEach(img => {
    fetch(img.src).then(response => response.text()).then(markup => {
      const svg = document.importNode(new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement, true);
      img.classList.forEach(name => {
        if (name !== 'chika-source' && name !== 'mascot-source') svg.classList.add(name);
      });
      img.replaceWith(svg);
    });
  });
  const targets = ['projects', 'team', 'benefits', 'feedback'];
  header.querySelectorAll('.layer-7 > p').forEach((item, i) => {
    const link = document.createElement('a');
    link.href = '#' + targets[i]; link.className = item.className;
    link.textContent = item.textContent; item.replaceWith(link);
  });
  const source = hero.querySelector('.hero_logo-15');
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
  let joinStart, joinGeometry, progress = 0, joinProgress = 0;
  let initialized = false;
  const layers = [...hero.querySelectorAll('.layer-13, .layer-33, [data-name^="Hero_Tag"]')];
  layers.forEach(el => el.classList.add('motion-layer'));
  // Each tag floats on its own rhythm, depth and direction.
  const tagMotion = new Map([
    ['hero-tag--ecosystems', { speed: .55, phase: 0, ampX: 4, ampY: 7, depth: 10, tilt: .5 }],
    ['hero-tag--digital', { speed: .82, phase: 2.1, ampX: 6, ampY: 3, depth: -7, tilt: -.4 }],
    ['hero-tag--ai', { speed: .41, phase: 4.3, ampX: 3, ampY: 6, depth: 15, tilt: .3 }]
  ]);
  const motionFor = el => [...el.classList].map(c => tagMotion.get(c)).find(Boolean) || { speed: .65, phase: 0, ampX: 3, ampY: 4, depth: 8, tilt: .4 };
  let height, raf = 0, pointerX = 0, pointerY = 0, x = 0, y = 0, lastTime = 0;
  let docked = scrollY > 3;
  function measure() {
    const viewport = document.documentElement.clientWidth;
    const pageScale = viewport > 1440 ? (viewport - 160) / 1280 : 1;
    document.documentElement.style.setProperty('--page-scale', pageScale);
    document.documentElement.style.setProperty('--viewport-width', viewport + 'px');
    height = hero.offsetHeight;
    const widthScale = viewport > 1440 ? pageScale : viewport / 1440;
    const scale = Math.min(widthScale, Math.max(.2, (height - 90) / 705));
    hero.style.setProperty('--hero-scale', scale);
    // Keep the composition's 80px gutter at the same 80px * page-scale as the sections below.
    hero.style.setProperty('--hero-left', 80 * pageScale - 80 * scale + 'px');
    joinStart = office.getBoundingClientRect().top + scrollY + 727 * pageScale;
    joinGeometry = joinArt.map(el => ({
      x: 720 - el.offsetLeft - el.offsetWidth / 2,
      y: 1067 - el.offsetTop - el.offsetHeight / 2
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
    // The hero logo dissolves with scroll; the header appears as one unit once it's mostly gone.
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
    header.classList.toggle('is-revealed', p > .6);
    const fade = clamp(p / .7);
    source.style.opacity = String(1 - fade);
    source.style.filter = fade > 0 ? `blur(${fade * 18}px)` : '';
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
      layers.forEach(el => {
        const illustration = el.matches('.layer-13, .layer-33');
        if (illustration) {
          const wave = time / 1000 * .65;
          const direction = el.matches('.layer-33') ? -1 : 1;
          el.style.transform = `translate3d(${Math.sin(wave) * 9 * direction}px,${Math.cos(wave) * 12 * direction}px,0) rotate(${Math.sin(wave) * .7 * direction}deg)`;
          return;
        }
        const m = motionFor(el);
        const t = time / 1000;
        const wx = Math.sin(t * m.speed + m.phase) * m.ampX;
        const wy = Math.cos(t * m.speed * 1.37 + m.phase) * m.ampY;
        el.style.transform = `translate3d(${x * m.depth + wx}px,${y * m.depth + wy}px,0) rotate(${x * m.tilt + Math.sin(t * m.speed * .8 + m.phase) * .6}deg)`;
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
