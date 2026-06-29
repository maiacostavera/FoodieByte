import React from 'react';
import logo from '../assets/logo.png';

function Footer() {
    return (
        <footer style={estiloFooter}>
            <div style={estiloContenedorFooter}>
                <div style={estiloSeccionFooter}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                        <img src={logo} alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                        <h2 style={{ color: '#d32f2f', margin: 0, fontSize: '1.4rem', fontWeight: '700' }}>
                            Foodie<span style={{ color: '#ffffff' }}>Byte</span>
                        </h2>
                    </div>
                    <p style={estiloDescripcion}>La comunidad gastronómica de la UCES. Sabores que conectan corazones.</p>
                </div>

                <div style={estiloSeccionFooter}>
                    <h4 style={estiloTituloSeccion}>Links Útiles</h4>
                    <p style={estiloDescripcion}>Preguntas Frecuentes</p>
                    <p style={estiloDescripcion}>Términos y Condiciones</p>
                    <p style={estiloDescripcion}>Política de Privacidad</p>
                </div>

                <div style={estiloSeccionFooter}>
                    <h4 style={estiloTituloSeccion}>Contacto</h4>
                    <p style={estiloDescripcion}>Av. Santa Fe, CABA</p>
                    <p style={estiloDescripcion}>soporte@foodiebyte.com</p>
                </div>
            </div>
            <div style={estiloCopyright}>
                © 2026 FoodieByte - Proyecto Final UCES
            </div>
        </footer>
    );
}

const estiloFooter = {
    backgroundColor: '#212121', color: 'white', padding: '50px 0 20px 0',
    marginTop: '60px', fontFamily: "'Poppins', sans-serif"
};
const estiloContenedorFooter = {
    maxWidth: '1200px', margin: '0 auto', display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', padding: '0 20px'
};
const estiloSeccionFooter = { display: 'flex', flexDirection: 'column' };
const estiloDescripcion = { color: '#9e9e9e', fontSize: '0.85rem', marginBottom: '8px', lineHeight: '1.6' };
const estiloTituloSeccion = { fontSize: '1rem', fontWeight: '600', marginBottom: '15px', color: '#d32f2f' };
const estiloCopyright = {
    textAlign: 'center', borderTop: '1px solid #333333', marginTop: '40px',
    paddingTop: '20px', fontSize: '0.8rem', color: '#757575'
};

export default Footer;
