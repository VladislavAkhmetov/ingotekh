// Projects (<1024px): the section pins while the cards travel left in step with vertical scroll.
(() => {
  'use strict';
  const section = document.getElementById('projects');
  const pin = section && section.querySelector('.projects-pin');
  const rail = section && section.querySelector('.projects-rail');
  if (!rail) return;
  const small = matchMedia('(max-width: 1023px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const track = section.querySelector(':scope > .section-composition');
  let travel = 0, raf = 0;
  const active = () => small.matches && !reduced.matches;
  function measure() {
    section.classList.toggle('projects-scroll', active());
    if (!active()) { rail.style.removeProperty('transform'); track.style.removeProperty('height'); return; }
    pin.scrollLeft = 0;
    travel = Math.max(0, rail.scrollWidth - pin.clientWidth);
    // The track is exactly the pinned content plus the horizontal distance to travel.
    track.style.height = pin.offsetHeight + travel + 'px';
    update();
  }
  function update() {
    raf = 0;
    if (!active()) return;
    const stick = parseFloat(getComputedStyle(pin).top) || 0;
    const p = travel ? Math.min(1, Math.max(0, (stick - track.getBoundingClientRect().top) / travel)) : 0;
    rail.style.transform = `translate3d(${-p * travel}px,0,0)`;
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', measure, { passive: true });
  small.addEventListener('change', measure);
  reduced.addEventListener('change', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  addEventListener('load', measure);
  measure();
})();
