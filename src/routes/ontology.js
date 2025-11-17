const express = require('express');
const router = express.Router();
const OntologyExtractor = require('../services/ontology-extractor');

// Initialize extractor
const extractor = new OntologyExtractor();

/**
 * GET /api/ontology
 * Get full ontology data structure
 */
router.get('/', (req, res) => {
  try {
    const ontology = extractor.getOntology();
    res.json(ontology);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ontology/analyze
 * Analyze text and extract entities/themes
 * Body: { text: string }
 */
router.post('/analyze', (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const analysis = extractor.analyze(text);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ontology/extract-entities
 * Extract only entities from text
 * Body: { text: string }
 */
router.post('/extract-entities', (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const entities = extractor.extractEntities(text);
    res.json(entities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ontology/detect-themes
 * Detect themes from text
 * Body: { text: string }
 */
router.post('/detect-themes', (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const themes = extractor.detectThemes(text);
    res.json(themes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ontology/suggest-relations
 * Get suggested relations based on entities
 * Body: { entities: Object }
 */
router.post('/suggest-relations', (req, res) => {
  try {
    const { entities } = req.body;
    if (!entities) {
      return res.status(400).json({ error: 'Entities object is required' });
    }

    const relations = extractor.suggestRelations(entities);
    res.json(relations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ontology/entities/:type
 * Get all entities of a specific type
 * Params: type = persons | concepts | places | objects
 */
router.get('/entities/:type', (req, res) => {
  try {
    const { type } = req.params;
    const ontology = extractor.getOntology();

    if (!ontology.entities[type]) {
      return res.status(404).json({ error: `Entity type '${type}' not found` });
    }

    res.json(ontology.entities[type]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ontology/themes
 * Get all themes
 */
router.get('/themes', (req, res) => {
  try {
    const ontology = extractor.getOntology();
    res.json(ontology.themes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ontology/relations
 * Get all relations
 */
router.get('/relations', (req, res) => {
  try {
    const ontology = extractor.getOntology();
    res.json(ontology.relations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ontology/hierarchy
 * Get hierarchical organization
 */
router.get('/hierarchy', (req, res) => {
  try {
    const ontology = extractor.getOntology();
    res.json(ontology.hierarchy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ontology/entities/:type
 * Add new entity to ontology
 * Params: type = persons | concepts | places | objects
 * Body: entity data
 */
router.post('/entities/:type', (req, res) => {
  try {
    const { type } = req.params;
    const entity = req.body;

    if (!entity.id || !entity.name) {
      return res.status(400).json({ error: 'Entity must have id and name' });
    }

    extractor.addEntity(type, entity);
    res.json({ success: true, entity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ontology/themes
 * Add new theme to ontology
 * Body: theme data
 */
router.post('/themes', (req, res) => {
  try {
    const theme = req.body;

    if (!theme.id || !theme.name || !theme.keywords) {
      return res.status(400).json({ error: 'Theme must have id, name, and keywords' });
    }

    extractor.addTheme(theme);
    res.json({ success: true, theme });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ontology/reload
 * Reload ontology from file
 */
router.post('/reload', (req, res) => {
  try {
    extractor.reload();
    res.json({ success: true, message: 'Ontology reloaded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ontology/graph
 * Get graph data for visualization (nodes and edges)
 */
router.get('/graph', (req, res) => {
  try {
    const ontology = extractor.getOntology();
    const nodes = [];
    const edges = [];

    // Add entity nodes
    const addNodes = (entities, category) => {
      for (const entity of entities) {
        nodes.push({
          id: entity.id,
          label: entity.name,
          category: category,
          type: entity.type || entity.category || category,
          frequency: entity.frequency || 1
        });
      }
    };

    addNodes(ontology.entities.persons, 'person');
    addNodes(ontology.entities.concepts, 'concept');
    addNodes(ontology.entities.places, 'place');
    addNodes(ontology.entities.objects, 'object');

    // Add theme nodes
    for (const theme of ontology.themes) {
      nodes.push({
        id: theme.id,
        label: theme.name,
        category: 'theme',
        type: 'theme',
        color: theme.color
      });
    }

    // Add relation edges
    for (const relation of ontology.relations) {
      edges.push({
        id: relation.id,
        source: relation.source,
        target: relation.target,
        type: relation.type,
        label: relation.description
      });
    }

    res.json({ nodes, edges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ontology/statistics
 * Get ontology statistics
 */
router.get('/statistics', (req, res) => {
  try {
    const ontology = extractor.getOntology();

    res.json({
      version: ontology.version,
      lastUpdated: ontology.lastUpdated,
      counts: {
        persons: ontology.entities.persons.length,
        concepts: ontology.entities.concepts.length,
        places: ontology.entities.places.length,
        objects: ontology.entities.objects.length,
        themes: ontology.themes.length,
        relations: ontology.relations.length,
        hierarchyCategories: Object.keys(ontology.hierarchy).length
      },
      totalEntities:
        ontology.entities.persons.length +
        ontology.entities.concepts.length +
        ontology.entities.places.length +
        ontology.entities.objects.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
