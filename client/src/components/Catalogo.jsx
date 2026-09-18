import { imagenDeCategoria } from '../utils/imagenes';
import TarjetaPlato from './TarjetaPlato';
import Icono from './Icono';

const ORDENES = [
    { valor: 'recomendados', etiqueta: 'Recomendados' },
    { valor: 'precio-asc', etiqueta: 'Menor precio' },
    { valor: 'precio-desc', etiqueta: 'Mayor precio' },
    { valor: 'nombre', etiqueta: 'Nombre (A-Z)' }
];

/**
 * Catálogo de la portada: categorías, locales y la grilla de platos.
 * La búsqueda y la categoría las resuelve el servidor; el local y el orden
 * se aplican sobre la lista que ya llegó.
 */
function Catalogo({
    platos, cargando, error, alReintentar,
    categorias, categoriaActiva, alElegirCategoria,
    locales, localActivo, alElegirLocal,
    orden, alOrdenar, busqueda, alQuitarFiltros,
    esGestor, alAbrirPlato, alAgregar
}) {
    const texto = busqueda.trim();
    const localElegido = locales.find(local => local.id === localActivo);
    const hayFiltros = Boolean(texto) || categoriaActiva !== 'Todos' || Boolean(localElegido);

    let titulo = 'Todo el menú';
    if (texto) titulo = `Resultados para “${texto}”`;
    else if (localElegido) titulo = localElegido.nombre;
    else if (categoriaActiva !== 'Todos') titulo = categoriaActiva;

    return (
        <section className="catalogo contenedor" id="catalogo-menu" aria-labelledby="titulo-catalogo">
            <div className="catalogo__seccion">
                <div className="encabezado-seccion">
                    <div>
                        <h2>¿Qué tenés ganas de comer?</h2>
                        <p>Elegí una categoría o buscá un plato arriba.</p>
                    </div>
                </div>
                <div className="carrusel" role="group" aria-label="Categorías">
                    <button type="button" className="categoria" aria-pressed={categoriaActiva === 'Todos'}
                        onClick={() => alElegirCategoria('Todos')}>
                        <span className="categoria__todos"><Icono nombre="plato" tamano={18} /></span>
                        Todo
                    </button>
                    {categorias.map(categoria => (
                        <button key={categoria} type="button" className="categoria"
                            aria-pressed={categoriaActiva === categoria} onClick={() => alElegirCategoria(categoria)}>
                            <img src={imagenDeCategoria(categoria)} alt="" />
                            {categoria}
                        </button>
                    ))}
                </div>
            </div>

            {locales.length > 0 && (
                <div className="catalogo__seccion">
                    <div className="encabezado-seccion">
                        <div>
                            <h2>Locales</h2>
                            <p>Tocá uno para ver solo su menú.</p>
                        </div>
                    </div>
                    <div className="carrusel" role="group" aria-label="Locales">
                        {locales.map(local => {
                            const elegido = localActivo === local.id;
                            return (
                                <button key={local.id} type="button" className="local" aria-pressed={elegido}
                                    onClick={() => alElegirLocal(elegido ? null : local.id)}>
                                    <img src={local.foto} alt="" loading="lazy" />
                                    <span className="local__cuerpo">
                                        <span className="local__nombre">{local.nombre}</span>
                                        <span className="local__detalle">{local.categoria} · {local.cantidad} platos</span>
                                    </span>
                                    {elegido && (
                                        <span className="etiqueta etiqueta--oscura local__marca">
                                            <Icono nombre="check" tamano={12} grosor={3} />Filtrando
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="catalogo__seccion">
                <div className="encabezado-seccion">
                    <div>
                        <h2 id="titulo-catalogo">{titulo}</h2>
                        <p aria-live="polite">
                            {cargando ? 'Buscando platos…' : `${platos.length} ${platos.length === 1 ? 'plato' : 'platos'}`}
                        </p>
                    </div>
                    <div className="resultados__controles">
                        {hayFiltros && (
                            <button type="button" className="boton boton--fantasma boton--chico" onClick={alQuitarFiltros}>
                                <Icono nombre="cerrar" tamano={16} />Quitar filtros
                            </button>
                        )}
                        <label htmlFor="orden-catalogo" className="solo-lectores">Ordenar platos</label>
                        <select id="orden-catalogo" className="entrada entrada--chica" value={orden}
                            onChange={(e) => alOrdenar(e.target.value)}>
                            {ORDENES.map(opcion => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
                        </select>
                    </div>
                </div>

                {error ? (
                    <div className="vacio tarjeta">
                        <span className="vacio__icono"><Icono nombre="alerta" tamano={26} /></span>
                        <p className="vacio__titulo">No pudimos cargar el menú</p>
                        <p>Si recién levantaste la aplicación, la API puede tardar unos segundos: lo seguimos intentando solos.</p>
                        <button type="button" className="boton boton--oscuro" onClick={alReintentar}>
                            <Icono nombre="refrescar" tamano={18} />Reintentar ahora
                        </button>
                    </div>
                ) : cargando ? (
                    <div className="grilla-platos" aria-hidden="true">
                        {Array.from({ length: 8 }, (_, i) => <EsqueletoPlato key={i} />)}
                    </div>
                ) : platos.length === 0 ? (
                    <div className="vacio tarjeta">
                        <span className="vacio__icono"><Icono nombre="buscar" tamano={26} /></span>
                        <p className="vacio__titulo">No encontramos platos</p>
                        <p>Probá con otra palabra o sacá los filtros.</p>
                        <button type="button" className="boton boton--oscuro" onClick={alQuitarFiltros}>Ver todo el menú</button>
                    </div>
                ) : (
                    <div className="grilla-platos">
                        {platos.map(plato => (
                            <TarjetaPlato key={plato.id} plato={plato} esGestor={esGestor}
                                alAbrir={() => alAbrirPlato(plato)} alAgregar={() => alAgregar(plato)} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

const EsqueletoPlato = () => (
    <div className="tarjeta-plato tarjeta-plato--esqueleto">
        <div className="esqueleto esqueleto-foto" />
        <div className="tarjeta-plato__cuerpo">
            <div className="esqueleto esqueleto-linea esqueleto-linea--corta" />
            <div className="esqueleto esqueleto-linea esqueleto-linea--titulo" />
            <div className="esqueleto esqueleto-linea" />
            <div className="esqueleto esqueleto-linea esqueleto-linea--media" />
        </div>
    </div>
);

export default Catalogo;
