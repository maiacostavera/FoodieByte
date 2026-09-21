import { useEffect, useRef, useState } from 'react';
import { useFoodie } from '../state/FoodieContext';
import { navegar, RUTAS } from '../utils/rutas';
import { iniciales } from '../utils/formato';
import { LIMITES } from '../utils/limites';
import Icono from './Icono';
import Notificaciones from './Notificaciones';
import Logo from './Logo';

const NOMBRE_DEL_ROL = { foodie: 'Cliente', vendedor: 'Local', admin: 'Administrador' };

const irAlCatalogo = () =>
    document.getElementById('catalogo-menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/** Barra superior: logo, buscador y las acciones de la cuenta según el rol. */
function Navbar({ busqueda, alBuscar, mostrarBuscador, alIrAlInicio, alAbrirCarrito, alCerrarSesion, alQuererVender }) {
    const { usuario, cantidadEnCarrito } = useFoodie();
    const esFoodie = usuario?.rol === 'foodie';
    const esGestor = usuario?.rol === 'vendedor' || usuario?.rol === 'admin';

    return (
        <header className="barra">
            <div className="contenedor barra__contenido">
                <button type="button" className="barra__logo" onClick={alIrAlInicio} aria-label="FoodieByte: ir al inicio">
                    <Logo />
                </button>

                {mostrarBuscador && (
                    <div className="buscador barra__buscador" role="search">
                        <Icono nombre="buscar" tamano={18} />
                        <label htmlFor="buscador" className="solo-lectores">Buscar en el menú</label>
                        <input id="buscador" type="search" className="entrada" placeholder="Buscá pizza, sushi, empanadas…"
                            value={busqueda} maxLength={LIMITES.nombre} autoComplete="off"
                            onChange={(e) => alBuscar(e.target.value)} onFocus={irAlCatalogo} />
                    </div>
                )}

                <nav className="barra__acciones" aria-label="Tu cuenta">
                    {!usuario && (
                        <>
                            <button type="button" className="boton boton--fantasma" onClick={() => navegar(RUTAS.ingresar)}>
                                Ingresar
                            </button>
                            <button type="button" className="boton boton--primario solo-escritorio" onClick={() => navegar(RUTAS.registro)}>
                                Crear cuenta
                            </button>
                        </>
                    )}

                    {esFoodie && usuario.solicitud_vendedor && (
                        <span className="etiqueta etiqueta--alerta solo-escritorio">
                            <Icono nombre="reloj" tamano={13} />Solicitud de local en revisión
                        </span>
                    )}

                    {esFoodie && (
                        <>
                            <button type="button" className="boton boton--fantasma solo-escritorio" onClick={() => navegar(RUTAS.pedidos)}>
                                <Icono nombre="recibo" tamano={18} />Mis pedidos
                            </button>
                            <button type="button" className="boton boton--fantasma boton--icono barra__carrito" onClick={alAbrirCarrito}
                                aria-label={cantidadEnCarrito > 0 ? `Abrir el carrito: ${cantidadEnCarrito} productos` : 'Abrir el carrito'}>
                                <Icono nombre="bolsa" />
                                {cantidadEnCarrito > 0 && <span key={cantidadEnCarrito} className="contador">{cantidadEnCarrito}</span>}
                            </button>
                        </>
                    )}

                    {esGestor && (
                        <button type="button" className="boton boton--oscuro boton--chico" onClick={() => navegar(RUTAS.panel)}
                            aria-label="Panel de gestión">
                            <Icono nombre="panel" tamano={16} /><span className="solo-escritorio">Panel de gestión</span>
                        </button>
                    )}

                    {/* La campanita es para los tres roles: cambia qué avisa, no quién la ve. */}
                    {usuario && <Notificaciones />}

                    {usuario && <MenuUsuario usuario={usuario} alCerrarSesion={alCerrarSesion} alQuererVender={alQuererVender} />}
                </nav>
            </div>
        </header>
    );
}

/** Botón con el avatar que despliega las opciones de la cuenta. */
function MenuUsuario({ usuario, alCerrarSesion, alQuererVender }) {
    const [abierto, setAbierto] = useState(false);
    const contenedor = useRef(null);
    const esFoodie = usuario.rol === 'foodie';

    // Se cierra al tocar afuera o con Escape.
    useEffect(() => {
        if (!abierto) return;
        const alTocar = (evento) => {
            if (!contenedor.current?.contains(evento.target)) setAbierto(false);
        };
        const alTeclear = (evento) => {
            if (evento.key === 'Escape') setAbierto(false);
        };
        document.addEventListener('mousedown', alTocar);
        document.addEventListener('keydown', alTeclear);
        return () => {
            document.removeEventListener('mousedown', alTocar);
            document.removeEventListener('keydown', alTeclear);
        };
    }, [abierto]);

    const elegir = (accion) => () => {
        setAbierto(false);
        accion();
    };

    return (
        <div className="desplegable" ref={contenedor}>
            <button type="button" className="barra__usuario" aria-haspopup="menu" aria-expanded={abierto}
                aria-label={`Menú de ${usuario.nombre}`} onClick={() => setAbierto(valor => !valor)}>
                <span className="avatar avatar--chico">{iniciales(usuario.nombre)}</span>
                <span className="barra__usuario-nombre solo-escritorio">{usuario.nombre}</span>
                <Icono nombre="chevron-abajo" tamano={16} />
            </button>

            {abierto && (
                <div className="desplegable__menu" role="menu">
                    <div className="desplegable__cabecera">
                        <p className="desplegable__nombre">{usuario.nombre}</p>
                        <p className="desplegable__correo">{usuario.email}</p>
                        <span className="etiqueta etiqueta--primaria">{NOMBRE_DEL_ROL[usuario.rol]}</span>
                    </div>

                    {esFoodie ? (
                        <button type="button" role="menuitem" className="desplegable__opcion" onClick={elegir(() => navegar(RUTAS.pedidos))}>
                            <Icono nombre="recibo" tamano={18} />Mis pedidos
                        </button>
                    ) : (
                        <button type="button" role="menuitem" className="desplegable__opcion" onClick={elegir(() => navegar(RUTAS.panel))}>
                            <Icono nombre="panel" tamano={18} />Panel de gestión
                        </button>
                    )}

                    {esFoodie && (usuario.solicitud_vendedor ? (
                        <button type="button" role="menuitem" className="desplegable__opcion" disabled>
                            <Icono nombre="reloj" tamano={18} />Solicitud de local en revisión
                        </button>
                    ) : (
                        <button type="button" role="menuitem" className="desplegable__opcion" onClick={elegir(alQuererVender)}>
                            <Icono nombre="tienda" tamano={18} />Quiero vender en FoodieByte
                        </button>
                    ))}

                    <div className="desplegable__separador" />
                    <button type="button" role="menuitem" className="desplegable__opcion" onClick={elegir(alCerrarSesion)}>
                        <Icono nombre="salir" tamano={18} />Cerrar sesión
                    </button>
                </div>
            )}
        </div>
    );
}

export default Navbar;
