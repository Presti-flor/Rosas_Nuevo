const express = require("express");
const { Pool } = require("pg");

const app = express();

// Pool de conexión a PostgreSQL (Railway usa DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // casi siempre necesario en Railway
});

const PORT = process.env.PORT || 3000;

// (opcional) Log de cada petición para ver que llegan
app.use((req, res, next) => {
  console.log("📥 Nueva petición:", req.method, req.url);
  next();
});

app.get("/", (req, res) => {
  res.send("<h1>Servidor corriendo ✅</h1>");
});

// 🔎 Ruta de prueba de base de datos
app.get("/api/test-db", async (req, res) => {
  try {
    // Esto solo pregunta la hora actual al servidor de Postgres
    const result = await pool.query("SELECT NOW() AS ahora");
    res.json({
      ok: true,
      dbTime: result.rows[0].ahora,
    });
  } catch (err) {
    console.error("❌ Error probando DB:", err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log("🚀 Servidor activo en puerto " + PORT);
});