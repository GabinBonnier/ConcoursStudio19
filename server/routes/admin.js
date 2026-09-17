const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const express = require("express");
const router = express.Router();
const {
  authenticate,
  requireAdmin,
  requireSuperAdmin,
} = require("../middleware/auth");
const {
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
} = require("../controllers/adminController");

router.use(authenticate, requireAdmin);

router.get("/associations", getAssociations);
router.post("/associations", createAssociation);
router.get("/associations/:id", getAssociation);
router.put("/associations/:id", updateAssociation);
router.delete("/associations/:id", deleteAssociation);
router.post("/associations/:id/resend", resendCredentials);
router.get("/groupes/:id", getGroupeAdmin);
router.get("/notifications", getNotifications);
router.patch("/notifications/:id/read", markNotificationRead);
router.patch("/notifications/read-all", markAllNotificationsRead);
router.get("/comptes", getComptes);
router.delete("/comptes/:id", deleteCompte);
router.get("/admins", getAdmins);
router.post("/admins", createAdmin);
router.delete("/admins/:id", deleteAdmin);

router.get("/support-history", requireSuperAdmin, async (req, res) => {
  try {
    const conversations = await prisma.supportConversation.findMany({
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ error: "Erreur chargement historique" });
  }
});

module.exports = router;
