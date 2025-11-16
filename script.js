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
    const openBtnHero = document.getElementById('readingModeBtnHero');
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

    if (!modal) return;

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
    if (openBtn) openBtn.addEventListener('click', openModal);
    if (openBtnHero) openBtnHero.addEventListener('click', openModal);
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

        412: `<h4>Page gauche :</h4>
              <p>Copie le 16-6-11 R.E. O.<br>
              Je prévois tout mon possible<br>
              pour faire le bien et éviter<br>
              le mal. Ramet Ernest</p>
              <p>Copie le 16-6-11 R.E. O.<br>
              Je promets de faire tout<br>
              mon possible pour faire le<br>
              bien et éviter Ramet Ernest<br>
              le mal.</p>
              <h4>Page droite :</h4>
              <p>17-6-11 R.E. E.<br>
              Seulement le système de midi<br>
              faite par Vermandel</p>
              <p>... pour le monde je le<br>
              remets à lui montrant le<br>
              le trouve et la l'encre on<br>
              l'mange c'est bien clairement<br>
              Règle comme Français<br>
              l'esprit comme un esprit<br>
              l'emet nous en esprit lumineux<br>
              plus haut... on esprit longtems</p>`,

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

        414: `<h4>Page gauche :</h4>
              <p>Oui c'est la vérité<br>
              pourquoi ? Parceque tout le<br>
              corps n'était parce qu'il n'avait<br>
              tout le même rien la seule<br>
              chose qu'il me voulait par quelque chose était<br>
              Je vus le vendrai par ce que j'ai<br>
              un le mal et le vais que tu<br>
              un la viande de me ferais<br>
              Je le l'hiver de ses mauvais<br>
              habreux. Toujours exposé mauvais<br>
              d'un camarade de la maîtrise<br>
              paroles. Je me ferois tout le<br>
              le mal avec lui. Lui une ferme<br>
              aux tu et moques tue moquer Et<br>
              je me se la réponde du<br>
              Pensons avec la grâce de Dieu<br>
              Et ma femme résidait ce ne pas<br>
              l'accompagner dans ce mauvais<br>
              vie. Et je m'inscris mon</p>
              <h4>Page droite :</h4>
              <p>21-6-12<br>
              Par ce chose mauvais qu'elle mais<br>
              beau vivance présent les chose en<br>
              Et même de les mains avec le solde<br>
              Ce poste vient perceque c'était que tu<br>
              Je vais tu vendrai parceque tu et que tu<br>
              un le mal et le vivais tu faire<br>
              un la viande de en ferais<br>
              Je les l'hiver de mauvais ferais</p>
              <p>Juré un plan la formes<br>
              C'est le leur. 15-6-12<br>
              J'ai le Gérant du Paris 6 de<br>
              Leçon du un 6 de 11 B. D.<br>
              Le rire Grand et n'a pas<br>
              cause celle une faire nouvelle<br>
              acteur. Bien souvent les</p>`,

        415: `<h4>Page gauche :</h4>
              <p>faire nous mettre dans la<br>
              fiente voir<br>
              de la matière<br>
              Copie le 16-6-11 Ramet E.<br>
              Par assez triste la mortuel<br>
              Et l'homme de table par quant je<br>
              toute chose et que une tout moi<br>
              et je même pensée<br>
              Demain faudra que table<br>
              que ne réponse de la maison</p>
              <p>Le 14 - 6 - 11<br>
              Aujourd'hui au travail je<br>
              suis arrivée à écarter le mal<br>
              avec résolation pour la dire<br>
              à mon chef et mes camarades<br>
              tous remercieront toute la<br>
              tout le besoin que je suis<br>
              la celle venimeux attire</p>
              <h4>Page droite :</h4>
              <p>Mais nous vraiment plus<br>
              mes fatigues je premis<br>
              un Dieu<br>
              J'accompagne<br>
              d'aujourd'hui à que nous<br>
              ne songeons qu'à vivre sois<br>
              toujours sans que tu resoir<br>
              du arts nous que chaud<br>
              dans la paix en l'enseignait<br>
              la nuits en sollé, part il<br>
              l'homme ce quelquec<br>
              Et un tu réponds du<br>
              l'etions avec la grâce de Dieu<br>
              qu'au a peut une la<br>
              pas lui sonni visite entrer<br>
              notre tous cherises disetais</p>`,

        416: `<h4>Page gauche :</h4>
              <p>volonté et la force de<br>
              me tenir dans la bonne<br>
              voie. Le 20-6-11 Ramet E.<br>
              Exécuter la Mauvais<br>
              actions en me forçant<br>
              le plus possible tout<br>
              ne pas fasse toute mine<br>
              l'imitation et l'espoir avec<br>
              la grâce de Dieu dans la<br>
              bonheur dans la<br>
              Voie.</p>
              <h4>Page droite :</h4>
              <p>ne plus recommence<br>
              Le 19 - 6 - 11 Ramet<br>
              Bonne action est Bonne un<br>
              homme de tout pour faire là<br>
              tu a eu camarade que la<br>
              la a bon vivre suite<br>
              Mauvaise action de<br>
              l'excité au la humeur<br>
              Le 20<br>
              Bonne action Radam<br>
              un camarade à Vois en<br>
              lui donnant une partie<br>
              etat vous marquer de<br>
              lui es Première Dieu<br>
              qui nous Bonne la bonne</p>`,

        417: `<h4>Page gauche :</h4>
              <p>Règle bonne des mauvaise action<br>
              et les mauvaise paroles et aussi<br>
              Un est toute par le mot et que tu<br>
              par la bonne entente qu'il lui<br>
              Je le l'hiver de ses mauvais<br>
              habreux. Toujours exposé mauvais<br>
              d'un camarade de la maîtrise<br>
              paroles. Je me ferois toute une<br>
              le mal avec lui. toute ferme<br>
              aux tu et moques tue moquer Et<br>
              je me se la réponde tu<br>
              Pensons avec la grâce de Dieu<br>
              Et ma femme résidait ce ne pas<br>
              l'accompagner dans ce mauvais<br>
              vie. Et je m'inscris mon</p>
              <h4>Page droite :</h4>
              <p>21-6-12<br>
              Par ces autres mauvais autres mais<br>
              beau vivance présent ne les chose en<br>
              Et même de les mains avec le solde<br>
              le repoche vient perceque tu en que tu<br>
              Je vais ne vandrai parce que tu n'ai<br>
              ne le mal et le viande de un firent<br>
              Je les l'hiver de me ferais</p>
              <p>Juré un plan la formes<br>
              C'est le leur. 15-6-12<br>
              J'ai le Gérant du 6 de 11 6 de<br>
              Leçon du un 6 de 11 B. D. de<br>
              Le rire Grand et n'a pas<br>
              cause celle une faire nouvelles<br>
              acteurs. Bien souvent</p>`,

        418: `<h4>Page gauche :</h4>
              <p>de conservation je lui ai dit<br>
              inutile mais a souffert<br>
              Ma fermeras à folle comme<br>
              Qu'il fallait pour tout chose<br>
              le mal sous rentrer dans<br>
              la voie du bien. Car le bon<br>
              et toujours recontemtre lui<br>
              Dieu. Et la mauvais vite et<br>
              la mauvais baisser oui<br>
              même mauvais l'un le mal</p>
              <h4>Page droite :</h4>
              <p>Leçon du 11 - 6 - 11 B. B.<br>
              J'ai été accusé d'en ce<br>
              mauvais à causer devais<br>
              la revoir du dis traite m<br>
              la dalle et jeu mal lui<br>
              savoir.</p>
              <p>Camarade pour bête que il<br>
              ma fait seul le lumière comment<br>
              Mon Camarade voulant ma<br>
              mauvaise femme me dit aussi<br>
              que que nom, dit un'est que<br>
              que chose a bonne que le moi<br>
              toute que nous le lui<br>
              le l'amie. Et l'honnete j'en<br>
              aurant faisons lors vexé me<br>
              le se l'avoir voie excuse me<br>
              le bonne avec le l'anière<br>
              seulement que lui de ton ne<br>
              aller que son peu les souvien<br>
              Lorsque légant tous dates soir<br>
              a aussi conter et son</p>`,

        419: `<h4>Page gauche :</h4>
              <p>Leçon du 17 - 6 - 11 R.C.<br>
              Une Mauvaise action que<br>
              lui fuit éviter aujourd'hui<br>
              au travail a écrire les<br>
              légère du bas recommencer<br>
              de me bonne fraternité par<br>
              l'encre que a voire une<br>
              mon Ramet a mon chef dans un<br>
              mauvais. Et</p>
              <p>Ma bonne volonté et<br>
              Dieu de continuant aux de<br>
              Leçon du 21 - 6 - 11 R.C.<br>
              Bonne action mes ouit aux<br>
              fulle que l'une l'avant aux<br>
              c'est très l'un a aussi je<br>
              veulent ne si pas occupé<br>
              lui lui en tes bonne pour<br>
              et tous il ne nous de mon totale<br>
              bonte et bonne choses</p>
              <h4>Page droite :</h4>
              <p>avant de faire ce que<br>
              on va dire. L'esprit avec cette<br>
              Légère de te plus recommander<br>
              de me bonne pourrait non<br>
              l'encre que a voulons une<br>
              mon Ramet a mon chef done au<br>
              mauvais. Et promis Bonne<br>
              sur la vraie le lui or<br>
              Leçon du 19 - 6 - 11 R.C.<br>
              Bonne action Cet Ladrique<br>
              Un camarade tolde du Saidges<br>
              mes lourde de chocolat<br>
              Mauvais qui et en nous deux<br>
              Où le me reçois viens et que<br>
              lui leur et l'orme de ma totale<br>
              bonte et le remercie Dieu<br>
              comme et belle fronce</p>`,

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

        422: `<h4>Page gauche :</h4>
              <p>tout me donner pour des<br>
              Lorsque l'argent que tu envois<br>
              vers nous taille pour manger est<br>
              des billets pour manger est<br>
              la boite de viande de la bonne<br>
              volonté 26-6-11 R.C.</p>
              <p>Bonne action que j'ai faite<br>
              J'ai aidée en Soldats à<br>
              charger un coque vers non<br>
              où il était très fatiguée<br>
              qu'il n'avait plus elle ou<br>
              j'espère a finir<br>
              Mauvaise action lui Entrer.</p>
              <h4>Page droite :</h4>
              <p>marier j'avais entienne<br>
              dans un maisoner R.C.<br>
              Conversation 15 ... R.C.<br>
              Le 25 - 6 - 11 R.C.<br>
              Bonne action que j'ai faite.<br>
              J'ai l'ortège en Bêtes Lugent<br>
              qu'il mourait lui suis a main-<br>
              vez. Je lui ai deme voisins<br>
              Difficile de ma terme volonté<br>
              Le 26 - 6 - 11 ... R.C.<br>
              Mauvaise action que j'ai<br>
              éviter ?<br>
              J'ai fait souffrir l'avoirs toutes<br>
              Je trouve une boîte de viande<br>
              à mon camarade lui</p>`,

        423: `<h4>Page gauche :</h4>
              <p>tout me donner pour des<br>
              Lorsque l'argent que tu envois<br>
              vers nous taille pour manger est<br>
              des billets pour manger est<br>
              la boite de viande de la bonne<br>
              volonté 26-6-11 R.C.</p>
              <p>Bonne action que j'ai faite<br>
              J'ai aidée en Soldats à<br>
              charger un coque vers non<br>
              où il était très fatiguée<br>
              qu'il n'avait plus elle ou<br>
              j'espère a finir<br>
              Mauvaise action lui Entrer.</p>
              <h4>Page droite :</h4>
              <p>marier j'avais entienne<br>
              dans un maisoner R.C.<br>
              Conversation 15 ... R.C.<br>
              Le 25 - 6 - 11 R.C.<br>
              Bonne action que j'ai faite.<br>
              J'ai l'ortège en Bêtes Lugent<br>
              qu'il mourait lui suis a main-<br>
              vez. Je lui ai deme voisins<br>
              Difficile de ma terme volonté<br>
              Le 26 - 6 - 11 ... R.C.<br>
              Mauvaise action que j'ai<br>
              éviter ?<br>
              J'ai fait souffrir l'avoirs toutes<br>
              Je trouve une boîte de viande<br>
              à mon camarade lui</p>`,

        424: `<h4>Page gauche :</h4>
              <p>Souvenez acteur pour<br>
              écrite de m'écoute car ce<br>
              Ne la évitée car vers<br>
              mon camarade R.C.<br>
              27<br>
              Bonne action que j'ai fait<br>
              Donne la boîte de viande<br>
              le leur à un voit aussii<br>
              Je il même tout qu'il étoit qu<br>
              Mauvais 28 29 6 11 R.C.<br>
              Mauvais acteur que<br>
              J'ai éviter.<br>
              Caîmes écoulée</p>
              <h4>Page droite :</h4>
              <p>Encore été fait car en<br>
              Poissier qui me disait<br>
              les première venait<br>
              Lorsque la un la bonne<br>
              volonté de me part plus<br>
              la fête 6 11 B.C.<br>
              Bonne condition ou faites?<br>
              Les me vois our l'univers<br>
              car l'étoit lui une voie e venir<br>
              fraîche l'un de la boîte lui<br>
              donc la même et l'un faite de<br>
              mis nous somme que<br>
              m'ai tout C. R.C.</p>`,

        425: `<h4>Page gauche :</h4>
              <p>fait sur la colère a nous<br>
              travaillé et j'ai toujours<br>
              Guide mon stand font en<br>
              une retour<br>
              Le 30 - 6 - 11 R.C.</p>
              <p>J'ai terminé ma charrier<br>
              Et je suis l'ombre et aussi<br>
              mon pauvrete plantes de faire<br>
              D'mauvais plantes de faire<br>
              travail à devais pour<br>
              le Dieu et mauvais de faire<br>
              ma bonne volonté<br>
              été Dieu quand mon<br>
              du reçoi jè le 30 6 11 R.C.</p>
              <h4>Page droite :</h4>
              <p>nous ville dans la<br>
              joie du lui<br>
              Le 29 - 6 - 11 R.C.<br>
              Bonne acteur que<br>
              j'ai faite ?<br>
              J'ai l'épête les Camarades<br>
              que me donne toujours<br>
              les bons sentiment de faire<br>
              La charité a me quelque<br>
              quand on a fai<br>
              Le 30 - 6 - 11 R.C.<br>
              Mauvaise action que<br>
              j'ai éviter ?<br>
              J'ai été dirait</p>`,

        426: `<h4>Page gauche :</h4>
              <p>Bonne action que j'ai faite ?<br>
              J'ai envoyé en étude en<br>
              une demeure de Biscuit enfants<br>
              le il n'avait pas tan n'être<br>
              face a l'argent.<br>
              1 - 7 - 11 R. E.<br>
              Mauvaise action que<br>
              j'ai évitée ?<br>
              De Enfous de des camarades<br>
              une leur travaille que<br>
              charge du Suidat menèrent<br>
              de ma bonne volonté.</p>
              <h4>Page droite :</h4>
              <p>2 - 7 - 11 B. C.<br>
              Bonne action que j'ai faite ?<br>
              J'ai aidé des camarades<br>
              une leur travail que<br>
              charge du suidat menèrent<br>
              de ma bonne volonté.<br>
              Bonne action que j'ai faite ?<br>
              J'ai aidé j'une d'insurer<br>
              J'ai exigé aux leur charge<br>
              que S. Claire<br>
              Bonne action<br>
              j'ai atteint en de j'ai eu ?</p>`,

        427: `<h4>Page gauche :</h4>
              <p>J'ai terminé force lui<br>
              charge en me lui ma boire<br>
              et me boire Jouilliés du lui<br>
              Mauvaise action S.C.<br>
              que j'ai évité ?<br>
              Que la afrique j'ai été<br>
              lui j'ai un camarade<br>
              toile rudiut me dise<br>
              que si matèle me touchant<br>
              j'ai me toujours villés de<br>
              et j'ai lui laissé enfainée<br>
              Bonne action que j'ai<br>
              faite ?<br>
              Avoir aidé l'allemand</p>
              <h4>Page droite :</h4>
              <p>que le travaille avec 2<br>
              bon chariot de ma boire noble<br>
              Bonne action que j'ai faite ?<br>
              D'écoute la ton consols<br>
              de mon camarade et me<br>
              me l'envoi lorsque le lui<br>
              ma fraîche que le lui<br>
              et fait boir une être.<br>
              Le 3 - 7 - 11 S. C.<br>
              Mauvaise action que<br>
              j'ai évité ?<br>
              D'avoir été jaloux<br>
              Le colère en travaillant<br>
              que un fuit d'ennui me fais<br>
              et avoir en joui S.C.<br>
              taisir</p>`,

        428: `<h4>Page gauche :</h4>
              <p>Le 3 - 7 - 11 R. E.<br>
              Bonne action que j'ai faite ?<br>
              J'ai fait une veille suète a<br>
              un Russe en lui donnant<br>
              de sa moitié lui le sadrès<br>
              Le 4 - 7 - 11 B. E.<br>
              Mauvaise action que j'ai<br>
              évité ?<br>
              J'ai la un la futurs traînes<br>
              avec du traîner de l'ama-<br>
              rade du l'amer la venda<br>
              la j'ayant le leur fraîches<br>
              Le 5 - 7 - 11 B. E.</p>
              <h4>Page droite :</h4>
              <p>Mauvaise action que j'ai<br>
              éviter a l'idéeur Cama-<br>
              rade du la travaillés ce<br>
              causer ? J'entre la venda<br>
              la j'ayant le leur fraîches<br>
              Le 5 - 7 - 11 B. C.</p>`,

        429: `<h4>Page gauche :</h4>
              <p>Bonne action que j'ai<br>
              faite ?<br>
              D'avoir rendu Service<br>
              écrite a un camarade.<br>
              de qui me demandé en<br>
              lui S'aide, que j'ai<br>
              Bonne action que j'ai<br>
              faite donnée deux lui<br>
              a un in envoi<br>
              Ramet qui il a en<br>
              les lundi n'épouvez<br>
              Le 6 - 7 - 11 B. C.<br>
              Mauvaise action<br>
              de me plus une mon travail</p>
              <h4>Page droite :</h4>
              <p>que j'ai évité et le je<br>
              était envoit et le trues<br>
              poilent il l'envers autre<br>
              folles et l'immeais voulait<br>
              mon camarade voulait<br>
              la laisser boire et me<br>
              je lui ai évité B.C.<br>
              Le 6 - 7 - 11 B. C.<br>
              Bonne action que j'ai faite ?<br>
              D'avoir aidé j'lusieurs<br>
              camarades a leur travail<br>
              Le 7 - 11 B. C.<br>
              Mauvaise action que j'ai<br>
              évité<br>
              de me plus une mon travail</p>`,

        430: `<h4>Page gauche :</h4>
              <p>Le 7 - 7 - 11 30 a l'impasse Réputation de<br>
              j'ai terminé ma le femme et le qui l'envoye que<br>
              Mon boire causer de bien l'ouverte le<br>
              toute doute la fin chemin cité me de l'faire autre<br>
              aller donc la lumière le toujours l'été m'a l'hiver<br>
              n'est souffre de l'orge en entre s'en longue qu'elle d'une<br>
              avez soldé de l'orge en voir n'étre chemin.<br>
              Bonne action que j'ai faite ?<br>
              l'envoi entête avez dire ton l'hélait hum<br>
              avec enfin lui défini religion ?<br>
              lui j'ai été toujours précèdent de faire attention<br>
              Le 8 - 7 - 11 30 E</p>
              <h4>Page droite :</h4>
              <p>Je veus être soit été de ma joie contre mes l'or<br>
              Lude a toujours l'este a de que n'êtes font leurs<br>
              que chrétien est cause autrefois que se lui qui dit<br>
              que cette cela avait l'ombrage celle lui ?<br>
              Ma voile à vous les voile qu'il vu relie très mois<br>
              indents l'un des enfantes qu'il vous en moi me<br>
              la l'aile Mais Leur etre lle ent de soules pour la faits lui<br>
              ils ne l'ouvrante j'alais Leurs aimer ou le l'édélais tout<br>
              lui l'aimer tous a l'autre et or<br>
              l'avons mes que l'actiones et ma fait<br>
              que il lui qu'il font l'omas ai le l'ouvrons<br>
              ma mis ce là enfait qu'il la la charité Froid<br>
              lance ne doit que son R.C.<br>
              le 4 me quoi</p>`,

        431: `<h4>Page gauche :</h4>
              <p>J'une avec qu'il tout au j'ai la première finalle a la<br>
              l'envoi tient l'était il ne parler en doit le<br>
              l'envoyés suit ce trois Brise ? On n'est pas de qu'il amoi<br>
              et seul<br>
              Qu'il mème est l'éprouve une l'aire cela dans ce l'est moi lai<br>
              l'aure de mot metit en effet bas une a l'êtrement has me<br>
              que t'aire déjà<br>
              j'uns le qu'ai l'espivs l'orque metila ce que l'ait ou vroi<br>
              le qui soient l'un et qui l'oui le marole de soi moi<br>
              le pourrait éviter l'airas lia<br>
              le soi l'emte est et l'eus lass l'anque nous le loi<br>
              moi et nul le leur laisse est lui leur l'autre font lui<br>
              été ai n'est les lui laisser les faire l'emis C est<br>
              sujet mais le loi me il fait l'aute sans<br>
              la mot</p>
              <h4>Page droite :</h4>
              <p>Junes l'apinelle e un été soleil qu'il et la jus<br>
              Le 8 - 7 - 11 l'autre ont au l'eudées et moi<br>
              B aient des sol l'aidons ne poulé l'avons avec nous<br>
              le pour fust que moi jus de plus nature voi<br>
              l'effet que lui l'envois l'avons j'alois du fut l'une<br>
              lui s'ouffri que Borde Par ou t'aide avec et très lui<br>
              et leur environ qu'on lui ai lui été eus s'en leur l'est<br>
              laide leur encens elle lui ne pas ma envoi, deme a<br>
              l'ame' brois qu'alla une l'aie l'ai dieu<br>
              Le 9 - 7 - 11 B.E.<br>
              un Buisse en ai l'avant à l'ommie faites?<br>
              me fait R. E.</p>`,

        432: `<h4>Page gauche :</h4>
              <p>Le 7 - 7 - 11 B.A.<br>
              B.A. que j'ai faite ? En arrivant au travail j'ai sait une bonne méthode<br>
              que j'ai faite ? De faire frater a lui un l'onde que<br>
              que j'ai faite ? J'ai aime frater un toi Buillet enfant<br>
              lui j'ai faite ? J'ai caviaire ame bienneté et a nui l'homme<br>
              que j'ai faite ? J'ai eu admirè jue le l'aidière cette home<br>
              Lui j'ai faite ? J'ai l'ou le Parteneige en une l'ouvrette<br>
              Bue j'ai faite ? J'ai forme jue t'en Brume tout bienunter les t'être<br>
              Lue j'ai faite ? J'ai ma Buisse l'ait leur faul faille d'une reuse<br>
              Lue j'ai faite ? J'ai verante pour ne que l'envoils de eudées<br>
              l'ai faite ? Que tu etre l'etois la l'ouvrette entaille quelque<br>
              j'ai faite au cette l'aile leur et l'etaudes quelque de lui<br>
              j'ai faites qu'une et qui laisser l'eur les mis les aller de<br>
              Le faula a je lui cadre de ma volonté R.E.</p>
              <h4>Page droite :</h4>
              <p>M. A.<br>
              Que j'ai évité ? En lui faute de la mauvaise actions<br>
              Que j'ai évité ? me l'aur elle la trèmfais environ a mais fait<br>
              Que j'ai évité ? De lui ne le Buillet me la eudie<br>
              Que j'ai évité ? Je a lui une fois L'envoils t'alai pas<br>
              Que j'ai évité ? Je lui faite même pas seule mes colère<br>
              Que j'ai évité ? Je lui un fois l'entaille me Buisse en falles<br>
              Que j'ai évité ? J'ai ne l'aus ma l'ordie Dieu ma colée et si<br>
              Que j'ai évité ? J'ai ne l'aus mes cadre l'envoils me Buisse<br>
              Que j'ai évité ? J'ai ne l'aus ma l'ordie que me l'envois<br>
              Que j'ai évité ? J'ai toutes ma etre l'envois la l'autre<br>
              Beconsle le 10 - 7 - 11 R. E.</p>`,

        433: `<h4>Page gauche :</h4>
              <p>B.A. que j'ai faite ? D'elle beau l'engagez a l'eutufuisers l'envoie<br>
              In di que le 11-7-11 D'être lui et lui chese l'orme que l'aite l'euris<br>
              Le B. que j'ai faite ? Depuis le l'ouvriers joyent de s'espert<br>
              Le B. que je l'avité ? Dernier le mouvoir très le lui<br>
              La le 12-7-11 en B.C.<br>
              Bonne bonne j'ai été ? Je que elle des l'avoir dans<br>
              ma l'aures j'ai été ? elle ou l'ouest l'aidier que l'effois d'etre<br>
              Le il que j'ai évité ou ma l'aidier l'aidier leur de pois l'astin<br>
              Le 13 - 7 - 11 B.E a la maîlles j'air de pois l'astin</p>
              <h4>Page droite :</h4>
              <p>B.A. que j'ai faite ? De me l'aur être antechere<br>
              que j'ai faite ? de m'boire mes l'eux l'eufres<br>
              que j'ai faite ? de m'boire cras l'eus lui toit l'autre feuilles<br>
              que j'ai faite ? De lui eu de l'autre lui mais mes l'aute<br>
              que j'ai évité ? J'ai est l'ame l'etre de l'aurais l'auttes<br>
              que j'ai évité ? De ne pas ma bourse a camarade Dieu<br>
              que j'ai évité ? De ne pas en l'aitre très l'aidiers<br>
              Le II</p>`,

        434: `<h4>Page gauche :</h4>
              <p>B.A. que j'ai faite ? D'elle beau l'engagez a l'eutufuisers l'envoie<br>
              In di que le 11-7-11 D'être lui et lui chese l'orme que l'aite l'euris<br>
              Le B. que j'ai faite ? Depuis le l'ouvriers joyent de s'espert<br>
              Le B. que je l'avité ? Dernier le mouvoir très le lui<br>
              La le 12-7-11 en B.C.<br>
              Bonne bonne j'ai été ? Je que elle des l'avoir dans<br>
              ma l'aures j'ai été ? elle ou l'ouest l'aidier que l'effois d'etre<br>
              Le il que j'ai évité ou ma l'aidier l'aidier leur de pois l'astin<br>
              Le 13 - 7 - 11 B.E a la maîlles j'air de pois l'astin</p>
              <h4>Page droite :</h4>
              <p>(Page identique à la 433)</p>`,

        435: `<h4>Page gauche :</h4>
              <p>J'envois des morcemois c'moi oriz. entendre que il a le était aide l'autre<br>
              en et livut Mais dent  J'ui le le seuil l'ouvres sois<br>
              meilleurs les chose a que l'épreuves l'aue la qu'ils lieus aute<br>
              notre j'aitre une l'aure l'aue elle l'aume l'ailait avec suelle que<br>
              l'aile manifestaur et m'a indiete que la l'aure l'alait le ques leur<br>
              autes lui l'autes en deux l'eut tous une de l'autrois et<br>
              j'une Notre aibiere<br>
              l'aie que ne Burs que le l'autre que il ou a l'ainsi que il nuit<br>
              été un leut que est le du bien Vuei autres l'autre mes<br>
              j'ai seulement l'eu et elle avec me s'et l'épreuves<br>
              j'aié de lui et eau ton l'autre l'adver l'ouverle que moi lieus<br>
              L'ume que e et que l'autes de l'autres lui avait lui leur mai elle lui<br>
              est lui le lui l'ater très lui l'aidiers l'aure a voi<br>
              vit le l'ai sa l'ai lui l'autre l'aisaur que lui l'eure ce lui<br>
              mets qu'il a lui que j'aiu l'envor j'aue l'ai leur lui l'amie l'atur<br>
              sujet que ou me que le l'eur ai les fait. Clas s'eu ne l'autres sus<br>
              La moi</p>
              <h4>Page droite :</h4>
              <p>Le l'acuis ne l'aui ouvrit est lui et jadis avec lui jus<br>
              comme soli me l'auis et l'auts. R. E.<br>
              11 - 7 - 11<br>
              Vous avez très fait mes l'enviures<br>
              un oiffre l'envoi veules i et l'envoi ga l'ave<br>
              grâce de Dieu pour l'eus avairieue 1 i tous a<br>
              de lui lui<br>
              Bome</p>`,

        436: `<h4>Page gauche :</h4>
              <p>De la Générale 9 - Que ce que l'aune de principes l'astig me l'a<br>
              l'auyoit est de trouver en quele prage et leur été que l'envoy aussi l'eus sais<br>
              Donc l'envoye en toujours le l'aude ou la l'autre les l'aune vois que<br>
              mi l'envovce en l'autre je l'autes ou au l'entre boire mou que la aussi un<br>
              l'autre de l'aure autres à lui soi autre autres<br>
              lui amont aussi me lui l'autres à lui soi autre alrès de Voilons<br>
              Les omboire lui a leur a et vou lui les<br>
              remplies lui a l'auro en sous fois qui l'ent quand l'avoir soir<br>
              que mois me l'aures mais en l'autre moi que toujours l'autre<br>
              comme le lui lui Burs que et avec foulat mâle de tout<br>
              lui bonilé son moi l'uai que e l'air d'étreinée<br>
              l'autrui a leur que il croit que lui jeus l'enfant veulent<br>
              l'asiles ou a c'est lit et l'étoit lui en l'auyuit en l'envoie<br>
              l'aiue que ce elle l'et l'atrouver de a moi lui voilent soi<br>
              es une lui ce dans lieur t'en me l'aidies mes Vuei les<br>
              ailes lui que l'eu a moi juvise senti l'enfoncs e a tous<br>
              voilit et est et était ce nous mais juyait à l'aute tous l'ut lui l'autre<br>
              suget moi le lui ce lit faire</p>
              <h4>Page droite :</h4>
              <p>Il moi<br>
              Bons que je l'affectons la moi et soli l'autre avec veute<br>
              suces de sol l'afférer que l'aute et la l'ormes s'aux<br>
              que de soi l'aidier ne pourrait ce qui l'auter autres<br>
              qui l'aut j'envoi ne qu'il à l'aute l'aveu l'autos ge l'aut<br>
              l'entrers à l'ai oui l'autes aux l'autes Ponces e et l'autre<br>
              l'autre telle soi qu'ils de la l'ommencement<br>
              l'autre l'audo du l'autre pour l'envos l'autre l'aire deux l'alt<br>
              que ne l'autre l'au du l'antres choses d'un l'autre<br>
              l'aurais un j'ours lui l'ai envoyés lui le l'autre au es Bie<br>
              lu ne l'envois ouit ou l'annes t'ai l'aidie</p>`,

        437: `<h4>Page gauche :</h4>
              <p>De la Générale 9 - Que ce que l'aune de principes l'astig me l'a<br>
              l'auyoit est de trouver en quele prage et leur été que l'envoy aussi l'eus sais<br>
              Donc l'envoye en toujours le l'aude ou la l'autre les l'aune vois que<br>
              mi l'envovce en l'autre je l'autes ou au l'entre boire mou que la aussi un<br>
              (Suite du texte de la page 436)</p>
              <h4>Page droite :</h4>
              <p>Même structure que page précédente<br>
              Texte dense et réflexions spirituelles</p>`,

        438: `<h4>Page gauche :</h4>
              <p>l'ouvres elle me l'aitre de entre l'homme de lui l'être l'avmelle et<br>
              l'ours de lui l'enfeux me colléeur tôt lui elle que la si l'autes jouer<br>
              l'autes ma l'élèves ne l'aumes qu'en ce me en la colléeure l'autes<br>
              me l'autre l'ommune qu'il évente en que l'autres<br>
              de commaitre qui un de joui lui en me lui que les l'autes sautes<br>
              la l'autre<br>
              qu'il ainsi qu'il à mes nous l'avait me aussi que l'avit sans les autres<br>
              Ceux que de grande l'aures et l'autre l'auve qu'il tou l'antre et<br>
              de soleit ane les que des l'auits mes de l'aute l'aurs<br>
              soi l'une qu'il leur me l'aures l'enfor a l'antre ouine Vuei l'oi<br>
              l'audieux Pour se qu'il fait mes l'aidiers l'aune en me soi lui<br>
              l'effe envois l'ouffit s'avoient l'ouvrit l'ome ses lui<br>
              Bours a lui que l'ou l'avuis s'est au l'audie sons lui l'aune d'air<br>
              soir a en lui</p>
              <h4>Page droite :</h4>
              <p>lui l'auters<br>
              l'aure passoir l'aui les de la l'omne au l'oumes le lui<br>
              Bren lui son un que l'aue en de l'aue amos l'autes ce<br>
              l'envois qui qu'il tous l'auts et l'ouvé effais puis<br>
              l'autes que lui l'allant l'autre l'autre l'autrés que<br>
              l'aure ceux que elle en qu'elle l'oves alors<br>
              avec autre que l'autres en l'ale l'audres qui l'autres<br>
              l'antre de lui l'affeut fait t'élégie qu'il la colore tu l'autres<br>
              et l'autre souvent l'autres qu'il faut autès l'aune moi l'aute<br>
              la nous l'aite en que l'emes l'ai<br>
              J'ai me l'autriente que le l'aire mu l'ais et l'autres a autres<br>
              l'ament qu'il l'aides ses l'autre</p>`,

        439: `<h4>Page gauche :</h4>
              <p>Surtout que il y a quand l'homme à effectuer qui ta<br>
              le vie puisqu'alumer quete dois y des chauve que la<br>
              la voyance en même que l'annula au clôture il fait leur aux<br>
              aux les éprit sont et sous plus y charité ce que la fautes en<br>
              la tons l'avais il sous vol aprèle de la boncher ou<br>
              Nous parle seule lui me que la carrée leur baucou ce l'été<br>
              me. es foule ale ouvrir que la volonté celle en fruit en science<br>
              Où aller Brumaine lois. Elle présent l'effet tout lui<br>
              Où me et l'attend lui de nous qu'il puisque qu'un Bois les la<br>
              Muse ne l'envoyé en quelquand ce nous tout les autre vent in<br>
              fréquent entoures la Fournuies de le l'égalité la sur<br>
              le me reliant ancore l'amour mais la joui mals que le<br>
              Il nous aussi jouer lui ce que mariage de le ton<br>
              l'envoi les sauter l'adorer à l'étager près dos lui<br>
              sur tout le baiser d'albumen tous lui aussi bois<br>
              quelques va laquer de luire l'envie de but desserts ou de<br>
              de vont écoles de jeune l'envois de l'autres y avec<br>
              d'année Descartes les l'actions de l'ame le 15-7-11 R.E.</p>
              <h4>Page droite :</h4>
              <p>(Page vide)</p>`,

        447: `<h4>Page gauche :</h4>
              <p>Dieu roue l<br>
              Là l'oeuvrée<br>
              Cela venait voie et l'homme au et ce des clone et me lui soit<br>
              ne l'entendre lui et envoi ell de fassée et l'ennin mes<br>
              et l'me entièr en affetion l'événement est les bonne chere<br>
              Et les autres leurs l'éterme ?<br>
              L'homme suivre a toujours moi montrer une<br>
              l'homme fait et triste quelque forne et ne<br>
              la mort le soi que nous quand tout sur l'ecrire Et celles<br>
              une versées a toujours l'esprit point ne et l'ful boire ?<br>
              mauvais resqu. R.G.<br>
              L'expression Dieu le lui chose ?</p>
              <h4>Page droite :</h4>
              <p>Bonne ques l'employer au souhait est assure<br>
              pour cela l'homme faite le il tous leur fois l'éspour<br>
              tous création fluxer où il bien et il nous baille tu<br>
              celui ques le partiel les affaire tou<br>
              votre à que Vient B. ma...<br>
              16 - 8 -<br>
              D'effectives ? La raineure<br>
              La pourcene est une mauvaise action toujours<br>
              Crée un vois le impose oui nous votée toujours<br>
              faire ni tout, et l'homme sans cette mauvaise en mauvais<br>
              sautomes à frappe jeu l'audience 18-1-18 R.C.<br>
              tais</p>`,

        471: `<h4>Page gauche :</h4>
              <p>D'oblication sur l'influence clôturer le le humain<br>
              L'fini l'offre est me besoin l'effémier le mais<br>
              quels de Dieu pour la l'entreur il'out mettons<br>
              cité Besoin qui l'être l'entreur Tren l'outions<br>
              Belle me ainsi meilleur Dieu nous comme le l'êtres<br>
              que et nous soutenir Dieu qui nous l'entrée un le ces fut<br>
              celli. et ainsi le s'éines est Dieu lui l'ouvre lui le tout<br>
              il frois élèves de la nuit le Dieu tel l'ome une me dans<br>
              et une élévation actions de Dieu bien donc moi nous<br>
              Messe n'une M Pl par il Dieu et'l'afflution sous un ce ces<br>
              universion de l'était fut est l'envenue jusqu'une l'éléise et eux<br>
              le Dieu notre l'afflui est univernal jusqu'une à est le un<br>
              le nous faisons toute nous ne dans la Formes</p>
              <h4>Page droite :</h4>
              <p>que celle de l'agrées l'Rodie priés doit la Lummes<br>
              tous de nos m nous vous les Dieu lui pour lui donc<br>
              l'ont lundie qu'u mus cle fait leur ta très Dieu lui que<br>
              Le 16 -10 18 C.l'offerions et une l'offres est mous<br>
              la l'avoir les l'ame l'offenes donc l'est des l'offre m<br>
              le avoir la l'envoi donc leurs l'eus l'effets doit<br>
              est les l'agence le l'édifice ques la t'à me de loi<br>
              et envois et l'entiers la la toute de Dieu quels ait<br>
              Écla tenu tenta<br>
              la 11 -10 - 18 donc que non<br>
              De l'oblégate l'envai de quete l'ame le Deus la tercion<br>
              17-10-18 R.C.</p>`,

        479: `<p><strong>Texte manuscrit partiellement illisible</strong></p>
              <p>Écriture cursive très inclinée.</p>
              <p>Éléments lisibles :<br>
              Signature : <strong>R.E.</strong><br>
              Date : <strong>15 - 1 - 1918</strong></p>`,

        489: `<p><strong>Texte manuscrit partiellement illisible</strong></p>
              <p>Écriture cursive difficile à déchiffrer.</p>
              <p>Éléments lisibles :<br>
              <strong>Le 27</strong><br>
              <strong>Ramet Ernest</strong></p>`,

        500: `<p><strong>Texte manuscrit partiellement illisible</strong></p>
              <p>Écriture cursive difficile à déchiffrer.</p>
              <p>Éléments lisibles :<br>
              <strong>28 Juil</strong><br>
              Jeune</p>`,

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
            transcription = `<p><strong>Texte manuscrit illisible</strong></p>
                             <p>Écriture cursive très inclinée, difficile à déchiffrer.</p>`;
        }

        data.push({
            src: `jpg_web/${fileName}`,
            title: title,
            transcription: transcription
        });
    }

    return data;
}
