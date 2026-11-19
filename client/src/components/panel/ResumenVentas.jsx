import { formatearMoneda } from '../../utils/formato';
import Icono from '../Icono';
import Indicador, { Variacion } from './Indicador';
import GraficoVentas from './GraficoVentas';

/**
 * Ventas de los últimos 7 días (con hoy) contra los 7 anteriores, en
 * porcentaje: las dos mitades del gráfico de 14 días. Sin ventas en la semana
 * anterior no hay contra qué comparar y devuelve null.
 */
const variacionSemanal = (serie) => {
    if (serie.length < 14) return null;
    const sumar = (dias) => dias.reduce((acc, dia) => acc + dia.total, 0);
    const actual = sumar(serie.slice(-7));
    const anterior = sumar(serie.slice(-14, -7));
    if (anterior === 0) return null;
    return Math.round(((actual - anterior) / anterior) * 100);
};

/** Pestaña "Resumen": indicadores, ventas de las últimas dos semanas y ranking de platos. */
function ResumenVentas({ esAdmin, estadisticas, alIrA }) {
    const serie = estadisticas.ventasPorDia || [];
    const totalDelPeriodo = serie.reduce((acc, dia) => acc + dia.total, 0);
    const alertas = estadisticas.platosEnAlerta || [];

    const indicadores = esAdmin
        ? [
            { titulo: 'Ventas despachadas', valor: estadisticas.volumenVentas, moneda: true, icono: 'billete', tono: 'primario', detalle: 'Total histórico de la plataforma' },
            { titulo: `Ganancia (comisión ${Math.round(estadisticas.porcentajeComision * 100)} %)`, valor: estadisticas.gananciasPlataforma, moneda: true, icono: 'grafico', tono: 'exito', detalle: 'Sobre lo despachado' },
            { titulo: 'Pedidos enviados', valor: `${estadisticas.pedidosEnviados} de ${estadisticas.pedidosTotales}`, icono: 'recibo', tono: 'info' },
            { titulo: 'Locales activos', valor: estadisticas.localesActivos, icono: 'tienda' },
            { titulo: 'Usuarios activos', valor: estadisticas.usuariosTotales, icono: 'usuarios' },
            { titulo: 'Platos publicados', valor: estadisticas.platosPublicados, icono: 'plato' }
        ]
        : [
            { titulo: 'Facturado', valor: estadisticas.totalFacturado, moneda: true, icono: 'billete', tono: 'primario', detalle: 'Pedidos despachados, histórico' },
            { titulo: 'Pedidos recibidos', valor: estadisticas.totalPedidos, icono: 'recibo', tono: 'info' },
            {
                titulo: 'Pendientes de envío', valor: estadisticas.pedidosPendientes, icono: 'reloj',
                tono: estadisticas.pedidosPendientes > 0 ? 'alerta' : undefined,
                detalle: estadisticas.pedidosPendientes > 0 ? 'Revisalos en la pestaña Comandas' : 'Todo al día'
            },
            {
                titulo: 'Platos con poco stock', valor: alertas.length, icono: 'alerta',
                tono: alertas.length > 0 ? 'alerta' : undefined, detalle: 'Menos de 5 unidades'
            }
        ];

    return (
        <>
            <div className={`grilla-kpi${esAdmin ? ' grilla-kpi--seis' : ''}`}>
                {indicadores.map(indicador => <Indicador key={indicador.titulo} {...indicador} />)}
            </div>

            <div className="grilla-resumen">
                <section className="bloque bloque--grafico tarjeta" aria-labelledby="titulo-ventas">
                    <div className="bloque__cabecera">
                        <div>
                            <h2 className="bloque__titulo" id="titulo-ventas">Ventas de los últimos 14 días</h2>
                            <p className="bloque__subtitulo">Solo lo despachado{esAdmin ? ', de todos los locales' : ''}</p>
                        </div>
                        <div className="bloque__totales">
                            <p className="bloque__destacado">{formatearMoneda(totalDelPeriodo)}</p>
                            <Variacion porcentaje={variacionSemanal(serie)} />
                        </div>
                    </div>
                    <GraficoVentas serie={serie} />
                </section>

                <section className="bloque tarjeta" aria-labelledby="titulo-ranking">
                    <div className="bloque__cabecera">
                        <div>
                            <h2 className="bloque__titulo" id="titulo-ranking">Más vendidos</h2>
                            <p className="bloque__subtitulo">Por unidades despachadas</p>
                        </div>
                    </div>
                    <Ranking platos={estadisticas.masVendidos || []} mostrarLocal={esAdmin} />

                    {!esAdmin && alertas.length > 0 && (
                        <>
                            <div className="bloque__cabecera bloque__cabecera--separada">
                                <h3 className="bloque__titulo">Poco stock</h3>
                                <button type="button" className="boton boton--chico" onClick={() => alIrA('menu')}>Ir a mi menú</button>
                            </div>
                            <ul className="lista-alertas">
                                {alertas.map(plato => (
                                    <li key={plato.id}>
                                        <span>{plato.nombre}</span>
                                        <span className={`etiqueta ${plato.stock === 0 ? 'etiqueta--peligro' : 'etiqueta--alerta'}`}>
                                            {plato.stock === 0 ? 'Agotado' : plato.stock === 1 ? 'Queda 1' : `Quedan ${plato.stock}`}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </section>
            </div>
        </>
    );
}


function Ranking({ platos, mostrarLocal }) {
    if (platos.length === 0) {
        return <p className="texto-tenue">Todavía no hay ventas despachadas.</p>;
    }
    const maximo = platos[0].unidades;
    return (
        <ol className="ranking">
            {platos.map((plato, indice) => (
                <li key={`${plato.nombre}-${plato.local}`} className="ranking__fila">
                    <span className="ranking__posicion">{indice + 1}</span>
                    <span className="ranking__nombre">
                        {plato.nombre}
                        {mostrarLocal && <span className="ranking__local">{plato.local}</span>}
                    </span>
                    <span className="ranking__unidades">{plato.unidades} u.</span>
                    <span className="ranking__barra" aria-hidden="true">
                        <span style={{ width: `${(plato.unidades / maximo) * 100}%`, '--retraso': `${indice * 70}ms` }} />
                    </span>
                </li>
            ))}
        </ol>
    );
}

export default ResumenVentas;
