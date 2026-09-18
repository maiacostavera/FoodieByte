import { useState } from 'react';
import { formatearMoneda, formatearMonedaCorta } from '../../utils/formato';

// Medidas del dibujo. El SVG escala con el ancho disponible y conserva la proporción.
const ANCHO = 640;
const ALTO = 230;
const MARGEN = { arriba: 14, derecha: 6, abajo: 28, izquierda: 56 };

/** Techo "redondo" para el eje: 1, 2, 2,5 o 5 por una potencia de 10. */
const techoDelEje = (maximo) => {
    if (maximo <= 0) return 10000;
    const potencia = 10 ** Math.floor(Math.log10(maximo));
    return [1, 2, 2.5, 5, 10].map(paso => paso * potencia).find(valor => valor >= maximo);
};

/** Barra con las esquinas de arriba redondeadas y la base recta, apoyada en el eje. */
const barra = (x, y, ancho, alto, radio) => {
    const r = Math.min(radio, ancho / 2, alto);
    return `M${x},${y + alto} V${y + r} Q${x},${y} ${x + r},${y} H${x + ancho - r} Q${x + ancho},${y} ${x + ancho},${y + r} V${y + alto} Z`;
};

const fechaLarga = (fecha) =>
    new Date(`${fecha}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Ventas despachadas por día. Una sola serie, así que no lleva leyenda: la
 * nombra el título del bloque. Al pasar el mouse (o tocar) una barra se ve el
 * detalle del día; para lectores de pantalla, los mismos datos van en una tabla.
 */
function GraficoVentas({ serie }) {
    const [activo, setActivo] = useState(null);

    const techo = techoDelEje(Math.max(0, ...serie.map(dia => dia.total)));
    const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha;
    const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
    const paso = anchoUtil / Math.max(serie.length, 1);
    const anchoBarra = Math.min(26, paso - 8);
    const y = (valor) => MARGEN.arriba + altoUtil - (valor / techo) * altoUtil;
    const centro = (indice) => MARGEN.izquierda + indice * paso + paso / 2;
    const diaActivo = activo !== null ? serie[activo] : null;

    return (
        <div className="grafico">
            <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} aria-hidden="true" onMouseLeave={() => setActivo(null)}>
                {[0, 0.5, 1].map(fraccion => {
                    const valor = techo * fraccion;
                    return (
                        <g key={fraccion}>
                            <line className={fraccion === 0 ? 'grafico__base' : 'grafico__grilla'}
                                x1={MARGEN.izquierda} x2={ANCHO - MARGEN.derecha} y1={y(valor)} y2={y(valor)} />
                            <text className="grafico__eje" x={MARGEN.izquierda - 10} y={y(valor)} dy="0.35em" textAnchor="end">
                                {formatearMonedaCorta(valor)}
                            </text>
                        </g>
                    );
                })}

                {serie.map((dia, indice) => {
                    const esHoy = indice === serie.length - 1;
                    const alto = (dia.total / techo) * altoUtil;
                    return (
                        <g key={dia.fecha} className="grafico__grupo"
                            onMouseEnter={() => setActivo(indice)} onClick={() => setActivo(indice)}>
                            {/* Zona de toque más grande que la barra. */}
                            <rect className="grafico__objetivo" x={MARGEN.izquierda + indice * paso} y={MARGEN.arriba}
                                width={paso} height={altoUtil} />
                            {alto > 0 && (
                                <path className={`grafico__barra${esHoy ? ' grafico__barra--hoy' : ''}`}
                                    d={barra(centro(indice) - anchoBarra / 2, y(dia.total), anchoBarra, alto, 4)} />
                            )}
                            <text className={`grafico__eje${esHoy ? ' grafico__eje--hoy' : ''}`}
                                x={centro(indice)} y={ALTO - 8} textAnchor="middle">
                                {esHoy ? 'Hoy' : Number(dia.fecha.slice(8))}
                            </text>
                        </g>
                    );
                })}
            </svg>

            {diaActivo && (
                <div className="grafico__tooltip"
                    style={{
                        left: `${Math.min(88, Math.max(12, (centro(activo) / ANCHO) * 100))}%`,
                        top: `${(y(diaActivo.total) / ALTO) * 100}%`
                    }}>
                    <span>{fechaLarga(diaActivo.fecha)}</span>
                    <strong>{formatearMoneda(diaActivo.total)}</strong>
                    <span>{diaActivo.pedidos} {diaActivo.pedidos === 1 ? 'pedido' : 'pedidos'}</span>
                </div>
            )}

            <table className="solo-lectores">
                <caption>Ventas despachadas por día</caption>
                <thead><tr><th>Día</th><th>Ventas</th><th>Pedidos</th></tr></thead>
                <tbody>
                    {serie.map(dia => (
                        <tr key={dia.fecha}><td>{fechaLarga(dia.fecha)}</td><td>{formatearMoneda(dia.total)}</td><td>{dia.pedidos}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default GraficoVentas;
