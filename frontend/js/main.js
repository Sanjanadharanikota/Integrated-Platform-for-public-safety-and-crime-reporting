// frontend/js/main.js

/**
 * Integrated Platform for Crime Reporting - Core JavaScript
 * Handles: RBAC Login Logic, Dynamic Navbar Rendering, and Global UI Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Crime Reporting Platform: Initializing...');
    
    // Check session on every page load
    checkAuthStatus();

    // Event Listeners for Dynamic Elements
    handleGlobalEvents();

    // Initialize Chatbot
    setupChatbot();

    // Start Real-time Notifications Polling
    setInterval(fetchNotifications, 10000); // Check every 10 seconds
    fetchNotifications(); 
});

/**
 * State Management & App Initialization
 */
let currentUser = null;

async function checkAuthStatus() {
    const isPublicPage = ['index.html', 'map.html', 'auth.html', ''].some(p => window.location.pathname.endsWith(p));
    
    setLoading(true, "Verifying session...");

    try {
        const response = await fetch('/api/auth/me');
        const result = await response.json();

        if (result.success) {
            currentUser = result.data;
            renderNavbar(true, currentUser.role, currentUser.name);
            setupEmergencyButton(true, currentUser.role);
            
            // If logged in user is on auth page, redirect to dashboard
            if (window.location.pathname.endsWith('auth.html')) {
                window.location.href = currentUser.role === 'Citizen' ? 'dashboard.html' : 
                                      currentUser.role === 'Police' ? 'police.html' : 'admin.html';
            }

            // ADMIN CONTROL: Refresh admin panel if on that page
            if (currentUser.role === 'Admin' && window.location.pathname.endsWith('admin.html')) {
                loadAdminPanel();
            }
        } else {
            handleUnauthenticated(isPublicPage);
        }
    } catch (err) {
        console.error("Auth check failed:", err);
        handleUnauthenticated(isPublicPage);
    } finally {
        setLoading(false);
        // Initialize page-specific features based on role
        if (currentUser) {
            if (currentUser.role === 'Citizen' && window.location.pathname.endsWith('dashboard.html')) {
                loadCitizenDashboard();
            } else if (currentUser.role === 'Police' && window.location.pathname.endsWith('police.html')) {
                loadPoliceDashboard();
            }
        }
        setupPriorityDetection();
    }
}

function handleUnauthenticated(isPublicPage) {
    currentUser = null;
    renderNavbar(false, 'Guest');
    setupEmergencyButton(false, 'Guest');

    // Redirect to login if on a protected page
    if (!isPublicPage) {
        window.location.href = 'auth.html';
    }
}

/**
 * Navbar Engine: Generates navigation based on User Role (including Guest)
 */
function renderNavbar(isLoggedIn, role, name = "Guest") {
    const navbarContainer = document.getElementById('mainNavbar');
    if (!navbarContainer) return;

    // Define links based on roles
    const menuItems = {
        'Guest': [
            { name: 'Home', link: 'index.html' },
            { name: 'Crime Map', link: 'map.html' }
        ],
        'Citizen': [
            { name: 'Dashboard', link: 'dashboard.html' },
            { name: 'Report Crime', link: 'report.html' },
            { name: 'Crime Map', link: 'map.html' }
        ],
        'Police': [
            { name: 'Police Dashboard', link: 'police.html' },
            { name: 'Crime Map', link: 'map.html' }
        ],
        'Admin': [
            { name: 'Admin Panel', link: 'admin.html' },
            { name: 'Crime Map', link: 'map.html' }
        ]
    };

    let navHtml = `
        <div class="container">
            <a class="navbar-brand" href="index.html">👮 SafetyFirst</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav me-auto">
    `;

    // Add Role-Specific Links
    const items = menuItems[role] || menuItems['Guest'];
    items.forEach(item => {
        navHtml += `<li class="nav-item"><a class="nav-link" href="${item.link}">${item.name}</a></li>`;
    });

    navHtml += `</ul><div class="d-flex align-items-center">`;

    if (isLoggedIn) {
        navHtml += `
            <div class="nav-notifications" id="notif-wrapper">
                <i class="bi bi-bell text-white fs-5"></i>
                <span class="notification-badge d-none" id="notif-count">0</span>
                <div class="notification-dropdown" id="notif-dropdown">
                    <div class="p-3 border-bottom d-flex justify-content-between align-items-center">
                        <h6 class="mb-0 fw-bold">Alert Sentinels</h6>
                        <button class="btn btn-link btn-sm p-0" onclick="clearAllNotifications()">Clear All</button>
                    </div>
                    <div id="notif-items">
                        <div class="p-4 text-center text-muted small">No new alerts.</div>
                    </div>
                </div>
            </div>
            <span class="text-white me-3 d-none d-md-inline">Welcome, <strong>${name}</strong></span>
            <button class="btn btn-outline-light btn-sm" onclick="handleLogout()">Logout</button>
        `;
    } else {
        navHtml += `<a href="auth.html" class="btn btn-primary-custom btn-sm">Login / Register</a>`;
    }

    navHtml += `</div></div></div>`;
    navbarContainer.innerHTML = navHtml;
    navbarContainer.classList.add('navbar', 'navbar-expand-lg', 'navbar-dark', 'glass-navbar', 'fixed-top');
}

