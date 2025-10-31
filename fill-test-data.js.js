// fill-test-data.js
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function testGoogleSheets() {
  // si en local tienes el JSON, lo cargas así
  const creds = require('./credentials.json');

  const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet('1JAsY9wkpp-mhawsrZjSXYeHt3BR3Kuf5KNZNM5FJLx0', serviceAccountAuth);

  try {
    await doc.loadInfo();
    console.log(`📊 Título de la hoja: ${doc.title}`);

    let sheet = doc.sheetsByTitle['Hoja111'];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: 'Hoja111',
        headerValues: ['id', 'variedad', 'bloque', 'tallos', 'tamali', 'fecha', 'etapa', 'creado_iso']
      });
    }

    // 👇 este es el id de prueba
    const testId = 'TEST-0001';

    // leemos las filas para ver si ya está
    const rows = await sheet.getRows();
    const yaEsta = rows.find(r => String(r.id) === testId);

    if (yaEsta) {
      console.log(`⚠️ El id ${testId} ya existe en la hoja. No lo vuelvo a insertar.`);
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
      creado_iso: new Date().toISOString()
    });

    console.log('✅ Datos agregados correctamente en la hoja "Hoja111"');
  } catch (error) {
    console.error('❌ Error al interactuar con Google Sheets:', error);
  }
}

testGoogleSheets();