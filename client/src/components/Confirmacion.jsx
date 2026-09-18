import { useFoodie } from '../state/FoodieContext';
import Modal from './Modal';

/**
 * Pedido de confirmación antes de una acción que no se puede deshacer.
 * Reemplaza a window.confirm(): se abre con `await confirmar({ titulo, mensaje })`
 * desde cualquier componente y devuelve true o false.
 */
function Confirmacion() {
    const { confirmacion, responderConfirmacion } = useFoodie();
    if (!confirmacion) return null;

    const { titulo, mensaje, textoConfirmar = 'Confirmar', peligro = false } = confirmacion;

    return (
        <Modal titulo={titulo} tamano="angosto" alCerrar={() => responderConfirmacion(false)}
            pie={
                <>
                    <button type="button" className="boton" onClick={() => responderConfirmacion(false)}>
                        Cancelar
                    </button>
                    <button type="button" data-autofocus
                        className={`boton ${peligro ? 'boton--primario' : 'boton--oscuro'}`}
                        onClick={() => responderConfirmacion(true)}>
                        {textoConfirmar}
                    </button>
                </>
            }>
            <p className="texto-secundario">{mensaje}</p>
        </Modal>
    );
}

export default Confirmacion;
