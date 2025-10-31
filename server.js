// index.js
const express = require('express');
const { writeToSheet, findById } = require('./google-sheets'); // ahora importamos ambas
const app = express();

app.use(express.json());

// IPs autorizadas
const authorizedIPs = [
  '186.102.47.124',
  '186.102.51.69',
  '190.61.45.230',
  '192.168.10.23',
  '192.168.10.1',
  '186.102.62.30',
  '186.102.25.201'
];

function validateIP(req) {
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log("IP del cliente:", clientIP);
  return authorizedIPs.includes(clientIP);
}

// lógica central
async function processAndSaveData({ id, variedad, bloque, tallos, tamali, fecha, etapa }) {
  // 1. validaciones
  if (!id) {
    throw new Error('Falta el parámetro id (código único del paquete).');
  }
  if (!variedad || !bloque || !tallos || !tamali) {
    throw new Error('Faltan datos obligatorios: variedad, bloque, tallos, tamali');
  }

  // 2. evitar doble escaneo
  const yaExiste = await findById(id);
  if (yaExiste) {
    throw new Error(`El ID ${id} ya fue registrado anteriormente. (Doble escaneo)`);
  }

  // 3. tallos a número
  const tallosNum = parseInt(tallos);
  if (isNaN(tallosNum)) {
    throw new Error('El parámetro tallos debe ser un número válido');
  }

  // 4. fecha
  const fechaProcesada = fecha || new Date().toISOString().slice(0, 10);

  // 5. guardar
  await writeToSheet({
    id,
    variedad,
    bloque,
    tallos: tallosNum,
    tamali,
    fecha: fechaProcesada,
    etapa
  });
}

// POST
app.post('/api/registrar', async (req, res) => {
  if (!validateIP(req)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: la IP no está autorizada' });
  }

  try {
    const { id, variedad, bloque, tallos, tamali, fecha, etapa } = req.body;
    await processAndSaveData({ id, variedad, bloque, tallos, tamali, fecha, etapa });

    res.send(`
      <html lang="es">
      <head><meta charset="UTF-8"><title>Registro exitoso</title></head>
      <body style="font-family:sans-serif; text-align:center; margin-top:50px;">
        <h1 style="font-size:40px; color:green;">✅ Registro guardado en Google Sheets</h1>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(400).json({ mensaje: err.message });
  }
});

// GET (para el QR)
app.get('/api/registrar', async (req, res) => {
  if (!validateIP(req)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: la IP no está autorizadaa' });
  }

  const { id, variedad, bloque, tallos, tamali, fecha, etapa } = req.query;

  if (!id || !variedad || !bloque || !tallos || !tamali || !etapa) {
    return res.status(400).json({
      mensaje: 'Faltan parámetros. Ejemplo: /api/registrar?id=0001&variedad=Rosa&bloque=5&tallos=30&tamali=Mediano&fecha=2025-09-08&etapa=ingreso'
    });
  }

  try {
    await processAndSaveData({ id, variedad, bloque, tallos, tamali, fecha, etapa });

    res.send(`
      <html lang="es">
      <head><meta charset="UTF-8"><title>Registro exitoso</title></head>
      <body style="font-family:sans-serif; text-align:center; margin-top:50px;">
        <h1 style="font-size:70px; color:green;">✅ Registro guardado</h1>
      </body>
      </html>
    `);
  } catch (err) {
    // aquí va a caer si el ID ya estaba
    res.status(400).json({ mensaje: err.message });
  }
});

// home
app.get('/', (req, res) => {
  res.send(`
    <h1>Sistema de Registro de Flores</h1>
    <p>Ejemplo de URL para registro:</p>
    <code>
      http://localhost:3000/api/registrar?id=0001&variedad=Rosa&bloque=5&tallos=30&tamali=Mediano&fecha=2025-09-08&etapa=ingreso
    </code>
  `);
});

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});