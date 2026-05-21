document.getElementById('login-toggle').addEventListener('change', (e) => {
    const fields = document.getElementById('login-fields');
    if (e.target.checked) {
        fields.classList.add('show');
    } else {
        fields.classList.remove('show');
    }
});

document.getElementById('test-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const urlInput = document.getElementById('url-input').value;
    const studentName = document.getElementById('student-name').value;
    const projectName = document.getElementById('project-name').value;
    
    const loginRequired = document.getElementById('login-toggle').checked;
    const loginUsername = document.getElementById('login-username').value;
    const loginPassword = document.getElementById('login-password').value;
    const loginPath = document.getElementById('login-path').value;
    const loginSelector = document.getElementById('login-selector').value;

    const runBtn = document.getElementById('run-btn');
    const resultsSection = document.getElementById('results-section');
    
    // UI Loading State
    runBtn.classList.add('button-loading');
    runBtn.disabled = true;
    
    resultsSection.classList.remove('hidden');
    document.getElementById('status-badge').className = 'badge';
    document.getElementById('status-badge').textContent = 'RUNNING...';
    
    document.getElementById('display-student').textContent = studentName;
    document.getElementById('display-project').textContent = projectName;
    document.getElementById('display-url').textContent = urlInput;
    document.getElementById('display-url').href = urlInput;

    // Reset cards
    const cards = ['api', 'load', 'links', 'images', 'mobile', 'accessibility', 'forms', 'security'];
    cards.forEach(id => {
        document.getElementById(`card-${id}`).className = 'metric-card';
        document.getElementById(`card-${id}`).querySelector('.icon-status').textContent = '⌛';
    });
    document.getElementById('card-speed').className = 'metric-card performance-card';
    document.querySelector('.speed-val').textContent = '-- ms';
    document.querySelector('.badge-small').className = 'badge-small';
    document.querySelector('.badge-small').textContent = '--';

    try {
        const response = await fetch('/api/run-test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                url: urlInput, 
                studentName, 
                projectName,
                loginRequired,
                loginUsername,
                loginPassword,
                loginPath,
                loginSelector
            })
        });

        const data = await response.json();

        const statusBadge = document.getElementById('status-badge');
        if (data.status === 'passed') {
            statusBadge.className = 'badge bg-passed';
            statusBadge.textContent = 'ALL PASSED';
        } else {
            statusBadge.className = 'badge bg-failed';
            statusBadge.textContent = 'ISSUES FOUND';
        }

        updateCard('api', data.results.api);
        updateCard('load', data.results.load); // The Auth / Load test
        updateCard('links', data.results.links);
        updateCard('images', data.results.images);
        updateCard('mobile', data.results.mobile);
        updateCard('accessibility', data.results.accessibility);
        updateCard('forms', data.results.forms);
        updateCard('security', data.results.security);

        const speedCard = document.getElementById('card-speed');
        const speedVal = document.querySelector('.speed-val');
        const speedBadge = document.querySelector('.badge-small');
        
        const isSpeedPass = data.results.speed === 'passed';
        speedCard.classList.add(isSpeedPass ? 'card-passed' : 'card-failed');
        
        if (data.results.duration) {
            speedVal.textContent = `${data.results.duration} ms`;
        } else {
            speedVal.textContent = isSpeedPass ? '< 5s' : '> 5s';
        }
        
        speedBadge.className = `badge-small ${isSpeedPass ? 'bg-passed' : 'bg-failed'}`;
        speedBadge.textContent = isSpeedPass ? 'FAST' : 'SLOW';

        const detailsContainer = document.getElementById('details-container');
        const detailsList = document.getElementById('details-list');
        detailsList.innerHTML = '';
        
        let hasDetails = false;
        
        if (data.details && data.details.links && data.details.links.length > 0) {
            hasDetails = true;
            data.details.links.forEach(link => {
                const li = document.createElement('li');
                li.textContent = `🔗 Broken Link: ${link}`;
                detailsList.appendChild(li);
            });
        }
        
        if (data.details && data.details.accessibility && data.details.accessibility.length > 0) {
            hasDetails = true;
            data.details.accessibility.forEach(violation => {
                const li = document.createElement('li');
                li.style.marginBottom = '1rem';
                li.innerHTML = `⚠️ <strong>Accessibility (${violation.impact}):</strong> ${violation.help} — <em>${violation.description}</em> (Affects ${violation.nodeCount} element${violation.nodeCount > 1 ? 's' : ''}). <a href="${violation.helpUrl}" target="_blank" style="color: var(--accent); text-decoration: underline;">Remediation Guide</a>`;
                detailsList.appendChild(li);
            });
        }
        
        if (data.details && data.details.forms && data.details.forms.length > 0) {
            hasDetails = true;
            data.details.forms.forEach(issue => {
                const li = document.createElement('li');
                let imgHtml = '';
                let textStr = issue;
                const match = issue.match(/\[SCREENSHOT:(.*?)\]\s*/);
                if (match) {
                    imgHtml = `<div style="margin-top:0.75rem; margin-bottom:1rem;"><img src="${match[1]}" style="max-width:300px; border-radius:8px; border:1px solid #444; box-shadow:0 4px 10px rgba(0,0,0,0.3);"></div>`;
                    textStr = issue.replace(match[0], '');
                }
                const sanitized = textStr.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                li.innerHTML = `📝 <strong>UX Issue:</strong> <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #ffeb3b;">${sanitized}</code>${imgHtml}`;
                detailsList.appendChild(li);
            });
        }
        
        if (data.details && data.details.mobile && data.details.mobile.length > 0) {
            hasDetails = true;
            data.details.mobile.forEach(issue => {
                const li = document.createElement('li');
                let imgHtml = '';
                let textStr = issue;
                const match = issue.match(/\[SCREENSHOT:(.*?)\]\s*/);
                if (match) {
                    imgHtml = `<div style="margin-top:0.75rem; margin-bottom:1rem;"><img src="${match[1]}" style="max-width:300px; border-radius:8px; border:1px solid #444; box-shadow:0 4px 10px rgba(0,0,0,0.3);"></div>`;
                    textStr = issue.replace(match[0], '');
                }
                const sanitized = textStr.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                li.innerHTML = `📱 <strong>Mobile Overflow:</strong> <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #ff4081;">${sanitized}</code>${imgHtml}`;
                detailsList.appendChild(li);
            });
        }
        
        if (data.details && data.details.security && data.details.security.length > 0) {
            hasDetails = true;
            data.details.security.forEach(issue => {
                const li = document.createElement('li');
                li.textContent = `🛡️ Security Alert: ${issue}`;
                detailsList.appendChild(li);
            });
        }

        if (hasDetails) {
            detailsContainer.classList.remove('hidden');
        } else {
            detailsContainer.classList.add('hidden');
        }
        
        // --- Render AI Feedback ---
        const aiContainer = document.getElementById('ai-feedback-container');
        if (data.ai && !data.ai.error) {
            aiContainer.classList.remove('hidden');
            document.getElementById('ai-type').textContent = data.ai.websiteType || 'Unknown';
            document.getElementById('ai-feedback').textContent = data.ai.overallFeedback || 'No feedback provided.';
            
            const fixesList = document.getElementById('ai-fixes');
            fixesList.innerHTML = '';
            (data.ai.criticalFixes || []).forEach(fix => {
                fixesList.innerHTML += `<li>${fix}</li>`;
            });
            
            const featuresList = document.getElementById('ai-features');
            featuresList.innerHTML = '';
            (data.ai.missingFeatures || []).forEach(feat => {
                featuresList.innerHTML += `<li>${feat}</li>`;
            });
        } else {
            aiContainer.classList.add('hidden');
            if (data.ai && data.ai.error) {
                console.warn("AI Generation skipped or failed:", data.ai.error);
            }
        }

    } catch (error) {
        document.getElementById('status-badge').className = 'badge bg-failed';
        document.getElementById('status-badge').textContent = 'ERROR';
        alert('Server error: ' + error.message);
    } finally {
        runBtn.classList.remove('button-loading');
        runBtn.disabled = false;
    }
});

