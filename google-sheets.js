const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SPREADSHEET_ID = '1JAsY9wkpp-mhawsrZjSXYeHt3BR3Kuf5KNZNM5FJLx0';
const SHEET_NAME = 'Hoja111';

// 1️⃣ Obtener credenciales desde Railway o local
function getCreds() {
  const raw = process.env.google_sheets_credentials;
  if (!raw) throw new Error('⚠️ ENV google_sheets_credentials no está definida');
  return JSON.parse(raw);
}

// 2️⃣ Conectar con la hoja
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

  return sheet;
}

// 3️⃣ Extraer el valor del ID (sin depender del nombre exacto)
function extractIdFromRow(row) {
  const keys = Object.keys(row).filter(k => !k.startsWith('_'));
  for (const key of keys) {
    const kNorm = key.trim().toLowerCase();
    if (kNorm.includes('id')) {
      const val = (row[key] ?? '').toString().trim();
      if (val) return val;
    }
  }
  return '';
}

// 4️⃣ Buscar por ID (para evitar reescaneos)
async function findById(idBuscado) {
  const sheet = await getSheet();
  const rows = await sheet.getRows();

  const buscado = String(idBuscado).trim();
  let found = false;

  for (const r of rows) {
    const idRow = extractIdFromRow(r);
    if (idRow === buscado) {
      found = true;
      break;
    }
  }

  console.log(`🔍 findById("${buscado}") → ${found}`);
  return found;
}

// 5️⃣ Escribir en la hoja
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

module.exports = { writeToSheet, findById };