
const sqlite3 = require("sqlite3").verbose();
const filepath = "./test.db";

function createDbConnection() {
  const db = new sqlite3.Database(filepath, (error) => {
    if (error) {
      return console.error(error.message);
    }
    db.exec('PRAGMA foreign_keys = ON;', pragmaErr => {
        if (pragmaErr) return Logger.error('Foreign key enforcement pragma query failed.');
      });
    createUserTable(db);
    createExercisesTable(db);
  });
  console.log("Connection with SQLite has been established");
  return db;
}

function createUserTable(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username text UNIQUE,
        logs text,
        count INTEGER,
        CONSTRAINT username_unique UNIQUE (username)
    )`
    ); 
}

function createExercisesTable(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS exercises (
        exerciseId INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        description text,
        duration INTEGER,
        date text,
        FOREIGN KEY (userId) REFERENCES user(id)
    )`,
    ); 
}

module.exports = createDbConnection();