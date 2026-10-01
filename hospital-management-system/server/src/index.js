import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'hms-college-project-secret';
const app = express();
app.use(cors());
app.use(express.json());

// ---------- helpers ----------
const wrap = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    const msg = e.message.includes('Foreign key') ? 'This record is in use by other records' : e.message.split('\n').filter(Boolean).pop();
    res.status(e.status || 400).json({ error: msg });
  });

const auth = (req, res, next) => {
  try {
    req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Please log in' });
  }
};
const can = (roles) => (req, res, next) =>
  !roles || roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Not allowed for your role' });

const NUM = new Set(['age', 'price', 'consultationFee', 'labCharges', 'medicineCharges', 'otherCharges']);
const DATE = new Set(['date']);
const FEES = ['consultationFee', 'labCharges', 'medicineCharges', 'otherCharges'];

// turn form values from the browser into Prisma-ready data
function clean(body) {
  const o = {};
  for (const [k, v] of Object.entries(body)) {
    if (['id', 'createdAt', 'total', 'occupied'].includes(k)) continue; // set by the server
    if (v && typeof v === 'object') continue; // nested relations
    if (v === '' || v === null) o[k] = NUM.has(k) ? 0 : null;
    else if (/Id$/.test(k) || NUM.has(k)) o[k] = Number(v);
    else if (DATE.has(k)) o[k] = new Date(v);
    else o[k] = v;
  }
  return o;
}

// business rules that run before create/update
const pre = {
  users: async (d) => {
    if (d.password) d.password = bcrypt.hashSync(d.password, 8);
    else delete d.password;
  },
  bills: async (d) => {
    if (FEES.some((k) => k in d)) d.total = FEES.reduce((s, k) => s + (d[k] || 0), 0);
  },
  appointments: async (d, id) => {
    if (!d.date || !d.doctorId) return;
    const clash = await prisma.appointment.findFirst({
      where: { doctorId: d.doctorId, date: d.date, status: { not: 'CANCELLED' }, NOT: id ? { id } : undefined },
    });
    if (clash) throw Object.assign(new Error('Doctor already has an appointment at this time'), { status: 409 });
  },
};

// ---------- auth ----------
app.post('/api/auth/login', wrap(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { email: req.body.email || '' } });
  if (!u || !bcrypt.compareSync(req.body.password || '', u.password))
    return res.status(401).json({ error: 'Invalid email or password' });
  const user = { id: u.id, name: u.name, role: u.role };
  res.json({ token: jwt.sign(user, SECRET, { expiresIn: '8h' }), user });
}));

// ---------- dashboard ----------
app.get('/api/dashboard', auth, wrap(async (req, res) => {
  const t0 = new Date();
  t0.setHours(0, 0, 0, 0);
  const t1 = new Date(t0.getTime() + 864e5);
  const [patients, doctors, todayAppointments, availableBeds, pending] = await Promise.all([
    prisma.patient.count(),
    prisma.doctor.count({ where: { active: true } }),
    prisma.appointment.count({ where: { date: { gte: t0, lt: t1 }, status: { not: 'CANCELLED' } } }),
    prisma.bed.count({ where: { occupied: false } }),
    prisma.bill.aggregate({ where: { status: 'PENDING' }, _count: true, _sum: { total: true } }),
  ]);
  res.json({ patients, doctors, todayAppointments, availableBeds, pendingPayments: pending._count, pendingAmount: pending._sum.total || 0 });
}));

// ---------- admissions (bed assignment) ----------
const frontDesk = ['ADMIN', 'RECEPTIONIST'];
app.post('/api/admissions', auth, can(frontDesk), wrap(async (req, res) => {
  const { patientId, bedId } = clean(req.body);
  const bed = await prisma.bed.findUnique({ where: { id: bedId } });
  if (!bed || bed.occupied) return res.status(409).json({ error: 'Bed is not available' });
  const [a] = await prisma.$transaction([
    prisma.admission.create({ data: { patientId, bedId } }),
    prisma.bed.update({ where: { id: bedId }, data: { occupied: true } }),
  ]);
  res.json(a);
}));
app.post('/api/admissions/:id/discharge', auth, can(frontDesk), wrap(async (req, res) => {
  const a = await prisma.admission.findUnique({ where: { id: +req.params.id } });
  if (!a || a.dischargedAt) return res.status(400).json({ error: 'Patient is already discharged' });
  await prisma.$transaction([
    prisma.admission.update({ where: { id: a.id }, data: { dischargedAt: new Date() } }),
    prisma.bed.update({ where: { id: a.bedId }, data: { occupied: false } }),
  ]);
  res.json({ ok: true });
}));

// ---------- generic CRUD (m = prisma model, w = roles allowed to write) ----------
const RES = {
  users: { m: 'user', w: ['ADMIN'], r: ['ADMIN'] },
  departments: { m: 'department', w: ['ADMIN'] },
  doctors: { m: 'doctor', w: ['ADMIN'], inc: { department: true } },
  patients: { m: 'patient', w: ['ADMIN', 'RECEPTIONIST', 'DOCTOR'] },
  appointments: { m: 'appointment', w: frontDesk, inc: { patient: true, doctor: true } },
  consultations: { m: 'consultation', w: ['ADMIN', 'DOCTOR'], inc: { patient: true, doctor: true } },
  prescriptions: { m: 'prescription', w: ['ADMIN', 'DOCTOR'], inc: { patient: true, doctor: true } },
  labtests: { m: 'labTest', w: ['ADMIN', 'LAB'] },
  laborders: { m: 'labOrder', w: ['ADMIN', 'DOCTOR', 'LAB'], inc: { patient: true, labTest: true } },
  rooms: { m: 'room', w: ['ADMIN'] },
  beds: { m: 'bed', w: ['ADMIN'], inc: { room: true } },
  admissions: { m: 'admission', w: frontDesk, inc: { patient: true, bed: { include: { room: true } } } },
  bills: { m: 'bill', w: ['ADMIN', 'BILLING'], inc: { patient: true } },
};
const strip = (r) => { delete r.password; return r; };

for (const [path, c] of Object.entries(RES)) {
  const db = () => prisma[c.m];
  const url = `/api/${path}`;
  app.get(url, auth, can(c.r), wrap(async (req, res) =>
    res.json((await db().findMany({ include: c.inc, orderBy: { id: 'desc' } })).map(strip))));
  app.post(url, auth, can(c.w), wrap(async (req, res) => {
    const d = clean(req.body);
    await pre[path]?.(d);
    res.json(strip(await db().create({ data: d, include: c.inc })));
  }));
  app.put(`${url}/:id`, auth, can(c.w), wrap(async (req, res) => {
    const id = +req.params.id;
    const d = clean(req.body);
    await pre[path]?.(d, id);
    res.json(strip(await db().update({ where: { id }, data: d, include: c.inc })));
  }));
  app.delete(`${url}/:id`, auth, can(c.w), wrap(async (req, res) => {
    await db().delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  }));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`HMS API running on http://localhost:${PORT}`));
