import { useEffect, useState } from 'react';
import { api } from './api';
import { REF_LABEL } from './config';

const toLocalInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
};

export function Table({ cfg, rows, actions }) {
  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>{cfg.columns.map((c) => <th key={c[0]}>{c[0]}</th>)}{actions && <th>Actions</th>}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {cfg.columns.map((c) => <td key={c[0]}>{String(c[1](r) ?? '')}</td>)}
              {actions && <td className="act">{actions(r)}</td>}
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={cfg.columns.length + 1} className="empty">Nothing here yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default function Resource({ cfg, user }) {
  const [rows, setRows] = useState([]);
  const [refs, setRefs] = useState({});
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null); // { id, v }
  const [err, setErr] = useState('');
  const canWrite = cfg.roles.includes(user.role);

  const load = () => {
    api('/' + cfg.key).then(setRows).catch((e) => setErr(e.message));
    cfg.fields.filter((f) => f.type === 'ref').forEach((f) =>
      api('/' + f.ref).then((d) => setRefs((s) => ({ ...s, [f.ref]: d }))).catch(() => {}));
  };
  useEffect(load, [cfg.key]);

  const run = async (fn) => {
    setErr('');
    try { await fn(); load(); } catch (e) { setErr(e.message); }
  };

  const open = (row) => {
    const v = {};
    cfg.fields.forEach((f) => {
      v[f.name] = row ? (f.type === 'datetime' ? toLocalInput(row[f.name]) : row[f.name] ?? '') : f.def ?? '';
    });
    setErr('');
    setForm({ id: row?.id, v });
  };
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      await api('/' + cfg.key + (form.id ? '/' + form.id : ''), form.id ? 'PUT' : 'POST', form.v);
      setForm(null);
    });
  };

  const input = (f) => {
    const v = form.v[f.name];
    const set = (x) => setForm({ ...form, v: { ...form.v, [f.name]: x } });
    const req = f.required || (f.reqNew && !form.id);
    const common = { value: v, required: !!req, placeholder: f.hint, onChange: (e) => set(e.target.value) };
    if (f.type === 'checkbox') return <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} />;
    if (f.type === 'textarea') return <textarea rows="3" {...common} />;
    if (f.type === 'select')
      return <select {...common}><option value="">Select...</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select>;
    if (f.type === 'ref')
      return (
        <select {...common}>
          <option value="">Select...</option>
          {(refs[f.ref] || []).filter(f.filter || (() => true)).map((o) => <option key={o.id} value={o.id}>{REF_LABEL[f.ref](o)}</option>)}
        </select>
      );
    return <input {...common} type={f.type === 'datetime' ? 'datetime-local' : f.type} />;
  };

  const shown = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  const actions = (r) => (
    <>
      {(cfg.actions || []).filter((a) => (a.open || canWrite) && (!a.show || a.show(r))).map((a) => (
        <button key={a.label} className="sm" onClick={() => (a.local ? a.run(r) : run(() => a.run(r)))}>{a.label}</button>
      ))}
      {canWrite && !cfg.noEdit && <button className="sm" onClick={() => open(r)}>Edit</button>}
      {canWrite && !cfg.noDelete && (
        <button className="sm danger" onClick={() => confirm('Delete this record?') && run(() => api(`/${cfg.key}/${r.id}`, 'DELETE'))}>Delete</button>
      )}
    </>
  );

  return (
    <div>
      <div className="bar">
        <h1>{cfg.title}</h1>
        <input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
        {canWrite && <button onClick={() => open(null)}>Add {cfg.title.replace(/s$/, '').toLowerCase()}</button>}
      </div>
      {!form && err && <div className="err">{err}</div>}
      <Table cfg={cfg} rows={shown} actions={actions} />
      {form && (
        <div className="modal">
          <form className="panel" onSubmit={submit}>
            <h2>{form.id ? 'Edit' : 'Add'} {cfg.title.replace(/s$/, '').toLowerCase()}</h2>
            {err && <div className="err">{err}</div>}
            {cfg.fields.map((f) => <label key={f.name}><span>{f.label}</span>{input(f)}</label>)}
            <div className="row">
              <button type="button" className="ghost" onClick={() => setForm(null)}>Cancel</button>
              <button>Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
