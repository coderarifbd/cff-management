const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

prisma.user.findUnique({ where: { email: 'coder.arifbd@gmail.com' } }).then(async (u) => {
  if (!u) { console.log('User NOT found'); return; }
  console.log('User:', u.name, '| Status:', u.status, '| Role:', u.role);
  console.log('Password hash set:', u.password ? 'YES' : 'NO');
  const match = await bcrypt.compare('cff1234', u.password);
  console.log('Password match:', match ? 'YES ✓' : 'NO ✗');
  prisma.$disconnect();
});
