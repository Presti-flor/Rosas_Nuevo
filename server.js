const express = require("express");
const { Pool } = require("pg");
const { writeToSheet, existsSameRecord } = require("./google-sheets"); // archivo con funciones para Google Sheets

const app = express();

// 🔗 Conexión a PostgreSQL (Railway)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.use(express.json());

// 🌐 Lista de IPs autorizadas
const authorizedIPs = [
  "190.60.35.50", // nueva IP agregada
  "181.78.78.61",
  "186.102.115.133",
  "186.102.47.124",
  "186.102.51.69",
  "190.61.45.230",
  "192.168.10.23",
  "192.168.10.1",
  "186.102.62.30",
  "186.102.25.201",
];

// 🧩 Validar IP del cliente
function validateIP(req) {
  const raw = req.headers["x-forwarded-for"] || req.connection.remoteAddress || "";
  const clientIP = raw.split(",")[0].trim();
  console.log("📡 IP del cliente:", clientIP);
  return authorizedIPs.includes(clientIP);
}

// 💾 Guardar registro en PostgreSQL
async function saveToPostgres({ id, variedad, bloque, tallos, tamali, fecha, etapa }) {
  await pool.query(
    `INSERT INTO registros (id, variedad, bloque, tallos, tamali, fecha, etapa)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       variedad = EXCLUDED.variedad,
       bloque   = EXCLUDED.bloque,
       tallos   = EXCLUDED.tallos,
       tamali   = EXCLUDED.tamali,
       fecha    = EXCLUDED.fecha,
       etapa    = EXCLUDED.etapa`,
    [id, variedad, bloque, tallos, tamali, fecha, etapa]
  );
  console.log(`💾 Guardado en PostgreSQL → ID: ${id}, Variedad: ${variedad}`);
}

// 🌺 Lógica principal: valida, evita duplicados, guarda en Sheets + DB
async function processAndSaveData({ id, variedad, bloque, tallos, tamali, fecha, etapa, force }) {
  if (!id) throw new Error("Falta el parámetro id");
  if (!variedad || !bloque || !tallos || !tamali)
    throw new Error("Faltan datos obligatorios: variedad, bloque, tallos, tamali");

  const tallosNum = parseInt(tallos);
  if (isNaN(tallosNum)) throw new Error("El parámetro tallos debe ser un número válido");

  const fechaProcesada = fecha || new Date().toISOString().slice(0, 10);

  // Evita duplicado, excepto si force = true
  if (!force) {
    const yaExiste = await existsSameRecord({
      id,
      variedad,
      bloque,
      tallos: tallosNum,
      tamali,
      fecha: fechaProcesada,
      etapa,
    });

    if (yaExiste) {
      const err = new Error("Este código QR ya fue registrado (doble escaneo).");
      err.code = "DUPLICATE";
      throw err;
    }
  }

  // 1️⃣ Guardar en Google Sheets
  await writeToSheet({
    id,
    variedad,
    bloque,
    tallos: tallosNum,
    tamali,
    fecha: fechaProcesada,
    etapa,
  });

  // 2️⃣ Guardar en PostgreSQL
  await saveToPostgres({
    id,
    variedad,
    bloque,
    tallos: tallosNum,
    tamali,
    fecha: fechaProcesada,
    etapa,
  });
}

