app.get('/api/registrar', async (req, res) => {
  try {
    if (!validateIP(req)) {
      return res.status(403).send(`
        <html lang="es">
        <head><meta charset="UTF-8"><title>Acceso denegado</title></head>
        <body style="font-family:sans-serif; text-align:center; margin-top:60px;">
          <h1 style="font-size:60px; color:#dc2626;">🚫 IP no autorizada</h1>
        </body>
        </html>
      `);
    }

    const { id, variedad, bloque, tallos, tamali, fecha, etapa } = req.query;

    if (!id || !variedad || !bloque || !tallos || !tamali) {
      return res.status(400).send(`
        <html lang="es">
        <head><meta charset="UTF-8"><title>Faltan datos</title></head>
        <body style="font-family:sans-serif; text-align:center; margin-top:60px;">
          <h1 style="font-size:60px; color:#dc2626;">⚠️ Faltan parámetros en la URL</h1>
        </body>
        </html>
      `);
    }

    await processAndSaveData({ id, variedad, bloque, tallos, tamali, fecha, etapa });

    // ✅ MENSAJE DE REGISTRO OK (modifica tamaño y color aquí)
    res.send(`
      <html lang="es">
      <head><meta charset="UTF-8"><title>Registro exitoso</title></head>
      <body style="
        font-family:sans-serif;
        text-align:center;
        margin-top:80px;
        background-color:#0f172a;
        color:white;
      ">
        <h1 style="font-size:80px; color:#22c55e; margin-bottom:20px;">
          ✅ REGISTRO GUARDADO
        </h1>
        <p style="font-size:32px; opacity:0.9;">
          Variedad: <b>${variedad}</b> &nbsp; | &nbsp;
          Bloque: <b>${bloque}</b> &nbsp; | &nbsp;
          Tallos: <b>${tallos}</b>
        </p>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('❌ Error en /api/registrar:', err.message);

    // 🔴 MENSAJE CUANDO EL QR YA FUE ESCANEADO (u otro error)
    // Puedes personalizar el texto, color y tamaño aquí
    const esDoble =
      err.message.includes('doble escaneo') ||
      err.message.includes('ya fue registrado');

    const titulo = esDoble
      ? '⚠️ ESTE CÓDIGO YA FUE ESCANEADO'
      : '❌ ERROR EN EL REGISTRO';

    const color = esDoble ? '#f97316' : '#dc2626'; // naranja para doble escaneo, rojo para otros errores

    res.status(400).send(`
      <html lang="es">
      <head><meta charset="UTF-8"><title>Error</title></head>
      <body style="
        font-family:sans-serif;
        text-align:center;
        margin-top:80px;
        background-color:#111827;
        color:white;
      ">
        <h1 style="font-size:72px; color:${color}; margin-bottom:20px;">
          ${titulo}
        </h1>
        <p style="font-size:30px; opacity:0.9;">
          ${err.message}
        </p>
      </body>
      </html>
    `);
  }
});