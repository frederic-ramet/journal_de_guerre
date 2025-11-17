// Journal Reading Space JavaScript

document.addEventListener('DOMContentLoaded', () => {
  const pages = window.pagesData || [];
  let currentIndex = 0;
  let zoomLevel = 1;
  let isDarkMode = false;

  // DOM Elements
  const currentImage = document.getElementById('currentImage');
  const currentPageNum = document.getElementById('currentPageNum');
  const totalPagesEl = document.getElementById('totalPages');
  const pageTitle = document.getElementById('pageTitle');
  const transcriptionText = document.getElementById('transcriptionText');
  const pageStatus = document.getElementById('pageStatus');
  const pageDate = document.getElementById('pageDate');
  const transcriptionPanel = document.getElementById('transcriptionPanel');
  const thumbnailsContainer = document.getElementById('thumbnailsContainer');

  // Fallback if no data from server
  if (pages.length === 0) {
    for (let i = 410; i <= 512; i++) {
      pages.push({
        image_path: `jpg_web/IMG_0${i}.jpeg`,
        title: `Page ${i - 409}`,
        description: '',
        content_html: '<p>Transcription non disponible</p>',
        status: 'draft',
        date_written: ''
      });
    }
  }

  // Initialize
  function init() {
    if (totalPagesEl) totalPagesEl.textContent = pages.length;
    loadPage(0);
    setupEventListeners();
  }

  // Load a specific page
  function loadPage(index) {
    if (index < 0 || index >= pages.length) return;

    currentIndex = index;
    const page = pages[index];

    // Update image
    if (currentImage) {
      currentImage.src = '/' + page.image_path;
      currentImage.alt = page.title;
      resetZoom();
    }

    // Update page number
    if (currentPageNum) currentPageNum.textContent = index + 1;
    if (pageTitle) pageTitle.textContent = page.title;

    // Update transcription
    if (transcriptionText) {
      transcriptionText.innerHTML = page.content_html || '<p>Transcription non disponible</p>';
    }

    // Update status badge
    if (pageStatus) {
      pageStatus.className = 'badge badge-' + (page.status || 'draft');
      const statusText = {
        'draft': 'Brouillon',
        'verified': 'Vérifié',
        'validated': 'Validé'
      };
      pageStatus.textContent = statusText[page.status] || 'Brouillon';
    }

    // Update date
    if (pageDate && page.date_written) {
      pageDate.textContent = page.date_written;
    }

    // Update thumbnails
    updateActiveThumbnail(index);

    // Update navigation buttons
    updateNavigationButtons();

    // Update URL without reload
    history.replaceState(null, '', `/journal?page=${index + 1}`);
  }

  // Update active thumbnail
  function updateActiveThumbnail(index) {
    const thumbnails = thumbnailsContainer?.querySelectorAll('.thumbnail');
    if (!thumbnails) return;

    thumbnails.forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });

    // Scroll thumbnail into view
    const activeThumb = thumbnails[index];
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  // Update navigation button states
  function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === pages.length - 1;
  }

  // Zoom functions
  function zoomIn() {
    zoomLevel = Math.min(zoomLevel + 0.25, 3);
    applyZoom();
  }

  function zoomOut() {
    zoomLevel = Math.max(zoomLevel - 0.25, 0.5);
    applyZoom();
  }

  function resetZoom() {
    zoomLevel = 1;
    applyZoom();
  }

  function applyZoom() {
    if (currentImage) {
      currentImage.style.transform = `scale(${zoomLevel})`;
    }
  }

  // Dark mode toggle
  function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.querySelector('.journal-viewer')?.classList.toggle('dark-mode', isDarkMode);
    const icon = document.querySelector('#toggleDarkMode i');
    if (icon) {
      icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
    }
  }

  // Toggle transcription panel
  function togglePanel() {
    transcriptionPanel?.classList.toggle('collapsed');
  }

  // Setup event listeners
  function setupEventListeners() {
    // Navigation buttons
    document.getElementById('prevPage')?.addEventListener('click', () => loadPage(currentIndex - 1));
    document.getElementById('nextPage')?.addEventListener('click', () => loadPage(currentIndex + 1));

    // Zoom controls
    document.getElementById('zoomIn')?.addEventListener('click', zoomIn);
    document.getElementById('zoomOut')?.addEventListener('click', zoomOut);
    document.getElementById('resetZoom')?.addEventListener('click', resetZoom);

    // Dark mode
    document.getElementById('toggleDarkMode')?.addEventListener('click', toggleDarkMode);

    // Panel toggle
    document.getElementById('togglePanel')?.addEventListener('click', togglePanel);
    document.querySelector('.panel-header')?.addEventListener('click', togglePanel);

    // Thumbnails click
    thumbnailsContainer?.addEventListener('click', (e) => {
      const thumbnail = e.target.closest('.thumbnail');
      if (thumbnail) {
        const index = parseInt(thumbnail.dataset.index);
        loadPage(index);
      }
    });

    // Thumbnail scroll buttons
    document.getElementById('scrollLeft')?.addEventListener('click', () => {
      thumbnailsContainer.scrollBy({ left: -300, behavior: 'smooth' });
    });

    document.getElementById('scrollRight')?.addEventListener('click', () => {
      thumbnailsContainer.scrollBy({ left: 300, behavior: 'smooth' });
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowLeft':
          loadPage(currentIndex - 1);
          break;
        case 'ArrowRight':
          loadPage(currentIndex + 1);
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
        case '0':
          resetZoom();
          break;
        case 'd':
          toggleDarkMode();
          break;
        case 't':
          togglePanel();
          break;
      }
    });

    // Mouse wheel zoom on image
    currentImage?.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          zoomIn();
        } else {
          zoomOut();
        }
      }
    });

    // Swipe gestures (mobile)
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    });

    function handleSwipe() {
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          loadPage(currentIndex + 1);
        } else {
          loadPage(currentIndex - 1);
        }
      }
    }
  }

  // Check for page parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = parseInt(urlParams.get('page'));
  if (pageParam && pageParam > 0 && pageParam <= pages.length) {
    currentIndex = pageParam - 1;
  }

  init();
});
