import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AdminDashboard({ token }) {
    const [estadisticas, setEstadisticas] = useState({
        totalFacturado: 0,
        totalPedidos: 0,
        platosEnAlerta: []
    });
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const fetchEstadisticas = async () => {
            try {
                const res = await axios.get('http://localhost:3000/api/pedidos/estadisticas', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setEstadisticas(res.data);
            } catch (err) {
                console.error("Error al obtener estadísticas:", err);
            } finally {
                setCargando(false);
            }
        };

        fetchEstadisticas();
    }, [token]);

    if (cargando) return <p style={{ textAlign: 'center', fontFamily: "'Poppins', sans-serif", color: '#757575', padding: '20px' }}>Cargando estadísticas...</p>;

    return (
        <div style={{ marginBottom: '30px', fontFamily: "'Poppins', sans-serif" }}>
            <h2 style={{ color: '#212121', marginBottom: '20px', fontSize: '1.3rem', fontWeight: '600' }}>Resumen de Ventas</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>

                <div style={estiloCard}>
                    <span style={estiloLabelCard}>Total Facturado</span>
                    <strong style={{ ...estiloValorCard, color: '#d32f2f' }}>${estadisticas.totalFacturado}</strong>
                </div>

                <div style={estiloCard}>
                    <span style={estiloLabelCard}>Total de Pedidos</span>
                    <strong style={estiloValorCard}>{estadisticas.totalPedidos}</strong>
                </div>

                <div style={{ ...estiloCard, borderLeft: '4px solid #d32f2f' }}>
                    <span style={estiloLabelCard}>Platos en Alerta de Stock</span>
                    <strong style={estiloValorCard}>{estadisticas.platosEnAlerta.length}</strong>
                    {estadisticas.platosEnAlerta.length > 0 && (
                        <ul style={{ paddingLeft: '20px', marginTop: '10px', color: '#757575', fontSize: '0.85rem', lineHeight: '1.6' }}>
                            {estadisticas.platosEnAlerta.map(plato => (
                                <li key={plato.id}>
                                    <strong>{plato.nombre}</strong> - Quedan: {plato.stock}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

            </div>
        </div>
    );
}

const estiloCard = {
    backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px',
    border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    display: 'flex', flexDirection: 'column', gap: '8px'
};

const estiloLabelCard = {
    color: '#757575', fontSize: '0.85rem', fontWeight: '500',
    textTransform: 'uppercase', letterSpacing: '0.5px'
};

const estiloValorCard = {
    color: '#212121', fontSize: '1.8rem', fontWeight: '700'
};

export default AdminDashboard;
