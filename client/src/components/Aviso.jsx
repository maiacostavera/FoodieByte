import { useEffect } from 'react';
import { useFoodie } from '../state/FoodieContext';
import Icono from './Icono';

const ICONOS = { exito: 'check', error: 'alerta', info: 'info' };

/**
 * Notificación flotante que reemplaza a los alert() del navegador:
 * no bloquea la interacción y se cierra sola a los cinco segundos.
 */
function Aviso() {
    const { aviso, cerrarAviso } = useFoodie();

    useEffect(() => {
        if (!aviso) return;
        const temporizador = setTimeout(cerrarAviso, 5000);
        return () => clearTimeout(temporizador);
    }, [aviso, cerrarAviso]);

    if (!aviso) return null;
    const tipo = ICONOS[aviso.tipo] ? aviso.tipo : 'info';

    return (
        <div key={aviso.id} className={`aviso aviso--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
            <span className="aviso__icono"><Icono nombre={ICONOS[tipo]} tamano={14} grosor={3} /></span>
            <p className="aviso__texto">{aviso.texto}</p>
            <button type="button" className="aviso__cerrar" onClick={cerrarAviso} aria-label="Cerrar aviso">
                <Icono nombre="cerrar" tamano={16} />
            </button>
        </div>
    );
}

export default Aviso;
