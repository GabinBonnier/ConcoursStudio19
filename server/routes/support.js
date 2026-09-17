const express = require("express");
const router = express.Router();
const supportController = require("../controllers/supportController");

router.post("/ask", supportController.askQuestion);

module.exports = router;
