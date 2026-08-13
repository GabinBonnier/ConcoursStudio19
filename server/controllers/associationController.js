const prisma = require("../lib/prisma");
const { cloudinary } = require("../lib/cloudinary");
const {
  sendNewDepotNotification,
  sendMusiqueModifieeNotification,
  sendNouveauGroupeNotification,
} = require("../services/mail");

const DATE_LIMITE_GLOBALE = new Date("2026-06-15");

function renameFile(originalname, nomGroupe, categorie) {
  const ext = originalname.split(".").pop();
  const baseName = originalname.replace(/\.[^/.]+$/, "").replace(/\s+/g, "_");
  const groupe = nomGroupe.replace(/\s+/g, "_");
  const cat = categorie.replace(/\s+/g, "_");
  return `${groupe}_${cat}_${baseName}.${ext}`;
}

async function getMyAssociation(req, res) {
  const association = await prisma.association.findUnique({
    where: { userId: req.user.id },
    include: {
      groupes: {
        include: { musiques: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!association)
    return res.status(404).json({ error: "Association introuvable" });
  res.json(association);
}

async function createGroupe(req, res) {
  const { nom, categorie, couleur } = req.body;
  if (!nom || !categorie) {
    return res.status(400).json({ error: "Nom et catégorie requis" });
  }
  const association = await prisma.association.findUnique({
    where: { userId: req.user.id },
    include: { _count: { select: { groupes: true } } },
  });
  if (!association)
    return res.status(404).json({ error: "Association introuvable" });
  if (association._count.groupes >= association.quotaMax) {
    return res.status(403).json({ error: "Quota de groupes atteint" });
  }
  let musiqueData = null;
  let statut = "EN_ATTENTE";
  if (req.file) {
    let duration = null;
    try {
      const publicId = req.file.filename || req.file.public_id;
      const info = await cloudinary.api.resource(publicId, {
        resource_type: "video",
        image_metadata: true,
        media_metadata: true,
      });
      duration = info.duration ? Math.round(info.duration) : null;
    } catch {}
    musiqueData = {
      filename: req.file.filename || req.file.public_id,
      originalName: renameFile(req.file.originalname, nom, categorie),
      cloudinaryId: req.file.public_id || req.file.filename || "unknown",
      url: req.file.path,
      duration,
    };
    statut = "PUBLIE";
  }
  const groupe = await prisma.groupe.create({
    data: {
      nom,
      categorie,
      statut,
      couleur: couleur || null,
      dateLimite: DATE_LIMITE_GLOBALE,
      associationId: association.id,
      ...(musiqueData && { musiques: { create: musiqueData } }),
    },
    include: { musiques: true },
  });
  await prisma.notification.create({
    data: {
      type: "NOUVEAU_GROUPE",
      titre: `Nouveau groupe — ${nom}`,
      message: `${association.nom} a créé le groupe ${nom} (${categorie}).`,
      groupeId: groupe.id,
      associationId: association.id,
    },
  });
  await sendNouveauGroupeNotification({
    nomGroupe: nom,
    categorie,
    nomAssociation: association.nom,
  });
  res.status(201).json(groupe);
}

async function getGroupe(req, res) {
  const association = await prisma.association.findUnique({
    where: { userId: req.user.id },
  });
  if (!association)
    return res.status(404).json({ error: "Association introuvable" });
  const groupe = await prisma.groupe.findFirst({
    where: { id: req.params.id, associationId: association.id },
    include: { musiques: { orderBy: { createdAt: "desc" } } },
  });
  if (!groupe) return res.status(404).json({ error: "Groupe introuvable" });
  res.json(groupe);
}

async function updateGroupe(req, res) {
  const { nom, categorie, couleur } = req.body;
  const association = await prisma.association.findUnique({
    where: { userId: req.user.id },
  });
  const groupe = await prisma.groupe.findFirst({
    where: { id: req.params.id, associationId: association.id },
  });
  if (!groupe) return res.status(404).json({ error: "Groupe introuvable" });
  const updated = await prisma.groupe.update({
    where: { id: req.params.id },
    data: {
      ...(nom && { nom }),
      ...(categorie && { categorie }),
      ...(couleur !== undefined && { couleur: couleur || null }),
    },
  });
  res.json(updated);
}

async function uploadMusique(req, res) {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
  const association = await prisma.association.findUnique({
    where: { userId: req.user.id },
  });
  const groupe = await prisma.groupe.findFirst({
    where: { id: req.params.id, associationId: association.id },
    include: { musiques: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!groupe) return res.status(404).json({ error: "Groupe introuvable" });
  if (groupe.dateLimite && new Date() > new Date(groupe.dateLimite)) {
    await cloudinary.uploader.destroy(req.file.public_id, {
      resource_type: "video",
    });
    return res
      .status(403)
      .json({ error: "La date limite de dépôt est dépassée" });
  }
  const isUpdate = groupe.musiques.length > 0;
  const publicId = req.file.public_id || req.file.filename || "unknown";

  let duration = null;
  try {
    const info = await cloudinary.api.resource(publicId, {
      resource_type: "video",
      image_metadata: true,
      media_metadata: true,
    });
    duration = info.duration ? Math.round(info.duration) : null;
  } catch (e) {
    console.log("cloudinary error:", e.message);
  }

  const musique = await prisma.musique.create({
    data: {
      filename: req.file.filename || publicId,
      originalName: renameFile(
        req.file.originalname,
        groupe.nom,
        groupe.categorie,
      ),
      cloudinaryId: publicId,
      url: req.file.path,
      duration,
      groupeId: groupe.id,
    },
  });
  await prisma.groupe.update({
    where: { id: groupe.id },
    data: { statut: "PUBLIE" },
  });
  const notifTitre = isUpdate
    ? `Musique modifiée — ${groupe.nom}`
    : `Nouveau dépôt — ${groupe.nom}`;
  const notifMessage = `${association.nom} a ${isUpdate ? "remplacé" : "déposé"} la musique du groupe ${groupe.nom} (${groupe.categorie}).`;
  await prisma.notification.create({
    data: {
      type: isUpdate ? "MUSIQUE_MODIFIEE" : "NOUVEAU_DEPOT",
      titre: notifTitre,
      message: notifMessage,
      groupeId: groupe.id,
      associationId: association.id,
    },
  });
  if (isUpdate) {
    await sendMusiqueModifieeNotification({
      nomGroupe: groupe.nom,
      categorie: groupe.categorie,
      nomAssociation: association.nom,
    });
  } else {
    await sendNewDepotNotification({
      nomGroupe: groupe.nom,
      categorie: groupe.categorie,
      nomAssociation: association.nom,
    });
  }
  res.status(201).json(musique);
}

module.exports = {
  getMyAssociation,
  createGroupe,
  getGroupe,
  updateGroupe,
  uploadMusique,
};