// 🌼 Ruta principal de registro (GET)
app.get("/api/registrar", async (req, res) => {
  try {
    if (!validateIP(req)) {
      return res.status(403).send(`
        <html lang="es"><head><meta charset="UTF-8"><title>Acceso denegado</title></head>
        <body style="font-family:sans-serif; text-align:center; margin-top:60px;">
          <h1 style="font-size:60px; color:#dc2626;">🚫 IP no autorizada</h1>
        </body></html>
      `);
    }

    const { id, variedad, bloque, tallos, tamali, fecha, etapa, force } = req.query;
    const forceFlag = force === "true" || force === "1";

    if (!id || !variedad || !bloque || !tallos || !tamali) {
      return res.status(400).send(`
        <html lang="es"><head><meta charset="UTF-8"><title>Faltan datos</title></head>
        <body style="font-family:sans-serif; text-align:center; margin-top:60px;">
          <h1 style="font-size:60px; color:#dc2626;">⚠️ Faltan parámetros en la URL</h1>
        </body></html>
      `);
    }

    await processAndSaveData({ id, variedad, bloque, tallos, tamali, fecha, etapa, force: forceFlag });

    res.send(`
      <html lang="es"><head><meta charset="UTF-8"><title>Registro exitoso</title></head>
      <body style="font-family:sans-serif; text-align:center; margin-top:80px; background-color:#ffffff;">
        <h1 style="font-size:100px; color:#22c55e; margin-top:200px; margin-bottom:20px;">✅ REGISTRO GUARDADO</h1>
        <p style="font-size:32px; opacity:0.9;">
          Variedad: <b>${variedad}</b> &nbsp; | &nbsp; Bloque: <b>${bloque}</b> &nbsp; | &nbsp; Tallos: <b>${tallos}</b>
        </p>
      </body></html>
    `);
  } catch (err) {
    console.error("❌ Error en /api/registrar:", err.message);

    const esDoble = err.code === "DUPLICATE" || err.message.includes("ya fue registrado");
    if (esDoble) {
      const { id, variedad, bloque, tallos } = req.query;
      const newUrl = `${req.originalUrl}${req.originalUrl.includes("?") ? "&" : "?"}force=true`;

      return res.status(400).send(`
        <html lang="es"><head><meta charset="UTF-8"><title>Doble escaneo</title></head>
        <body style="font-family:sans-serif; text-align:center; margin-top:80px; background-color:#b9deff;">
          <h1 style="font-size:72px; color:#f41606;">⚠️ ESTE CÓDIGO YA FUE ESCANEADO</h1>
          <p style="font-size:30px;">Variedad: <b>${variedad}</b> | Bloque: <b>${bloque}</b> | Tallos: <b>${tallos}</b></p>
          <button onclick="window.location.href='${newUrl}'"
            style="margin-top:80px; padding:20px 80px; font-size:55px; background-color:#22c55e; color:white; border:none; border-radius:31px; cursor:pointer;">
            ✅ Registrar de todas formas
          </button>
        </body></html>
      `);
    }

    res.status(400).send(`
      <html lang="es"><head><meta charset="UTF-8"><title>Error</title></head>
      <body style="font-family:sans-serif; text-align:center; margin-top:80px; background-color:#111827; color:white;">
        <h1 style="font-size:72px; color:#dc2626;">❌ ERROR EN EL REGISTRO</h1>
        <p style="font-size:30px;">${err.message}</p>
      </body></html>
    `);
  }
});

// 🌺 POST (para integraciones automáticas)
app.post("/api/registrar", async (req, res) => {
  try {
    if (!validateIP(req)) return res.status(403).json({ mensaje: "Acceso denegado: IP no autorizada" });

    const { id, variedad, bloque, tallos, tamali, fecha, etapa, force } = req.body;
    const forceFlag = force === true || force === "true" || force === 1 || force === "1";

    await processAndSaveData({ id, variedad, bloque, tallos, tamali, fecha, etapa, force: forceFlag });

    res.json({ mensaje: "✅ Registro guardado" });
  } catch (err) {
    console.error("❌ Error en POST /api/registrar:", err.message);
    res.status(400).json({ mensaje: err.message });
  }
});

// 🌷 Página base de referencia
app.get("/", (req, res) => {
  res.send(`
    <h2>Sistema de Registro de Flores</h2>
    <p>Ejemplo:</p>
    <code>/api/registrar?id=1&variedad=Freedom&bloque=6&tallos=20&tamali=Largo&etapa=corte</code>
  `);
});

// 🚀 Iniciar servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("🚀 Servidor activo en puerto " + PORT);
});