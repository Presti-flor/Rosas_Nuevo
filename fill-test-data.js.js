const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function testGoogleSheets() {
  const creds = require('./credentials.json'); // para entorno local

  const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet('1JAsY9wkpp-mhawsrZjSXYeHt3BR3Kuf5KNZNM5FJLx0', serviceAccountAuth);
  await doc.loadInfo();

  let sheet = doc.sheetsByTitle['Hoja111'];
  if (!sheet) {
    sheet = await doc.addSheet({
      title: 'Hoja111',
      headerValues: ['id', 'variedad', 'bloque', 'tallos', 'tamali', 'fecha', 'etapa', 'creado_iso'],
    });
  }

  const testId = 'TEST-0001';
  const rows = await sheet.getRows();

  const existe = rows.some((r) => {
    const keys = Object.keys(r).filter(k => !k.startsWith('_'));
    return keys.some(k => (r[k] ?? '').toString().trim() === testId);
  });

  if (existe) {
    console.log(`⚠️ El ID ${testId} ya existe, no se inserta`);
    return;
  }

  await sheet.addRow({
    id: testId,
    variedad: 'Rosa',
    bloque: 5,
    tallos: 30,
    tamali: 'Mediano',
    fecha: '2025-09-08',
    etapa: 'Ingreso',
    creado_iso: new Date().toISOString(),
  });

  console.log('✅ Dato de prueba insertado correctamente');
}

testGoogleSheets().catch(console.error);