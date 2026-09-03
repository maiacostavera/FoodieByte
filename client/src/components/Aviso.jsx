import { useEffect } from 'react';
import { useFoodie } from '../state/FoodieContext';

/**
 * Notificación flotante que reemplaza a los alert() del navegador:
 * no bloquea la interacción y se cierra sola.
 */
function Aviso() {
    const { aviso, cerrarAviso } = useFoodie();

    useEffect(() => {
        if (!aviso) return;
        const temporizador = setTimeout(cerrarAviso, 4000);
        return () => clearTimeout(temporizador);
    }, [aviso, cerrarAviso]);

    if (!aviso) return null;

    const colores = {
        exito: { fondo: '#e8f5e9', borde: '#2e7d32', texto: '#1b5e20' },
        error: { fondo: '#ffebee', borde: '#c62828', texto: '#b71c1c' },
        info: { fondo: '#e3f2fd', borde: '#1976d2', texto: '#0d47a1' }
    };
    const paleta = colores[aviso.tipo] || colores.info;

    return (
        <div role="status" aria-live="polite" style={{ ...estiloContenedor, backgroundColor: paleta.fondo, borderLeftColor: paleta.borde }}>
            <span style={{ color: paleta.texto, fontSize: '0.92rem', fontWeight: '500', lineHeight: '1.45' }}>
                {aviso.texto}
            </span>
            <button onClick={cerrarAviso} aria-label="Cerrar aviso" style={{ ...estiloCerrar, color: paleta.texto }}>✕</button>
        </div>
    );
}

const estiloContenedor = {
    position: 'fixed', top: '90px', right: '24px', zIndex: 5000,
    maxWidth: '380px', padding: '16px 20px', borderRadius: '6px',
    borderLeft: '4px solid', boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
    display: 'flex', alignItems: 'flex-start', gap: '16px',
    fontFamily: "'Poppins', sans-serif"
};

const estiloCerrar = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '0.9rem', padding: 0, lineHeight: 1, opacity: 0.7
};

export default Aviso;