/**
 * API Authentication Calls
 */
window.handleLogin = async (email, password) => {
    setLoading(true, "Authenticating...");
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();

        if (result.success) {
            showToast('Success', 'Login successful! Redirecting...');
            setTimeout(() => window.location.reload(), 1000);
        } else {
            showToast('Login Failed', result.message || 'Invalid credentials');
        }
    } catch (err) {
        showToast('Error', 'Connection failed. Please try again.');
    } finally {
        setLoading(false);
    }
};

window.handleRegister = async (userData) => {
    setLoading(true, "Creating account...");
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        const result = await response.json();

        if (result.success) {
            showToast('Success', 'Account created! Please login.');
            // Switch to login tab
            document.getElementById('login-tab').click();
        } else {
            showToast('Registration Refused', result.error || 'Check your details.');
        }
    } catch (err) {
        showToast('Error', 'Connection failed.');
    } finally {
        setLoading(false);
    }
};

window.handleLogout = async () => {
    await fetch('/api/auth/logout');
    window.location.href = 'index.html';
};

/**
 * API: Incident Reporting
 */
window.handleReportSubmit = async (formData) => {
    setLoading(true, "Submitting report to authorities...");
    try {
        const response = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const result = await response.json();

        if (result.success) {
            showToast('Report Submitted', `Incident Reference: #SF-${result.data._id.slice(-6).toUpperCase()}`);
            
            // Show AI Override message if it exists
            if (result.overrideMessage) {
                setTimeout(() => {
                    showToast('AI Update', result.overrideMessage);
                }, 1500);
            }

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 3000);
        } else {
            showToast('Submission Failed', result.error || 'Check all fields');
        }
    } catch (err) {
        showToast('Error', 'Connection failed. Please try again.');
    } finally {
        setLoading(false);
    }
};

/**
 * Emergency Button Component
 */
function setupEmergencyButton(isLoggedIn, role) {
    // Only show for Citizens or logged-out users to alert authorities
    if (role === 'Police' || role === 'Admin') return;

    const btn = document.createElement('div');
    btn.className = 'emergency-pulse';
    btn.innerHTML = '<span>🆘</span>';
    btn.title = 'Send Emergency Alert';
    
    btn.onclick = () => {
        const confirmAlert = confirm("⚠️ SIREN: Do you want to send an immediate emergency alert with your GPS location?");
        if (confirmAlert) {
            // Fetch real GPS location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    const { latitude, longitude } = position.coords;
                    handleSOSAlert("Current GPS Location", { lat: latitude, lng: longitude });
                }, (error) => {
                    handleSOSAlert("IP-Based Location (GPS Denied)", { lat: 0, lng: 0 });
                });
            } else {
                handleSOSAlert("Manual Trigger (GPS Not Supported)", { lat: 0, lng: 0 });
            }
        }
    };

    document.body.appendChild(btn);
}

