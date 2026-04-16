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

// Wait for DB available

const waitForDb = async () => {
  let connected = false;

  while (!connected) {
    try {
      await pool.query('SELECT 1');
      connected = true;
      console.log('✅ DB ready');
    } catch (err) {
      console.log('⏳ Waiting for DB...');
      await new Promise(res => setTimeout(res, 2000));
    }
  }
};

const seedUsers = async () => {
  const result = await pool.query('SELECT COUNT(*) FROM users');

  const count = parseInt(result.rows[0].count, 10);

  if (count === 0) {
    console.log('🌱 Seeding users...');

    await pool.query(`
      INSERT INTO users (name)
      VALUES ('Raf'), ('Mathis')
    `);

    console.log('✅ Default users created');
  } else {
    console.log('👤 Users already exist, skipping seed');
  }
};

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
  await waitForDb();

  // USERS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);
  console.log('✅ Table Users ready');

  // EXERCISES
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercises (
      id SERIAL PRIMARY KEY,
      creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      shared BOOLEAN DEFAULT false
    );
  `);
  console.log('✅ Table Exercises ready');


  // SESSIONS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);
  console.log('✅ Table sessions ready');
  

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
      session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
      reps INTEGER NOT NULL,
      weight INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    console.log('✅ Table sets ready');

  console.log('✅ All tables ready');
};

const start = async () => {
  await initDb();
  await seedUsers();   // 👈 AJOUT ICI
};

start();
// ------- EXERCICES -------

// CREATE
app.post('/exercises', async (req, res) => {
  try {
    const { creator_id, shared } = req.body;


    const result = await pool.query(
      'INSERT INTO exercises(creator_id, shared) VALUES($1, $2, $3) RETURNING *',
      [creator_id, shared] 
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// READ ONE
app.get('/exercises/:id', async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    'SELECT * FROM exercises WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Exercise not found' });
  }

  res.json(result.rows[0]);
});

// READ ALL
app.get('/exercises', async (req, res) => {
  const result = await pool.query('SELECT * FROM exercises');
  res.json(result.rows);
});

//UPDATE
app.put('/exercises/:id', async (req, res) => {
  const { id } = req.params;
  const { creator_id, shared } = req.body;

  const result = await pool.query(
    `UPDATE exercises
     SET creator_id = $1, shared = $2
     WHERE id = $4
     RETURNING *`,
    [creator_id, shared, id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Exercise not found' });
  }

  res.json(result.rows[0]);
});

// DELETE
app.delete('/exercises/:id', async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    'DELETE FROM exercises WHERE id = $1 RETURNING *',
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Exercise not found' });
  }

  res.json({ message: 'Deleted' });
});

// ------ USERS ------

// CREATE
app.post('/users', async (req, res) => {
  try {
    const { name } = req.body;

    const result = await pool.query(
      'INSERT INTO users(name) VALUES($1) RETURNING *',
      [name]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// READ ALL
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// READ ONE
app.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// UPDATE
app.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const result = await pool.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// DELETE
app.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});


// ------ SESSIONS ------
// CREATE 
app.post('/sessions', async (req, res) => {
  try {
    const { name } = req.body;

    const result = await pool.query(
      'INSERT INTO sessions(name) VALUES($1) RETURNING *',
      [name]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// GET ALL
app.get('/sessions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sessions');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// GET ONE
app.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM sessions WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// UPDATE
app.put('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const result = await pool.query(
      'UPDATE sessions SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

//DELETE
app.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM sessions WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});


// ------ SETS ------

// CREATE
app.post('/sets', async (req, res) => {
  try {
    const { user_id, session_id, exercise_id, reps, weight } = req.body;

    const result = await pool.query(
      `INSERT INTO sets(user_id, session_id, exercise_id, reps, weight)
       VALUES($1,$2,$3,$4,$5)
       RETURNING *`,
      [user_id, session_id, exercise_id, reps, weight]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// READ ALL
app.get('/sets', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sets');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// READ ONE
app.get('/sets/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM sets WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Set not found' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// UPDATE
app.put('/sets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reps, weight } = req.body;

    const result = await pool.query(
      `UPDATE sets
       SET reps = $1, weight = $2
       WHERE id = $3
       RETURNING *`,
      [reps, weight, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Set not found' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// DELETE
app.delete('/sets/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM sets WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Set not found' });
    }

    res.json({ message: 'Set deleted' });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});


// Lancer serveur
app.listen(3000, () => {
  console.log('🚀 Server running on port 3000');
});