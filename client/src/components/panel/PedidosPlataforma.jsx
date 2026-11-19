import { useState } from 'react';
import { formatearFechaHora, formatearMoneda } from '../../utils/formato';
import EstadoPedido from '../EstadoPedido';
import Icono from '../Icono';

const FILTROS = [['todos', 'Todos'], ['Pendiente', 'Pendientes'], ['Enviado', 'Enviados'], ['Rechazado', 'Rechazados']];
const POR_PAGINA = 15;

/**
 * Agrupa las líneas de un pedido por local. Cada local despacha o rechaza su
 * parte, así que el estado se calcula por local igual que en el servidor.
 */
const partesPorLocal = (pedido) => {
    const partes = new Map();
    for (const item of pedido.items || []) {
        const id = item.vendedor?.id ?? item.vendedorId;
        if (!partes.has(id)) {
            partes.set(id, {
                id,
                nombre: item.vendedor?.nombre_local || item.vendedor?.nombre || 'Local',
                activo: item.vendedor?.activo !== false,
                estados: []
            });
        }
        partes.get(id).estados.push(item.estado);
    }
    return [...partes.values()].map(parte => ({
        ...parte,
        pendiente: parte.estados.includes('Pendiente')
    }));
};

const tieneParteTrabada = (pedido) => partesPorLocal(pedido).some(parte => parte.pendiente && !parte.activo);

/**
 * Todos los pedidos de la plataforma, para el administrador. Cada local
 * despacha su parte, pero el administrador también puede resolverla: es la
 * única forma de cerrar la parte de un local desactivado, que ya no puede entrar.
 */
function PedidosPlataforma({ pedidos, alCambiarEstado }) {
    const [filtro, setFiltro] = useState('todos');
    const [limite, setLimite] = useState(POR_PAGINA);
    const visibles = pedidos.filter(pedido => filtro === 'todos' || pedido.estado === filtro);
    const trabados = pedidos.filter(tieneParteTrabada).length;

    return (
        <section aria-labelledby="titulo-pedidos">
            <div className="encabezado-seccion">
                <div>
                    <h2 id="titulo-pedidos">Pedidos</h2>
                    <p>{pedidos.length} pedidos en total. Cada local despacha o rechaza su parte; si hace falta, podés resolverla vos.</p>
                </div>
                <div className="pestanas" role="group" aria-label="Filtrar por estado">
                    {FILTROS.map(([valor, texto]) => (
                        <button key={valor} type="button" className="pestana" aria-pressed={filtro === valor}
                            onClick={() => { setFiltro(valor); setLimite(POR_PAGINA); }}>
                            {texto}
                        </button>
                    ))}
                </div>
            </div>

            {trabados > 0 && (
                <p className="mensaje mensaje--alerta" role="status">
                    <Icono nombre="alerta" tamano={18} />
                    {trabados === 1
                        ? 'Hay 1 pedido pendiente de un local desactivado. Ese local ya no puede resolverlo: despachalo o rechazalo vos.'
                        : `Hay ${trabados} pedidos pendientes de locales desactivados. Esos locales ya no pueden resolverlos: despachalos o rechazalos vos.`}
                </p>
            )}

            <div className="tarjeta tabla-contenedor">
                <table className="tabla">
                    <thead>
                        <tr>
                            <th>Pedido</th>
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th>Locales</th>
                            <th className="a-la-derecha">Total</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibles.slice(0, limite).map(pedido => (
                            <tr key={pedido.id}>
                                <td><strong>#{pedido.id}</strong></td>
                                <td className="texto-tenue">{formatearFechaHora(pedido.createdAt)}</td>
                                <td>
                                    {pedido.usuario?.nombre || '—'}
                                    {pedido.direccionEntrega && <span className="celda-detalle">{pedido.direccionEntrega}</span>}
                                </td>
                                <td>
                                    <ul className="partes-pedido">
                                        {partesPorLocal(pedido).map(parte => (
                                            <li key={parte.id} className="parte-pedido">
                                                <span className="parte-pedido__nombre">
                                                    {parte.nombre}
                                                    {!parte.activo && <span className="etiqueta etiqueta--alerta">Desactivado</span>}
                                                </span>
                                                {parte.pendiente && (
                                                    <span className="acciones-fila parte-pedido__acciones">
                                                        <button type="button" className="boton boton--peligro boton--chico"
                                                            aria-label={`Rechazar la parte de ${parte.nombre} del pedido #${pedido.id}`}
                                                            onClick={() => alCambiarEstado(pedido, 'Rechazado', parte)}>
                                                            Rechazar
                                                        </button>
                                                        <button type="button" className="boton boton--exito boton--chico"
                                                            aria-label={`Despachar la parte de ${parte.nombre} del pedido #${pedido.id}`}
                                                            onClick={() => alCambiarEstado(pedido, 'Enviado', parte)}>
                                                            <Icono nombre="check" tamano={14} grosor={3} />Despachar
                                                        </button>
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </td>
                                <td className="a-la-derecha">{formatearMoneda(pedido.total)}</td>
                                <td><EstadoPedido estado={pedido.estado} chico /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {visibles.length === 0 && <p className="vacio">No hay pedidos con ese estado.</p>}
            </div>
            {visibles.length > limite && (
                <div className="pie-tabla">
                    <button type="button" className="boton" onClick={() => setLimite(valor => valor + POR_PAGINA)}>
                        Ver más ({visibles.length - limite})
                    </button>
                </div>
            )}
        </section>
    );
}

export default PedidosPlataforma;
