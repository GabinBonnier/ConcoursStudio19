const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Non authentifié" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Accès réservé aux administrateurs" });
  }
  next();
}

function requireAssociation(req, res, next) {
  if (req.user?.role !== "ASSOCIATION") {
    return res.status(403).json({ error: "Accès réservé aux associations" });
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN" || req.user?.email !== "admin@admin.com") {
    return res
      .status(403)
      .json({ error: "Accès strictement réservé au Super Administrateur" });
  }
  next();
}

module.exports = {
  authenticate,
  requireAdmin,
  requireAssociation,
  requireSuperAdmin,
};
