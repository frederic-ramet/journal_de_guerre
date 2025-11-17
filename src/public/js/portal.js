// Portal page specific JavaScript

document.addEventListener('DOMContentLoaded', () => {
  // Add hover animations to space cards
  const spaceCards = document.querySelectorAll('.space-card');

  spaceCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.querySelector('.space-icon').style.transform = 'scale(1.1) rotate(5deg)';
    });

    card.addEventListener('mouseleave', () => {
      card.querySelector('.space-icon').style.transform = '';
    });
  });

  // Animate statistics on scroll
  const statsSection = document.querySelector('.portal-stats');
  if (statsSection) {
    const animateStats = () => {
      const rect = statsSection.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        const statNumbers = document.querySelectorAll('.stat-number');
        statNumbers.forEach(stat => {
          if (!stat.dataset.animated) {
            const target = parseInt(stat.textContent);
            animateNumber(stat, target);
            stat.dataset.animated = 'true';
          }
        });
      }
    };

    window.addEventListener('scroll', Utils.debounce(animateStats, 100));
    animateStats(); // Check on load
  }
});

// Animate number counting
function animateNumber(element, target) {
  const duration = 1500;
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const current = Math.floor(start + (target - start) * easeOutQuart);

    element.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = target;
    }
  }

  requestAnimationFrame(update);
}
