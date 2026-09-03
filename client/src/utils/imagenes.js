// Las imágenes se importan como módulos para que Vite las procese y las
// incluya en el build. Antes estaban como rutas de texto ('/src/assets/...'),
// que funcionan en desarrollo pero dan 404 en producción.
import pizza from '../assets/pizza.webp';
import hamburguesa from '../assets/hamburguesa.webp';
import sushi from '../assets/sushi.webp';
import vegano from '../assets/vegano.webp';
import empanada from '../assets/empanada.webp';
import parrilla from '../assets/parilla.webp';
import postre from '../assets/postre.webp';
import porDefecto from '../assets/default.webp';

import { API_URL } from '../api/client';

const IMAGEN_POR_CATEGORIA = {
    pizzas: pizza,
    hamburguesas: hamburguesa,
    sushi,
    vegano,
    empanadas: empanada,
    parrilla,
    postres: postre
};

/**
 * Devuelve la imagen a mostrar para un plato: la que subió el vendedor si
 * existe, y si no la ilustración genérica de su categoría.
 */
export const imagenDelPlato = (categoria, imagenUrl) => {
    if (imagenUrl && imagenUrl.trim() !== '') {
        return imagenUrl.startsWith('/uploads') ? `${API_URL}${imagenUrl}` : imagenUrl;
    }
    if (!categoria) return porDefecto;
    return IMAGEN_POR_CATEGORIA[categoria.toLowerCase()] || porDefecto;
};

export default imagenDelPlato;