async function handleSOSAlert(locationName, coords) {
    setLoading(true, "Dispatching Emergency SOS...");
    try {
        const response = await fetch('/api/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                location: locationName,
                coordinates: coords
            })
        });
        const result = await response.json();
        if (result.success) {
            showToast('SOS DISPATCHED', 'Your location has been sent to all nearby police units.');
        }
    } catch (err) {
        showToast('Error', 'Alert failed to broadcast.');
    } finally {
        setLoading(false);
    }
}

/**
 * DASHBOARD LOGIC (CITIZEN)
 */
async function loadCitizenDashboard() {
    try {
        const response = await fetch('/api/reports');
        const result = await response.json();
        
        if (!result.success) return;
        const reports = result.data;

        // 1. Update Stats
        const total = reports.length;
        const resolved = reports.filter(r => r.status === 'Resolved').length;
        const highPriority = reports.filter(r => r.priority === 'High').length;

        // Assuming fixed IDs from the dashboard HTML layout
        const statCards = document.querySelectorAll('.card-stat h2');
        if (statCards.length >= 3) {
            statCards[0].innerText = total;
            statCards[1].innerText = highPriority;
            statCards[2].innerText = resolved;
        }

        // 2. Aggregate Chart Data
        const categories = { 'Theft / Burglary': 0, 'Assault / Physical Harm': 0, 'Cybercrime / Fraud': 0, 'Public Nuisance': 0, 'Other': 0 };
        const statuses = { 'Unassigned': 0, 'Investigating': 0, 'Resolved': 0 };

        reports.forEach(r => {
            if (categories.hasOwnProperty(r.crimeType)) categories[r.crimeType]++;
            else categories['Other']++;
            
            if (statuses.hasOwnProperty(r.status)) statuses[r.status]++;
        });

        initCharts(Object.values(categories), Object.values(statuses));

        // 3. Render Table
        const tableBody = document.querySelector('tbody');
        if (tableBody) {
            tableBody.innerHTML = reports.map(r => `
                <tr>
                    <td><strong>#SF-${r._id.slice(-4).toUpperCase()}</strong></td>
                    <td>${r.crimeType}</td>
                    <td>${r.location}</td>
                    <td><span class="badge rounded-pill badge-priority-${r.priority.toLowerCase()}">${r.priority}</span></td>
                    <td><span class="text-${r.status === 'Resolved' ? 'success' : 'warning'}"><i class="bi bi-circle-fill me-1 small"></i> ${r.status}</span></td>
                </tr>
            `).join('');
        }

    } catch (err) {
        console.error("Dashboard load error:", err);
    }
}

/**
 * Chart Initialization Engine
 */
