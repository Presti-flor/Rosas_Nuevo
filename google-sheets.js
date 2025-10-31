// google-sheets.js
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SPREADSHEET_ID = '1JAsY9wkpp-mhawsrZjSXYeHt3BR3Kuf5KNZNM5FJLx0';
const SHEET_NAME = 'Hoja111';

// abrir la hoja (reutilizable)
async function getSheetFromEnv() {
  const creds = JSON.parse(process.env.google_sheets_credentials);

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
      headerValues: ['id', 'variedad', 'bloque', 'tallos', 'tamali', 'fecha', 'etapa', 'creado_iso']
    });
  }

  return sheet;
}

// 🔍 buscar por id (para evitar doble escaneo)
async function findById(idBuscado) {
  const sheet = await getSheetFromEnv();
  const rows = await sheet.getRows();

  const row = rows.find(r => String(r.id) === String(idBuscado));
  return !!row;
}

// 📝 escribir una fila
async function writeToSheet(data) {
  const sheet = await getSheetFromEnv();

  await sheet.addRow({
    id: data.id || new Date().getTime(), // por si acaso no viene
    variedad: data.variedad,
    bloque: data.bloque,
    tallos: data.tallos,
    tamali: data.tamali,
    fecha: data.fecha || new Date().toLocaleDateString('es-ES'),
    etapa: data.etapa || '',
    creado_iso: new Date().toISOString(),
  });

  console.log('✅ Datos agregados correctamente en Google Sheets');
}

module.exports = {
  writeToSheet,
  findById,
};