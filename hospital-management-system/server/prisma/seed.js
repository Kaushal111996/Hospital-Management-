import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const p = new PrismaClient();
if (await p.user.count()) {
  console.log('Database already has data - skipping seed.');
  process.exit(0);
}

const pw = bcrypt.hashSync('admin123', 8);
await p.user.createMany({
  data: [
    { name: 'Admin', email: 'admin@hospital.com', password: pw, role: 'ADMIN' },
    { name: 'Dr. Smith', email: 'doctor@hospital.com', password: pw, role: 'DOCTOR' },
    { name: 'Reception', email: 'reception@hospital.com', password: pw, role: 'RECEPTIONIST' },
    { name: 'Lab Technician', email: 'lab@hospital.com', password: pw, role: 'LAB' },
    { name: 'Billing Clerk', email: 'billing@hospital.com', password: pw, role: 'BILLING' },
  ],
});

const gm = await p.department.create({ data: { name: 'General Medicine', description: 'Primary care' } });
await p.department.create({ data: { name: 'Cardiology', description: 'Heart and circulation' } });
await p.doctor.create({
  data: { name: 'Dr. Smith', specialization: 'Physician', phone: '9000000001', availability: 'Mon-Fri 10:00-16:00', departmentId: gm.id },
});
await p.patient.create({ data: { name: 'Sample Patient', age: 30, gender: 'Male', phone: '9000000002' } });
await p.labTest.createMany({ data: [{ name: 'Complete Blood Count', price: 300 }, { name: 'Blood Sugar', price: 100 }] });
const room = await p.room.create({ data: { number: '101', type: 'General' } });
await p.bed.createMany({ data: [{ label: 'B1', roomId: room.id }, { label: 'B2', roomId: room.id }] });
console.log('Seeded. Login: admin@hospital.com / admin123');
