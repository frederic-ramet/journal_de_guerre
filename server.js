const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const dbPath = path.join(__dirname, 'data', 'journal.db');
let db;

try {
  db = new Database(dbPath, { readonly: false });
  db.pragma('journal_mode = WAL');
  console.log('Database connected:', dbPath);
} catch (err) {
  console.error('Database connection failed:', err.message);
  console.log('Run "npm run init-db && npm run migrate" first');
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use('/jpg_web', express.static(path.join(__dirname, 'jpg_web')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Make db available to routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routes
const indexRoutes = require('./src/routes/index');
const journalRoutes = require('./src/routes/journal');
const archivesRoutes = require('./src/routes/archives');
const etudeRoutes = require('./src/routes/etude');
const apiRoutes = require('./src/routes/api');
const ontologyRoutes = require('./src/routes/ontology');

app.use('/', indexRoutes);
app.use('/journal', journalRoutes);
app.use('/archives', archivesRoutes);
app.use('/etude', etudeRoutes);
app.use('/api', apiRoutes);
app.use('/api/ontology', ontologyRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Erreur',
    message: 'Une erreur est survenue',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page non trouvée' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║     Journal de Guerre - Server         ║
  ║     Ramet Ernest (1918)                ║
  ╠════════════════════════════════════════╣
  ║  Local:   http://localhost:${PORT}        ║
  ║  Status:  Running                      ║
  ╚════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  if (db) db.close();
  console.log('\nDatabase connection closed');
  process.exit(0);
});

module.exports = app;
