const express = require('express');
const writeToSheet = require('./google-sheets'); // Función para escribir en Google Sheets
const app = express();

app.use(express.json());

// Lista de IPs autorizadas
const authorizedIPs = ['190.61.45.230', '192.268.10.23', '162.120.185.222']; // Agrega las IPs de tus dispositivos autorizados

// Función para validar la IP del dispositivo
function validateIP(req) {
  const ip = req.ip || req.connection.remoteAddress;
  return authorizedIPs.includes(ip);
}

// Función para procesar y guardar registros en Google Sheets
async function processAndSaveData(variedad, bloque, tallos, tamali, fecha, res) {
  // Validaciones
  if (!variedad || !bloque || !tallos || !tamali) {
    return res.status(400).json({ mensaje: 'Faltan datos obligatorios: variedad, bloque, tallos, tamali' });
  }

  // Convertir tallos a número
  const tallosNum = parseInt(tallos);
  if (isNaN(tallosNum)) {
    return res.status(400).json({ mensaje: 'El parámetro tallos debe ser un número válido' });
  }

  // Procesar fecha (usar actual si no se proporciona)
  const fechaProcesada = fecha || new Date().toISOString().slice(0, 10);

  try {
    // Solo guardar en Google Sheets
    const result = await writeToSheet({
      variedad,
      bloque,
      tallos: tallosNum,
      tamali,
      fecha: fechaProcesada
    });

    return {
      mensaje: 'Registro guardado en Google Sheets ✅'
    };
  } catch (err) {
    console.error('❌ Error al guardar:', err);
    throw new Error('Error al guardar en Google Sheets');
  }
}

// Endpoint POST para registrar datos solo en Google Sheets
app.post('/api/registrar', async (req, res) => {
  if (!validateIP(req)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: la IP no está autorizada' });
  }

  try {
    const { variedad, bloque, tallos, tamali, fecha } = req.body;
    const result = await processAndSaveData(variedad, bloque, tallos, tamali, fecha, res);
    res.json(result);
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

// Nuevo endpoint GET para recibir parámetros por URL y registrar en Google Sheets
app.get('/api/registrar', async (req, res) => {
  if (!validateIP(req)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: la IP no está autorizada' });
  }

  const { variedad, bloque, tallos, tamali, fecha } = req.query;

  // Validar parámetros requeridos
  if (!variedad || !bloque || !tallos || !tamali) {
    return res.status(400).json({
      mensaje: 'Faltan parámetros requeridos en la URL. Ejemplo: http://localhost:3000/api/registrar?variedad=Rosa&bloque=5&tallos=30&tamali=Mediano&fecha=2025-09-08'
    });
  }

  try {
    const result = await processAndSaveData(variedad, bloque, tallos, tamali, fecha, res);
    res.json(result);
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

// Ruta de ejemplo para prueba
app.get('/', (req, res) => {
  res.send(`
    <h1>Sistema de Registro de Flores</h1>
    <p>Ejemplo de URL para registro:</p>
    <code>
      http://localhost:3000/api/registrar?variedad=Rosa&bloque=5&tallos=30&tamali=Mediano&fecha=2025-09-08
    </code>
  `);
});

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
  console.log('Prueba el registro con: http://localhost:3000/api/registrar?variedad=Rosa&bloque=5&tallos=30&tamali=Mediano&fecha=2025-09-08');
});