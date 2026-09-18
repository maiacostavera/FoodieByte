import { useEffect, useId, useRef } from 'react';
import Icono from './Icono';

// Ventanas abiertas, de la más vieja a la más nueva. Escape cierra solo la
// de arriba, y el scroll de la página vuelve cuando se cierra la última.
const abiertas = [];

/**
 * Ventana modal accesible: se cierra con Escape, con la cruz o tocando el
 * fondo; bloquea el scroll de la página y lleva el foco adentro al abrirse
 * (a un elemento con data-autofocus, si lo hay). Al cerrarse, el foco vuelve
 * a donde estaba.
 *
 * `pie` son los botones de abajo. Si el formulario está en el cuerpo, el botón
 * de enviar usa el atributo form="id-del-formulario".
 */
function Modal({ titulo, subtitulo, alCerrar, pie, tamano, children }) {
    const ventana = useRef(null);
    const cerrar = useRef(alCerrar);
    const idTitulo = useId();

    useEffect(() => {
        cerrar.current = alCerrar;
    });

    useEffect(() => {
        const propia = Symbol('modal');
        const focoAnterior = document.activeElement;

        abiertas.push(propia);
        document.body.classList.add('sin-scroll');
        (ventana.current.querySelector('[data-autofocus]') || ventana.current).focus();

        const alTeclear = (evento) => {
            if (evento.key === 'Escape' && abiertas[abiertas.length - 1] === propia) cerrar.current();
        };
        document.addEventListener('keydown', alTeclear);

        return () => {
            document.removeEventListener('keydown', alTeclear);
            abiertas.splice(abiertas.indexOf(propia), 1);
            if (abiertas.length === 0) document.body.classList.remove('sin-scroll');
            focoAnterior?.focus?.();
        };
    }, []);

    return (
        <div className="modal-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
            <div ref={ventana} className={`modal${tamano ? ` modal--${tamano}` : ''}`}
                role="dialog" aria-modal="true" aria-labelledby={idTitulo} tabIndex={-1}>
                <div className="modal__cabecera">
                    <div>
                        <h2 className="modal__titulo" id={idTitulo}>{titulo}</h2>
                        {subtitulo && <p className="modal__subtitulo">{subtitulo}</p>}
                    </div>
                    <button type="button" className="boton boton--fantasma boton--icono boton--chico"
                        onClick={alCerrar} aria-label="Cerrar">
                        <Icono nombre="cerrar" />
                    </button>
                </div>
                <div className="modal__cuerpo">{children}</div>
                {pie && <div className="modal__pie">{pie}</div>}
            </div>
        </div>
    );
}

export default Modal;
