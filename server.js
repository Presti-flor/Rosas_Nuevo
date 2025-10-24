const express = require('express');
const writeToSheet = require('./google-sheets'); // Función para escribir en Google Sheets
const app = express();

app.use(express.json());

// Lista de IPs autorizadas
const authorizedIPs = [
  '186.102.51.69',
  '190.61.45.230',
  '192.168.10.23',
  '192.168.10.1',
  '186.102.62.30',
  '186.102.25.201'
];

// —— Helpers de IP (mejor para Railway/Proxies) ——
function normalizeIP(ip) {
  if (!ip) return '';
  // Si viene con múltiples IPs, toma la primera
  if (ip.includes(',')) ip = ip.split(',')[0].trim();
  // Quita prefijo IPv6 para IPv4 mapeado (::ffff:xxx.xxx.xxx.xxx)
  if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  return ip;
}

function getClientIP(req) {
  const hdr = req.headers['x-forwarded-for'] || '';
  const fallback = req.connection?.remoteAddress || req.socket?.remoteAddress || '';
  return normalizeIP(hdr || fallback);
}

// Función para validar la IP del dispositivo
function validateIP(req) {
  const clientIP = getClientIP(req);
  console.log('IP del cliente:', clientIP);
  return authorizedIPs.includes(clientIP);
}

// Función para procesar y guardar registros en Google Sheets
async function processAndSaveData(variedad, bloque, tallos, tamali, fecha, etapa) {
  // Validaciones
  if (!variedad || !bloque || !tallos || !tamali) {
    throw new Error('Faltan datos obligatorios: variedad, bloque, tallos, tamali');
  }

  // Convertir tallos a número
  const tallosNum = parseInt(tallos);
  if (isNaN(tallosNum)) {
    throw new Error('El parámetro tallos debe ser un número válido');
  }

  // Procesar fecha (usar actual si no se proporciona)
  const fechaProcesada = fecha || new Date().toISOString().slice(0, 10);

  // Guardar en Google Sheets
  const result = await writeToSheet({
    variedad,
    bloque,
    tallos: tallosNum,
    tamali,
    fecha: fechaProcesada,
    etapa
  });

  return result; // ✅ Solo devuelve datos, no responde al cliente
}

// ======================= ENDPOINT POST =======================
app.post('/api/registrar', async (req, res) => {
  if (!validateIP(req)) {
    // 👇 Mensaje grande (HTML) SOLO para acceso denegado
    return res.status(403).send(`
      <html lang="es">
        <head><meta charset="UTF-8"><title>Acceso denegado</title></head>
        <body style="font-family: Arial, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f7f7f7; margin:0;">
          <div style="text-align:center;">
            <div style="font-size:56px; color:#d10000; font-weight:800; line-height:1.2; margin-bottom:12px;">🚫 Acceso denegado</div>
            <div style="font-size:28px; color:#444;">La IP no está autorizada</div>
          </div>
        </body>
      </html>
    `);
  }

  try {
    const { variedad, bloque, tallos, tamali, fecha, etapa } = req.body;
    await processAndSaveData(variedad, bloque, tallos, tamali, fecha, etapa);

    // ✅ Solo respondemos una vez
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

// ======================= ENDPOINT GET =======================
app.get('/api/registrar', async (req, res) => {
  if (!validateIP(req)) {
    // 👇 Mensaje grande (HTML) SOLO para acceso denegado
    return res.status(403).send(`
      <html lang="es">
        <head><meta charset="UTF-8"><title>Acceso denegado</title></head>
        <body style="font-family: Arial, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f7f7f7; margin:0;">
          <div style="text-align:center;">
            <div style="font-size:56px; color:#d10000; font-weight:800; line-height:1.2; margin-bottom:12px;">🚫 Acceso denegado</div>
            <div style="font-size:28px; color:#444;">La IP no está autorizada</div>
          </div>
        </body>
      </html>
    `);
  }

  const { variedad, bloque, tallos, tamali, fecha, etapa } = req.query;

  if (!variedad || !bloque || !tallos || !tamali || !etapa) {
    return res.status(400).json({
      mensaje: 'Faltan parámetros requeridos en la URL. Ejemplo: http://localhost:3000/api/registrar?variedad=Rosa&bloque=5&tallos=30&tamali=Mediano&fecha=2025-09-08&etapa=ingreso'
    });
  }

  try {
    await processAndSaveData(variedad, bloque, tallos, tamali, fecha, etapa);

    res.send(`
      <html lang="es">
      <head><meta charset="UTF-8"><title>Registro exitoso</title></head>
      <body style="font-family:sans-serif; text-align:center; margin-top:50px;">
        <h1 style="font-size:70px; color:green;">✅ Registro guardado en base de datos</h1>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(400).json({ mensaje: err.message });
  }
});

// ======================= HOME =======================
app.get('/', (req, res) => {
  res.send(`
    <h1>Sistema de Registro de Flores</h1>
    <p>Ejemplo de URL para registro:</p>
    <code>
      http://localhost:3000/api/registrar?variedad=Rosa&bloque=5&tallos=30&tamali=Mediano&fecha=2025-09-08&etapa=ingreso
    </code>
  `);
});

// En Railway suele ser process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor corriendo en http://localhost:' + PORT);
});