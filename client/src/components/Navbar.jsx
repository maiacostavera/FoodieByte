import { useState } from 'react';
import logo from '../assets/logo.png';
import api, { mensajeDeError } from '../api/client';
import { useFoodie } from '../state/FoodieContext';

function Navbar({
    nombreUsuario, rolUsuario, cerrarSesion, abrirLogin,
    verAdmin, setVerAdmin, busqueda, setBusqueda, ocultarBusqueda,
    alVerPerfil, cantidadCarrito, abrirCarrito, irAlInicio, categorias
}) {
    const { mostrarAviso } = useFoodie();

    const [hoverPanel, setHoverPanel] = useState(false);
    const [hoverSalir, setHoverSalir] = useState(false);
    const [modalVendedor, setModalVendedor] = useState(false);
    const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
    const [errorSolicitud, setErrorSolicitud] = useState('');
    const [formVendedor, setFormVendedor] = useState({
        nombreLocal: '', descripcionProductos: '', telefono: '', direccion: '',
        categoria: categorias[0] || 'Pizzas'
    });

    const esGestor = rolUsuario === 'vendedor' || rolUsuario === 'admin';
    const estaLogueado = Boolean(nombreUsuario);
    // El alta de local solo tiene sentido para un foodie con sesión iniciada.
    const puedePostularse = estaLogueado && !esGestor;

    const enviarSolicitudVendedor = async (e) => {
        e.preventDefault();
        setErrorSolicitud('');
        setEnviandoSolicitud(true);

        try {
            const { data } = await api.post('/usuarios/solicitar-vendedor', formVendedor);
            mostrarAviso(data.mensaje, 'exito');
            setModalVendedor(false);
        } catch (err) {
            setErrorSolicitud(mensajeDeError(err, 'No se pudo enviar la solicitud.'));
        } finally {
            setEnviandoSolicitud(false);
        }
    };

    const actualizarForm = (campo, valor) => setFormVendedor(prev => ({ ...prev, [campo]: valor }));

    return (
        <nav style={estiloNav}>
            <div style={estiloContenedor}>

                <div style={estiloLogoGroup} onClick={irAlInicio} role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') irAlInicio(); }}>
                    <img src={logo} alt="" style={estiloImagenLogo} />
                    <span style={estiloTextoLogo}>Foodie<span style={{ color: '#424242' }}>Byte</span></span>
                </div>

                {!ocultarBusqueda ? (
                    <div style={estiloBuscadorCentrado}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#757575" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }} aria-hidden="true">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <label htmlFor="buscador" style={{ display: 'none' }}>Buscar en el menú</label>
                        <input id="buscador" type="search" placeholder="Buscar en el menú…"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            onFocus={() => document.getElementById('catalogo-menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            style={estiloInputBusqueda} />
                    </div>
                ) : <div />}

                <div style={estiloAcciones}>
                    {puedePostularse && (
                        <button onClick={() => setModalVendedor(true)} style={estiloEnlaceSutil}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }} aria-hidden="true">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                <polyline points="9 22 9 12 15 12 15 22"></polyline>
                            </svg>
                            Quiero ser Vendedor
                        </button>
                    )}

                    {estaLogueado ? (
                        <>
                            {!esGestor && (
                                <>
                                    <button onClick={alVerPerfil} style={estiloLinkNav}>Mis Pedidos</button>
                                    <button onClick={abrirCarrito} style={estiloBotonCarrito}>
                                        <span style={{ fontWeight: '500' }}>Carrito</span>
                                        {cantidadCarrito > 0 && <span style={estiloBadgeNav}>{cantidadCarrito}</span>}
                                    </button>
                                </>
                            )}

                            {esGestor && (
                                <button
                                    onClick={() => setVerAdmin(!verAdmin)}
                                    style={{ ...estiloBotonPanel, backgroundColor: hoverPanel ? '#424242' : '#212121' }}
                                    onMouseEnter={() => setHoverPanel(true)}
                                    onMouseLeave={() => setHoverPanel(false)}>
                                    {verAdmin ? 'Volver al Menú' : 'Panel de Gestión'}
                                </button>
                            )}

                            <span style={estiloNombreUsuario}>{nombreUsuario}</span>

                            <button onClick={cerrarSesion}
                                style={hoverSalir ? { ...estiloBotonSalir, backgroundColor: '#f9f9f9', color: '#212121' } : estiloBotonSalir}
                                onMouseEnter={() => setHoverSalir(true)}
                                onMouseLeave={() => setHoverSalir(false)}>
                                Cerrar Sesión
                            </button>
                        </>
                    ) : (
                        <button onClick={abrirLogin} style={estiloBotonLogin}>Iniciar Sesión</button>
                    )}
                </div>

            </div>

            {modalVendedor && (
                <div style={estiloModalOverlay} onClick={() => setModalVendedor(false)}>
                    <div style={estiloModalVendedor} onClick={e => e.stopPropagation()}>
                        <div style={estiloHeaderModalVendedor}>
                            <h3 style={{ margin: 0, color: '#212121', fontSize: '1.2rem', fontWeight: '600' }}>Registrar mi Local</h3>
                            <button onClick={() => setModalVendedor(false)} style={estiloCerrarModalVendedor} aria-label="Cerrar">✕</button>
                        </div>

                        <p style={{ color: '#757575', fontSize: '0.88rem', margin: '12px 0 0 0', lineHeight: '1.5' }}>
                            Un administrador revisará estos datos antes de habilitar tu local.
                        </p>

                        <form onSubmit={enviarSolicitudVendedor} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                            <div style={estiloCampo}>
                                <label htmlFor="local-nombre" style={estiloLabelVendedor}>Nombre del Emprendimiento / Local</label>
                                <input id="local-nombre" required type="text" placeholder="Ej: Pizzería La Nonna"
                                    value={formVendedor.nombreLocal}
                                    onChange={e => actualizarForm('nombreLocal', e.target.value)} style={estiloInputVendedor} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={estiloCampo}>
                                    <label htmlFor="local-telefono" style={estiloLabelVendedor}>Teléfono de Contacto</label>
                                    <input id="local-telefono" required type="tel" placeholder="Ej: 1123456789"
                                        value={formVendedor.telefono}
                                        onChange={e => actualizarForm('telefono', e.target.value)} style={estiloInputVendedor} />
                                </div>
                                <div style={estiloCampo}>
                                    <label htmlFor="local-categoria" style={estiloLabelVendedor}>Categoría Principal</label>
                                    {/* La lista viene del servidor: una sola fuente de verdad. */}
                                    <select id="local-categoria" value={formVendedor.categoria}
                                        onChange={e => actualizarForm('categoria', e.target.value)} style={estiloInputVendedor}>
                                        {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        <option value="Otros">Otros</option>
                                    </select>
                                </div>
                            </div>

                            <div style={estiloCampo}>
                                <label htmlFor="local-direccion" style={estiloLabelVendedor}>Dirección Comercial</label>
                                <input id="local-direccion" required type="text" placeholder="Ej: Av. Corrientes 1234, CABA"
                                    value={formVendedor.direccion}
                                    onChange={e => actualizarForm('direccion', e.target.value)} style={estiloInputVendedor} />
                            </div>

                            <div style={estiloCampo}>
                                <label htmlFor="local-descripcion" style={estiloLabelVendedor}>Breve descripción de los productos</label>
                                <textarea id="local-descripcion" required placeholder="¿Qué tipo de comida vas a vender?"
                                    value={formVendedor.descripcionProductos}
                                    onChange={e => actualizarForm('descripcionProductos', e.target.value)}
                                    style={{ ...estiloInputVendedor, minHeight: '80px', resize: 'vertical' }} />
                            </div>

                            {errorSolicitud && (
                                <p role="alert" style={{ color: '#c62828', backgroundColor: '#ffebee', padding: '10px 14px', borderRadius: '4px', fontSize: '0.85rem', margin: 0 }}>
                                    {errorSolicitud}
                                </p>
                            )}

                            <button type="submit" disabled={enviandoSolicitud}
                                style={{ ...estiloBotonSubmitVendedor, opacity: enviandoSolicitud ? 0.6 : 1 }}>
                                {enviandoSolicitud ? 'Enviando…' : 'Enviar Solicitud'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </nav>
    );
}

const estiloNav = { backgroundColor: '#ffffff', borderBottom: '1px solid #eeeeee', position: 'sticky', top: 0, zIndex: 1000, fontFamily: "'Poppins', sans-serif" };
const estiloContenedor = { maxWidth: '1250px', margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' };
const estiloLogoGroup = { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' };
const estiloImagenLogo = { width: '38px', height: '38px', objectFit: 'contain' };
const estiloTextoLogo = { fontSize: '1.4rem', fontWeight: '700', color: '#d32f2f', lineHeight: 1 };
const estiloBuscadorCentrado = { flex: '1 1 260px', maxWidth: '460px', display: 'flex', alignItems: 'center', backgroundColor: '#fafafa', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '0 14px' };
const estiloInputBusqueda = { flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '11px 0', fontSize: '0.95rem', color: '#212121', fontFamily: "'Poppins', sans-serif" };
const estiloAcciones = { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' };
const estiloEnlaceSutil = { display: 'flex', alignItems: 'center', color: '#757575', fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer', background: 'none', border: 'none', fontFamily: "'Poppins', sans-serif" };
const estiloLinkNav = { background: 'none', border: 'none', color: '#424242', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" };
const estiloBotonCarrito = { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fafafa', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '8px 16px', cursor: 'pointer', color: '#424242', fontSize: '0.9rem', fontFamily: "'Poppins', sans-serif" };
const estiloBadgeNav = { backgroundColor: '#d32f2f', color: '#ffffff', borderRadius: '10px', padding: '1px 8px', fontSize: '0.75rem', fontWeight: '700' };
const estiloBotonPanel = { color: '#ffffff', border: 'none', borderRadius: '4px', padding: '9px 18px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" };
const estiloNombreUsuario = { color: '#757575', fontSize: '0.85rem', fontWeight: '500' };
const estiloBotonSalir = { background: 'transparent', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '8px 16px', color: '#757575', fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" };
const estiloBotonLogin = { backgroundColor: '#d32f2f', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '10px 22px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" };
const estiloModalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 4000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' };
const estiloModalVendedor = { backgroundColor: '#ffffff', width: '100%', maxWidth: '540px', borderRadius: '8px', padding: '32px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' };
const estiloHeaderModalVendedor = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #eeeeee' };
const estiloCerrarModalVendedor = { background: 'none', border: 'none', fontSize: '1.4rem', color: '#757575', cursor: 'pointer' };
const estiloCampo = { display: 'flex', flexDirection: 'column', gap: '8px' };
const estiloLabelVendedor = { color: '#424242', fontSize: '0.88rem', fontWeight: '600' };
const estiloInputVendedor = { padding: '12px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '0.95rem', fontFamily: "'Poppins', sans-serif", outline: 'none', backgroundColor: '#ffffff' };
const estiloBotonSubmitVendedor = { backgroundColor: '#d32f2f', color: '#ffffff', border: 'none', padding: '14px', borderRadius: '4px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" };

export default Navbar;
