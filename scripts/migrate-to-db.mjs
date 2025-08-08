import Database from 'better-sqlite3';
import { readFile } from 'fs/promises';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'local.db');
const db = new Database(DB_PATH);

// Utility to read JSON files
async function readJsonFile(filePath) {
  try {
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`Warning: File not found, skipping: ${filePath}`);
      return [];
    }
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

// Function to handle potential JSON string fields
function prepareValue(value) {
    if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
    }
    if (typeof value === 'boolean') {
        return value ? 1 : 0;
    }
    return value;
}

async function migrate() {
  console.log('Starting database migration...');

  // Temporarily disable foreign key constraints to allow dropping/creating tables in any order
  db.exec('PRAGMA foreign_keys = OFF;');

  // Drop existing tables to ensure a clean slate
  db.exec(`
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS audios;
    DROP TABLE IF EXISTS questions;
    DROP TABLE IF EXISTS answers;
    DROP TABLE IF EXISTS chapters;
    DROP TABLE IF EXISTS comments;
    DROP TABLE IF EXISTS markers;
    DROP TABLE IF EXISTS notifications;
    DROP TABLE IF EXISTS ratings;
    DROP TABLE IF EXISTS related_resources;
    DROP TABLE IF EXISTS slides;
    DROP TABLE IF EXISTS subscriptions;
    DROP TABLE IF EXISTS transcriptions;
  `);
  console.log('Dropped existing tables.');

  // Create tables
  console.log('Creating new tables...');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT,
      lastLogin TEXT,
      preferences TEXT
    );

    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      icon TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE audios (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      filename TEXT NOT NULL,
      url TEXT NOT NULL,
      coverImage TEXT,
      uploadDate TEXT,
      subject TEXT,
      tags TEXT,
      size INTEGER,
      duration REAL,
      speaker TEXT,
      recordingDate TEXT
    );

    CREATE TABLE questions (
      id TEXT PRIMARY KEY,
      audioId TEXT,
      userId TEXT,
      username TEXT,
      title TEXT,
      content TEXT,
      createdAt TEXT,
      FOREIGN KEY (audioId) REFERENCES audios(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE answers (
        id TEXT PRIMARY KEY,
        questionId TEXT,
        userId TEXT,
        username TEXT,
        content TEXT,
        createdAt TEXT,
        isAccepted INTEGER,
        FOREIGN KEY (questionId) REFERENCES questions(id),
        FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE chapters (
        id TEXT PRIMARY KEY,
        audioId TEXT,
        title TEXT,
        description TEXT,
        startTime REAL,
        endTime REAL,
        "order" INTEGER,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (audioId) REFERENCES audios(id)
    );

    CREATE TABLE comments (
        id TEXT PRIMARY KEY,
        audioId TEXT,
        userId TEXT,
        content TEXT,
        parentId TEXT,
        createdAt TEXT,
        FOREIGN KEY (audioId) REFERENCES audios(id),
        FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE markers (
        id TEXT PRIMARY KEY,
        audioId TEXT,
        title TEXT,
        description TEXT,
        time REAL,
        type TEXT,
        createdBy TEXT,
        createdAt TEXT,
        FOREIGN KEY (audioId) REFERENCES audios(id),
        FOREIGN KEY (createdBy) REFERENCES users(id)
    );

    CREATE TABLE notifications (
        id TEXT PRIMARY KEY,
        userId TEXT,
        type TEXT,
        title TEXT,
        message TEXT,
        relatedId TEXT,
        relatedType TEXT,
        isRead INTEGER,
        createdAt TEXT
    );

    CREATE TABLE ratings (
        id TEXT PRIMARY KEY,
        audioId TEXT,
        userId TEXT,
        rating INTEGER,
        createdAt TEXT,
        FOREIGN KEY (audioId) REFERENCES audios(id),
        FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE related_resources (
        id TEXT PRIMARY KEY,
        audioId TEXT,
        title TEXT,
        url TEXT,
        type TEXT,
        description TEXT,
        FOREIGN KEY (audioId) REFERENCES audios(id)
    );

    CREATE TABLE slides (
        id TEXT PRIMARY KEY,
        audioId TEXT,
        imageUrl TEXT,
        timestamp REAL,
        title TEXT,
        description TEXT,
        FOREIGN KEY (audioId) REFERENCES audios(id)
    );

    CREATE TABLE subscriptions (
        id TEXT PRIMARY KEY,
        userId TEXT,
        type TEXT,
        value TEXT,
        notificationMethod TEXT,
        createdAt TEXT,
        isActive INTEGER,
        FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE transcriptions (
        id TEXT PRIMARY KEY,
        audioId TEXT,
        language TEXT,
        fullText TEXT,
        segments TEXT,
        status TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        processingTime INTEGER,
        FOREIGN KEY (audioId) REFERENCES audios(id)
    );
  `);

  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');
  console.log('Tables created successfully and foreign key constraints re-enabled.');

  // Insert data
  const tablesToMigrate = [
    { name: 'users', path: 'data/users.json' },
    { name: 'categories', path: 'data/categories.json' },
    { name: 'audios', path: 'public/uploads/audio-list.json' },
    { name: 'questions', path: 'data/questions.json' },
    { name: 'answers', path: 'data/answers.json' },
    { name: 'chapters', path: 'data/chapters.json' },
    { name: 'comments', path: 'data/comments.json' },
    { name: 'markers', path: 'data/markers.json' },
    { name: 'notifications', path: 'data/notifications.json' },
    { name: 'ratings', path: 'data/ratings.json' },
    { name: 'related_resources', path: 'data/related-resources.json' },
    { name: 'slides', path: 'data/slides.json' },
    { name: 'subscriptions', path: 'data/subscriptions.json' },
    { name: 'transcriptions', path: 'data/transcriptions.json' },
  ];

  for (const table of tablesToMigrate) {
    const data = await readJsonFile(join(process.cwd(), table.path));
    if (data.length === 0) {
      console.log(`No data to insert for ${table.name}.`);
      continue;
    }

    // Handle special cases where JSON contains denormalized data
    let itemsToInsert = data;
    if (table.name === 'questions') {
        itemsToInsert = data.map(q => {
            const { answers, ...rest } = q;
            return rest;
        });
    }
    if (table.name === 'notifications') {
        const uniqueIds = new Set();
        itemsToInsert = data.filter(item => {
            if (uniqueIds.has(item.id)) {
                console.warn(`Found duplicate notification ID, skipping: ${item.id}`);
                return false;
            }
            uniqueIds.add(item.id);
            return true;
        });
    }

    if (itemsToInsert.length === 0) {
      console.log(`No valid data to insert for ${table.name} after filtering.`);
      continue;
    }

    const columns = Object.keys(itemsToInsert[0]);
    // SQLite uses "order" as a keyword, so we need to quote it.
    const columnNames = columns.map(c => c === 'order' ? '"order"' : c).join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const insert = db.prepare(`INSERT INTO ${table.name} (${columnNames}) VALUES (${placeholders})`);

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        const values = columns.map(col => prepareValue(item[col]));
        insert.run(values);
      }
    });

    try {
        insertMany(itemsToInsert);
        console.log(`Successfully inserted ${itemsToInsert.length} records into ${table.name}.`);
    } catch (err) {
        console.error(`Failed to insert data into ${table.name}:`, err.message);
        // Log the first problematic item for debugging
        if (data.length > 0) {
            console.error('Problematic item:', data[0]);
        }
    }
  }

  console.log('Database migration completed successfully!');
  db.close();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  db.close();
  process.exit(1);
});
