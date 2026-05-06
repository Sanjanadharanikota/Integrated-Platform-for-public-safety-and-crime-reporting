import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useState, startTransition } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

const HotspotMap = lazy(() => import('./components/HotspotMap'));
const CategoryChart = lazy(() => import('./components/CrimeCharts').then((module) => ({ default: module.CategoryChart })));
const StatusChart = lazy(() => import('./components/CrimeCharts').then((module) => ({ default: module.StatusChart })));

const navByRole = {
  Guest: [
    { to: '/', label: 'Home' },
    { to: '/map', label: 'Safety Map' },
    { to: '/auth', label: 'Login' }
  ],
  Citizen: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/report', label: 'Report' },
    { to: '/map', label: 'Map' }
  ],
  Police: [
    { to: '/police', label: 'Control Room' },
    { to: '/map', label: 'Map' }
  ],
  Admin: [
    { to: '/admin', label: 'Admin' },
    { to: '/map', label: 'Map' }
  ]
};

const riskColors = { High: '#d95d39', Medium: '#f4b942', Low: '#0f7b6c' };
const locationOptions = ['LB Nagar', 'Banjara Hills', 'Ameerpet', 'Secunderabad', 'Jubilee Hills'];
const priorityRules = [
  { priority: 'High', keywords: ['attack', 'weapon', 'gun', 'knife', 'fire', 'explosion', 'bomb', 'shooting', 'kidnapping', 'rape', 'murder', 'emergency', 'help'] },
  { priority: 'Medium', keywords: ['robbery', 'theft', 'accident', 'break-in', 'harassment', 'assault', 'stolen'] }
];

function roleHome(role) {
  if (role === 'Citizen') return '/dashboard';
  if (role === 'Police') return '/police';
  if (role === 'Admin') return '/admin';
  return '/';
}

function detectPriority(description) {
  const text = description.toLowerCase();
  if (priorityRules[0].keywords.some((keyword) => text.includes(keyword))) return 'High';
  if (priorityRules[1].keywords.some((keyword) => text.includes(keyword))) return 'Medium';
  return 'Low';
}

