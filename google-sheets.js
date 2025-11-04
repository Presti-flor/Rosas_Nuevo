const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const SPREADSHEET_ID = '1JAsY9wkpp-mhawsrZjSXYeHt3BR3Kuf5KNZNM5FJLx0';
const SHEET_NAME = 'prueba';

// 1) Credenciales desde ENV (Railway)
function getCreds() {
  const raw = process.env.google_sheets_credentials;
  if (!raw) {
    throw new Error('⚠️ ENV google_sheets_credentials no está definida');
  }
  return JSON.parse(raw);
}

// 2) Conectar con la hoja
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

// normalizar para comparar
function norm(v) {
  return (v ?? '').toString().trim();
}

// construir la “llave” del registro
// si esta llave ya existe en una fila → es el mismo QR
function buildKey({ id, variedad, bloque, tallos, tamali, fecha, etapa }) {
  return [
    norm(id),
    norm(variedad),
    norm(bloque),
    norm(tallos),
    norm(tamali),
    norm(fecha),
    norm(etapa),
  ].join('|');
}

// 🔍 ¿Existe ya un registro con EXACTAMENTE la misma combinación?
async function existsSameRecord(data) {
  const sheet = await getSheet();
  const rows = await sheet.getRows();

  const targetKey = buildKey(data);

  console.log(`🔍 Buscando combinación: ${targetKey}`);
  console.log(`📊 Filas totales: ${rows.length}`);

  let encontrado = false;

  for (const row of rows) {
    const raw = row._rawData || [];
    const rowData = {
      id: raw[0],        // A: id
      variedad: raw[1],  // B
      bloque: raw[2],    // C
      tallos: raw[3],    // D
      tamali: raw[4],    // E
      fecha: raw[5],     // F
      etapa: raw[6],     // G
    };

    const rowKey = buildKey(rowData);

    if (rowKey === targetKey) {
      encontrado = true;
      break;
    }
  }

  // debug: últimas combinaciones
  const total = rows.length;
  const start = Math.max(0, total - 3);
  const ultimas = rows.slice(start).map(r => {
    const raw = r._rawData || [];
    return buildKey({
      id: raw[0],
      variedad: raw[1],
      bloque: raw[2],
      tallos: raw[3],
      tamali: raw[4],
      fecha: raw[5],
      etapa: raw[6],
    });
  });
  console.log('📜 Últimas combinaciones en hoja:', ultimas);
  console.log(`🔍 existsSameRecord → ${encontrado}`);

  return encontrado;
}

// 📝 Siempre agrega fila nueva (no borra ni actualiza)
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
  existsSameRecord,
};