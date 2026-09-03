import { useEffect, useState } from 'react';
import api, { mensajeDeError } from '../api/client';

const formatearMoneda = (valor) =>
    `$${Number(valor || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Resumen de ventas del local. Los números vienen de
 * GET /api/pedidos/estadisticas, que el servidor acota al vendedor del token:
 * cada local ve solo su propia facturación y su propio stock en alerta.
 */
function AdminDashboard({ version = 0 }) {
    const [estadisticas, setEstadisticas] = useState(null);
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(true);

    // `version` cambia cada vez que el panel altera el estado de una comanda:
    // así el resumen no queda mostrando cifras viejas.
    useEffect(() => {
        let cancelado = false;

        api.get('/pedidos/estadisticas')
            .then(({ data }) => { if (!cancelado) setEstadisticas(data); })
            .catch((err) => { if (!cancelado) setError(mensajeDeError(err, 'No se pudieron cargar las estadísticas.')); })
            .finally(() => { if (!cancelado) setCargando(false); });

        return () => { cancelado = true; };
    }, [version]);

    if (cargando) {
        return <p style={estiloMensaje}>Cargando estadísticas…</p>;
    }
    if (error) {
        return <p role="alert" style={{ ...estiloMensaje, color: '#c62828' }}>{error}</p>;
    }
    if (!estadisticas) return null;

    const { totalFacturado, totalPedidos, pedidosPendientes, platosEnAlerta } = estadisticas;

    return (
        <section style={{ marginBottom: '30px', fontFamily: "'Poppins', sans-serif" }}>
            <h2 style={{ color: '#212121', marginBottom: '20px', fontSize: '1.3rem', fontWeight: '600' }}>
                Resumen de tu Local
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                <div style={estiloCard}>
                    <span style={estiloLabelCard}>Facturado (pedidos enviados)</span>
                    <strong style={{ ...estiloValorCard, color: '#d32f2f' }}>{formatearMoneda(totalFacturado)}</strong>
                </div>

                <div style={estiloCard}>
                    <span style={estiloLabelCard}>Comandas Recibidas</span>
                    <strong style={estiloValorCard}>{totalPedidos}</strong>
                </div>

                <div style={estiloCard}>
                    <span style={estiloLabelCard}>Pendientes de Envío</span>
                    <strong style={{ ...estiloValorCard, color: pedidosPendientes > 0 ? '#f57c00' : '#212121' }}>
                        {pedidosPendientes}
                    </strong>
                </div>

                <div style={{ ...estiloCard, borderLeft: '4px solid #d32f2f' }}>
                    <span style={estiloLabelCard}>Platos en Alerta de Stock</span>
                    <strong style={estiloValorCard}>{platosEnAlerta.length}</strong>
                    {platosEnAlerta.length > 0 && (
                        <ul style={estiloListaAlerta}>
                            {platosEnAlerta.map(plato => (
                                <li key={plato.id}>
                                    <strong>{plato.nombre}</strong> — quedan {plato.stock}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
}

const estiloMensaje = { textAlign: 'center', fontFamily: "'Poppins', sans-serif", color: '#757575', padding: '20px' };
const estiloCard = { backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '8px' };
const estiloLabelCard = { color: '#757575', fontSize: '0.85rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' };
const estiloValorCard = { color: '#212121', fontSize: '1.8rem', fontWeight: '700' };
const estiloListaAlerta = { paddingLeft: '20px', marginTop: '10px', color: '#757575', fontSize: '0.85rem', lineHeight: '1.6' };

export default AdminDashboard;
