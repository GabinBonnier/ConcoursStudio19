const express = require("express");
const router = express.Router();
const supportController = require("../controllers/supportController");

const { authenticate } = require("../middleware/auth");
router.use(authenticate);
router.get("/conversations", supportController.listConversations);
router.get("/conversations/:id", supportController.getConversation);

router.post("/ask", supportController.askQuestion);

module.exports = router;
