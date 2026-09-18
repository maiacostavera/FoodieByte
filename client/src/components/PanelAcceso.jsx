import imagenBanner from '../assets/banner.webp';
import Icono from './Icono';
import Logo from './Logo';

/** Marco de las pantallas de ingreso y registro: imagen de marca a un lado, formulario al otro. */
function PanelAcceso({ children }) {
    return (
        <div className="contenedor acceso">
            <div className="acceso__tarjeta">
                <aside className="acceso__lateral" style={{ backgroundImage: `url(${imagenBanner})` }}>
                    <Logo claro />
                    <p className="acceso__lema">Tu comida favorita, a un par de clics.</p>
                    <ul className="acceso__beneficios">
                        <li><Icono nombre="check" tamano={18} grosor={3} />Platos de los locales de tu barrio</li>
                        <li><Icono nombre="check" tamano={18} grosor={3} />Seguí el estado de cada pedido</li>
                        <li><Icono nombre="check" tamano={18} grosor={3} />Preguntale al local antes de pedir</li>
                    </ul>
                </aside>
                <div className="acceso__formulario">{children}</div>
            </div>
        </div>
    );
}

export default PanelAcceso;
