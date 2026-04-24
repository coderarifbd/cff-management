const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createManager() {
  const hash = await bcrypt.hash('manager123', 10);
  
  const existing = await prisma.user.findUnique({ where: { email: 'manager@cff.com' } });
  if (existing) {
    await prisma.user.update({ where: { email: 'manager@cff.com' }, data: { password: hash, role: 'MANAGER', status: 'ACTIVE' } });
    console.log('Manager account updated!');
  } else {
    await prisma.user.create({
      data: {
        name: 'CFF Manager',
        email: 'manager@cff.com',
        password: hash,
        role: 'MANAGER',
        status: 'ACTIVE',
      }
    });
    console.log('Manager account created!');
  }
  console.log('Email: manager@cff.com | Password: manager123');
  prisma.$disconnect();
}

createManager();
