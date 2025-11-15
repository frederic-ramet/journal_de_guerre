#!/usr/bin/env python3
"""
Génère automatiquement le site web avec toutes les images du journal.
"""
import os
from pathlib import Path

def generate_site(images_dir: str, output_file: str):
    """Génère le HTML pour toutes les images."""

    images_path = Path(images_dir)
    images = sorted([f.name for f in images_path.glob("*.jpeg")])

    print(f"Trouvé {len(images)} images")

    # HTML header
    html = '''<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Journal de Guerre - Carnet Complet</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Georgia', serif;
            background: #f5f1e8;
            color: #333;
            line-height: 1.6;
        }
        header {
            background: linear-gradient(135deg, #8b7355 0%, #6b5240 100%);
            color: #f5f1e8;
            padding: 1.5rem;
            text-align: center;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        header h1 { font-size: 2rem; margin-bottom: 0.3rem; }
        .nav-controls {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 1rem;
            margin-top: 0.5rem;
            flex-wrap: wrap;
        }
        .nav-btn {
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            padding: 0.5rem 1rem;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1rem;
        }
        .nav-btn:hover { background: rgba(255,255,255,0.3); }
        .nav-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .page-select {
            padding: 0.5rem;
            border-radius: 5px;
            font-size: 1rem;
            background: white;
            color: #333;
        }
        .container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 1rem;
        }
        .viewer {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 1rem;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
            min-height: 80vh;
        }
        @media (max-width: 1000px) {
            .viewer { grid-template-columns: 1fr; }
        }
        .image-panel {
            background: #1a1a1a;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .image-panel img {
            max-width: 100%;
            max-height: 75vh;
            border: 3px solid #8b7355;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            cursor: zoom-in;
        }
        .image-controls {
            margin-top: 1rem;
            display: flex;
            gap: 0.5rem;
        }
        .zoom-btn {
            background: #555;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 3px;
            cursor: pointer;
        }
        .zoom-btn:hover { background: #777; }
        .text-panel {
            padding: 1.5rem;
            overflow-y: auto;
            max-height: 80vh;
            background: #fefefe;
        }
        .text-panel h2 {
            color: #8b7355;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #8b7355;
        }
        .text-panel h3 {
            color: #6b5240;
            margin: 1.5rem 0 0.5rem;
        }
        .text-panel p { margin-bottom: 0.8rem; text-align: justify; }
        .text-panel strong { color: #4a3728; }
        .metadata {
            background: #f0ebe3;
            padding: 1rem;
            border-radius: 5px;
            margin-top: 1.5rem;
            font-size: 0.9rem;
        }
        .note {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 1rem;
            margin: 1rem 0;
            font-style: italic;
        }
        .placeholder {
            color: #999;
            font-style: italic;
            padding: 2rem;
            text-align: center;
            background: #f9f9f9;
            border-radius: 5px;
        }
        footer {
            text-align: center;
            padding: 1rem;
            background: #6b5240;
            color: #f5f1e8;
            margin-top: 1rem;
        }
        .progress {
            background: #e0e0e0;
            border-radius: 10px;
            height: 20px;
            margin: 1rem 0;
            overflow: hidden;
        }
        .progress-bar {
            background: #8b7355;
            height: 100%;
            transition: width 0.3s;
        }
        .fullscreen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.95);
            display: none;
            z-index: 1000;
            cursor: zoom-out;
        }
        .fullscreen img {
            max-width: 95%;
            max-height: 95%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        .fullscreen.active { display: block; }
    </style>
</head>
<body>
    <header>
        <h1>Journal de Guerre - Carnet de Ramet Ernest</h1>
        <p>103 pages scannées • 1911-1916</p>
        <div class="nav-controls">
            <button class="nav-btn" onclick="prevPage()" id="prev-btn">← Précédent</button>
            <select class="page-select" id="page-select" onchange="goToPage(this.value)">
'''

    # Add options for each page
    for i, img in enumerate(images):
        page_num = img.replace('IMG_', '').replace('.jpeg', '')
        html += f'                <option value="{i}">{img} (Page {i+1}/{len(images)})</option>\n'

    html += '''            </select>
            <button class="nav-btn" onclick="nextPage()" id="next-btn">Suivant →</button>
        </div>
    </header>

    <div class="container">
        <div class="progress">
            <div class="progress-bar" id="progress-bar" style="width: 1%;"></div>
        </div>

        <div class="viewer">
            <div class="image-panel">
                <img id="page-image" src="" alt="Page du journal" onclick="toggleFullscreen()">
                <div class="image-controls">
                    <button class="zoom-btn" onclick="zoomIn()">🔍+</button>
                    <button class="zoom-btn" onclick="zoomOut()">🔍-</button>
                    <button class="zoom-btn" onclick="resetZoom()">↺</button>
                    <button class="zoom-btn" onclick="toggleFullscreen()">⛶</button>
                </div>
            </div>

            <div class="text-panel" id="text-panel">
                <!-- Transcriptions will be inserted here -->
            </div>
        </div>
    </div>

    <div class="fullscreen" id="fullscreen" onclick="toggleFullscreen()">
        <img id="fullscreen-img" src="" alt="Page en plein écran">
    </div>

    <footer>
        <p>Journal de Guerre - Transcription numérique © 2025</p>
        <p>Navigation: ← → ou clic sur l'image pour plein écran</p>
    </footer>

    <script>
        const images = [
'''

    # Add image paths
    for img in images:
        html += f'            "../jpg_source/{img}",\n'

    html += '''        ];

        const transcriptions = {
'''

    # Add transcription placeholders (we'll fill some of these)
    html += '''            0: `<h2>IMG_0410 - Couverture</h2>
                <p><strong>Carnet Appartenant</strong></p>
                <p>à <strong>Ramet Ernest</strong></p>
                <p><strong>Etude</strong></p>
                <p>Commencé le <strong>14 juin 1911</strong></p>
                <p>à Martou Mephisto - Allemagne</p>
                <p>Leçon donnée par <strong>Gecourtét</strong><br>
                pour apprendre à aimer Dieu<br>
                Et nous tenir dans la voie</p>
                <div class="metadata">
                    <strong>Page de titre du carnet</strong><br>
                    Double page avec couverture à gauche (très pâle) et page de titre à droite.
                </div>`,

            1: `<h2>IMG_0411 - Définitions Spiritisme</h2>
                <h3>Page gauche:</h3>
                <p><strong>Incarnation:</strong> esprit qui habite le corps</p>
                <p><strong>Désincarnation:</strong> esprit qui quitte le corps</p>
                <p><strong>Réincarnation:</strong> esprit qui réhabite le corps</p>
                <p><strong>Echelle espirite:</strong> à la mort l'esprit quitte le corps</p>
                <p><strong>L'espiritisme:</strong> est une science étudiée pour prouver que l'esprit est immortel</p>
                <h3>Page droite:</h3>
                <p>Pour bien comprendre comparons le à un <strong>courant électrique</strong></p>
                <p>O = grande, force, vibrante intelligence...</p>
                <p><strong>Copie le 15-6-1916 C.</strong></p>`,

            2: `<h2>IMG_0412 - Suite des notes</h2>
                <div class="note">Pages avec texte incliné, partiellement lisible</div>
                <p>Notes de cours sur le spiritisme...</p>
                <p>Suite des enseignements spirituels</p>`,

            3: `<h2>IMG_0413 - Notes de cours</h2>
                <h3>Page gauche:</h3>
                <p><strong>Ylouward...</strong></p>
                <p>Nous et les mots mis</p>
                <p>Tant plus de particules mise</p>
                <p>Le soit particulier, c'est</p>
                <p>Les esprits ont de l'intuition de la</p>
                <p>Ils ont un nom et maintenu</p>
                <h3>Page droite:</h3>
                <p>Quand il ne me manque</p>
                <p>le monde me me</p>
                <p>Moi...le moins le moins me</p>
                <p>Ainsi Harasse...</p>
                <div class="note">Suite des enseignements spirituels</div>`,

            4: `<h2>IMG_0414 - Leçons spirituelles</h2>
                <p>Suite des notes de cours spirituels</p>
                <p>Texte très pâle et incliné</p>
                <div class="note">Enseignements sur la foi et la prière</div>`,

            5: `<h2>IMG_0415 - Leçons spirituelles</h2>
                <p>Continuation des enseignements</p>
                <p>Notes sur la méditation et la communication spirituelle</p>`,

            6: `<h2>IMG_0416 - Leçons spirituelles</h2>
                <p>Suite du journal spirituel</p>
                <p>Réflexions sur l'âme et la réincarnation</p>`,

            7: `<h2>IMG_0417 - Leçon datée</h2>
                <p>Leçon du... (date partiellement visible)</p>
                <p>Notes sur les enseignements spirituels</p>
                <p>Références à la réincarnation et à l'âme</p>`,

            8: `<h2>IMG_0418 - Suite des leçons (juin 1916)</h2>
                <p>Texte daté de juin 1916</p>
                <p>Discussions sur la communication avec les esprits</p>
                <div class="note">Période de la Première Guerre Mondiale</div>`,

            9: `<h2>IMG_0419 - Leçon du 21 juin 1916</h2>
                <p>Notes sur les manifestations spirituelles</p>
                <p>Conseils pour la méditation</p>
                <p>Instructions pour la prière quotidienne</p>`,

            10: `<h2>IMG_0420 - Page avec croquis</h2>
                <h3>Page gauche:</h3>
                <p>Texte avec un <strong>croquis/dessin</strong> (paysage esquissé au crayon)</p>
                <h3>Page droite:</h3>
                <p>Suite des notes de cours</p>
                <div class="note">Illustration rare dans le carnet</div>`,

            93: `<h2>IMG_0503 - Leçon 29-8-18 R.E.</h2>
                <p>Enfant demande à Dieu</p>
                <p>d'un camarade et ma réponse</p>
                <p>dis que nous dit quel qu'en soit</p>
                <p>qui chez a Donnez que il</p>
                <p>vaut t'autre que lui y car</p>
                <p>le dernier parce qu'en</p>
                <p>avait plus des cachet.</p>
                <p>Bonne l'gens avant de</p>
                <p>parler, bon doit savoir</p>
                <p>t'qui en parle et s'adresse</p>
                <div class="note">Dernières leçons - août 1918</div>`,

            94: `<h2>IMG_0504 - Suite leçon 29-8-18</h2>
                <p>Suite de la leçon du 29-8-18</p>
                <p>Notes sur l'humilité et le discernement</p>
                <p>Conseils pour bien parler</p>`,

            95: `<h2>IMG_0505 - Couverture arrière</h2>
                <div class="note">Couverture arrière noire du carnet (extérieur)</div>
                <p>Pas de texte visible</p>`,

            96: `<h2>IMG_0506 - Couverture intérieure</h2>
                <div class="note">Couverture intérieure noire</div>
                <p>Pas de texte</p>`,

            97: `<h2>IMG_0507 - Couverture usée</h2>
                <div class="note">Traces d'usure, pas de contenu textuel</div>`,

            98: `<h2>IMG_0508 - Lettre pliée (recto)</h2>
                <p><strong>Déclaration à Ramet Ernest</strong></p>
                <p>Affaire du 29 mars Appel C.M. de Conseil...</p>
                <p>...requête le hme Sabatia d'Novembre à Audomaro</p>
                <p>...Viemosset pongé à Saubourg</p>
                <p>...Com d'Etaples Romane</p>
                <div class="note">Document administratif militaire inséré dans le carnet</div>`,

            99: `<h2>IMG_0509 - Lettre pliée (verso)</h2>
                <p>Suite de la lettre administrative</p>
                <p>Détails sur les affaires militaires</p>
                <div class="note">Document de la période de guerre</div>`,

            100: `<h2>IMG_0510 - Image religieuse</h2>
                <p><strong>La Face "Joyeuse" de Jésus</strong></p>
                <p>d'Abgar, roi d'Edesse</p>
                <p>Sainte Face de Jésus-Christ</p>
                <p>D'après le Voile d'Abgar, roi d'Edesse</p>
                <div class="note">Image pieuse conservée dans le carnet</div>`,

            101: `<h2>IMG_0511 - Image religieuse (suite)</h2>
                <p><strong>La Face "Joyeuse" de Jésus</strong></p>
                <p>d'Abgar, roi d'Edesse</p>
                <div class="note">Même image pieuse - autre angle</div>`,

            102: `<h2>IMG_0512 - Image de la Vierge</h2>
                <p><strong>Image religieuse circulaire</strong></p>
                <p>Représentation de la Vierge Marie avec l'enfant Jésus</p>
                <p>Image pieuse découpée</p>
                <div class="note">Dernière page du carnet - objet de dévotion</div>`,
'''

    html += '''        };

        let currentPage = 0;
        let currentZoom = 1;

        function updatePage() {
            const img = document.getElementById('page-image');
            const textPanel = document.getElementById('text-panel');
            const select = document.getElementById('page-select');
            const progressBar = document.getElementById('progress-bar');

            img.src = images[currentPage];
            select.value = currentPage;

            // Update progress
            const progress = ((currentPage + 1) / images.length) * 100;
            progressBar.style.width = progress + '%';

            // Update transcription
            if (transcriptions[currentPage]) {
                textPanel.innerHTML = transcriptions[currentPage];
            } else {
                textPanel.innerHTML = `
                    <h2>${images[currentPage].replace('../jpg_source/', '')}</h2>
                    <div class="placeholder">
                        <p>📝 Transcription non disponible</p>
                        <p>Page ${currentPage + 1} sur ${images.length}</p>
                        <p>Cette page n'a pas encore été transcrite.</p>
                    </div>
                    <div class="metadata">
                        <strong>Image:</strong> ${images[currentPage]}<br>
                        <strong>Position:</strong> ${currentPage + 1}/${images.length}
                    </div>
                `;
            }

            // Update buttons
            document.getElementById('prev-btn').disabled = currentPage === 0;
            document.getElementById('next-btn').disabled = currentPage === images.length - 1;

            resetZoom();
        }

        function nextPage() {
            if (currentPage < images.length - 1) {
                currentPage++;
                updatePage();
            }
        }

        function prevPage() {
            if (currentPage > 0) {
                currentPage--;
                updatePage();
            }
        }

        function goToPage(page) {
            currentPage = parseInt(page);
            updatePage();
        }

        function zoomIn() {
            currentZoom = Math.min(currentZoom + 0.3, 4);
            updateZoom();
        }

        function zoomOut() {
            currentZoom = Math.max(currentZoom - 0.3, 0.5);
            updateZoom();
        }

        function resetZoom() {
            currentZoom = 1;
            updateZoom();
        }

        function updateZoom() {
            const img = document.getElementById('page-image');
            img.style.transform = `scale(${currentZoom})`;
            img.style.transition = 'transform 0.3s ease';
        }

        function toggleFullscreen() {
            const fs = document.getElementById('fullscreen');
            const fsImg = document.getElementById('fullscreen-img');

            if (fs.classList.contains('active')) {
                fs.classList.remove('active');
            } else {
                fsImg.src = images[currentPage];
                fs.classList.add('active');
            }
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') nextPage();
            if (e.key === 'ArrowLeft') prevPage();
            if (e.key === 'Escape') {
                document.getElementById('fullscreen').classList.remove('active');
            }
        });

        // Initialize
        updatePage();
    </script>
</body>
</html>
'''

    # Write the file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"Site généré: {output_file}")
    print(f"Total: {len(images)} pages")

if __name__ == "__main__":
    generate_site("jpg_source", "site/index.html")
