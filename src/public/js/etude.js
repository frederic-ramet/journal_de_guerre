// Étude/Study Space JavaScript

document.addEventListener('DOMContentLoaded', () => {
  // Animate timeline items on scroll
  const timelineItems = document.querySelectorAll('.timeline-item');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateX(0)';
        }
      });
    }, { threshold: 0.1 });

    timelineItems.forEach(item => {
      item.style.opacity = '0';
      item.style.transform = 'translateX(-20px)';
      item.style.transition = 'all 0.5s ease';
      observer.observe(item);
    });
  }

  // Theme card hover effects
  const themeCards = document.querySelectorAll('.theme-card');
  themeCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'scale(1.02)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // Entity category accordion (optional)
  const entityCategories = document.querySelectorAll('.entity-category h3');
  entityCategories.forEach(header => {
    header.style.cursor = 'pointer';
    header.addEventListener('click', () => {
      const list = header.nextElementSibling;
      list.style.display = list.style.display === 'none' ? 'block' : 'none';
    });
  });
});
