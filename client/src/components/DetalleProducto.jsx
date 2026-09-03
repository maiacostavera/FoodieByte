import { useState, useEffect, useCallback } from 'react';
import api, { mensajeDeError } from '../api/client';
import { imagenDelPlato } from '../utils/imagenes';
import { useFoodie } from '../state/FoodieContext';

function DetalleProducto({ plato, alCerrar, alAgregar, usuario, onRefreshPlatos }) {
    const { mostrarAviso } = useFoodie();

    const [cantidad, setCantidad] = useState(1);
    const [stockActual, setStockActual] = useState(Number(plato?.stock ?? 0));

    // Las preguntas se leen del servidor: son reales y persisten entre sesiones.
    const [preguntas, setPreguntas] = useState([]);
    const [cargandoPreguntas, setCargandoPreguntas] = useState(true);
    const [pregunta, setPregunta] = useState('');
    const [enviandoPregunta, setEnviandoPregunta] = useState(false);
    const [respuestaTexto, setRespuestaTexto] = useState({});

    const [nuevoStock, setNuevoStock] = useState(Number(plato?.stock ?? 0));
    const [guardandoStock, setGuardandoStock] = useState(false);

    const platoId = plato?.id;
    const esGestor = usuario?.rol === 'vendedor' || usuario?.rol === 'admin';
    const esFoodie = usuario?.rol === 'foodie';
    // Solo el dueño del plato (o el admin) puede responder consultas.
    const puedeResponder = usuario?.rol === 'admin' ||
        (usuario?.rol === 'vendedor' && Number(plato?.vendedorId) === Number(usuario?.id));

    const cargarPreguntas = useCallback(async () => {
        if (!platoId) return;
        setCargandoPreguntas(true);
        try {
            const { data } = await api.get(`/platos/${platoId}/preguntas`);
            setPreguntas(data);
        } catch {
            setPreguntas([]);
        } finally {
            setCargandoPreguntas(false);
        }
    }, [platoId]);

    useEffect(() => { cargarPreguntas(); }, [cargarPreguntas]);

    useEffect(() => {
        setStockActual(Number(plato?.stock ?? 0));
        setNuevoStock(Number(plato?.stock ?? 0));
        setCantidad(1);
    }, [plato]);

    if (!plato) return null;

    const enviarPregunta = async (e) => {
        e.preventDefault();
        const texto = pregunta.trim();
        if (texto.length < 3) {
            mostrarAviso('La consulta debe tener al menos 3 caracteres.', 'error');
            return;
        }

        setEnviandoPregunta(true);
        try {
            const { data } = await api.post(`/platos/${plato.id}/preguntas`, { texto });
            setPreguntas(prev => [...prev, data.pregunta]);
            setPregunta('');
            mostrarAviso(data.mensaje, 'exito');
        } catch (err) {
            mostrarAviso(mensajeDeError(err, 'No se pudo enviar la consulta.'), 'error');
        } finally {
            setEnviandoPregunta(false);
        }
    };

    const responderPregunta = async (preguntaId) => {
        const texto = (respuestaTexto[preguntaId] || '').trim();
        if (!texto) return;

        try {
            const { data } = await api.put(`/platos/${plato.id}/preguntas/${preguntaId}`, { respuesta: texto });
            setPreguntas(prev => prev.map(p => (p.id === preguntaId ? data.pregunta : p)));
            setRespuestaTexto(prev => ({ ...prev, [preguntaId]: '' }));
            mostrarAviso('Respuesta publicada.', 'exito');
        } catch (err) {
            mostrarAviso(mensajeDeError(err, 'No se pudo publicar la respuesta.'), 'error');
        }
    };

    const guardarStock = async () => {
        if (nuevoStock < 0) return;
        setGuardandoStock(true);
        try {
            const { data } = await api.put(`/platos/${plato.id}/stock`, { stock: nuevoStock });
            setStockActual(Number(data.plato.stock));
            if (onRefreshPlatos) onRefreshPlatos();
            mostrarAviso('Stock actualizado correctamente.', 'exito');
        } catch (err) {
            mostrarAviso(mensajeDeError(err, 'No se pudo actualizar el stock.'), 'error');
        } finally {
            setGuardandoStock(false);
        }
    };

    const nombreDelLocal = plato.vendedor?.nombre_local || plato.vendedor?.nombre;

    return (
        <div style={estiloContenedor}>
            <button onClick={alCerrar} style={estiloBotonVolver}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Volver al Menú
            </button>

            <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 400px' }}>
                    <div style={estiloImagenContainer}>
                        <img src={imagenDelPlato(plato.categoria, plato.imagenUrl)} alt={plato.nombre}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                        {plato.es_vegano && <span style={estiloTag}>Vegano</span>}
                        {plato.es_sintacc && <span style={estiloTag}>Sin TACC</span>}
                        {plato.tiempo_prep && <span style={estiloTag}>{plato.tiempo_prep}</span>}
                        <span style={estiloTag}>{plato.categoria}</span>
                    </div>
                </div>

                <div style={{ flex: '1 1 300px' }}>
                    <span style={estiloCategoria}>{plato.categoria}</span>
                    <h1 style={{ fontSize: '2.2rem', color: '#212121', margin: '8px 0 12px 0', fontWeight: '700' }}>{plato.nombre}</h1>

                    {nombreDelLocal && (
                        <p style={{ color: '#757575', fontSize: '0.9rem', margin: '0 0 24px 0' }}>
                            Vendido por <strong style={{ color: '#424242' }}>{nombreDelLocal}</strong>
                        </p>
                    )}

                    <p style={{ color: '#424242', fontSize: '1rem', lineHeight: '1.6', marginBottom: '32px' }}>{plato.descripcion}</p>

                    <div style={estiloPrecioBox}>
                        <span style={{ fontSize: '2.2rem', fontWeight: '700', color: '#d32f2f' }}>
                            ${Number(plato.precio).toLocaleString('es-AR')}
                        </span>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, color: '#212121', fontWeight: '600', fontSize: '0.95rem' }}>Stock Disponible</p>
                            <p style={{ margin: 0, color: stockActual < 5 ? '#d32f2f' : '#757575', fontSize: '0.9rem', fontWeight: stockActual < 5 ? '600' : '400' }}>
                                {stockActual} unidades
                            </p>
                        </div>
                    </div>

                    {esGestor ? (
                        <div style={estiloVendedorBox}>
                            <h4 style={{ margin: '0 0 16px 0', color: '#212121', fontWeight: '600', fontSize: '1rem' }}>Gestión de Stock</h4>
                            {puedeResponder ? (
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <label htmlFor="campo-stock" style={{ color: '#424242', fontSize: '0.9rem', fontWeight: '500' }}>Nuevo stock:</label>
                                    <input id="campo-stock" type="number" min="0" max="100" value={nuevoStock}
                                        onChange={(e) => setNuevoStock(parseInt(e.target.value, 10) || 0)}
                                        style={estiloInputStock} />
                                    <button onClick={guardarStock} disabled={guardandoStock}
                                        style={{ ...estiloBotonGuardarStock, opacity: guardandoStock ? 0.6 : 1 }}>
                                        {guardandoStock ? 'Guardando…' : 'Actualizar Stock'}
                                    </button>
                                </div>
                            ) : (
                                <p style={{ margin: 0, color: '#757575', fontSize: '0.9rem' }}>
                                    Este plato pertenece a otro local, no podés modificar su stock.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div style={estiloSelectorCantidad}>
                                <button onClick={() => setCantidad(Math.max(1, cantidad - 1))} style={estiloBotonCantidad} aria-label="Quitar una unidad">-</button>
                                <span style={{ padding: '0 20px', fontWeight: '600', color: '#212121', fontSize: '1rem' }}>{cantidad}</span>
                                <button onClick={() => setCantidad(Math.min(stockActual || 1, cantidad + 1))} style={estiloBotonCantidad} aria-label="Agregar una unidad">+</button>
                            </div>
                            <button onClick={() => alAgregar(plato, cantidad)} disabled={stockActual === 0}
                                style={{
                                    ...estiloBotonAgregar,
                                    opacity: stockActual === 0 ? 0.5 : 1,
                                    cursor: stockActual === 0 ? 'not-allowed' : 'pointer'
                                }}>
                                {stockActual === 0 ? 'Sin Stock' : 'Agregar al Carrito'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <hr style={{ margin: '48px 0', border: '0', borderTop: '1px solid #eeeeee' }} />

            <div style={{ display: 'grid', gridTemplateColumns: esFoodie ? '1fr 1fr' : '1fr', gap: '48px' }}>
                {esFoodie && (
                    <div>
                        <h3 style={estiloTituloSeccion}>¿Tenés alguna duda?</h3>
                        <form onSubmit={enviarPregunta}>
                            <label htmlFor="campo-pregunta" style={{ display: 'none' }}>Tu consulta</label>
                            <textarea id="campo-pregunta" maxLength={500}
                                placeholder="Escribí tu consulta sobre ingredientes, envío o preparación…"
                                value={pregunta} onChange={(e) => setPregunta(e.target.value)}
                                style={estiloTextarea} />
                            <button type="submit" disabled={enviandoPregunta}
                                style={{ ...estiloBotonPregunta, opacity: enviandoPregunta ? 0.6 : 1 }}>
                                {enviandoPregunta ? 'Enviando…' : 'Enviar Pregunta'}
                            </button>
                        </form>
                    </div>
                )}

                <div>
                    <h3 style={estiloTituloSeccion}>
                        {puedeResponder ? 'Preguntas de Clientes' : 'Últimas consultas'}
                    </h3>

                    {cargandoPreguntas ? (
                        <p style={estiloTextoVacio}>Cargando consultas…</p>
                    ) : preguntas.length === 0 ? (
                        <p style={estiloTextoVacio}>Todavía no hay consultas sobre este plato.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {preguntas.map(p => (
                                <div key={p.id} style={{ fontSize: '0.95rem' }}>
                                    <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#424242' }}>
                                        {p.autor?.nombre || 'Usuario'}: {p.texto}
                                    </p>
                                    {p.respuesta ? (
                                        <p style={estiloRespuesta}>Respuesta: {p.respuesta}</p>
                                    ) : puedeResponder ? (
                                        <div style={{ display: 'flex', gap: '8px', paddingLeft: '16px', borderLeft: '3px solid #ff9800' }}>
                                            <input type="text" placeholder="Escribí tu respuesta…"
                                                value={respuestaTexto[p.id] || ''}
                                                onChange={(e) => setRespuestaTexto(prev => ({ ...prev, [p.id]: e.target.value }))}
                                                onKeyDown={(e) => { if (e.key === 'Enter') responderPregunta(p.id); }}
                                                style={estiloInputRespuesta} />
                                            <button onClick={() => responderPregunta(p.id)} style={estiloBotonResponder}>
                                                Responder
                                            </button>
                                        </div>
                                    ) : (
                                        <p style={estiloEsperando}>Esperando respuesta del vendedor…</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const estiloContenedor = { padding: '40px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', maxWidth: '1000px', margin: '20px auto', fontFamily: "'Poppins', sans-serif" };
const estiloBotonVolver = { marginBottom: '24px', background: 'transparent', border: '1px solid #e0e0e0', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', color: '#424242', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Poppins', sans-serif", fontSize: '0.9rem' };
const estiloImagenContainer = { backgroundColor: '#f9f9f9', height: '400px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #eeeeee', overflow: 'hidden' };
const estiloCategoria = { color: '#d32f2f', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.5px' };
const estiloTag = { padding: '6px 12px', border: '1px solid #e0e0e0', color: '#424242', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500', backgroundColor: '#ffffff' };
const estiloPrecioBox = { background: '#fafafa', border: '1px solid #eeeeee', padding: '24px', borderRadius: '8px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const estiloSelectorCantidad = { display: 'flex', alignItems: 'center', border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#ffffff' };
const estiloBotonCantidad = { background: '#f5f5f5', border: 'none', padding: '12px 16px', fontSize: '1.2rem', cursor: 'pointer', color: '#424242', outline: 'none' };
const estiloBotonAgregar = { flex: 1, backgroundColor: '#d32f2f', color: '#ffffff', border: 'none', padding: '16px', borderRadius: '4px', fontSize: '1rem', fontWeight: '600', fontFamily: "'Poppins', sans-serif" };
const estiloVendedorBox = { background: '#fff8e1', border: '1px solid #ffe082', padding: '24px', borderRadius: '8px', marginBottom: '16px' };
const estiloInputStock = { width: '90px', padding: '10px 12px', borderRadius: '4px', border: '1px solid #e0e0e0', fontSize: '1rem', fontFamily: "'Poppins', sans-serif", textAlign: 'center' };
const estiloBotonGuardarStock = { backgroundColor: '#2e7d32', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem', fontFamily: "'Poppins', sans-serif" };
const estiloInputRespuesta = { flex: 1, padding: '8px 12px', borderRadius: '4px', border: '1px solid #e0e0e0', fontSize: '0.9rem', fontFamily: "'Poppins', sans-serif", outline: 'none' };
const estiloBotonResponder = { backgroundColor: '#d32f2f', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', fontFamily: "'Poppins', sans-serif", whiteSpace: 'nowrap' };
const estiloTextarea = { width: '100%', height: '120px', padding: '16px', borderRadius: '4px', border: '1px solid #e0e0e0', backgroundColor: '#fafafa', fontFamily: 'inherit', marginBottom: '16px', outline: 'none', resize: 'none', boxSizing: 'border-box' };
const estiloBotonPregunta = { backgroundColor: '#212121', color: '#ffffff', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" };
const estiloTituloSeccion = { fontSize: '1.25rem', marginBottom: '20px', color: '#212121', fontWeight: '600' };
const estiloTextoVacio = { color: '#9e9e9e', fontSize: '0.9rem' };
const estiloRespuesta = { margin: 0, color: '#757575', paddingLeft: '16px', borderLeft: '3px solid #d32f2f' };
const estiloEsperando = { margin: 0, color: '#9e9e9e', paddingLeft: '16px', fontStyle: 'italic', borderLeft: '3px solid #e0e0e0' };

export default DetalleProducto;
