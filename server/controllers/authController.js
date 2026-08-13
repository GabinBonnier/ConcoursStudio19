const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Identifiant et mot de passe requis" });
  }
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username: email }],
    },
  });
  if (!user) return res.status(401).json({ error: "Identifiants incorrects" });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Identifiants incorrects" });
  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN },
  );
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ role: user.role, message: "Connexion réussie" });
}

async function logout(req, res) {
  res.clearCookie("token");
  res.json({ message: "Déconnecté" });
}

async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      mustChangePassword: true,
      association: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          nomResponsable: true,
          quotaMax: true,
          statut: true,
          _count: { select: { groupes: true } },
        },
      },
    },
  });
  res.json(user);
}

async function changePassword(req, res) {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "Le mot de passe doit faire au moins 6 caractères" });
  }
  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashed, mustChangePassword: false },
  });
  res.json({ message: "Mot de passe mis à jour" });
}

module.exports = { login, logout, me, changePassword };
