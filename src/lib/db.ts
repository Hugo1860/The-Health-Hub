import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'local.db');

let db: Database.Database;

try {
  db = new Database(DB_PATH, {
    // Set verbose to console.log for debugging purposes if needed
    // verbose: console.log,
    fileMustExist: true // Throw error if database file does not exist
  });
  console.log('Successfully connected to the SQLite database.');
} catch (err) {
  console.error('Failed to connect to the SQLite database. Please ensure the migration script has been run.');
  console.error(err);
  // In a real app, you might want to exit the process or handle this more gracefully.
  // For this context, we'll let it fail where it's used.
  // process.exit(1);
}


// Gracefully close the database connection on exit
process.on('exit', () => {
  if (db && db.open) {
    db.close();
    console.log('Database connection closed.');
  }
});

process.on('SIGINT', () => {
    if (db && db.open) {
        db.close();
        console.log('Database connection closed due to app termination.');
    }
    process.exit(0);
});

export default db;
