import React, { useState } from 'react';
import logo from '../assets/logo.png';
import axios from 'axios';

function Navbar({
    nombreUsuario,
    rolUsuario, 
    cerrarSesion,
    abrirLogin,
    verAdmin,
    setVerAdmin,
    busqueda,
    setBusqueda,
    ocultarBusqueda,
    alVerPerfil,
    cantidadCarrito,
    abrirCarrito, 
    irAlInicio 
}) {
    const [hoverPanel, setHoverPanel] = useState(false);
    const [hoverSalir, setHoverSalir] = useState(false);
    const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
    const [notificaciones, setNotificaciones] = useState([
        { id: 1, texto: 'Nuevo pedido registrado: Comanda #1024 pendiente de preparación.' },
        { id: 2, texto: 'Un usuario realizó una pregunta en tu publicación: Hamburguesa Smash.' }
    ]);
    
    // Verificamos si el usuario pertenece al equipo de gestión corporativa
    const esVendedor = rolUsuario === 'vendedor' || rolUsuario === 'admin';

    const [modalVendedor, setModalVendedor] = useState(false);
    const [formVendedor, setFormVendedor] = useState({ nombreLocal: '', descripcionProductos: '', telefono: '', direccion: '', categoria: 'Pizzas' });

    const enviarSolicitudVendedor = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) return alert('Debes iniciar sesión.');
        try {
            const res = await axios.post('http://localhost:3000/api/usuarios/solicitar-vendedor', formVendedor, {
                headers: { 'authorization': `Bearer ${token}` }
            });
            alert(res.data.mensaje);
            setModalVendedor(false);
        } catch (err) {
            alert(err.response?.data?.mensaje || 'Error al enviar la solicitud.');
        }
    };

    return (
        <nav style={estiloNav}>
            <div style={estiloContenedor}>

                {/* LOGO */}
                <div style={estiloLogoGroup} onClick={irAlInicio}>
                    <img src={logo} alt="FoodieByte Logo" style={estiloImagenLogo} />
                    <h1 style={estiloTextoLogo}>Foodie<span style={{ color: '#424242' }}>Byte</span></h1>
                </div>

                {/* BUSCADOR */}
                {!ocultarBusqueda ? (
                    <div style={estiloBuscadorCentrado}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#757575" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar en el menú..."
                            value={busqueda}
                            onChange={(e) => {
                                setBusqueda(e.target.value);
                                document.getElementById('catalogo-menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            onFocus={() => {
                                document.getElementById('catalogo-menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            style={estiloInputBusqueda}
                        />
                    </div>
                ) : <div />}

                {/* ACCIONES CLAVE */}
                <div style={estiloAcciones}>
                    {nombreUsuario ? (
                        <>
                            {/* VISTA EXCLUSIVA DEL CLIENTE: Solo ve Carrito y Sus Pedidos */}
                            {!esVendedor && (
                                <>
                                    <div 
                                        onClick={() => setModalVendedor(true)} 
                                        style={estiloEnlaceSutil}
                                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                        </svg>
                                        Quiero ser Vendedor
                                    </div>
                                    <button onClick={alVerPerfil} style={estiloLinkNav}>Mis Pedidos</button>
                                    <button onClick={abrirCarrito} style={estiloBotonCarrito}>
                                        <span style={{ fontWeight: '500' }}>Carrito</span>
                                        {cantidadCarrito > 0 && (
                                            <span style={estiloBadgeNav}>{cantidadCarrito}</span>
                                        )}
                                    </button>
                                </>
                            )}
                            
                            {/* VISTA EXCLUSIVA DEL VENDEDOR: Acceso administrativo destadado */}
                            {esVendedor && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={estiloContenedorCampana} onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#757575" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }}>
                                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                        </svg>
                                        {notificaciones.length > 0 && (
                                            <span style={estiloBadgeNotificacion}>{notificaciones.length}</span>
                                        )}
                                        {mostrarNotificaciones && (
                                            <div style={estiloDropdownNotificaciones}>
                                                <div style={estiloHeaderDropdown}>
                                                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#212121' }}>Notificaciones</h4>
                                                </div>
                                                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                                    {notificaciones.length === 0 ? (
                                                        <div style={{ padding: '16px', textAlign: 'center', color: '#757575', fontSize: '0.85rem' }}>No hay notificaciones nuevas.</div>
                                                    ) : (
                                                        notificaciones.map(n => (
                                                            <div key={n.id} style={estiloItemNotificacion}>
                                                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#424242', lineHeight: '1.4' }}>{n.texto}</p>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                                {notificaciones.length > 0 && (
                                                    <div style={{ padding: '8px', borderTop: '1px solid #eeeeee' }}>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setNotificaciones([]); setMostrarNotificaciones(false); }} 
                                                            style={estiloBotonLimpiarNotif}
                                                        >
                                                            Marcar todas como leídas
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => setVerAdmin(!verAdmin)} 
                                        style={hoverPanel ? { ...estiloBotonPanel, backgroundColor: '#424242' } : estiloBotonPanel}
                                        onMouseEnter={() => setHoverPanel(true)}
                                        onMouseLeave={() => setHoverPanel(false)}
                                    >
                                        {verAdmin ? 'Volver al Menú' : 'Panel de Gestión'}
                                    </button>
                                </div>
                            )}

                            {/* CIERRE DE SESIÓN DISCRETO (Aplica a todos) */}
                            <button 
                                onClick={cerrarSesion} 
                                style={hoverSalir ? { ...estiloBotonSalir, backgroundColor: '#f9f9f9', color: '#212121' } : estiloBotonSalir}
                                onMouseEnter={() => setHoverSalir(true)}
                                onMouseLeave={() => setHoverSalir(false)}
                            >
                                Cerrar Sesión
                            </button>
                        </>
                    ) : (
                        <button onClick={abrirLogin} style={estiloBotonLogin}>
                            Iniciar Sesión
                        </button>
                    )}
                </div>

            </div>

            {/* MODAL SOLICITUD VENDEDOR */}
            {modalVendedor && (
                <div style={estiloModalOverlay}>
                    <div style={estiloModalVendedor}>
                        <div style={estiloHeaderModalVendedor}>
                            <h3 style={{ margin: 0, color: '#212121', fontSize: '1.2rem', fontWeight: '600' }}>Registrar mi Local</h3>
                            <button onClick={() => setModalVendedor(false)} style={estiloCerrarModalVendedor}>✕</button>
                        </div>
                        <form onSubmit={enviarSolicitudVendedor} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={estiloLabelVendedor}>Nombre del Emprendimiento / Local</label>
                                <input required type="text" placeholder="Ej: Burguer King" value={formVendedor.nombreLocal} onChange={e => setFormVendedor({ ...formVendedor, nombreLocal: e.target.value })} style={estiloInputVendedor} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={estiloLabelVendedor}>Teléfono de Contacto</label>
                                    <input required type="number" placeholder="Ej: 1123456789" value={formVendedor.telefono} onChange={e => setFormVendedor({ ...formVendedor, telefono: e.target.value })} style={estiloInputVendedor} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={estiloLabelVendedor}>Categoría Principal</label>
                                    <select value={formVendedor.categoria} onChange={e => setFormVendedor({ ...formVendedor, categoria: e.target.value })} style={estiloInputVendedor}>
                                        <option value="Pizzas">Pizzas</option>
                                        <option value="Hamburguesas">Hamburguesas</option>
                                        <option value="Sushi">Sushi</option>
                                        <option value="Empanadas">Empanadas</option>
                                        <option value="Postres">Postres</option>
                                        <option value="Vegano">Vegano</option>
                                        <option value="Otros">Otros</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={estiloLabelVendedor}>Dirección Comercial</label>
                                <input required type="text" placeholder="Ej: Av. Corrientes 1234, CABA" value={formVendedor.direccion} onChange={e => setFormVendedor({ ...formVendedor, direccion: e.target.value })} style={estiloInputVendedor} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={estiloLabelVendedor}>Breve descripción de los productos</label>
                                <textarea required placeholder="¿Qué tipo de comida vas a vender?" value={formVendedor.descripcionProductos} onChange={e => setFormVendedor({ ...formVendedor, descripcionProductos: e.target.value })} style={{ ...estiloInputVendedor, minHeight: '80px', resize: 'vertical' }} />
                            </div>
                            <button type="submit" style={estiloBotonSubmitVendedor}>Enviar Solicitud</button>
                        </form>
                    </div>
                </div>
            )}
        </nav>
    );
}

// ESTILOS CORPORATIVOS UCES
const estiloNav = { 
    backgroundColor: '#ffffff', 
    padding: '16px 0', 
    borderBottom: '1px solid #e0e0e0', 
    position: 'sticky', 
    top: 0, 
    zIndex: 1000, 
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)', 
    fontFamily: "'Poppins', sans-serif" 
};
const estiloContenedor = { 
    maxWidth: '1300px', 
    margin: '0 auto', 
    display: 'grid', 
    gridTemplateColumns: '1fr 1.2fr 1.5fr', 
    alignItems: 'center', 
    padding: '0 24px' 
};
const estiloLogoGroup = { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    cursor: 'pointer' 
};
const estiloImagenLogo = { 
    width: '32px', 
    height: '32px', 
    objectFit: 'contain' 
};
const estiloTextoLogo = { 
    margin: 0, 
    color: '#d32f2f', 
    fontWeight: '700', 
    fontSize: '1.4rem', 
    letterSpacing: '-0.5px' 
};
const estiloBuscadorCentrado = { 
    backgroundColor: '#f5f5f5', 
    padding: '10px 20px', 
    borderRadius: '6px', 
    display: 'flex', 
    alignItems: 'center', 
    border: '1px solid #eeeeee',
    transition: 'background-color 0.3s ease',
    maxWidth: '400px',
    margin: '0 auto',
    width: '100%'
};
const estiloInputBusqueda = { 
    border: 'none', 
    background: 'transparent', 
    outline: 'none', 
    width: '100%', 
    fontSize: '0.9rem', 
    fontWeight: '400', 
    fontFamily: "'Poppins', sans-serif", 
    color: '#212121' 
};
const estiloAcciones = { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '24px', 
    justifyContent: 'flex-end' 
};
const estiloBotonBase = {
    height: '40px',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    boxSizing: 'border-box',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    borderWidth: '1px',
    borderStyle: 'solid',
    fontFamily: "'Poppins', sans-serif",
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    gap: '8px'
};

const estiloLinkNav = { 
    ...estiloBotonBase,
    border: '1px solid #d1d5db',
    color: '#424242',
    backgroundColor: '#ffffff'
};

const estiloBotonLogin = { 
    ...estiloBotonBase,
    backgroundColor: '#d32f2f', 
    color: '#ffffff', 
    border: '1px solid #d32f2f', 
    fontWeight: '600', 
    boxShadow: '0 2px 4px rgba(211, 47, 47, 0.15)' 
};

// BOTONES DEL CLIENTE
const estiloBotonCarrito = { 
    ...estiloBotonBase,
    position: 'relative',
    border: '1px solid #212121',
    backgroundColor: '#fafafa',
    color: '#212121',
    fontWeight: '600'
};
const estiloBadgeNav = { 
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: '#d32f2f', 
    color: 'white', 
    fontSize: '0.75rem', 
    minWidth: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%', 
    fontWeight: '600',
    padding: '0 6px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
};

// BOTONES ADMINISTRATIVOS Y DE SALIDA
const estiloContenedorCampana = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '40px',
    marginLeft: '12px'
};

const estiloBadgeNotificacion = {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#d32f2f',
    color: '#ffffff',
    fontSize: '0.7rem',
    fontWeight: '700',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #ffffff'
};

const estiloDropdownNotificaciones = {
    position: 'absolute',
    top: '35px',
    right: '-10px',
    width: '300px',
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 2000,
    fontFamily: "'Poppins', sans-serif"
};

const estiloHeaderDropdown = {
    padding: '12px 16px',
    borderBottom: '1px solid #eeeeee',
    backgroundColor: '#fafafa',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px'
};

const estiloItemNotificacion = {
    padding: '12px 16px',
    borderBottom: '1px solid #f5f5f5',
    cursor: 'default'
};

const estiloBotonLimpiarNotif = {
    width: '100%',
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#d32f2f',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Poppins', sans-serif"
};

const estiloBotonPanel = {
    ...estiloBotonBase,
    backgroundColor: '#212121',
    color: '#ffffff',
    border: '1px solid #212121'
};

const estiloBotonSalir = { 
    ...estiloBotonBase,
    border: '1px solid #ffcdd2',
    color: '#d32f2f',
    backgroundColor: '#fff5f5'
};

// ESTILOS MODAL VENDEDOR Y ENLACES SUTILES
const estiloEnlaceSutil = { 
    ...estiloBotonBase,
    border: '1px solid #1976d2',
    color: '#1976d2',
    backgroundColor: '#f8fBff'
};

const estiloModalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' };
const estiloModalVendedor = { backgroundColor: '#ffffff', width: '100%', maxWidth: '450px', padding: '32px', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', fontFamily: "'Poppins', sans-serif" };
const estiloHeaderModalVendedor = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eeeeee', paddingBottom: '16px' };
const estiloCerrarModalVendedor = { background: 'none', border: 'none', fontSize: '1.2rem', color: '#757575', cursor: 'pointer' };
const estiloLabelVendedor = { color: '#424242', fontSize: '0.9rem', fontWeight: '500' };
const estiloInputVendedor = { padding: '12px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '0.95rem', outline: 'none', fontFamily: "'Poppins', sans-serif" };
const estiloBotonSubmitVendedor = { backgroundColor: '#212121', color: '#ffffff', border: 'none', padding: '14px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", marginTop: '10px' };

export default Navbar;