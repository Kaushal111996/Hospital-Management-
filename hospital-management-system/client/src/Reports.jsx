import { useEffect, useState } from 'react';
import { api } from './api';
import { RESOURCES } from './config';
import { Table } from './Resource.jsx';

const TYPES = [
  ['Patient report', 'patients'],
  ['Appointment report', 'appointments'],
  ['Billing report', 'bills'],
  ['Laboratory report', 'laborders'],
  ['Bed occupancy report', 'beds'],
];

export default function Reports() {
  const [key, setKey] = useState('patients');
  const [rows, setRows] = useState([]);
  const cfg = RESOURCES.find((r) => r.key === key);
  useEffect(() => { api('/' + key).then(setRows); }, [key]);

  const csv = () => {
    const lines = [cfg.columns.map((c) => c[0]), ...rows.map((r) => cfg.columns.map((c) => c[1](r)))]
      .map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    a.download = `${key}-report.csv`;
    a.click();
  };

  return (
    <div>
      <div className="bar">
        <h1>Reports</h1>
        <select value={key} onChange={(e) => setKey(e.target.value)}>
          {TYPES.map(([label, k]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <button onClick={csv}>Download CSV</button>
        <button className="ghost" onClick={() => window.print()}>Print</button>
      </div>
      {key === 'beds' && <p>Occupied beds: {rows.filter((r) => r.occupied).length} of {rows.length}</p>}
      <Table cfg={cfg} rows={rows} />
    </div>
  );
}
