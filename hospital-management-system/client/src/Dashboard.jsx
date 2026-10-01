import { useEffect, useState } from 'react';
import { api } from './api';

export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { api('/dashboard').then(setD); }, []);
  if (!d) return <p>Loading...</p>;
  const stats = [
    ['Total patients', d.patients],
    ['Total doctors', d.doctors],
    ["Today's appointments", d.todayAppointments],
    ['Available beds', d.availableBeds],
    ['Pending payments', `${d.pendingPayments} bills (${d.pendingAmount})`],
  ];
  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stats">
        {stats.map(([label, value]) => <div className="stat" key={label}><b>{value}</b><span>{label}</span></div>)}
      </div>
    </div>
  );
}
