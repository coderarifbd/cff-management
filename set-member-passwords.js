const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function setPasswords() {
  const hash = await bcrypt.hash('cff1234', 10);
  const result = await prisma.user.updateMany({
    where: { role: 'MEMBER' },
    data: { password: hash }
  });
  console.log('Updated', result.count, 'members with default password: cff1234');
}

setPasswords().finally(() => prisma.$disconnect());
