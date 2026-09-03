import { useState, useEffect, useCallback } from 'react';
import api from './api/client';
import { useFoodie } from './state/FoodieContext';
import { imagenDelPlato } from './utils/imagenes';

import Navbar from './components/Navbar';
import Banner from './components/Banner';
import Aviso from './components/Aviso';
import AdminPanel from './components/AdminPanel';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';
import DetalleProducto from './components/DetalleProducto';
import MisPedidos from './components/MisPedidos';
import Login from './components/Login';
import Signup from './components/Signup';
import Carrito from './components/Carrito';

const formatearMoneda = (valor) =>
    `$${Number(valor || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function App() {
    const { usuario, logout, agregarAlCarrito, cantidadEnCarrito, mostrarAviso } = useFoodie();

    const [busqueda, setBusqueda] = useState('');
    const [platos, setPlatos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [categoriaActiva, setCategoriaActiva] = useState('Todos');
    const [cargando, setCargando] = useState(true);
    // Se incrementa cuando el panel cambia datos, para que el resumen del
    // vendedor vuelva a consultar sus cifras al servidor.
    const [versionDatos, setVersionDatos] = useState(0);

    const [verAdmin, setVerAdmin] = useState(false);
    const [verMisPedidos, setVerMisPedidos] = useState(false);
    const [verCarrito, setVerCarrito] = useState(false);
    const [platoSeleccionado, setPlatoSeleccionado] = useState(null);
    const [mostrarAuth, setMostrarAuth] = useState(false);
    const [vistaAuth, setVistaAuth] = useState('login');

    // La lista de categorías la define el backend: antes estaba escrita a mano
    // en tres archivos distintos y se habían desincronizado entre sí.
    useEffect(() => {
        api.get('/platos/categorias')
            .then(({ data }) => setCategorias(data))
            .catch(() => setCategorias([]));
    }, []);

    useEffect(() => {
        if (usuario) setMostrarAuth(false);
    }, [usuario]);

    const buscarPlatos = useCallback(async (texto, categoria) => {
        setCargando(true);
        try {
            const params = {};
            if (texto && texto.trim() !== '') params.busqueda = texto.trim();
            if (categoria && categoria !== 'Todos') params.categoria = categoria;

            const { data } = await api.get('/platos', { params });
            setPlatos(data);
        } catch {
            mostrarAviso('No se pudo cargar el menú. Verificá que el servidor esté corriendo.', 'error');
        } finally {
            setCargando(false);
        }
    }, [mostrarAviso]);

    // El filtrado lo hace el servidor; acá solo se espacian las pulsaciones
    // para no disparar una consulta por cada tecla.
    useEffect(() => {
        const temporizador = setTimeout(() => buscarPlatos(busqueda, categoriaActiva), 300);
        return () => clearTimeout(temporizador);
    }, [busqueda, categoriaActiva, buscarPlatos]);

    const volverAlInicio = () => {
        setMostrarAuth(false);
        setVerAdmin(false);
        setVerMisPedidos(false);
        setPlatoSeleccionado(null);
    };

    const manejarIntencionCompra = (accion, parametro = null) => {
        if (!usuario) {
            mostrarAviso('Para ver el detalle o armar tu pedido, iniciá sesión primero.', 'info');
            setVistaAuth('login');
            setMostrarAuth(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        if (accion === 'detalle') setPlatoSeleccionado(parametro);
        else if (accion === 'agregar') agregarAlCarrito(parametro);
    };

    const esGestor = usuario?.rol === 'vendedor' || usuario?.rol === 'admin';
    const enPortada = !mostrarAuth && !verAdmin && !verMisPedidos && !platoSeleccionado;

    return (
        <div style={estiloApp}>
            <Aviso />

            <Navbar
                nombreUsuario={usuario?.nombre}
                rolUsuario={usuario?.rol}
                categorias={categorias}
                cerrarSesion={() => { logout(); volverAlInicio(); }}
                abrirLogin={() => { setMostrarAuth(true); setVistaAuth('login'); }}
                verAdmin={verAdmin}
                setVerAdmin={(v) => { setVerAdmin(v); setMostrarAuth(false); setVerMisPedidos(false); setPlatoSeleccionado(null); }}
                alVerPerfil={() => { setVerMisPedidos(true); setVerAdmin(false); setMostrarAuth(false); }}
                abrirCarrito={() => setVerCarrito(true)}
                busqueda={busqueda}
                setBusqueda={setBusqueda}
                ocultarBusqueda={mostrarAuth || verAdmin}
                cantidadCarrito={cantidadEnCarrito}
                irAlInicio={volverAlInicio}
            />

            {verCarrito && <Carrito alCerrar={() => setVerCarrito(false)} />}

            {enPortada && <Banner />}

            <div style={estiloContenido}>
                {mostrarAuth && !usuario ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                        {vistaAuth === 'login' ? (
                            <Login alIrARegistro={() => setVistaAuth('registro')} alCerrar={() => setMostrarAuth(false)} />
                        ) : (
                            <Signup alIrALogin={() => setVistaAuth('login')} />
                        )}
                    </div>
                ) : verAdmin && esGestor ? (
                    <>
                        {usuario.rol === 'vendedor' && <AdminDashboard version={versionDatos} />}
                        <AdminPanel
                            rol={usuario.rol}
                            categorias={categorias}
                            onRefreshPlatos={() => buscarPlatos(busqueda, categoriaActiva)}
                            onDatosActualizados={() => setVersionDatos(v => v + 1)}
                        />
                    </>
                ) : verMisPedidos && usuario ? (
                    <MisPedidos alCerrar={() => setVerMisPedidos(false)} />
                ) : platoSeleccionado && usuario ? (
                    <DetalleProducto
                        plato={platoSeleccionado}
                        usuario={usuario}
                        alCerrar={() => setPlatoSeleccionado(null)}
                        alAgregar={agregarAlCarrito}
                        onRefreshPlatos={() => buscarPlatos(busqueda, categoriaActiva)}
                    />
                ) : (
                    <main id="catalogo-menu">
                        <h3 style={estiloTituloMenu}>Explorar Menú</h3>

                        <div style={estiloFiltros}>
                            {['Todos', ...categorias].map(cat => (
                                <button key={cat} onClick={() => setCategoriaActiva(cat)}
                                    aria-pressed={categoriaActiva === cat}
                                    style={{
                                        ...estiloBotonFiltro,
                                        backgroundColor: categoriaActiva === cat ? '#d32f2f' : '#ffffff',
                                        color: categoriaActiva === cat ? '#ffffff' : '#424242',
                                        boxShadow: categoriaActiva === cat ? '0 2px 8px rgba(211, 47, 47, 0.2)' : 'none'
                                    }}>
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {cargando ? (
                            <div style={estiloEstadoVacio}>
                                <p style={{ fontSize: '1rem', fontWeight: '500' }}>Cargando platos…</p>
                            </div>
                        ) : platos.length === 0 ? (
                            <div style={estiloEstadoVacio}>
                                <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>No se encontraron platos</p>
                                <p style={{ fontSize: '0.9rem' }}>Probá con otra búsqueda o categoría</p>
                            </div>
                        ) : (
                            <div style={estiloGrilla}>
                                {platos.map(plato => (
                                    <article key={plato.id} onClick={() => manejarIntencionCompra('detalle', plato)} style={estiloCard}>
                                        <div style={estiloImagenCard}>
                                            <img src={imagenDelPlato(plato.categoria, plato.imagenUrl)} alt={plato.nombre}
                                                loading="lazy"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>

                                        <div style={estiloCuerpoCard}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                <h4 style={{ margin: 0, fontWeight: '600', color: '#212121', fontSize: '1.15rem' }}>{plato.nombre}</h4>
                                                <span style={estiloBadgeNeutro}>{plato.categoria}</span>
                                            </div>

                                            {plato.vendedor && (
                                                <p style={estiloLocal}>{plato.vendedor.nombre_local || plato.vendedor.nombre}</p>
                                            )}

                                            {plato.descripcion && (
                                                <p style={estiloDescripcion}>{plato.descripcion}</p>
                                            )}

                                            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                                {plato.es_vegano && <span style={estiloBadge}>Vegano</span>}
                                                {plato.es_sintacc && <span style={estiloBadge}>Sin TACC</span>}
                                                {plato.tiempo_prep && <span style={estiloBadgeNeutro}>{plato.tiempo_prep}</span>}
                                                {plato.stock === 0 && <span style={estiloBadgeSinStock}>Sin stock</span>}
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                                                <p style={{ color: '#d32f2f', fontWeight: '700', fontSize: '1.25rem', margin: 0 }}>
                                                    {formatearMoneda(plato.precio)}
                                                </p>
                                                {esGestor ? (
                                                    <span style={{ fontSize: '0.85rem', color: '#757575', fontWeight: '500' }}>
                                                        Stock: {plato.stock} un.
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); manejarIntencionCompra('agregar', plato); }}
                                                        disabled={plato.stock === 0}
                                                        style={{ ...estiloBotonAgregar, opacity: plato.stock === 0 ? 0.5 : 1, cursor: plato.stock === 0 ? 'not-allowed' : 'pointer' }}>
                                                        {plato.stock === 0 ? 'Agotado' : 'Añadir'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </main>
                )}
            </div>

            <Footer />
        </div>
    );
}

const estiloApp = { backgroundColor: '#fdfdfd', minHeight: '100vh', fontFamily: "'Poppins', sans-serif", display: 'flex', flexDirection: 'column' };
const estiloContenido = { flex: 1, maxWidth: '1250px', width: '100%', margin: '0 auto', padding: '40px 20px' };
const estiloTituloMenu = { fontWeight: '600', marginBottom: '24px', color: '#212121', fontSize: '1.5rem' };
const estiloFiltros = { display: 'flex', gap: '10px', marginBottom: '40px', overflowX: 'auto', paddingBottom: '10px' };
const estiloBotonFiltro = { padding: '10px 24px', borderRadius: '4px', border: '1px solid #e0e0e0', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: "'Poppins', sans-serif", whiteSpace: 'nowrap' };
const estiloEstadoVacio = { textAlign: 'center', padding: '60px 0', color: '#757575' };
const estiloGrilla = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '32px' };
const estiloCard = { backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", display: 'flex', flexDirection: 'column' };
const estiloImagenCard = { height: '200px', overflow: 'hidden', backgroundColor: '#f9f9f9', borderBottom: '1px solid #eeeeee', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const estiloCuerpoCard = { padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 };
const estiloLocal = { fontSize: '0.82rem', color: '#9e9e9e', margin: '0 0 12px 0', fontWeight: '500' };
const estiloDescripcion = { fontSize: '0.9rem', color: '#757575', margin: '0 0 20px 0', lineHeight: '1.5' };
const estiloBotonAgregar = { backgroundColor: '#d32f2f', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: '4px', fontWeight: '600', fontFamily: "'Poppins', sans-serif", boxShadow: '0 2px 6px rgba(211, 47, 47, 0.25)' };
const estiloBadge = { padding: '3px 10px', backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: '3px', fontSize: '0.75rem', fontWeight: '600' };
const estiloBadgeNeutro = { padding: '3px 10px', backgroundColor: '#f5f5f5', color: '#757575', borderRadius: '3px', fontSize: '0.75rem', fontWeight: '500', whiteSpace: 'nowrap', marginLeft: '8px' };
const estiloBadgeSinStock = { padding: '3px 10px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '3px', fontSize: '0.75rem', fontWeight: '600' };

export default App;
