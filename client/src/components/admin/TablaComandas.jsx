import { estilos, badgeEstado, formatearMoneda } from './estilos';

/**
 * Comandas del panel de gestión. El vendedor solo recibe del servidor las
 * líneas de sus propios platos, y solo puede cambiar el estado de esas líneas.
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
                                    {esVendedor ? (
                                        <select value={estado}
                                            onChange={(e) => alCambiarEstado(pedido.id, e.target.value)}
                                            style={estilos.selectPequeno}
                                            aria-label={`Cambiar estado del pedido ${pedido.id}`}>
                                            <option value="Pendiente">Pendiente</option>
                                            <option value="Enviado">Enviado</option>
                                            <option value="Rechazado">Rechazado</option>
                                        </select>
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

export default TablaComandas;
