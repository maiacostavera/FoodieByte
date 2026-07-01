import React from 'react';
import imagenBanner from '../assets/banner.png';

function Banner() {
    const hacerScrollAlMenu = () => {
        const seccionMenu = document.getElementById('catalogo-menu');
        if (seccionMenu) {
            seccionMenu.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div style={{...estiloHeroContainer, backgroundImage: `url(${imagenBanner})`}}>
            <div style={estiloOverlay}>
                <div style={estiloHeroContenido}>
                    <h1 style={estiloTitulo}>
                        Auténtica Cocina Local, en tu Hogar
                    </h1>
                    <p style={estiloSubtitulo}>
                        Descubre el sabor de los platos caseros preparados por vendedores de tu zona
                    </p>
                    <button 
                        onClick={hacerScrollAlMenu}
                        style={estiloBotonCTA}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#b71c1c'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#d32f2f'}
                    >
                        Explorar Menú
                    </button>
                </div>
            </div>
        </div>
    );
}

// ESTILOS CORPORATIVOS UCES
const estiloHeroContainer = {
    width: '100%',
    height: '500px', // Altura controlada para el Hero
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    display: 'flex',
    fontFamily: "'Poppins', sans-serif"
};

const estiloOverlay = {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // Overlay oscuro para máximo contraste de legibilidad
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0 20px'
};

const estiloHeroContenido = {
    maxWidth: '850px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    color: '#ffffff'
};

const estiloTitulo = {
    fontSize: '3.8rem',
    fontWeight: '800',
    lineHeight: '1.1',
    marginBottom: '20px',
    letterSpacing: '-1px',
    textShadow: '0 4px 12px rgba(0,0,0,0.3)'
};

const estiloSubtitulo = {
    fontSize: '1.3rem',
    fontWeight: '400',
    lineHeight: '1.6',
    marginBottom: '40px',
    opacity: '0.95',
    textShadow: '0 2px 8px rgba(0,0,0,0.3)'
};

const estiloBotonCTA = {
    backgroundColor: '#d32f2f',
    color: '#ffffff',
    border: 'none',
    padding: '16px 40px',
    borderRadius: '4px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
    fontFamily: "'Poppins', sans-serif",
    boxShadow: '0 4px 15px rgba(211, 47, 47, 0.4)'
};

export default Banner;