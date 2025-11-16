/**
 * Journal de Guerre - Interactive Features
 * Ramet Ernest (1911-1918)
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initNavigation();
    initGallery();
    initTranscriptionFilter();
    initScrollAnimations();
});

/**
 * Navigation Component
 */
function initNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Mobile menu toggle
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }

    // Close menu on link click (mobile)
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (navMenu) {
                navMenu.classList.remove('active');
            }
        });
    });

    // Close menu on outside click
    document.addEventListener('click', function(e) {
        if (navMenu && navToggle && !navMenu.contains(e.target) && !navToggle.contains(e.target)) {
            navMenu.classList.remove('active');
        }
    });

    // Active link highlighting on scroll
    const sections = document.querySelectorAll('section[id]');

    function updateActiveLink() {
        const scrollPosition = window.scrollY + 100;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + sectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', updateActiveLink);
}

/**
 * Gallery Component
 */
function initGallery() {
    const galleryImage = document.getElementById('galleryImage');
    const galleryTitle = document.getElementById('galleryTitle');
    const galleryDescription = document.getElementById('galleryDescription');
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');
    const prevBtn = document.getElementById('galleryPrev');
    const nextBtn = document.getElementById('galleryNext');
    const thumbnailsContainer = document.getElementById('galleryThumbnails');

    if (!galleryImage) return;

    // Image data with descriptions
    const images = generateImageData();
    let currentIndex = 0;

    // Set total pages
    if (totalPagesSpan) {
        totalPagesSpan.textContent = images.length;
    }

    // Generate thumbnails
    if (thumbnailsContainer) {
        generateThumbnails(images, thumbnailsContainer);
    }

    // Update gallery display
    function updateGallery() {
        const img = images[currentIndex];

        if (galleryImage) {
            galleryImage.src = img.src;
            galleryImage.alt = img.title;
        }

        if (galleryTitle) {
            galleryTitle.textContent = img.title;
        }

        if (galleryDescription) {
            galleryDescription.textContent = img.description;
        }

        if (currentPageSpan) {
            currentPageSpan.textContent = currentIndex + 1;
        }

        // Update thumbnail active state
        const thumbnails = document.querySelectorAll('.thumbnail');
        thumbnails.forEach((thumb, index) => {
            thumb.classList.toggle('active', index === currentIndex);
        });

        // Scroll thumbnail into view
        const activeThumb = thumbnails[currentIndex];
        if (activeThumb && thumbnailsContainer) {
            activeThumb.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }

    // Navigation handlers
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            currentIndex = (currentIndex - 1 + images.length) % images.length;
            updateGallery();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            currentIndex = (currentIndex + 1) % images.length;
            updateGallery();
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') {
            currentIndex = (currentIndex - 1 + images.length) % images.length;
            updateGallery();
        } else if (e.key === 'ArrowRight') {
            currentIndex = (currentIndex + 1) % images.length;
            updateGallery();
        }
    });

    // Initialize display
    updateGallery();
}

/**
 * Generate image data for gallery
 */
