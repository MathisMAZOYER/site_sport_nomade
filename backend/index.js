const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connexion à PostgreSQL (important: host = nom du service Docker)
const pool = new Pool({
  user: 'gym',
  host: 'db',
  database: 'gymtracker',
  password: 'gympass',
  port: 5432,
});

// Test connexion DB au démarrage
pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch(err => console.error('❌ DB connection error', err));

// Route test
app.get('/', (req, res) => {
  res.send('API is running 🚀');
});

// Création table exercises si elle existe pas
const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercises (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);
  console.log('✅ Table exercises ready');
};

initDb();

// Ajouter un exercice
app.post('/exercises', async (req, res) => {
  try {
    const { name } = req.body;

    const result = await pool.query(
      'INSERT INTO exercises(name) VALUES($1) RETURNING *',
      [name]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// Récupérer tous les exercices
app.get('/exercises', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM exercises');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// Lancer serveur
app.listen(3000, () => {
  console.log('🚀 Server running on port 3000');
});