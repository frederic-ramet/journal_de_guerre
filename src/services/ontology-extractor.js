/**
 * Ontology Extractor Service
 * Automatically extracts entities, concepts, and themes from transcription text
 */

const fs = require('fs');
const path = require('path');

class OntologyExtractor {
  constructor(ontologyPath) {
    this.ontologyPath = ontologyPath || path.join(__dirname, '..', '..', 'data', 'ontology.json');
    this.ontology = this.loadOntology();
  }

  loadOntology() {
    try {
      const data = fs.readFileSync(this.ontologyPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Failed to load ontology:', err.message);
      return { entities: { persons: [], concepts: [], places: [], objects: [] }, themes: [] };
    }
  }

  /**
   * Extract all entities from text
   * @param {string} text - Plain text to analyze
   * @returns {Object} Extracted entities with counts
   */
  extractEntities(text) {
    const results = {
      persons: [],
      concepts: [],
      places: [],
      objects: []
    };

    const normalizedText = this.normalizeText(text);

    // Extract persons
    for (const person of this.ontology.entities.persons) {
      const count = this.countPatternMatches(normalizedText, person.patterns);
      if (count > 0) {
        results.persons.push({
          id: person.id,
          name: person.name,
          type: person.type,
          count: count,
          confidence: this.calculateConfidence(count, person.frequency)
        });
      }
    }

    // Extract concepts
    for (const concept of this.ontology.entities.concepts) {
      const count = this.countPatternMatches(normalizedText, concept.patterns);
      if (count > 0) {
        results.concepts.push({
          id: concept.id,
          name: concept.name,
          category: concept.category,
          count: count,
          confidence: this.calculateConfidence(count, concept.frequency)
        });
      }
    }

    // Extract places
    for (const place of this.ontology.entities.places) {
      const count = this.countPatternMatches(normalizedText, place.patterns);
      if (count > 0) {
        results.places.push({
          id: place.id,
          name: place.name,
          type: place.type,
          count: count,
          confidence: this.calculateConfidence(count, 10)
        });
      }
    }

    // Extract objects
    for (const obj of this.ontology.entities.objects) {
      const count = this.countPatternMatches(normalizedText, obj.patterns);
      if (count > 0) {
        results.objects.push({
          id: obj.id,
          name: obj.name,
          type: obj.type,
          count: count,
          confidence: this.calculateConfidence(count, 5)
        });
      }
    }

    return results;
  }

  /**
   * Detect themes based on keyword presence
   * @param {string} text - Plain text to analyze
   * @returns {Array} Detected themes with scores
   */
  detectThemes(text) {
    const normalizedText = this.normalizeText(text);
    const detectedThemes = [];

    for (const theme of this.ontology.themes) {
      let score = 0;
      const matchedKeywords = [];

      for (const keyword of theme.keywords) {
        const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi');
        const matches = normalizedText.match(regex);
        if (matches) {
          score += matches.length;
          matchedKeywords.push(keyword);
        }
      }

      if (score > 0) {
        detectedThemes.push({
          id: theme.id,
          name: theme.name,
          description: theme.description,
          color: theme.color,
          score: score,
          matchedKeywords: [...new Set(matchedKeywords)],
          confidence: Math.min(100, score * 10)
        });
      }
    }

    // Sort by score descending
    return detectedThemes.sort((a, b) => b.score - a.score);
  }

  /**
   * Extract dates from text using pattern matching
   * @param {string} text - Text to analyze
   * @returns {Array} Extracted dates
   */
  extractDates(text) {
    const dates = [];

    // Pattern: "14 juin 1918", "1er octobre 1911", etc.
    const datePatterns = [
      /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/gi,
      /(\d{1,2})er\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/gi,
      /(\d{4})/g
    ];

    const monthMap = {
      'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
      'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
      'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
    };

    // Full dates
    const fullDateRegex = /(\d{1,2})(?:er)?\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/gi;
    let match;
    while ((match = fullDateRegex.exec(text)) !== null) {
      const day = match[1].padStart(2, '0');
      const month = monthMap[match[2].toLowerCase()];
      const year = match[3];
      dates.push({
        raw: match[0],
        formatted: `${year}-${month}-${day}`,
        year: parseInt(year),
        month: parseInt(month),
        day: parseInt(day)
      });
    }

    // Year only (if no full date found)
    if (dates.length === 0) {
      const yearRegex = /\b(19\d{2})\b/g;
      while ((match = yearRegex.exec(text)) !== null) {
        if (!dates.some(d => d.year === parseInt(match[1]))) {
          dates.push({
            raw: match[1],
            formatted: match[1],
            year: parseInt(match[1]),
            month: null,
            day: null
          });
        }
      }
    }

    return dates;
  }

  /**
   * Analyze text and return complete semantic analysis
   * @param {string} text - Text to analyze (can be HTML or plain text)
   * @returns {Object} Complete analysis results
   */
  analyze(text) {
    // Strip HTML tags for analysis
    const plainText = this.stripHtml(text);

    const entities = this.extractEntities(plainText);
    const themes = this.detectThemes(plainText);
    const dates = this.extractDates(plainText);

    // Calculate overall statistics
    const totalEntities =
      entities.persons.length +
      entities.concepts.length +
      entities.places.length +
      entities.objects.length;

    const primaryTheme = themes.length > 0 ? themes[0] : null;
    const primaryConcepts = entities.concepts
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      entities,
      themes,
      dates,
      statistics: {
        totalEntities,
        personsFound: entities.persons.length,
        conceptsFound: entities.concepts.length,
        placesFound: entities.places.length,
        objectsFound: entities.objects.length,
        themesDetected: themes.length
      },
      summary: {
        primaryTheme,
        primaryConcepts,
        dateRange: this.calculateDateRange(dates)
      },
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * Get suggested relations based on extracted entities
   * @param {Object} entities - Extracted entities
   * @returns {Array} Suggested relations from ontology
   */
  suggestRelations(entities) {
    const suggestions = [];
    const extractedIds = new Set();

    // Collect all extracted entity IDs
    for (const category of Object.values(entities)) {
      for (const entity of category) {
        extractedIds.add(entity.id);
      }
    }

    // Find relations where both source and target are in extracted entities
    for (const relation of this.ontology.relations) {
      if (extractedIds.has(relation.source) && extractedIds.has(relation.target)) {
        suggestions.push(relation);
      }
    }

    return suggestions;
  }

  /**
   * Get hierarchy placement for extracted entities
   * @param {Object} entities - Extracted entities
   * @returns {Object} Hierarchical organization
   */
  getHierarchy(entities) {
    const hierarchy = {};

    for (const [category, entityIds] of Object.entries(this.ontology.hierarchy)) {
      const matched = [];
      for (const id of entityIds) {
        for (const entityType of Object.values(entities)) {
          const found = entityType.find(e => e.id === id);
          if (found) {
            matched.push(found);
          }
        }
      }
      if (matched.length > 0) {
        hierarchy[category] = matched;
      }
    }

    return hierarchy;
  }

  // Helper methods

  normalizeText(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents for matching
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"');
  }

  stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  countPatternMatches(text, patterns) {
    let totalCount = 0;
    const normalizedText = this.normalizeText(text);

    for (const pattern of patterns) {
      const normalizedPattern = this.normalizeText(pattern);
      const regex = new RegExp(`\\b${this.escapeRegex(normalizedPattern)}\\b`, 'gi');
      const matches = normalizedText.match(regex);
      if (matches) {
        totalCount += matches.length;
      }
    }

    return totalCount;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  calculateConfidence(count, expectedFrequency) {
    // Higher confidence if count is proportionally significant
    const ratio = count / Math.max(expectedFrequency, 1);
    return Math.min(100, Math.round(ratio * 100));
  }

  calculateDateRange(dates) {
    if (dates.length === 0) return null;

    const years = dates.map(d => d.year).filter(y => y);
    if (years.length === 0) return null;

    return {
      earliest: Math.min(...years),
      latest: Math.max(...years)
    };
  }

  /**
   * Reload ontology from file (useful after updates)
   */
  reload() {
    this.ontology = this.loadOntology();
  }

  /**
   * Get the full ontology data
   */
  getOntology() {
    return this.ontology;
  }

  /**
   * Update ontology with new entity
   * @param {string} type - Entity type (persons, concepts, places, objects)
   * @param {Object} entity - New entity data
   */
  addEntity(type, entity) {
    if (this.ontology.entities[type]) {
      this.ontology.entities[type].push(entity);
      this.saveOntology();
    }
  }

  /**
   * Add new theme to ontology
   * @param {Object} theme - New theme data
   */
  addTheme(theme) {
    this.ontology.themes.push(theme);
    this.saveOntology();
  }

  /**
   * Save current ontology state to file
   */
  saveOntology() {
    try {
      this.ontology.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.ontologyPath, JSON.stringify(this.ontology, null, 2));
      return true;
    } catch (err) {
      console.error('Failed to save ontology:', err.message);
      return false;
    }
  }
}

module.exports = OntologyExtractor;
