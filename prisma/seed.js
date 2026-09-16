const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'Admin@admin.com' } });
  if (existing) {
    console.log('Compte admin déjà existant');
    return;
  }
  const hash = await bcrypt.hash('Admin-pwd-access-2026', 12);
  await prisma.user.create({
    data: {
      email: 'Admin@admin.com',
      username: 'Admin',
      password: hash,
      role: 'ADMIN',
    },
  });
  console.log('Compte admin créé : Admin@admin.com');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