async function apiFetch(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(path, {
    credentials: 'include',
    headers: isFormData ? (options.headers || {}) : { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || 'Request failed' };
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Request failed');
  }

  return data;
}

function LazyPanel({ children }) {
  return <Suspense fallback={<div className="panel-loader">Loading module...</div>}>{children}</Suspense>;
}

function App() {
  const [session, setSession] = useState({ loading: true, user: null });
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    apiFetch('/api/auth/me')
      .then((data) => {
        if (active) setSession({ loading: false, user: data.data });
      })
      .catch(() => {
        if (active) setSession({ loading: false, user: null });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session.user) {
      setNotifications([]);
      return undefined;
    }

    let active = true;
    const loadNotifications = async () => {
      try {
        const data = await apiFetch('/api/notifications');
        if (active) setNotifications(data.data || []);
      } catch {
        if (active) setNotifications([]);
      }
    };

    loadNotifications();
    const timer = setInterval(loadNotifications, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [session.user]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const onAuthSuccess = (user, message) => {
    setSession({ loading: false, user });
    setToast({ type: 'success', message });
  };

  const onLogout = async () => {
    await apiFetch('/api/auth/logout');
    setSession({ loading: false, user: null });
    setNotifications([]);
    setToast({ type: 'info', message: 'You have been logged out.' });
  };

  const onNotificationRead = async (id) => {
    await apiFetch(`/api/notifications/${id}`, { method: 'PUT' });
    setNotifications((current) => current.map((item) => (item._id === id ? { ...item, isRead: true } : item)));
  };

  const onNotificationsClear = async () => {
    await apiFetch('/api/notifications', { method: 'DELETE' });
    setNotifications([]);
  };

  if (session.loading) {
    return <div className="screen-loader">Loading secure workspace...</div>;
  }

  return (
    <div className="app-shell">
      <Backdrop />
      <TopNav
        user={session.user}
        unreadCount={unreadCount}
        notifications={notifications}
        onLogout={onLogout}
        onNotificationRead={onNotificationRead}
        onNotificationsClear={onNotificationsClear}
      />
      <main className="page-shell">
        <Routes>
          <Route path="/" element={<HomePage user={session.user} />} />
          <Route path="/auth" element={<AuthPage user={session.user} onAuthSuccess={onAuthSuccess} />} />
          <Route path="/map" element={<MapPage user={session.user} setToast={setToast} />} />
          <Route path="/dashboard" element={<Protected user={session.user} role="Citizen"><CitizenDashboard user={session.user} setToast={setToast} /></Protected>} />
          <Route path="/report" element={<Protected user={session.user} role="Citizen"><ReportPage setToast={setToast} /></Protected>} />
          <Route path="/police" element={<Protected user={session.user} role="Police"><PoliceDashboard user={session.user} setToast={setToast} /></Protected>} />
          <Route path="/admin" element={<Protected user={session.user} role="Admin"><AdminDashboard setToast={setToast} /></Protected>} />
          <Route path="/app" element={<Navigate to={roleHome(session.user?.role)} replace />} />
          <Route path="*" element={<Navigate to={location.pathname.startsWith('/api') ? '/' : '/'} replace />} />
        </Routes>
      </main>
      <FloatingTools user={session.user} setToast={setToast} pathname={location.pathname} />
      {toast ? <Toast toast={toast} /> : null}
    </div>
  );
}

function Backdrop() {
  return (
    <div className="backdrop">
      <div className="backdrop-grid" />
      <div className="backdrop-spot backdrop-spot-one" />
      <div className="backdrop-spot backdrop-spot-two" />
    </div>
  );
}

function TopNav({ user, unreadCount, notifications, onLogout, onNotificationRead, onNotificationsClear }) {
  const [open, setOpen] = useState(false);
  const role = user?.role || 'Guest';
  const items = navByRole[role];

  return (
    <header className="topbar">
      <NavLink className="brand" to={roleHome(user?.role)}>
        <span className="brand-badge">SF</span>
        <div>
          <strong>SafetyFirst</strong>
          <small>Crime reporting and response</small>
        </div>
      </NavLink>

      <nav className="topnav-links">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-pill${isActive ? ' active' : ''}`}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="topnav-actions">
        {user ? (
          <>
            <button className="notif-button" type="button" onClick={() => setOpen((value) => !value)}>
              <i className="bi bi-bell-fill" />
              {unreadCount ? <span>{unreadCount}</span> : null}
            </button>
            {open ? (
              <div className="notif-panel">
                <div className="notif-head">
                  <strong>Alert feed</strong>
                  <button type="button" onClick={onNotificationsClear}>Clear all</button>
                </div>
                <div className="notif-body">
                  {notifications.length ? notifications.map((item) => (
                    <button
                      key={item._id}
                      className={`notif-item${item.isRead ? '' : ' unread'}`}
                      type="button"
                      onClick={() => onNotificationRead(item._id)}
                    >
                      <strong>{item.title}</strong>
                      <span>{item.message}</span>
                    </button>
                  )) : <p className="empty-copy">No alerts yet.</p>}
                </div>
              </div>
            ) : null}
            <div className="user-chip">
              <span>{user.name}</span>
              <small>{user.role}</small>
            </div>
            <button className="ghost-button" type="button" onClick={onLogout}>Logout</button>
          </>
        ) : (
          <NavLink to="/auth" className="primary-button">Login / Register</NavLink>
        )}
      </div>
    </header>
  );
}

function Protected({ user, role, children }) {
  if (!user) return <Navigate to="/auth" replace />;
  if (role && user.role !== role) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}

function HomePage({ user }) {
  return (
    <div className="stack-xl">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Public Safety Command Platform</p>
          <h1>Report faster, respond smarter, and keep every role in one secure flow.</h1>
          <p className="hero-text">
            Citizens, police teams, and administrators work from the same live system for reports, map hotspots,
            emergency alerts, and status updates.
          </p>
          <div className="hero-actions">
            <NavLink className="primary-button" to={user ? roleHome(user.role) : '/auth'}>Open workspace</NavLink>
            <NavLink className="ghost-button light" to="/map">Explore crime map</NavLink>
          </div>
        </div>
        <div className="hero-panel">
          <div className="metric-card">
            <span>AI triage</span>
            <strong>Priority auto-detection</strong>
            <small>Flags high-risk descriptions immediately.</small>
          </div>
          <div className="metric-card warm">
            <span>Emergency channel</span>
            <strong>One-tap SOS alerts</strong>
            <small>Dispatches location details to police dashboards.</small>
          </div>
          <div className="metric-card cool">
            <span>Shared visibility</span>
            <strong>Live notifications</strong>
            <small>Citizens and officials stay synced without manual refresh.</small>
          </div>
        </div>
      </section>

      <section className="content-grid three">
        <InfoCard icon="bi-megaphone-fill" title="Report with structure" body="Guided incident submission keeps reports complete and consistent for officials." />
        <InfoCard icon="bi-broadcast-pin" title="See hotspot movement" body="Map overlays group reports by area and show how risk changes over time." />
        <InfoCard icon="bi-shield-check" title="Control by role" body="Citizen, police, and admin tools stay separated while sharing the same backend." />
      </section>

      <section className="section-card split">
        <div>
          <p className="eyebrow">Three-step flow</p>
          <h2>Simple for citizens, operational for responders.</h2>
        </div>
        <div className="content-grid">
          <StepCard index="01" title="Sign in" body="Users authenticate once and land on the workspace built for their role." />
          <StepCard index="02" title="Take action" body="Citizens file incidents, officers manage queues, and admins control account access." />
          <StepCard index="03" title="Track updates" body="Notifications and dashboard summaries keep the case lifecycle visible." />
        </div>
      </section>
    </div>
  );
}

function AuthPage({ user, onAuthSuccess }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Citizen' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (user) return <Navigate to={roleHome(user.role)} replace />;

  const onChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : form;
      const data = await apiFetch(path, { method: 'POST', body: JSON.stringify(payload) });
      onAuthSuccess(data.user, mode === 'login' ? 'Welcome back.' : 'Account created successfully.');
      startTransition(() => navigate(roleHome(data.user.role)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-shell">
      <div className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">Secure access</p>
          <h1>One interface, tailored by responsibility.</h1>
          <p>Citizens can create accounts directly. Police and admin access stays controlled to match the system design.</p>
        </div>
        <form className="auth-form" onSubmit={onSubmit}>
          <div className="tab-row">
            <button type="button" className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => setMode('login')}>Login</button>
            <button type="button" className={mode === 'register' ? 'tab active' : 'tab'} onClick={() => setMode('register')}>Register</button>
          </div>
          {mode === 'register' ? (
            <>
              <label>
                Full name
                <input name="name" value={form.name} onChange={onChange} placeholder="Aarav Sharma" required />
              </label>
              <label>
                Role
                <select name="role" value={form.role} onChange={onChange}>
                  <option value="Citizen">Citizen</option>
                  <option value="Police">Police Officer</option>
                  <option value="Admin">Administrator</option>
                </select>
              </label>
            </>
          ) : null}
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={onChange} placeholder="name@example.com" required />
          </label>
          <label>
            Password
            <input name="password" type="password" value={form.password} onChange={onChange} placeholder="Minimum 6 characters" required />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button wide" type="submit" disabled={busy}>
            {busy ? 'Processing...' : mode === 'login' ? 'Enter workspace' : 'Create account'}
          </button>
        </form>
      </div>
    </section>
  );
}

function CitizenDashboard({ user, setToast }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadReports = async () => {
      try {
        const data = await apiFetch('/api/reports');
        if (active) setReports(data.data || []);
      } catch (err) {
        if (active) setToast({ type: 'error', message: err.message });
      } finally {
        if (active) setLoading(false);
      }
    };

    loadReports();
    const timer = setInterval(loadReports, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [setToast]);

  const statusData = useMemo(() => {
    const counts = { Unassigned: 0, Investigating: 0, Resolved: 0, Rejected: 0 };
    reports.forEach((report) => {
      counts[report.status] = (counts[report.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reports]);

  const categoryData = useMemo(() => {
    const counts = {};
    reports.forEach((report) => {
      counts[report.crimeType] = (counts[report.crimeType] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reports]);

  return (
    <DashboardLayout
      title={`Welcome back, ${user.name}`}
      subtitle="Track your incidents, current risk, and ongoing case status."
      aside={<StatusBadge label="Citizen channel" value="Live" />}
    >
      <div className="content-grid three">
        <StatCard label="Total reports" value={reports.length} accent="warm" />
        <StatCard label="High priority" value={reports.filter((item) => item.priority === 'High').length} accent="danger" />
        <StatCard label="Resolved cases" value={reports.filter((item) => item.status === 'Resolved').length} accent="cool" />
      </div>

      <div className="content-grid two">
        <ChartCard title="Incidents by category">
          <LazyPanel>
            <CategoryChart data={categoryData} />
          </LazyPanel>
        </ChartCard>
        <ChartCard title="Status overview">
          <LazyPanel>
            <StatusChart data={statusData} />
          </LazyPanel>
        </ChartCard>
      </div>

      <section className="section-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Case history</p>
            <h2>Your recent reports</h2>
          </div>
          <NavLink className="primary-button" to="/report">Report a new incident</NavLink>
        </div>
        {loading ? <p className="empty-copy">Loading your reports...</p> : <ReportTable reports={reports} />}
      </section>

      <MessagingWorkspace user={user} setToast={setToast} title="Citizen to police messaging" subtitle="Use this channel to follow up with police or admin contacts." />
    </DashboardLayout>
  );
}

function ReportPage({ setToast }) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    crimeType: 'Theft / Burglary',
    description: '',
    location: 'LB Nagar'
  });
  const [evidence, setEvidence] = useState(null);
  const navigate = useNavigate();
  const priority = detectPriority(form.description);

  const onChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('crimeType', form.crimeType);
      formData.append('description', form.description);
      formData.append('location', form.location);
      formData.append('priority', priority);
      if (evidence) {
        formData.append('evidence', evidence);
      }

      const data = await apiFetch('/api/reports', {
        method: 'POST',
        body: formData
      });
      setToast({
        type: 'success',
        message: data.overrideMessage || `Report submitted successfully. Ref: SF-${data.data._id.slice(-6).toUpperCase()}`
      });
      startTransition(() => navigate('/dashboard'));
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout
      title="Submit incident report"
      subtitle="Capture the details clearly so responders can triage the case accurately."
      aside={<StatusBadge label="AI priority" value={priority} tone={priority.toLowerCase()} />}
    >
      <form className="section-card report-form" onSubmit={onSubmit}>
        <div className="step-track">
          {[1, 2, 3].map((value) => <span key={value} className={`step-dot${value <= step ? ' active' : ''}`}>{value}</span>)}
        </div>
        {step === 1 ? (
          <div className="form-grid">
            <label>
              Crime type
              <select name="crimeType" value={form.crimeType} onChange={onChange}>
                <option>Theft / Burglary</option>
                <option>Assault / Physical Harm</option>
                <option>Cybercrime / Fraud</option>
                <option>Public Nuisance</option>
                <option>Other</option>
              </select>
            </label>
            <label className="full">
              Incident description
              <textarea name="description" value={form.description} onChange={onChange} rows="7" placeholder="Include what happened, who was involved, and whether there is immediate danger." required />
            </label>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="form-grid">
            <label>
              Area
              <select name="location" value={form.location} onChange={onChange}>
                {locationOptions.map((location) => <option key={location}>{location}</option>)}
              </select>
            </label>
            <div className="upload-card">
              <strong>Evidence upload</strong>
              <p>Upload a JPG, PNG, WEBP, or PDF up to 5 MB to support the complaint record.</p>
              <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => setEvidence(event.target.files?.[0] || null)} />
              <small>{evidence ? `Selected: ${evidence.name}` : 'No file selected yet.'}</small>
            </div>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="review-card">
            <h2>Final review</h2>
            <p><strong>Type:</strong> {form.crimeType}</p>
            <p><strong>Location:</strong> {form.location}</p>
            <p><strong>Priority:</strong> {priority}</p>
            <p>{form.description || 'Add a description before submitting.'}</p>
          </div>
        ) : null}
        <div className="actions-row">
          <button className="ghost-button" type="button" disabled={step === 1} onClick={() => setStep((value) => value - 1)}>Back</button>
          {step < 3 ? (
            <button className="primary-button" type="button" onClick={() => setStep((value) => value + 1)}>Next</button>
          ) : (
            <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Submitting...' : 'Submit report'}</button>
          )}
        </div>
      </form>
    </DashboardLayout>
  );
}

function PoliceDashboard({ user, setToast }) {
  const [reports, setReports] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const deferredSearch = useDeferredValue(search);

  const loadData = async () => {
    try {
      const [reportData, alertData] = await Promise.all([
        apiFetch('/api/reports'),
        apiFetch('/api/alerts')
      ]);
      setReports(reportData.data || []);
      setAlerts(alertData.data || []);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) {
        await loadData();
      }
    };

    run();
    const timer = setInterval(run, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const filteredReports = useMemo(() => {
    return reports
      .slice()
      .sort((left, right) => ['Low', 'Medium', 'High'].indexOf(left.priority) - ['Low', 'Medium', 'High'].indexOf(right.priority))
      .filter((report) => {
        const matchesSearch = `${report.title} ${report.location} ${report.user?.name || ''}`.toLowerCase().includes(deferredSearch.toLowerCase());
        const matchesPriority = !priorityFilter || report.priority === priorityFilter;
        return matchesSearch && matchesPriority;
      })
      .reverse();
  }, [reports, deferredSearch, priorityFilter]);

  const updateStatus = async (id, status) => {
    try {
      await apiFetch(`/api/reports/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      setToast({ type: 'success', message: 'Report status updated.' });
      loadData();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  return (
    <DashboardLayout
      title={`Control room dashboard`}
      subtitle={`Welcome, Officer ${user.name}. Manage the live case queue and active emergency alerts.`}
      aside={<StatusBadge label="Emergency alerts" value={`${alerts.length} active`} tone={alerts.length ? 'danger' : 'safe'} />}
    >
      <div className="content-grid four">
        <StatCard label="Total queue" value={reports.length} accent="warm" />
        <StatCard label="High priority" value={reports.filter((item) => item.priority === 'High').length} accent="danger" />
        <StatCard label="Investigating" value={reports.filter((item) => item.status === 'Investigating').length} accent="cool" />
        <StatCard label="Resolved" value={reports.filter((item) => item.status === 'Resolved').length} accent="safe" />
      </div>

      {alerts.length ? (
        <section className="section-card danger-surface">
          <div className="section-head">
            <div>
              <p className="eyebrow">Live emergency queue</p>
              <h2>SOS alerts requiring attention</h2>
            </div>
          </div>
          <div className="content-grid three">
            {alerts.map((alert) => (
              <article key={alert._id} className="alert-card">
                <strong>{alert.user?.name || 'Unknown citizen'}</strong>
                <span>{alert.location}</span>
                <small>{new Date(alert.createdAt).toLocaleString()}</small>
                <p>GPS: {alert.coordinates?.lat ?? 'n/a'}, {alert.coordinates?.lng ?? 'n/a'}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Incident queue</p>
            <h2>Manage reports</h2>
          </div>
          <div className="toolbar">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, area, or reporter" />
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="">All priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Reporter</th>
                <th>Incident</th>
                <th>Location</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report._id}>
                  <td>SF-{report._id.slice(-4).toUpperCase()}</td>
                  <td>{report.user?.name || 'Citizen'}</td>
                  <td>{report.crimeType}</td>
                  <td>{report.location}</td>
                  <td><PriorityPill value={report.priority} /></td>
                  <td>
                    <select value={report.status} onChange={(event) => updateStatus(report._id, event.target.value)}>
                      <option>Unassigned</option>
                      <option>Investigating</option>
                      <option>Resolved</option>
                      <option>Rejected</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <MessagingWorkspace user={user} setToast={setToast} title="Citizen message inbox" subtitle="Reply to citizens directly from the police workspace." />
    </DashboardLayout>
  );
}

function AdminDashboard({ setToast }) {
  const [users, setUsers] = useState([]);

  const loadUsers = async () => {
    try {
      const data = await apiFetch('/api/users');
      setUsers(data.data || []);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleUser = async (user) => {
    try {
      await apiFetch(`/api/users/${user._id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !user.isActive })
      });
      setToast({ type: 'success', message: `${user.name} is now ${user.isActive ? 'blocked' : 'active'}.` });
      loadUsers();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  return (
    <DashboardLayout
      title="Admin workspace"
      subtitle="Manage account access and keep the platform safe for verified participants."
      aside={<StatusBadge label="Users" value={users.length} />}
    >
      <div className="content-grid four">
        <StatCard label="Total users" value={users.length} accent="cool" />
        <StatCard label="Police officers" value={users.filter((item) => item.role === 'Police').length} accent="warm" />
        <StatCard label="Citizens" value={users.filter((item) => item.role === 'Citizen').length} accent="safe" />
        <StatCard label="Blocked" value={users.filter((item) => !item.isActive).length} accent="danger" />
      </div>

      <section className="section-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Access control</p>
            <h2>User management</h2>
          </div>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.isActive ? 'Active' : 'Blocked'}</td>
                  <td>
                    <button className="ghost-button" type="button" onClick={() => toggleUser(user)}>
                      {user.isActive ? 'Block' : 'Unblock'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}

function MapPage({ user, setToast }) {
  const [hotspots, setHotspots] = useState([]);

  useEffect(() => {
    apiFetch('/api/reports/map-stats')
      .then((data) => setHotspots(data.data || []))
      .catch((err) => setToast({ type: 'error', message: err.message }));
  }, [setToast]);

  const recommendations = useMemo(() => {
    const highRisk = hotspots.filter((spot) => spot.risk === 'High');
    const mediumRisk = hotspots.filter((spot) => spot.risk === 'Medium');

    const items = [];
    if (highRisk.length) {
      items.push(`Avoid unnecessary late-night travel near ${highRisk.map((spot) => spot.location).join(', ')} until activity cools down.`);
    }
    if (mediumRisk.length) {
      items.push(`Stay alert in ${mediumRisk.map((spot) => spot.location).join(', ')} and prefer well-lit roads or public areas.`);
    }
    items.push('Use the SOS trigger or call emergency services immediately if you face an active threat.');

    return items;
  }, [hotspots]);

  return (
    <section className="map-shell">
      <div className="map-sidebar">
        <p className="eyebrow">Geospatial intelligence</p>
        <h1>City safety map</h1>
        <p>Each marker groups report activity by area. Larger markers mean more incident volume.</p>
        <div className="legend-list">
          {Object.entries(riskColors).map(([risk, color]) => (
            <div key={risk} className="legend-item">
              <span style={{ backgroundColor: color }} />
              <strong>{risk}</strong>
            </div>
          ))}
        </div>
        <div className="recommendation-card">
          <strong>Safety recommendations</strong>
          {recommendations.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
        <NavLink className="primary-button" to={user ? roleHome(user.role) : '/auth'}>
          {user ? 'Back to workspace' : 'Login to report'}
        </NavLink>
      </div>
      <div className="map-panel">
        <LazyPanel>
          <HotspotMap hotspots={hotspots} riskColors={riskColors} />
        </LazyPanel>
      </div>
    </section>
  );
}

function FloatingTools({ user, setToast, pathname }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hello, I'm the Safety Assistant. Ask about reporting, emergencies, or map risk." }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setMessages((current) => [...current, { role: 'user', text }]);
    setInput('');
    setSending(true);
    try {
      const data = await apiFetch('/api/chat', { method: 'POST', body: JSON.stringify({ message: text }) });
      setMessages((current) => [...current, { role: 'bot', text: data.data }]);
    } catch {
      setMessages((current) => [...current, { role: 'bot', text: 'The assistant could not respond right now.' }]);
    } finally {
      setSending(false);
    }
  };

  const triggerSos = () => {
    if (!user || user.role !== 'Citizen') {
      setToast({ type: 'info', message: 'Login as a citizen to send an SOS alert.' });
      return;
    }

    const sendAlert = async (coords) => {
      try {
        await apiFetch('/api/alerts', {
          method: 'POST',
          body: JSON.stringify({
            location: coords.label,
            coordinates: { lat: coords.lat, lng: coords.lng }
          })
        });
        setToast({ type: 'success', message: 'SOS alert dispatched to nearby responders.' });
      } catch (err) {
        setToast({ type: 'error', message: err.message });
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => sendAlert({
          label: 'Live GPS location',
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }),
        () => sendAlert({ label: 'Manual emergency trigger', lat: 0, lng: 0 })
      );
    } else {
      sendAlert({ label: 'Manual emergency trigger', lat: 0, lng: 0 });
    }
  };

  if (pathname === '/auth') return null;

  return (
    <>
      <button className="fab chat-fab" type="button" onClick={() => setChatOpen((value) => !value)}>
        <i className="bi bi-chat-dots-fill" />
      </button>
      <button className="fab sos-fab" type="button" onClick={triggerSos}>
        <i className="bi bi-broadcast-pin" />
      </button>
      {chatOpen ? (
        <section className="chat-shell">
          <div className="chat-head">
            <strong>Safety Assistant</strong>
            <button type="button" onClick={() => setChatOpen(false)}><i className="bi bi-x-lg" /></button>
          </div>
          <div className="chat-body">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`chat-msg ${message.role}`}>{message.text}</div>
            ))}
          </div>
          <div className="chat-foot">
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a safety question" onKeyDown={(event) => event.key === 'Enter' && sendMessage()} />
            <button type="button" onClick={sendMessage} disabled={sending}><i className="bi bi-send-fill" /></button>
          </div>
        </section>
      ) : null}
    </>
  );
}

function DashboardLayout({ title, subtitle, aside, children }) {
  return (
    <div className="stack-lg">
      <section className="section-card hero-strip">
        <div>
          <p className="eyebrow">Operational workspace</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {aside}
      </section>
      {children}
    </div>
  );
}

function MessagingWorkspace({ user, setToast, title, subtitle }) {
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [draft, setDraft] = useState('');

  const loadMessaging = async () => {
    try {
      const [contactsData, messagesData] = await Promise.all([
        apiFetch('/api/messages/contacts'),
        apiFetch('/api/messages')
      ]);
      setContacts(contactsData.data || []);
      setMessages(messagesData.data || []);
      if (!selectedContactId && contactsData.data?.length) {
        setSelectedContactId(contactsData.data[0]._id);
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) {
        await loadMessaging();
      }
    };

    run();
    const timer = setInterval(run, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const selectedContact = contacts.find((contact) => contact._id === selectedContactId) || null;
  const conversation = useMemo(() => {
    if (!selectedContactId) return [];
    return messages.filter((message) =>
      [message.sender?._id, message.recipient?._id].includes(selectedContactId)
    );
  }, [messages, selectedContactId]);

  const sendMessage = async () => {
    if (!draft.trim() || !selectedContactId) return;
    try {
      const data = await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ recipientId: selectedContactId, body: draft.trim() })
      });
      setMessages((current) => [...current, data.data]);
      setDraft('');
      setToast({ type: 'success', message: 'Message sent.' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  return (
    <section className="section-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Secure communication</p>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="messaging-shell">
        <div className="contact-list">
          {contacts.length ? contacts.map((contact) => (
            <button
              key={contact._id}
              type="button"
              className={`contact-item${selectedContactId === contact._id ? ' active' : ''}`}
              onClick={() => setSelectedContactId(contact._id)}
            >
              <strong>{contact.name}</strong>
              <small>{contact.role}</small>
            </button>
          )) : <p className="empty-copy">No available contacts.</p>}
        </div>
        <div className="conversation-panel">
          <div className="conversation-head">
            <strong>{selectedContact ? selectedContact.name : 'Select a contact'}</strong>
            <small>{selectedContact ? selectedContact.role : 'No conversation loaded'}</small>
          </div>
          <div className="conversation-body">
            {conversation.length ? conversation.map((message) => {
              const mine = message.sender?._id === user._id;
              return (
                <div key={message._id} className={`message-bubble${mine ? ' mine' : ''}`}>
                  <strong>{mine ? 'You' : message.sender?.name}</strong>
                  <span>{message.body}</span>
                </div>
              );
            }) : <p className="empty-copy">No messages yet for this contact.</p>}
          </div>
          <div className="conversation-compose">
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type your message here" onKeyDown={(event) => event.key === 'Enter' && sendMessage()} />
            <button className="primary-button" type="button" onClick={sendMessage}>Send</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ label, value, tone }) {
  return (
    <div className={`status-badge${tone ? ` ${tone}` : ''}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <article className={`stat-card ${accent || ''}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

function ChartCard({ title, children }) {
  return (
    <section className="section-card">
      <div className="section-head compact">
        <div>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function InfoCard({ icon, title, body }) {
  return (
    <article className="info-card">
      <i className={`bi ${icon}`} />
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function StepCard({ index, title, body }) {
  return (
    <article className="step-card">
      <span>{index}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function ReportTable({ reports }) {
  if (!reports.length) return <p className="empty-copy">No reports yet. Use the report flow to create your first case.</p>;

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Incident</th>
            <th>Location</th>
            <th>Submitted</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report._id}>
              <td>SF-{report._id.slice(-4).toUpperCase()}</td>
              <td>{report.crimeType}</td>
              <td>{report.location}</td>
              <td>{new Date(report.createdAt).toLocaleDateString()}</td>
              <td><PriorityPill value={report.priority} /></td>
              <td>{report.status}</td>
              <td>{report.evidence && report.evidence !== 'no-image.jpg' ? <a href={report.evidence} target="_blank" rel="noreferrer">View file</a> : 'None'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PriorityPill({ value }) {
  return <span className={`priority-pill ${value.toLowerCase()}`}>{value}</span>;
}

function Toast({ toast }) {
  return <div className={`toast-banner ${toast.type}`}>{toast.message}</div>;
}

export default App;
