// Íconos de trazo, en una grilla de 24×24. Toman el color del texto que los
// rodea (currentColor), así se adaptan al botón o al enlace donde están.
const TRAZOS = {
    alerta: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    basura: <><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /><path d="M10 11v5M14 11v5" /></>,
    billete: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></>,
    bolsa: <><path d="M5 8h14l-1.2 11.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    buscar: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    campana: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    cerrar: <path d="M18 6 6 18M6 6l12 12" />,
    chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />,
    check: <path d="M20 6 9 17l-5-5" />,
    'chevron-derecha': <path d="m9 6 6 6-6 6" />,
    'chevron-abajo': <path d="m6 9 6 6 6-6" />,
    correo: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    escudo: <><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    'flecha-izquierda': <path d="M19 12H5M12 19l-7-7 7-7" />,
    'flecha-derecha': <path d="M5 12h14M12 5l7 7-7 7" />,
    fuego: <path d="M12 22c4 0 7-2.7 7-6.6 0-3.7-2.6-6.2-4.3-8.4-.4 2-1.6 3.3-2.7 3.9.3-3.2-1.3-6.3-4-8.9C8.3 5.6 5 9.4 5 15.4 5 19.3 8 22 12 22Z" />,
    grafico: <><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></>,
    hoja: <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" /><path d="M2 21c0-3 1.9-5.4 5.1-6" /></>,
    imagen: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>,
    lapiz: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
    mas: <path d="M12 5v14M5 12h14" />,
    menos: <path d="M5 12h14" />,
    panel: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
    plato: <><path d="M4 17h16" /><path d="M5.5 17a6.5 6.5 0 0 1 13 0" /><path d="M12 10.5V8.5M10.5 8.5h3" /><path d="M3 20h18" /></>,
    recibo: <><path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Z" /><path d="M9 7h6M9 11h6M9 15h4" /></>,
    refrescar: <><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" /><path d="M21 3v5h-5" /></>,
    reloj: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    salir: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="m10 17-5-5 5-5M5 12h11" /></>,
    subir: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>,
    tienda: <><path d="M3 9l1.5-5h15L21 9" /><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /><path d="M5 12v8h14v-8" /><path d="M10 20v-5h4v5" /></>,
    ubicacion: <><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
    usuario: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    usuarios: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 20a6.5 6.5 0 0 0-2.5-5.1" /></>
};

function Icono({ nombre, tamano = 20, grosor = 2, className }) {
    return (
        <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true" focusable="false" className={className}>
            {TRAZOS[nombre]}
        </svg>
    );
}

export default Icono;
