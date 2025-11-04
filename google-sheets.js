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

// Conectar con la hoja
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

  await sheet.loadHeaderRow();
  return sheet;
}

// 🔧 Normalizar ID (para que "0004" y "4" sean lo mismo si son números)
function normalizeId(value) {
  const s = (value ?? '').toString().trim();
  if (s === '') return '';
  // si son solo dígitos, comparamos como número
  if (/^\d+$/.test(s)) {
    return String(parseInt(s, 10)); // "0004" -> 4 -> "4"
  }
  // si tiene letras, lo dejamos tal cual
  return s;
}

// 🔍 Buscar por ID usando encabezados reales y normalización
async function findById(idBuscado) {
  const sheet = await getSheet();
  const headers = sheet.headerValues || [];
  const rows = await sheet.getRows();

  const buscadoNorm = normalizeId(idBuscado);

  const columnasId = headers.filter(h =>
    (h || '').toString().trim().toLowerCase().includes('id')
  );

  console.log('📑 Encabezados:', headers);
  console.log('📌 Columnas consideradas como ID:', columnasId);
  console.log(`🔍 Buscando id="${idBuscado}" (normalizado="${buscadoNorm}") en ${rows.length} filas`);

  let encontrado = false;

  for (const row of rows) {
    for (const col of columnasId) {
      const val = row[col];
      const valNorm = normalizeId(val);
      // log opcional: descomenta si quieres ver qué ve
      // console.log(`   ↳ fila: raw="${val}", norm="${valNorm}"`);
      if (valNorm === buscadoNorm) {
        encontrado = true;
        break;
      }
    }
    if (encontrado) break;
  }

  console.log(`🔍 findById("${idBuscado}") → ${encontrado}`);
  return encontrado;
}

// 📝 Escribir fila
async function writeToSheet(data) {
  const sheet = await getSheet();

  const row = {
    id: data.id || new Date().getTime(),      // aquí le mandas "0004"
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