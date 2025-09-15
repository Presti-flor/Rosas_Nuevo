const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function testGoogleSheets() {
    const creds = require('./credentials.json'); // Ruta a tus credenciales

    // Crear un cliente JWT para autenticación
    const serviceAccountAuth = new JWT({
        email: creds.client_email,
        key: creds.private_key.replace(/\\n/g, '\n'), // Manejar newlines en la clave privada
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
        ],
    });

    const doc = new GoogleSpreadsheet('1JAsY9wkpp-mhawsrZjSXYeHt3BR3Kuf5KNZNM5FJLx0', serviceAccountAuth);

    try {
        // Cargar la información del documento
        await doc.loadInfo(); // Cargar propiedades y hojas del documento
        console.log(`📊 Título de la hoja: ${doc.title}`);

        // Acceder a la hoja llamada "Hoja111"
        const sheet = doc.sheetsByTitle['Hoja111'];  // Acceder por el nombre de la hoja

        if (!sheet) {
            console.error('❌ No se encontró la hoja con el nombre "Hoja111".');
            return;
        }

        // Agregar una fila de datos de prueba
        await sheet.addRow({
            variedad: 'Rosa',
            bloque: 5,
            tallos: 30,
            tamali: 'Mediano',
            fecha: '2025-09-08',
            etapa: 'Ingreso'
        });

        console.log('✅ Datos agregados correctamente en la hoja "Hoja111"');
    } catch (error) {
        console.error('❌ Error al interactuar con Google Sheets:', error);
    }
}

testGoogleSheets();