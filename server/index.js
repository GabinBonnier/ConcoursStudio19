require("dotenv").config();
require("express-async-errors");

const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const associationRoutes = require("./routes/association");
const errorHandler = require("./middleware/errorHandler");
const supportRoutes = require("./routes/support");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../client/public")));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/association", associationRoutes);
app.use("/api/support", supportRoutes);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/public/index.html"));
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Studio 19 démarré sur le port ${PORT}`);
});
