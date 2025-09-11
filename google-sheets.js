const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function writeToSheet(data) {
  const creds = require('./clavesadmin.json');
  const SPREADSHEET_ID = '1JAsY9wkpp-mhawsrZjSXYeHt3BR3Kuf5KNZNM5FJLx0';
  const SHEET_NAME = 'Hoja111';

  // Configurar autenticación JWT correctamente
  const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key.replace(/\\n/g, '\n'),
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });

  // Pasar la autenticación directamente al constructor
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);

  try {
    // Ya no es necesario llamar a useServiceAccountAuth
    await doc.loadInfo();

    let sheet = doc.sheetsByTitle[SHEET_NAME];
    
    if (!sheet) {
      sheet = await doc.addSheet({ 
        title: SHEET_NAME, 
        headerValues: ['variedad', 'bloque', 'tallos', 'tamali', 'fecha'] 
      });
    }

    const rowData = {
      variedad: data.variedad,
      bloque: data.bloque,
      tallos: data.tallos,
      tamali: data.tamali,
      fecha: data.fecha || new Date().toLocaleDateString('es-ES')
    };

    await sheet.addRow(rowData);
    console.log('✅ Datos agregados correctamente en Google Sheets');
  } catch (error) {
    console.error('❌ Error al interactuar con Google Sheets:', error);
    throw new Error(`Error al escribir en Google Sheets: ${error.message}`);
  }
}

module.exports = writeToSheet;