import { formatearMoneda } from '../../utils/formato';
import Icono from '../Icono';
import GraficoVentas from './GraficoVentas';

/** Pestaña "Resumen": indicadores, ventas de las últimas dos semanas y ranking de platos. */
function ResumenVentas({ esAdmin, estadisticas, alIrA }) {
    const serie = estadisticas.ventasPorDia || [];
    const totalDelPeriodo = serie.reduce((acc, dia) => acc + dia.total, 0);
    const alertas = estadisticas.platosEnAlerta || [];

    const indicadores = esAdmin
        ? [
            { titulo: 'Ventas despachadas', valor: formatearMoneda(estadisticas.volumenVentas), icono: 'billete', tono: 'primario', detalle: 'Total histórico de la plataforma' },
            { titulo: `Ganancia (comisión ${Math.round(estadisticas.porcentajeComision * 100)} %)`, valor: formatearMoneda(estadisticas.gananciasPlataforma), icono: 'grafico', tono: 'exito', detalle: 'Sobre lo despachado' },
            { titulo: 'Pedidos enviados', valor: `${estadisticas.pedidosEnviados} de ${estadisticas.pedidosTotales}`, icono: 'recibo', tono: 'info' },
            { titulo: 'Locales activos', valor: estadisticas.localesActivos, icono: 'tienda' },
            { titulo: 'Usuarios activos', valor: estadisticas.usuariosTotales, icono: 'usuarios' },
            { titulo: 'Platos publicados', valor: estadisticas.platosPublicados, icono: 'plato' }
        ]
        : [
            { titulo: 'Facturado', valor: formatearMoneda(estadisticas.totalFacturado), icono: 'billete', tono: 'primario', detalle: 'Pedidos despachados, histórico' },
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
                <section className="bloque tarjeta" aria-labelledby="titulo-ventas">
                    <div className="bloque__cabecera">
                        <div>
                            <h2 className="bloque__titulo" id="titulo-ventas">Ventas de los últimos 14 días</h2>
                            <p className="bloque__subtitulo">Solo lo despachado{esAdmin ? ', de todos los locales' : ''}</p>
                        </div>
                        <p className="bloque__destacado">{formatearMoneda(totalDelPeriodo)}</p>
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
                                            {plato.stock === 0 ? 'Agotado' : `Quedan ${plato.stock}`}
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

function Indicador({ titulo, valor, icono, tono, detalle }) {
    return (
        <div className={`kpi tarjeta${tono ? ` kpi--${tono}` : ''}`}>
            <div className="kpi__cabecera">
                <span>{titulo}</span>
                <span className="kpi__icono"><Icono nombre={icono} tamano={18} /></span>
            </div>
            <strong className="kpi__valor">{valor}</strong>
            {detalle && <span className="kpi__detalle">{detalle}</span>}
        </div>
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
                        <span style={{ width: `${(plato.unidades / maximo) * 100}%` }} />
                    </span>
                </li>
            ))}
        </ol>
    );
}

export default ResumenVentas;
