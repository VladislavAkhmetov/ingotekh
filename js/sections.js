(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  document.documentElement.classList.add('motion-ready');
  const rootStyle = getComputedStyle(document.documentElement);
  const STAGGER = parseFloat(rootStyle.getPropertyValue('--motion-stagger')) || 220;
  const STAGGER_QUICK = parseFloat(rootStyle.getPropertyValue('--motion-stagger-quick')) || 140;

  // About: the lead's three phrases assemble first, then the right paragraphs
  // reveal one at a time as the section scrolls in. Steps advance on a fixed
  // rhythm even when the user scrolls fast, and reverse when scrolling back up.
  // The brackets follow the newest paragraph.
  const about = document.getElementById('about');
  const phrases = about ? [...about.querySelectorAll('.about-phrase')] : [];
  const lead = phrases[0]?.parentElement;
  const steps = about ? [...about.querySelectorAll('.about-step')] : [];
  const brackets = about ? [...about.querySelectorAll('.about-bracket')] : [];
  const total = phrases.length + steps.length;
  let geometry = [], shown = 0, target = 0, stepTimer = 0;
  // Below 1024px the paragraphs are in normal flow (no absolute geometry, no brackets).
  const aboutFlow = matchMedia('(max-width: 1023px)');
  function measureAbout() {
    if (aboutFlow.matches) {
      geometry = [];
      steps.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      return;
    }
    // Local (unscaled) composition units, so this stays correct under page zoom.
    geometry = steps.map(p => {
      const style = getComputedStyle(p);
      return { top: parseFloat(style.top), height: parseFloat(style.height) };
    }).sort((a, b) => a.top - b.top);
    steps.sort((a, b) => parseFloat(getComputedStyle(a).top) - parseFloat(getComputedStyle(b).top));
  }
  function renderAbout() {
    const shownSteps = Math.max(0, shown - phrases.length);
    phrases.forEach((s, i) => s.classList.toggle('is-revealed', i < shown));
    steps.forEach((p, i) => p.classList.toggle('is-revealed', i < shownSteps));
    about.classList.toggle('has-steps', shownSteps > 0);
    if (aboutFlow.matches) {
      const cur = steps[Math.max(0, shownSteps - 1)];
      const h = brackets[0] ? brackets[0].offsetHeight : 0;
      const y = cur.offsetTop + cur.offsetHeight / 2 - h / 2;
      brackets.forEach(b => b.style.setProperty('--bracket-y', `${y}px`));
      return;
    }
    if (!geometry.length) return;
    const last = geometry[geometry.length - 1];
    const current = geometry[Math.max(0, shownSteps - 1)];
    // The design places the brackets around the last paragraph; offset from there.
    const y = (current.top + current.height / 2) - (last.top + last.height / 2);
    brackets.forEach(b => b.style.setProperty('--bracket-y', `${y}px`));
  }
  function advance() {
    stepTimer = 0;
    if (shown === target) return;
    shown += shown < target ? 1 : -1;
    renderAbout();
    if (shown === target) return;
    // Quick cadence inside the lead; a fuller beat once it has assembled, so
    // the right column visibly starts after the left one is complete.
    const delay = shown < phrases.length ? STAGGER_QUICK
      : shown === phrases.length && target > shown ? STAGGER * 1.6
      : STAGGER;
    stepTimer = setTimeout(advance, delay);
  }
  function updateAbout() {
    if (!about || !steps.length) return;
    if (reduced.matches) { shown = target = total; renderAbout(); return; }
    if (aboutFlow.matches) {
      const edge = innerHeight * .88;
      const leadIn = !lead || lead.getBoundingClientRect().top < edge;
      target = leadIn ? phrases.length + steps.filter(p => p.getBoundingClientRect().top < edge).length : 0;
      if (target !== shown && !stepTimer) advance();
      return;
    }
    const composition = steps[0].offsetParent || about;
    const box = composition.getBoundingClientRect();
    const scale = box.width / 1440 || 1;
    // A block qualifies once its slot is 12% above the bottom of the viewport,
    // so the lead arrives before the section is fully on screen. Paragraphs
    // only queue up behind a fully assembled lead.
    const line = innerHeight * .88;
    const leadTop = lead ? parseFloat(getComputedStyle(lead).top) : 0;
    const leadIn = !lead || box.top + leadTop * scale < line;
    target = leadIn ? phrases.length + geometry.filter(g => box.top + g.top * scale < line).length : 0;
    if (target !== shown && !stepTimer) advance();
  }
  if (about && steps.length) {
    measureAbout(); renderAbout();
    addEventListener('resize', () => { if (aboutFlow.matches) renderAbout(); }, { passive: true });
    aboutFlow.addEventListener('change', () => { measureAbout(); renderAbout(); updateAbout(); });
  }

  // Mascots: thumbnails switch the featured character.
  const stage = document.querySelector('.mascot-stage');
  if (stage) {
    const name = stage.querySelector('.mascot-info__name');
    const desc = stage.querySelector('.mascot-info__desc');
    const more = stage.querySelector('.mascot-info__more');
    const thumbs = [...stage.querySelectorAll('.mascot-thumb')];
    const figures = [...stage.querySelectorAll('.mascot-figure')];
    thumbs.forEach(thumb => thumb.addEventListener('click', () => {
      const key = thumb.dataset.mascot;
      thumbs.forEach(item => {
        const active = item === thumb;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      figures.forEach(figure => {
        const active = figure.dataset.mascot === key;
        figure.hidden = !active;
        figure.classList.toggle('is-active', active);
      });
      // Scope the shared character animations to the whole stage.
      ['tim', 'ficha', 'fix'].forEach(item => stage.classList.toggle(`mascot-${item}`, item === key));
      name.textContent = thumb.dataset.name;
      desc.textContent = thumb.dataset.desc;
      // "подробнее" opens the story of whichever character is featured.
      if (more) {
        more.dataset.projectPopup = `popup-mascot-${key}`;
        more.setAttribute('aria-controls', `popup-mascot-${key}`);
      }
    }));
  }

  // Sequential reveal shared across sections: each item enters once its slot
  // crosses the trigger line, one after another on the shared rhythm (quick
  // inside a phrase run, a fuller beat after it), reversing on the way back.
  const sequences = [];
  function sequence(items) {
    items = items.filter(item => item.el);
    if (items.length) sequences.push({ items, shown: 0, target: 0, timer: 0 });
  }
  function stepSequence(seq) {
    seq.timer = 0;
    if (seq.shown === seq.target) return;
    const up = seq.shown < seq.target;
    const item = seq.items[up ? seq.shown : seq.shown - 1];
    [item.el, ...(item.also || [])].forEach(el => el.classList.toggle('is-revealed', up));
    seq.shown += up ? 1 : -1;
    if (seq.shown === seq.target) return;
    const prev = seq.items[up ? seq.shown - 1 : seq.shown];
    const next = seq.items[up ? seq.shown : seq.shown - 1];
    const delay = prev.quick && next.quick ? STAGGER_QUICK : up && prev.quick ? STAGGER * 1.6 : STAGGER;
    seq.timer = setTimeout(() => stepSequence(seq), delay);
  }
  function updateSequences() {
    const line = innerHeight * .88;
    sequences.forEach(seq => {
      if (reduced.matches) {
        seq.items.forEach(item => [item.el, ...(item.also || [])].forEach(el => el.classList.add('is-revealed')));
        seq.shown = seq.target = seq.items.length;
        return;
      }
      let target = 0;
      while (target < seq.items.length && seq.items[target].el.getBoundingClientRect().top < line) target++;
      seq.target = target;
      if (target !== seq.shown && !seq.timer) stepSequence(seq);
    });
  }
  const phraseItems = root => [...(root?.querySelectorAll('.reveal-phrase') || [])].map(el => ({ el, quick: true }));
  const stepItems = els => els.map(el => { el.classList.add('reveal-step'); return { el }; });

  // Projects: the four cards rise in left to right, on the shared rhythm.
  sequence(stepItems([...document.querySelectorAll('#projects .project-card')]));

  // Team: tech stack heading, then cards (each cascading its title and tags),
  // then the copy, then stats and the CTA. The 3D illustrations stay untouched:
  // they will become one scroll-driven sequence later.
  const team = document.getElementById('team');
  if (team) {
    const cards = [...team.querySelectorAll('.techstack_grid-145 > div > div')];
    cards.forEach(card => card.querySelectorAll('p').forEach((chip, i) => {
      chip.classList.add('reveal-chip');
      chip.style.setProperty('--i', i);
    }));
    sequence([...phraseItems(team.querySelector('.layer-144')), ...stepItems(cards)]);
    sequence(stepItems([...team.querySelectorAll('.team_textblock-104 > p')]));
    sequence(stepItems([...team.querySelectorAll('.team-stat'), team.querySelector('.team_cta-118')].filter(Boolean)));
  }

  // Mascots: the intro copy enters paragraph by paragraph, like the Team copy.
  sequence(stepItems([...document.querySelectorAll('#mascots .mascots-intro > p')]));

  // Employee quotes: badges hang from short lanyards on a rail above the frame,
  // overlapping like a card file. Scrolling down pulls them in from the right;
  // each is let go at its slot in turn and swings itself upright. Hovering lifts
  // a badge out of the row, square to the viewer, and holds it there for
  // reading; letting go lets it drift back on the same physics. While a badge
  // is out, its left neighbour gently leans away to make room, and the
  // stacking order only flips once the two clear each other on screen, so
  // nothing appears to pass through anything. Everything eases; nothing snaps.
  // A small pendulum model (swing, depth sway, lanyard twist, air drag, depth
  // spring) drives every frame. Units are local composition px.
  const partners = document.getElementById('partners');
  const badges = partners ? [...partners.querySelectorAll('.quote-card')] : [];
  if (badges.length) {
    const DT = 1 / 240;
    const LEN = 260;                              // strap top (pivot) to centre of mass
    const W = 6.2, DAMP = 2 * .18 * W;            // ~1 s swing that settles in ~2.5 s
    const TWIST_W = 4.4, TWIST_DAMP = 2 * .3 * TWIST_W;
    const RAIL_K = 8, RAIL_VMAX = 900;           // hook follows the rail, speed-limited
    const COUPLE = .1, DRAG = .003;               // inertia kick; air drag (~4° tilt at full speed)
    const EASE_IN = 36, GAP = 80;                 // soft stop at the slot; extra rail spacing = releases in turn
    // Resting pose: full size, turned around the lanyard with the left edge
    // further away. The turn is steep enough that neighbours overlap only by the
    // empty left padding. Keep in sync with the .quote-card fallback in revisions.css.
    const PERSPECTIVE = 1100, TWIST_REST = -32 * Math.PI / 180, HALF = 152.5;
    // Reading pose: square to the viewer and brought closer (~17% larger).
    // Unhurried, critically damped springs: ~0.8 s out, ~1 s back.
    const LIFT = 160, HOLD_W = 5.5, LIFT_W = 5;
    const RETURN_W = 4.5, RETURN_DAMP = 2 * .75 * RETURN_W;
    // Making room: the left neighbour slides its hook a little left, turns a
    // little further away and leans, all following one slow eased value.
    const YIELD_W = 5.5, YIELD_X = 30, YIELD_TW = .4, YIELD_LEAN = .08;
    // Below 1024px the badges hang in a swipeable rail (js/partners-mobile.js drives the sway).
    const partnersFlow = matchMedia('(max-width: 1023px)');
    const state = badges.map((el, i) => ({
      el, slot: 0, target: 0, x: 0, vx: 0, a: 0, acc: 0, z: 0, zV: 0, held: false, ahead: false, layer: null, give: 0, giveV: 0,
      th: 0, w: 0, tilt: 0, tiltV: 0, tw: 0, twV: 0, hand: i % 2 ? .5 : -.5,
    }));
    let width = 0, start = 0, end = 0, progress = 0, last = 0, frame = 0;
    const settle = v => v <= 0 ? 0 : v < EASE_IN ? v * v / (2 * EASE_IN) : v - EASE_IN / 2;
    // Depth of a badge's left (side -1) or right (side 1) edge, toward the viewer.
    const edge = (s, side) => s.z - side * HALF * Math.sin(TWIST_REST + s.tw);
    const isAhead = i => edge(state[i], -1) > edge(state[i - 1], 1);
    // On-screen horizontal reach of a badge's left (-1) or right (1) side,
    // with perspective and the swing of its corners (top 110, bottom 411 px
    // below the hook).
    function reach(s, side) {
      const turn = TWIST_REST + s.tw, xe = side * HALF, n = Math.sin(s.th);
      const scale = PERSPECTIVE / (PERSPECTIVE - (s.z - xe * Math.sin(turn)));
      const swing = side > 0 ? Math.max(-110 * n, -411 * n) : Math.min(-110 * n, -411 * n);
      return s.slot + s.x + HALF + (xe * Math.cos(turn) + swing) * scale;
    }
    function measure() {
      width = partners.clientWidth;
      state.forEach(s => { s.slot = parseFloat(getComputedStyle(s.el).left) || 0; });
      start = width + 60 + EASE_IN / 2 - state[0].slot; // first badge just past the right edge
      end = -(state.length - 1) * GAP;                   // last badge reaches its slot
    }
    function readScroll() {
      // Badges start arriving as the section enters and are all hung once its
      // top reaches the upper fifth of the viewport.
      const top = partners.getBoundingClientRect().top;
      progress = Math.min(1, Math.max(0, (innerHeight * .92 - top) / (innerHeight * .72)));
      const rail = start + (end - start) * progress;
      state.forEach((s, i) => { s.target = settle(rail + i * GAP); });
    }
    const toward = (value, velocity, goal, k, dt) => velocity + (k * k * (goal - value) - 2 * k * velocity) * dt;
    function step(dt) {
      state.forEach((s, i) => {
        // Make room while the right neighbour is out (held, or still in front).
        const next = state[i + 1];
        s.giveV = toward(s.give, s.giveV, next && (next.held || next.ahead) ? 1 : 0, YIELD_W, dt);
        s.give += s.giveV * dt;
        let v = s.vx + (RAIL_K * RAIL_K * (s.target - YIELD_X * s.give - s.x) - 2 * RAIL_K * s.vx) * dt;
        v = Math.max(-RAIL_VMAX, Math.min(RAIL_VMAX, v));
        s.a = (v - s.vx) / dt;
        s.vx = v;
        s.x += v * dt;
        if (s.held) {
          // Held up for reading: firm springs square the badge to the viewer.
          s.w = toward(s.th, s.w, 0, HOLD_W, dt);
          s.tiltV = toward(s.tilt, s.tiltV, 0, HOLD_W, dt);
          s.twV = toward(s.tw, s.twV, -TWIST_REST, HOLD_W, dt);
          s.zV = toward(s.z, s.zV, LIFT, LIFT_W, dt);
        } else {
          // Pendulum with a moving pivot: gravity, inertia of the hook, air drag.
          s.w += (-W * W * Math.sin(s.th - YIELD_LEAN * s.give) + (COUPLE * s.a / LEN + DRAG * s.vx) * Math.cos(s.th) - DAMP * s.w) * dt;
          s.tiltV += (-W * W * Math.sin(s.tilt) - DAMP * s.tiltV) * dt;
          // The lanyard twists a little whenever the hook speeds up or brakes.
          s.twV += (-TWIST_W * TWIST_W * (s.tw + YIELD_TW * s.give) - TWIST_DAMP * s.twV + s.hand * COUPLE * s.a / LEN) * dt;
          s.zV += (-RETURN_W * RETURN_W * s.z - RETURN_DAMP * s.zV) * dt;
        }
        s.th = Math.max(-.6, Math.min(.6, s.th + s.w * dt));
        s.tilt += s.tiltV * dt;
        s.tw += s.twV * dt;
        s.z += s.zV * dt;
      });
      // Depth order between neighbours flips (with a little hysteresis) only
      // when they no longer overlap on screen, so the change is invisible. A
      // fully lifted badge comes forward regardless, as a last resort.
      for (let i = 1; i < state.length; i++) {
        const l = state[i - 1], c = state[i];
        const depth = edge(c, -1) - edge(l, 1);
        const want = c.ahead ? depth > -10 : depth > 10;
        if (want !== c.ahead && (reach(c, -1) >= reach(l, 1) || (want && c.held && c.z > LIFT * .97))) c.ahead = want;
      }
    }
    function render() {
      // Stacking follows depth between neighbours (non-neighbours never overlap).
      let layer = 100;
      state.forEach((s, i) => {
        if (i) layer += s.ahead ? 1 : -1;
        if (s.layer !== layer) s.el.style.zIndex = s.layer = layer;
        const turn = TWIST_REST + s.tw;
        s.el.style.transform = `translate3d(${s.x.toFixed(2)}px,0,0) perspective(${PERSPECTIVE}px) translateZ(${s.z.toFixed(2)}px) rotateZ(${s.th.toFixed(4)}rad) rotateX(${s.tilt.toFixed(4)}rad) rotateY(${turn.toFixed(4)}rad)`;
        s.el.style.setProperty('--glint', Math.min(1, Math.abs(s.twV) * .35 + Math.abs(s.tiltV) * .4 + Math.abs(s.w) * .4 + Math.abs(s.zV) * .002).toFixed(3));
        s.el.style.setProperty('--glint-x', `${(50 + (turn * 1.4 - s.th * .8) * 100).toFixed(1)}%`);
      });
    }
    // At rest when every spring has reached the pose it is heading for.
    function moving(s, i) {
      const next = state[i + 1], give = next && (next.held || next.ahead) ? 1 : 0;
      const th = s.held ? 0 : YIELD_LEAN * s.give, tw = s.held ? -TWIST_REST : -YIELD_TW * s.give;
      return Math.abs(s.target - YIELD_X * s.give - s.x) > .05 || Math.abs(s.vx) > .5
        || Math.abs(s.give - give) > 1e-3 || Math.abs(s.giveV) > 1e-3
        || Math.abs(s.w) > 2e-3 || Math.abs(s.tiltV) > 2e-3 || Math.abs(s.twV) > 2e-3 || Math.abs(s.zV) > .05
        || Math.abs(s.th - th) > 2e-4 || Math.abs(s.tilt) > 2e-4 || Math.abs(s.tw - tw) > 2e-4
        || Math.abs(s.z - (s.held ? LIFT : 0)) > .05;
    }
    function tick(now) {
      frame = 0;
      let dt = Math.min(.05, Math.max(0, (now - last) / 1000));
      last = now;
      for (; dt > 1e-6; dt -= DT) step(Math.min(DT, dt));
      render();
      if (state.some(moving)) frame = requestAnimationFrame(tick);
    }
    function wake() {
      if (frame || reduced.matches || partnersFlow.matches) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
    // Place badges where the current scroll puts them, at rest (no swing on load).
    function place() {
      cancelAnimationFrame(frame);
      frame = 0;
      measure();
      if (reduced.matches || partnersFlow.matches) {
        state.forEach(s => {
          s.held = false;
          s.layer = null;
          s.el.style.transform = s.el.style.zIndex = '';
          s.el.style.removeProperty('--glint');
        });
        return;
      }
      readScroll();
      state.forEach(s => Object.assign(s, { x: s.target, vx: 0, a: 0, th: 0, w: 0, tilt: 0, tiltV: 0, tw: 0, twV: 0, z: 0, zV: 0, held: false, give: 0, giveV: 0 }));
      state.forEach((s, i) => { s.ahead = i > 0 && isAhead(i); });
      render();
    }
    // Letting go: the badge drops back with a little sway that follows the
    // direction the pointer left in.
    let pointerVX = 0, lastPX = null, lastPT = 0;
    partners.addEventListener('pointermove', e => {
      if (lastPX !== null && e.timeStamp > lastPT) pointerVX = pointerVX * .6 + .4 * (e.clientX - lastPX) / (e.timeStamp - lastPT);
      lastPX = e.clientX;
      lastPT = e.timeStamp;
    }, { passive: true });
    function hold(s, on) {
      if (reduced.matches || s.held === on) return;
      s.held = on;
      if (!on) {
        s.w -= Math.max(-1.6, Math.min(1.6, pointerVX)) * .1;
        s.tiltV -= .15;
      }
      wake();
    }
    state.forEach(s => {
      s.el.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') hold(s, true); });
      s.el.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') hold(s, false); });
      // Touch has no hover: a tap lifts a badge (and lowers any other), a second tap lowers it.
      s.el.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'touch') return;
        state.forEach(o => { if (o !== s) hold(o, false); });
        hold(s, !s.held);
      });
    });
    place();
    addEventListener('scroll', () => { readScroll(); wake(); }, { passive: true });
    addEventListener('resize', () => { measure(); readScroll(); wake(); }, { passive: true });
    reduced.addEventListener('change', place);
    partnersFlow.addEventListener('change', place);
  }

  // Office: looping photo slider. Arrows, ←/→ on the focused slider, a click on
  // a neighbour or a horizontal drag move it. Slides that wrap from one end to
  // the other jump while off-screen instead of sweeping across the frame.
  const officeSlider = document.querySelector('#office .office-slider');
  if (officeSlider) {
    const slides = [...officeSlider.querySelectorAll('.office-slide')];
    const n = slides.length;
    const offsets = slides.map(() => null);
    let current = 0;
    function render() {
      slides.forEach((slide, i) => {
        let d = ((i - current) % n + n) % n;
        if (d > n / 2) d -= n;
        const wrap = offsets[i] !== null && Math.abs(d - offsets[i]) > 1;
        slide.classList.toggle('is-wrapping', wrap);
        slide.style.setProperty('--offset', d);
        slide.style.setProperty('--par', Math.max(-1, Math.min(1, d)));
        slide.classList.toggle('is-current', d === 0);
        slide.setAttribute('aria-hidden', String(d !== 0));
        offsets[i] = d;
      });
      officeSlider.offsetWidth; // commit wrapping jumps before re-enabling transitions
      slides.forEach(slide => slide.classList.remove('is-wrapping'));
    }
    const go = step => { current = (current + step + n) % n; render(); };
    const office = officeSlider.closest('#office');
    office.querySelector('.gallery_arrowbtn_prev-704')?.addEventListener('click', () => go(-1));
    office.querySelector('.gallery_arrowbtn_next-706')?.addEventListener('click', () => go(1));
    officeSlider.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); go(e.key === 'ArrowLeft' ? -1 : 1); }
      else if ((e.key === 'Enter' || e.key === ' ') && e.target === officeSlider) { e.preventDefault(); openLightbox(); }
    });

    // Drag follows the pointer with growing resistance, then settles on release.
    let drag = null, suppressClick = false;
    officeSlider.addEventListener('pointerdown', e => {
      suppressClick = false;
      if (e.button !== 0) return;
      drag = { x: e.clientX, dx: 0, active: false, id: e.pointerId, scale: officeSlider.getBoundingClientRect().width / officeSlider.offsetWidth || 1 };
    });
    officeSlider.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = (e.clientX - drag.x) / drag.scale;
      if (!drag.active && Math.abs(dx) > 6) {
        drag.active = true;
        officeSlider.classList.add('is-dragging');
        officeSlider.setPointerCapture(e.pointerId);
      }
      if (!drag.active) return;
      drag.dx = dx;
      officeSlider.style.setProperty('--drag', `${dx / (1 + Math.abs(dx) / 900)}px`);
    });
    const release = commit => e => {
      if (!drag || e.pointerId !== drag.id) return;
      const { active, dx } = drag;
      drag = null;
      if (!active) return;
      suppressClick = true;
      officeSlider.classList.remove('is-dragging');
      officeSlider.style.setProperty('--drag', '0px');
      if (commit && Math.abs(dx) > 80) go(dx < 0 ? 1 : -1);
    };
    officeSlider.addEventListener('pointerup', release(true));
    officeSlider.addEventListener('pointercancel', release(false));
    officeSlider.addEventListener('click', e => {
      if (suppressClick) { suppressClick = false; return; }
      const slide = e.target.closest('.office-slide');
      const d = slide ? offsets[slides.indexOf(slide)] : 0;
      if (Math.abs(d) === 1) go(d);
      else if (slide && d === 0) openLightbox();
    });

    // Lightbox: the current photo zooms out of its card to full screen and back
    // on close. Arrows, keys and swipes page through it in sync with the slider.
    const lightbox = document.getElementById('office-lightbox');
    const lbImg = lightbox?.querySelector('.photo-lightbox__img');
    const LB_EASE = 'cubic-bezier(.22, 1, .36, 1)';
    let zoomAnim = null, closing = false;
    function fillLightbox() {
      const img = slides[current].querySelector('img');
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lightbox.querySelector('.photo-lightbox__count').textContent = `${current + 1} / ${n}`;
      lightbox.querySelector('.photo-lightbox__text').textContent = img.alt;
    }
    function zoom(reverse) {
      zoomAnim?.cancel();
      const from = slides[current].getBoundingClientRect();
      const to = lbImg.getBoundingClientRect();
      if (reduced.matches || !to.width || !lbImg.animate) return null;
      const sx = from.width / to.width, sy = from.height / to.height;
      const r = 20 * from.width / 709; // the card's on-screen corner radius
      lightbox.classList.add('is-zooming');
      zoomAnim = lbImg.animate([
        { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx}, ${sy})`, borderRadius: `${r / sx}px / ${r / sy}px` },
        { transform: 'none', borderRadius: '20px' }
      ], { duration: reverse ? 480 : 700, easing: LB_EASE, direction: reverse ? 'reverse' : 'normal', fill: 'forwards' });
      zoomAnim.finished.then(() => { if (!reverse) { zoomAnim.cancel(); lightbox.classList.remove('is-zooming'); } }, () => {});
      return zoomAnim;
    }
    function openLightbox() {
      if (!lightbox || typeof lightbox.showModal !== 'function' || lightbox.open) return;
      closing = false;
      lightbox.classList.remove('is-zooming');
      fillLightbox();
      lightbox.showModal();
      zoom(false);
    }
    function closeLightbox() {
      if (!lightbox.open || closing) return;
      closing = true;
      zoom(true);
      lightbox.close();
    }
    function page(step) {
      if (closing) return;
      go(step);
      fillLightbox();
      if (!reduced.matches) lbImg.animate([{ opacity: 0, transform: `translateX(${step * 32}px)` }, { opacity: 1, transform: 'none' }], { duration: 420, easing: LB_EASE });
    }
    if (lightbox) {
      lightbox.addEventListener('close', () => {
        setTimeout(() => { if (!lightbox.open) { zoomAnim?.cancel(); lightbox.classList.remove('is-zooming'); } }, 520);
      });
      lightbox.addEventListener('cancel', e => { e.preventDefault(); closeLightbox(); });
      lightbox.querySelector('.photo-lightbox__close').addEventListener('click', closeLightbox);
      lightbox.querySelector('.photo-lightbox__nav--prev').addEventListener('click', () => page(-1));
      lightbox.querySelector('.photo-lightbox__nav--next').addEventListener('click', () => page(1));
      lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
      lightbox.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); page(e.key === 'ArrowLeft' ? -1 : 1); }
      });
      let swipe = null;
      const figure = lightbox.querySelector('.photo-lightbox__figure');
      figure.addEventListener('pointerdown', e => { swipe = { x: e.clientX, id: e.pointerId }; });
      figure.addEventListener('pointerup', e => {
        if (!swipe || e.pointerId !== swipe.id) return;
        const dx = e.clientX - swipe.x;
        swipe = null;
        if (Math.abs(dx) > 50) page(dx < 0 ? 1 : -1);
      });
      figure.addEventListener('pointercancel', () => { swipe = null; });
    }

    // Fetch every photo once the section approaches, so no slide arrives blank.
    new IntersectionObserver((entries, observer) => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      slides.forEach(slide => { slide.querySelector('img').loading = 'eager'; });
      observer.disconnect();
    }, { rootMargin: '800px 0px' }).observe(officeSlider);
    render();
  }

  // Project, employee and mascot details: each trigger opens its modal dialog
  // (resolved on click, as the mascot trigger retargets). Closes on the cross,
  // Escape (native) or a click on the dimmed backdrop.
  document.querySelectorAll('[data-project-popup]').forEach(button => {
    button.addEventListener('click', e => {
      const popup = document.getElementById(button.dataset.projectPopup);
      if (!popup || typeof popup.showModal !== 'function') return;
      e.preventDefault(); // link triggers (the office address) fall back to their href without JS
      popup.showModal();
    });
  });
  document.querySelectorAll('.project-popup').forEach(popup => {
    popup.querySelector('.project-popup__close').addEventListener('click', () => popup.close());
    popup.addEventListener('click', e => {
      if (e.target !== popup) return;
      const r = popup.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) popup.close();
    });
  });

  // Office map popup: the Yandex widget loads on first open, then fades in.
  const mapPopup = document.getElementById('popup-office-map');
  if (mapPopup) {
    const frame = mapPopup.querySelector('iframe[data-src]');
    const loadMap = () => {
      if (!frame || frame.src) return;
      frame.addEventListener('load', () => frame.parentElement.classList.add('is-loaded'), { once: true });
      frame.src = frame.dataset.src;
    };
    new MutationObserver(() => { if (mapPopup.open) loadMap(); }).observe(mapPopup, { attributes: true, attributeFilter: ['open'] });
    const copy = mapPopup.querySelector('.map-popup__copy');
    let copyTimer = 0;
    copy?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(copy.dataset.copy); } catch { return; }
      const label = copy.dataset.label || (copy.dataset.label = copy.textContent);
      copy.textContent = 'Скопировано';
      copy.classList.add('is-copied');
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copy.textContent = label; copy.classList.remove('is-copied'); }, 1800);
    });
  }

  // Footer wordmark: scroll-linked. Letters rise from behind the blue plate
  // while converging from a spread, blurred row, starting with the central О
  // and finishing with the outer И and Х. The word is fully assembled when its
  // top reaches the upper fifth of the viewport (just under the header), or
  // just before the end of the page if the footer can never scroll that high.
  // Reverses on scroll up.
  const footerLogo = document.querySelector('#footer .logo_ingotech-765');
  const footerLetters = footerLogo ? [...footerLogo.querySelectorAll('.footer-letter')] : [];
  const LETTER_LAG = .12;                         // per step away from the centre
  let footerKey = '';
  function updateFooterLogo() {
    if (!footerLetters.length) return;
    if (reduced.matches) {
      if (footerKey) footerLetters.forEach(l => { l.style.removeProperty('--e'); l.classList.remove('is-moving'); });
      footerKey = '';
      return;
    }
    const box = footerLogo.getBoundingClientRect();
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    const start = innerHeight;                    // word's slot just below the viewport
    const end = Math.min(start - 1, Math.max(innerHeight * .2, box.top - (maxScroll - scrollY) + 24));
    const p = Math.min(1, Math.max(0, (start - box.top) / (start - end)));
    const values = footerLetters.map(l => {
      const t = Math.min(1, Math.max(0, (p - Math.abs(+l.style.getPropertyValue('--d')) * LETTER_LAG) / (1 - 3 * LETTER_LAG)));
      return (1 - (1 - t) ** 3).toFixed(4);
    });
    const key = values.join();
    if (key === footerKey) return;
    footerKey = key;
    footerLetters.forEach((l, i) => {
      l.style.setProperty('--e', values[i]);
      l.classList.toggle('is-moving', values[i] !== '1.0000' && values[i] !== '0.0000');
    });
  }

  let raf = 0;
  function reveal() {
    raf = 0;
    updateAbout();
    updateSequences();
    updateFooterLogo();
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(reveal); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', () => { if (steps.length) { measureAbout(); renderAbout(); } schedule(); }, { passive: true });
  reduced.addEventListener('change', schedule);
  // Wait for fonts so paragraph heights (and bracket stops) are final.
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    if (steps.length) { measureAbout(); renderAbout(); }
    reveal();
  });
})();
