const express = require('express');
const { writeToSheet, findById } = require('./google-sheets');
const app = express();

app.use(express.json());

// Lista de IPs autorizadas
const authorizedIPs = [
  '186.102.47.124',
  '186.102.51.69',
  '190.61.45.230',
  '192.168.10.23',
  '192.168.10.1',
  '186.102.62.30',
  '186.102.25.201'
];

// Normaliza IPs que vienen con proxy (Railway)
function validateIP(req) {
  const raw = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  const clientIP = raw.split(',')[0].trim();
  console.log('📡 IP del cliente:', clientIP);
  return authorizedIPs.includes(clientIP);
}

// Función principal que procesa y guarda
async function processAndSaveData({ id, variedad, bloque, tallos, tamali, fecha, etapa }) {
  if (!id) throw new Error('Falta el parámetro id');
  if (!variedad || !bloque || !tallos || !tamali) {
    throw new Error('Faltan datos obligatorios: variedad, bloque, tallos, tamali');
  }

  // Verificar duplicado
  const yaExiste = await findById(id);
  if (yaExiste) throw new Error(`El ID ${id} ya fue registrado antes (doble escaneo)`);

  const tallosNum = parseInt(tallos);
  if (isNaN(tallosNum)) throw new Error('El parámetro tallos debe ser un número válido');

  const fechaProcesada = fecha || new Date().toISOString().slice(0, 10);

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

// GET (para QR)
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

// POST (por si más adelante mandas desde app)
app.post('/api/registrar', async (req, res) => {
  try {
    if (!validateIP(req)) {
      return res.status(403).json({ mensaje: 'Acceso denegado: IP no autorizada' });
    }

    const { id, variedad, bloque, tallos, tamali, fecha, etapa } = req.body;
    await processAndSaveData({ id, variedad, bloque, tallos, tamali, fecha, etapa });

    res.json({ mensaje: '✅ Registro guardado' });
  } catch (err) {
    res.status(400).json({ mensaje: err.message });
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h2>Sistema de Registro de Flores</h2>
    <p>Ejemplo:</p>
    <code>/api/registrar?id=0001&variedad=Freedom&bloque=6&tallos=20&tamali=Largo&etapa=corte</code>
  `);
});

app.listen(3000, () => console.log('🚀 Servidor activo en http://localhost:3000'));