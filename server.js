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

// GET (QR)
app.get('/api/registrar', async (req, res) => {
  try {
    if (!validateIP(req)) {
      return res.status(403).json({ mensaje: 'Acceso denegado: IP no autorizada' });
    }

    const { id, variedad, bloque, tallos, tamali, fecha, etapa } = req.query;

    if (!id || !variedad || !bloque || !tallos || !tamali) {
      return res.status(400).json({ mensaje: 'Faltan parámetros en la URL' });
    }

    await processAndSaveData({ id, variedad, bloque, tallos, tamali, fecha, etapa });

    res.send('<h1 style="color:green;text-align:center">✅ Registro guardado</h1>');
  } catch (err) {
    console.error('❌ Error en /api/registrar:', err.message);
    res.status(400).json({ mensaje: err.message });
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