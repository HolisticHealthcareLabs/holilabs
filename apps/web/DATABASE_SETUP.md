# 🗄️ Database Setup Guide - Holi Labs

This guide walks you through setting up the **hybrid database architecture** with Prisma + PostgreSQL + Supabase + Blockchain-ready infrastructure.

---

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│           Your App (Next.js on DigitalOcean)         │
└──────────────┬──────────────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌──────────────┐  ┌──────────────────┐
│  Supabase    │  │  PostgreSQL      │
│  (Auth, RT)  │  │  (Prisma - PHI)  │
│              │  │                  │
│ - Users      │  │ - Patients       │
│ - Sessions   │  │ - Prescriptions  │
│ - Profiles   │  │ - Consents       │
│ - Files      │  │ - Documents      │
└──────────────┘  └────────┬─────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Blockchain  │
                    │   (Future)   │
                    │              │
                    │ - Hashes     │
                    │ - Ownership  │
                    └──────────────┘
```

---

## 🚀 Quick Start (3 Options)

### Option A: Local PostgreSQL (Development)

**1. Install PostgreSQL:**
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt-get install postgresql-15
sudo systemctl start postgresql
```

**2. Create Database:**
```bash
psql postgres
```

```sql
CREATE DATABASE holi_labs;
CREATE USER holi_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE holi_labs TO holi_admin;
\q
```

**3. Update .env.local:**
```env
DATABASE_URL="postgresql://holi_admin:your_secure_password@localhost:5432/holi_labs?schema=public"
```

**4. Run Migrations:**
```bash
pnpm prisma migrate dev --name init
pnpm prisma generate
```

---

### Option B: DigitalOcean Managed Database (Production)

**1. Create Managed PostgreSQL Database:**
- Go to https://cloud.digitalocean.com/databases
- Click "Create Database Cluster"
- Choose: PostgreSQL 15
- Plan: Basic ($15/mo for 1GB RAM, 10GB storage)
- Datacenter: Same region as your app

**2. Get Connection String:**
- Click on your database → "Connection Details"
- Copy the "Connection String" format

**3. Update .env.local:**
```env
DATABASE_URL="postgresql://doadmin:PASSWORD@db-postgresql-nyc3-12345.ondigitalocean.com:25060/holi_labs?sslmode=require"
```

**4. Add Trusted Sources:**
- Go to "Settings" → "Trusted Sources"
- Add your app's IP or "0.0.0.0/0" (for development only)

**5. Run Migrations:**
```bash
pnpm prisma migrate deploy
pnpm prisma generate
```

---

### Option C: Supabase Database (All-in-One)

**1. Create Supabase Project:**
- Go to https://supabase.com/dashboard
- Click "New Project"
- Choose: Free tier (500MB storage, 2 CPU hours)

**2. Get Database URL:**
- Go to "Settings" → "Database"
- Copy "Connection string" → "URI"

**3. Update .env.local:**
```env
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

**4. Run Migrations:**
```bash
pnpm prisma migrate deploy
pnpm prisma generate
```

---

## 📝 Prisma Commands Cheat Sheet

```bash
# Generate Prisma Client (after schema changes)
pnpm prisma generate

# Create a new migration
pnpm prisma migrate dev --name your_migration_name

# Apply migrations to production
pnpm prisma migrate deploy

# Reset database (⚠️ DELETES ALL DATA)
pnpm prisma migrate reset

# Open Prisma Studio (Database GUI)
pnpm prisma studio

# Format schema file
pnpm prisma format

# Validate schema
pnpm prisma validate

# Pull schema from existing database
pnpm prisma db pull

# Push schema to database (without migration)
pnpm prisma db push
```

---

## 🔐 Supabase Setup

### 1. Enable Email Auth

```sql
-- Run in Supabase SQL Editor
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
ON auth.users
FOR SELECT
USING (auth.uid() = id);
```

### 2. Enable MFA (Multi-Factor Authentication)

- Go to "Authentication" → "Providers"
- Enable "Phone" for SMS-based MFA
- Or enable "Authenticator App" for TOTP

### 3. Set up Storage Bucket

```sql
-- Create bucket for de-identified documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-documents', 'patient-documents', false);

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can upload
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'patient-documents');

