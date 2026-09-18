import { useState } from 'react';
import api, { mensajeDeError } from '../api/client';
import { useFoodie } from '../state/FoodieContext';
import { LIMITES } from '../utils/limites';
import Modal from './Modal';
import Icono from './Icono';

const formularioVacio = (categorias) => ({
    nombreLocal: '', descripcionProductos: '', telefono: '', direccion: '',
    categoria: categorias[0] || 'Pizzas'
});

/** Formulario con el que un foodie pide dar de alta su local. Lo evalúa un administrador. */
function SolicitudLocal({ categorias, alCerrar }) {
    const { mostrarAviso, actualizarUsuario } = useFoodie();
    const [datos, setDatos] = useState(() => formularioVacio(categorias));
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');

    const actualizar = (campo) => (evento) => setDatos(prev => ({ ...prev, [campo]: evento.target.value }));

    const enviar = async (evento) => {
        evento.preventDefault();
        setError('');
        setEnviando(true);
        try {
            const { data } = await api.post('/usuarios/solicitar-vendedor', datos);
            mostrarAviso(data.mensaje, 'exito');
            // Así el menú muestra "en revisión" sin volver a pedir el perfil.
            actualizarUsuario({ solicitud_vendedor: true });
            alCerrar();
        } catch (err) {
            setError(mensajeDeError(err, 'No se pudo enviar la solicitud.'));
            setEnviando(false);
        }
    };

    return (
        <Modal titulo="Vendé en FoodieByte" tamano="ancho" alCerrar={alCerrar}
            subtitulo="Contanos sobre tu local. Un administrador revisa los datos y te habilita para publicar tu menú."
            pie={
                <>
                    <button type="button" className="boton" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" form="formulario-solicitud" className="boton boton--primario" disabled={enviando}>
                        {enviando ? 'Enviando…' : 'Enviar solicitud'}
                    </button>
                </>
            }>
            <form id="formulario-solicitud" className="formulario" onSubmit={enviar}>
                <div className="campo">
                    <label htmlFor="local-nombre" className="campo__etiqueta">Nombre del local</label>
                    <input id="local-nombre" className="entrada" required data-autofocus placeholder="Ej.: Pizzería La Nonna"
                        maxLength={LIMITES.nombreLocal} value={datos.nombreLocal} onChange={actualizar('nombreLocal')} />
                </div>

                <div className="grilla-campos">
                    <div className="campo">
                        <label htmlFor="local-telefono" className="campo__etiqueta">Teléfono de contacto</label>
                        <input id="local-telefono" type="tel" className="entrada" required placeholder="Ej.: 11 4832-5510"
                            maxLength={LIMITES.telefono} value={datos.telefono} onChange={actualizar('telefono')} />
                    </div>
                    <div className="campo">
                        <label htmlFor="local-categoria" className="campo__etiqueta">Categoría principal</label>
                        {/* La lista viene del servidor: una sola fuente de verdad. */}
                        <select id="local-categoria" className="entrada" value={datos.categoria} onChange={actualizar('categoria')}>
                            {categorias.map(categoria => <option key={categoria} value={categoria}>{categoria}</option>)}
                            <option value="Otros">Otros</option>
                        </select>
                    </div>
                </div>

                <div className="campo">
                    <label htmlFor="local-direccion" className="campo__etiqueta">Dirección del local</label>
                    <input id="local-direccion" className="entrada" required placeholder="Ej.: Av. Corrientes 1234, CABA"
                        maxLength={LIMITES.direccion} value={datos.direccion} onChange={actualizar('direccion')} />
                </div>

                <div className="campo">
                    <label htmlFor="local-descripcion" className="campo__etiqueta">¿Qué vas a vender?</label>
                    <textarea id="local-descripcion" className="entrada" required
                        placeholder="Ej.: Pastas frescas caseras, salsas y postres."
                        maxLength={LIMITES.descripcion} value={datos.descripcionProductos} onChange={actualizar('descripcionProductos')} />
                </div>

                {error && <p role="alert" className="mensaje mensaje--error"><Icono nombre="alerta" tamano={18} />{error}</p>}
            </form>
        </Modal>
    );
}

export default SolicitudLocal;