function updateCard(id, status) {
    const card = document.getElementById(`card-${id}`);
    const icon = card.querySelector('.icon-status');
    if (status === 'passed') {
        card.classList.add('card-passed');
        icon.textContent = '✅';
    } else if (status === 'failed') {
        card.classList.add('card-failed');
        icon.textContent = '❌';
    } else {
        icon.textContent = '❓';
    }
}

document.getElementById('download-pdf-btn').addEventListener('click', () => {
    const element = document.getElementById('pdf-content');
    const opt = {
        margin:       1,
        filename:     `${document.getElementById('student-name').value.replace(/\s+/g, '_')}_QA_Report.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
});

// Tab Switching Logic
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(tabId).style.display = 'block';

        if (tabId === 'dashboard-tab') {
            loadDashboard();
        }
    });
});

let historyChart = null;

async function loadDashboard() {
    try {
        const res = await fetch('/api/dashboard');
        const data = await res.json();
        
        const tbody = document.getElementById('overview-body');
        const select = document.getElementById('student-select');
        
        tbody.innerHTML = '';
        select.innerHTML = '<option value="">Select a student to view history...</option>';
        
        data.forEach(row => {
            // Append 'Z' to the SQLite datetime string to ensure it is parsed as UTC,
            // so toLocaleString() correctly converts it to the user's local time zone.
            const dateStr = new Date(row.created_at + 'Z').toLocaleString();
            let gradeClass = 'grade-f';
            if (row.score >= 90) gradeClass = 'grade-a';
            else if (row.score >= 80) gradeClass = 'grade-b';
            else if (row.score >= 70) gradeClass = 'grade-c';
            
            const statusClass = row.status === 'passed' ? 'status-passed' : 'status-failed';

            tbody.innerHTML += `
                <tr>
                    <td>${row.student_name}</td>
                    <td>${row.project_name} <a href="${row.url}" target="_blank" style="text-decoration:none;">🔗</a></td>
                    <td><span class="grade-badge ${gradeClass}">${row.score}</span></td>
                    <td class="${statusClass}">${row.status.toUpperCase()}</td>
                    <td>${dateStr}</td>
                </tr>
            `;
            
            select.innerHTML += `<option value="${row.student_name}">${row.student_name}</option>`;
        });
        
        // Remove duplicates from select options
        const options = Array.from(select.options);
        const seen = new Set();
        select.innerHTML = '';
        options.forEach(opt => {
            if (!seen.has(opt.value)) {
                seen.add(opt.value);
                select.appendChild(opt);
            }
        });
        
    } catch(e) {
        console.error('Failed to load dashboard', e);
    }
}

document.getElementById('student-select').addEventListener('change', async (e) => {
    const student = e.target.value;
    if (!student) {
        if (historyChart) historyChart.destroy();
        return;
    }
    
    try {
        const res = await fetch(`/api/student/${student}/history`);
        const data = await res.json();
        
        const labels = data.map(d => new Date(d.created_at + 'Z').toLocaleDateString());
        const scores = data.map(d => d.score);
        
        const ctx = document.getElementById('historyChart').getContext('2d');
        if (historyChart) historyChart.destroy();
        
        historyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Overall Grade (0-100)',
                    data: scores,
                    borderColor: '#00f2fe',
                    backgroundColor: 'rgba(0, 242, 254, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#fff',
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#fff' } }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#aaa' }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#aaa' }
                    }
                }
            }
        });
    } catch(e) {
        console.error('Failed to load history graph', e);
    }
});
