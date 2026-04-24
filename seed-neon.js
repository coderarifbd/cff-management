const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding Neon PostgreSQL...');

  const adminHash = await bcrypt.hash('admin1234', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cff.com' },
    update: { password: adminHash, role: 'ADMIN', status: 'ACTIVE' },
    create: { name: 'System Admin', email: 'admin@cff.com', password: adminHash, role: 'ADMIN', status: 'ACTIVE' }
  });
  console.log('Admin created:', admin.email);

  const managerHash = await bcrypt.hash('manager123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@cff.com' },
    update: { password: managerHash, role: 'MANAGER', status: 'ACTIVE' },
    create: { name: 'CFF Manager', email: 'manager@cff.com', password: managerHash, role: 'MANAGER', status: 'ACTIVE' }
  });
  console.log('Manager created:', manager.email);

  console.log('\nDone! Login credentials:');
  console.log('Admin:   admin@cff.com / admin1234');
  console.log('Manager: manager@cff.com / manager123');
  prisma.$disconnect();
}
seed().catch(e => { console.error(e); process.exit(1); });
