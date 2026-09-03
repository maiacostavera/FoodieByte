import { useEffect, useState } from 'react';
import api, { mensajeDeError } from '../api/client';

const formatearMoneda = (valor) => `$${Number(valor || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

function MisPedidos({ alCerrar }) {
    const [pedidos, setPedidos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelado = false;

        const fetchPedidos = async () => {
            try {
                // El servidor identifica al usuario por el token: ya no se manda
                // el id en la URL, que permitía leer los pedidos de otra persona.
                const { data } = await api.get('/pedidos/mis-pedidos');
                if (!cancelado) setPedidos(data);
            } catch (err) {
                if (!cancelado) setError(mensajeDeError(err, 'No se pudieron cargar tus pedidos.'));
            } finally {
                if (!cancelado) setCargando(false);
            }
        };

        fetchPedidos();
        return () => { cancelado = true; };
    }, []);

    return (
        <div style={estiloContenedor}>
            <div style={estiloCabecera}>
                <h2 style={estiloTitulo}>Mis Pedidos</h2>
                <button onClick={alCerrar} style={estiloBotonVolver}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Volver al Menú
                </button>
            </div>

            {cargando ? (
                <div style={estiloEstadoVacio}>
                    <p style={{ fontSize: '1rem', color: '#757575', fontWeight: '500' }}>Cargando tus pedidos…</p>
                </div>
            ) : error ? (
                <div style={estiloEstadoVacio}>
                    <p role="alert" style={{ fontSize: '1rem', color: '#c62828', fontWeight: '500' }}>{error}</p>
                </div>
            ) : pedidos.length === 0 ? (
                <div style={estiloEstadoVacio}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e0e0e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }} aria-hidden="true">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                    <p style={{ fontSize: '1.1rem', color: '#757575', fontWeight: '500', margin: 0 }}>Todavía no tenés pedidos registrados</p>
                    <p style={{ fontSize: '0.9rem', color: '#9e9e9e', marginTop: '8px' }}>Explorá el menú y hacé tu primer pedido</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {pedidos.map(pedido => (
                        <article key={pedido.id} style={estiloTarjetaPedido}>
                            <header style={estiloCabeceraPedido}>
                                <div>
                                    <strong style={{ color: '#212121', fontSize: '1rem' }}>Pedido #{pedido.id}</strong>
                                    <span style={{ color: '#9e9e9e', fontSize: '0.85rem', marginLeft: '12px' }}>
                                        {new Date(pedido.createdAt).toLocaleDateString('es-AR', {
                                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                                <span style={estiloBadge(pedido.estado)}>{pedido.estado}</span>
                            </header>

                            <ul style={estiloListaItems}>
                                {(pedido.items || []).map(item => (
                                    <li key={item.id} style={estiloItem}>
                                        <span style={{ color: '#424242' }}>
                                            {item.nombrePlato} <span style={{ color: '#9e9e9e' }}>× {item.cantidad}</span>
                                            {/* En un pedido con varios locales, cada línea informa su propio estado. */}
                                            {(pedido.items || []).length > 1 && (
                                                <span style={{ ...estiloBadgeChico(item.estado), marginLeft: '10px' }}>{item.estado}</span>
                                            )}
                                        </span>
                                        <span style={{ color: '#212121', fontWeight: '500' }}>{formatearMoneda(item.subtotal)}</span>
                                    </li>
                                ))}
                            </ul>

                            <footer style={estiloPieTotal}>
                                <span style={{ color: '#757575', fontSize: '0.9rem' }}>Total</span>
                                <strong style={{ color: '#d32f2f', fontSize: '1.15rem' }}>{formatearMoneda(pedido.total)}</strong>
                            </footer>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}

const estiloBadge = (estado) => {
    const base = { padding: '6px 14px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' };
    if (estado === 'Enviado') return { ...base, backgroundColor: '#e8f5e9', color: '#2e7d32' };
    if (estado === 'Rechazado') return { ...base, backgroundColor: '#ffebee', color: '#c62828' };
    return { ...base, backgroundColor: '#fff8e1', color: '#f57f17' };
};

const estiloBadgeChico = (estado) => ({ ...estiloBadge(estado), padding: '2px 8px', fontSize: '0.7rem' });

const estiloContenedor = { padding: '40px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', fontFamily: "'Poppins', sans-serif" };
const estiloCabecera = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' };
const estiloTitulo = { margin: 0, color: '#212121', fontSize: '1.5rem', fontWeight: '600' };
const estiloBotonVolver = { background: 'transparent', border: '1px solid #e0e0e0', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', color: '#424242', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Poppins', sans-serif", fontSize: '0.9rem' };
const estiloEstadoVacio = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' };
const estiloTarjetaPedido = { border: '1px solid #eeeeee', borderRadius: '8px', overflow: 'hidden' };
const estiloCabeceraPedido = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#fafafa', borderBottom: '1px solid #eeeeee', flexWrap: 'wrap', gap: '12px' };
const estiloListaItems = { listStyle: 'none', margin: 0, padding: '8px 20px' };
const estiloItem = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', fontSize: '0.9rem', borderBottom: '1px solid #f7f7f7' };
const estiloPieTotal = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #eeeeee' };

export default MisPedidos;
