'use strict';

const fs = require('fs');
const path = require('path');

// Carpeta donde multer guarda las imágenes de los platos, y cómo se ven sus
// rutas en la columna imagenUrl.
const CARPETA_PLATOS = path.join(__dirname, '..', 'uploads', 'platos');
const PREFIJO_URL = '/uploads/platos/';

/**
 * Comprueba por los primeros bytes que el archivo sea realmente JPEG, PNG o
 * WebP. El tipo MIME lo declara el navegador y se puede falsificar; el
 * contenido del archivo, no.
 */
const esImagenValida = async (rutaArchivo) => {
  const archivo = await fs.promises.open(rutaArchivo, 'r');
  try {
    const { bytesRead, buffer } = await archivo.read(Buffer.alloc(12), 0, 12, 0);
    if (bytesRead < 12) return false;

    const esJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const esPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const esWebp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    return esJpeg || esPng || esWebp;
  } finally {
    await archivo.close();
  }
};

/** Borra un archivo sin fallar si ya no existe. */
const borrarArchivo = async (rutaArchivo) => {
  if (!rutaArchivo) return;
  await fs.promises.unlink(rutaArchivo).catch(() => {});
};

/**
 * Borra del disco la imagen subida de un plato a partir de su imagenUrl. Solo
 * toca archivos de uploads/platos: una URL externa, una ruta armada con "../"
 * o un archivo oculto como .gitkeep quedan fuera de alcance.
 */
const borrarImagenSubida = async (imagenUrl) => {
  if (typeof imagenUrl !== 'string' || !imagenUrl.startsWith(PREFIJO_URL)) return;
  const nombre = path.basename(imagenUrl);
  if (!nombre || nombre.startsWith('.')) return;
  await borrarArchivo(path.join(CARPETA_PLATOS, nombre));
};

module.exports = { CARPETA_PLATOS, PREFIJO_URL, esImagenValida, borrarArchivo, borrarImagenSubida };
