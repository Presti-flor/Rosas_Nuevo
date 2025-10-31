const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SPREADSHEET_ID = '1JAsY9wkpp-mhawsrZjSXYeHt3BR3Kuf5KNZNM5FJLx0';
const SHEET_NAME = 'Hoja111';

function getCredsFromEnv() {
  const raw = process.env.google_sheets_credentials;
  if (!raw) {
    throw new Error('ENV google_sheets_credentials no está definida en Railway');
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('❌ No pude parsear google_sheets_credentials:', raw);
    throw e;
  }
}

async function getSheet() {
  const creds = getCredsFromEnv();

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

// 🔍 versión con logs
async function findById(idBuscado) {
  const sheet = await getSheet();
  const rows = await sheet.getRows(); // 👈 si esto se vuelve lento habrá que paginar

  const idNormalizado = String(idBuscado).trim();

  const existe = rows.some((r) => {
    const valor = String(r.id || '').trim();
    return valor === idNormalizado;
  });

  console.log(`🔍 findById("${idNormalizado}") => ${existe}`);
  return existe;
}

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
  console.log('✅ Datos agregados en Sheets:', row);
}

module.exports = {
  writeToSheet,
  findById,
};