import { imagenDelPlato } from '../utils/imagenes';
import { formatearMoneda } from '../utils/formato';
import Icono from './Icono';

// Con menos de estas unidades, la tarjeta avisa que quedan pocas.
const POCAS_UNIDADES = 5;

/**
 * Tarjeta del catálogo. Toda la tarjeta abre la ficha del plato; el botón de
 * agregar queda por encima y funciona por separado.
 */
function TarjetaPlato({ plato, esGestor, alAbrir, alAgregar }) {
    const stock = Number(plato.stock ?? 0);
    const agotado = stock === 0;
    const local = plato.vendedor?.nombre_local || plato.vendedor?.nombre;

    return (
        <article className={`tarjeta-plato${agotado ? ' tarjeta-plato--agotada' : ''}`}>
            <div className="tarjeta-plato__foto">
                <img src={imagenDelPlato(plato.categoria, plato.imagenUrl)} alt="" loading="lazy" />
                <div className="tarjeta-plato__insignias">
                    {plato.es_vegano && <span className="etiqueta etiqueta--exito"><Icono nombre="hoja" tamano={12} />Vegano</span>}
                    {plato.es_sintacc && <span className="etiqueta etiqueta--info"><Icono nombre="escudo" tamano={12} />Sin TACC</span>}
                </div>
                {agotado ? (
                    <span className="etiqueta etiqueta--oscura tarjeta-plato__agotado">Agotado</span>
                ) : stock < POCAS_UNIDADES && (
                    <span className="etiqueta etiqueta--alerta tarjeta-plato__quedan">
                        {stock === 1 ? '¡Queda 1!' : `¡Quedan ${stock}!`}
                    </span>
                )}
            </div>

            <div className="tarjeta-plato__cuerpo">
                {local && <span className="tarjeta-plato__local">{local}</span>}
                <h3 className="tarjeta-plato__nombre">
                    <button type="button" className="tarjeta-plato__enlace" onClick={alAbrir}>{plato.nombre}</button>
                </h3>
                {plato.descripcion && <p className="tarjeta-plato__descripcion">{plato.descripcion}</p>}

                <div className="tarjeta-plato__pie">
                    <div>
                        <strong className="tarjeta-plato__precio">{formatearMoneda(plato.precio)}</strong>
                        {plato.tiempo_prep && (
                            <span className="tarjeta-plato__tiempo"><Icono nombre="reloj" tamano={14} />{plato.tiempo_prep}</span>
                        )}
                    </div>

                    {esGestor ? (
                        <span className="etiqueta tarjeta-plato__accion">Stock: {stock}</span>
                    ) : (
                        <button type="button" className="boton boton--primario boton--icono tarjeta-plato__accion"
                            onClick={alAgregar} disabled={agotado}
                            aria-label={agotado ? `${plato.nombre}: agotado` : `Agregar ${plato.nombre} al carrito`}>
                            <Icono nombre="mas" />
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}

export default TarjetaPlato;
