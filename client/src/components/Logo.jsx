/**
 * Marca de FoodieByte: una campana de servicio (el plato que llega a la mesa)
 * con tres "bytes" que salen como vapor. Es un SVG, así se ve nítida en
 * cualquier tamaño; el favicon (public/favicon.svg) usa el mismo dibujo.
 */
function Logo({ claro = false, conTexto = true }) {
    return (
        <span className={`logo${claro ? ' logo--claro' : ''}`}>
            <svg className="logo__marca" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
                <rect width="40" height="40" rx="12" fill="#d32f2f" />
                <path d="M10.5 27.5a9.5 9.5 0 0 1 19 0Z" fill="#fff" />
                <circle cx="20" cy="16.4" r="1.9" fill="#fff" />
                <path d="M8.5 28.5h23" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M15 24.5a5.2 5.2 0 0 1 3.6-4.2" stroke="#d32f2f" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <rect x="26.5" y="8" width="3" height="3" rx="0.8" fill="#fff" opacity="0.95" />
                <rect x="30.5" y="11.5" width="2.4" height="2.4" rx="0.7" fill="#fff" opacity="0.75" />
                <rect x="27.5" y="13.5" width="2" height="2" rx="0.6" fill="#fff" opacity="0.55" />
            </svg>
            {conTexto && <span className="logo__texto">Foodie<span>Byte</span></span>}
        </span>
    );
}

export default Logo;
