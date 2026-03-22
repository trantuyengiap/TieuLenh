import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertSuperadmin() {
  const username = process.env.DEFAULT_SUPERADMIN_USERNAME || 'superadmin';
  const password = process.env.DEFAULT_SUPERADMIN_PASSWORD || 'Admin@123456';
  const fullName = process.env.DEFAULT_SUPERADMIN_NAME || 'System Superadmin';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    update: {
      fullName,
      role: Role.SUPERADMIN,
      status: 'ACTIVE',
      passwordHash,
    },
    create: {
      username,
      fullName,
      role: Role.SUPERADMIN,
      status: 'ACTIVE',
      passwordHash,
    },
  });
}

async function ensureDefaultLedState() {
  await prisma.appSetting.upsert({
    where: { key: 'led_state' },
    update: {},
    create: {
      key: 'led_state',
      value: {
        status: 'idle',
        sessionId: null,
        employee: null,
        commandSet: null,
        updatedAt: new Date().toISOString(),
      },
    },
  });
}

async function main() {
  await upsertSuperadmin();
  await ensureDefaultLedState();
  console.log('Seeded default superadmin and LED state.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
