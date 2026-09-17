document.addEventListener('DOMContentLoaded', () => {
  // 1. Smooth scroll for anchor links
  const navLinks = document.querySelectorAll('a[href^="#"]');
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      const targetId = link.getAttribute('href');
      if (targetId === '#' || !targetId) return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // Close mobile menu if open
        const nav = document.querySelector('.header-nav');
        if (nav && nav.classList.contains('active')) {
          nav.classList.remove('active');
        }
      }
    });
  });

  // 2. Mobile Menu Toggle
  const burger = document.querySelector('.header-burger');
  const nav = document.querySelector('.header-nav');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      nav.classList.toggle('active');
    });
  }

  // 3. Office Slider Interactivity
  const officeGrid = document.querySelector('.office-grid');
  const prevBtn = document.querySelector('.slider-btn-prev');
  const nextBtn = document.querySelector('.slider-btn-next');
  if (officeGrid && prevBtn && nextBtn) {
    let officeCards = Array.from(officeGrid.querySelectorAll('.office-card'));
    let currentIndex = 0;

    const updateSlider = () => {
      officeCards.forEach((card, idx) => {
        card.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
        if (window.innerWidth <= 840) {
          card.style.display = idx === currentIndex ? 'block' : 'none';
        } else {
          card.style.display = 'block';
        }
      });
    };

    nextBtn.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % officeCards.length;
      updateSlider();
    });

    prevBtn.addEventListener('click', () => {
      currentIndex = (currentIndex - 1 + officeCards.length) % officeCards.length;
      updateSlider();
    });

    window.addEventListener('resize', updateSlider);
  }

  // 4. Feedback Form Submission
  const feedbackForm = document.getElementById('feedback-form');
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = feedbackForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;

      submitBtn.innerHTML = '<span>Отправка...</span>';
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.innerHTML = '<span>Успешно отправлено!</span>';
        submitBtn.style.backgroundColor = '#00DDB3';
        feedbackForm.reset();

        setTimeout(() => {
          submitBtn.innerHTML = originalText;
          submitBtn.style.backgroundColor = '';
          submitBtn.disabled = false;
        }, 3000);
      }, 700);
    });
  }
});
