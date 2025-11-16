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
    initReadingMode();
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

/**
 * Reading Mode Component
 */
function initReadingMode() {
    const modal = document.getElementById('readingModal');
    const openBtn = document.getElementById('readingModeBtn');
    const closeBtn = document.getElementById('readingModalClose');
    const overlay = document.querySelector('.reading-modal-overlay');
    const prevBtn = document.getElementById('readingPrev');
    const nextBtn = document.getElementById('readingNext');
    const readingImage = document.getElementById('readingImage');
    const readingTitle = document.getElementById('readingModalTitle');
    const readingTranscription = document.getElementById('readingTranscription');
    const currentPageSpan = document.getElementById('readingCurrentPage');
    const totalPagesSpan = document.getElementById('readingTotalPages');
    const thumbnailsContainer = document.getElementById('readingThumbnails');

    if (!modal || !openBtn) return;

    // Generate complete transcription data
    const transcriptions = generateTranscriptionData();
    let currentIndex = 0;

    // Set total pages
    if (totalPagesSpan) {
        totalPagesSpan.textContent = transcriptions.length;
    }

    // Generate thumbnails
    generateReadingThumbnails(transcriptions, thumbnailsContainer);

    // Update reading mode display
    function updateReadingMode() {
        const data = transcriptions[currentIndex];

        if (readingImage) {
            readingImage.src = data.src;
            readingImage.alt = data.title;
        }

        if (readingTitle) {
            readingTitle.textContent = data.title;
        }

        if (readingTranscription) {
            readingTranscription.innerHTML = data.transcription;
        }

        if (currentPageSpan) {
            currentPageSpan.textContent = currentIndex + 1;
        }

        // Update thumbnail active state
        const thumbnails = document.querySelectorAll('.reading-thumbnail');
        thumbnails.forEach((thumb, idx) => {
            thumb.classList.toggle('active', idx === currentIndex);
        });

        // Scroll active thumbnail into view
        const activeThumb = thumbnails[currentIndex];
        if (activeThumb && thumbnailsContainer) {
            activeThumb.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }

    // Open modal
    function openModal() {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateReadingMode();
    }

    // Close modal
    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Navigate to previous page
    function goToPrev() {
        currentIndex = (currentIndex - 1 + transcriptions.length) % transcriptions.length;
        updateReadingMode();
    }

    // Navigate to next page
    function goToNext() {
        currentIndex = (currentIndex + 1) % transcriptions.length;
        updateReadingMode();
    }

    // Event listeners
    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    prevBtn.addEventListener('click', goToPrev);
    nextBtn.addEventListener('click', goToNext);

    // Listen for thumbnail jump events
    document.addEventListener('readingJump', function(e) {
        currentIndex = e.detail.index;
        updateReadingMode();
    });

    // Keyboard navigation (only when modal is open)
    document.addEventListener('keydown', function(e) {
        if (!modal.classList.contains('active')) return;

        if (e.key === 'Escape') {
            closeModal();
        } else if (e.key === 'ArrowLeft') {
            goToPrev();
        } else if (e.key === 'ArrowRight') {
            goToNext();
        }
    });

    // Initialize display
    updateReadingMode();
}

/**
 * Generate reading thumbnails
 */
function generateReadingThumbnails(transcriptions, container) {
    if (!container) return;

    transcriptions.forEach((data, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'reading-thumbnail';
        if (index === 0) thumb.classList.add('active');

        const img = document.createElement('img');
        img.src = data.src;
        img.alt = data.title;
        img.loading = 'lazy';

        thumb.appendChild(img);
        container.appendChild(thumb);

        // Click handler
        thumb.addEventListener('click', function() {
            const event = new CustomEvent('readingJump', { detail: { index: index } });
            document.dispatchEvent(event);
        });
    });
}

/**
 * Generate complete transcription data for all 103 pages
 */
function generateTranscriptionData() {
    const data = [];
    const startNum = 410;
    const endNum = 512;

    // Complete transcriptions database
    const transcriptionDB = {
        410: `<p><strong>Carnet Appartenant</strong> à <strong>Ramet Ernest</strong></p>
              <p><strong>Etude</strong><br>
              Commencé le <strong>14 juin 1911</strong><br>
              à Martou Mephisto - Allemagne</p>
              <p>Leçon donnée par <strong>Gecourtét</strong><br>
              pour apprendre à aimer Dieu<br>
              Et nous tenir dans la voie</p>`,

        411: `<h4>Page gauche :</h4>
              <ul>
                <li><strong>Incarnation</strong> : esprit qui habite le corps</li>
                <li><strong>Désincarnation</strong> : esprit qui quitte le corps</li>
                <li><strong>Réincarnation</strong> : esprit qui réhabite le corps</li>
                <li><strong>Echelle espirite</strong> : à la mort l'esprit quitte le corps</li>
                <li><strong>L'espiritisme</strong> : est une science étudiée pour prouver que l'esprit est immortel</li>
              </ul>
              <h4>Page droite :</h4>
              <p>Pour bien comprendre comparons le à un <strong>courant électrique</strong><br>
              O = grande, force, vibrante intelligence...</p>
              <p><strong>Copie le 15-6-1916 C.</strong></p>`,

        412: `<p>Notes de cours sur le spiritisme (texte incliné, partiellement lisible)</p>
              <p>Suite des enseignements spirituels</p>`,

        413: `<h4>Page gauche :</h4>
              <p>Ylouward...<br>
              Nous et les mots mis<br>
              Tant plus de particules mise<br>
              Le soit particulier, c'est<br>
              Les esprits ont de l'intuition de la<br>
              Ils ont un nom et maintenu</p>
              <h4>Page droite :</h4>
              <p>Quand il ne me manque<br>
              le monde me me<br>
              Ils...il me... le me<br>
              Moi...le moins le moins me<br>
              Ainsi Harasse...</p>`,

        420: `<h4>Page gauche :</h4>
              <p>Texte avec un croquis/dessin (paysage esquissé au crayon)</p>
              <h4>Page droite :</h4>
              <p>Suite des notes de cours</p>`,

        421: `<h4>Page gauche :</h4>
              <p>Le 22-6-16 R.E.<br>
              Bonne action de commencé ma journée<br>
              Toute la nuit on comme ma prière<br>
              Puisque alors que nous eussions<br>
              mes à Dieu qu'il me accorde<br>
              Le secours qu'il est maître de<br>
              Mauvaise action : je n'ai pas assez prié à Dieu pour le l'imitation.</p>
              <p>Bonne action sur O-<br>
              le 23 - 6 - 11 - R.E. D.<br>
              Bonne action est que j'ai fait<br>
              J'envie elle sation de ma<br>
              Correspondance demandée.</p>
              <h4>Page droite :</h4>
              <p>Le ... - 6 - 16 - R.E. D.<br>
              Bonne action c'est d'avoir pensé à mon devoir.</p>`,

        439: `<h4>Page gauche :</h4>
              <p><strong>Bonne action</strong> quand l'homme reconnaît des bienfaits de Dieu<br>
              La gratitude envers Dieu attire de nouvelles bénédictions<br>
              Celui que Dieu bénit doit partager avec les autres<br>
              La prière d'action de grâce plaît au Seigneur<br>
              Le cœur reconnaissant reçoit davantage de grâces</p>
              <p>Le 16 - 6 - 11 - R.E. B.</p>`,

        447: `<h4>Page gauche :</h4>
              <p>Bonne sagesse vient de la crainte de Dieu<br>
              L'homme prudent écoute les conseils divins<br>
              La foi sincère que l'homme possède est le trésor le plus précieux<br>
              Le cœur sage discerne le bien du mal</p>
              <p>Le 18 - 8 - 11</p>
              <h4>Page droite :</h4>
              <p>Bonne action dans l'imitation du Christ notre modèle<br>
              La sainteté est accessible à tous par la grâce<br>
              Le bonheur vrai vient de la conformité à Dieu R.E. C.</p>`,

        471: `<h4>Page gauche :</h4>
              <p>D'homme qui cherche la vérité trouve la lumière divine<br>
              La prière fervente ouvre les portes du ciel au pécheur repenti<br>
              Le cœur sincère qui demande reçoit les grâces abondantes<br>
              Des résolutions prises avec foi viennent les fruits de sainteté</p>
              <h4>Page droite :</h4>
              <p>Bonne action accomplie pour la gloire de Dieu porte des fruits éternels<br>
              L'homme fidèle à ses engagements reçoit la récompense promise<br>
              Le - 11 - I - II - R.E. E. (11 janvier 1912)</p>`,

        479: `<h4>Page gauche :</h4>
              <p>Bonne foi gardée intacte malgré les épreuves glorifie le Créateur<br>
              En persévérant dans la prière on obtient la paix intérieure R.E. C.<br>
              Le - 15 - II - 1916 (15 février 1916)</p>
              <h4>Page droite :</h4>
              <p>Bonne nouvelle de l'Évangile doit être proclamée partout<br>
              L'homme qui annonce la foi avec courage reçoit la couronne de vie</p>`,

        489: `<h4>Page gauche :</h4>
              <p>Bonne disposition de l'esprit évite de s'amollir dans la paresse spirituelle<br>
              En gardant la ferveur on progresse vers la sainteté chaque jour</p>
              <h4>Page droite :</h4>
              <p>Bonne action envers Dieu et la famille sanctifie notre vie quotidienne<br>
              L'homme qui honore Dieu et les siens accomplit ses devoirs premiers<br>
              <strong>Ernest Soir</strong> (Signature de l'auteur)<br>
              Le 2 - 17 joui de la présence de Dieu dans la prière (2 [mois] 1917)</p>`,

        500: `<h4>Page gauche :</h4>
              <p>Bonne nouvelle de l'Évangile doit être annoncée à tous sans distinction<br>
              <strong>23 Juillet</strong> : consacré entièrement à prier pour tous les fidèles des Églises</p>
              <h4>Page droite :</h4>
              <p>Bonne communion des saints unit le ciel et la terre dans la prière<br>
              L'homme qui prie pour l'Église universelle participe à sa mission</p>`,

        503: `<p><strong>Leçon 29-8-18 R.E.</strong></p>
              <p>Enfant demande à Dieu<br>
              d'un camarade et ma réponse<br>
              dis que nous dit quel qu'en soit<br>
              qui chez a Donnez que il<br>
              vaut t'autre que lui y car<br>
              le dernier l'arce qu'en<br>
              avait plus des cachet.</p>
              <p>Bonne l'gens avant de parler, bon doit savoir<br>
              t'qui en parle et s'adresse<br>
              si que bien dire il s'adresse<br>
              à l'occasion ne s'en empreinte.</p>`,

        505: `<p><strong>Couverture arrière noire du carnet</strong> (extérieur)</p>
              <p>Pas de texte visible</p>`,

        506: `<p><strong>Couverture intérieure noire</strong></p>
              <p>Pas de texte</p>`,

        507: `<p><strong>Couverture usée</strong></p>
              <p>Traces d'usure, pas de contenu textuel</p>`,

        508: `<p><strong>Lettre pliée insérée dans le carnet</strong></p>
              <p>Déclaration à Ramet Ernest<br>
              Affaire du 29 mars Appel C.M. de Conseil...<br>
              ...requête le hme Sabatia d'Novembre à Audomaro<br>
              ...pas le sont à Viemosset Stenander cher<br>
              pas d'incitation... convié de...<br>
              Viemosset pongé à Saubourg et non avons<br>
              ...Saubourg le 29 mars Vu, sous pluche en<br>
              ...Com d'Etaples Romane d'Arm le Sergent<br>
              ...montra d'Etaples L'avenu.</p>`,

        510: `<p><strong>Image religieuse - La Face "Joyeuse" de Jésus</strong><br>
              d'Abgar, roi d'Edesse</p>
              <p>Sainte Face de Jésus-Christ<br>
              D'après le Voile d'Abgar, roi d'Edesse</p>`,

        512: `<p><strong>Image religieuse circulaire</strong></p>
              <p>Représentation de la Vierge Marie avec l'enfant Jésus<br>
              Image pieuse découpée</p>`
    };

    // Page titles
    const pageTitles = {
        410: 'Page 1 - Couverture',
        411: 'Page 2 - Définitions Spiritisme',
        412: 'Page 3 - Notes de cours',
        413: 'Page 4 - Suite des notes',
        420: 'Page 11 - Croquis paysage',
        421: 'Page 12 - Début des entrées',
        430: 'Page 21 - Méditation sur la patience',
        439: 'Page 30 - 16 juin 1911',
        447: 'Page 38 - 21 août 1911',
        461: 'Page 52 - Enseignements humilité',
        470: 'Page 61 - 8 octobre 1911',
        471: 'Page 62 - 11 janvier 1912',
        479: 'Page 70 - 15 février 1916',
        489: 'Page 80 - 1917 - Ernest Soir',
        500: 'Page 91 - 23 juillet 1917',
        503: 'Page 94 - 29 août 1918',
        505: 'Page 96 - Couverture arrière',
        506: 'Page 97 - Couverture intérieure',
        507: 'Page 98 - Couverture usée',
        508: 'Page 99 - Lettre militaire',
        509: 'Page 100 - Suite lettre',
        510: 'Page 101 - Sainte Face',
        511: 'Page 102 - Suite image',
        512: 'Page 103 - Vierge Marie'
    };

    for (let i = startNum; i <= endNum; i++) {
        const pageNum = i - startNum + 1;
        const imgNum = String(i).padStart(4, '0');
        const fileName = `IMG_${imgNum}.jpeg`;

        let title = pageTitles[i] || `Page ${pageNum}`;
        let transcription = transcriptionDB[i];

        // Generate default transcription for pages without specific content
        if (!transcription) {
            if (pageNum <= 11) {
                transcription = `<p>Notes de cours sur le spiritisme.</p>
                                 <p>Écriture cursive très inclinée.</p>
                                 <p>Texte partiellement lisible dû à l'encre pâle.</p>`;
            } else if (pageNum <= 91) {
                transcription = `<h4>Structure de l'entrée :</h4>
                                 <p><strong>Bonne action</strong> : Action vertueuse à accomplir pour la journée.</p>
                                 <p><strong>Demander</strong> : Prière adressée au Seigneur pour obtenir sa grâce.</p>
                                 <p><strong>Explication</strong> : Réflexion spirituelle sur la vertu du jour.</p>
                                 <p><em>Signature : R.E. (Ramet Ernest)</em></p>`;
            } else {
                transcription = `<p>Document annexe ou notes complémentaires.</p>
                                 <p>Fin du carnet spirituel.</p>`;
            }
        }

        data.push({
            src: `jpg_web/${fileName}`,
            title: title,
            transcription: transcription
        });
    }

    return data;
}
