const express = require('express');
const writeToSheet = require('./google-sheets'); // Asumimos que tienes la función que escribe en Google Sheets
const app = express();

app.use(express.json());

// Función para generar un identificador único
function generateUniqueId() {
  return new Date().getTime(); // Un número único basado en el tiempo
}

// Función para procesar y guardar registros solo en Google Sheets
async function processAndSaveData(variedad, bloque, tallos, tamali, fecha, uniqueId, res) {
  // Validaciones
  if (!variedad || !bloque || !tallos || !tamali) {
    return res.status(400).json({ mensaje: 'Faltan datos obligatorios: variedad, bloque, tallos, tamali, fecha' });
  }

  // Convertir tallos a número
  const tallosNum = parseInt(tallos);
  if (isNaN(tallosNum)) {
    return res.status(400).json({ mensaje: 'El parámetro tallos debe ser un número válido' });
  }

  // Procesar fecha (usar la actual si no se proporciona)
  const fechaProcesada = fecha || new Date().toISOString().slice(0, 10);
  
  try {
    // Solo guardar en Google Sheets
    await writeToSheet({
      variedad,
      bloque,
      tallos: tallosNum,
      tamali,
      fecha: fechaProcesada,
      uniqueId // Guardar también el uniqueId para identificación del escaneo
    });

    return {
      mensaje: 'Registro guardado en Google Sheets ✅'
    };
  } catch (err) {
    console.error('❌ Error al guardar en Google Sheets:', err);
    throw new Error('Error al guardar en Google Sheets');
  }
}

// Endpoint POST para registrar datos solo en Google Sheets
app.post('/api/registrar', async (req, res) => {
  try {
    const { variedad, bloque, tallos, tamali, fecha } = req.body;

    // Generar un uniqueId único basado en el timestamp
    const uniqueId = generateUniqueId();

    const result = await processAndSaveData(variedad, bloque, tallos, tamali, fecha, uniqueId, res);
    res.json(result);
  } catch (err) {
    res.status(500).json({ mensaje: err.message });
  }
});

// Nuevo endpoint GET para recibir parámetros por URL y registrar en Google Sheets
app.get('/api/registrar', async (req, res) => {
  try {
    // Extraer parámetros de la query string
    const { variedad, bloque, tallos, tamali, fecha } = req.query;

    // Validar parámetros requeridos
    if (!variedad || !bloque || !tallos || !tamali) {
      return res.status(400).json({ 
        mensaje: 'Faltan parámetros requeridos en la URL. Ejemplo: http://localhost:3000/api/registrar?variedad=Rosa&bloque=5&tallos=30&tamali=Mediano&fecha=2025-09-08' 
      });
    }

    // Generar un uniqueId único basado en el timestamp
    const uniqueId = generateUniqueId();

    const result = await processAndSaveData(variedad, bloque, tallos, tamali, fecha, uniqueId, res);
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

// Iniciar servidor
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
  console.log('Prueba el registro con: http://localhost:3000/api/registrar?variedad=Rosa&bloque=5&tallos=30&tamali=Mediano&fecha=2025-09-08');
});