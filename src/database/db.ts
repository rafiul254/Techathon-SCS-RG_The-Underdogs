import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';

const DB_PATH = './robofusion.db';
let db: Database;

export async function initDB() {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    db.run(`
    CREATE TABLE IF NOT EXISTS Zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'SAFE'
    );

    CREATE TABLE IF NOT EXISTS Readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER NOT NULL,
      fire_raw REAL, gas_raw REAL,
      water_raw REAL, occupancy_raw INTEGER,
      risk_score REAL, seq_no INTEGER,
      received_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (zone_id) REFERENCES Zones(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS Incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER NOT NULL,
      risk_score REAL, state TEXT,
      started_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY (zone_id) REFERENCES Zones(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS Acknowledgments (
      id INTEGER UNIQUE,
      incident_id INTEGER UNIQUE,
      user_id INTEGER,
      ack_time TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (incident_id) REFERENCES Incidents(id)
    );

    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT CHECK(role IN ('staff','admin'))
    );

    CREATE INDEX IF NOT EXISTS idx_incidents_state_time 
    ON Incidents(state, started_at);
  `);

    saveDB();
    console.log('[DB] SQLite initialized ✅');
    return db;
}

export function saveDB() {
    if (db) {
        const data = db.export();
        fs.writeFileSync(DB_PATH, Buffer.from(data));
    }
}

export function getDB(): Database {
    return db;
}
