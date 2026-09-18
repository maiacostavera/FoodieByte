import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from './api/client';
import { useFoodie } from './state/FoodieContext';
import { useRuta, navegar, RUTAS } from './utils/rutas';
import { imagenDelPlato } from './utils/imagenes';

import Navbar from './components/Navbar';
import Banner from './components/Banner';
import Catalogo from './components/Catalogo';
import DetalleProducto from './components/DetalleProducto';
import MisPedidos from './components/MisPedidos';
import PanelAcceso from './components/PanelAcceso';
import Login from './components/Login';
import Signup from './components/Signup';
import Carrito from './components/Carrito';
import SolicitudLocal from './components/SolicitudLocal';
import PaginasInfo from './components/PaginasInfo';
import Footer from './components/Footer';
import Aviso from './components/Aviso';
import Confirmacion from './components/Confirmacion';
import Icono from './components/Icono';
import PanelGestion from './components/panel/PanelGestion';

// Si la API todavía no terminó de arrancar (pasa justo después de npm run
// dev), el catálogo se vuelve a pedir solo cada 3 segundos, hasta 10 veces.
const REINTENTOS = { cada: 3000, maximo: 10 };

const irAlCatalogo = () => setTimeout(() => {
    document.getElementById('catalogo-menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}, 60);

function App() {
    const { usuario, logout, agregarAlCarrito, mostrarAviso } = useFoodie();
    const ruta = useRuta();
    const esGestor = usuario?.rol === 'vendedor' || usuario?.rol === 'admin';

    // Catálogo completo: da los locales, las cifras de la portada y las fichas.
    const [catalogo, setCatalogo] = useState([]);
    const [estadoCatalogo, setEstadoCatalogo] = useState('cargando');
    const [versionCatalogo, setVersionCatalogo] = useState(0);
    const [categorias, setCategorias] = useState([]);

    // Filtros del catálogo. La búsqueda y la categoría las resuelve el servidor.
    const [busqueda, setBusqueda] = useState('');
    const [categoriaActiva, setCategoriaActiva] = useState('Todos');
    const [localActivo, setLocalActivo] = useState(null);
    const [orden, setOrden] = useState('recomendados');
    const [resultados, setResultados] = useState(null);

    // El carrito queda abierto solo en la pantalla donde se abrió: si se navega
    // (por ejemplo, con el botón atrás), se cierra solo.
    const claveDeRuta = `${ruta.seccion}/${ruta.id ?? ''}`;
    const [carritoAbiertoEn, setCarritoAbiertoEn] = useState(null);
    const verCarrito = carritoAbiertoEn === claveDeRuta;
    const [verSolicitud, setVerSolicitud] = useState(false);
    const [paginaInfo, setPaginaInfo] = useState(null);
    const [emailParaIngresar, setEmailParaIngresar] = useState('');
    const [versionPedidos, setVersionPedidos] = useState(0);

    // A dónde volver después de iniciar sesión, y dónde estaba el scroll de la portada.
    const volverTrasIngresar = useRef(null);
    const scrollDelInicio = useRef(0);

    // --- Datos -----------------------------------------------------------------

    const cargarCatalogo = useCallback(async () => {
        try {
            const { data } = await api.get('/platos');
            setCatalogo(data);
            setEstadoCatalogo('listo');
            return true;
        } catch {
            setEstadoCatalogo('error');
            return false;
        }
    }, []);

    useEffect(() => {
        let intentos = 0;
        let temporizador;
        let activo = true;
        const intentar = async () => {
            const cargo = await cargarCatalogo();
            if (!cargo && activo && ++intentos < REINTENTOS.maximo) temporizador = setTimeout(intentar, REINTENTOS.cada);
        };
        intentar();
        return () => {
            activo = false;
            clearTimeout(temporizador);
        };
    }, [cargarCatalogo, versionCatalogo]);

    // La lista de categorías la define el backend: una sola fuente de verdad.
    useEffect(() => {
        api.get('/platos/categorias')
            .then(({ data }) => setCategorias(data))
            .catch(() => setCategorias([]));
    }, [versionCatalogo]);

    const refrescarCatalogo = useCallback(() => setVersionCatalogo(v => v + 1), []);

    const textoBuscado = busqueda.trim();
    const filtraServidor = textoBuscado !== '' || categoriaActiva !== 'Todos';
    // Identifica la consulta: una respuesta vieja nunca pisa a la búsqueda actual.
    const claveDeBusqueda = JSON.stringify([textoBuscado.toLowerCase(), categoriaActiva, versionCatalogo]);

    useEffect(() => {
        if (!filtraServidor) return;
        const controlador = new AbortController();
        // Se espacian las pulsaciones para no disparar una consulta por cada tecla.
        const temporizador = setTimeout(async () => {
            try {
                const params = {};
                if (textoBuscado) params.busqueda = textoBuscado;
                if (categoriaActiva !== 'Todos') params.categoria = categoriaActiva;
                const { data } = await api.get('/platos', { params, signal: controlador.signal });
                setResultados({ clave: claveDeBusqueda, platos: data });
            } catch (err) {
                if (err.code === 'ERR_CANCELED') return;
                setResultados({ clave: claveDeBusqueda, platos: [], error: true });
            }
        }, 300);
        return () => {
            clearTimeout(temporizador);
            controlador.abort();
        };
    }, [claveDeBusqueda, filtraServidor, textoBuscado, categoriaActiva]);

    const resultadosVigentes = resultados?.clave === claveDeBusqueda ? resultados : null;

    const locales = useMemo(() => {
        const porLocal = new Map();
        for (const plato of catalogo) {
            const vendedor = plato.vendedor;
            if (!vendedor) continue;
            if (!porLocal.has(vendedor.id)) {
                porLocal.set(vendedor.id, {
                    id: vendedor.id,
                    nombre: vendedor.nombre_local || vendedor.nombre,
                    foto: imagenDelPlato(plato.categoria, plato.imagenUrl),
                    cantidad: 0,
                    categorias: new Map()
                });
            }
            const local = porLocal.get(vendedor.id);
            local.cantidad += 1;
            local.categorias.set(plato.categoria, (local.categorias.get(plato.categoria) || 0) + 1);
        }
        // La categoría que se muestra de cada local es la de la mayoría de sus platos.
        return [...porLocal.values()].map(({ categorias: conteo, ...local }) => ({
            ...local,
            categoria: [...conteo.entries()].sort((a, b) => b[1] - a[1])[0][0]
        }));
    }, [catalogo]);

    const platosVisibles = useMemo(() => {
        let lista = filtraServidor ? (resultadosVigentes?.platos || []) : catalogo;
        if (localActivo) lista = lista.filter(plato => plato.vendedor?.id === localActivo);
        const ordenados = [...lista];
        if (orden === 'precio-asc') ordenados.sort((a, b) => a.precio - b.precio);
        if (orden === 'precio-desc') ordenados.sort((a, b) => b.precio - a.precio);
        if (orden === 'nombre') ordenados.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        return ordenados;
    }, [filtraServidor, resultadosVigentes, catalogo, localActivo, orden]);

    // --- Navegación --------------------------------------------------------------

    // Al volver a la portada, el scroll queda donde estaba; en el resto, arriba.
    useEffect(() => {
        window.scrollTo(0, ruta.seccion === 'inicio' ? scrollDelInicio.current : 0);
    }, [ruta.seccion, ruta.id]);

    useEffect(() => {
        if (ruta.seccion !== 'inicio') return;
        const guardar = () => { scrollDelInicio.current = window.scrollY; };
        window.addEventListener('scroll', guardar, { passive: true });
        return () => window.removeEventListener('scroll', guardar);
    }, [ruta.seccion]);

    // Pantallas que dependen de la sesión.
    useEffect(() => {
        if (ruta.seccion === 'pedidos' && !usuario) {
            volverTrasIngresar.current = RUTAS.pedidos;
            navegar(RUTAS.ingresar);
        }
        if (ruta.seccion === 'panel' && !esGestor) {
            if (!usuario) volverTrasIngresar.current = RUTAS.panel;
            navegar(usuario ? RUTAS.inicio : RUTAS.ingresar);
        }
        if ((ruta.seccion === 'ingresar' || ruta.seccion === 'registro') && usuario) {
            const destino = volverTrasIngresar.current || (esGestor ? RUTAS.panel : RUTAS.inicio);
            volverTrasIngresar.current = null;
            navegar(destino);
        }
    }, [ruta.seccion, usuario, esGestor]);

    const pedirIngreso = useCallback((mensaje) => {
        if (mensaje) mostrarAviso(mensaje, 'info');
        volverTrasIngresar.current = window.location.hash || RUTAS.inicio;
        navegar(RUTAS.ingresar);
    }, [mostrarAviso]);

    const irAlInicio = () => {
        scrollDelInicio.current = 0;
        navegar(RUTAS.inicio);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const verMenu = () => {
        setCarritoAbiertoEn(null);
        navegar(RUTAS.inicio);
        irAlCatalogo();
    };

    const buscar = (texto) => {
        setBusqueda(texto);
        if (ruta.seccion !== 'inicio') verMenu();
    };

    const elegirCategoria = (categoria) => {
        setCategoriaActiva(categoria);
        setLocalActivo(null);
        if (ruta.seccion !== 'inicio') verMenu();
        else irAlCatalogo();
    };

    const quitarFiltros = () => {
        setBusqueda('');
        setCategoriaActiva('Todos');
        setLocalActivo(null);
    };

    const agregar = (plato, cantidad = 1) => {
        if (!usuario) {
            pedirIngreso('Para armar tu pedido, ingresá a tu cuenta.');
            return;
        }
        agregarAlCarrito(plato, cantidad);
    };

    const quererVender = () => {
        if (!usuario) {
            pedirIngreso('Para vender en FoodieByte, primero ingresá o creá tu cuenta.');
            return;
        }
        if (usuario.solicitud_vendedor) {
            mostrarAviso('Tu solicitud está en revisión: cuando la aprueben, vas a ver el panel de tu local.', 'info');
            return;
        }
        setVerSolicitud(true);
    };

    const alConfirmarCompra = () => {
        // La compra descontó stock: el catálogo se vuelve a pedir.
        refrescarCatalogo();
        setCarritoAbiertoEn(null);
        setVersionPedidos(v => v + 1);
        navegar(RUTAS.pedidos);
    };

    const cerrarSesion = () => {
        logout();
        setCarritoAbiertoEn(null);
        navegar(RUTAS.inicio);
    };

    // --- Pantalla actual -----------------------------------------------------------

    const renderizarPantalla = () => {
        switch (ruta.seccion) {
            case 'plato': {
                if (estadoCatalogo === 'cargando') {
                    return <div className="contenedor pagina"><div className="esqueleto esqueleto--ficha" /></div>;
                }
                const plato = catalogo.find(p => p.id === ruta.id);
                if (!plato) {
                    return (
                        <div className="contenedor pagina">
                            <div className="vacio tarjeta">
                                <span className="vacio__icono"><Icono nombre="plato" tamano={26} /></span>
                                <p className="vacio__titulo">Este plato ya no está disponible</p>
                                <p>Puede que el local lo haya sacado del menú.</p>
                                <button type="button" className="boton boton--oscuro" onClick={verMenu}>Ver el menú</button>
                            </div>
                        </div>
                    );
                }
                const relacionados = catalogo
                    .filter(otro => otro.id !== plato.id && otro.vendedor?.id === plato.vendedor?.id)
                    .slice(0, 4);
                return (
                    <DetalleProducto key={plato.id} plato={plato} usuario={usuario} relacionados={relacionados}
                        alVolver={() => navegar(RUTAS.inicio)} alAgregar={agregar} alPedirIngreso={pedirIngreso}
                        alAbrirPlato={(otro) => navegar(RUTAS.plato(otro.id))} alCambiarCatalogo={refrescarCatalogo} />
                );
            }
            case 'pedidos':
                return usuario ? <MisPedidos key={versionPedidos} alVerMenu={verMenu} /> : null;
            case 'panel':
                return esGestor ? <PanelGestion categorias={categorias} alCambiarCatalogo={refrescarCatalogo} /> : null;
            case 'ingresar':
                return usuario ? null : <PanelAcceso><Login key={emailParaIngresar} emailInicial={emailParaIngresar} /></PanelAcceso>;
            case 'registro':
                return usuario ? null : (
                    <PanelAcceso>
                        <Signup
                            alRegistrarse={(email) => { setEmailParaIngresar(email); navegar(RUTAS.ingresar); }}
                            alVerTerminos={() => setPaginaInfo('terminos')} />
                    </PanelAcceso>
                );
            default:
                return (
                    <>
                        <Banner cantidadPlatos={catalogo.length} cantidadLocales={locales.length}
                            cantidadCategorias={categorias.length} alVerMenu={irAlCatalogo}
                            alQuererVender={quererVender} mostrarVender={!esGestor} />
                        <Catalogo
                            platos={platosVisibles}
                            cargando={filtraServidor ? !resultadosVigentes : estadoCatalogo === 'cargando'}
                            error={filtraServidor ? Boolean(resultadosVigentes?.error) : estadoCatalogo === 'error'}
                            alReintentar={() => { setEstadoCatalogo('cargando'); refrescarCatalogo(); }}
                            categorias={categorias} categoriaActiva={categoriaActiva}
                            alElegirCategoria={(categoria) => { setCategoriaActiva(categoria); setLocalActivo(null); }}
                            locales={locales} localActivo={localActivo} alElegirLocal={setLocalActivo}
                            orden={orden} alOrdenar={setOrden} busqueda={busqueda} alQuitarFiltros={quitarFiltros}
                            esGestor={esGestor} alAbrirPlato={(plato) => navegar(RUTAS.plato(plato.id))} alAgregar={agregar} />
                    </>
                );
        }
    };

    return (
        <>
            <Aviso />
            <Confirmacion />

            <Navbar busqueda={busqueda} alBuscar={buscar} mostrarBuscador={['inicio', 'plato'].includes(ruta.seccion)}
                alIrAlInicio={irAlInicio} alAbrirCarrito={() => setCarritoAbiertoEn(claveDeRuta)}
                alCerrarSesion={cerrarSesion} alQuererVender={quererVender} />

            <main className="principal">{renderizarPantalla()}</main>

            <Footer categorias={categorias} alElegirCategoria={elegirCategoria} alAbrirPagina={setPaginaInfo} />

            {verCarrito && <Carrito alCerrar={() => setCarritoAbiertoEn(null)} alConfirmarCompra={alConfirmarCompra} alVerMenu={verMenu} />}
            {verSolicitud && <SolicitudLocal categorias={categorias} alCerrar={() => setVerSolicitud(false)} />}
            {paginaInfo && <PaginasInfo pagina={paginaInfo} alCerrar={() => setPaginaInfo(null)} />}
        </>
    );
}

export default App;
