import { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { FoodieContext } from './state/AppContext';
import Navbar from './components/Navbar';
import Banner from './components/Banner';
import AdminPanel from './components/AdminPanel';
import Footer from './components/Footer';
import DetalleProducto from './components/DetalleProducto';
import MisPedidos from './components/MisPedidos';
import Login from './components/Login';
import Signup from './components/Signup';
import Carrito from './components/Carrito';
import AdminDashboard from './components/AdminDashboard';

const MAPEO_IMAGENES = {
    pizzas: '/src/assets/pizza.webp',
    hamburguesas: '/src/assets/hamburguesa.webp',
    sushi: '/src/assets/sushi.webp',
    vegano: '/src/assets/vegano.webp',
    empanadas: '/src/assets/empanada.webp',
    parrilla: '/src/assets/parrilla.webp',
    postres: '/src/assets/postre.webp'
};

const obtenerImagenReal = (nombrePlato, categoria, imagenUrlVendedor) => {
    if (imagenUrlVendedor && imagenUrlVendedor.trim() !== '') {
        if (imagenUrlVendedor.startsWith('/uploads')) {
            return `http://localhost:3000${imagenUrlVendedor}`;
        }
        return imagenUrlVendedor;
    }
    if (!categoria) return '/src/assets/default.webp';
    const catKey = categoria.toLowerCase();
    return MAPEO_IMAGENES[catKey] || '/src/assets/default.webp';
};

function App() {
  const { usuario, token, logout, agregarAlCarrito, carrito } = useContext(FoodieContext);

  const [busqueda, setBusqueda] = useState('');
  const [platos, setPlatos] = useState([]);
  const [verAdmin, setVerAdmin] = useState(false);
  const [verMisPedidos, setVerMisPedidos] = useState(false);
  const [verCarrito, setVerCarrito] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [platoSeleccionado, setPlatoSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(false);

  const [mostrarAuth, setMostrarAuth] = useState(false);
  const [vistaAuth, setVistaAuth] = useState('login');

  useEffect(() => {
    if (usuario) setMostrarAuth(false);
  }, [usuario]);

  const buscarPlatos = useCallback(async (texto, categoria) => {
    setCargando(true);
    try {
      const params = {};
      if (texto && texto.trim() !== '') params.busqueda = texto.trim();
      if (categoria && categoria !== 'Todos') params.categoria = categoria;

      const res = await axios.get('http://localhost:3000/api/platos', { params });
      setPlatos(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    buscarPlatos('', 'Todos');
  }, [buscarPlatos]);

  useEffect(() => {
    const timer = setTimeout(() => {
      buscarPlatos(busqueda, categoriaActiva);
    }, 300);
    return () => clearTimeout(timer);
  }, [busqueda, categoriaActiva, buscarPlatos]);

  const manejarIntencionCompra = (accion, parametro = null) => {
    if (!usuario) {
      alert("Para poder ver los detalles o armar su pedido, por favor inicie sesión primero.");
      setVistaAuth('login');
      setMostrarAuth(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (accion === 'detalle') setPlatoSeleccionado(parametro);
    else if (accion === 'agregar') agregarAlCarrito(parametro);
  };

  const esVendedor = usuario?.rol === 'vendedor' || usuario?.rol === 'admin';

  const platosFiltrados = platos.filter(plato => 
    plato.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (plato.categoria && plato.categoria.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div style={{ backgroundColor: '#fdfdfd', minHeight: '100vh', fontFamily: "'Poppins', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <Navbar
        nombreUsuario={usuario?.nombre}
        rolUsuario={usuario?.rol}
        cerrarSesion={logout}
        abrirLogin={() => { setMostrarAuth(true); setVistaAuth('login'); }}
        verAdmin={verAdmin}
        setVerAdmin={(v) => { setVerAdmin(v); setMostrarAuth(false); setVerMisPedidos(false); }}
        alVerPerfil={() => { setVerMisPedidos(true); setVerAdmin(false); setMostrarAuth(false); }}
        abrirCarrito={() => setVerCarrito(true)}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        ocultarBusqueda={mostrarAuth}
        cantidadCarrito={carrito.length}
        irAlInicio={() => { setMostrarAuth(false); setVerAdmin(false); setVerMisPedidos(false); setPlatoSeleccionado(null); }}
      />

      {verCarrito && <Carrito alCerrar={() => setVerCarrito(false)} />}
      {!mostrarAuth && !verAdmin && !verMisPedidos && !platoSeleccionado && <Banner />}

      <div style={{ flex: 1, maxWidth: '1250px', width: '100%', margin: '0 auto', padding: '40px 20px' }}>
        {mostrarAuth && !usuario ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            {vistaAuth === 'login' ? (
              <Login alIrARegistro={() => setVistaAuth('registro')} alCerrar={() => setMostrarAuth(false)} />
            ) : (
              <Signup alIrALogin={() => setVistaAuth('login')} />
            )}
          </div>
        ) : verAdmin && usuario && esVendedor ? (
          <>
            {usuario?.rol === 'vendedor' && <AdminDashboard token={token} />}
            <AdminPanel token={token} vendedorId={usuario.id} rol={usuario?.rol} onRefreshPlatos={() => buscarPlatos(busqueda, categoriaActiva)} />
          </>
        ) : verMisPedidos && usuario ? (
          <MisPedidos token={token} alCerrar={() => setVerMisPedidos(false)} />
        ) : platoSeleccionado && usuario ? (
          <DetalleProducto plato={platoSeleccionado} alCerrar={() => setPlatoSeleccionado(null)} alAgregar={agregarAlCarrito} obtenerImagenReal={obtenerImagenReal} usuario={usuario} token={token} onRefreshPlatos={() => buscarPlatos(busqueda, categoriaActiva)} />
        ) : (
          <main id="catalogo-menu">
            <h3 style={{ fontWeight: '600', marginBottom: '24px', color: '#212121', fontSize: '1.5rem' }}>Explorar Menú</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '40px', overflowX: 'auto', paddingBottom: '10px' }}>
              {['Todos', 'Pizzas', 'Hamburguesas', 'Empanadas', 'Parrilla', 'Sushi', 'Vegano', 'Postres'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoriaActiva(cat)}
                  style={{
                    padding: '10px 24px', borderRadius: '4px', border: '1px solid #e0e0e0',
                    backgroundColor: categoriaActiva === cat ? '#d32f2f' : '#ffffff',
                    color: categoriaActiva === cat ? '#ffffff' : '#424242',
                    fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: "'Poppins', sans-serif",
                    boxShadow: categoriaActiva === cat ? '0 2px 8px rgba(211, 47, 47, 0.2)' : 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {cargando ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#757575' }}>
                <p style={{ fontSize: '1rem', fontWeight: '500' }}>Cargando platos...</p>
              </div>
            ) : platosFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#757575' }}>
                <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>No se encontraron platos</p>
                <p style={{ fontSize: '0.9rem' }}>Probá con otra búsqueda o categoría</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '32px' }}>
                {platosFiltrados.map(plato => (
                  <div key={plato.id} onClick={() => manejarIntencionCompra('detalle', plato)} style={estiloCard}>
                    <div style={{
                      height: '200px', overflow: 'hidden', backgroundColor: '#f9f9f9',
                      borderBottom: '1px solid #eeeeee', display: 'flex',
                      alignItems: 'center', justifyContent: 'center'
                    }}>
                      <img
                        src={obtenerImagenReal(plato.nombre, plato.categoria, plato.imagenUrl)}
                        alt={plato.nombre}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                      />
                    </div>

                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontWeight: '600', color: '#212121', fontSize: '1.15rem' }}>{plato.nombre}</h4>
                        <span style={{ fontSize: '0.75rem', backgroundColor: '#f5f5f5', color: '#757575', padding: '3px 8px', borderRadius: '3px', fontWeight: '500', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                          {plato.categoria}
                        </span>
                      </div>
                      {plato.descripcion && <p style={{ fontSize: '0.9rem', color: '#757575', margin: '0 0 20px 0', lineHeight: '1.5' }}>{plato.descripcion}</p>}
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        {plato.es_vegano && <span style={estiloBadge}>Vegano</span>}
                        {plato.es_sintacc && <span style={estiloBadge}>Sin TACC</span>}
                        {plato.tiempo_prep && <span style={estiloBadgeNeutro}>{plato.tiempo_prep}</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <p style={{ color: '#d32f2f', fontWeight: '700', fontSize: '1.25rem', margin: 0 }}>${plato.precio}</p>
                        {!esVendedor ? (
                          <button onClick={(e) => { e.stopPropagation(); manejarIntencionCompra('agregar', plato); }} style={estiloBotonAgregar}>
                            Añadir
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: '#757575', fontWeight: '500' }}>Stock: {plato.stock} un.</span>
                        )}
                      </div>
                    </div>
                  </div>
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

const estiloCard = {
  backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden',
  boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0',
  cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  fontFamily: "'Poppins', sans-serif", display: 'flex', flexDirection: 'column'
};

const estiloBotonAgregar = {
  backgroundColor: '#d32f2f', color: '#ffffff', border: 'none',
  padding: '8px 20px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer',
  fontFamily: "'Poppins', sans-serif", transition: 'all 0.2s ease',
  boxShadow: '0 2px 6px rgba(211, 47, 47, 0.25)'
};

const estiloBadge = {
  padding: '3px 10px', backgroundColor: '#e8f5e9', color: '#2e7d32',
  borderRadius: '3px', fontSize: '0.75rem', fontWeight: '600'
};

const estiloBadgeNeutro = {
  padding: '3px 10px', backgroundColor: '#f5f5f5', color: '#757575',
  borderRadius: '3px', fontSize: '0.75rem', fontWeight: '500'
};

export default App;
