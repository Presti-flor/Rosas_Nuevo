const express = require("express");
const app = express();

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("<h1>Servidor corriendo ✅</h1>");
});

app.get("/api/test-db", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log("🚀 Servidor activo en puerto " + PORT);
});


