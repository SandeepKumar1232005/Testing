const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'qa_platform.db'), { verbose: console.log });

// Initialize database schema
const initDB = () => {
    // Create Students Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    // Create Projects Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
            UNIQUE(student_id, name)
        )
    `).run();

    // Create Test Runs Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS test_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            status TEXT NOT NULL,
            score INTEGER DEFAULT 0,
            api_status TEXT,
            load_status TEXT,
            links_status TEXT,
            images_status TEXT,
            mobile_status TEXT,
            accessibility_status TEXT,
            speed_status TEXT,
            duration INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
    `).run();
};

initDB();

module.exports = db;
