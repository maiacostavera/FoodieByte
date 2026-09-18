// banner.webp reemplaza al PNG original de 6,7 MB: mismo aspecto, 75 KB.
import imagenBanner from '../assets/banner.webp';
import Icono from './Icono';

/** Portada: presentación de la plataforma con las cifras reales del catálogo. */
function Banner({ cantidadPlatos, cantidadLocales, cantidadCategorias, alVerMenu, alQuererVender, mostrarVender }) {
    return (
        <section className="portada" aria-labelledby="titulo-portada">
            <div className="portada__fondo" style={{ backgroundImage: `url(${imagenBanner})` }} aria-hidden="true" />
            <div className="contenedor">
                <div className="portada__contenido">
                    <span className="portada__etiqueta">
                        <Icono nombre="ubicacion" tamano={15} />Locales de la Ciudad de Buenos Aires
                    </span>
                    <h1 className="portada__titulo" id="titulo-portada">
                        La mejor comida <em>de tu barrio</em>, directo a tu mesa
                    </h1>
                    <p className="portada__texto">
                        Pizza a la piedra, parrilla a la leña, sushi, cocina vegana y postres caseros.
                        Elegís, pedís en un minuto y el local lo prepara al momento.
                    </p>
                    <div className="portada__acciones">
                        <button type="button" className="boton boton--primario boton--grande" onClick={alVerMenu}>
                            Ver el menú<Icono nombre="flecha-derecha" tamano={18} />
                        </button>
                        {mostrarVender && (
                            <button type="button" className="boton boton--claro boton--grande" onClick={alQuererVender}>
                                <Icono nombre="tienda" tamano={18} />Quiero vender
                            </button>
                        )}
                    </div>
                    {cantidadPlatos > 0 && (
                        <ul className="portada__cifras">
                            <li><strong>{cantidadPlatos}</strong><span>platos para elegir</span></li>
                            <li><strong>{cantidadLocales}</strong><span>locales del barrio</span></li>
                            <li><strong>{cantidadCategorias}</strong><span>categorías</span></li>
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
}

export default Banner;
