const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SPREADSHEET_ID = '1JAsY9wkpp-mhawsrZjSXYeHt3BR3Kuf5KNZNM5FJLx0';
const SHEET_NAME = 'Hoja111';

// Credenciales desde ENV (Railway)
function getCreds() {
  const raw = process.env.google_sheets_credentials;
  if (!raw) {
    throw new Error('⚠️ ENV google_sheets_credentials no está definida');
  }
  return JSON.parse(raw);
}

// Obtener hoja
async function getSheet() {
  const creds = getCreds();

  const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
  await doc.loadInfo();

  let sheet = doc.sheetsByTitle[SHEET_NAME];
  if (!sheet) {
    sheet = await doc.addSheet({
      title: SHEET_NAME,
      headerValues: ['id', 'variedad', 'bloque', 'tallos', 'tamali', 'fecha', 'etapa', 'creado_iso'],
    });
  }

  // nos aseguramos de tener los encabezados cargados
  await sheet.loadHeaderRow();
  return sheet;
}

// 🔍 Buscar por ID usando los encabezados reales
async function findById(idBuscado) {
  const sheet = await getSheet();
  const headers = sheet.headerValues || [];
  const rows = await sheet.getRows();

  const buscado = String(idBuscado).trim();

  // columnas que parecen ser de ID (contienen "id")
  const columnasId = headers.filter(h =>
    (h || '').toString().trim().toLowerCase().includes('id')
  );

  console.log('📑 Encabezados:', headers);
  console.log('📌 Columnas consideradas como ID:', columnasId);
  console.log(`🔍 Buscando id="${buscado}" en ${rows.length} filas`);

  let encontrado = false;

  for (const row of rows) {
    for (const col of columnasId) {
      const val = (row[col] ?? '').toString().trim();
      if (val === buscado) {
        encontrado = true;
        break;
      }
    }
    if (encontrado) break;
  }

  console.log(`🔍 findById("${buscado}") → ${encontrado}`);
  return encontrado;
}

// 📝 Escribir fila
async function writeToSheet(data) {
  const sheet = await getSheet();

  const row = {
    id: data.id || new Date().getTime(),
    variedad: data.variedad,
    bloque: data.bloque,
    tallos: data.tallos,
    tamali: data.tamali,
    fecha: data.fecha || new Date().toLocaleDateString('es-ES'),
    etapa: data.etapa || '',
    creado_iso: new Date().toISOString(),
  };

  await sheet.addRow(row);
  console.log('✅ fila escrita en Sheets:', row);
}

module.exports = {
  writeToSheet,
  findById,
};