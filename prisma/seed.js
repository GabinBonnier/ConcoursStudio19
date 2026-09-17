const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // 1. Création du compte administrateur
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminUsername = process.env.ADMIN_USERNAME || "Admin";

  if (!adminEmail || !adminPassword) {
    console.log(
      "⚠️ ADMIN_EMAIL ou ADMIN_PASSWORD manquant dans l'environnement. Seed admin ignoré.",
    );
  } else {
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existing) {
      console.log("Compte admin déjà existant.");
    } else {
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
  }

  // 2. Injection des données de la FAQ Support
  const faqs = [
    {
      question: "Comment s'inscrire au concours ?",
      answer:
        "Rendez-vous dans la section Inscription de l'association, remplissez la fiche des danseurs et téléversez votre bande son.",
      keywords: "inscription, inscrire, concours, danse, participer, dossier",
    },
    {
      question: "Quels sont les formats audio acceptés ?",
      answer:
        "Les fichiers audio doivent être au format MP3 ou WAV et ne pas dépasser 20 Mo.",
      keywords: "musique, son, audio, format, mp3, wav, bande",
    },
    {
      question: "Comment voter pour une prestation ?",
      answer:
        "Connectez-vous à votre espace votant lors du passage en direct pour attribuer vos notes.",
      keywords: "vote, voter, note, notation, points, jury",
    },
  ];

  for (const faq of faqs) {
    await prisma.faq.create({ data: faq });
  }

  console.log("FAQ injectée avec succès.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
