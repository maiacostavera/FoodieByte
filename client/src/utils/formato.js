// Formato único para importes y fechas en toda la aplicación.

const enteros = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const conCentavos = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compacto = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });

/** $17.500 o $17.500,50: los centavos se muestran solo si los hay. */
export const formatearMoneda = (valor) => {
    const numero = Number(valor || 0);
    return `$${Number.isInteger(numero) ? enteros.format(numero) : conCentavos.format(numero)}`;
};

/** $75 mil o $3,7 M: para los ejes de los gráficos, donde no entra el importe completo. */
export const formatearMonedaCorta = (valor) => `$${compacto.format(Number(valor || 0))}`;

const fechaCorta = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
const hora = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** 18 sept */
export const formatearFecha = (fecha) => fechaCorta.format(new Date(fecha));

/** 18 sept · 21:30 */
export const formatearFechaHora = (fecha) => `${formatearFecha(fecha)} · ${hora.format(new Date(fecha))}`;

/** "recién", "hace 25 min", "hace 3 h", "ayer", "hace 4 días" o la fecha, si pasó más de una semana. */
export const tiempoRelativo = (fecha) => {
    const minutos = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
    if (minutos < 1) return 'recién';
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias === 1) return 'ayer';
    if (dias < 7) return `hace ${dias} días`;
    return formatearFecha(fecha);
};

/** "Lucía Fernández" → "LF", para los avatares. */
export const iniciales = (nombre = '') =>
    nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte[0]).join('').toUpperCase() || '?';
