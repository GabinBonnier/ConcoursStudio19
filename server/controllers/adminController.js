const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { sendCredentials } = require("../services/mail");
const DATE_LIMITE_GLOBALE = "2026-06-15"; // Change la date ici

function generateUsername(prenom, nom) {
  const base = (prenom + nom)
    .replace(/\s+/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const suffix = Math.floor(Math.random() * 900) + 100;
  return base + suffix;
}

function generatePassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

async function getAssociations(req, res) {
  const associations = await prisma.association.findMany({
    where: { groupes: { some: {} } },
    include: {
      user: { select: { email: true, username: true } },
      _count: { select: { groupes: true } },
      groupes: { select: { statut: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const result = associations.map((a) => ({
    id: a.id,
    nom: a.nom,
    prenom: a.prenom,
    nomResponsable: a.nomResponsable,
    email: a.user.email,
    username: a.user.username,
    quotaMax: a.quotaMax,
    statut: a.statut,
    createdAt: a.createdAt,
    totalGroupes: a._count.groupes,
    groupesPublies: a.groupes.filter((g) => g.statut === "PUBLIE").length,
  }));
  res.json(result);
}

async function getAssociation(req, res) {
  const association = await prisma.association.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { email: true, username: true } },
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

async function createAssociation(req, res) {
  const { nom, prenom, nomResponsable, email, quotaMax } = req.body;
  if (!nom || !prenom || !nomResponsable || !email || !quotaMax) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires" });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return res
      .status(409)
      .json({ error: "Un compte avec cet email existe déjà" });
  const username = generateUsername(prenom, nomResponsable);
  const plainPassword = generatePassword();
  const hashed = await bcrypt.hash(plainPassword, 12);
  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashed,
      role: "ASSOCIATION",
      mustChangePassword: true,
      association: {
        create: { nom, prenom, nomResponsable, quotaMax: parseInt(quotaMax) },
      },
    },
    include: { association: true },
  });
  await sendCredentials({
    to: "bonnier.gabin@yahoo.com", // temporaire pour test
    nomAssociation: nom,
    username,
    password: plainPassword,
  });
  res.status(201).json({
    message: "Association créée et identifiants envoyés",
    associationId: user.association.id,
  });
}

async function updateAssociation(req, res) {
  const { nom, prenom, nomResponsable, email, quotaMax } = req.body;
  const association = await prisma.association.findUnique({
    where: { id: req.params.id },
    include: { user: true },
  });
  if (!association)
    return res.status(404).json({ error: "Association introuvable" });
  await prisma.association.update({
    where: { id: req.params.id },
    data: { nom, prenom, nomResponsable, quotaMax: parseInt(quotaMax) },
  });
  if (email && email !== association.user.email) {
    await prisma.user.update({
      where: { id: association.userId },
      data: { email },
    });
  }
  res.json({ message: "Association mise à jour" });
}

async function deleteAssociation(req, res) {
  const association = await prisma.association.findUnique({
    where: { id: req.params.id },
    include: { user: true },
  });
  if (!association)
    return res.status(404).json({ error: "Association introuvable" });
  await prisma.user.delete({ where: { id: association.userId } });
  res.json({ message: "Association supprimée" });
}

async function resendCredentials(req, res) {
  const association = await prisma.association.findUnique({
    where: { id: req.params.id },
    include: { user: true },
  });
  if (!association)
    return res.status(404).json({ error: "Association introuvable" });
  const plainPassword = generatePassword();
  const hashed = await bcrypt.hash(plainPassword, 12);
  await prisma.user.update({
    where: { id: association.userId },
    data: { password: hashed },
  });
  await sendCredentials({
    to: association.user.email,
    nomAssociation: association.nom,
    username: association.user.username,
    password: plainPassword,
  });
  res.json({ message: "Identifiants renvoyés" });
}

async function getGroupeAdmin(req, res) {
  const groupe = await prisma.groupe.findUnique({
    where: { id: req.params.id },
    include: {
      association: { include: { user: { select: { email: true } } } },
      musiques: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!groupe) return res.status(404).json({ error: "Groupe introuvable" });
  res.json(groupe);
}

async function getNotifications(req, res) {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(notifications);
}

async function markNotificationRead(req, res) {
  await prisma.notification.update({
    where: { id: req.params.id },
    data: { lu: true },
  });
  res.json({ message: "Notification marquée comme lue" });
}

async function markAllNotificationsRead(req, res) {
  await prisma.notification.updateMany({
    where: { lu: false },
    data: { lu: true },
  });
  res.json({ message: "Toutes les notifications marquées comme lues" });
}

async function getComptes(req, res) {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      createdAt: true,
      mustChangePassword: true,
      association: { select: { nom: true } },
    },
  });
  res.json(users);
}

async function deleteCompte(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: "Compte introuvable" });
  if (user.role === "ADMIN")
    return res.status(403).json({ error: "Impossible de supprimer un admin" });
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ message: "Compte supprimé" });
}

async function getAdmins(req, res) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true, username: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(admins);
}

async function createAdmin(req, res) {
  const { email, username } = req.body;
  if (!email || !username) {
    return res.status(400).json({ error: "Email et identifiant requis" });
  }
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing)
    return res.status(409).json({ error: "Email ou identifiant déjà utilisé" });

  const plainPassword = generatePassword();
  const hashed = await bcrypt.hash(plainPassword, 12);

  await prisma.user.create({
    data: {
      email,
      username,
      password: hashed,
      role: "ADMIN",
      mustChangePassword: true,
    },
  });

  await sendCredentials({
    to: email,
    nomAssociation: "Panel Admin Studio 19",
    username,
    password: plainPassword,
  });
  res
    .status(201)
    .json({ message: "Compte admin créé et identifiants envoyés" });
}

async function deleteAdmin(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: "Compte introuvable" });
  if (user.email === "Admin@admin.com") {
    return res
      .status(403)
      .json({ error: "Ce compte ne peut pas être supprimé" });
  }
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ message: "Compte admin supprimé" });
}

module.exports = {
  getAssociations,
  getAssociation,
  createAssociation,
  updateAssociation,
  deleteAssociation,
  resendCredentials,
  getGroupeAdmin,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getComptes,
  deleteCompte,
  getAdmins,
  createAdmin,
  deleteAdmin,
};
