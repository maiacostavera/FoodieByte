import { useEffect, useState } from 'react';
import api, { mensajeDeError } from '../api/client';
import { useFoodie } from '../state/FoodieContext';
import { imagenDelPlato } from '../utils/imagenes';
import { formatearMoneda, iniciales, tiempoRelativo } from '../utils/formato';
import { LIMITES } from '../utils/limites';
import Icono from './Icono';
import TarjetaPlato from './TarjetaPlato';

const POCAS_UNIDADES = 5;

/**
 * Ficha de un plato. Es pública: sin sesión se ven el detalle y las consultas,
 * y la sesión se pide recién para comprar o preguntar.
 */
function DetalleProducto({ plato, usuario, relacionados, alVolver, alAgregar, alPedirIngreso, alAbrirPlato, alCambiarCatalogo }) {
    const { mostrarAviso } = useFoodie();
    const stock = Number(plato.stock ?? 0);
    const local = plato.vendedor?.nombre_local || plato.vendedor?.nombre;

    const esVisitante = !usuario;
    const esFoodie = usuario?.rol === 'foodie';
    const esGestor = usuario?.rol === 'vendedor' || usuario?.rol === 'admin';
    // Solo el dueño del plato (o el admin) puede cambiar el stock y responder consultas.
    const puedeGestionar = usuario?.rol === 'admin' ||
        (usuario?.rol === 'vendedor' && Number(plato.vendedorId) === Number(usuario.id));

    const [cantidad, setCantidad] = useState(1);
    const [nuevoStock, setNuevoStock] = useState(stock);
    const [guardandoStock, setGuardandoStock] = useState(false);

    // Las preguntas se leen del servidor: son reales y persisten entre sesiones.
    const [preguntas, setPreguntas] = useState([]);
    const [cargandoPreguntas, setCargandoPreguntas] = useState(true);
    const [pregunta, setPregunta] = useState('');
    const [enviandoPregunta, setEnviandoPregunta] = useState(false);
    const [respuestas, setRespuestas] = useState({});

    useEffect(() => {
        let cancelado = false;
        api.get(`/platos/${plato.id}/preguntas`)
            .then(({ data }) => { if (!cancelado) setPreguntas(data); })
            .catch(() => { if (!cancelado) setPreguntas([]); })
            .finally(() => { if (!cancelado) setCargandoPreguntas(false); });
        return () => { cancelado = true; };
    }, [plato.id]);

    const enviarPregunta = async (evento) => {
        evento.preventDefault();
        const texto = pregunta.trim();
        if (texto.length < 3) {
            mostrarAviso('La consulta tiene que tener al menos 3 caracteres.', 'error');
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

    const responder = async (preguntaId) => {
        const texto = (respuestas[preguntaId] || '').trim();
        if (!texto) return;
        try {
            const { data } = await api.put(`/platos/${plato.id}/preguntas/${preguntaId}`, { respuesta: texto });
            setPreguntas(prev => prev.map(p => (p.id === preguntaId ? data.pregunta : p)));
            setRespuestas(prev => ({ ...prev, [preguntaId]: '' }));
            mostrarAviso('Respuesta publicada.', 'exito');
        } catch (err) {
            mostrarAviso(mensajeDeError(err, 'No se pudo publicar la respuesta.'), 'error');
        }
    };

    const guardarStock = async (evento) => {
        evento.preventDefault();
        setGuardandoStock(true);
        try {
            await api.put(`/platos/${plato.id}/stock`, { stock: nuevoStock });
            mostrarAviso('Stock actualizado.', 'exito');
            // El catálogo se vuelve a pedir y la ficha recibe el plato con el stock nuevo.
            alCambiarCatalogo();
        } catch (err) {
            mostrarAviso(mensajeDeError(err, 'No se pudo actualizar el stock.'), 'error');
        } finally {
            setGuardandoStock(false);
        }
    };

    return (
        <div className="contenedor pagina">
            <nav className="migas" aria-label="Estás en">
                <button type="button" onClick={alVolver}><Icono nombre="flecha-izquierda" tamano={16} />Menú</button>
                <Icono nombre="chevron-derecha" tamano={14} />
                <span>{plato.categoria}</span>
                <Icono nombre="chevron-derecha" tamano={14} />
                <span aria-current="page">{plato.nombre}</span>
            </nav>

            <div className="detalle__principal">
                <div className="detalle__foto">
                    <img src={imagenDelPlato(plato.categoria, plato.imagenUrl)} alt={plato.nombre} />
                </div>

                <div>
                    {local && <p className="detalle__local"><Icono nombre="tienda" tamano={18} />{local}</p>}
                    <h1 className="detalle__nombre">{plato.nombre}</h1>
                    {plato.descripcion && <p className="detalle__descripcion">{plato.descripcion}</p>}

                    <ul className="detalle__datos">
                        {plato.tiempo_prep && <li className="etiqueta"><Icono nombre="reloj" tamano={13} />{plato.tiempo_prep}</li>}
                        <li className="etiqueta">{plato.categoria}</li>
                        {plato.es_vegano && <li className="etiqueta etiqueta--exito"><Icono nombre="hoja" tamano={13} />Vegano</li>}
                        {plato.es_sintacc && <li className="etiqueta etiqueta--info"><Icono nombre="escudo" tamano={13} />Sin TACC</li>}
                    </ul>

                    <div className="detalle__compra">
                        <div className="detalle__precio-fila">
                            <span className="detalle__precio">{formatearMoneda(plato.precio)}</span>
                            <EstadoStock stock={stock} />
                        </div>

                        {esFoodie && (stock > 0 ? (
                            <div className="detalle__acciones">
                                <div className="selector-cantidad" role="group" aria-label="Cantidad">
                                    <button type="button" onClick={() => setCantidad(c => Math.max(1, c - 1))}
                                        disabled={cantidad <= 1} aria-label="Quitar una unidad">
                                        <Icono nombre="menos" tamano={18} />
                                    </button>
                                    <output aria-live="polite">{cantidad}</output>
                                    <button type="button" onClick={() => setCantidad(c => Math.min(stock, c + 1))}
                                        disabled={cantidad >= stock} aria-label="Sumar una unidad">
                                        <Icono nombre="mas" tamano={18} />
                                    </button>
                                </div>
                                <button type="button" className="boton boton--primario boton--grande"
                                    onClick={() => alAgregar(plato, cantidad)}>
                                    <Icono nombre="bolsa" tamano={18} />Agregar · {formatearMoneda(plato.precio * cantidad)}
                                </button>
                            </div>
                        ) : (
                            <p className="mensaje mensaje--alerta detalle__acciones">
                                <Icono nombre="alerta" tamano={18} />Este plato se agotó. Volvé a mirar más tarde.
                            </p>
                        ))}

                        {esVisitante && (
                            <div className="detalle__acciones">
                                <button type="button" className="boton boton--primario boton--grande boton--bloque" disabled={stock === 0}
                                    onClick={() => alPedirIngreso('Para agregar platos a tu pedido, ingresá a tu cuenta.')}>
                                    {stock === 0 ? 'Agotado' : 'Ingresá para pedir'}
                                </button>
                            </div>
                        )}

                        {esGestor && (puedeGestionar ? (
                            <form className="detalle__gestion" onSubmit={guardarStock}>
                                <div className="campo">
                                    <label htmlFor="campo-stock" className="campo__etiqueta">Stock disponible</label>
                                    <input id="campo-stock" type="number" className="entrada" min="0" max={LIMITES.stock}
                                        value={nuevoStock}
                                        onChange={(e) => setNuevoStock(Math.max(0, Number.parseInt(e.target.value, 10) || 0))} />
                                </div>
                                <button type="submit" className="boton boton--oscuro" disabled={guardandoStock || nuevoStock === stock}>
                                    {guardandoStock ? 'Guardando…' : 'Actualizar stock'}
                                </button>
                            </form>
                        ) : (
                            <p className="mensaje mensaje--info detalle__acciones">
                                <Icono nombre="info" tamano={18} />Este plato es de otro local: podés verlo, pero no modificarlo.
                            </p>
                        ))}
                    </div>
                </div>
            </div>

            <div className="consultas">
                <section aria-labelledby="titulo-duda">
                    <h2 id="titulo-duda">¿Tenés alguna duda?</h2>
                    {esFoodie ? (
                        <form className="formulario" onSubmit={enviarPregunta}>
                            <div className="campo">
                                <label htmlFor="campo-pregunta" className="campo__etiqueta">Preguntale a {local}</label>
                                <textarea id="campo-pregunta" className="entrada" maxLength={LIMITES.pregunta}
                                    placeholder="Por ejemplo: ¿se puede pedir sin cebolla?"
                                    value={pregunta} onChange={(e) => setPregunta(e.target.value)} />
                            </div>
                            <div>
                                <button type="submit" className="boton boton--oscuro" disabled={enviandoPregunta}>
                                    <Icono nombre="chat" tamano={18} />{enviandoPregunta ? 'Enviando…' : 'Enviar pregunta'}
                                </button>
                            </div>
                        </form>
                    ) : esVisitante ? (
                        <div className="consultas__invitacion">
                            <p>Ingresá para preguntarle al local por ingredientes, porciones o preparación.</p>
                            <button type="button" className="boton boton--oscuro"
                                onClick={() => alPedirIngreso('Para dejar una consulta, ingresá a tu cuenta.')}>
                                Ingresar para preguntar
                            </button>
                        </div>
                    ) : (
                        <p className="texto-secundario">
                            Las consultas las hacen los clientes.
                            {puedeGestionar && ' Las que respondas acá quedan visibles para todos.'}
                        </p>
                    )}
                </section>

                <section aria-labelledby="titulo-preguntas">
                    <h2 id="titulo-preguntas">
                        Preguntas y respuestas {preguntas.length > 0 && <span className="texto-tenue">({preguntas.length})</span>}
                    </h2>
                    {cargandoPreguntas ? (
                        <p className="texto-tenue">Cargando consultas…</p>
                    ) : preguntas.length === 0 ? (
                        <p className="texto-tenue">Todavía nadie preguntó por este plato.</p>
                    ) : (
                        <div>
                            {preguntas.map(p => (
                                <article key={p.id} className="consulta">
                                    <span className="avatar avatar--chico">{iniciales(p.autor?.nombre)}</span>
                                    <div className="consulta__cuerpo">
                                        <p className="consulta__meta"><strong>{p.autor?.nombre || 'Cliente'}</strong> · {tiempoRelativo(p.createdAt)}</p>
                                        <p className="consulta__texto">{p.texto}</p>
                                        {p.respuesta ? (
                                            <div className="consulta__respuesta">
                                                <strong>Respuesta de {local}</strong>
                                                {p.respuesta}
                                            </div>
                                        ) : puedeGestionar ? (
                                            <form className="consulta__responder" onSubmit={(e) => { e.preventDefault(); responder(p.id); }}>
                                                <label htmlFor={`respuesta-${p.id}`} className="solo-lectores">Tu respuesta a {p.autor?.nombre}</label>
                                                <input id={`respuesta-${p.id}`} className="entrada entrada--chica" placeholder="Escribí tu respuesta…"
                                                    maxLength={LIMITES.pregunta} value={respuestas[p.id] || ''}
                                                    onChange={(e) => setRespuestas(prev => ({ ...prev, [p.id]: e.target.value }))} />
                                                <button type="submit" className="boton boton--primario boton--chico">Responder</button>
                                            </form>
                                        ) : (
                                            <p className="consulta__pendiente">Esperando la respuesta del local…</p>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {relacionados.length > 0 && (
                <section className="relacionados" aria-labelledby="titulo-relacionados">
                    <h2 id="titulo-relacionados">Más de {local}</h2>
                    <div className="grilla-platos">
                        {relacionados.map(otro => (
                            <TarjetaPlato key={otro.id} plato={otro} esGestor={esGestor}
                                alAbrir={() => alAbrirPlato(otro)} alAgregar={() => alAgregar(otro)} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function EstadoStock({ stock }) {
    if (stock === 0) return <span className="etiqueta etiqueta--peligro">Agotado</span>;
    if (stock < POCAS_UNIDADES) {
        return <span className="etiqueta etiqueta--alerta"><Icono nombre="fuego" tamano={13} />{stock === 1 ? 'Queda 1' : `Quedan ${stock}`}</span>;
    }
    return <span className="etiqueta etiqueta--exito"><Icono nombre="check" tamano={13} grosor={3} />Disponible</span>;
}

export default DetalleProducto;