-- Policy: Users can only access their own documents
CREATE POLICY "Users can access own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'patient-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 🔗 Blockchain Setup (Optional - Future)

### 1. Install Polygon/Ethereum Wallet

```bash
npm install -g @metamask/cli
```

### 2. Get Test MATIC (Polygon Mumbai Testnet)

- Go to https://faucet.polygon.technology/
- Paste your wallet address
- Receive test MATIC

### 3. Deploy Smart Contract

```solidity
// contracts/HealthRecords.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HealthRecords {
    struct Record {
        bytes32 dataHash;
        uint256 timestamp;
        bool exists;
    }

    mapping(string => Record) public records;

    event RecordStored(string indexed recordId, bytes32 dataHash, uint256 timestamp);

    function recordConsent(string memory recordId, bytes32 consentHash, address patientWallet)
        external
        returns (bytes32)
    {
        records[recordId] = Record(consentHash, block.timestamp, true);
        emit RecordStored(recordId, consentHash, block.timestamp);
        return consentHash;
    }

    function verifyRecord(string memory recordId)
        external
        view
        returns (bytes32, uint256, bool)
    {
        Record memory record = records[recordId];
        return (record.dataHash, record.timestamp, record.exists);
    }
}
```

### 4. Deploy with Hardhat

```bash
# Install Hardhat
npm install --save-dev hardhat

# Deploy to Polygon Mumbai
npx hardhat run scripts/deploy.js --network mumbai
```

### 5. Update .env.local

```env
ENABLE_BLOCKCHAIN=true
POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com
HEALTH_CONTRACT_ADDRESS=0xYourDeployedContractAddress
BLOCKCHAIN_PRIVATE_KEY=your_deployer_private_key
```

---

## 📊 Database Seeding

Create seed data for development:

```bash
# Create seed script
cat > prisma/seed.ts <<EOF
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test clinician
  const clinician = await prisma.user.create({
    data: {
      email: 'doctor@holilabs.com',
      firstName: 'Dr. Carlos',
      lastName: 'Ramírez',
      role: 'CLINICIAN',
      specialty: 'Cardiología',
      licenseNumber: '12345678',
    },
  });

  // Create test patient
  const patient = await prisma.patient.create({
    data: {
      firstName: 'María',
      lastName: 'González García',
      dateOfBirth: new Date('1985-06-15'),
      gender: 'F',
      email: 'maria.gonzalez@example.com',
      phone: '+52 55 1234 5678',
      mrn: 'MRN-2024-001',
      tokenId: 'PT-892a-4f3e-b1c2',
      ageBand: '30-39',
      region: 'CDMX',
      assignedClinicianId: clinician.id,
    },
  });

  console.log('✅ Seed data created:', { clinician, patient });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.\$disconnect();
  });
EOF

# Run seed
pnpm prisma db seed
```

---

## 🔍 Troubleshooting

### Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT version();"

# Check Prisma connection
pnpm prisma db pull
```

### Migration Errors

```bash
# Reset and start fresh (⚠️ DELETES DATA)
pnpm prisma migrate reset

# Force push schema (skip migrations)
pnpm prisma db push --force-reset
```

### Supabase Issues

```bash
# Test Supabase connection
curl $NEXT_PUBLIC_SUPABASE_URL/rest/v1/ \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

---

## 🎯 Next Steps

1. ✅ Choose your database option (A, B, or C)
2. ✅ Run migrations
3. ✅ Seed test data
4. ✅ Set up Supabase (if using hybrid approach)
5. ✅ Configure blockchain (optional, for future)
6. ✅ Test connection with Prisma Studio

---

## 📚 Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [DigitalOcean Managed Databases](https://www.digitalocean.com/products/managed-databases)
- [Polygon Docs](https://docs.polygon.technology/)

---

**Need Help?** Check the main README or open an issue on GitHub.
