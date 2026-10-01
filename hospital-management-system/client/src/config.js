import { api } from './api';

// Each entry drives one full CRUD screen (see Resource.jsx).
// roles = who may add/edit/delete (must match the server rules).
const T = (label, name, o = {}) => ({ label, name, type: 'text', ...o });
const P = T('Patient', 'patientId', { type: 'ref', ref: 'patients', required: 1 });
const D = T('Doctor', 'doctorId', { type: 'ref', ref: 'doctors', required: 1 });
const when = (v) => (v ? new Date(v).toLocaleString() : '');
const save = (name, text) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = name;
  a.click();
};

export const REF_LABEL = {
  patients: (r) => `#${r.id} ${r.name}`,
  doctors: (r) => `${r.name} (${r.specialization})`,
  departments: (r) => r.name,
  labtests: (r) => `${r.name} - ${r.price}`,
  beds: (r) => `Room ${r.room.number} / ${r.label}`,
  rooms: (r) => `Room ${r.number} (${r.type})`,
};

const ADMIN = ['ADMIN'];
export const RESOURCES = [
  {
    key: 'patients', title: 'Patients', roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR'],
    fields: [
      T('Name', 'name', { required: 1 }),
      T('Age', 'age', { type: 'number', required: 1 }),
      T('Gender', 'gender', { type: 'select', options: ['Male', 'Female', 'Other'], required: 1 }),
      T('Phone', 'phone'),
      T('Blood group', 'bloodGroup', { type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] }),
      T('Address', 'address'),
      T('Medical history', 'medicalHistory', { type: 'textarea' }),
      T('Active', 'active', { type: 'checkbox', def: true }),
    ],
    columns: [['ID', (r) => r.id], ['Name', (r) => r.name], ['Age', (r) => r.age], ['Gender', (r) => r.gender],
      ['Blood group', (r) => r.bloodGroup], ['Phone', (r) => r.phone], ['Status', (r) => (r.active ? 'Active' : 'Inactive')]],
  },
  {
    key: 'doctors', title: 'Doctors', roles: ADMIN,
    fields: [
      T('Name', 'name', { required: 1 }),
      T('Specialization', 'specialization', { required: 1 }),
      T('Department', 'departmentId', { type: 'ref', ref: 'departments', required: 1 }),
      T('Phone', 'phone'),
      T('Availability', 'availability', { hint: 'e.g. Mon-Fri 10:00-16:00' }),
      T('Active', 'active', { type: 'checkbox', def: true }),
    ],
    columns: [['ID', (r) => r.id], ['Name', (r) => r.name], ['Specialization', (r) => r.specialization],
      ['Department', (r) => r.department?.name], ['Availability', (r) => r.availability], ['Status', (r) => (r.active ? 'Active' : 'Inactive')]],
  },
  {
    key: 'departments', title: 'Departments', roles: ADMIN,
    fields: [T('Name', 'name', { required: 1 }), T('Description', 'description')],
    columns: [['ID', (r) => r.id], ['Name', (r) => r.name], ['Description', (r) => r.description]],
  },
  {
    key: 'appointments', title: 'Appointments', roles: ['ADMIN', 'RECEPTIONIST'],
    fields: [P, D, T('Date and time', 'date', { type: 'datetime', required: 1 }), T('Reason', 'reason'),
      T('Status', 'status', { type: 'select', options: ['SCHEDULED', 'COMPLETED', 'CANCELLED'], def: 'SCHEDULED', required: 1 })],
    columns: [['ID', (r) => r.id], ['Patient', (r) => r.patient?.name], ['Doctor', (r) => r.doctor?.name],
      ['Date', (r) => when(r.date)], ['Reason', (r) => r.reason], ['Status', (r) => r.status]],
    actions: [
      { label: 'Complete', show: (r) => r.status === 'SCHEDULED', run: (r) => api('/appointments/' + r.id, 'PUT', { status: 'COMPLETED' }) },
      { label: 'Cancel', show: (r) => r.status === 'SCHEDULED', run: (r) => api('/appointments/' + r.id, 'PUT', { status: 'CANCELLED' }) },
    ],
  },
  {
    key: 'consultations', title: 'Consultations', roles: ['ADMIN', 'DOCTOR'],
    fields: [P, D, T('Symptoms', 'symptoms', { type: 'textarea', required: 1 }), T('Diagnosis', 'diagnosis', { type: 'textarea' }),
      T("Doctor's notes", 'notes', { type: 'textarea' }), T('Treatment', 'treatment', { type: 'textarea' })],
    columns: [['ID', (r) => r.id], ['Date', (r) => when(r.createdAt)], ['Patient', (r) => r.patient?.name], ['Doctor', (r) => r.doctor?.name],
      ['Symptoms', (r) => r.symptoms], ['Diagnosis', (r) => r.diagnosis], ['Treatment', (r) => r.treatment]],
  },
  {
    key: 'prescriptions', title: 'Prescriptions', roles: ['ADMIN', 'DOCTOR'],
    fields: [P, D, T('Medicines', 'medicines', { type: 'textarea', required: 1, hint: 'One per line: Medicine | Dosage | Duration' })],
    columns: [['ID', (r) => r.id], ['Date', (r) => when(r.createdAt)], ['Patient', (r) => r.patient?.name], ['Doctor', (r) => r.doctor?.name],
      ['Medicines (dosage, duration)', (r) => r.medicines.replace(/\n/g, '; ')]],
  },
  {
    key: 'labtests', title: 'Lab Tests', roles: ['ADMIN', 'LAB'],
    fields: [T('Test name', 'name', { required: 1 }), T('Price', 'price', { type: 'number', required: 1 })],
    columns: [['ID', (r) => r.id], ['Test', (r) => r.name], ['Price', (r) => r.price]],
  },
  {
    key: 'laborders', title: 'Lab Orders', roles: ['ADMIN', 'DOCTOR', 'LAB'],
    fields: [P, T('Test', 'labTestId', { type: 'ref', ref: 'labtests', required: 1 }),
      T('Status', 'status', { type: 'select', options: ['PENDING', 'COMPLETED'], def: 'PENDING', required: 1 }),
      T('Result', 'result', { type: 'textarea' })],
    columns: [['ID', (r) => r.id], ['Date', (r) => when(r.createdAt)], ['Patient', (r) => r.patient?.name], ['Test', (r) => r.labTest?.name],
      ['Status', (r) => r.status], ['Result', (r) => r.result]],
    actions: [{
      label: 'Download report', open: true, local: true, show: (r) => r.status === 'COMPLETED',
      run: (r) => save(`lab-report-${r.id}.txt`, `LAB REPORT\n\nPatient: ${r.patient.name}\nTest: ${r.labTest.name}\nDate: ${when(r.createdAt)}\n\nResult:\n${r.result || ''}\n`),
    }],
  },
  {
    key: 'rooms', title: 'Rooms', roles: ADMIN,
    fields: [T('Room number', 'number', { required: 1 }), T('Type', 'type', { type: 'select', options: ['General', 'Semi-private', 'Private', 'ICU'], required: 1 })],
    columns: [['ID', (r) => r.id], ['Room', (r) => r.number], ['Type', (r) => r.type]],
  },
  {
    key: 'beds', title: 'Beds', roles: ADMIN,
    fields: [T('Room', 'roomId', { type: 'ref', ref: 'rooms', required: 1 }), T('Bed label', 'label', { required: 1 })],
    columns: [['ID', (r) => r.id], ['Bed', (r) => r.label], ['Room', (r) => r.room?.number], ['Type', (r) => r.room?.type],
      ['Status', (r) => (r.occupied ? 'Occupied' : 'Available')]],
  },
  {
    key: 'admissions', title: 'Admissions', roles: ['ADMIN', 'RECEPTIONIST'], noEdit: true, noDelete: true,
    fields: [P, T('Bed (available only)', 'bedId', { type: 'ref', ref: 'beds', required: 1, filter: (b) => !b.occupied })],
    columns: [['ID', (r) => r.id], ['Patient', (r) => r.patient?.name], ['Room', (r) => r.bed?.room?.number], ['Bed', (r) => r.bed?.label],
      ['Admitted', (r) => when(r.admittedAt)], ['Discharged', (r) => when(r.dischargedAt) || 'Currently admitted']],
    actions: [{ label: 'Discharge', show: (r) => !r.dischargedAt, run: (r) => api(`/admissions/${r.id}/discharge`, 'POST', {}) }],
  },
  {
    key: 'bills', title: 'Billing', roles: ['ADMIN', 'BILLING'],
    fields: [P,
      T('Consultation charges', 'consultationFee', { type: 'number', def: 0 }),
      T('Laboratory charges', 'labCharges', { type: 'number', def: 0 }),
      T('Medicine charges', 'medicineCharges', { type: 'number', def: 0 }),
      T('Other charges', 'otherCharges', { type: 'number', def: 0 }),
      T('Payment status', 'status', { type: 'select', options: ['PENDING', 'PAID'], def: 'PENDING', required: 1 })],
    columns: [['Bill', (r) => r.id], ['Date', (r) => when(r.createdAt)], ['Patient', (r) => r.patient?.name], ['Consultation', (r) => r.consultationFee],
      ['Lab', (r) => r.labCharges], ['Medicine', (r) => r.medicineCharges], ['Other', (r) => r.otherCharges], ['Total', (r) => r.total], ['Payment', (r) => r.status]],
    actions: [{ label: 'Mark paid', show: (r) => r.status !== 'PAID', run: (r) => api('/bills/' + r.id, 'PUT', { status: 'PAID' }) }],
  },
  {
    key: 'users', title: 'Users', roles: ADMIN, readRoles: ADMIN,
    fields: [T('Name', 'name', { required: 1 }), T('Email', 'email', { type: 'email', required: 1 }),
      T('Password', 'password', { type: 'password', reqNew: 1, hint: 'Leave blank to keep the current password' }),
      T('Role', 'role', { type: 'select', options: ['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'LAB', 'BILLING'], required: 1 })],
    columns: [['ID', (r) => r.id], ['Name', (r) => r.name], ['Email', (r) => r.email], ['Role', (r) => r.role]],
  },
];
