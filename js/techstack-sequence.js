(() => {
  'use strict';
  // Scroll-driven glass plates sequence (Apple-style): pre-decoded frames on a canvas,
  // viewport-centered Y tracking, fluid damping, and an inertial pass-through for the morph zone.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const section = document.getElementById('team');
  const comp = section && section.querySelector('.section-composition');
  if (!comp || !('createImageBitmap' in window)) return;

  const BASE = 'public/assets/animations/frosted-icons-v17/';
  const COUNT = 360;
  const SIZE = 712; // canvas size in composition px
  const BITMAP_CACHE_LIMIT = 34; // keep active ImageBitmaps bounded (~220MB) to prevent browser memory exhaustion

  // Canvas top-left aligned to the original static illustrations 1, 2 and 3.
  // END_POS aligns the visual bottom of the 3D element exactly with the bottom line of the CTA button (1995px)
  const RIGHT = { x: 753, y: 35 }, MID = { x: 0, y: 633 }, END_POS = { x: 37, y: 1385 };
  const START = RIGHT.y + SIZE / 2; // 391: TechStack title / top illustration center
  const END = END_POS.y + SIZE / 2; // 1741: finishes synchronously with the CTA button line

  const DAMPING = 0.28; // seconds; Apple-grade fluid scrub smoothing
  const BASE_SCALE = 0.86; // keeps the art clear of the fixed header

  const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const scale = () => comp.getBoundingClientRect().width / comp.offsetWidth || 1;

  // Unstable morph zone: shield-to-heart deformation (frames 200..278)
  const MORPH_START = 200;
  const MORPH_END = 278;

  // Apple-style non-linear progress mapping for 3D frames:
  // - 0.00..0.17: soft opening of plates (1..60)
  // - 0.17..0.50: staged move right to center (60..180)
  // - 0.50..0.53: clean rest on center shield pose (180..200)
  // - 0.53..0.59: snappy, high-energy morph window (200..280)
  // - 0.59..0.68: heart completes rotation (280..300)
  // - 0.68..1.00: settled heart breathing down to pose 3 (300..360)
  const keyframes = [
    { p: 0.00, f: 1 },
    { p: 0.1667, f: 60 },
    { p: 0.50, f: 180 },
    { p: 0.53, f: 200 },
    { p: 0.59, f: 280 },
    { p: 0.68, f: 300 },
    { p: 1.00, f: 360 }
  ];

  function progressToFrame(p) {
    p = clamp(p, 0, 1);
    let i = 0;
    while (i < keyframes.length - 1 && p > keyframes[i + 1].p) i++;
    const k0 = keyframes[i];
    const k1 = keyframes[i + 1];
    const t = (p - k0.p) / (k1.p - k0.p);
    return k0.f + (k1.f - k0.f) * t;
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'techstack-sequence';
  canvas.setAttribute('aria-hidden', 'true');
  comp.append(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });

  const blobs = new Map();
  const bitmaps = new Map();
  const busyBitmaps = new Set();
  const busyBlobs = new Set();
  let decodeQueue = [];
  let activeDecodes = 0;

  let variant;
  let shownProgress = 0;
  let targetProgress = 0;
  let currentFp = 1;
  let direction = 1;
  let drawnFrame = 0;
  let active = false;
  let raf = 0;
  let last = 0;

  const url = n => `${BASE}${variant}/frame_${String(n).padStart(4, '0')}.webp`;

  // Fetch compressed blob (cached in blobs Map)
  const fetchBlob = async n => {
    let blob = blobs.get(n);
    if (!blob) {
      if (busyBlobs.has(n)) return;
      busyBlobs.add(n);
      try {
        const res = await fetch(url(n));
        if (res.ok) {
          blob = await res.blob();
          blobs.set(n, blob);
        }
      } catch (e) {
        // ignore fetch failures
      } finally {
        busyBlobs.delete(n);
      }
    }
    return blob;
  };

  // Decode ImageBitmap from cached Blob with LRU/distance eviction
  const decodeFrame = async n => {
    if (bitmaps.has(n) || busyBitmaps.has(n)) return;
    busyBitmaps.add(n);
    try {
      let blob = blobs.get(n);
      if (!blob) blob = await fetchBlob(n);
      if (!blob) return;

      const bmp = await createImageBitmap(blob);
      bitmaps.set(n, bmp);

      // Evict furthest bitmap if cache limit exceeded
      while (bitmaps.size > BITMAP_CACHE_LIMIT) {
        let farKey = null, maxDist = -1;
        for (const k of bitmaps.keys()) {
          if (k === 1 && currentFp < 10) continue;
          // Protect frames in the active morph window while near it
          if (currentFp >= 170 && currentFp <= 310 && k >= 190 && k <= 290) continue;
          const dist = Math.abs(k - currentFp);
          if (dist > maxDist) {
            maxDist = dist;
            farKey = k;
          }
        }
        if (farKey !== null) {
          const evicted = bitmaps.get(farKey);
          if (evicted && typeof evicted.close === 'function') {
            evicted.close();
          }
          bitmaps.delete(farKey);
        } else {
          break;
        }
      }

      if (n === 1) {
        measure();
        shownProgress = targetProgress;
        currentFp = progressToFrame(targetProgress);
        draw(true);
        comp.classList.add('has-techstack-sequence');
      } else if (Math.abs(n - currentFp) < 3) {
        draw(true);
      }
    } catch (e) {
      // ignore decode failures
    } finally {
      busyBitmaps.delete(n);
      activeDecodes--;
      pumpDecode();
    }
  };

  const pumpDecode = () => {
    while (activeDecodes < 3 && decodeQueue.length > 0) {
      const n = decodeQueue.shift();
      if (!bitmaps.has(n) && !busyBitmaps.has(n)) {
        activeDecodes++;
        decodeFrame(n);
      }
    }
  };

  const queueDecodesAround = center => {
    const wanted = [];
    const c = Math.round(center);
    wanted.push(Math.floor(center), Math.ceil(center));

    // Widen lookahead if entering the morph zone
    const lookahead = (center >= 170 && center <= 310) ? 14 : 8;
    for (let d = 1; d <= lookahead; d++) {
      wanted.push(c + d, c - d);
    }

    const filtered = [...new Set(wanted)].filter(
      f => f >= 1 && f <= COUNT && !bitmaps.has(f) && !busyBitmaps.has(f)
    );
    filtered.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
    decodeQueue = filtered;
    pumpDecode();
  };

  // Background preloader for compressed WebP blobs (low priority, coarse-to-fine)
  const preloadBlobs = () => {
    variant = SIZE * scale() * (devicePixelRatio || 1) > 768 ? 'webp_1280' : 'webp_768';

    // Prioritize key poses & morph zone anchors
    const order = [1, 180, 200, 240, 280, 300, 360];
    const seen = new Set(order);
    for (let step = 16; step >= 1; step = Math.floor(step / 2)) {
      for (let n = 1; n <= COUNT; n += step) {
        if (!seen.has(n)) {
          seen.add(n);
          order.push(n);
        }
      }
    }

    // Decode frame 1 immediately
    fetchBlob(1).then(() => {
      decodeFrame(1);
    });

    // Background worker for blobs
    let idx = 0;
    const worker = () => {
      if (idx < order.length) {
        const nextFrame = order[idx++];
        fetchBlob(nextFrame).then(() => {
          setTimeout(worker, 15);
        }).catch(() => {
          setTimeout(worker, 50);
        });
      }
    };
    setTimeout(worker, 50);
    setTimeout(worker, 100);
  };

  const nearest = n => {
    let best = null, minDiff = Infinity;
    for (const [k, bmp] of bitmaps.entries()) {
      const diff = Math.abs(k - n);
      if (diff < minDiff) {
        minDiff = diff;
        best = bmp;
      }
    }
    return best;
  };

  const resize = () => {
    const px = Math.round(SIZE * scale() * Math.min(devicePixelRatio || 1, 2));
    if (canvas.width !== px) {
      canvas.width = canvas.height = px;
      drawnFrame = 0;
    }
  };

  function measure() {
    const rect = comp.getBoundingClientRect();
    const k = rect.height / comp.offsetHeight || 1;
    const header = document.getElementById('header');
    const top = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
    const viewportCenterY = ((innerHeight + top) / 2 - rect.top) / k;
    const newTarget = clamp((viewportCenterY - START) / (END - START));
    if (Math.abs(newTarget - targetProgress) > 0.0003) {
      direction = newTarget > targetProgress ? 1 : -1;
    }
    targetProgress = newTarget;
  }

  function draw(force) {
    const p = shownProgress;
    const fp = currentFp;

    // Y position tracks the viewport center progress:
    // This keeps the 3D element ALWAYS in the visible screen (minus header),
    // smoothly traveling down all the way to the CTA button line!
    const y = lerp(RIGHT.y, END_POS.y, p);

    // X position moves from right to left as user scrolls down from techstack to team copy
    let x, s;
    if (p <= 0.5) {
      const m = easeInOut(clamp((p - 0.1667) / (0.50 - 0.1667)));
      x = lerp(RIGHT.x, MID.x, m);
      s = BASE_SCALE * (1 - 0.08 * Math.sin(Math.PI * m));
    } else {
      const t = (p - 0.5) / 0.5;
      x = lerp(MID.x, END_POS.x, easeInOut(t));
      s = BASE_SCALE;
    }

    canvas.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;

    // Blend neighboring frames
    const f0 = Math.floor(fp), f1 = Math.min(COUNT, f0 + 1);
    const t = Math.round((fp - f0) * 30) / 30;
    const key = f0 + t;
    if (!force && key === drawnFrame) return;

    const a = bitmaps.get(f0), b = bitmaps.get(f1);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (a && b && t > 0) {
      ctx.globalAlpha = 1 - t;
      ctx.drawImage(a, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = t;
      ctx.drawImage(b, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      drawnFrame = key;
    } else {
      const bmp = a || nearest(Math.round(fp));
      if (!bmp) return;
      ctx.globalAlpha = 1;
      ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      drawnFrame = a ? key : 0;
    }
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;

    // Fluid damping for scroll progress
    shownProgress += (targetProgress - shownProgress) * (1 - Math.exp(-dt / DAMPING));
    if (Math.abs(targetProgress - shownProgress) < 0.0002) {
      shownProgress = targetProgress;
    }

    // Target frame mapping from scroll progress
    const targetFp = progressToFrame(targetProgress);
    let effectiveTargetFp = targetFp;

    // Magnetic repulsion from the morph zone:
    // If the scroll target sits inside [MORPH_START, MORPH_END], snap past it
    if (targetFp >= MORPH_START && targetFp <= MORPH_END) {
      effectiveTargetFp = direction >= 0 ? MORPH_END + 2 : MORPH_START - 2;
    }

    const inDeadzone = currentFp >= MORPH_START && currentFp <= MORPH_END;

    if (inDeadzone) {
      // Inertial momentum boost through the morph zone:
      // Peak velocity in the middle of morph (frame 239) so the intermediate mesh sweeps by dynamically
      const u = (currentFp - MORPH_START) / (MORPH_END - MORPH_START);
      const speed = 240 * (1 + 0.6 * Math.sin(Math.PI * u)); // frames/sec

      if (direction >= 0) {
        currentFp += Math.max(speed * dt, (effectiveTargetFp - currentFp) * (1 - Math.exp(-dt / 0.16)));
        if (currentFp > effectiveTargetFp && effectiveTargetFp >= MORPH_END) {
          currentFp = effectiveTargetFp;
        }
      } else {
        currentFp -= Math.max(speed * dt, (currentFp - effectiveTargetFp) * (1 - Math.exp(-dt / 0.16)));
        if (currentFp < effectiveTargetFp && effectiveTargetFp <= MORPH_START) {
          currentFp = effectiveTargetFp;
        }
      }
    } else {
      // Fluid Apple spring-like exponential damping outside the morph zone
      currentFp += (effectiveTargetFp - currentFp) * (1 - Math.exp(-dt / DAMPING));
      if (Math.abs(effectiveTargetFp - currentFp) < 0.04) {
        currentFp = effectiveTargetFp;
      }
    }

    currentFp = clamp(currentFp, 1, COUNT);

    queueDecodesAround(currentFp);
    draw(false);

    // Keep loop active while animating OR whenever inside the deadzone
    const progressSettled = shownProgress === targetProgress;
    const frameSettled = (currentFp === effectiveTargetFp) && !inDeadzone;
    raf = (progressSettled && frameSettled) ? 0 : requestAnimationFrame(tick);
  }

  const onScroll = () => {
    measure();
    if (!raf && active) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };

  new IntersectionObserver(entries => {
    active = entries.some(e => e.isIntersecting);
    if (active && !variant) preloadBlobs();
    if (active) onScroll();
  }, { rootMargin: '1200px 0px' }).observe(section);

  resize();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => {
    resize();
    measure();
    shownProgress = targetProgress;
    currentFp = progressToFrame(targetProgress);
    draw(true);
  });
})();
