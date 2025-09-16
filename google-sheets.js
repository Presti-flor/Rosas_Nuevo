const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Cambiar la forma de obtener las credenciales
async function writeToSheet(data) {
  // Obtener las credenciales desde la variable de entorno
  console.log(process.env.google_sheets_credentials);
  const creds = JSON.parse(process.env.google_sheets_credentials); // Parseamos la cadena JSON

  const SPREADSHEET_ID = '1JAsY9wkpp-mhawsrZjSXYeHt3BR3Kuf5KNZNM5FJLx0';  // Reemplaza con tu ID de hoja
  const SHEET_NAME = 'Hoja111';  // Reemplaza con el nombre de tu hoja en Google Sheets

  // Configurar autenticación JWT correctamente
  const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key.replace(/\\n/g, '\n'),  // Asegura que los saltos de línea en la clave sean correctos
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  // Crear la instancia del documento de Google Sheets
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);

  try {
    // Cargar la información de la hoja
    await doc.loadInfo();

    // Obtener la hoja por título
    let sheet = doc.sheetsByTitle[SHEET_NAME];

    // Si no existe la hoja, crearla
    if (!sheet) {
      sheet = await doc.addSheet({
        title: SHEET_NAME,
        headerValues: ['Unique ID', 'variedad', 'bloque', 'tallos', 'tamali', 'fecha', 'etapa'] // Agregar columna Unique ID
      });
    }

    const startingRow = 3;

    // Crear el objeto con los datos que se insertarán en la hoja
    const rowData = {
      // Generar un ID único para cada entrada, puedes usar la fecha, un hash o lo que desees
      'Unique ID': new Date().getTime(),  // Aquí estamos usando el timestamp como Unique ID (puedes cambiar esto)
      'variedad': data.variedad,
      'bloque': data.bloque,
      'tallos': data.tallos,
      'tamali': data.tamali,
      'fecha': data.fecha || new Date().toLocaleDateString('es-ES'),  // Si no se pasa la fecha, toma la actual
      'etapa': data.etapa
    };

    // Agregar la fila a la hoja de cálculo
    await sheet.addRow(rowData);
    console.log('✅ Datos agregados correctamente en Google Sheets');
  } catch (error) {
    console.error('❌ Error al interactuar con Google Sheets:', error);
    throw new Error(`Error al escribir en Google Sheets: ${error.message}`);
  }
}

module.exports = writeToSheet;