const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SPREADSHEET_ID = '1JAsY9wkpp-mhawsrZjSXYeHt3BR3Kuf5KNZNM5FJLx0';
const SHEET_NAME = 'Hoja111';

async function getSheet() {
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
      headerValues: ['id', 'variedad', 'bloque', 'tallos', 'tamali', 'fecha', 'etapa', 'creado_iso'],
    });
  }

  return sheet;
}

// 🔍 Buscar si el id ya existe
async function findById(idBuscado) {
  const sheet = await getSheet();
  const rows = await sheet.getRows();

  const existe = rows.some((r) => {
    const valor = String(r.id || '').trim();
    return valor === String(idBuscado).trim();
  });

  console.log(`🔍 Buscando id=${idBuscado} → ${existe ? 'ENCONTRADO' : 'NO encontrado'}`);
  return existe;
}

// 📝 Escribir datos
async function writeToSheet(data) {
  const sheet = await getSheet();

  await sheet.addRow({
    id: data.id || new Date().getTime(),
    variedad: data.variedad,
    bloque: data.bloque,
    tallos: data.tallos,
    tamali: data.tamali,
    fecha: data.fecha || new Date().toLocaleDateString('es-ES'),
    etapa: data.etapa || '',
    creado_iso: new Date().toISOString(),
  });

  console.log(`✅ Registro insertado → id=${data.id}`);
}

module.exports = {
  writeToSheet,
  findById,
};