// Burger menu for <1024px. The nav links are the existing #header .layer-7 anchors.
(() => {
  'use strict';
  const header = document.getElementById('header');
  const bar = header && header.querySelector('.layer-3');
  const nav = header && header.querySelector('.layer-7');
  if (!bar || !nav) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-toggle';
  button.setAttribute('aria-label', 'Меню');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span></span><span></span><span></span>';
  bar.append(button);
  const desktop = matchMedia('(min-width: 1024px)');
  const set = open => {
    header.classList.toggle('nav-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Закрыть меню' : 'Меню');
  };
  button.addEventListener('click', () => set(!header.classList.contains('nav-open')));
  nav.addEventListener('click', event => { if (event.target.closest('a')) set(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') set(false); });
  desktop.addEventListener('change', () => set(false));
})();
