import { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { api } from './api';
import { RESOURCES } from './config';
import Resource from './Resource.jsx';
import Dashboard from './Dashboard.jsx';
import Reports from './Reports.jsx';

function Login({ onLogin }) {
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try {
      const d = await api('/auth/login', 'POST', f);
      localStorage.setItem('token', d.token);
      localStorage.setItem('user', JSON.stringify(d.user));
      onLogin(d.user);
    } catch (x) { setErr(x.message); }
  };
  return (
    <div className="login">
      <form className="panel" onSubmit={submit}>
        <h2>Hospital Management System</h2>
        <p className="muted">Sign in with your staff account.</p>
        {err && <div className="err">{err}</div>}
        <label><span>Email</span><input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label><span>Password</span><input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        <button>Sign in</button>
      </form>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  if (!user) return <Login onLogin={setUser} />;

  const items = RESOURCES.filter((r) => !r.readRoles || r.readRoles.includes(user.role));
  const logout = () => { localStorage.clear(); setUser(null); };

  return (
    <div className="layout">
      <aside>
        <h3>Hospital Management</h3>
        <NavLink to="/" end>Dashboard</NavLink>
        {items.map((r) => <NavLink key={r.key} to={'/' + r.key}>{r.title}</NavLink>)}
        <NavLink to="/reports">Reports</NavLink>
        <div className="who">{user.name}<small>{user.role}</small><button className="ghost" onClick={logout}>Log out</button></div>
      </aside>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          {items.map((r) => <Route key={r.key} path={'/' + r.key} element={<Resource key={r.key} cfg={r} user={user} />} />)}
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
