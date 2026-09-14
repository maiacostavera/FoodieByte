import { estilos, badgeEstado, formatearMoneda } from './estilos';

/**
 * Comandas del panel de gestión. El vendedor solo recibe del servidor las
 * líneas de sus propios platos, y solo puede despachar o rechazar las que
 * siguen pendientes: Enviado y Rechazado son estados finales.
 */
function TablaComandas({ pedidos, rol, alCambiarEstado }) {
    if (pedidos.length === 0) {
        return <p style={estilos.textoVacio}>No hay comandas en esta categoría.</p>;
    }

    const esVendedor = rol === 'vendedor';

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={estilos.tabla}>
                <thead>
                    <tr style={estilos.filaHeader}>
                        <th style={estilos.celdaHeader}>Pedido</th>
                        <th style={estilos.celdaHeader}>Cliente</th>
                        <th style={estilos.celdaHeader}>Fecha</th>
                        <th style={estilos.celdaHeader}>Productos</th>
                        <th style={estilos.celdaHeader}>{esVendedor ? 'Tu monto' : 'Monto'}</th>
                        <th style={estilos.celdaHeader}>Estado</th>
                        <th style={estilos.celdaHeader}>Operación</th>
                    </tr>
                </thead>
                <tbody>
                    {pedidos.map(pedido => {
                        const items = pedido.items || [];
                        const estado = pedido.estadoVendedor || pedido.estado;
                        const monto = esVendedor ? pedido.totalVendedor : pedido.total;

                        return (
                            <tr key={pedido.id} style={estilos.filaBody}>
                                <td style={{ ...estilos.celdaBody, fontWeight: '600' }}>#{pedido.id}</td>
                                <td style={estilos.celdaBody}>{pedido.usuario?.nombre || `ID: ${pedido.usuarioId}`}</td>
                                <td style={estilos.celdaBody}>
                                    {new Date(pedido.createdAt).toLocaleDateString('es-AR')}
                                </td>
                                <td style={{ ...estilos.celdaBody, maxWidth: '260px', fontSize: '0.85rem' }}>
                                    {items.length > 0
                                        ? items.map(i => `${i.nombrePlato} ×${i.cantidad}`).join(', ')
                                        : '-'}
                                </td>
                                <td style={{ ...estilos.celdaBody, fontWeight: '600' }}>{formatearMoneda(monto)}</td>
                                <td style={estilos.celdaBody}>
                                    <span style={badgeEstado(estado)}>{estado}</span>
                                </td>
                                <td style={estilos.celdaBody}>
                                    {esVendedor && estado === 'Pendiente' ? (
                                        <div style={estiloAcciones}>
                                            <button onClick={() => alCambiarEstado(pedido.id, 'Enviado')}
                                                style={estiloBotonEnviar}
                                                aria-label={`Marcar el pedido ${pedido.id} como enviado`}>
                                                Marcar enviado
                                            </button>
                                            <button onClick={() => alCambiarEstado(pedido.id, 'Rechazado')}
                                                style={estilos.botonEliminar}
                                                aria-label={`Rechazar el pedido ${pedido.id}`}>
                                                Rechazar
                                            </button>
                                        </div>
                                    ) : esVendedor ? (
                                        <span style={estiloTextoFinal}>Estado final</span>
                                    ) : (
                                        <span style={{ fontSize: '0.85rem', color: '#757575' }}>
                                            {items.length} línea{items.length === 1 ? '' : 's'}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

const estiloAcciones = { display: 'flex', gap: '8px', flexWrap: 'wrap' };
const estiloBotonEnviar = { ...estilos.botonEditar, backgroundColor: '#2e7d32', marginRight: 0 };
const estiloTextoFinal = { fontSize: '0.85rem', color: '#9e9e9e', fontStyle: 'italic' };

export default TablaComandas;
