import { formatearMoneda } from '../../utils/formato';
import Icono from '../Icono';
import Indicador from './Indicador';

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
    // La barra de cada local se mide contra el que más vendió; el texto dice
    // qué parte del total de la plataforma es.
    const mayorVenta = Math.max(...comisiones.map(fila => Number(fila.totalVentas)), 1);
    const participacion = (venta) => Math.round((Number(venta) / Math.max(totales.ventas, 1)) * 100);
    const redondear = (valor) => Math.round(valor * 100) / 100;

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
                <>
                <div className="grilla-kpi grilla-kpi--tres">
                    <Indicador titulo="Vendido por los locales" valor={redondear(totales.ventas)} moneda icono="billete"
                        tono="primario" detalle="Solo lo despachado, histórico" />
                    <Indicador titulo={`Comisión de la plataforma (${porcentajeTexto})`} valor={redondear(totales.comision)} moneda
                        icono="grafico" tono="exito" detalle="Lo que cobra FoodieByte" />
                    <Indicador titulo="Neto a pagar a los locales" valor={redondear(totales.neto)} moneda icono="tienda"
                        detalle={`Entre ${comisiones.length} ${comisiones.length === 1 ? 'local' : 'locales'}`} />
                </div>
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
                                    <td className="a-la-derecha">
                                        {formatearMoneda(fila.totalVentas)}
                                        <span className="participacion">
                                            <span className="meter" aria-hidden="true">
                                                <span className="meter__relleno"
                                                    style={{ width: `${(Number(fila.totalVentas) / mayorVenta) * 100}%` }} />
                                            </span>
                                            {participacion(fila.totalVentas)} % del total
                                        </span>
                                    </td>
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
                </>
            )}
        </section>
    );
}

export default Liquidaciones;
