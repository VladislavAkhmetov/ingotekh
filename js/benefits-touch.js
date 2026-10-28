// Benefits (<1024px): touch has no hover, so a tap opens a card's description and a
// second tap (or a tap elsewhere) closes it. Desktop keeps hover/focus as designed.
(() => {
  'use strict';
  const section = document.getElementById('benefits');
  if (!section) return;
  const small = matchMedia('(max-width: 1023px)');
  const cards = [...section.querySelectorAll('.benefit-card')];
  const close = except => cards.forEach(c => { if (c !== except) c.classList.remove('is-open'); });
  cards.forEach(card => {
    card.addEventListener('click', () => {
      if (!small.matches) return;
      const open = !card.classList.contains('is-open');
      close(card);
      card.classList.toggle('is-open', open);
    });
    card.addEventListener('keydown', e => {
      if (small.matches && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); card.click(); }
    });
  });
  document.addEventListener('click', e => { if (!e.target.closest('.benefit-card')) close(null); });
  small.addEventListener('change', () => close(null));
})();