function initCharts(categoryData = [12, 19, 3, 5, 2], statusData = [5, 12, 19]) {
    const categoryCtx = document.getElementById('categoryChart');
    const statusCtx = document.getElementById('statusChart');

    if (categoryCtx) {
        new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: ['Theft', 'Assault', 'Cybercrime', 'Fire', 'Other'],
                datasets: [{
                    data: categoryData,
                    backgroundColor: ['#3a86ff', '#ffbe0b', '#06d6a0', '#ff4d4d', '#0a192f'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    if (statusCtx) {
        new Chart(statusCtx, {
            type: 'bar',
            data: {
                labels: ['Pending', 'Investigating', 'Resolved'],
                datasets: [{
                    label: '# of Reports',
                    data: statusData,
                    backgroundColor: ['#ffbe0b', '#3a86ff', '#06d6a0'],
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { display: false } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}
/**
 * ADMIN: User Management & Blocking
 */
async function loadAdminPanel() {
    try {
        const response = await fetch('/api/users');
        const result = await response.json();
        if (!result.success) return;

        const users = result.data;
        
        // Update Stats
        const totalUsers = document.getElementById('totalUsersStat');
        const activeOfficers = document.getElementById('activeOfficersStat');
        if (totalUsers) totalUsers.innerText = users.length;
        if (activeOfficers) activeOfficers.innerText = users.filter(u => u.role === 'Police').length;

        const tableBody = document.getElementById('adminUserTable');
        if (tableBody) {
            tableBody.innerHTML = users.map(u => `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="bg-light rounded-circle p-2 me-3"><i class="bi bi-person"></i></div>
                            <div class="fw-bold">${u.name}</div>
                        </div>
                    </td>
                    <td>${u.email}</td>
                    <td><span class="badge bg-secondary-subtle text-dark rounded-pill px-3">${u.role}</span></td>
                    <td>
                        <span id="status-${u._id}" class="text-${u.isActive ? 'success' : 'danger'}">
                            <i class="bi bi-${u.isActive ? 'circle-fill' : 'x-circle-fill'} me-1 small"></i> 
                            ${u.isActive ? 'Active' : 'Blocked'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-${u.isActive ? 'outline-danger' : 'success'} btn-sm" id="btn-${u._id}" onclick="toggleUserStatus('${u._id}', ${u.isActive})">
                            <i class="bi bi-${u.isActive ? 'slash-circle' : 'check-circle'}"></i> ${u.isActive ? 'Block' : 'Unblock'}
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Admin load error:", err);
    }
}

window.toggleUserStatus = async (id, currentStatus) => {
    const confirmMsg = currentStatus ? "Are you sure you want to block this user?" : "Unblock this user?";
    if (!confirm(confirmMsg)) return;

    setLoading(true, "Updating permissions...");
    try {
        const response = await fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !currentStatus })
        });
        const result = await response.json();
        if (result.success) {
            showToast('System', 'User access permissions updated.');
            loadAdminPanel(); // Refresh table
        }
    } catch (err) {
        showToast('Error', 'Update failed.');
    } finally {
        setLoading(false);
    }
};

/**
 * POLICE: Alerts Integration
 */
async function loadPoliceAlerts() {
    try {
        const response = await fetch('/api/alerts');
        const result = await response.json();
        const alertsContainer = document.getElementById('urgentAlertsContainer');
        const alertsList = document.getElementById('urgentAlertsList');
        
        if (result.success && result.count > 0) {
            alertsContainer.style.display = 'block';
            document.getElementById('alertCountBadge').innerText = `${result.count} Active`;
            
            alertsList.innerHTML = result.data.map(alert => `
                <div class="col-md-6 col-lg-4">
                    <div class="card border-0 shadow-sm bg-danger text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between mb-2">
                                <span class="badge bg-white text-danger">SOS TRIGGERED</span>
                                <small>${new Date(alert.createdAt).toLocaleTimeString()}</small>
                            </div>
                            <h6 class="fw-bold mb-1">${alert.user ? alert.user.name : "Unknown Citizen"}</h6>
                            <p class="small mb-0"><i class="bi bi-geo-alt"></i> ${alert.location}</p>
                            <hr class="my-2 border-white-50">
                            <button class="btn btn-outline-light btn-sm w-100" onclick="alert('GPS: ${alert.coordinates.lat}, ${alert.coordinates.lng}')">Track Location</button>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            alertsContainer.style.display = 'none';
        }
    } catch (err) {
        console.error("Alerts load error:", err);
    }
}

/**
 * Update Police Dashboard to include Alerts
 */
async function loadPoliceDashboard() {
    loadPoliceAlerts(); // Fetch SOS alerts first
    try {
        const response = await fetch('/api/reports');
        const result = await response.json();
        
        if (!result.success) return;
        const reports = result.data;

        // Sort: High priority first
        reports.sort((a, b) => {
            const ranks = { 'High': 3, 'Medium': 2, 'Low': 1 };
            return ranks[b.priority] - ranks[a.priority];
        });

        const tableBody = document.getElementById('policeReportTable');
        if (tableBody) {
            tableBody.innerHTML = reports.map(r => `
                <tr>
                    <td><strong>#SF-${r._id.slice(-4).toUpperCase()}</strong></td>
                    <td>${r.user ? r.user.name : 'Citizen'}</td>
                    <td>${r.crimeType}</td>
                    <td>${r.location}</td>
                    <td><span class="badge rounded-pill badge-priority-${r.priority.toLowerCase()}">${r.priority}</span></td>
                    <td>
                        <select class="form-select form-select-sm" onchange="updateReportStatus('${r._id}', this.value)">
                            <option value="Unassigned" ${r.status === 'Unassigned' ? 'selected' : ''}>Unassigned</option>
                            <option value="Investigating" ${r.status === 'Investigating' ? 'selected' : ''}>Investigating</option>
                            <option value="Resolved" ${r.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                            <option value="Rejected" ${r.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </td>
                    <td>
                        <button class="btn btn-light btn-sm" onclick="showToast('Info', 'Opening detailed file for SF-${r._id.slice(-4).toUpperCase()}...')"><i class="bi bi-eye"></i></button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Police Dashboard error:", err);
    }
}

window.updateReportStatus = async (id, status) => {
    setLoading(true, "Updating status...");
    try {
        const response = await fetch(`/api/reports/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const result = await response.json();

        if (result.success) {
            showToast('Success', 'Incident status updated successfully.');
        } else {
            showToast('Error', 'Failed to update status.');
        }
    } catch (err) {
        showToast('Error', 'Connection error.');
    } finally {
        setLoading(false);
    }
};

/**
 * Table Filtering Logic
 */
window.filterReports = () => {
    const search = document.getElementById('reportSearch').value.toLowerCase();
    const priority = document.getElementById('priorityFilter').value;
    const rows = document.querySelectorAll('#policeReportTable tr');

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        const rowPriority = row.querySelector('.badge').innerText;
        
        const matchesSearch = text.includes(search);
        const matchesPriority = priority === "" || rowPriority.includes(priority);

        row.style.display = (matchesSearch && matchesPriority) ? "" : "none";
    });
};

/**
 * Admin: Toggle User Status (Block/Unblock)
 */
window.toggleUserStatus = (id) => {
    const statusEl = document.getElementById(`status-${id}`);
    const btn = document.getElementById(`btn-${id}`);
    const isBlocking = statusEl.classList.contains('text-success');

    if (isBlocking) {
        statusEl.className = 'text-danger';
        statusEl.innerHTML = '<i class="bi bi-x-circle-fill me-1 small"></i> Blocked';
        btn.className = 'btn btn-success btn-sm';
        btn.innerHTML = '<i class="bi bi-check-circle"></i> Unblock';
        showToast('System', `User #${id} has been blocked.`);
    } else {
        statusEl.className = 'text-success';
        statusEl.innerHTML = '<i class="bi bi-circle-fill me-1 small"></i> Active';
        btn.className = 'btn btn-outline-danger btn-sm';
        btn.innerHTML = '<i class="bi bi-slash-circle"></i> Block';
        showToast('System', `User #${id} has been restored.`);
    }
};

/**
 * UI: Feedback & Toasts
 */
function showToast(title, message) {
    // Check if toast container exists, if not, create it
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }

    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <i class="bi bi-info-circle-fill me-2 text-primary"></i>
                <strong class="me-auto">${title}</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">${message}</div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', toastHtml);
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl);
    toast.show();

    // Auto-remove from DOM after hidden
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

/**
 * UI: Loading Overlay
 */
function setLoading(isLoading, text = "Processing...") {
    let loader = document.getElementById('loader-overlay');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'loader-overlay';
        loader.innerHTML = `
            <div class="spinner-glow mb-3"></div>
            <h5 class="fw-bold" id="loader-text">${text}</h5>
        `;
        document.body.appendChild(loader);
    }
    
    document.getElementById('loader-text').innerText = text;
    loader.style.display = isLoading ? 'flex' : 'none';
}

/**
 * NOTIFICATION SYSTEM: Real-time alerts
 */
async function fetchNotifications() {
    if (!currentUser) return;
    try {
        const response = await fetch('/api/notifications');
        const result = await response.json();
        if (result.success) {
            renderNotifications(result.data);
        }
    } catch (err) {
        console.error("Notif Error:", err);
    }
}

function renderNotifications(notifs) {
    const wrapper = document.getElementById('notif-wrapper');
    const badge = document.getElementById('notif-count');
    const list = document.getElementById('notif-items');
    if (!wrapper || !list) return;

    // 1. Toggle Dropdown on click
    wrapper.onclick = (e) => {
        if (e.target.closest('#notif-dropdown')) return;
        document.getElementById('notif-dropdown').classList.toggle('active');
    };

    // 2. Update Badge
    const unreadCount = notifs.filter(n => !n.isRead).length;
    if (unreadCount > 0) {
        badge.innerText = unreadCount;
        badge.classList.remove('d-none');
    } else {
        badge.classList.add('d-none');
    }

    // 3. Render Items
    if (notifs.length === 0) {
        list.innerHTML = `<div class="p-4 text-center text-muted small">No recent activity.</div>`;
    } else {
        list.innerHTML = notifs.map(n => `
            <div class="notification-item ${n.isRead ? '' : 'unread'}" onclick="markAsRead('${n._id}')">
                <div class="d-flex align-items-center mb-1">
                    <span class="status-dot me-2" style="background: ${getNotifColor(n.type)}"></span>
                    <h6 class="mb-0">${n.title}</h6>
                </div>
                <p>${n.message}</p>
                <small class="text-muted" style="font-size: 0.7rem">${new Date(n.createdAt).toLocaleString()}</small>
            </div>
        `).join('');
    }
}

function getNotifColor(type) {
    switch(type) {
        case 'Emergency': return 'var(--danger-red)';
        case 'StatusUpdate': return 'var(--safety-blue)';
        case 'NewReport': return 'var(--warning-amber)';
        default: return '#ccc';
    }
}

window.markAsRead = async (id) => {
    try {
        await fetch(`/api/notifications/${id}`, { method: 'PUT' });
        fetchNotifications();
    } catch (err) {}
};

window.clearAllNotifications = async () => {
    if (!confirm("Clear all alerts?")) return;
    try {
        await fetch('/api/notifications', { method: 'DELETE' });
        fetchNotifications();
    } catch (err) {}
};

/**
 * CHATBOT ENGINE: Rule-Based FAQ Assistant
 */
function setupChatbot() {
    const chatHtml = `
        <div class="chat-bubble" id="chatBubble">
            <i class="bi bi-chat-dots"></i>
        </div>
        <div class="chat-window" id="chatWindow">
            <div class="chat-header">
                <span class="fw-bold"><i class="bi bi-robot me-2"></i> Safety Assistant</span>
                <button class="btn-close btn-close-white" onclick="toggleChat()"></button>
            </div>
            <div class="chat-body" id="chatBody">
                <div class="chat-message msg-bot">
                    Hello! I'm your Safety Assistant. Ask me about reporting, safety tips, or emergency info!
                </div>
            </div>
            <div class="chat-footer">
                <input type="text" id="chatInput" placeholder="Type a message..." onkeypress="handleChatKey(event)">
                <button onclick="sendChatMessage()"><i class="bi bi-send"></i></button>
            </div>
        </div>
    `;

    const chatContainer = document.createElement('div');
    chatContainer.innerHTML = chatHtml;
    document.body.appendChild(chatContainer);

    const bubble = document.getElementById('chatBubble');
    bubble.onclick = toggleChat;
}

window.toggleChat = () => {
    const win = document.getElementById('chatWindow');
    win.classList.toggle('active');
};

window.handleChatKey = (e) => {
    if (e.key === 'Enter') sendChatMessage();
};

window.sendChatMessage = async () => {
    const input = document.getElementById('chatInput');
    const body = document.getElementById('chatBody');
    const msg = input.value.trim();

    if (!msg) return;

    // 1. Add User Message
    appendMessage('user', msg);
    input.value = '';

    // 2. Fetch Bot Response
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        const result = await response.json();
        
        if (result.success) {
            setTimeout(() => appendMessage('bot', result.data), 500);
        }
    } catch (err) {
        appendMessage('bot', "Sorry, I'm having trouble connecting right now.");
    }
};

function appendMessage(sender, text) {
    const body = document.getElementById('chatBody');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message msg-${sender}`;
    msgDiv.innerText = text;
    body.appendChild(msgDiv);
    
    // Auto Scroll
    body.scrollTop = body.scrollHeight;
}

function handleGlobalEvents() {
    // Scroll effect for navbar
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('mainNavbar');
        if (nav) {
            if (window.scrollY > 50) {
                nav.style.backgroundColor = 'rgba(10, 25, 47, 0.95)';
            } else {
                nav.style.backgroundColor = 'rgba(10, 25, 47, 0.85)';
            }
        }
    });
}
