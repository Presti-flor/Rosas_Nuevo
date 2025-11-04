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

// 3) Normalizar ID (para que "0004" y "4" sean iguales si son numéricos)
function normalizeId(value) {
  const s = (value ?? '').toString().trim();
  if (s === '') return '';
  if (/^\d+$/.test(s)) {
    return String(parseInt(s, 10)); // "0004" -> "4"
  }
  return s; // si tiene letras, se queda igual
}

// 4) Buscar por ID leyendo SIEMPRE la columna A (id)
async function findById(idBuscado) {
  const sheet = await getSheet();
  const headers = sheet.headerValues || [];
  const rows = await sheet.getRows();

  const buscadoNorm = normalizeId(idBuscado);

  // la columna "id" es la A → índice 0
  // pero por si acaso, buscamos su índice en headers
  let idIndex = headers.findIndex(h =>
    (h || '').toString().trim().toLowerCase() === 'id'
  );
  if (idIndex === -1) {
    // si no lo encuentra, asumimos A = 0
    idIndex = 0;
  }

  console.log('📑 Encabezados:', headers);
  console.log('📌 Índice de columna ID:', idIndex);
  console.log(`🔍 Buscando id="${idBuscado}" (normalizado="${buscadoNorm}") en ${rows.length} filas`);

  let encontrado = false;

  for (const row of rows) {
    const rawRow = row._rawData || [];
    const cellVal = rawRow[idIndex]; // 👈 valor crudo de la columna A
    const valNorm = normalizeId(cellVal);

    if (valNorm === buscadoNorm) {
      encontrado = true;
      break;
    }
  }

  // Para ayudar a depurar, mostramos los últimos 3 IDs que ve
  const total = rows.length;
  const start = Math.max(0, total - 3);
  const ultimos = rows.slice(start).map(r => {
    const raw = (r._rawData || [])[idIndex];
    return normalizeId(raw);
  });
  console.log('📜 Últimos IDs vistos en la columna A:', ultimos);

  console.log(`🔍 findById("${idBuscado}") → ${encontrado}`);
  return encontrado;
}

// 5) Escribir fila normalmente
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