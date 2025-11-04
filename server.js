const express = require('express');
const { writeToSheet, existsSameRecord } = require('./google-sheets');
const app = express();

app.use(express.json());

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
  const raw = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  const clientIP = raw.split(',')[0].trim();
  console.log('📡 IP del cliente:', clientIP);
  return authorizedIPs.includes(clientIP);
}

async function processAndSaveData({ id, variedad, bloque, tallos, tamali, fecha, etapa }) {
  if (!id) throw new Error('Falta el parámetro id');
  if (!variedad || !bloque || !tallos || !tamali) {
    throw new Error('Faltan datos obligatorios: variedad, bloque, tallos, tamali');
  }

  const tallosNum = parseInt(tallos);
  if (isNaN(tallosNum)) {
    throw new Error('El parámetro tallos debe ser un número válido');
  }

  const fechaProcesada = fecha || new Date().toISOString().slice(0, 10);

  // 👇 Bloqueo: SOLO si existe una fila con todos estos campos iguales
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
    throw new Error('Este código QR con estos datos ya fue registrado (doble escaneo).');
  }

  // ✅ Si NO existe, se agrega una fila nueva
  await writeToSheet({
    id,
    variedad,
    bloque,
    tallos: tallosNum,
    tamali,
    fecha: fechaProcesada,
    etapa,
  });
}

app.get('/api/registrar', async (req, res) => {
  try {
    if (!validateIP(req)) {
      return res.status(403).send(`
        <html lang="es">
        <head><meta charset="UTF-8"><title>Acceso denegado</title></head>
        <body style="font-family:sans-serif; text-align:center; margin-top:60px;">
          <h1 style="font-size:60px; color:#dc2626;">🚫 IP no autorizada</h1>
        </body>
        </html>
      `);
    }

    const { id, variedad, bloque, tallos, tamali, fecha, etapa } = req.query;

    if (!id || !variedad || !bloque || !tallos || !tamali) {
      return res.status(400).send(`
        <html lang="es">
        <head><meta charset="UTF-8"><title>Faltan datos</title></head>
        <body style="font-family:sans-serif; text-align:center; margin-top:60px;">
          <h1 style="font-size:60px; color:#dc2626;">⚠️ Faltan parámetros en la URL</h1>
        </body>
        </html>
      `);
    }

    await processAndSaveData({ id, variedad, bloque, tallos, tamali, fecha, etapa });

    // ✅ MENSAJE DE REGISTRO OK (modifica tamaño y color aquí)
    res.send(`
      <html lang="es">
      <head><meta charset="UTF-8"><title>Registro exitoso</title></head>
      <body style="
        font-family:sans-serif;
        text-align:center;
        margin-top:80px;
        background-color:#0f172a;
        color:white;
      ">
        <h1 style="font-size:80px; color:#22c55e; margin-bottom:20px;">
          ✅ REGISTRO GUARDADO
        </h1>
        <p style="font-size:32px; opacity:0.9;">
          Variedad: <b>${variedad}</b> &nbsp; | &nbsp;
          Bloque: <b>${bloque}</b> &nbsp; | &nbsp;
          Tallos: <b>${tallos}</b>
        </p>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('❌ Error en /api/registrar:', err.message);

    // 🔴 MENSAJE CUANDO EL QR YA FUE ESCANEADO (u otro error)
    // Puedes personalizar el texto, color y tamaño aquí
    const esDoble =
      err.message.includes('doble escaneo') ||
      err.message.includes('ya fue registrado');

    const titulo = esDoble
      ? '⚠️ ESTE CÓDIGO YA FUE ESCANEADO'
      : '❌ ERROR EN EL REGISTRO';

    const color = esDoble ? '#f97316' : '#dc2626'; // naranja para doble escaneo, rojo para otros errores

    res.status(400).send(`
      <html lang="es">
      <head><meta charset="UTF-8"><title>Error</title></head>
      <body style="
        font-family:sans-serif;
        text-align:center;
        margin-top:80px;
        background-color:#111827;
        color:white;
      ">
        <h1 style="font-size:72px; color:${color}; margin-bottom:20px;">
          ${titulo}
        </h1>
        <p style="font-size:30px; opacity:0.9;">
          ${err.message}
        </p>
      </body>
      </html>
    `);
  }
});

// POST (opcional)
app.post('/api/registrar', async (req, res) => {
  try {
    if (!validateIP(req)) {
      return res.status(403).json({ mensaje: 'Acceso denegado: IP no autorizada' });
    }

    const { id, variedad, bloque, tallos, tamali, fecha, etapa } = req.body;
    await processAndSaveData({ id, variedad, bloque, tallos, tamali, fecha, etapa });

    res.json({ mensaje: '✅ Registro guardado' });
  } catch (err) {
    console.error('❌ Error en POST /api/registrar:', err.message);
    res.status(400).json({ mensaje: err.message });
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h2>Sistema de Registro de Flores</h2>
    <p>Ejemplo:</p>
    <code>/api/registrar?id=1&variedad=Freedom&bloque=6&tallos=20&tamali=Largo&etapa=corte</code>
  `);
});

app.listen(3000, () => {
  console.log('🚀 Servidor activo en http://localhost:3000');
});