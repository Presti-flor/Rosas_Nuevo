const express = require('express');
const { writeToSheet, findById } = require('./google-sheets');
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
  console.log('IP del cliente (normalizada):', clientIP);
  return authorizedIPs.includes(clientIP);
}

async function processAndSaveData({ id, variedad, bloque, tallos, tamali, fecha, etapa }) {
  if (!id) throw new Error('Falta el parámetro id');
  if (!variedad || !bloque || !tallos || !tamali) {
    throw new Error('Faltan datos obligatorios: variedad, bloque, tallos, tamali');
  }

  const yaExiste = await findById(id);
  if (yaExiste) {
    throw new Error(`El ID ${id} ya fue registrado anteriormente (doble escaneo).`);
  }

  const tallosNum = parseInt(tallos);
  if (isNaN(tallosNum)) {
    throw new Error('El parámetro tallos debe ser numérico');
  }

  const fechaProcesada = fecha || new Date().toISOString().slice(0, 10);

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

app.get('/api/registrar', async (req, res) => {
  try {
    if (!validateIP(req)) {
      return res.status(403).json({ mensaje: 'Acceso denegado: la IP no está autorizada' });
    }

    const { id, variedad, bloque, tallos, tamali, fecha, etapa } = req.query;

    if (!id || !variedad || !bloque || !tallos || !tamali || !etapa) {
      return res.status(400).json({ mensaje: 'Faltan parámetros en la URL' });
    }

    await processAndSaveData({ id, variedad, bloque, tallos, tamali, fecha, etapa });

    res.send('<h1 style="color:green">✅ Registro guardado</h1>');
  } catch (err) {
    console.error('❌ Error en /api/registrar:', err.message);
    // devolver SIEMPRE algo para que Railway no haga 502
    res.status(400).json({ mensaje: err.message });
  }
});

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});