const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const cleanName = (n) => n.trim().toLowerCase().replace(/^md\.?\s*/, '').trim();

async function main() {
  const files = [
    { name: 'CFF - Installment-21.csv', year: 2021 },
    { name: 'CFF - Installment-22.csv', year: 2022 },
    { name: 'CFF - Installment-23.csv', year: 2023 },
    { name: 'CFF - Installment-24.csv', year: 2024 },
    { name: 'CFF - Installment-25.csv', year: 2025 }
  ];

  const users = await prisma.user.findMany();

  for (const file of files) {
    if (!fs.existsSync(file.name)) {
      console.log('File not found:', file.name);
      continue;
    }
    
    console.log(`Processing Year: ${file.year}...`);
    const lines = fs.readFileSync(file.name, 'utf8').split('\n');
    let added = 0;
    
    for (let i = 6; i < lines.length; i++) {
      const row = lines[i].split(',');
      if (row.length < 26) continue;
      
      const nameStr = row[1] ? row[1].trim() : '';
      if (!nameStr || nameStr.includes('Sub Total') || nameStr.includes('Word in')) continue;
      
      const user = users.find(u => cleanName(u.name) === cleanName(nameStr));
      if (!user) {
        console.log(`User not found in ${file.year}:`, nameStr);
        continue;
      }
      
      for (let m = 1; m <= 12; m++) {
        const amount = parseInt(row[m*2]) || 0;
        const fine = parseInt(row[m*2 + 1]) || 0;
        
        if (amount > 0 || fine > 0) {
          await prisma.payment.upsert({
            where: { userId_month_year: { userId: user.id, month: m, year: file.year } },
            update: { amount, fine },
            create: { 
              userId: user.id, 
              month: m, 
              year: file.year, 
              amount, 
              fine, 
              isPaid: true, 
              paidAt: new Date(`${file.year}-12-31`) 
            }
          });
          added++;
        }
      }
    }
    console.log(`=> Year ${file.year} Done! Added/Updated: ${added} payments`);
  }
  
  console.log('All files imported successfully!');
}

main().catch(console.error).finally(() => process.exit(0));
