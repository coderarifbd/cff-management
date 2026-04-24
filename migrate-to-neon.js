/**
 * SQLite → Neon PostgreSQL Data Migration Script
 * Reads all data from local dev.db and inserts into Neon
 */
const { PrismaClient: PrismaPostgres } = require('@prisma/client');
const Database = require('better-sqlite3');
const path = require('path');

const neon = new PrismaPostgres();
const sqlite = new Database(path.join(__dirname, 'prisma', 'dev.db'));

async function migrate() {
  console.log('🚀 Starting migration: SQLite → Neon PostgreSQL\n');

  // 1. USERS
  console.log('📦 Migrating Users...');
  const users = sqlite.prepare('SELECT * FROM User').all();
  for (const u of users) {
    await neon.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        id: u.id,
        memberNo: u.memberNo || null,
        name: u.name,
        email: u.email,
        password: u.password,
        phone: u.phone || null,
        role: u.role,
        status: u.status,
        bannedAt: u.bannedAt ? new Date(u.bannedAt) : null,
        joinDate: new Date(u.joinDate),
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
      }
    });
  }
  console.log(`   ✅ ${users.length} users migrated`);

  // 2. PAYMENTS
  console.log('📦 Migrating Payments...');
  const payments = sqlite.prepare('SELECT * FROM Payment').all();
  for (const p of payments) {
    await neon.payment.upsert({
      where: { userId_month_year: { userId: p.userId, month: p.month, year: p.year } },
      update: {},
      create: {
        id: p.id,
        userId: p.userId,
        month: p.month,
        year: p.year,
        amount: p.amount,
        fine: p.fine || 0,
        isPaid: p.isPaid === 1 || p.isPaid === true,
        paidAt: p.paidAt ? new Date(p.paidAt) : null,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      }
    });
  }
  console.log(`   ✅ ${payments.length} payments migrated`);

  // 3. INVESTMENTS
  console.log('📦 Migrating Investments...');
  const investments = sqlite.prepare('SELECT * FROM Investment').all();
  for (const inv of investments) {
    await neon.investment.upsert({
      where: { id: inv.id },
      update: {},
      create: {
        id: inv.id,
        title: inv.title,
        type: inv.type,
        amount: inv.amount,
        profit: inv.profit || 0,
        refund: inv.refund || 0,
        status: inv.status,
        date: new Date(inv.date),
        documentUrl: inv.documentUrl || null,
        createdAt: new Date(inv.createdAt),
        updatedAt: new Date(inv.updatedAt),
      }
    });
  }
  console.log(`   ✅ ${investments.length} investments migrated`);

  // 4. INVESTMENT PROFITS
  console.log('📦 Migrating Investment Profits...');
  const profits = sqlite.prepare('SELECT * FROM InvestmentProfit').all();
  for (const p of profits) {
    await neon.investmentProfit.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        investmentId: p.investmentId,
        amount: p.amount,
        date: new Date(p.date),
        note: p.note || null,
        createdAt: new Date(p.createdAt),
      }
    });
  }
  console.log(`   ✅ ${profits.length} investment profits migrated`);

  // 5. EXPENSES
  console.log('📦 Migrating Expenses...');
  const expenses = sqlite.prepare('SELECT * FROM Expense').all();
  for (const e of expenses) {
    await neon.expense.upsert({
      where: { id: e.id },
      update: {},
      create: {
        id: e.id,
        category: e.category,
        amount: e.amount,
        description: e.description || null,
        date: new Date(e.date),
        receiptUrl: e.receiptUrl || null,
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
      }
    });
  }
  console.log(`   ✅ ${expenses.length} expenses migrated`);

  console.log('\n🎉 Migration complete! All data is now on Neon PostgreSQL.');
  console.log(`   Users: ${users.length}`);
  console.log(`   Payments: ${payments.length}`);
  console.log(`   Investments: ${investments.length}`);
  console.log(`   Investment Profits: ${profits.length}`);
  console.log(`   Expenses: ${expenses.length}`);
}

migrate()
  .catch(e => { console.error('❌ Migration failed:', e.message); process.exit(1); })
  .finally(() => { neon.$disconnect(); sqlite.close(); });
