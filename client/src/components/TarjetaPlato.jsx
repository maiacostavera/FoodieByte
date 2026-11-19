import { imagenDelPlato } from '../utils/imagenes';
import { formatearMoneda } from '../utils/formato';
import Icono from './Icono';
import ClickSpark from './reactbits/ClickSpark';
import SpotlightCard from './reactbits/SpotlightCard';

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
        // Un brillo rojizo sigue al cursor sobre la tarjeta (SpotlightCard de React Bits).
        // proximity={0}: solo trabaja la tarjeta que está bajo el cursor. Con el
        // valor de fábrica (80 px), cada movimiento despierta a las 45 tarjetas:
        // cruzar la grilla medía y repintaba unas 14 veces más.
        <SpotlightCard role="article" theme="light" spotlightColor="#d32f2f" intensity={0.35}
            spotlightSize={260} borderGlow={0.9} flare={false} proximity={0}
            style={{ '--spotlight-card-border': 'var(--borde)', '--spotlight-card-surface': 'var(--superficie)' }}
            className={`tarjeta-plato${agotado ? ' tarjeta-plato--agotada' : ''}`}>
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
                        <ClickSpark sparkColor={['#d32f2f', '#ff8f80', '#ffb300']} sparkCount={10} sparkRadius={28}
                            disabled={agotado} className="tarjeta-plato__chispas" style={{ width: 'auto', height: 'auto' }}>
                            <button type="button" className="boton boton--primario boton--icono tarjeta-plato__accion"
                                onClick={alAgregar} disabled={agotado}
                                aria-label={agotado ? `${plato.nombre}: agotado` : `Agregar ${plato.nombre} al carrito`}>
                                <Icono nombre="mas" />
                            </button>
                        </ClickSpark>
                    )}
                </div>
            </div>
        </SpotlightCard>
    );
}

export default TarjetaPlato;
