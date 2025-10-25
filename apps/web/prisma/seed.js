"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const hashing_1 = require("../src/lib/blockchain/hashing");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    // Create test clinician
    const clinician = await prisma.user.upsert({
        where: { email: 'doctor@holilabs.com' },
        update: {},
        create: {
            email: 'doctor@holilabs.com',
            firstName: 'Dr. Carlos',
            lastName: 'Ramírez',
            role: 'CLINICIAN',
            specialty: 'Cardiología',
            licenseNumber: '12345678',
            mfaEnabled: false,
        },
    });
    console.log('✅ Created clinician:', clinician.email);
    // Create test patient with blockchain-ready fields
    const patient = await prisma.patient.upsert({
        where: { mrn: 'MRN-2024-001' },
        update: {},
        create: {
            firstName: 'María',
            lastName: 'González García',
            dateOfBirth: new Date('1985-06-15'),
            gender: 'F',
            email: 'maria.gonzalez@example.com',
            phone: '+52 55 1234 5678',
            address: 'Av. Reforma 123, Col. Juárez',
            city: 'Ciudad de México',
            state: 'CDMX',
            postalCode: '06600',
            country: 'MX',
            mrn: 'MRN-2024-001',
            tokenId: 'PT-892a-4f3e-b1c2',
            ageBand: '30-39',
            region: 'CDMX',
            assignedClinicianId: clinician.id,
            // Generate hash for blockchain verification
            dataHash: (0, hashing_1.generatePatientDataHash)({
                id: 'temp',
                firstName: 'María',
                lastName: 'González García',
                dateOfBirth: '1985-06-15',
                mrn: 'MRN-2024-001',
            }),
            lastHashUpdate: new Date(),
        },
    });
    console.log('✅ Created patient:', patient.tokenId);
    // Create PatientUser for authentication (NEW - for patient portal login)
    const patientUser = await prisma.patientUser.upsert({
        where: { email: 'maria.gonzalez@example.com' },
        update: {},
        create: {
            email: 'maria.gonzalez@example.com',
            patientId: patient.id,
            emailVerifiedAt: new Date(),
            mfaEnabled: false,
        },
    });
    console.log('✅ Created patient user for login:', patientUser.email);
    // Create medications
    const medications = await prisma.medication.createMany({
        data: [
            {
                patientId: patient.id,
                name: 'Metformina',
                genericName: 'Metformina HCl',
                dose: '500mg',
                frequency: '2x/día',
                route: 'oral',
                instructions: 'Tomar con alimentos',
                isActive: true,
                prescribedBy: clinician.id,
            },
            {
                patientId: patient.id,
                name: 'Enalapril',
                genericName: 'Enalapril maleato',
                dose: '10mg',
                frequency: '1x/día',
                route: 'oral',
                instructions: 'Tomar en la mañana',
                isActive: true,
                prescribedBy: clinician.id,
            },
        ],
    });
    console.log('✅ Created medications:', medications.count);
    // Create a test appointment
    const appointment = await prisma.appointment.create({
        data: {
            patientId: patient.id,
            clinicianId: clinician.id,
            title: 'Control de Diabetes',
            description: 'Revisión de glucosa y ajuste de medicación',
            startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
            endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // 30 min duration
            type: 'IN_PERSON',
            status: 'SCHEDULED',
        },
    });
    console.log('✅ Created appointment:', appointment.id);
    // Create audit log
    const auditLog = await prisma.auditLog.create({
        data: {
            userId: clinician.id,
            userEmail: clinician.email,
            ipAddress: '127.0.0.1',
            action: 'CREATE',
            resource: 'Patient',
            resourceId: patient.id,
            success: true,
        },
    });
    console.log('✅ Created audit log:', auditLog.id);
    console.log('\n🎉 Database seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - 1 Clinician (${clinician.email})`);
    console.log(`   - 1 Patient (${patient.tokenId})`);
    console.log(`   - 1 Patient User (${patientUser.email})`);
    console.log(`   - 2 Medications`);
    console.log(`   - 1 Appointment`);
    console.log(`   - 1 Audit Log`);
    console.log('\n💡 Test the app:');
    console.log(`   - Clinician Dashboard: http://localhost:3000/dashboard/patients/${patient.id}`);
    console.log(`   - Patient Portal Login: http://localhost:3000/portal/login`);
    console.log(`   - Use email: ${patientUser.email}`);
}
main()
    .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map