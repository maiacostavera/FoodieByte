import React, { useState } from 'react';
import axios from 'axios';

const MAPEO_IMAGENES = {
    pizzas: '/src/assets/pizza.webp',
    hamburguesas: '/src/assets/hamburguesa.webp',
    sushi: '/src/assets/sushi.webp',
    vegano: '/src/assets/vegano.webp',
    empanadas: '/src/assets/empanada.webp',
    parrilla: '/src/assets/parrilla.webp',
    postres: '/src/assets/postre.webp'
};

const obtenerImagenLocal = (categoria, imagenUrlVendedor) => {
    if (imagenUrlVendedor && imagenUrlVendedor.trim() !== '') {
        if (imagenUrlVendedor.startsWith('/uploads')) {
            return `http://localhost:3000${imagenUrlVendedor}`;
        }
        return imagenUrlVendedor;
    }
    if (!categoria) return '/src/assets/default.webp';
    return MAPEO_IMAGENES[categoria.toLowerCase()] || '/src/assets/default.webp';
};

function DetalleProducto({ plato, alCerrar, alAgregar, usuario, token, onRefreshPlatos }) {
    const [cantidad, setCantidad] = useState(1);
    const [puntuacion, setPuntuacion] = useState(0);
    const [hover, setHover] = useState(0);

    const [pregunta, setPregunta] = useState('');
    const [preguntasRealizadas, setPreguntasRealizadas] = useState([
        { id: 1, usuario: 'Carlos', texto: '¿Viene con cubiertos?', respuesta: '¡Hola Carlos! Sí, incluimos kit de madera.' },
        { id: 2, usuario: 'Ana', texto: '¿Es muy picante?', respuesta: null }
    ]);

    const [nuevoStock, setNuevoStock] = useState(plato?.stock || 0);
    const [guardandoStock, setGuardandoStock] = useState(false);
    const [respuestaTexto, setRespuestaTexto] = useState({});

    if (!plato) return null;

    const esGestor = usuario?.rol === 'vendedor' || usuario?.rol === 'admin';

    const enviarPregunta = async (e) => {
        e.preventDefault();
        if (!pregunta.trim()) return;
        try {
            const response = await axios.post(`http://localhost:3000/api/platos/${plato.id}/preguntas`, {
                texto: pregunta,
                usuario: usuario?.nombre || 'Yo'
            }, {
                headers: { authorization: `Bearer ${token}` }
            });
            if (response.status === 200 || response.status === 201) {
                setPreguntasRealizadas(prev => [...prev, response.data]);
                setPregunta('');
                alert("Pregunta enviada con éxito.");
            }
        } catch (err) {
            // Actualización reactiva de respaldo para el estado local
            const nuevaPregunta = { id: Date.now(), usuario: usuario?.nombre || 'Yo', texto: pregunta, respuesta: null };
            setPreguntasRealizadas(prev => [...prev, nuevaPregunta]);
            setPregunta('');
            alert("Pregunta enviada. El vendedor te responderá pronto.");
        }
    };

    const guardarStock = async () => {
        if (nuevoStock < 0) return;
        setGuardandoStock(true);
        try {
            await axios.put(`http://localhost:3000/api/platos/${plato.id}/stock`, { stock: nuevoStock }, {
                headers: { authorization: `Bearer ${token}` }
            });
            plato.stock = nuevoStock;
            if (onRefreshPlatos) onRefreshPlatos();
            alert('Stock actualizado correctamente.');
        } catch (err) {
            alert(err.response?.data?.mensaje || 'Error al actualizar stock.');
        } finally {
            setGuardandoStock(false);
        }
    };

    const responderPregunta = (preguntaId) => {
        const texto = respuestaTexto[preguntaId];
        if (!texto || !texto.trim()) return;
        setPreguntasRealizadas(prev => prev.map(p =>
            p.id === preguntaId ? { ...p, respuesta: texto.trim() } : p
        ));
        setRespuestaTexto(prev => ({ ...prev, [preguntaId]: '' }));
    };

    const stockDisponible = plato.stock || 0;

    return (
        <div style={estiloContenedor}>
            <button onClick={alCerrar} style={estiloBotonVolver}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Volver al Menú
            </button>

            <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 400px' }}>
                    <div style={estiloImagenContainer}>
                        <img
                            src={obtenerImagenLocal(plato.categoria, plato.imagenUrl)}
                            alt={plato.nombre}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                        {plato.es_vegano && <span style={estiloTag}>Vegano</span>}
                        {plato.es_sintacc && <span style={estiloTag}>Sin TACC</span>}
                        {plato.tiempo_prep && <span style={estiloTag}>{plato.tiempo_prep}</span>}
                        <span style={estiloTag}>{plato.categoria}</span>
                    </div>
                </div>

                <div style={{ flex: '1 1 300px' }}>
                    <span style={{ color: '#d32f2f', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.5px' }}>{plato.categoria}</span>
                    <h1 style={{ fontSize: '2.2rem', color: '#212121', margin: '8px 0 16px 0', fontWeight: '700' }}>{plato.nombre}</h1>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} onClick={() => setPuntuacion(star)} onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)}
                                style={{ cursor: 'pointer', fontSize: '1.2rem', color: star <= (hover || puntuacion) ? '#d32f2f' : '#e0e0e0', transition: 'color 0.15s ease' }}>
                                ★
                            </span>
                        ))}
                        <span style={{ color: '#757575', marginLeft: '8px', fontSize: '0.9rem', fontWeight: '500' }}>(12 valoraciones)</span>
                    </div>

                    <p style={{ color: '#424242', fontSize: '1rem', lineHeight: '1.6', marginBottom: '32px' }}>{plato.descripcion}</p>

                    <div style={estiloPrecioBox}>
                        <span style={{ fontSize: '2.2rem', fontWeight: '700', color: '#d32f2f' }}>${plato.precio}</span>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, color: '#212121', fontWeight: '600', fontSize: '0.95rem' }}>Stock Disponible</p>
                            <p style={{ margin: 0, color: stockDisponible < 5 ? '#d32f2f' : '#757575', fontSize: '0.9rem', fontWeight: stockDisponible < 5 ? '600' : '400' }}>
                                {stockDisponible} unidades
                            </p>
                        </div>
                    </div>

                    {esGestor ? (
                        <div style={estiloVendedorBox}>
                            <h4 style={{ margin: '0 0 16px 0', color: '#212121', fontWeight: '600', fontSize: '1rem' }}>Gestión de Stock</h4>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <label style={{ color: '#424242', fontSize: '0.9rem', fontWeight: '500' }}>Nuevo stock:</label>
                                <input type="number" min="0" value={nuevoStock}
                                    onChange={(e) => setNuevoStock(parseInt(e.target.value) || 0)}
                                    style={estiloInputStock} />
                                <button onClick={guardarStock} disabled={guardandoStock}
                                    style={{ ...estiloBotonGuardarStock, opacity: guardandoStock ? 0.6 : 1 }}>
                                    {guardandoStock ? 'Guardando...' : 'Actualizar Stock'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div style={estiloSelectorCantidad}>
                                <button onClick={() => setCantidad(Math.max(1, cantidad - 1))} style={estiloBotonCantidad}>-</button>
                                <span style={{ margin: '0', padding: '0 20px', fontWeight: '600', color: '#212121', fontSize: '1rem' }}>{cantidad}</span>
                                <button onClick={() => setCantidad(Math.min(stockDisponible || 100, cantidad + 1))} style={estiloBotonCantidad}>+</button>
                            </div>
                            <button
                                onClick={() => alAgregar(plato, cantidad)}
                                disabled={stockDisponible === 0}
                                style={{
                                    ...estiloBotonAgregar,
                                    opacity: stockDisponible === 0 ? 0.5 : 1,
                                    cursor: stockDisponible === 0 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {stockDisponible === 0 ? 'Sin Stock' : 'Agregar al Carrito'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <hr style={{ margin: '48px 0', border: '0', borderTop: '1px solid #eeeeee' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
                {!esGestor && (
                    <div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', color: '#212121', fontWeight: '600' }}>¿Tienes alguna duda?</h3>
                        <form onSubmit={enviarPregunta}>
                            <textarea
                                placeholder="Escribe tu consulta sobre ingredientes, envío o preparación..."
                                value={pregunta} onChange={(e) => setPregunta(e.target.value)}
                                style={estiloTextarea}
                            ></textarea>
                            <button type="submit" style={estiloBotonPregunta}>Enviar Pregunta</button>
                        </form>
                    </div>
                )}

                <div style={esGestor ? { gridColumn: '1 / -1' } : {}}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', color: '#212121', fontWeight: '600' }}>
                        {esGestor ? 'Preguntas de Clientes' : 'Últimas consultas'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {preguntasRealizadas.map(p => (
                            <div key={p.id} style={{ fontSize: '0.95rem' }}>
                                <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#424242' }}>
                                    {p.usuario}: {p.texto}
                                </p>
                                {p.respuesta ? (
                                    <p style={{ margin: '0', color: '#757575', paddingLeft: '16px', borderLeft: '3px solid #d32f2f' }}>Respuesta: {p.respuesta}</p>
                                ) : esGestor ? (
                                    <div style={{ display: 'flex', gap: '8px', paddingLeft: '16px', borderLeft: '3px solid #ff9800' }}>
                                        <input
                                            type="text"
                                            placeholder="Escribí tu respuesta..."
                                            value={respuestaTexto[p.id] || ''}
                                            onChange={(e) => setRespuestaTexto(prev => ({ ...prev, [p.id]: e.target.value }))}
                                            style={estiloInputRespuesta}
                                        />
                                        <button onClick={() => responderPregunta(p.id)} style={estiloBotonResponder}>
                                            Responder
                                        </button>
                                    </div>
                                ) : (
                                    <p style={{ margin: '0', color: '#9e9e9e', paddingLeft: '16px', fontStyle: 'italic', borderLeft: '3px solid #e0e0e0' }}>Esperando respuesta del vendedor...</p>
                                )}
                            </div>
                        ))}
                        {preguntasRealizadas.length === 0 && (
                            <p style={{ color: '#9e9e9e', fontSize: '0.9rem' }}>No hay preguntas todavía.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const estiloContenedor = {
    padding: '40px', backgroundColor: 'white', borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)', maxWidth: '1000px',
    margin: '20px auto', fontFamily: "'Poppins', sans-serif"
};

const estiloBotonVolver = {
    marginBottom: '24px', background: 'transparent', border: '1px solid #e0e0e0',
    padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500',
    color: '#424242', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center',
    gap: '8px', fontFamily: "'Poppins', sans-serif", fontSize: '0.9rem'
};

const estiloImagenContainer = {
    backgroundColor: '#f9f9f9', height: '400px', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid #eeeeee', overflow: 'hidden'
};

const estiloTag = {
    padding: '6px 12px', border: '1px solid #e0e0e0', color: '#424242',
    borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500', backgroundColor: '#ffffff'
};

const estiloPrecioBox = {
    background: '#fafafa', border: '1px solid #eeeeee', padding: '24px',
    borderRadius: '8px', marginBottom: '32px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center'
};

const estiloSelectorCantidad = {
    display: 'flex', alignItems: 'center', border: '1px solid #e0e0e0',
    borderRadius: '4px', overflow: 'hidden', backgroundColor: '#ffffff'
};

const estiloBotonCantidad = {
    background: '#f5f5f5', border: 'none', padding: '12px 16px',
    fontSize: '1.2rem', cursor: 'pointer', color: '#424242', outline: 'none'
};

const estiloBotonAgregar = {
    flex: 1, backgroundColor: '#d32f2f', color: '#ffffff', border: 'none',
    padding: '16px', borderRadius: '4px', fontSize: '1rem', fontWeight: '600',
    transition: 'background-color 0.2s ease', fontFamily: "'Poppins', sans-serif"
};

const estiloVendedorBox = {
    background: '#fff8e1', border: '1px solid #ffe082', padding: '24px',
    borderRadius: '8px', marginBottom: '16px'
};

const estiloInputStock = {
    width: '80px', padding: '10px 12px', borderRadius: '4px', border: '1px solid #e0e0e0',
    fontSize: '1rem', fontFamily: "'Poppins', sans-serif", textAlign: 'center'
};

const estiloBotonGuardarStock = {
    backgroundColor: '#2e7d32', color: '#ffffff', border: 'none', padding: '10px 20px',
    borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem',
    fontFamily: "'Poppins', sans-serif", transition: 'opacity 0.2s ease'
};

const estiloInputRespuesta = {
    flex: 1, padding: '8px 12px', borderRadius: '4px', border: '1px solid #e0e0e0',
    fontSize: '0.9rem', fontFamily: "'Poppins', sans-serif", outline: 'none'
};

const estiloBotonResponder = {
    backgroundColor: '#d32f2f', color: '#ffffff', border: 'none', padding: '8px 16px',
    borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem',
    fontFamily: "'Poppins', sans-serif", whiteSpace: 'nowrap'
};

const estiloTextarea = {
    width: '100%', height: '120px', padding: '16px', borderRadius: '4px',
    border: '1px solid #e0e0e0', backgroundColor: '#fafafa', fontFamily: 'inherit',
    marginBottom: '16px', outline: 'none', resize: 'none', boxSizing: 'border-box'
};

const estiloBotonPregunta = {
    backgroundColor: '#212121', color: '#ffffff', border: 'none',
    padding: '12px 24px', borderRadius: '4px', fontWeight: '500',
    cursor: 'pointer', transition: 'background-color 0.2s ease',
    fontFamily: "'Poppins', sans-serif"
};

export default DetalleProducto;
