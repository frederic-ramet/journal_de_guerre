// Archives Dashboard JavaScript

document.addEventListener('DOMContentLoaded', () => {
  // Filter functionality
  const filterBtns = document.querySelectorAll('.filter-btn');
  const pageCards = document.querySelectorAll('.page-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      // Update active button
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Filter cards
      pageCards.forEach(card => {
        const status = card.dataset.status;
        if (filter === 'all' || status === filter) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Lazy loading for images
  const images = document.querySelectorAll('.page-thumbnail img');
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src || img.src;
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }
});
