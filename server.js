const express = require('express');
const writeToSheet = require('./google-sheets'); // Función para escribir en Google Sheets
const app = express();

app.use(express.json());

// Lista de IPs autorizadas
const authorizedIPs = ['186.102.77.146', '186.102.86.56', '186.102.55.56', '190.61.45.230', '192.168.10.23', '192.168.10.1', '186.102.62.30']; // Agrega las IPs de tus dispositivos autorizados

// Función para validar la IP del dispositivo
function validateIP(req) {
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;  // Obtener IP real si hay proxy
  console.log("IP del cliente:", clientIP); // Para verificar la IP
  return authorizedIPs.includes(clientIP);
}

// Función para procesar y guardar registros en Google Sheets
async function processAndSaveData(variedad, bloque, tallos, tamali, fecha, etapa, res) {
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
    fecha: fechaProcesada,
    etapa
  });

  return {
    mensaje: `
      <div style="text-align:center; margin-top:20px;">
        <span style="font-size:32px; color:green; font-weight:bold;">
          Registro guardado en Google Sheets ✅
        </span>
      </div>
    `
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
    const { variedad, bloque, tallos, tamali, fecha, etapa } = req.body;  // Agregamos 'etapa'
    const result = await processAndSaveData(variedad, bloque, tallos, tamali, fecha, etapa, res);
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

  const { variedad, bloque, tallos, tamali, fecha, etapa } = req.query;  // Agregamos 'etapa'

  // Validar parámetros requeridos
  if (!variedad || !bloque || !tallos || !tamali || !etapa) {  // Verificamos si falta 'etapa'
    return res.status(400).json({
      mensaje: 'Faltan parámetros requeridos en la URL. Ejemplo: http://localhost:3000/api/registrar?variedad=Rosa&bloque=5&tallos=30&tamali=Mediano&fecha=2025-09-08&etapa=ingreso'
    });
  }

  try {
    const result = await processAndSaveData(variedad, bloque, tallos, tamali, fecha, etapa, res);
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
      http://localhost:3000/api/registrar?variedad=Rosa&bloque=5&tallos=30&tamali=Mediano&fecha=2025-09-08&etapa=ingreso
    </code>
  `);
});

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
  console.log('Prueba el registro con: http://localhost:3000/api/registrar?variedad=Rosa&bloque=5&tallos=30&tamali=Mediano&fecha=2025-09-08&etapa=ingreso');
});