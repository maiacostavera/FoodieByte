import { estilos, formatearMoneda } from './estilos';

/**
 * Liquidación de comisiones por local. Los importes los calcula el backend
 * (GET /api/admin/comisiones-vendedores) sobre las líneas ya despachadas.
 */
function Liquidaciones({ comisiones, porcentaje }) {
    const porcentajeTexto = `${((porcentaje ?? 0.05) * 100).toFixed(0)}%`;

    const totales = comisiones.reduce((acc, item) => ({
        ventas: acc.ventas + Number(item.totalVentas),
        comision: acc.comision + Number(item.comisionDebida)
    }), { ventas: 0, comision: 0 });

    return (
        <div style={estilos.panelBlanco}>
            <h3 style={estilos.tituloSeccion}>Liquidación y Comisiones por Local ({porcentajeTexto})</h3>

            {comisiones.length === 0 ? (
                <p style={estilos.textoVacio}>
                    Todavía no hay ventas despachadas para comisionar. La comisión se calcula
                    sobre los pedidos que el local marcó como <strong>Enviado</strong>.
                </p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={estilos.tabla}>
                        <thead>
                            <tr style={estilos.filaHeader}>
                                <th style={estilos.celdaHeader}>ID</th>
                                <th style={estilos.celdaHeader}>Local</th>
                                <th style={estilos.celdaHeader}>Pedidos</th>
                                <th style={estilos.celdaHeader}>Unidades</th>
                                <th style={estilos.celdaHeader}>Total Vendido</th>
                                <th style={estilos.celdaHeader}>Comisión ({porcentajeTexto})</th>
                                <th style={estilos.celdaHeader}>Neto al Local</th>
                            </tr>
                        </thead>
                        <tbody>
                            {comisiones.map(item => (
                                <tr key={item.id} style={estilos.filaBody}>
                                    <td style={{ ...estilos.celdaBody, fontWeight: '600' }}>#{item.id}</td>
                                    <td style={{ ...estilos.celdaBody, fontWeight: '500', color: '#212121' }}>
                                        {item.nombre}
                                        <span style={{ display: 'block', color: '#9e9e9e', fontSize: '0.8rem' }}>{item.email}</span>
                                    </td>
                                    <td style={estilos.celdaBody}>{item.cantidadPedidos}</td>
                                    <td style={estilos.celdaBody}>{item.unidadesVendidas}</td>
                                    <td style={estilos.celdaBody}>{formatearMoneda(item.totalVentas)}</td>
                                    <td style={{ ...estilos.celdaBody, fontWeight: '600', color: '#2e7d32' }}>
                                        {formatearMoneda(item.comisionDebida)}
                                    </td>
                                    <td style={estilos.celdaBody}>{formatearMoneda(item.netoVendedor)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ borderTop: '2px solid #eeeeee' }}>
                                <td style={{ ...estilos.celdaBody, fontWeight: '700' }} colSpan={4}>Totales</td>
                                <td style={{ ...estilos.celdaBody, fontWeight: '700' }}>{formatearMoneda(totales.ventas)}</td>
                                <td style={{ ...estilos.celdaBody, fontWeight: '700', color: '#2e7d32' }}>{formatearMoneda(totales.comision)}</td>
                                <td style={estilos.celdaBody}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Liquidaciones;
