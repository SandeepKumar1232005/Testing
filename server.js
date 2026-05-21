const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const db = require('./database');
const { analyzeQA } = require('./ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); 

app.post('/api/run-test', (req, res) => {
    const { 
        url, studentName, projectName, 
        loginRequired, loginUsername, loginPassword, loginPath, loginSelector 
    } = req.body;

    if (!url || !url.startsWith('http')) {
        return res.status(400).json({ error: 'Valid URL is required (must include http/https)' });
    }

    console.log(`Starting test for URL: ${url} by ${studentName} (Login: ${loginRequired})`);

    const resultsFile = path.join(__dirname, 'results.json');
    
    const env = { 
        ...process.env, 
        TARGET_URL: url,
        PLAYWRIGHT_JSON_OUTPUT_NAME: 'results.json',
        TEST_LOGIN_REQUIRED: loginRequired ? 'true' : 'false',
        TEST_USERNAME: loginUsername || '',
        TEST_PASSWORD: loginPassword || '',
        TEST_LOGIN_PATH: loginPath || '',
        TEST_LOGIN_SELECTOR: loginSelector || ''
    };
    
    exec('npx playwright test --reporter=json', { env, cwd: __dirname }, async (error, stdout, stderr) => {
        
        let testResults = {};
        let details = {};
        
        try {
            if (fs.existsSync(resultsFile)) {
                const rawJson = fs.readFileSync(resultsFile, 'utf-8');
                const parsed = JSON.parse(rawJson);
                
                testResults = {
                    api: getStatus(parsed, 'generic api ping test'),
                    load: getStatus(parsed, 'generic page load & auth test'),
                    links: getStatus(parsed, 'Broken Links Check'),
                    images: getStatus(parsed, 'Images Load Check'),
                    mobile: getStatus(parsed, 'Mobile Responsiveness Check'),
                    accessibility: getStatus(parsed, 'Accessibility Audit'),
                    speed: getStatus(parsed, 'Page Load Speed Check'),
                    forms: getStatus(parsed, 'Forms & Interactive Elements Audit'),
                    security: getStatus(parsed, 'Basic Security Audit'),
                    duration: getDuration(parsed, 'Page Load Speed Check')
                };
                
                details = {
                    links: getErrorDetails(parsed, 'Broken Links Check', '__BROKEN_LINKS__'),
                    accessibility: getErrorDetails(parsed, 'Accessibility Audit', '__ACCESSIBILITY_VIOLATIONS__'),
                    forms: getErrorDetails(parsed, 'Forms & Interactive Elements Audit', '__INTERACTION_ISSUES__'),
                    security: getErrorDetails(parsed, 'Basic Security Audit', '__SECURITY_ISSUES__'),
                    mobile: getErrorDetails(parsed, 'Mobile Responsiveness Check', '__MOBILE_ISSUES__')
                };
            } else {
                return res.status(500).json({ error: 'Failed to generate test report' });
            }
        } catch (e) {
            console.error("Error parsing results:", e);
            return res.status(500).json({ error: 'Failed to parse test report' });
        }
        
        // 1. Grading Engine
        let grade = calculateGrade(testResults);

        // 2. Save to Database
        let studentId, projectId;
        try {
            db.prepare(`INSERT OR IGNORE INTO students (name) VALUES (?)`).run(studentName);
            studentId = db.prepare(`SELECT id FROM students WHERE name = ?`).get(studentName).id;

            db.prepare(`INSERT OR IGNORE INTO projects (student_id, name, url) VALUES (?, ?, ?)`).run(studentId, projectName, url);
            projectId = db.prepare(`SELECT id FROM projects WHERE student_id = ? AND name = ?`).get(studentId, projectName).id;

            db.prepare(`
                INSERT INTO test_runs (project_id, status, score, api_status, load_status, links_status, images_status, mobile_status, accessibility_status, speed_status, duration)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                projectId, 
                error ? 'failed' : 'passed', 
                grade,
                testResults.api || 'unknown',
                testResults.load || 'unknown',
                testResults.links || 'unknown',
                testResults.images || 'unknown',
                testResults.mobile || 'unknown',
                testResults.accessibility || 'unknown',
                testResults.speed || 'unknown',
                testResults.duration || 0
            );
        } catch (dbErr) {
            console.error("Database Save Error:", dbErr);
        }

        // 3. AI Analysis
        console.log("Fetching AI Feedback...");
        const aiAnalysis = await analyzeQA(testResults, url);
        
        res.json({
            status: error ? 'failed' : 'passed',
            results: testResults,
            details: details,
            studentName,
            projectName,
            url,
            grade,
            ai: aiAnalysis
        });
    });
});

// Dashboard API: Get latest runs for all students
app.get('/api/dashboard', (req, res) => {
    try {
        const data = db.prepare(`
            SELECT 
                s.name as student_name, 
                p.name as project_name, 
                p.url, 
                t.score, 
                t.status,
                t.created_at
            FROM test_runs t
            JOIN projects p ON t.project_id = p.id
            JOIN students s ON p.student_id = s.id
            WHERE t.id IN (
                SELECT MAX(id) FROM test_runs GROUP BY project_id
            )
            ORDER BY t.created_at DESC
        `).all();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Dashboard API: Get historical scores for a specific student
app.get('/api/student/:name/history', (req, res) => {
    try {
        const data = db.prepare(`
            SELECT t.score, t.created_at, p.name as project_name
            FROM test_runs t
            JOIN projects p ON t.project_id = p.id
            JOIN students s ON p.student_id = s.id
            WHERE s.name = ?
            ORDER BY t.created_at ASC
        `).all(req.params.name);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

function calculateGrade(results) {
    let score = 100;
    const deductions = { api: 15, load: 25, links: 15, images: 10, mobile: 15, accessibility: 10, speed: 10 };
    
    for (const [key, status] of Object.entries(results)) {
        if (status === 'failed' || status === 'unknown') {
            score -= (deductions[key] || 0);
        }
    }
    return Math.max(0, score);
}

function getErrorDetails(parsedData, testTitle, signature) {
    for (const suite of parsedData.suites || []) {
        for (const spec of suite.specs || []) {
            if (spec.title === testTitle && spec.tests[0] && spec.tests[0].results[0] && spec.tests[0].results[0].error) {
                const errMsg = spec.tests[0].results[0].error.message || '';
                if (errMsg.includes(signature)) {
                    try {
                        const jsonStr = errMsg.split(`${signature}:`)[1].split('\n')[0];
                        return JSON.parse(jsonStr);
                    } catch(e) {}
                }
            }
        }
        if (suite.suites) {
            for (const subSuite of suite.suites) {
                for (const spec of subSuite.specs || []) {
                    if (spec.title === testTitle && spec.tests[0] && spec.tests[0].results[0] && spec.tests[0].results[0].error) {
                        const errMsg = spec.tests[0].results[0].error.message || '';
                        if (errMsg.includes(signature)) {
                            try {
                                const jsonStr = errMsg.split(`${signature}:`)[1].split('\n')[0];
                                return JSON.parse(jsonStr);
                            } catch(e) {}
                        }
                    }
                }
            }
        }
    }
    return null;
}

function getStatus(parsedData, testTitle) {
    for (const suite of parsedData.suites) {
        for (const spec of suite.specs || []) {
            if (spec.title === testTitle) {
                return spec.ok ? 'passed' : 'failed';
            }
        }
        if (suite.suites) {
            for (const subSuite of suite.suites) {
                for (const spec of subSuite.specs || []) {
                    if (spec.title === testTitle) {
                        return spec.ok ? 'passed' : 'failed';
                    }
                }
            }
        }
    }
    return 'unknown';
}

function getDuration(parsedData, testTitle) {
     for (const suite of parsedData.suites) {
        for (const spec of suite.specs || []) {
            if (spec.title === testTitle && spec.tests[0] && spec.tests[0].results[0]) {
                return spec.tests[0].results[0].duration;
            }
        }
     }
     return 0;
}

app.listen(PORT, () => {
    console.log(`Test Runner Server is live at http://localhost:${PORT}`);
});
