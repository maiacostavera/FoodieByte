// banner.webp reemplaza al PNG original de 6,7 MB: mismo aspecto, 75 KB.
import { useReducedMotion } from 'motion/react';
import imagenBanner from '../assets/banner.webp';
import Icono from './Icono';
import CountUp from './reactbits/CountUp';
import Magnet from './reactbits/Magnet';
import RotatingText from './reactbits/RotatingText';

// El título va rotando entre lo que se puede pedir. Empieza por "comida", así
// el primer vistazo (y la captura de pantalla) dice lo mismo que antes.
const COMIDAS = ['comida', 'pizza', 'hamburguesa', 'parrilla', 'empanada', 'sushi'];

/** Portada: presentación de la plataforma con las cifras reales del catálogo. */
function Banner({ cantidadPlatos, cantidadLocales, cantidadCategorias, alVerMenu, alQuererVender, mostrarVender }) {
    // Con "reducir movimiento" el componente ya no anima las letras, pero la
    // palabra seguía cambiando sola cada pocos segundos: ahí queda fija.
    const reducirMovimiento = useReducedMotion();
    return (
        <section className="portada" aria-labelledby="titulo-portada">
            <div className="portada__fondo" style={{ backgroundImage: `url(${imagenBanner})` }} aria-hidden="true" />
            <div className="contenedor">
                <div className="portada__contenido">
                    <span className="portada__etiqueta">
                        <Icono nombre="ubicacion" tamano={15} />Locales de la Ciudad de Buenos Aires
                    </span>
                    <h1 className="portada__titulo" id="titulo-portada">
                        La mejor{' '}
                        <RotatingText texts={COMIDAS} highlight highlightColor="#d32f2f" splitBy="characters"
                            staggerDuration={0.025} staggerFrom="last" rotationInterval={2600}
                            animatePresenceMode="popLayout" auto={!reducirMovimiento}
                            mainClassName="portada__rotativo" />
                        {/* En su propio renglón: así el largo de la palabra que rota
                            no cambia dónde se corta el resto del título. */}
                        <span className="portada__titulo-resto"> <em>de tu barrio</em>, directo a tu mesa</span>
                    </h1>
                    <p className="portada__texto">
                        Pizza a la piedra, parrilla a la leña, sushi, cocina vegana y postres caseros.
                        Elegís, pedís en un minuto y el local lo prepara al momento.
                    </p>
                    <div className="portada__acciones">
                        <Magnet padding={60} magnetStrength={4} maxOffset={10}>
                            <button type="button" className="boton boton--primario boton--grande" onClick={alVerMenu}>
                                Ver el menú<Icono nombre="flecha-derecha" tamano={18} />
                            </button>
                        </Magnet>
                        {mostrarVender && (
                            <button type="button" className="boton boton--claro boton--grande" onClick={alQuererVender}>
                                <Icono nombre="tienda" tamano={18} />Quiero vender
                            </button>
                        )}
                    </div>
                    {cantidadPlatos > 0 && (
                        <ul className="portada__cifras">
                            <li><strong><CountUp to={cantidadPlatos} mode="roll" trigger="load" duration={1.6} /></strong><span>platos para elegir</span></li>
                            <li><strong><CountUp to={cantidadLocales} mode="roll" trigger="load" duration={1.6} delay={0.1} /></strong><span>locales del barrio</span></li>
                            <li><strong><CountUp to={cantidadCategorias} mode="roll" trigger="load" duration={1.6} delay={0.2} /></strong><span>categorías</span></li>
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
}

export default Banner;
