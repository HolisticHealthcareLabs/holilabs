import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function stripDigits(name: string) {
  return (name || '').replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
}

async function main() {
  const patients = await prisma.patient.findMany({
    select: { id: true, firstName: true, lastName: true },
  });

  let updated = 0;

  for (const p of patients) {
    const nextFirst = stripDigits(p.firstName);
    const nextLast = stripDigits(p.lastName);

    if (nextFirst !== p.firstName || nextLast !== p.lastName) {
      await prisma.patient.update({
        where: { id: p.id },
        data: {
          firstName: nextFirst,
          lastName: nextLast,
        },
      });
      updated++;
    }
  }

  console.log(`✅ Cleaned synthetic digits from ${updated}/${patients.length} patients`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


