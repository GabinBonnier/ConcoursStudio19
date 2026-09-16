const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminUsername = process.env.ADMIN_USERNAME || "Admin";

  if (!adminEmail || !adminPassword) {
    console.log(
      "⚠️ ADMIN_EMAIL ou ADMIN_PASSWORD manquant dans l'environnement. Seed ignoré.",
    );
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (existing) {
    console.log("Compte admin déjà existant");
    return;
  }

  const hash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.create({
    data: {
      email: adminEmail,
      username: adminUsername,
      password: hash,
      role: "ADMIN",
    },
  });
  console.log(`Compte admin créé : ${adminEmail}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
