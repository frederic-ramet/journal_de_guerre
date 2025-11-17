/**
 * Ontology Panel for Archives Editor
 * Displays and manages semantic entities and themes extracted from transcriptions
 */

class OntologyPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('Ontology panel container not found:', containerId);
      return;
    }

    this.currentAnalysis = null;
    this.isAnalyzing = false;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="ontology-panel">
        <div class="ontology-header">
          <h3><i class="fas fa-brain"></i> Analyse Sémantique</h3>
          <button id="analyze-btn" class="btn btn-primary btn-sm">
            <i class="fas fa-search"></i> Analyser
          </button>
        </div>

        <div id="ontology-status" class="ontology-status">
          <i class="fas fa-info-circle"></i>
          Cliquez sur "Analyser" pour extraire les entités et thèmes du texte.
        </div>

        <div id="ontology-results" class="ontology-results" style="display: none;">
          <!-- Themes -->
          <div class="ontology-section">
            <h4><i class="fas fa-tags"></i> Thèmes Détectés</h4>
            <div id="themes-list" class="themes-list"></div>
          </div>

          <!-- Entities -->
          <div class="ontology-section">
            <h4><i class="fas fa-users"></i> Personnes</h4>
            <div id="persons-list" class="entity-list"></div>
          </div>

          <div class="ontology-section">
            <h4><i class="fas fa-lightbulb"></i> Concepts</h4>
            <div id="concepts-list" class="entity-list"></div>
          </div>

          <div class="ontology-section">
            <h4><i class="fas fa-map-marker-alt"></i> Lieux</h4>
            <div id="places-list" class="entity-list"></div>
          </div>

          <div class="ontology-section">
            <h4><i class="fas fa-calendar"></i> Dates</h4>
            <div id="dates-list" class="entity-list"></div>
          </div>

          <!-- Statistics -->
          <div class="ontology-stats" id="ontology-stats"></div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this.analyzeText());
    }
  }

  /**
   * Get current transcription text from editor
   */
  getCurrentText() {
    // Try to get text from different possible sources
    const htmlEditor = document.getElementById('html-editor');
    if (htmlEditor) {
      return htmlEditor.value;
    }

    const contentArea = document.querySelector('.transcription-content');
    if (contentArea) {
      return contentArea.innerHTML;
    }

    return '';
  }

  /**
   * Analyze text and display results
   */
  async analyzeText() {
    if (this.isAnalyzing) return;

    const text = this.getCurrentText();
    if (!text.trim()) {
      this.showStatus('Aucun texte à analyser', 'warning');
      return;
    }

    this.isAnalyzing = true;
    this.showStatus('Analyse en cours...', 'loading');

    try {
      const response = await fetch('/api/ontology/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'analyse');
      }

      this.currentAnalysis = await response.json();
      this.displayResults();
    } catch (err) {
      console.error('Analysis error:', err);
      this.showStatus('Erreur: ' + err.message, 'error');
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Display analysis results
   */
  displayResults() {
    if (!this.currentAnalysis) return;

    const resultsContainer = document.getElementById('ontology-results');
    const statusContainer = document.getElementById('ontology-status');

    statusContainer.style.display = 'none';
    resultsContainer.style.display = 'block';

    // Display themes
    this.displayThemes(this.currentAnalysis.themes);

    // Display entities
    this.displayEntities('persons-list', this.currentAnalysis.entities.persons, 'person');
    this.displayEntities('concepts-list', this.currentAnalysis.entities.concepts, 'concept');
    this.displayEntities('places-list', this.currentAnalysis.entities.places, 'place');

    // Display dates
    this.displayDates(this.currentAnalysis.dates);

    // Display statistics
    this.displayStatistics();
  }

  /**
   * Display detected themes
   */
  displayThemes(themes) {
    const container = document.getElementById('themes-list');
    if (!container) return;

    if (themes.length === 0) {
      container.innerHTML = '<div class="no-data">Aucun thème détecté</div>';
      return;
    }

    container.innerHTML = themes.map(theme => `
      <div class="theme-badge" style="background-color: ${theme.color}20; border-color: ${theme.color}">
        <span class="theme-name">${theme.name}</span>
        <span class="theme-score" title="Score: ${theme.score}, Confiance: ${theme.confidence}%">
          ${theme.confidence}%
        </span>
        <div class="theme-keywords">
          ${theme.matchedKeywords.slice(0, 5).map(k => `<small>${k}</small>`).join(', ')}
        </div>
      </div>
    `).join('');
  }

  /**
   * Display entity list
   */
  displayEntities(containerId, entities, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (entities.length === 0) {
      container.innerHTML = '<div class="no-data">Aucune entité trouvée</div>';
      return;
    }

    // Sort by count descending
    const sorted = [...entities].sort((a, b) => b.count - a.count);

    container.innerHTML = sorted.map(entity => `
      <div class="entity-item" data-id="${entity.id}" data-type="${type}">
        <div class="entity-main">
          <span class="entity-name">${entity.name}</span>
          <span class="entity-count" title="${entity.count} occurrence(s)">${entity.count}x</span>
        </div>
        <div class="entity-meta">
          <small class="entity-type">${entity.type || entity.category || ''}</small>
          <small class="entity-confidence" title="Confiance">${entity.confidence}%</small>
        </div>
      </div>
    `).join('');

    // Add click handlers for entity highlighting
    container.querySelectorAll('.entity-item').forEach(item => {
      item.addEventListener('click', () => this.highlightEntity(item.dataset.id));
    });
  }

  /**
   * Display extracted dates
   */
  displayDates(dates) {
    const container = document.getElementById('dates-list');
    if (!container) return;

    if (dates.length === 0) {
      container.innerHTML = '<div class="no-data">Aucune date trouvée</div>';
      return;
    }

    container.innerHTML = dates.map(date => `
      <div class="date-item">
        <i class="fas fa-calendar-alt"></i>
        <span class="date-raw">${date.raw}</span>
        ${date.formatted !== date.raw ? `<small class="date-formatted">(${date.formatted})</small>` : ''}
      </div>
    `).join('');
  }

  /**
   * Display analysis statistics
   */
  displayStatistics() {
    const container = document.getElementById('ontology-stats');
    if (!container || !this.currentAnalysis) return;

    const stats = this.currentAnalysis.statistics;
    container.innerHTML = `
      <div class="stats-summary">
        <div class="stat-item">
          <span class="stat-value">${stats.totalEntities}</span>
          <span class="stat-label">Entités</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.themesDetected}</span>
          <span class="stat-label">Thèmes</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${this.currentAnalysis.dates.length}</span>
          <span class="stat-label">Dates</span>
        </div>
      </div>
      <div class="analyzed-at">
        Analysé le ${new Date(this.currentAnalysis.analyzedAt).toLocaleString('fr-FR')}
      </div>
    `;
  }

  /**
   * Highlight entity in text (optional feature)
   */
  highlightEntity(entityId) {
    // Find entity in current analysis
    let entity = null;
    for (const type of ['persons', 'concepts', 'places', 'objects']) {
      const found = this.currentAnalysis?.entities[type]?.find(e => e.id === entityId);
      if (found) {
        entity = found;
        break;
      }
    }

    if (!entity) return;

    // Visual feedback
    const items = document.querySelectorAll(`.entity-item[data-id="${entityId}"]`);
    items.forEach(item => {
      item.classList.add('highlighted');
      setTimeout(() => item.classList.remove('highlighted'), 2000);
    });

    // Could also highlight in editor (future enhancement)
    console.log('Entity selected:', entity);
  }

  /**
   * Show status message
   */
  showStatus(message, type = 'info') {
    const container = document.getElementById('ontology-status');
    if (!container) return;

    const icons = {
      info: 'info-circle',
      warning: 'exclamation-triangle',
      error: 'times-circle',
      loading: 'spinner fa-spin',
      success: 'check-circle'
    };

    container.style.display = 'block';
    container.className = `ontology-status status-${type}`;
    container.innerHTML = `
      <i class="fas fa-${icons[type] || icons.info}"></i>
      ${message}
    `;

    const resultsContainer = document.getElementById('ontology-results');
    if (resultsContainer && type !== 'loading') {
      resultsContainer.style.display = 'none';
    }
  }

  /**
   * Get current analysis data
   */
  getAnalysis() {
    return this.currentAnalysis;
  }

  /**
   * Clear analysis
   */
  clear() {
    this.currentAnalysis = null;
    this.showStatus('Cliquez sur "Analyser" pour extraire les entités et thèmes du texte.', 'info');
  }
}

// Export for use in editor
window.OntologyPanel = OntologyPanel;
