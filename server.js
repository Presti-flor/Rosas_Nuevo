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

// Función para validar la IP del dispositivo
function validateIP(req) {
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log("IP del cliente:", clientIP);
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
    // Enviar una respuesta HTML con texto grande y centrado
    return res
      .status(403)
      .type('html')
      .send(`
        <html>
          <head>
            <meta charset="utf-8">
            <title>Acceso denegado</title>
            <style>
              body {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background-color: #111;
                color: #ff4444;
                font-family: Arial, sans-serif;
                text-align: center;
              }
              h1 {
                font-size: 50px;
              }
              p {
                font-size: 20px;
                color: #ccc;
              }
            </style>
          </head>
          <body>
            <div>
              <h1>🚫 Acceso denegado</h1>
              <p>La IP no está autorizada</p>
            </div>
          </body>
        </html>
      `);
  }

  // ... tu código normal si la IP sí está autorizada


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
    return res.status(403).json({ mensaje: 'Acceso denegado: la IP no está autorizada' });
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

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
  console.log('Prueba el registro con: http://localhost:3000/api/registrar?variedad=Rosa&bloque=5&tallos=30&tamali=Mediano&fecha=2025-09-08&etapa=ingreso');
});
