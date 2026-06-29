import React, { useEffect, useState } from 'react';
import axios from 'axios';

function MisPedidos({ token, alCerrar }) {
    const [pedidos, setPedidos] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const fetchPedidos = async () => {
            const userId = localStorage.getItem('userId');

            if (!userId) {
                console.error("No se encontró userId en localStorage");
                setCargando(false);
                return;
            }

            try {
                const res = await axios.get(`http://localhost:3000/api/pedidos/usuario/${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setPedidos(res.data);
            } catch (err) {
                console.error("Error al obtener pedidos:", err);
            } finally {
                setCargando(false);
            }
        };

        fetchPedidos();
    }, [token]);

    return (
        <div style={estiloContenedor}>
            <div style={estiloCabecera}>
                <h2 style={estiloTitulo}>Mis Pedidos</h2>
                <button onClick={alCerrar} style={estiloBotonVolver}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Volver al Menú
                </button>
            </div>

            {cargando ? (
                <div style={estiloEstadoVacio}>
                    <p style={{ fontSize: '1rem', color: '#757575', fontWeight: '500' }}>Cargando tus pedidos...</p>
                </div>
            ) : pedidos.length === 0 ? (
                <div style={estiloEstadoVacio}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e0e0e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                    <p style={{ fontSize: '1.1rem', color: '#757575', fontWeight: '500', margin: 0 }}>Todavía no tenés pedidos registrados</p>
                    <p style={{ fontSize: '0.9rem', color: '#9e9e9e', marginTop: '8px' }}>Explorá el menú y hacé tu primer pedido</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={estiloTabla}>
                        <thead>
                            <tr style={estiloFilaHeader}>
                                <th style={estiloCeldaHeader}>N° Pedido</th>
                                <th style={estiloCeldaHeader}>Fecha</th>
                                <th style={estiloCeldaHeader}>Productos</th>
                                <th style={estiloCeldaHeader}>Total</th>
                                <th style={estiloCeldaHeader}>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pedidos.map(pedido => {
                                let productos = [];
                                try { productos = JSON.parse(pedido.productos); } catch (e) {}
                                return (
                                    <tr key={pedido.id} style={estiloFilaBody}>
                                        <td style={{ ...estiloCeldaBody, fontWeight: '600' }}>#{pedido.id}</td>
                                        <td style={estiloCeldaBody}>
                                            {new Date(pedido.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </td>
                                        <td style={{ ...estiloCeldaBody, maxWidth: '250px' }}>
                                            {productos.length > 0
                                                ? productos.map(p => `${p.nombre} x${p.cantidad}`).join(', ')
                                                : '-'
                                            }
                                        </td>
                                        <td style={{ ...estiloCeldaBody, fontWeight: '600', color: '#212121' }}>
                                            ${parseFloat(pedido.total).toFixed(2)}
                                        </td>
                                        <td style={estiloCeldaBody}>
                                            <span style={obtenerEstiloBadge(pedido.estado)}>{pedido.estado}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const obtenerEstiloBadge = (estado) => {
    const base = { padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600' };
    if (estado === 'Enviado') return { ...base, backgroundColor: '#e8f5e9', color: '#2e7d32' };
    if (estado === 'Rechazado') return { ...base, backgroundColor: '#ffebee', color: '#c62828' };
    return { ...base, backgroundColor: '#fff8e1', color: '#f57f17' };
};

const estiloContenedor = {
    padding: '40px', backgroundColor: '#ffffff', borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #e0e0e0',
    maxWidth: '1000px', margin: '20px auto', fontFamily: "'Poppins', sans-serif"
};

const estiloCabecera = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'
};

const estiloTitulo = { margin: 0, color: '#212121', fontSize: '1.5rem', fontWeight: '600' };

const estiloBotonVolver = {
    background: 'transparent', border: '1px solid #e0e0e0', padding: '8px 16px',
    borderRadius: '4px', cursor: 'pointer', fontWeight: '500', color: '#424242',
    transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '8px',
    fontFamily: "'Poppins', sans-serif", fontSize: '0.9rem'
};

const estiloEstadoVacio = {
    textAlign: 'center', padding: '60px 20px', display: 'flex',
    flexDirection: 'column', alignItems: 'center'
};

const estiloTabla = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const estiloFilaHeader = { borderBottom: '2px solid #eeeeee' };
const estiloCeldaHeader = { padding: '16px 12px', color: '#757575', fontWeight: '600', fontSize: '0.9rem' };
const estiloFilaBody = { borderBottom: '1px solid #f5f5f5' };
const estiloCeldaBody = { padding: '16px 12px', color: '#424242', fontSize: '0.95rem', verticalAlign: 'middle' };

export default MisPedidos;
