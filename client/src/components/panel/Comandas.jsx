import { useState } from 'react';
import { formatearFechaHora, formatearMoneda, tiempoRelativo } from '../../utils/formato';
import EstadoPedido from '../EstadoPedido';
import Icono from '../Icono';

const FILTROS = [['todos', 'Todos'], ['Enviado', 'Enviados'], ['Rechazado', 'Rechazados']];
const POR_PAGINA = 12;

/**
 * Comandas del local. El servidor ya manda solo las líneas de sus platos. Las
 * pendientes se muestran como tarjetas, de la más vieja a la más nueva, para
 * despacharlas o rechazarlas; Enviado y Rechazado son estados finales.
 */
function Comandas({ comandas, alCambiarEstado }) {
    const [filtro, setFiltro] = useState('todos');
    const [limite, setLimite] = useState(POR_PAGINA);

    const estadoDe = (pedido) => pedido.estadoVendedor || pedido.estado;
    const pendientes = comandas
        .filter(pedido => estadoDe(pedido) === 'Pendiente')
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const historial = comandas.filter(pedido =>
        estadoDe(pedido) !== 'Pendiente' && (filtro === 'todos' || estadoDe(pedido) === filtro));

    return (
        <>
            <section className="panel__seccion" aria-labelledby="titulo-pendientes">
                <div className="encabezado-seccion">
                    <div>
                        <h2 id="titulo-pendientes">Pendientes</h2>
                        <p>{pendientes.length > 0 ? 'De la más vieja a la más nueva. Despachá o rechazá cada una.' : 'Cuando entre un pedido con tus platos, aparece acá.'}</p>
                    </div>
                </div>
                {pendientes.length === 0 ? (
                    <div className="vacio tarjeta">
                        <span className="vacio__icono"><Icono nombre="check" tamano={26} /></span>
                        <p className="vacio__titulo">No tenés comandas pendientes</p>
                        <p>¡Todo al día!</p>
                    </div>
                ) : (
                    <div className="comandas-pendientes">
                        {pendientes.map(pedido => <Comanda key={pedido.id} pedido={pedido} alCambiarEstado={alCambiarEstado} />)}
                    </div>
                )}
            </section>

            <section className="panel__seccion" aria-labelledby="titulo-historial">
                <div className="encabezado-seccion">
                    <div>
                        <h2 id="titulo-historial">Historial</h2>
                        <p>Lo que ya despachaste o rechazaste.</p>
                    </div>
                    <div className="pestanas" role="group" aria-label="Filtrar el historial">
                        {FILTROS.map(([valor, texto]) => (
                            <button key={valor} type="button" className="pestana" aria-pressed={filtro === valor}
                                onClick={() => { setFiltro(valor); setLimite(POR_PAGINA); }}>
                                {texto}
                            </button>
                        ))}
                    </div>
                </div>

                {historial.length === 0 ? (
                    <p className="vacio tarjeta">No hay comandas en esta categoría.</p>
                ) : (
                    <div className="tarjeta tabla-contenedor">
                        <table className="tabla">
                            <thead>
                                <tr>
                                    <th>Pedido</th>
                                    <th>Cliente</th>
                                    <th>Fecha</th>
                                    <th>Productos</th>
                                    <th className="a-la-derecha">Tu monto</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historial.slice(0, limite).map(pedido => (
                                    <tr key={pedido.id}>
                                        <td><strong>#{pedido.id}</strong></td>
                                        <td>{pedido.usuario?.nombre || 'Cliente'}</td>
                                        <td className="texto-tenue">{formatearFechaHora(pedido.createdAt)}</td>
                                        <td>{(pedido.items || []).map(item => `${item.cantidad}× ${item.nombrePlato}`).join(', ')}</td>
                                        <td className="a-la-derecha">{formatearMoneda(pedido.totalVendedor)}</td>
                                        <td><EstadoPedido estado={estadoDe(pedido)} chico /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {historial.length > limite && (
                    <div className="pie-tabla">
                        <button type="button" className="boton" onClick={() => setLimite(valor => valor + POR_PAGINA)}>
                            Ver más ({historial.length - limite})
                        </button>
                    </div>
                )}
            </section>
        </>
    );
}

function Comanda({ pedido, alCambiarEstado }) {
    return (
        <article className="comanda tarjeta">
            <div className="comanda__cabecera">
                <div>
                    <p className="comanda__numero">Pedido #{pedido.id}</p>
                    <p className="comanda__cliente">{pedido.usuario?.nombre || 'Cliente'}</p>
                </div>
                <span className="comanda__tiempo"><Icono nombre="reloj" tamano={14} />{tiempoRelativo(pedido.createdAt)}</span>
            </div>
            <ul className="comanda__items">
                {(pedido.items || []).map(item => (
                    <li key={item.id}><strong>{item.cantidad}×</strong>{item.nombrePlato}</li>
                ))}
            </ul>
            <div className="comanda__pie">
                <span className="comanda__monto">{formatearMoneda(pedido.totalVendedor)}</span>
                <div className="comanda__acciones">
                    <button type="button" className="boton boton--peligro boton--chico"
                        onClick={() => alCambiarEstado(pedido, 'Rechazado')}>
                        Rechazar
                    </button>
                    <button type="button" className="boton boton--exito boton--chico"
                        onClick={() => alCambiarEstado(pedido, 'Enviado')}>
                        <Icono nombre="check" tamano={16} grosor={3} />Marcar enviado
                    </button>
                </div>
            </div>
        </article>
    );
}

export default Comandas;