function generateImageData() {
    const images = [];
    const startNum = 410;
    const endNum = 512;

    const pageDescriptions = {
        410: { title: 'Page 1 - Couverture', desc: 'Couverture du carnet appartenant à Ramet Ernest. Début des études le 14 juin 1911 à Martou Mephisto, Allemagne. Leçon donnée par Gecourtét.' },
        411: { title: 'Page 2 - Définitions Spiritisme', desc: 'Définitions fondamentales : Incarnation, Désincarnation, Réincarnation, Échelle spirite. Copié le 15-6-1916.' },
        412: { title: 'Page 3 - Notes de cours', desc: 'Suite des enseignements spirituels sur le spiritisme.' },
        420: { title: 'Page 11 - Croquis', desc: 'Page unique avec un croquis de paysage esquissé au crayon.' },
        421: { title: 'Page 12 - Début des entrées', desc: 'Première entrée structurée : Bonne action, Demander, Explication.' },
        430: { title: 'Page 21', desc: 'Méditation sur la patience et l\'acceptation des épreuves.' },
        439: { title: 'Page 30 - 16 juin 1911', desc: 'Signature R.E. B. Enseignement sur la prière matinale.' },
        447: { title: 'Page 38 - 21 août 1911', desc: 'Réflexion sur la pureté du cœur devant Dieu.' },
        461: { title: 'Page 52', desc: 'Début des enseignements sur l\'humilité comme fondement de sainteté.' },
        470: { title: 'Page 61 - 8 octobre 1911', desc: 'Signature R.E. E. Méditation sur le témoignage courageux de la foi.' },
        471: { title: 'Page 62 - 11 janvier 1912', desc: 'Transition vers 1912. L\'humilité et la dépendance envers le Créateur.' },
        479: { title: 'Page 70 - 15 février 1916', desc: 'Signature R.E. C. Période de guerre, foi comme refuge.' },
        489: { title: 'Page 80 - 1917', desc: 'Signature "Ernest Soir" confirmant l\'identité de l\'auteur. Persévérance finale.' },
        500: { title: 'Page 91 - 23 juillet 1917', desc: 'Prière pour l\'Église universelle et la paix des nations.' },
        503: { title: 'Page 94 - 29 août 1918', desc: 'Dernière leçon datée. Préparation à la bonne mort.' },
        508: { title: 'Page 99 - Lettre militaire', desc: 'Document militaire concernant l\'affaire du 29 mars. Communes d\'Etaples, Saubourg.' },
        510: { title: 'Page 101 - Sainte Face', desc: 'Image pieuse de la Sainte Face de Jésus (Voile d\'Abgar, roi d\'Edesse).' },
        512: { title: 'Page 103 - Vierge Marie', desc: 'Image pieuse circulaire de la Vierge Marie avec l\'enfant Jésus.' }
    };

    for (let i = startNum; i <= endNum; i++) {
        const pageNum = i - startNum + 1;
        const imgNum = String(i).padStart(4, '0');
        const fileName = `IMG_${imgNum}.jpeg`;

        let title, desc;

        if (pageDescriptions[i]) {
            title = pageDescriptions[i].title;
            desc = pageDescriptions[i].desc;
        } else {
            title = `Page ${pageNum}`;
            if (pageNum <= 11) {
                desc = 'Notes de cours sur le spiritisme. Écriture cursive inclinée.';
            } else if (pageNum <= 91) {
                desc = 'Entrée du journal de dévotion. Structure : Bonne action, Demander, Explication.';
            } else {
                desc = 'Document annexe ou notes complémentaires.';
            }
        }

        images.push({
            src: `jpg_web/${fileName}`,
            title: title,
            description: desc
        });
    }

    return images;
}

/**
 * Generate thumbnails for gallery
 */
function generateThumbnails(images, container) {
    // Show only every 5th image for performance
    const step = 5;

    for (let i = 0; i < images.length; i += step) {
        const thumb = document.createElement('div');
        thumb.className = 'thumbnail';
        if (i === 0) thumb.classList.add('active');

        const img = document.createElement('img');
        img.src = images[i].src;
        img.alt = images[i].title;
        img.loading = 'lazy';

        thumb.appendChild(img);
        container.appendChild(thumb);

        // Click handler
        const index = i;
        thumb.addEventListener('click', function() {
            // Update current index in gallery
            window.currentGalleryIndex = index;

            // Trigger gallery update
            const event = new CustomEvent('galleryJump', { detail: { index: index } });
            document.dispatchEvent(event);
        });
    }

    // Listen for gallery jump events
    document.addEventListener('galleryJump', function(e) {
        const galleryImage = document.getElementById('galleryImage');
        const galleryTitle = document.getElementById('galleryTitle');
        const galleryDescription = document.getElementById('galleryDescription');
        const currentPageSpan = document.getElementById('currentPage');

        const img = images[e.detail.index];

        if (galleryImage) {
            galleryImage.src = img.src;
            galleryImage.alt = img.title;
        }

        if (galleryTitle) {
            galleryTitle.textContent = img.title;
        }

        if (galleryDescription) {
            galleryDescription.textContent = img.description;
        }

        if (currentPageSpan) {
            currentPageSpan.textContent = e.detail.index + 1;
        }

        // Update thumbnail active state
        const thumbnails = document.querySelectorAll('.thumbnail');
        thumbnails.forEach((thumb, idx) => {
            const thumbIndex = idx * step;
            thumb.classList.toggle('active', thumbIndex === e.detail.index);
        });
    });
}

/**
 * Transcription Filter Component
 */
function initTranscriptionFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.transcription-card');

    if (filterBtns.length === 0 || cards.length === 0) return;

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const period = this.getAttribute('data-period');

            // Filter cards
            cards.forEach(card => {
                if (period === 'all' || card.getAttribute('data-period') === period) {
                    card.classList.remove('hidden');
                    card.style.animation = 'fadeIn 0.5s ease forwards';
                } else {
                    card.classList.add('hidden');
                }
            });
        });
    });
}

/**
 * Scroll Animations
 */
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe various elements
    const animatableElements = document.querySelectorAll(
        '.context-card, .structure-card, .transcription-card, .analysis-card, .theme-card, .timeline-item'
    );

    animatableElements.forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });
}

/**
 * Smooth scroll for anchor links
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

/**
 * Back to top functionality
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show/hide scroll to top button based on scroll position
window.addEventListener('scroll', function() {
    const scrollPosition = window.scrollY;

    // Could add a back-to-top button here if needed
    if (scrollPosition > 500) {
        // Show button
    } else {
        // Hide button
    }
});
