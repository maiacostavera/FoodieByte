import { formatearMoneda } from '../../utils/formato';
import Icono from '../Icono';

/**
 * Liquidación de comisiones por local. Los importes los calcula el backend
 * (GET /api/admin/comisiones-vendedores) sobre las líneas ya despachadas.
 */
function Liquidaciones({ comisiones, porcentaje = 0.05 }) {
    const porcentajeTexto = `${Math.round(porcentaje * 100)} %`;
    const totales = comisiones.reduce((acc, fila) => ({
        pedidos: acc.pedidos + fila.cantidadPedidos,
        ventas: acc.ventas + Number(fila.totalVentas),
        comision: acc.comision + Number(fila.comisionDebida),
        neto: acc.neto + Number(fila.netoVendedor)
    }), { pedidos: 0, ventas: 0, comision: 0, neto: 0 });

    return (
        <section aria-labelledby="titulo-liquidaciones">
            <div className="encabezado-seccion">
                <div>
                    <h2 id="titulo-liquidaciones">Liquidación por local</h2>
                    <p>La plataforma cobra el {porcentajeTexto} de lo que cada local despachó. Lo rechazado no genera comisión.</p>
                </div>
            </div>

            {comisiones.length === 0 ? (
                <div className="vacio tarjeta">
                    <span className="vacio__icono"><Icono nombre="billete" tamano={26} /></span>
                    <p className="vacio__titulo">Todavía no hay ventas despachadas</p>
                    <p>La comisión se calcula sobre los pedidos que los locales marcan como enviados.</p>
                </div>
            ) : (
                <div className="tarjeta tabla-contenedor">
                    <table className="tabla">
                        <thead>
                            <tr>
                                <th>Local</th>
                                <th className="a-la-derecha">Pedidos</th>
                                <th className="a-la-derecha">Unidades</th>
                                <th className="a-la-derecha">Vendido</th>
                                <th className="a-la-derecha">Comisión ({porcentajeTexto})</th>
                                <th className="a-la-derecha">Neto al local</th>
                            </tr>
                        </thead>
                        <tbody>
                            {comisiones.map(fila => (
                                <tr key={fila.id}>
                                    <td>
                                        <div className="celda-principal">
                                            <div>
                                                <strong>{fila.nombre}</strong>
                                                <span>{fila.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="a-la-derecha">{fila.cantidadPedidos}</td>
                                    <td className="a-la-derecha">{fila.unidadesVendidas}</td>
                                    <td className="a-la-derecha">{formatearMoneda(fila.totalVentas)}</td>
                                    <td className="a-la-derecha"><strong>{formatearMoneda(fila.comisionDebida)}</strong></td>
                                    <td className="a-la-derecha">{formatearMoneda(fila.netoVendedor)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td>Total</td>
                                <td className="a-la-derecha">{totales.pedidos}</td>
                                <td />
                                <td className="a-la-derecha">{formatearMoneda(totales.ventas)}</td>
                                <td className="a-la-derecha">{formatearMoneda(totales.comision)}</td>
                                <td className="a-la-derecha">{formatearMoneda(totales.neto)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </section>
    );
}

export default Liquidaciones;
