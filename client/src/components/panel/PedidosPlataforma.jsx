import { useState } from 'react';
import { formatearFechaHora, formatearMoneda } from '../../utils/formato';
import EstadoPedido from '../EstadoPedido';

const FILTROS = [['todos', 'Todos'], ['Pendiente', 'Pendientes'], ['Enviado', 'Enviados'], ['Rechazado', 'Rechazados']];
const POR_PAGINA = 15;

/** Todos los pedidos de la plataforma, para el administrador. Solo lectura: los despacha cada local. */
function PedidosPlataforma({ pedidos }) {
    const [filtro, setFiltro] = useState('todos');
    const [limite, setLimite] = useState(POR_PAGINA);
    const visibles = pedidos.filter(pedido => filtro === 'todos' || pedido.estado === filtro);

    return (
        <section aria-labelledby="titulo-pedidos">
            <div className="encabezado-seccion">
                <div>
                    <h2 id="titulo-pedidos">Pedidos</h2>
                    <p>{pedidos.length} pedidos en total. Cada local despacha o rechaza su parte.</p>
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
                        {visibles.slice(0, limite).map(pedido => {
                            const locales = [...new Set((pedido.items || []).map(item => item.vendedor?.nombre_local || item.vendedor?.nombre || 'Local'))];
                            return (
                                <tr key={pedido.id}>
                                    <td><strong>#{pedido.id}</strong></td>
                                    <td className="texto-tenue">{formatearFechaHora(pedido.createdAt)}</td>
                                    <td>{pedido.usuario?.nombre || '—'}</td>
                                    <td>{locales.join(', ')}</td>
                                    <td className="a-la-derecha">{formatearMoneda(pedido.total)}</td>
                                    <td><EstadoPedido estado={pedido.estado} chico /></td>
                                </tr>
                            );
                        })}
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
