import logo from '../assets/logo.png';
import Icono from './Icono';

function Footer({ categorias, alElegirCategoria, alAbrirPagina }) {
    return (
        <footer className="pie">
            <div className="contenedor pie__grilla">
                <div className="pie__marca">
                    <img src={logo} alt="FoodieByte" />
                    <p>La comunidad gastronómica de la UCES: los locales del barrio y quienes los eligen, en un solo lugar.</p>
                </div>

                <nav aria-label="Categorías">
                    <h3>Explorar</h3>
                    <ul className="pie__enlaces">
                        {categorias.map(categoria => (
                            <li key={categoria}>
                                <button type="button" className="pie__enlace" onClick={() => alElegirCategoria(categoria)}>{categoria}</button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <nav aria-label="Ayuda">
                    <h3>Ayuda</h3>
                    <ul className="pie__enlaces">
                        <li><button type="button" className="pie__enlace" onClick={() => alAbrirPagina('preguntas')}>Preguntas frecuentes</button></li>
                        <li><button type="button" className="pie__enlace" onClick={() => alAbrirPagina('terminos')}>Términos y condiciones</button></li>
                        <li><button type="button" className="pie__enlace" onClick={() => alAbrirPagina('privacidad')}>Política de privacidad</button></li>
                    </ul>
                </nav>

                <div>
                    <h3>Contacto</h3>
                    <ul className="pie__enlaces">
                        <li><span className="pie__enlace"><Icono nombre="ubicacion" tamano={16} />Av. Santa Fe, CABA</span></li>
                        <li><a className="pie__enlace" href="mailto:soporte@foodiebyte.com"><Icono nombre="correo" tamano={16} />soporte@foodiebyte.com</a></li>
                    </ul>
                </div>
            </div>

            <div className="contenedor pie__base">
                <span>© 2026 FoodieByte · Proyecto final UCES</span>
                <span>Hecho con React, Express y PostgreSQL</span>
            </div>
        </footer>
    );
}

export default Footer;
