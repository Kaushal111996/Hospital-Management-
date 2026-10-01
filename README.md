# Hospital Management System

A college mini project that manages patients, doctors, appointments, consultations, prescriptions, lab tests, rooms/beds and billing in one web application.

**Stack:** React (Vite) + Node.js/Express (JavaScript) + Prisma ORM + SQLite, with JWT login and role-based access.

## Run it

Requires Node.js 18 or newer. Use two terminals.

```bash
# 1) API (http://localhost:3001)
cd server
npm install
npm run setup     # creates the database and sample data
npm run dev

# 2) Web app (http://localhost:5173)
cd client
npm install
npm run dev
```

Open http://localhost:5173 and sign in.

| Role | Email | Password |
|---|---|---|
| Admin (everything) | admin@hospital.com | admin123 |
| Doctor | doctor@hospital.com | admin123 |
| Receptionist | reception@hospital.com | admin123 |
| Lab technician | lab@hospital.com | admin123 |
| Billing clerk | billing@hospital.com | admin123 |

## Features (as per the proposal)

| Module | What it does |
|---|---|
| Login and users | JWT login, 5 roles, only permitted roles can add/edit/delete; admin manages users |
| Patients | Register, search, edit, active/inactive |
| Doctors and departments | Specialization, availability, department assignment |
| Appointments | Book, reschedule (edit), cancel, complete, status; blocks double-booking a doctor |
| Consultations | Symptoms, diagnosis, doctor's notes, treatment |
| Prescriptions | Medicines with dosage and duration, history list |
| Laboratory | Test catalogue, assign to patient, enter result, download report |
| Rooms and beds | Add rooms/beds, assign bed on admission, discharge frees the bed |
| Billing | Consultation, lab, medicine and other charges, auto total, payment status |
| Dashboard | Patients, doctors, today's appointments, available beds, pending payments |
| Reports | Patient, appointment, billing, lab and bed occupancy; CSV download and print |

## Project structure

```
server/prisma/schema.prisma   database tables
server/prisma/seed.js         sample data and logins
server/src/index.js           REST API (auth, CRUD, admissions, dashboard)
client/src/config.js          fields and columns for every screen
client/src/Resource.jsx       reusable list + add/edit form
client/src/App.jsx            layout, login, routes
```

## API summary

All routes except login need `Authorization: Bearer <token>`.

- `POST /api/auth/login`
- `GET/POST /api/{resource}` and `PUT/DELETE /api/{resource}/:id`, where resource is one of users, departments, doctors, patients, appointments, consultations, prescriptions, labtests, laborders, rooms, beds, admissions, bills
- `POST /api/admissions` (assigns a bed), `POST /api/admissions/:id/discharge`
- `GET /api/dashboard`

## Notes

- Not yet covered (listed as optional in the proposal): reminders, document upload, medicine inventory, emergency registration, discharge summary.
- To use PostgreSQL or MySQL instead of SQLite, change `provider` and `url` in `schema.prisma` and run `npm run setup` again.
