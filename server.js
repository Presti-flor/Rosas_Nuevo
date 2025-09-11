const express = require('express');

const mysql = require('mysql2/promise');

const writeToSheet = require('./google-sheets');

const app = express();

app.use(express.json());

const dbConfig = {

host: 'gondola.proxy.rlwy.net',

user: 'root',

password: 'aLIDjtASxTzdcwUxYonsNirVrgHBlpFB',

database: 'railway',

waitForConnections: true,

connectionLimit: 10,

queueLimit: 0

};

const pool = mysql.createPool(dbConfig);

// Función compartida para procesar y guardar registros

async function processAndSaveData(variedad, bloque, tallos, tamali, fecha, res) {

// Validaciones

if (!variedad || !bloque || !tallos || !tamali) {

return res.status(400).json({ mensaje: 'Faltan datos obligatorios: variedad, bloque, tallos, tamali, fecha' });

}

// Convertir tallos a número

const tallosNum = parseInt(tallos);

if (isNaN(tallosNum)) {

return res.status(400).json({ mensaje: 'El parámetro tallos debe ser un número válido' });

}

// Procesar fecha (usar actual si no se proporciona)

const fechaProcesada = fecha || new Date().toISOString().slice(0, 10);

const sql = 'INSERT INTO registros (variedad, bloque, tallos, tamali, fecha) VALUES (?, ?, ?, ?, ?)';

try {

// Guardar en MySQL

const [result] = await pool.execute(sql, [variedad, bloque, tallosNum, tamali, fechaProcesada]);



// Guardar en Google Sheets

await writeToSheet({

  variedad,

  bloque,

  tallos: tallosNum,

  tamali,

  fecha: fechaProcesada

});



return {

  mensaje: 'Registro guardado en MySQL y Google Sheets ✅',

  id: result.insertId

};

} catch (err) {

console.error('❌ Error al guardar:', err);

throw new Error('Error al guardar en la base de datos o en Google Sheets');

}

}

// Endpoint POST original

app.post('/api/registrar', async (req, res) => {

try {

const { variedad, bloque, tallos, tamali, fecha } = req.body;

const result = await processAndSaveData(variedad, bloque, tallos, tamali, fecha, res);

res.json(result);

} catch (err) {

res.status(500).json({ mensaje: err.message });

}

});

// Nuevo endpoint GET para recibir parámetros por URL

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

app.listen(29918, () => {

console.log('Servidor corriendo en http://localhost:3000');

console.log('Prueba el registro con: http://localhost:3000/api/registrar?variedad=Rosa&bloque=5&tallos=30&tamali=Mediano&fecha=2025-09-08');

});

