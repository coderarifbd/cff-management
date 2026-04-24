/**
 * CFF Database Seed Script
 * Run: npx prisma db seed
 * This creates the initial admin account on a fresh PostgreSQL database.
 * All other data (members, payments, etc.) should be added via the dashboard.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CFF database...');

  // Create Admin
  const adminPassword = await bcrypt.hash('admin1234', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cff.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@cff.com',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Admin created:', admin.email);

  // Create Manager
  const managerPassword = await bcrypt.hash('manager123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@cff.com' },
    update: {},
    create: {
      name: 'CFF Manager',
      email: 'manager@cff.com',
      password: managerPassword,
      role: 'MANAGER',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Manager created:', manager.email);

  console.log('\n🎉 Seed complete!');
  console.log('Admin login: admin@cff.com / admin1234');
  console.log('Manager login: manager@cff.com / manager123');
  console.log('\n⚠️  IMPORTANT: Change these passwords immediately after first login!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
