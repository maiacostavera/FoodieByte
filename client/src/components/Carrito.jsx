import { useEffect, useRef, useState } from 'react';
import { useFoodie } from '../state/FoodieContext';
import { formatearMoneda } from '../utils/formato';
import { LIMITES } from '../utils/limites';
import { imagenDelPlato } from '../utils/imagenes';
import Icono from './Icono';

/** Carrito en un panel lateral. Se cierra con Escape, con la cruz o tocando el fondo. */
function Carrito({ alCerrar, alConfirmarCompra, alVerMenu }) {
    const {
        carrito, totalCarrito, cantidadEnCarrito, usuario, mostrarAviso,
        agregarAlCarrito, disminuirDelCarrito, eliminarDelCarrito, enviarPedidoAlServidor
    } = useFoodie();

    const [procesando, setProcesando] = useState(false);
    // La última dirección usada se recuerda en este navegador, para cada cuenta.
    const claveDireccion = `foodie_direccion_${usuario?.id}`;
    const [direccion, setDireccion] = useState(() => {
        try { return localStorage.getItem(claveDireccion) || ''; } catch { return ''; }
    });
    const [notas, setNotas] = useState('');
    const [errorEntrega, setErrorEntrega] = useState('');
    const campoDireccion = useRef(null);
    const panel = useRef(null);
    const cerrar = useRef(alCerrar);

    useEffect(() => {
        cerrar.current = alCerrar;
    });

    useEffect(() => {
        const focoAnterior = document.activeElement;
        document.body.classList.add('sin-scroll');
        panel.current?.focus();
        const alTeclear = (evento) => {
            if (evento.key === 'Escape') cerrar.current();
        };
        document.addEventListener('keydown', alTeclear);
        return () => {
            document.removeEventListener('keydown', alTeclear);
            document.body.classList.remove('sin-scroll');
            focoAnterior?.focus?.();
        };
    }, []);

    const cantidadDeLocales = new Set(carrito.map(item => item.vendedorId)).size;

    const procesarCompra = async (evento) => {
        evento.preventDefault();
        if (usuario?.rol !== 'foodie') {
            mostrarAviso('Solo las cuentas de cliente pueden hacer pedidos.', 'error');
            return;
        }
        if (direccion.trim().length < 5) {
            setErrorEntrega('Indicá la dirección de entrega: calle y número.');
            campoDireccion.current?.focus();
            return;
        }

        setProcesando(true);
        const exito = await enviarPedidoAlServidor({ direccionEntrega: direccion.trim(), notas: notas.trim() || undefined });
        if (exito) {
            try { localStorage.setItem(claveDireccion, direccion.trim()); } catch { /* sin almacenamiento no se recuerda */ }
        }
        setProcesando(false);
        // La compra descontó stock: el catálogo tiene que mostrar las cantidades nuevas.
        if (exito) alConfirmarCompra();
    };

    return (
        <>
            <div className="panel-lateral-fondo" onClick={alCerrar} aria-hidden="true" />
            <aside ref={panel} className="panel-lateral" role="dialog" aria-modal="true" aria-labelledby="titulo-carrito" tabIndex={-1}>
                <header className="panel-lateral__cabecera">
                    <div>
                        <h2 className="panel-lateral__titulo" id="titulo-carrito">Tu pedido</h2>
                        {cantidadEnCarrito > 0 && (
                            <p className="texto-tenue">{cantidadEnCarrito} {cantidadEnCarrito === 1 ? 'producto' : 'productos'}</p>
                        )}
                    </div>
                    <button type="button" className="boton boton--fantasma boton--icono" onClick={alCerrar} aria-label="Cerrar el carrito">
                        <Icono nombre="cerrar" />
                    </button>
                </header>

                {carrito.length === 0 ? (
                    <div className="panel-lateral__cuerpo vacio">
                        <span className="vacio__icono"><Icono nombre="bolsa" tamano={26} /></span>
                        <p className="vacio__titulo">Tu carrito está vacío</p>
                        <p>Sumá platos desde el menú y acá vas a ver tu pedido.</p>
                        <button type="button" className="boton boton--oscuro" onClick={alVerMenu}>Ver el menú</button>
                    </div>
                ) : (
                    <>
                        <ul className="panel-lateral__cuerpo">
                            {carrito.map(item => {
                                const local = item.vendedor?.nombre_local || item.vendedor?.nombre;
                                return (
                                    <li key={item.id} className="item-carrito">
                                        <img src={imagenDelPlato(item.categoria, item.imagenUrl)} alt="" />
                                        <div>
                                            <p className="item-carrito__nombre">{item.nombre}</p>
                                            <p className="item-carrito__detalle">{local ? `${local} · ` : ''}{formatearMoneda(item.precio)} c/u</p>
                                            <div className="item-carrito__fila">
                                                <div className="selector-cantidad selector-cantidad--chico" role="group" aria-label={`Cantidad de ${item.nombre}`}>
                                                    <button type="button" onClick={() => disminuirDelCarrito(item.id)} aria-label={`Quitar una unidad de ${item.nombre}`}>
                                                        <Icono nombre="menos" tamano={16} />
                                                    </button>
                                                    <output>{item.cantidad}</output>
                                                    <button type="button" onClick={() => agregarAlCarrito(item, 1, false)}
                                                        disabled={item.cantidad >= Number(item.stock ?? 0)} aria-label={`Sumar una unidad de ${item.nombre}`}>
                                                        <Icono nombre="mas" tamano={16} />
                                                    </button>
                                                </div>
                                                <button type="button" className="boton boton--fantasma boton--icono boton--chico"
                                                    onClick={() => eliminarDelCarrito(item.id)} aria-label={`Quitar ${item.nombre} del carrito`}>
                                                    <Icono nombre="basura" tamano={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <span className="item-carrito__total">{formatearMoneda(item.precio * item.cantidad)}</span>
                                    </li>
                                );
                            })}
                        </ul>

                        <footer className="panel-lateral__pie">
                            {cantidadDeLocales > 1 && (
                                <p className="mensaje mensaje--info">
                                    <Icono nombre="tienda" tamano={18} />
                                    Tu pedido incluye {cantidadDeLocales} locales: cada uno prepara y envía su parte.
                                </p>
                            )}
                            <form id="formulario-entrega" className="entrega" onSubmit={procesarCompra} noValidate>
                                <div className="campo">
                                    <label htmlFor="entrega-direccion" className="campo__etiqueta">Dirección de entrega</label>
                                    <input id="entrega-direccion" ref={campoDireccion} className="entrada entrada--chica"
                                        autoComplete="street-address" placeholder="Calle, número, piso y departamento"
                                        maxLength={LIMITES.direccion} value={direccion} aria-invalid={Boolean(errorEntrega)}
                                        aria-describedby={errorEntrega ? 'entrega-error' : undefined}
                                        onChange={(e) => { setDireccion(e.target.value); if (errorEntrega) setErrorEntrega(''); }} />
                                    {errorEntrega && <span id="entrega-error" className="campo__error">{errorEntrega}</span>}
                                </div>
                                <div className="campo">
                                    <label htmlFor="entrega-notas" className="campo__etiqueta">
                                        Aclaraciones para el local <span className="texto-tenue">(opcional)</span>
                                    </label>
                                    <input id="entrega-notas" className="entrada entrada--chica" placeholder="Ej.: timbre 3B, sin cebolla"
                                        maxLength={LIMITES.notas} value={notas} onChange={(e) => setNotas(e.target.value)} />
                                </div>
                            </form>
                            <div className="resumen-total">
                                <span>Total</span>
                                <strong>{formatearMoneda(totalCarrito)}</strong>
                            </div>
                            <button type="submit" form="formulario-entrega" className="boton boton--primario boton--grande boton--bloque"
                                disabled={procesando}>
                                {procesando ? 'Confirmando…' : 'Confirmar pedido'}
                            </button>
                            <p className="entrega__pago"><Icono nombre="billete" tamano={16} />Pagás al recibir, en efectivo o con tarjeta.</p>
                        </footer>
                    </>
                )}
            </aside>
        </>
    );
}

export default Carrito;
